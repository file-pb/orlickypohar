using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Boje;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Co trasování vidí u jedné lodi.</summary>
public record PrujezdCilemDto(int PrihlaskaId, string Lod, DateTimeOffset Kdy);

/// <summary>
/// Návrh dojezdů z trasování. <c>ProcNe</c> je věta pro rozhodčího, ne
/// chyba: trať bez cíle ani rozjížďka bez startu nejsou porucha, jen stav,
/// ve kterém se navrhovat nedá.
/// </summary>
public record CilZTrasovaniDto(string? ProcNe, IReadOnlyList<PrujezdCilemDto> Prujezdy);

/// <summary>
/// <b>Dojezdy, jak je vidí trasování</b> — návrh pro cílovou obrazovku
/// (nález R33).
///
/// <para>
/// <b>Navrhuje, nerozhoduje.</b> Která loď to byla a jestli dojela, ví
/// jen člověk; stopa umí dodat <b>čas</b> přesnější, než na jaký stačí
/// palec. Proto se nic nezapisuje samo a nic se nemaže.
/// </para>
///
/// <para>
/// <b>Okno, ne celá rozjížďka.</b> Hledá se jen v posledních
/// <see cref="OknoMinut"/> minutách. Dva důvody, a oba jsou podstatné:
/// průjezd zpřed hodiny už rozhodčí dávno zapsal, a procházet celou
/// stopu třicetihodinové jízdy při každém dotazu by znamenalo tahat
/// z databáze desítky tisíc bodů na loď.
/// </para>
/// </summary>
public class CilZTrasovaniSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>Jak daleko do minulosti se návrh dívá.</summary>
    public const int OknoMinut = 20;

    public async Task<CilZTrasovaniDto> ProRozjizdkuAsync(Rozjizdka rozjizdka, CancellationToken ct)
    {
        static CilZTrasovaniDto Nelze(string proc) => new(proc, []);

        if (rozjizdka.StartV is not { } startV)
            return Nelze("Rozjížďka nemá čas startu, takže není od čeho měřit.");

        // Trať rozjížďky má přednost před tratí regaty; zrušená se nepočítá.
        // Totéž pořadí dělá `TratSprava` pro tabuli.
        var trat = await db.Trate
            .Where(t => t.ZavodId == rozjizdka.ZavodId && t.Stav == StavTrati.Prijato
                        && (t.RozjizdkaId == null || t.RozjizdkaId == rozjizdka.Id))
            .OrderByDescending(t => t.RozjizdkaId != null)
            .ThenByDescending(t => t.Id)
            .FirstOrDefaultAsync(ct);

        if (trat is null) return Nelze("Rozjížďka nemá přijatou trať.");

        var prvky = await db.PrvkyTrati
            .Where(p => p.TratId == trat.Id)
            .Include(p => p.BojeA)
            .Include(p => p.BojeB)
            .OrderBy(p => p.Poradi)
            .ToListAsync(ct);

        var cil = prvky.LastOrDefault(p => p.Typ == TypPrvku.Cil);
        if (cil?.BojeA is null || cil.BojeB is null)
            return Nelze("Trať nemá cíl vytyčený dvěma konci.");

        // <b>Odkud se do cíle přijíždí.</b> Z předchozího prvku plyne směr,
        // a bez směru by se dojezd nepoznal od startu — u Orlíku leží cíl
        // na startu, takže tutéž čáru pole protne i na začátku.
        var predchozi = prvky.LastOrDefault(p => p.Poradi < cil.Poradi && p.BojeA is not null);
        if (predchozi?.BojeA is null)
            return Nelze("Před cílem není na trati prvek, ze kterého by se dal poznat směr.");

        var ted = cas.GetUtcNow();
        var od = startV > ted.AddMinutes(-OknoMinut) ? startV : ted.AddMinutes(-OknoMinut);

        // Lodě na regatě a jejich stopy. Jeden dotaz na všechny: bodů je
        // v okně málo, ale dotazů na loď by bylo tolik, kolik je lodí.
        var ucasti = await db.Ucasti
            .Where(u => u.ZavodId == rozjizdka.ZavodId)
            .Select(u => new { u.PrihlaskaId, u.Prihlaska!.LodId, u.Prihlaska.Lod!.Nazev })
            .ToListAsync(ct);

        var lodeIds = ucasti.Select(u => u.LodId).ToList();

        var body = await db.TrasaBody
            .Where(b => b.Trasa!.ZavodId == rozjizdka.ZavodId
                        && lodeIds.Contains(b.Trasa.LodId)
                        && b.CasGps >= od)
            .OrderBy(b => b.CasGps)
            .Select(b => new { b.Trasa!.LodId, b.Sirka, b.Delka, b.CasGps })
            .ToListAsync(ct);

        var stopy = body
            .GroupBy(b => b.LodId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<CilZTrasovani.BodStopy>)g
                    .Select(b => new CilZTrasovani.BodStopy(
                        new CilZTrasovani.Misto(b.Sirka, b.Delka), b.CasGps))
                    .ToList());

        var cilA = new CilZTrasovani.Misto(cil.BojeA.Sirka, cil.BojeA.Delka);
        var cilB = new CilZTrasovani.Misto(cil.BojeB.Sirka, cil.BojeB.Delka);
        var zTrati = Stred(predchozi);

        var prujezdy = new List<PrujezdCilemDto>();
        foreach (var u in ucasti)
        {
            if (!stopy.TryGetValue(u.LodId, out var stopa)) continue;
            if (CilZTrasovani.Posledni(stopa, cilA, cilB, zTrati, startV) is { } kdy)
                prujezdy.Add(new PrujezdCilemDto(u.PrihlaskaId, u.Nazev, kdy));
        }

        return new CilZTrasovaniDto(
            prujezdy.Count == 0 && stopy.Count == 0
                ? "Z lodí téhle regaty teď nikdo nevysílá polohu."
                : null,
            prujezdy.OrderBy(p => p.Kdy).ToList());
    }

    /// <summary>
    /// Bod, kterým se prvek zastupuje. U branky střed mezi konci — loď
    /// jí projíždí mezi bójemi, ne kolem jedné z nich.
    /// </summary>
    private static CilZTrasovani.Misto Stred(PrvekTrati p) =>
        p.BojeB is { } b
            ? new CilZTrasovani.Misto((p.BojeA!.Sirka + b.Sirka) / 2, (p.BojeA.Delka + b.Delka) / 2)
            : new CilZTrasovani.Misto(p.BojeA!.Sirka, p.BojeA.Delka);
}

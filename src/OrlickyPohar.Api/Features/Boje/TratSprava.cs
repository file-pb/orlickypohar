using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Stav trati regaty: stavitelé hlásí hotovo, rozhodčí přijímá a zamyká,
/// přestavba odemyká.
///
/// <para>
/// <b>Zámek něco znamená.</b> Dokud je trať přijatá, nejde pípnout ani
/// sebrat bóji (<see cref="ProcNejdeStavetAsync"/>) — jinak by „zamčeno"
/// byl jen nápis a veřejně vydaná trať by se dala tiše změnit pod lodí,
/// která podle ní pluje.
/// </para>
///
/// <para>
/// <b>Odjetá trať se nepřestavuje, nahrazuje se novou.</b> „Odjelo se podle
/// ní" se nikam neukládá — pozná se tak, že po jejím přijetí odstartovala
/// rozjížďka. Je to dopočet z toho, co už v datech je, takže start
/// rozjížďky o trati nemusí vědět.
/// </para>
/// </summary>
public class TratSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>Trať, na které se zrovna pracuje. Nejnovější vyhrává.</summary>
    public Task<Trat?> AktualniAsync(int zavodId, CancellationToken ct) =>
        db.Trate
            .Include(t => t.Prijal)
            .Where(t => t.ZavodId == zavodId)
            .OrderByDescending(t => t.Id)
            .FirstOrDefaultAsync(ct);

    /// <summary>
    /// Stav pro správu, nebo <c>null</c>, když regata trať ještě nemá.
    /// Příznaky „smí" počítá volající z role, tady jde jen o stav.
    /// </summary>
    public async Task<TratDto?> StavAsync(
        int zavodId, bool jeStavitel, bool jeRozhodci, CancellationToken ct)
    {
        var trat = await AktualniAsync(zavodId, ct);
        return trat is null ? null : await DtoAsync(trat, jeStavitel, jeRozhodci, ct);
    }

    /// <summary>
    /// Trať regaty, a když žádná není, tak se založí. Volá se z pípnutí:
    /// <b>stavba začíná první bójí</b>, ne zvláštním knoflíkem, který by
    /// nikdo nestiskl.
    /// </summary>
    public async Task<Trat> ZalozPokudChybiAsync(int zavodId, CancellationToken ct)
    {
        if (await AktualniAsync(zavodId, ct) is { } trat) return trat;

        var nova = new Trat { ZavodId = zavodId, ZalozenaV = cas.GetUtcNow() };
        db.Trate.Add(nova);
        return nova;
    }

    /// <summary>
    /// Proč do trati nejde sáhnout — nebo <c>null</c>. Pro pípnutí i sebrání:
    /// obojí mění, co stojí ve vodě.
    /// </summary>
    public async Task<string?> ProcNejdeStavetAsync(int zavodId, CancellationToken ct) =>
        await AktualniAsync(zavodId, ct) is { Stav: StavTrati.Prijato }
            ? "Trať je přijatá rozhodčím a zamčená. Na úpravu ji nejdřív odemkni přestavbou — "
              + "veřejně se tím řekne, že se přestavuje."
            : null;

    /// <summary>Stavitelé hlásí hotovo.</summary>
    public async Task<(TratDto? Trat, string? Chyba)> HotovoAsync(
        int zavodId, bool jeRozhodci, CancellationToken ct)
    {
        var trat = await AktualniAsync(zavodId, ct);
        if (trat is null) return (null, "Tahle regata zatím nemá ani jednu bóji.");
        if (Stavba.ProcNejdeHotovo(trat.Stav) is { } chyba) return (null, chyba);

        trat.Stav = StavTrati.Hotovo;
        trat.DuvodVraceni = null;
        await db.SaveChangesAsync(ct);

        return (await DtoAsync(trat, true, jeRozhodci, ct), null);
    }

    /// <summary>Rozhodčí přijímá: trať se zamkne a je veřejná.</summary>
    public async Task<(TratDto? Trat, string? Chyba)> PrijmiAsync(
        int zavodId, Guid kdo, CancellationToken ct)
    {
        var trat = await AktualniAsync(zavodId, ct);
        if (trat is null) return (null, "Tahle regata zatím nemá ani jednu bóji.");
        if (Stavba.ProcNejdePrijmout(trat.Stav) is { } chyba) return (null, chyba);

        trat.Stav = StavTrati.Prijato;
        trat.PrijatoV = cas.GetUtcNow();
        trat.PrijalId = kdo;
        trat.DuvodVraceni = null;
        await db.SaveChangesAsync(ct);

        await db.Entry(trat).Reference(t => t.Prijal).LoadAsync(ct);
        return (await DtoAsync(trat, true, true, ct), null);
    }

    /// <summary>Rozhodčí vrací stavitelům. Důvod je povinný.</summary>
    public async Task<(TratDto? Trat, string? Chyba)> VratAsync(
        int zavodId, string? duvod, CancellationToken ct)
    {
        var trat = await AktualniAsync(zavodId, ct);
        if (trat is null) return (null, "Tahle regata zatím nemá ani jednu bóji.");
        if (Stavba.ProcNejdeVratit(trat.Stav, duvod) is { } chyba) return (null, chyba);

        trat.Stav = StavTrati.Rozestaveno;
        trat.DuvodVraceni = duvod!.Trim();
        await db.SaveChangesAsync(ct);

        return (await DtoAsync(trat, true, true, ct), null);
    }

    /// <summary>
    /// Odemčení na přestavbu. Smí pořadatel i rozhodčí — trať přestavuje
    /// pořadatel a na vodě nemá jak shánět rozhodčího (Filip, 9. 10. 2026).
    /// Bezpečné to je proto, že odemčení <b>je vidět</b>: veřejně okamžitě
    /// znamená „trať se přestavuje, počkej".
    /// <para>
    /// Podle odjeté trati se už jelo, takže se nepřepisuje — vznikne nová
    /// a stará zůstane přijatá navždy. Je to ta <b>výjimka</b>, kvůli které
    /// řetěz přestaveb vůbec existuje, ne běžná cesta.
    /// </para>
    /// </summary>
    public async Task<(TratDto? Trat, string? Chyba)> PrestavbaAsync(
        int zavodId, bool jeRozhodci, CancellationToken ct)
    {
        var trat = await AktualniAsync(zavodId, ct);
        if (trat is null) return (null, "Tahle regata zatím nemá ani jednu bóji.");
        if (Stavba.ProcNejdePrestavba(trat.Stav) is { } chyba) return (null, chyba);

        if (await OdjetaAsync(trat, ct))
        {
            var nova = new Trat
            {
                ZavodId = zavodId,
                RozjizdkaId = trat.RozjizdkaId,
                NahrazujeId = trat.Id,
                Stav = StavTrati.Prestavba,
                ZalozenaV = cas.GetUtcNow(),
            };
            db.Trate.Add(nova);
            await db.SaveChangesAsync(ct);
            return (await DtoAsync(nova, true, jeRozhodci, ct), null);
        }

        // Nepřijatá historie se nevyrábí: tahle trať ještě nikomu nesloužila,
        // takže se jen odemkne. Přijetí se maže, aby `PrijatoV` neukazovalo
        // na stav, který neplatí.
        trat.Stav = StavTrati.Prestavba;
        trat.PrijatoV = null;
        trat.PrijalId = null;
        await db.SaveChangesAsync(ct);

        return (await DtoAsync(trat, true, jeRozhodci, ct), null);
    }

    /// <summary>
    /// Trať pro veřejnost, nebo <c>null</c>, když se vydávat nemá.
    ///
    /// <para>
    /// <b>Rozhodnutí drží tenhle dotaz, ne vrstva mapy</b> (plán, nález G):
    /// nepřijatá trať se nevydá vůbec a u přestavby se vrací jen příznak.
    /// </para>
    ///
    /// <para>
    /// Bóje se berou <b>k okamžiku přijetí</b>, ne „jak stojí teď". U přijaté
    /// trati to vyjde nastejno, protože do zamčené trati nejde pípnout — ale
    /// psát to podle času je správně i pro historické tratě a nic to nestojí:
    /// záznam o bóji se nikdy nepřepisuje a časy nese.
    /// </para>
    /// </summary>
    public async Task<VerejnaTratDto?> VerejnaAsync(int zavodId, CancellationToken ct)
    {
        var trat = await AktualniAsync(zavodId, ct);
        if (trat is null || !Stavba.JeVerejna(trat.Stav)) return null;

        if (trat.Stav == StavTrati.Prestavba)
            return new VerejnaTratDto(Prestavba: true, PrijatoV: null, Boje: []);

        var prijato = trat.PrijatoV!.Value;

        return new VerejnaTratDto(false, prijato, await db.Boje
            .Where(b => b.ZavodId == zavodId
                        && b.PostavenaV <= prijato
                        && (b.NahrazenaV == null || b.NahrazenaV > prijato)
                        && (b.SebranaV == null || b.SebranaV > prijato))
            .OrderBy(b => b.Poradi).ThenBy(b => b.Id)
            .Select(b => new VerejnaBojeDto(b.Nazev, b.Poradi, b.Sirka, b.Delka))
            .ToListAsync(ct));
    }

    /// <summary>
    /// Odstartovala po přijetí téhle trati nějaká rozjížďka? Pak se podle ní
    /// jelo. Platí pro <b>poslední</b> trať regaty; u starších by se muselo
    /// omezit i shora, přijetím té následující.
    /// </summary>
    private Task<bool> OdjetaAsync(Trat trat, CancellationToken ct) =>
        trat.PrijatoV is not { } prijato
            ? Task.FromResult(false)
            : db.Rozjizdky.AnyAsync(
                r => r.ZavodId == trat.ZavodId && r.StartV != null && r.StartV >= prijato, ct);

    private async Task<TratDto> DtoAsync(
        Trat t, bool jeStavitel, bool jeRozhodci, CancellationToken ct)
    {
        var odjeta = await OdjetaAsync(t, ct);

        return new TratDto(
            t.Id,
            t.Stav,
            t.ZalozenaV,
            t.PrijatoV,
            t.Prijal?.Zobrazovane,
            t.DuvodVraceni,
            t.RozjizdkaId,
            t.NahrazujeId,
            odjeta,
            SmiHlasitHotovo: jeStavitel && Stavba.ProcNejdeHotovo(t.Stav) is null,
            SmiPrijmout: jeRozhodci && Stavba.ProcNejdePrijmout(t.Stav) is null,
            SmiPrestavet: jeStavitel && Stavba.ProcNejdePrestavba(t.Stav) is null);
    }
}

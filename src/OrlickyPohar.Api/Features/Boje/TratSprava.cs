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
        // takže se jen odemkne.
        //
        // <b>Přijetí se ale nemaže.</b> Dřív se `PrijatoV` nulovalo, „aby
        // neukazovalo na stav, který neplatí" — jenže co teď platí, říká
        // `Stav`, a smazáním času se ztrácel **doklad, že trať chvíli byla
        // veřejná**. Na tom doklad visí: podle něj se pozná, jestli se
        // záznam bóje smí zahodit jako nepotřebný, nebo ho někdo venku
        // viděl (`BojeSprava.ZahodAsync`). `PrijatoV` je tedy „kdy ji
        // rozhodčí naposledy přijal", ne „je přijatá".
        trat.Stav = StavTrati.Prestavba;
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
        // Nejnovější trať rozhoduje jen o přestavbě: to je ta, která se právě
        // mění ve vodě. Jinak se vydává **nejnovější přijatá** — od chvíle,
        // kdy má každá rozjížďka vlastní trať, by čerstvý klon ve stavu
        // `Hotovo` jinak veřejně shodil trať, podle které se zrovna pluje
        // (plán, *Výběr a klonování trati*).
        if (await AktualniAsync(zavodId, ct) is { Stav: StavTrati.Prestavba })
            return new VerejnaTratDto(
                Prestavba: true, PrijatoV: null, CisloRozjizdky: null, Boje: [], Prvky: []);

        var trat = await db.Trate
            .Where(t => t.ZavodId == zavodId && t.Stav == StavTrati.Prijato)
            .OrderByDescending(t => t.Id)
            .FirstOrDefaultAsync(ct);

        if (trat is null) return null;

        var cislo = trat.RozjizdkaId is { } rozjizdka
            ? await db.Rozjizdky.Where(r => r.Id == rozjizdka)
                .Select(r => (int?)r.Cislo).FirstOrDefaultAsync(ct)
            : null;

        var prijato = trat.PrijatoV!.Value;

        var prvky = await db.PrvkyTrati
            .Where(p => p.TratId == trat.Id)
            .OrderBy(p => p.Poradi).ThenBy(p => p.Id)
            .Select(p => new VerejnyPrvekDto(
                p.Typ, p.Poradi, p.Strana, p.Poznamka,
                new VerejnyKonecDto(
                    p.BojeA!.Nazev, p.BojeA.Sirka, p.BojeA.Delka,
                    p.BojeA.Barva, p.BojeA.Tvar),
                p.BojeB != null
                    ? new VerejnyKonecDto(
                        p.BojeB.Nazev, p.BojeB.Sirka, p.BojeB.Delka,
                        p.BojeB.Barva, p.BojeB.Tvar)
                    : p.KonecBSirka != null && p.KonecBDelka != null
                        ? new VerejnyKonecDto(p.KonecBPopis!, p.KonecBSirka.Value, p.KonecBDelka.Value)
                        : null,
                p.Smer, p.DruhStartu))
            .ToListAsync(ct);

        return new VerejnaTratDto(false, prijato, cislo, Prvky: prvky, Boje: await db.Boje
            .Where(b => b.ZavodId == zavodId
                        && b.PostavenaV <= prijato
                        && (b.NahrazenaV == null || b.NahrazenaV > prijato)
                        && (b.SebranaV == null || b.SebranaV > prijato))
            .OrderBy(b => b.Poradi).ThenBy(b => b.Id)
            .Select(b => new VerejnaBojeDto(b.Nazev, b.Poradi, b.Sirka, b.Delka, b.Barva, b.Tvar))
            .ToListAsync(ct));
    }

    /// <summary>
    /// Tratě regaty na výběr: <i>„jede se tahle"</i>. Od nejnovější, protože
    /// ta, kterou chce člověk zopakovat, bývá ta poslední.
    /// </summary>
    public async Task<List<TratNaVyberDto>> SeznamAsync(int zavodId, CancellationToken ct)
    {
        var trate = await db.Trate
            .Where(t => t.ZavodId == zavodId)
            .OrderByDescending(t => t.Id)
            .ToListAsync(ct);

        var cisla = await db.Rozjizdky
            .Where(r => r.ZavodId == zavodId)
            .ToDictionaryAsync(r => r.Id, r => r.Cislo, ct);

        var prvku = await db.PrvkyTrati
            .Where(p => p.Trat!.ZavodId == zavodId)
            .GroupBy(p => p.TratId)
            .Select(g => new { TratId = g.Key, Pocet = g.Count() })
            .ToDictionaryAsync(x => x.TratId, x => x.Pocet, ct);

        var hotovo = new List<TratNaVyberDto>();
        foreach (var t in trate)
            hotovo.Add(new TratNaVyberDto(
                t.Id,
                t.Stav,
                t.RozjizdkaId is { } r && cisla.TryGetValue(r, out var c) ? c : null,
                t.PrijatoV,
                prvku.GetValueOrDefault(t.Id),
                await OdjetaAsync(t, ct),
                JdePriradit: t.RozjizdkaId is null));

        return hotovo;
    }

    /// <summary>
    /// Přiřadí volnou trať rozjížďce. Obvyklý postup: <b>nejdřív se staví
    /// trať, pak se na ni založí rozjížďka</b> (Filip, 9. 10. 2026) —
    /// vyrábět v tu chvíli kopii by znamenalo přijímat dvakrát totéž.
    /// </summary>
    public async Task<(TratDto? Trat, string? Chyba)> PriradAsync(
        int zavodId, int tratId, int cisloRozjizdky, bool jeRozhodci, CancellationToken ct)
    {
        var trat = await db.Trate
            .Include(t => t.Prijal)
            .FirstOrDefaultAsync(t => t.Id == tratId && t.ZavodId == zavodId, ct);

        if (trat is null) return (null, "Taková trať u téhle regaty není.");
        if (trat.RozjizdkaId is not null)
            return (null, "Tahle trať už rozjížďce patří. Odebrat by znamenalo přepsat, "
                          + "podle čeho se jelo — naklonuj ji.");

        var (rozjizdkaId, chyba) = await VolnaRozjizdkaAsync(zavodId, cisloRozjizdky, ct);
        if (chyba is not null) return (null, chyba);

        trat.RozjizdkaId = rozjizdkaId;
        await db.SaveChangesAsync(ct);

        return (await DtoAsync(trat, true, jeRozhodci, ct), null);
    }

    /// <summary>
    /// Naklonuje trať: <b>kopii prvků na tytéž bóje</b>, žádná nová pípnutí
    /// (plán, <i>Výběr a klonování trati</i>). Vyrobit pípnutí by znamenalo
    /// měření, které se nestalo, s falešným časem a přesností.
    /// </summary>
    public async Task<(TratDto? Trat, string? Chyba)> KlonujAsync(
        int zavodId, int tratId, KlonTratiVstup vstup, Guid kdo, bool jeRozhodci,
        CancellationToken ct)
    {
        var stav = vstup.Stav ?? StavTrati.Hotovo;
        if (Stavba.ProcNejdeKlon(stav, jeRozhodci) is { } procNe) return (null, procNe);

        var zdroj = await db.Trate
            .FirstOrDefaultAsync(t => t.Id == tratId && t.ZavodId == zavodId, ct);
        if (zdroj is null) return (null, "Taková trať u téhle regaty není.");

        int? rozjizdkaId = null;
        if (vstup.Rozjizdka is { } cislo)
        {
            var (id, chyba) = await VolnaRozjizdkaAsync(zavodId, cislo, ct);
            if (chyba is not null) return (null, chyba);
            rozjizdkaId = id;
        }

        var ted = cas.GetUtcNow();
        var nova = new Trat
        {
            ZavodId = zavodId,
            RozjizdkaId = rozjizdkaId,
            Stav = stav,
            ZalozenaV = ted,
            // `NahrazujeId` se schválně nenastavuje: klon starou trať
            // nenahrazuje, obě platí dál. Řetěz nahrazení je o přestavbě.
            PrijatoV = stav == StavTrati.Prijato ? ted : null,
            PrijalId = stav == StavTrati.Prijato ? kdo : null,
        };
        db.Trate.Add(nova);
        await db.SaveChangesAsync(ct);

        var prvky = await db.PrvkyTrati
            .Where(x => x.TratId == zdroj.Id)
            .OrderBy(x => x.Poradi).ThenBy(x => x.Id)
            .ToListAsync(ct);

        db.PrvkyTrati.AddRange(prvky.Select(x => new PrvekTrati
        {
            TratId = nova.Id,
            Typ = x.Typ,
            Poradi = x.Poradi,
            Strana = x.Strana,
            Poznamka = x.Poznamka,
            // Tytéž záznamy bójí: pořád stojí ve vodě a jejich poloha je
            // měření, které se stalo. Kopíruje se rozhodnutí, ne měření.
            BojeAId = x.BojeAId,
            BojeBId = x.BojeBId,
            KonecBSirka = x.KonecBSirka,
            KonecBDelka = x.KonecBDelka,
            KonecBPopis = x.KonecBPopis,
        }));
        await db.SaveChangesAsync(ct);

        if (nova.PrijalId is not null)
            await db.Entry(nova).Reference(t => t.Prijal).LoadAsync(ct);

        return (await DtoAsync(nova, true, jeRozhodci, ct), null);
    }

    /// <summary>
    /// Id rozjížďky daného čísla, když může trať převzít — jinak důvod.
    /// Druhou trať téže rozjížďky vyrábí jedině přestavba, a ta má vlastní
    /// cestu.
    /// </summary>
    private async Task<(int Id, string? Chyba)> VolnaRozjizdkaAsync(
        int zavodId, int cislo, CancellationToken ct)
    {
        var id = await db.Rozjizdky
            .Where(r => r.ZavodId == zavodId && r.Cislo == cislo)
            .Select(r => (int?)r.Id)
            .FirstOrDefaultAsync(ct);

        if (id is null) return (0, $"Rozjížďka číslo {cislo} u téhle regaty není.");

        return await db.Trate.AnyAsync(t => t.RozjizdkaId == id, ct)
            ? (0, "Tahle rozjížďka už trať má. Když se přestavuje, použij přestavbu.")
            : (id.Value, null);
    }

    /// <summary>
    /// Jelo se podle téhle trati? Pak se nepřepisuje.
    /// <para>
    /// <b>Trať rozjížďky se pozná podle její rozjížďky</b> — odstartovala,
    /// tedy se podle ní jelo. U trati, která rozjížďce ještě nepatří, se to
    /// dopočítá z času: odstartovala po jejím přijetí nějaká rozjížďka?
    /// Ten dopočet platí pro <b>poslední</b> trať regaty; u starších by se
    /// musel omezit i shora, přijetím té následující — a právě proto je
    /// vazba na rozjížďku lepší odpověď než čas.
    /// </para>
    /// </summary>
    private async Task<bool> OdjetaAsync(Trat trat, CancellationToken ct)
    {
        if (trat.RozjizdkaId is { } rozjizdka)
            return await db.Rozjizdky.AnyAsync(
                r => r.Id == rozjizdka && r.StartV != null, ct);

        return trat.PrijatoV is { } prijato
               && await db.Rozjizdky.AnyAsync(
                   r => r.ZavodId == trat.ZavodId && r.StartV != null && r.StartV >= prijato, ct);
    }

    private async Task<TratDto> DtoAsync(
        Trat t, bool jeStavitel, bool jeRozhodci, CancellationToken ct)
    {
        var odjeta = await OdjetaAsync(t, ct);
        var cislo = t.RozjizdkaId is { } rozjizdka
            ? await db.Rozjizdky.Where(r => r.Id == rozjizdka)
                .Select(r => (int?)r.Cislo).FirstOrDefaultAsync(ct)
            : null;

        return new TratDto(
            t.Id,
            t.Stav,
            t.ZalozenaV,
            t.PrijatoV,
            t.Prijal?.Zobrazovane,
            t.DuvodVraceni,
            t.RozjizdkaId,
            cislo,
            t.NahrazujeId,
            odjeta,
            SmiHlasitHotovo: jeStavitel && Stavba.ProcNejdeHotovo(t.Stav) is null,
            SmiPrijmout: jeRozhodci && Stavba.ProcNejdePrijmout(t.Stav) is null,
            SmiPrestavet: jeStavitel && Stavba.ProcNejdePrestavba(t.Stav) is null);
    }
}

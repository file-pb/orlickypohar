using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

using OrlickyPohar.Api.Features.Zavody;
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
public class TratSprava(AppDbContext db, TimeProvider cas, Fotky.IUloziste uloziste)
{
    /// <summary>
    /// Trať, na které se zrovna pracuje. Nejnovější vyhrává.
    /// <para>
    /// <b>Je to dohad, ne volba</b> — a od 15. 10. 2026 jen záloha pro ni.
    /// Regata má tratí víc (jednu na rozjížďku) a obrazovka si odteď říká,
    /// kterou chce, přes <see cref="VybranaAsync"/>. Dohad zůstává pro
    /// volání, která trať neřeší: pípnutí patří regatě, ne trati.
    /// </para>
    /// </summary>
    public Task<Trat?> AktualniAsync(int zavodId, CancellationToken ct) =>
        db.Trate
            .Include(t => t.Prijal)
            .Where(t => t.ZavodId == zavodId)
            .OrderByDescending(t => t.Id)
            .FirstOrDefaultAsync(ct);

    /// <summary>
    /// Trať, kterou si obrazovka vybrala — nebo ta nejnovější, když si
    /// nevybrala.
    /// <para>
    /// <b>Cizí trať se nevydá.</b> Kontroluje se, že vybrané id patří téhle
    /// regatě; jinak by stačilo hádat čísla a číst tratě odjinud. Když id
    /// nesedí, vrací se <c>null</c> — ne tiše nejnovější, protože obrazovka
    /// by pak ukazovala jinou trať, než o kterou si řekla, a nikdo by si
    /// toho nevšiml.
    /// </para>
    /// </summary>
    public async Task<Trat?> VybranaAsync(int zavodId, int? tratId, CancellationToken ct) =>
        tratId is null
            ? await AktualniAsync(zavodId, ct)
            : await db.Trate
                .Include(t => t.Prijal)
                .FirstOrDefaultAsync(t => t.Id == tratId && t.ZavodId == zavodId, ct);

    /// <summary>
    /// Stav pro správu, nebo <c>null</c>, když regata trať ještě nemá.
    /// Příznaky „smí" počítá volající z role, tady jde jen o stav.
    /// </summary>
    public async Task<TratDto?> StavAsync(
        int zavodId, bool jeStavitel, bool jeRozhodci, CancellationToken ct,
        int? tratId = null)
    {
        var trat = await VybranaAsync(zavodId, tratId, ct);
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
    /// Založí <b>další prázdnou trať</b> vedle těch, co regata má.
    /// <para>
    /// <b>Proč to nestačilo doteď:</b> trať vznikala jen prvním pípnutím
    /// (a to jen když žádná nebyla) nebo klonem. Postavit druhou, jinou
    /// trať pro další rozjížďku tedy nešlo jinak než naklonovat tu minulou
    /// a přestavět ji. Filip, 15. 10. 2026: *„nemáme možnost dělat do
    /// regaty další tratě… na konci třeba plusko"*.
    /// </para>
    /// <para>
    /// <b>Rozjížďka se nepřiřazuje.</b> Pořadí obou kroků je volné — dá se
    /// napřed postavit trať a pak jí přiřadit rozjížďku, nebo vyhlásit
    /// rozjížďku a stavět, zatímco lodě čekají na vodě (Filip tamtéž).
    /// Svázat to hned by jednu z těch cest zavřelo.
    /// </para>
    /// <para>
    /// <b>Prázdná trať bez rozjížďky se nezakládá dvakrát.</b> Kdo klikne
    /// na plus dvakrát, dostane tutéž — jinak by regatě přibývaly prázdné
    /// tratě, které nejdou nijak uklidit.
    /// </para>
    /// </summary>
    public async Task<TratDto> DalsiAsync(int zavodId, bool jeRozhodci, CancellationToken ct)
    {
        var volna = await db.Trate
            .Include(t => t.Prijal)
            .Where(t => t.ZavodId == zavodId && t.RozjizdkaId == null)
            .Where(t => !db.PrvkyTrati.Any(p => p.TratId == t.Id))
            .OrderByDescending(t => t.Id)
            .FirstOrDefaultAsync(ct);
        if (volna is not null) return await DtoAsync(volna, true, jeRozhodci, ct);

        var nova = new Trat { ZavodId = zavodId, ZalozenaV = cas.GetUtcNow() };
        db.Trate.Add(nova);
        await db.SaveChangesAsync(ct);
        return await DtoAsync(nova, true, jeRozhodci, ct);
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
    /// <summary>
    /// Přijatá trať <b>rozjížďky, která je na řadě</b> — ta, podle které se
    /// zrovna pluje, nebo podle které se poplave nejblíž.
    /// <para>
    /// Filip, 15. 10. 2026: *„mapu aktuální rozjížďky/trati, a pokud se nic
    /// nejede zrovna, tak té nejbližší, co se pojede"*. Do té doby se brala
    /// <b>nejnovější přijatá podle id</b>, což od chvíle, kdy má každá
    /// rozjížďka vlastní trať, znamenalo něco jiného: divák mohl koukat na
    /// trať čtvrté rozjížďky, zatímco se jela druhá.
    /// </para>
    /// <para>
    /// Pořadí je probíhající → nejbližší plánovaná → poslední dokončená.
    /// Poslední krok je tu proto, aby stránka po závodě nezmizela: trať,
    /// podle které se dojelo, je pořád to, co diváka zajímá.
    /// </para>
    /// <para>
    /// <b>Když rozjížďka na řadě přijatou trať nemá</b> (třeba se zrovna
    /// staví, zatímco lodě čekají na vodě), spadne se na nejnovější
    /// přijatou. Ukázat prázdno by bylo horší: na vodě něco stojí a divák
    /// se dívá právě proto.
    /// </para>
    /// </summary>
    private async Task<Trat?> NaRadeAsync(int zavodId, CancellationToken ct)
    {
        var rozjizdky = await db.Rozjizdky
            .Where(r => r.ZavodId == zavodId && r.Stav != StavRozjizdky.Zrusena)
            .Select(r => new { r.Id, r.Cislo, r.Stav })
            .ToListAsync(ct);

        var naRade =
            rozjizdky.FirstOrDefault(r => r.Stav == StavRozjizdky.Probiha)
            ?? rozjizdky.Where(r => r.Stav == StavRozjizdky.Planovana)
                .OrderBy(r => r.Cislo).FirstOrDefault()
            ?? rozjizdky.Where(r => r.Stav == StavRozjizdky.Dokoncena)
                .OrderByDescending(r => r.Cislo).FirstOrDefault();

        if (naRade is not null)
        {
            var jeji = await db.Trate
                .Where(t => t.ZavodId == zavodId && t.RozjizdkaId == naRade.Id
                            && t.Stav == StavTrati.Prijato)
                .OrderByDescending(t => t.Id)
                .FirstOrDefaultAsync(ct);
            if (jeji is not null) return jeji;
        }

        return await db.Trate
            .Where(t => t.ZavodId == zavodId && t.Stav == StavTrati.Prijato)
            .OrderByDescending(t => t.Id)
            .FirstOrDefaultAsync(ct);
    }

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

        var trat = await NaRadeAsync(zavodId, ct);
        if (trat is null) return null;

        var cislo = trat.RozjizdkaId is { } rozjizdka
            ? await db.Rozjizdky.Where(r => r.Id == rozjizdka)
                .Select(r => (int?)r.Cislo).FirstOrDefaultAsync(ct)
            : null;

        var prijato = trat.PrijatoV!.Value;

        // Fotky značek jdou ven s trať. <b>Jedním dotazem na celou trať</b>:
        // na konec zvlášť by to byl dotaz za každou bóji, a prvek jich má
        // až dvě.
        var fotky = await db.PrvkyTrati
            .Where(p => p.TratId == trat.Id)
            .SelectMany(p => p.BojeA!.Fotky.Concat(
                p.BojeB != null ? p.BojeB.Fotky : Enumerable.Empty<Fotky.Fotka>()))
            .Distinct()
            .OrderBy(f => f.NahranoV)
            .ToListAsync(ct);

        var podleBoje = fotky
            .GroupBy(f => f.UBojeId!.Value)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<Fotky.ObrazekDto>)[.. g
                    .Select(f => Fotky.Nahravani.Dto(f, uloziste.VerejnaAdresa))
                    .OfType<Fotky.ObrazekDto>()]);

        var surove = await db.PrvkyTrati
            .Where(p => p.TratId == trat.Id)
            .OrderBy(p => p.Poradi).ThenBy(p => p.Id)
            .Select(p => new
            {
                p.Typ, p.Poradi, p.Strana, p.Poznamka, p.Smer, p.DruhStartu,
                A = new { p.BojeAId, p.BojeA!.Nazev, p.BojeA.Sirka, p.BojeA.Delka,
                          p.BojeA.Barva, p.BojeA.Tvar, p.BojeA.Znaceni },
                B = p.BojeB != null
                    ? new { BojeAId = p.BojeB.Id, p.BojeB.Nazev, p.BojeB.Sirka, p.BojeB.Delka,
                            p.BojeB.Barva, p.BojeB.Tvar, p.BojeB.Znaceni }
                    : null,
            })
            .ToListAsync(ct);

        IReadOnlyList<Fotky.ObrazekDto>? KFotkam(int bojeId) =>
            podleBoje.TryGetValue(bojeId, out var f) && f.Count > 0 ? f : null;

        var prvky = surove
            .Select(p => new VerejnyPrvekDto(
                p.Typ, p.Poradi, p.Strana, p.Poznamka,
                new VerejnyKonecDto(
                    p.A.Nazev, p.A.Sirka, p.A.Delka,
                    p.A.Barva, p.A.Tvar, p.A.Znaceni, KFotkam(p.A.BojeAId)),
                p.B != null
                    ? new VerejnyKonecDto(
                        p.B.Nazev, p.B.Sirka, p.B.Delka,
                        p.B.Barva, p.B.Tvar, p.B.Znaceni, KFotkam(p.B.BojeAId))
                    : null,
                p.Smer, p.DruhStartu))
            .ToList();

        return new VerejnaTratDto(false, prijato, cislo, Prvky: prvky, Boje: await db.Boje
            .Where(b => b.ZavodId == zavodId
                        && b.PostavenaV <= prijato
                        && (b.NahrazenaV == null || b.NahrazenaV > prijato)
                        && (b.SebranaV == null || b.SebranaV > prijato))
            .OrderBy(b => b.Poradi).ThenBy(b => b.Id)
            .Select(b => new VerejnaBojeDto(
                b.Nazev, b.Poradi, b.Sirka, b.Delka, b.Barva, b.Tvar, b.Znaceni))
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

        // Prvky celé regaty najednou: otisk se z nich skládá a dotaz na
        // každou trať zvlášť by u osmi rozjížděk znamenal osm kol.
        var prvky = await db.PrvkyTrati
            .Where(p => p.Trat!.ZavodId == zavodId)
            .OrderBy(p => p.Poradi).ThenBy(p => p.Id)
            // Jen se z nich počítá otisk a počet. Sledovat je nemá smysl
            // a škodí to: mazání trati jinde jde přes `ExecuteDeleteAsync`
            // a sledovaná kopie by se pak smazala podruhé.
            .AsNoTracking()
            .ToListAsync(ct);
        var poTratich = prvky.GroupBy(p => p.TratId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var hotovo = new List<TratNaVyberDto>();
        foreach (var t in trate)
        {
            var sve = poTratich.GetValueOrDefault(t.Id) ?? [];
            hotovo.Add(new TratNaVyberDto(
                t.Id,
                t.Stav,
                t.RozjizdkaId is { } r && cisla.TryGetValue(r, out var c) ? c : null,
                t.PrijatoV,
                sve.Count,
                await OdjetaAsync(t, ct),
                JdePriradit: t.RozjizdkaId is null,
                Otisk: Otisk(sve)));
        }

        return hotovo;
    }

    /// <summary>
    /// Rozjížďky regaty do nabídky „na které trati se jede“.
    /// </summary>
    public async Task<List<RozjizdkaNaVyberDto>> RozjizdkyAsync(
        int zavodId, CancellationToken ct)
    {
        var rozjizdky = await db.Rozjizdky
            .Where(r => r.ZavodId == zavodId)
            .OrderBy(r => r.Cislo)
            .Select(r => new { r.Id, r.Cislo, r.StartV })
            .ToListAsync(ct);

        var trate = await db.Trate
            .Where(t => t.ZavodId == zavodId && t.RozjizdkaId != null)
            .Select(t => new { t.Id, RozjizdkaId = t.RozjizdkaId!.Value })
            .ToListAsync(ct);

        // Přestavba umí mít na jedné rozjížďce víc tratí; platí ta
        // poslední, protože právě ta nahradila předchozí.
        var naRozjizdce = trate
            .GroupBy(t => t.RozjizdkaId)
            .ToDictionary(g => g.Key, g => g.Max(t => t.Id));

        return [.. rozjizdky.Select(r => new RozjizdkaNaVyberDto(
            r.Cislo,
            naRozjizdce.TryGetValue(r.Id, out var tratId) ? tratId : null,
            Odstartovana: r.StartV is not null))];
    }

    /// <summary>
    /// <b>„V téhle rozjížďce se ta trať nejede.“</b> Odškrtnutí
    /// zaškrtávátka u rozjížďky.
    ///
    /// <para>
    /// <b>Instance zmizí jen tehdy, když stejná zbyde jinde</b> (Filip,
    /// 12. 10. 2026: <i>„odškrtnutí od rozjížďky smaže instanci trati,
    /// pokud není jediná taková, protože to by se pak nedala upravovat
    /// a změnit“</i>). Poslední trať toho předpisu se proto od rozjížďky
    /// jen odváže a zůstane v seznamu „na stole“ — jinak by odškrtnutí
    /// zahodilo práci, kterou nikdo zahodit nechtěl, a nebylo by co
    /// upravit. Zahodit ji nadobro jde z listu tratí, kde se to tak
    /// i jmenuje.
    /// </para>
    ///
    /// <para>
    /// <b>Rozhoduje o tom server, ne obrazovka.</b> „Stejná trať“ je
    /// shoda otisků a tu umí ověřit jedině ten, kdo vidí prvky všech
    /// tratí naráz; obrazovka by rozhodovala podle seznamu, který mezitím
    /// mohl zastarat.
    /// </para>
    /// </summary>
    public async Task<(string? Chyba, bool ChcePotvrdit)> OdvazAsync(
        int zavodId, int tratId, bool potvrzeno, CancellationToken ct)
    {
        var trat = await db.Trate
            .FirstOrDefaultAsync(t => t.Id == tratId && t.ZavodId == zavodId, ct);

        if (trat is null) return ("Taková trať u téhle regaty není.", false);
        if (trat.RozjizdkaId is null)
            return ("Tahle trať žádné rozjížďce nepatří, takže není co odškrtnout.", false);
        if (await ProcNejdeSahnoutAsync(trat, potvrzeno, ct) is var (proc, ptat) && proc is not null)
            return (proc, ptat);

        // Zbyde po odškrtnutí stejný předpis jinde? Pak je tahle instance
        // navíc a smaže se celá; jinak se jen uvolní. Prvky celé regaty
        // jedním dotazem — na trať zvlášť by to byl dotaz za každou.
        var poTratich = (await db.PrvkyTrati
                .Where(x => x.Trat!.ZavodId == zavodId)
                // Bez sledování schválně: níž se prvky mažou přes
                // `ExecuteDeleteAsync`, které jde mimo sledování změn,
                // takže sledovaná kopie by se EF při ukládání pokusila
                // smazat podruhé a spadlo by to na souběh.
                .AsNoTracking()
                .ToListAsync(ct))
            .GroupBy(x => x.TratId)
            .ToDictionary(g => g.Key, g => Otisk([.. g]));

        var muj = poTratich.GetValueOrDefault(trat.Id);
        var jinde = muj is not null
                    && poTratich.Any(x => x.Key != trat.Id && x.Value == muj);

        if (jinde) await SmazSPrvkyAsync(trat, ct);
        else trat.RozjizdkaId = null;

        await db.SaveChangesAsync(ct);
        return (null, false);
    }

    /// <summary>
    /// Zahodí trať i s jejím předpisem — knoflík v listu tratí.
    ///
    /// <para>
    /// <b>Co se zahodit nedá.</b> Trať, podle které se jelo, je doklad
    /// o závodu. Přijatá trať visí veřejně a zmizet smí jen vědomě, tedy
    /// přes vrácení rozhodčím.
    /// </para>
    ///
    /// <para>
    /// <b>Záznamy bójí zůstávají.</b> Prvek na ně jen ukazuje; bóje pořád
    /// stojí ve vodě a jejich poloha je měření, které se stalo.
    /// </para>
    /// </summary>
    public async Task<(string? Chyba, bool ChcePotvrdit)> ZahodAsync(
        int zavodId, int tratId, bool potvrzeno, CancellationToken ct)
    {
        var trat = await db.Trate
            .FirstOrDefaultAsync(t => t.Id == tratId && t.ZavodId == zavodId, ct);

        if (trat is null) return ("Taková trať u téhle regaty není.", false);
        if (await ProcNejdeSahnoutAsync(trat, potvrzeno, ct) is var (proc, ptat) && proc is not null)
            return (proc, ptat);

        await SmazSPrvkyAsync(trat, ct);
        await db.SaveChangesAsync(ct);
        return (null, false);
    }

    /// <summary>
    /// Označí trať i její prvky ke smazání.
    ///
    /// <para>
    /// <b>Přes sledování změn, ne `ExecuteDeleteAsync`.</b> To jde mimo
    /// ně, takže prvky, které si kontext načetl dřív — třeba když se
    /// o kousek výš klonovalo — by v něm zůstaly viset a uložení by je
    /// chtělo smazat podruhé. Skončí to `DbUpdateConcurrencyException`,
    /// tedy chybou o souběhu tam, kde žádný souběh není. Tahle past už
    /// jednou stála čas u mazání fotek bóje.
    /// </para>
    /// </summary>
    private async Task SmazSPrvkyAsync(Trat trat, CancellationToken ct)
    {
        db.PrvkyTrati.RemoveRange(
            await db.PrvkyTrati.Where(p => p.TratId == trat.Id).ToListAsync(ct));
        db.Trate.Remove(trat);
    }

    /// <summary>
    /// Proč se do téhle trati nesmí sáhnout, a jestli stačí potvrdit.
    ///
    /// <para>
    /// <b>Odjetá trať se nezamyká, jen se na ni ptá</b> (Filip,
    /// 12. 10. 2026: <i>„odjetou bych jen pojistil proti úpravám nějakým
    /// alertem… ale pokud se v tom někdo chce hrabat i po dojetí, tak
    /// bych to asi neblokoval; jen to celé pak vrátí workflow schvalování
    /// výsledků“</i>). Zámek by nutil obcházet cestou, kterou nikdo
    /// nevidí; otázka nechá rozhodnutí na tom, kdo ví, co dělá.
    /// </para>
    ///
    /// <para>
    /// <b>Na odjetou trať se proto ptáme dřív, než zamykáme přijetí</b>,
    /// a to ne pro pořádek: odjetá je trať jedině tehdy, když má
    /// <c>PrijatoV</c> a nějaká rozjížďka podle ní startovala — tedy
    /// <b>každá odjetá trať je zároveň přijatá</b>. V opačném pořadí by
    /// zámek přijetí zaskočil vždycky první a potvrzení by nešlo použít
    /// nikdy; byl by to mrtvý kód, který vypadá jako hotová funkce.
    /// (Chytily to až integrační testy, lokálně neběží.)
    /// </para>
    ///
    /// <para>
    /// <b>Přijatá, ale ještě neodjetá trať zamčená zůstává.</b> To je
    /// zámek rozhodčího, ne historie, a cesta ven existuje: přestavba.
    /// Vrácení to není — to umí jen trať, která teprve čeká na přijetí.
    /// </para>
    /// </summary>
    private async Task<(string? Proc, bool ChcePotvrdit)> ProcNejdeSahnoutAsync(
        Trat trat, bool potvrzeno, CancellationToken ct)
    {
        if (await OdjetaAsync(trat, ct))
            return potvrzeno
                ? (null, false)
                : ("Podle téhle trati se jelo. Zahodit ji může rozkopat výsledky té "
                   + "rozjížďky a celé je to pak vrátí do schvalování. Potvrď, že to tak chceš.",
                   true);

        return trat.Stav == StavTrati.Prijato
            ? ("Trať je přijatá a visí veřejně. Na změnu je přestavba.", false)
            : (null, false);
    }

    /// <summary>
    /// Otisk předpisu trati. Prázdná trať předpis nemá, takže <c>null</c>.
    /// <para>
    /// Je to prostý složený řetězec, ne hash: je kratší než trať sama,
    /// porovnává se jen sám se sebou a při ladění je na něm vidět, čím se
    /// dvě tratě liší. Hash by k tomu nepřidal nic než neprůhlednost.
    /// </para>
    /// </summary>
    private static string? Otisk(List<PrvekTrati> prvky) =>
        prvky.Count == 0
            ? null
            : string.Join("|", prvky
                .OrderBy(p => p.Poradi).ThenBy(p => p.Id)
                .Select(p => string.Join(
                    ":",
                    (int)p.Typ,
                    p.BojeAId,
                    p.BojeBId?.ToString() ?? "-",
                    p.Strana?.ToString() ?? "-",
                    p.Smer?.ToString() ?? "-",
                    p.DruhStartu?.ToString() ?? "-",
                    p.Poznamka ?? "-")));

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

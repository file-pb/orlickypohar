using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Okna;
using OrlickyPohar.Api.Features.Tracker;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Polohy;

/// <summary>
/// Jak je poloha stará.
/// <para>
/// <b>Tři stavy, ne dva.</b> Mezi „jede" a „nehlásí se" je stav, kdy
/// poslední poloha je stará minuty — loď tam je, jen zrovna nemá signál.
/// Dvoustavová kontrolka by z každého výpadku dělala poplach a závodní
/// výbor by sháněl loď, která nikam nezmizela.
/// </para>
/// </summary>
public enum StavPolohy
{
    /// <summary>Mladší než minuta. Tohle je ta zelená z „tracker checku".</summary>
    Cerstva = 0,

    /// <summary>Starší než minuta, mladší než pět. Loď je tam, rádio vynechalo.</summary>
    Starne = 1,

    /// <summary>Nic přes pět minut, nebo vůbec nic. Teprve tohle je otázka.</summary>
    Nedostupna = 2,
}

/// <summary>Jedna loď ve snímku. Poloha chybí u lodi, která se ještě neozvala.</summary>
public record PolohaLodi(
    int LodId,
    string Lod,
    string? CisloPlachty,
    string? Kategorie,
    double? Sirka,
    double? Delka,
    double? Kurz,
    double? RychlostMS,
    DateTimeOffset? CasGps,
    long? StariMs,
    StavPolohy Stav);

/// <summary>
/// Snímek pole v jednom okamžiku.
/// <para>
/// <b>Čas serveru je součástí odpovědi</b>, aby si stáří počítal klient
/// proti němu a ne proti svým hodinám — na tabuli v hospodě může běžet
/// stroj s hodinami o minuty vedle.
/// </para>
/// </summary>
public record SnimekPoloh(
    DateTimeOffset Ted,
    bool OknoBezi,
    DateTimeOffset? OknoOd,
    IReadOnlyList<PolohaLodi> Lode);

/// <summary>
/// Co z poloh vidí veřejnost.
/// <para>
/// <b>Vysílá se jen za jízdy.</b> Rozhodčí a pořadatel vidí celý blok na
/// vodě, veřejnost jen to, co je uvnitř okna rozjížďky — kde se kdo mezi
/// rozjížďkami koupal, do přenosu nepatří. Ořez zezadu se nedá udělat
/// dopředu (kdy rozjížďka skončí, se server dozví až potom), takže se
/// vydávání <b>vypíná</b>, ne dodatečně maže.
/// </para>
/// <para>
/// <b>Poslední známá poloha ven nepatří vůbec.</b> Je to bezpečnostní
/// údaj pro závodní výbor a drží se mimo uchovávané okno schválně;
/// veřejnosti by odpovídala na otázku, kterou si nemá klást.
/// </para>
/// </summary>
/// <param name="Vysila">
/// Běží veřejný přenos? <c>false</c> znamená „teď ne" — buď to rozhodčí
/// nepovolil, nebo zrovna neběží rozjížďka. Rozdíl mezi obojím se ven
/// neříká: tabuli i divákovi stačí, že se nevysílá.
/// </param>
public record VerejnyPohled(bool Vysila, DateTimeOffset Ted, IReadOnlyList<PolohaLodi> Lode);

/// <summary>
/// Co z poloh vidí posádka na vodě.
/// <para>
/// <b>Rozhoduje o tom přepínač <i>co vidí posádky</i></b>, který zamyká
/// rozprava — nic, jen sebe, nebo i ostatní. Výchozí hodnota je *jen sebe*,
/// a platí i pro regatu, kde nastavení nikdo nezaložil: zamrzá i to, co
/// nikdo nenastavil, takže výchozí hodnota musí být bezpečná.
/// </para>
/// <para>
/// <b>Mimo běžící okno se nevydává nic.</b> Je to tentýž řez jako
/// u nahrávání: klíč říká kdo, okno říká kdy. Po regatě se posádka na mapu
/// nedívá přes tuhle cestu.
/// </para>
/// </summary>
/// <param name="Vidi">
/// Je teď co ukazovat? <c>false</c> znamená „teď ne" — neběží okno, nebo to
/// rozhodčí nepovolil. Rozdíl mezi obojím se posádce neříká, stejně jako
/// u veřejného výdeje.
/// </param>
public record PohledPosadky(bool Vidi, DateTimeOffset Ted, IReadOnlyList<PolohaLodi> Lode);

/// <summary>
/// Poslední známá poloha každé lodi v regatě.
/// <para>
/// <b>Jeden dotaz do databáze bez ohledu na počet diváků.</b> Snímek se
/// drží ve společné cache na pár sekund — polohy chodí po minutě, takže
/// čerstvější data stejně neexistují a čtyřicet otevřených obrazovek nesmí
/// znamenat čtyřicet dotazů.
/// </para>
/// </summary>
/// <summary>Jeden bod záznamu. Jen kudy a kdy — rychlost ani kurz přehrávka nepotřebuje.</summary>
public record BodZaznamu(DateTimeOffset Cas, double Sirka, double Delka);

/// <summary>Stopa jedné lodi v dojeté rozjížďce.</summary>
public record LodZaznamu(int LodId, string Nazev, string? Kategorie, IReadOnlyList<BodZaznamu> Body);

/// <summary>
/// Záznam dojeté rozjížďky pro zrychlenou přehrávku.
/// <para>
/// <b>Vydává se za týchž podmínek jako živý přenos</b>, a navíc až po
/// dojetí: dokud rozjížďka běží, byl by záznam živým přenosem zadními
/// vrátky. <c>Vydava: false</c> znamená „tenhle záznam ne"; proč, se ven
/// neříká, stejně jako u živých poloh.
/// </para>
/// </summary>
public record ZaznamRozjizdky(
    bool Vydava,
    DateTimeOffset? Od,
    DateTimeOffset? Do,
    IReadOnlyList<LodZaznamu> Lode);

public class PolohySprava(AppDbContext db, TimeProvider cas, OknaSprava okna)
{
    /// <summary>Do minuty je poloha čerstvá — to je zelená z „tracker checku".</summary>
    public static readonly TimeSpan Cerstva = TimeSpan.FromMinutes(1);

    /// <summary>Do pěti minut loď stárne. Pak je to otázka pro závodní výbor.</summary>
    public static readonly TimeSpan Starne = TimeSpan.FromMinutes(5);

    /// <summary>
    /// O kolik začíná veřejný přenos dřív než rozjížďka. Startovní
    /// procedura je pět minut a patří do okna — je z ní takticky vidět
    /// víc než z celého zbytku rozjížďky.
    /// </summary>
    public static readonly TimeSpan Procedura = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Jak dlouho platí snímek. Kratší by nic nepřineslo — telefony posílají
    /// po minutě —, delší by se na tabuli projevil jako zadrhávání.
    /// </summary>
    public static readonly TimeSpan Platnost = TimeSpan.FromSeconds(5);

    /// <summary>
    /// Jak hustě se vydává záznam dojeté rozjížďky. Přehrávka zrychluje
    /// čtyřicetiminutovou rozjížďku na půl minuty, takže jemnější krok by
    /// se na obrazovce neprojevil a jen by natáhl odpověď.
    /// </summary>
    public static readonly TimeSpan KrokZaznamu = TimeSpan.FromSeconds(15);

    /// <summary>
    /// Strop bodů na loď. Dvacetičtyřhodinovka by jinak poslala desetitisíce
    /// bodů na loď a tabule v hospodě visí na jedné lince.
    /// </summary>
    public const int NejvicBoduZaznamu = 400;

    /// <summary>
    /// Nejdelší okno regaty. Tvrdý strop pro dopočet konce rozjížďky,
    /// která ho nemá zapsaný — táž mez, jakou má okno závodního dne.
    /// </summary>
    public static readonly TimeSpan NejdelsiOkno = TimeSpan.FromHours(36);

    /// <summary>Stavy účasti, ve kterých loď na regatě závodí.</summary>
    private static readonly StavUcasti[] NaZavode =
        [StavUcasti.Prihlasena, StavUcasti.Potvrzena];

    /// <summary>
    /// Snímek v cache. Statický schválně: správa je scoped (má `DbContext`),
    /// takže vlastní pole by cache nedělalo vůbec nic.
    /// </summary>
    private static readonly Dictionary<int, (DateTimeOffset Do, SnimekPoloh Snimek)> Cache = [];

    /// <summary>Totéž pro veřejný výdej. Vlastní, protože nese jiná data.</summary>
    private static readonly Dictionary<int, (DateTimeOffset Do, VerejnyPohled Pohled)> CacheVen = [];

    private static readonly Lock Zamek = new();

    public async Task<SnimekPoloh> SnimekAsync(int zavodId, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();

        lock (Zamek)
        {
            if (Cache.TryGetValue(zavodId, out var ulozeny) && ulozeny.Do > ted)
                return ulozeny.Snimek;
        }

        var snimek = await SpoctiAsync(zavodId, ted, ct);

        lock (Zamek)
        {
            Cache[zavodId] = (ted + Platnost, snimek);
        }

        return snimek;
    }

    /// <summary>Zahodí snímek regaty. Pro testy a pro okamžik, kdy se okno zavře.</summary>
    public static void Zapomen(int zavodId)
    {
        lock (Zamek)
        {
            Cache.Remove(zavodId);
            CacheVen.Remove(zavodId);
        }
    }

    /// <summary>
    /// Co se vydává ven. Dvě podmínky, obě musí platit: rozhodčí povolil
    /// <i>živý přenos ven</i> a <b>zrovna běží rozjížďka</b>.
    /// </summary>
    public async Task<VerejnyPohled> VerejnyAsync(int zavodId, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();

        lock (Zamek)
        {
            if (CacheVen.TryGetValue(zavodId, out var ulozeny) && ulozeny.Do > ted)
                return ulozeny.Pohled;
        }

        var pohled = await SpoctiVenAsync(zavodId, ted, ct);

        lock (Zamek)
        {
            CacheVen[zavodId] = (ted + Platnost, pohled);
        }

        return pohled;
    }

    /// <summary>
    /// Co uvidí telefon na palubě. Řídí se tím, co rozhodčí povolil
    /// (<see cref="CoVidiPosadky"/>), a běžícím oknem regaty.
    /// </summary>
    public async Task<PohledPosadky> ProPosadkuAsync(int lodId, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();

        var okno = await okna.ProLodAsync(lodId, ted, ct);
        if (okno is null) return new PohledPosadky(false, ted, []);

        // <b>Chybějící řádek nastavení znamená „jen sebe", ne „nic"</b> —
        // tatáž výchozí hodnota, jakou vydává `NastaveniSprava.NactiAsync`.
        // Bez přetypování na nullable by `FirstOrDefaultAsync` vrátilo
        // `default`, tedy `Nic`, a dvě místa by o téže regatě tvrdila dvě
        // různé věci.
        var co = await db.NastaveniTrackeru
            .Where(n => n.ZavodId == okno.ZavodId)
            .Select(n => (CoVidiPosadky?)n.CoVidiPosadky)
            .FirstOrDefaultAsync(ct) ?? CoVidiPosadky.JenSebe;

        if (co == CoVidiPosadky.Nic) return new PohledPosadky(false, ted, []);

        var snimek = await SnimekAsync(okno.ZavodId, ct);
        var lode = co == CoVidiPosadky.IOstatni
            ? snimek.Lode
            : snimek.Lode.Where(l => l.LodId == lodId);

        return new PohledPosadky(true, ted, [.. lode]);
    }

    /// <summary>
    /// Záznam dojeté rozjížďky pro zrychlenou přehrávku na tabuli.
    /// <para>
    /// Tři podmínky, všechny musí platit: rozhodčí povolil <i>živý přenos
    /// ven</i>, rozjížďka je <b>dokončená</b> a má známý start. Běžící
    /// rozjížďka se nevydává — byl by to živý přenos zadními vrátky, jen
    /// o minutu zpožděný.
    /// </para>
    /// </summary>
    public async Task<ZaznamRozjizdky> ZaznamAsync(int zavodId, int cislo, CancellationToken ct)
    {
        var pusti = await db.NastaveniTrackeru
            .Where(n => n.ZavodId == zavodId)
            .Select(n => n.ZivyPrenosVen)
            .FirstOrDefaultAsync(ct);
        if (!pusti) return new ZaznamRozjizdky(false, null, null, []);

        var rozjizdka = await db.Rozjizdky
            .Where(r => r.ZavodId == zavodId && r.Cislo == cislo)
            .Select(r => new { r.Stav, r.StartV, r.KonecV })
            .FirstOrDefaultAsync(ct);
        if (rozjizdka is null
            || rozjizdka.Stav != StavRozjizdky.Dokoncena
            || rozjizdka.StartV is null)
        {
            return new ZaznamRozjizdky(false, null, null, []);
        }

        // Procedura patří do záznamu ze stejného důvodu jako do přenosu:
        // je z ní takticky vidět víc než ze zbytku rozjížďky, a divák
        // v hospodě chce vidět právě start.
        var od = rozjizdka.StartV.Value - Procedura;
        /**
         * <b>Konec je rozhodnutí rozhodčího, a nemusí být zapsaný.</b>
         * Dokončená rozjížďka bez `KonecV` není chyba — dokončí ji i
         * zastavení času. Vzít místo něj „teď" by u červnové regaty
         * otevřelo okno dlouhé měsíce, takže konec dopočítá poslední bod,
         * co do něj přišel. Dál než tvrdý strop okna regaty se nedívá.
         */
        var doKdy = rozjizdka.KonecV;
        if (doKdy is null)
        {
            var strop = od + NejdelsiOkno;
            doKdy = await db.Trasy
                .Where(t => t.ZavodId == zavodId)
                .SelectMany(t => t.Body)
                .Where(b => b.CasGps >= od && b.CasGps <= strop)
                .MaxAsync(b => (DateTimeOffset?)b.CasGps, ct);
        }

        if (doKdy is null || doKdy <= od) return new ZaznamRozjizdky(false, null, null, []);

        var jmena = await db.Ucasti
            .Where(u => u.ZavodId == zavodId && NaZavode.Contains(u.Stav))
            .Select(u => new
            {
                u.Prihlaska!.LodId,
                u.Prihlaska.Lod!.Nazev,
                Kategorie = u.Prihlaska.Kategorie!.Nazev,
            })
            .ToListAsync(ct);
        var podleLodi = jmena
            .GroupBy(j => j.LodId)
            .ToDictionary(g => g.Key, g => g.First());

        var stopy = await db.Trasy
            .Where(t => t.ZavodId == zavodId)
            .Select(t => new
            {
                t.LodId,
                Body = t.Body
                    .Where(b => b.CasGps >= od && b.CasGps <= doKdy.Value)
                    .OrderBy(b => b.CasGps)
                    .Select(b => new BodZaznamu(b.CasGps, b.Sirka, b.Delka))
                    .ToList(),
            })
            .Where(x => x.Body.Count > 0)
            .ToListAsync(ct);

        var lode = stopy
            // <b>Jedna loď, jeden telefon.</b> Když jich hlásilo víc, vezme
            // se ta nejhustší stopa — slučovat dvě by znamenalo rozhodovat,
            // která je pravdivější, a to z bodů poznat nejde.
            .GroupBy(x => x.LodId)
            .Select(g => g.MaxBy(x => x.Body.Count)!)
            .Where(x => podleLodi.ContainsKey(x.LodId))
            .Select(x => new LodZaznamu(
                x.LodId,
                podleLodi[x.LodId].Nazev,
                podleLodi[x.LodId].Kategorie,
                Prorid(x.Body)))
            .OrderBy(l => l.Nazev, StringComparer.CurrentCulture)
            .ToList();

        return new ZaznamRozjizdky(true, od, doKdy.Value, lode);
    }

    /// <summary>
    /// Prořídí stopu na <see cref="KrokZaznamu"/> a na strop bodů. Poslední
    /// bod zůstává vždycky — na něm je vidět, kde loď dojela.
    /// </summary>
    private static List<BodZaznamu> Prorid(List<BodZaznamu> body)
    {
        if (body.Count == 0) return body;

        var krok = KrokZaznamu;
        // Dlouhá rozjížďka si krok roztáhne sama, aby se vešla pod strop.
        var rozsah = body[^1].Cas - body[0].Cas;
        if (rozsah > TimeSpan.Zero && rozsah / krok > NejvicBoduZaznamu)
            krok = rozsah / NejvicBoduZaznamu;

        var ven = new List<BodZaznamu> { body[0] };
        foreach (var bod in body)
        {
            if (bod.Cas - ven[^1].Cas >= krok) ven.Add(bod);
        }

        if (ven[^1] != body[^1]) ven.Add(body[^1]);
        return ven;
    }

    private async Task<VerejnyPohled> SpoctiVenAsync(
        int zavodId, DateTimeOffset ted, CancellationToken ct)
    {
        var pusti = await db.NastaveniTrackeru
            .Where(n => n.ZavodId == zavodId)
            .Select(n => n.ZivyPrenosVen)
            .FirstOrDefaultAsync(ct);
        if (!pusti) return new VerejnyPohled(false, ted, []);

        // <b>A běží závodní den.</b> Konec rozjížďky je rozhodnutí
        // rozhodčího, ne dopočet, takže rozjížďka může po uzavření dne
        // zůstat „běžící" — uzavření ji vypíše v `zbylo` a nic s ní nedělá.
        // Bez téhle podmínky by se pak vysílalo i večer, kdy se pole vrací
        // k molu: přesně ten výdej, kterému se má ořez vyhnout (změřeno
        // 25. 10. 2026 při zkoušce celého řetězu).
        if (await okna.BeziciAsync(zavodId, ted, ct) is null)
            return new VerejnyPohled(false, ted, []);

        // Rozjížďka, která právě běží. Bez ní se ven nevysílá — i když
        // telefony hlásí dál, protože pořadatelský přehled je na nich
        // závislý celý den.
        var jede = await db.Rozjizdky
            .Where(r => r.ZavodId == zavodId && r.Stav == StavRozjizdky.Probiha)
            .OrderByDescending(r => r.StartV)
            .FirstOrDefaultAsync(ct);
        if (jede is null) return new VerejnyPohled(false, ted, []);

        // Procedura je součást okna: pět minut varování, manévrování
        // u linie, hledání místa. Takticky je z toho vidět víc než ze
        // zbytku rozjížďky, takže ořez na výstřel by zahodil to nejcennější.
        var od = (jede.StartV ?? ted) - Procedura;

        var lode = await LodeAsync(zavodId, od, ted, ct);
        // Loď bez polohy se ven neposílá: divák nepotřebuje seznam
        // nehlásících se lodí, to je otázka pro závodní výbor.
        return new VerejnyPohled(true, ted, [.. lode.Where(l => l.Sirka is not null)]);
    }

    private async Task<SnimekPoloh> SpoctiAsync(
        int zavodId, DateTimeOffset ted, CancellationToken ct)
    {
        // Okno určuje, odkud brát body: polohy ze včerejška nejsou „poslední
        // známá poloha", jsou to data z jiného dne.
        var okno = await okna.BeziciAsync(zavodId, ted, ct)
                   ?? await db.Okna.Where(o => o.ZavodId == zavodId)
                       .OrderByDescending(o => o.OtevrenoV)
                       .FirstOrDefaultAsync(ct);

        if (okno is null)
        {
            var bezPoloh = await LodeAsync(zavodId, null, ted, ct);
            return new SnimekPoloh(ted, false, null, bezPoloh);
        }

        var lode = await LodeAsync(zavodId, okno.OtevrenoV, ted, ct);
        return new SnimekPoloh(ted, okno.Bezi(ted), okno.OtevrenoV, lode);
    }

    /// <summary>
    /// Celé pole s poslední polohou od zadaného okamžiku. <c>null</c> místo
    /// něj znamená „žádné polohy" — lodě se vrátí, ale všechny nedostupné.
    /// </summary>
    private async Task<List<PolohaLodi>> LodeAsync(
        int zavodId, DateTimeOffset? od, DateTimeOffset ted, CancellationToken ct)
    {
        var ucasti = await db.Ucasti
            .Where(u => u.ZavodId == zavodId && NaZavode.Contains(u.Stav))
            .Select(u => new
            {
                u.Prihlaska!.LodId,
                u.Prihlaska.Lod!.Nazev,
                u.Prihlaska.Lod.CisloPlachty,
                Kategorie = u.Prihlaska.Kategorie!.Nazev,
            })
            .ToListAsync(ct);

        PolohaLodi Bez(int lodId, string nazev, string? cislo, string? kategorie) =>
            new(lodId, nazev, cislo, kategorie,
                null, null, null, null, null, null, StavPolohy.Nedostupna);

        if (od is null)
        {
            return [.. ucasti.Select(u => Bez(u.LodId, u.Nazev, u.CisloPlachty, u.Kategorie))];
        }

        // Poslední bod každé trasy té regaty. Trasa na loď, ne naopak:
        // jedna loď může mít víc telefonů a vybere se ten, co hlásil
        // naposledy.
        var posledni = await db.Trasy
            .Where(t => t.ZavodId == zavodId)
            .Select(t => new
            {
                t.LodId,
                Bod = t.Body
                    .Where(b => b.CasGps >= od)
                    .OrderByDescending(b => b.CasGps)
                    .FirstOrDefault(),
            })
            .Where(x => x.Bod != null)
            .ToListAsync(ct);

        var podleLodi = posledni
            .GroupBy(x => x.LodId)
            .ToDictionary(g => g.Key, g => g.MaxBy(x => x.Bod!.CasGps)!.Bod!);

        return
        [
            .. ucasti.Select(u =>
            {
                if (!podleLodi.TryGetValue(u.LodId, out var bod))
                    return Bez(u.LodId, u.Nazev, u.CisloPlachty, u.Kategorie);

                var stari = ted - bod.CasGps;
                return new PolohaLodi(
                    u.LodId, u.Nazev, u.CisloPlachty, u.Kategorie,
                    bod.Sirka, bod.Delka, bod.Kurz, bod.RychlostMS, bod.CasGps,
                    (long)stari.TotalMilliseconds, Stav(stari));
            }),
        ];
    }

    /// <summary>
    /// Stáří na stav. Záporné stáří (bod z budoucnosti, telefon má
    /// přestavené hodiny) se bere jako čerstvé — bod přišel, a to je ta
    /// informace, kterou pořadatel potřebuje.
    /// </summary>
    public static StavPolohy Stav(TimeSpan stari) => stari switch
    {
        _ when stari < Cerstva => StavPolohy.Cerstva,
        _ when stari < Starne => StavPolohy.Starne,
        _ => StavPolohy.Nedostupna,
    };
}

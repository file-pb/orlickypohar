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
/// Poslední známá poloha každé lodi v regatě.
/// <para>
/// <b>Jeden dotaz do databáze bez ohledu na počet diváků.</b> Snímek se
/// drží ve společné cache na pár sekund — polohy chodí po minutě, takže
/// čerstvější data stejně neexistují a čtyřicet otevřených obrazovek nesmí
/// znamenat čtyřicet dotazů.
/// </para>
/// </summary>
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

    private async Task<VerejnyPohled> SpoctiVenAsync(
        int zavodId, DateTimeOffset ted, CancellationToken ct)
    {
        var pusti = await db.NastaveniTrackeru
            .Where(n => n.ZavodId == zavodId)
            .Select(n => n.ZivyPrenosVen)
            .FirstOrDefaultAsync(ct);
        if (!pusti) return new VerejnyPohled(false, ted, []);

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

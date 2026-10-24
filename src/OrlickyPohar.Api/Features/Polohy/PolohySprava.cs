using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Okna;
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
        lock (Zamek) Cache.Remove(zavodId);
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

        if (okno is null)
        {
            return new SnimekPoloh(ted, false, null, [.. ucasti.Select(u => new PolohaLodi(
                u.LodId, u.Nazev, u.CisloPlachty, u.Kategorie,
                null, null, null, null, null, null, StavPolohy.Nedostupna))]);
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
                    .Where(b => b.CasGps >= okno.OtevrenoV)
                    .OrderByDescending(b => b.CasGps)
                    .FirstOrDefault(),
            })
            .Where(x => x.Bod != null)
            .ToListAsync(ct);

        var podleLodi = posledni
            .GroupBy(x => x.LodId)
            .ToDictionary(g => g.Key, g => g.MaxBy(x => x.Bod!.CasGps)!.Bod!);

        var lode = ucasti.Select(u =>
        {
            if (!podleLodi.TryGetValue(u.LodId, out var bod))
            {
                return new PolohaLodi(
                    u.LodId, u.Nazev, u.CisloPlachty, u.Kategorie,
                    null, null, null, null, null, null, StavPolohy.Nedostupna);
            }

            var stari = ted - bod.CasGps;
            return new PolohaLodi(
                u.LodId, u.Nazev, u.CisloPlachty, u.Kategorie,
                bod.Sirka, bod.Delka, bod.Kurz, bod.RychlostMS, bod.CasGps,
                (long)stari.TotalMilliseconds, Stav(stari));
        }).ToList();

        return new SnimekPoloh(ted, okno.Bezi(ted), okno.OtevrenoV, lode);
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

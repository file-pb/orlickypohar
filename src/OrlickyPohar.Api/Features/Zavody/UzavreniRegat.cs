using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Jednou denně zavře regaty, na které se u konce dne zapomnělo
/// (<see cref="Uzavirani"/>).
///
/// <para>
/// <b>Zapíná se proměnnou <c>Zavody__Uzavirani=true</c></b>, jen v nasazení —
/// testy mají vlastní data a nemají přicházet o stav podle hodin. Jedna
/// replika; běžela-li by dvakrát, podruhé nenajde nic, protože hledá jen
/// vypsané. Až přibude druhá replika, patří sem zámek — stejně jako
/// u <c>UklidKontaktu</c>, podle kterého je tahle úloha udělaná.
/// </para>
/// </summary>
public class UzavreniRegat(IServiceScopeFactory sluzby, TimeProvider cas, ILogger<UzavreniRegat> log)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        using var takt = new PeriodicTimer(TimeSpan.FromDays(1), cas);
        do
        {
            try
            {
                await using var scope = sluzby.CreateAsyncScope();
                var zavrenych = await UzavriAsync(
                    scope.ServiceProvider.GetRequiredService<AppDbContext>(), cas.GetUtcNow(), stop);

                if (zavrenych.Count > 0)
                    log.LogInformation(
                        "Uzavřeno samo po dvou dnech: {Pocet} regat ({Slugy})",
                        zavrenych.Count, string.Join(", ", zavrenych));
            }
            catch (Exception e) when (e is not OperationCanceledException || !stop.IsCancellationRequested)
            {
                log.LogWarning(e, "Uzavírání regat se nepovedlo");
            }
        } while (await takt.WaitForNextTickAsync(stop));
    }

    /// <summary>
    /// Zavře, co má být zavřené. Vrací klíče regat, kterých se to týkalo.
    ///
    /// <para>
    /// <b>Výběr je úzký schválně.</b> Do paměti se tahají jen vypsané
    /// regaty, které mají aspoň jednu dokončenou rozjížďku a jejichž termín
    /// je starší než lhůta — rozhodnutí samo pak dělá
    /// <see cref="Uzavirani.MaSeUzavrit"/> nad přesným koncem závodního dne.
    /// </para>
    /// </summary>
    public static async Task<List<string>> UzavriAsync(
        AppDbContext db, DateTimeOffset ted, CancellationToken ct)
    {
        // Hrubé síto podle data: poslední vypsaný den starší než lhůta —
        // u dvoudenní regaty tedy ten druhý, ne ten první. Jemné síto
        // (skutečný konec dne) se počítá až na vybraných.
        var hranice = DateOnly.FromDateTime((ted - Uzavirani.Lhuta).UtcDateTime);

        var kandidati = await db.Zavody
            .Where(z => z.Stav == StavZavodu.Vypsany
                        && (z.DatumKonce ?? z.Datum) <= hranice)
            .Select(z => new
            {
                Zavod = z,
                MaOdjetou = z.Rozjizdky.Any(r => r.Stav == StavRozjizdky.Dokoncena),
                KonecDne = db.Okna
                    .Where(o => o.ZavodId == z.Id)
                    .Select(o => (DateTimeOffset?)(o.ZavrenoV ?? o.TvrdyKonec))
                    .Max(),
            })
            .ToListAsync(ct);

        var zavrene = new List<string>();
        foreach (var k in kandidati)
        {
            if (!Uzavirani.MaSeUzavrit(
                    k.Zavod.Stav, k.MaOdjetou, k.KonecDne,
                    k.Zavod.Datum, k.Zavod.DatumKonce, ted)) continue;

            k.Zavod.Stav = StavZavodu.Odjety;
            k.Zavod.UzavrenoAutomatemV = ted;
            zavrene.Add(k.Zavod.Slug);
        }

        if (zavrene.Count > 0) await db.SaveChangesAsync(ct);
        return zavrene;
    }
}

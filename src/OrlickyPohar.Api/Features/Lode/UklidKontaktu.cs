using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Jednou denně smaže kontakty starší, než se drží (<see cref="Kontakty.SmazatStarsiNez"/>):
/// historii kontaktů osob i kopie na přihláškách ze zastávek té doby.
/// <para>
/// <b>Zapíná se proměnnou <c>Kontakty__Uklid=true</c></b>, jen v nasazení —
/// testy mají vlastní data a nemají o ně přicházet podle hodin.
/// </para>
/// <para>
/// Jedna replika; běžela-li by dvakrát, smaže totéž dvakrát a nic se
/// nestane. Až přibude druhá replika, patří sem zámek.
/// </para>
/// </summary>
public class UklidKontaktu(IServiceScopeFactory sluzby, TimeProvider cas, ILogger<UklidKontaktu> log)
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
                var (kontaktu, prihlasek) = await UklidAsync(
                    scope.ServiceProvider.GetRequiredService<AppDbContext>(), cas.GetUtcNow(), stop);

                if (kontaktu + prihlasek > 0)
                    log.LogInformation("Úklid kontaktů: {Kontaktu} z historie osob, {Prihlasek} z přihlášek",
                        kontaktu, prihlasek);
            }
            catch (Exception e) when (e is not OperationCanceledException || !stop.IsCancellationRequested)
            {
                log.LogWarning(e, "Úklid kontaktů se nepovedl");
            }
        } while (await takt.WaitForNextTickAsync(stop));
    }

    /// <summary>Smaže staré kontakty. Vrací, kolik čeho ubylo.</summary>
    public static async Task<(int Kontaktu, int Prihlasek)> UklidAsync(
        AppDbContext db, DateTimeOffset ted, CancellationToken ct)
    {
        var hranice = Kontakty.SmazatStarsiNez(ted);
        var denHranice = DateOnly.FromDateTime(hranice.UtcDateTime);

        var kontaktu = await db.Set<KontaktOsoby>()
            .Where(k => k.ZadanoV < hranice)
            .ExecuteDeleteAsync(ct);

        // Kopie na přihlášce patří k zastávce, takže rozhoduje její termín,
        // ne okamžik podání — pozdní přihláška se drží stejně dlouho.
        var prihlasek = await db.Ucasti
            .Where(u => u.Zavod!.Datum < denHranice && (u.KontaktEmail != null || u.KontaktTelefon != null))
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.KontaktEmail, (string?)null)
                .SetProperty(u => u.KontaktTelefon, (string?)null), ct);

        return (kontaktu, prihlasek);
    }
}

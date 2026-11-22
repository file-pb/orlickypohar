using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Trasy;

/// <summary>
/// Jak dlouho se zaznamenané trasy drží. <b>Čistá funkce</b> — hranice se
/// musí dát zkoušet bez databáze a bez hodin.
/// </summary>
public static class Retence
{
    /// <summary>
    /// Trasy se drží <b>do konce následující sezóny</b>, stejně jako kontakty
    /// kapitánů. Záznam z roku 2026 tedy vydrží celý rok 2027 a 1. ledna 2028
    /// zmizí.
    /// <para>
    /// <b>Proč stejná mez jako u kontaktů:</b> jeden důvod, jedno pravidlo.
    /// Dvě různé lhůty znamenají dvě věty v zásadách a dvě data, která si
    /// nikdo nespojí. Sezóna navíc je tu kvůli protestům a dohledávání —
    /// podklad k rozhodnutí rozhodčího má přežít do dalšího ročníku.
    /// </para>
    /// </summary>
    public static DateTimeOffset SmazatStarsiNez(DateTimeOffset ted) =>
        new(ted.Year - 1, 1, 1, 0, 0, 0, TimeSpan.Zero);
}

/// <summary>
/// Jednou denně smaže trasy starší, než se drží (<see cref="Retence"/>).
///
/// <para>
/// <b>Chybělo to.</b> <see cref="Trasa"/> má v popisu od začátku napsané, že
/// tvrdý konec okna závodního dne je mez, za kterou se trasa neuchovává —
/// jenže úloha, která by to prováděla, nikdy nevznikla. Úklid v API existoval
/// pro kontakty, fotky, upozornění, přejaté články a vodočet; pro trasy ne,
/// takže se nemazaly vůbec.
/// </para>
/// <para>
/// <b>Proč to nevisí na smazání účtu.</b> Trasa patří lodi, ne člověku: visí
/// na mobilním klíči a na lodi, a účet v ní nefiguruje vůbec. Mazat ji při
/// rušení účtu by znamenalo smazat data lodi, jejíž posádka zůstává — a
/// spouštěla by to špatná událost, třeba odchod fanouška. Retence je událost
/// správná: trasa zmizí, protože je stará, ne protože někdo odešel.
/// (Rozhodl Filip, 22. 11. 2026.)
/// </para>
/// <para>
/// <b>Zapíná se proměnnou <c>Trasy__Uklid=true</c></b>, jen v nasazení —
/// testy mají vlastní data a nemají o ně přicházet podle hodin. Jedna
/// replika; běžela-li by dvakrát, smaže totéž dvakrát a nic se nestane.
/// Až přibude druhá replika, patří sem zámek.
/// </para>
/// </summary>
public class UklidTras(IServiceScopeFactory sluzby, TimeProvider cas, ILogger<UklidTras> log)
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
                var (tras, bodu) = await UklidAsync(
                    scope.ServiceProvider.GetRequiredService<AppDbContext>(), cas.GetUtcNow(), stop);

                if (tras > 0)
                    log.LogInformation("Úklid tras: {Tras} tras, {Bodu} bodů", tras, bodu);
            }
            catch (Exception e) when (e is not OperationCanceledException || !stop.IsCancellationRequested)
            {
                log.LogWarning(e, "Úklid tras se nepovedl");
            }
        } while (await takt.WaitForNextTickAsync(stop));
    }

    /// <summary>
    /// Smaže staré trasy i s body. Vrací, kolik čeho ubylo.
    /// <para>
    /// <b>Rozhoduje <see cref="Trasa.NahranoV"/>, ne <see cref="Trasa.Zacatek"/>.</b>
    /// Začátek jsou hodiny telefonu a ty se dají přestavit — trasa s datem
    /// v roce 2019 by zmizela hned a trasa s datem v budoucnosti nikdy.
    /// Okamžik nahrání měří server, takže se podle něj uklízet dá.
    /// </para>
    /// <para>
    /// <b>Body se mažou výslovně, ne cizím klíčem.</b> Kaskáda v databázi by
    /// je vzala s sebou, jenže pak by se nedalo říct, kolik jich bylo — a
    /// u úlohy, která tiše maže data, je počet v logu to jediné, z čeho se
    /// pozná, že udělala, co měla.
    /// </para>
    /// </summary>
    public static async Task<(int Tras, int Bodu)> UklidAsync(
        AppDbContext db, DateTimeOffset ted, CancellationToken ct)
    {
        var hranice = Retence.SmazatStarsiNez(ted);

        var bodu = await db.TrasaBody
            .Where(b => b.Trasa!.NahranoV < hranice)
            .ExecuteDeleteAsync(ct);

        var tras = await db.Trasy
            .Where(t => t.NahranoV < hranice)
            .ExecuteDeleteAsync(ct);

        return (tras, bodu);
    }
}

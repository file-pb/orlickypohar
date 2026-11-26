using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace OrlickyPohar.Api.Features.Klice;

/// <summary>
/// Ověření klíče k účtu — <b>klíč se chová jako přihlášení</b>.
///
/// <para>
/// <b>Proč handler, a ne kontrola v endpointu.</b> Klíč k lodi se ověřuje
/// ručně v každé cestě, která ho bere (<c>ZHlavickyAsync</c>), a je jich
/// pět. Klíč k účtu otevírá administraci, tedy desítky cest — a přepsat
/// do nich kontrolu by znamenalo <b>druhé místo, kde se rozhoduje o tom,
/// kdo co smí</b>. Přesně před tím varuje komentář u
/// <see cref="KlicLodi"/>: dvě různé cesty k témuž jsou dvě místa, kde se
/// dá udělat chyba v bezpečnosti.
/// </para>
///
/// <para>
/// Takhle z klíče vznikne obyčejný přihlášený principál a
/// <c>RequireAuthorization()</c>, <see cref="Sprava.Rozsahy"/> i
/// <see cref="Identita.Prava"/> pracují dál beze změny. <b>Žádný endpoint
/// se kvůli tomu nemění.</b>
/// </para>
///
/// <para>
/// <b>Nese interní účet, ne dvojici vydavatel+subjekt.</b> Klíč není od
/// poskytovatele identity, takže předstírat jeho nárok <c>sub</c> by byla
/// lež v tabulce, která má jediný úkol: říct, který cizí subjekt patří
/// kterému našemu účtu. Místo toho jde dál <see cref="KliceUctuSprava.NarokUzivatel"/>
/// a <see cref="Sprava.Rozsahy"/> ho vezme přednostně — je to jedna
/// podmínka na jednom místě.
/// </para>
/// </summary>
public class KlicUctuHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> nastaveni,
    ILoggerFactory logy,
    UrlEncoder kodovani,
    KliceUctuSprava klice)
    : AuthenticationHandler<AuthenticationSchemeOptions>(nastaveni, logy, kodovani)
{
    public const string Schema = "KlicUctu";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var hodnota = Request.Headers[KliceUctuSprava.Hlavicka].ToString();

        // <b>Chybějící hlavička není selhání, je to „nic".</b> Jinak by
        // každý nepřihlášený požadavek skončil v logu jako odmítnutý
        // a zároveň by se nedostal k druhému schématu, které si s ním
        // poradí.
        if (string.IsNullOrWhiteSpace(hodnota)) return AuthenticateResult.NoResult();

        if (await klice.OverAsync(hodnota, Context.RequestAborted) is not { } klic)
            return AuthenticateResult.Fail("Neznámý nebo odebraný klíč k účtu.");

        var totoznost = new ClaimsIdentity(
            [new Claim(KliceUctuSprava.NarokUzivatel, klic.UzivatelId.ToString())],
            Schema);

        return AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(totoznost), Schema));
    }
}

using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Klice;

/// <summary>Co telefon posílá, když se napojuje.</summary>
/// <param name="Kod">Kód z QR nebo opsaný z obrazovky.</param>
/// <param name="Zarizeni">Jak se ten telefon jmenuje, ať se v seznamu pozná.</param>
public record NapojVstup(string Kod, string? Zarizeni);

/// <summary>
/// Napojení telefonu na účet — QR na vlastním profilu, jako WhatsApp.
///
/// <para>
/// <b>Kdo QR vidí, je jeho majitel.</b> Kód vystavuje přihlášený sám sobě,
/// ne správce někomu jinému: tím odpadá otázka „komu ho vydat" i celá
/// obrazovka pro správu cizích kódů (Filip, 26. 11. 2026: *„co nejjednodušší
/// řešení"*).
/// </para>
/// </summary>
public static class KliceUctuEndpoints
{
    public static void MapKliceUctu(this IEndpointRouteBuilder app)
    {
        app.MapPost("/ja/klice/kod", VystavAsync)
            .RequireAuthorization()
            .WithTags("Klíče")
            .WithSummary("Vystaví jednorázový kód pro napojení telefonu")
            .WithDescription(
                "Kód platí minuty a uplatnit ho jde jednou. Vystavením se "
                + "ruší starý nevyužitý kód téhož účtu.");

        // <b>Jediná cesta bez přihlášení</b>, stejně jako uplatnění
        // pozvánky k lodi: kód sám je tím oprávněním. Kdyby tahle cesta
        // přihlášení vyžadovala, nemá se kde vzít — telefon se právě
        // napojuje proto, že žádné nemá.
        app.MapPost("/klice/napojit", NapojAsync)
            .WithTags("Klíče")
            .WithSummary("Vymění kód za klíč k účtu")
            .WithDescription(
                "Vrací klíč jedinkrát. Vymyšlený, propadlý i už uplatněný "
                + "kód dopadnou stejně, aby se z odpovědi nedalo nic vyčíst.");

        app.MapGet("/ja/klice", MojeAsync)
            .RequireAuthorization()
            .WithTags("Klíče")
            .WithSummary("Telefony napojené na přihlášený účet");

        app.MapDelete("/ja/klice/{id:int}", OdeberAsync)
            .RequireAuthorization()
            .WithTags("Klíče")
            .WithSummary("Odebere napojený telefon");
    }

    private static async Task<Results<Ok<NapojeniKodDto>, UnauthorizedHttpResult>> VystavAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, KliceUctuSprava klice, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel)
            return TypedResults.Unauthorized();

        return TypedResults.Ok(await klice.VystavKodAsync(uzivatel, ct));
    }

    private static async Task<Results<Ok<NapojeniDto>, UnauthorizedHttpResult>> NapojAsync(
        NapojVstup vstup, KliceUctuSprava klice, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(vstup.Kod)) return TypedResults.Unauthorized();

        return await klice.NapojAsync(vstup.Kod.Trim(), vstup.Zarizeni, ct) is { } napojeni
            ? TypedResults.Ok(napojeni)
            : TypedResults.Unauthorized();
    }

    private static async Task<Results<Ok<List<KlicUctuDto>>, UnauthorizedHttpResult>> MojeAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, KliceUctuSprava klice, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel)
            return TypedResults.Unauthorized();

        return TypedResults.Ok(await klice.MojeAsync(uzivatel, ct));
    }

    private static async Task<Results<NoContent, NotFound, UnauthorizedHttpResult>> OdeberAsync(
        int id, ClaimsPrincipal kdo, Rozsahy rozsahy, KliceUctuSprava klice, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel)
            return TypedResults.Unauthorized();

        return await klice.OdeberAsync(uzivatel, id, ct)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();
    }
}

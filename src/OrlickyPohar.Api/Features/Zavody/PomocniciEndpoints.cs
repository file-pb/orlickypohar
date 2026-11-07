using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Zaškrtnutí, nebo odškrtnutí pomocníka.</summary>
/// <param name="Pomaha">Má u startu a cíle pomáhat?</param>
public record PomocVstup(bool Pomaha);

/// <summary>
/// <b>Kdo z pořadatelů dneska pomáhá u startu a u cíle</b> (nález K8,
/// rozhodnuto Filipem 28. 10. 2026).
///
/// <para>
/// <b>Vlastní cesta vedle přihlášek, i když se obsluhuje z téže obrazovky.</b>
/// U zápisu v klubovně se zaškrtává podle papíru, co kdo z pořadatelů bude
/// dneska dělat — ale je to rozhodnutí o lidech, ne o lodích. Mísit je do
/// cesty přihlášek by znamenalo, že zámek listiny po rozpravě
/// (<see cref="Prihlasky.PoRozprave"/>) by musel vědět, že některá těla se
/// ho netýkají.
/// </para>
/// </summary>
public static class PomocniciEndpoints
{
    public static void MapPomocniky(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/pomocnici");

        g.MapGet("/", SeznamAsync)
            .Produces<PomocniciDto>()
            .WithSummary("Pořadatelé ročníku a kdo z nich pomáhá u startu a cíle")
            .WithDescription(
                "Čte rozhodčí ročníku i pořadatel regaty; zaškrtávat smí jen "
                + "rozhodčí, a odpověď to říká v `smiZaskrtavat`.\n\n"
                + "Kandidáti jsou pořadatelé **kterékoliv zastávky ročníku**, ne "
                + "jen téhle — o to jde: u cíle stojí často pořadatel odjinud, "
                + "který by jinak musel dostat celou tuhle regatu. U koho je "
                + "`jeZdejsi`, tomu zaškrtnutí nic nepřidá.");

        g.MapPut("/{uzivatel:guid}", NastavAsync)
            .Produces<PomocniciDto>()
            .WithSummary("Rozhodčí zaškrtne, nebo odškrtne pomocníka u startu a cíle")
            .WithDescription(
                "Jen rozhodčí ročníku, a jen u někoho, kdo už je pořadatelem "
                + "některé zastávky ročníku — příznak se neudílí jako role.\n\n"
                + "**Co otevírá:** převzetí velení, startovní proceduru, zápis "
                + "startu a konce, zápis dojezdů a papírový zápis. **Co "
                + "neotevírá:** startovní listinu, zakládání rozjížděk, posun "
                + "výsledků ve workflow, pohár ani publikaci.\n\n"
                + "**Váže se na jednu regatu**, ne na ročník, a odškrtnutí se "
                + "zapisuje, nemaže — po regatě zůstává doklad, kdo toho dne "
                + "u startu a u cíle stál a kdo ho tam pustil.");
    }

    private static async Task<IResult> SeznamAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy,
        PomocniciSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        var rozhodci = await JeRozhodciAsync(kdo, rozsahy, rozsah, ct);
        var poradatel = await rozsahy.SmiAsync(
            kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct);

        if (!rozhodci && !poradatel) return Results.Forbid();

        return Results.Ok(new PomocniciDto(
            rozhodci,
            await sprava.PoradateleAsync(rozsah.SerieId, rozsah.ZavodId.Value, ct)));
    }

    private static async Task<IResult> NastavAsync(
        string serie, string zavod, Guid uzivatel, PomocVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, PomocniciSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();
        if (!await JeRozhodciAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } ja) return Results.Forbid();

        var chyba = vstup.Pomaha
            ? await sprava.ZaskrtniAsync(rozsah.SerieId, rozsah.ZavodId.Value, uzivatel, ja, ct)
            : await sprava.OdskrtniAsync(rozsah.ZavodId.Value, uzivatel, ja, ct);

        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return Results.Ok(new PomocniciDto(
            true,
            await sprava.PoradateleAsync(rozsah.SerieId, rozsah.ZavodId.Value, ct)));
    }

    /// <summary>
    /// Zaškrtává rozhodčí ročníku; správce ho pokrývá. Pořadatel ne — kdyby
    /// si pomocníka zaškrtl sám, obešel by tím to, co rozhodčí právě
    /// uzamkl: že o startovní listině a o výsledcích rozhoduje on.
    /// </summary>
    private static Task<bool> JeRozhodciAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}

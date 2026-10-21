using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Trasy;

/// <summary>
/// Nahrávání tras z telefonu na palubě.
/// <para>
/// <b>Posádka nahrává za sebe, ne za loď.</b> Trasa patří tomu, kdo ji
/// nahrál; dokud nebude párování telefonu s lodí, je jméno lodi jen text,
/// který posádka zadala při startu záznamu.
/// </para>
/// <para>
/// <b>Veřejné čtení tu není a nebude v pilotu.</b> Kdo trasy vidí, je
/// rozhodnutí rozhodčího — stejně jako u bójí a u živých poloh.
/// </para>
/// </summary>
public static class TrasyEndpoints
{
    public static void MapTrasy(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/trasy").WithTags("Trasy").RequireAuthorization();

        g.MapGet("/", MojeAsync)
            .Produces<List<TrasaDto>>()
            .WithSummary("Vypíše trasy, které přihlášený nahrál")
            .WithDescription("Včetně rozdělaných — podle `dokoncena` se pozná, co se ještě doposílá.");

        g.MapPost("/", ZalozAsync)
            .Produces<TrasaDto>()
            .WithSummary("Založí trasu, nebo vrátí tu existující")
            .WithDescription(
                "Idempotentní podle `lokalniId`, které si vyrábí telefon. Opakované " +
                "volání druhou trasu nezaloží — na vodě signál padá a nahrání se " +
                "bude opakovat.");

        g.MapPost("/{lokalniId}/body", PridejAsync)
            .Produces<DavkaDto>()
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Přijme dávku bodů")
            .WithDescription(
                "Idempotentní podle pořadového čísla bodu v telefonu: body, které " +
                "už došly, se přeskočí a v odpovědi se započítají jako `preskoceno`. " +
                "Opakované poslání téže dávky tedy nic nezdvojí.");

        g.MapPost("/{lokalniId}/dokonceno", DokonciAsync)
            .Produces<TrasaDto>()
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Uzavře nahrávání trasy")
            .WithDescription("Do té doby je trasa rozdělaná a smí se do ní doposílat.");
    }

    private static async Task<Results<Ok<List<TrasaDto>>, UnauthorizedHttpResult>> MojeAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, TrasySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel)
            return TypedResults.Unauthorized();

        return TypedResults.Ok(await sprava.MojeAsync(uzivatel, ct));
    }

    private static async Task<Results<Ok<TrasaDto>, UnauthorizedHttpResult, ValidationProblem>>
        ZalozAsync(
            ZalozTrasuVstup vstup, ClaimsPrincipal kdo, Rozsahy rozsahy, TrasySprava sprava,
            CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel)
            return TypedResults.Unauthorized();

        if (string.IsNullOrWhiteSpace(vstup.LokalniId))
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["lokalniId"] = ["Identifikátor trasy z telefonu chybí."],
            });

        // Jméno lodi je povinné schválně: přejímací podmínka č. 6 je
        // „telefon přiřazený ke špatné lodi" a potvrzení jména při startu
        // záznamu je to nejmenší, co ji pokrývá.
        if (string.IsNullOrWhiteSpace(vstup.Lod))
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["lod"] = ["Jméno lodi chybí."],
            });

        return TypedResults.Ok(await sprava.ZalozAsync(uzivatel, vstup, ct));
    }

    private static async Task<Results<Ok<DavkaDto>, NotFound, UnauthorizedHttpResult>> PridejAsync(
        string lokalniId, List<BodVstup> body, ClaimsPrincipal kdo, Rozsahy rozsahy,
        TrasySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel)
            return TypedResults.Unauthorized();

        return await sprava.PridejAsync(uzivatel, lokalniId, body, ct) is { } davka
            ? TypedResults.Ok(davka)
            : TypedResults.NotFound();
    }

    private static async Task<Results<Ok<TrasaDto>, NotFound, UnauthorizedHttpResult>> DokonciAsync(
        string lokalniId, DokonceniVstup? vstup, ClaimsPrincipal kdo, Rozsahy rozsahy,
        TrasySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel)
            return TypedResults.Unauthorized();

        return await sprava.DokonciAsync(uzivatel, lokalniId, vstup?.Konec, ct) is { } trasa
            ? TypedResults.Ok(trasa)
            : TypedResults.NotFound();
    }
}

/// <summary>Kdy posádka záznam ukončila. Nepovinné — server si vystačí s tím, co má.</summary>
public record DokonceniVstup(DateTimeOffset? Konec);

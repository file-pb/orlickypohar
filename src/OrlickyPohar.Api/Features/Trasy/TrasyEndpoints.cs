using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;
using OrlickyPohar.Api.Features.Klice;

namespace OrlickyPohar.Api.Features.Trasy;

/// <summary>
/// Nahrávání tras z telefonu na palubě.
/// <para>
/// <b>Prokazuje se mobilním klíčem, ne přihlášením.</b> Trasa patří lodi,
/// ne člověku, a nahrávání jde touhle cestou vždycky — ať telefon drží
/// kapitán nebo posádka. Dvě různé cesty k témuž by znamenaly dvě místa,
/// kde se dá udělat chyba v bezpečnosti.
/// </para>
/// <para>
/// <b>Veřejné čtení tu není a nebude v pilotu.</b> Kdo trasy vidí, je
/// rozhodnutí rozhodčího — stejně jako u bójí a u živých poloh.
/// </para>
/// </summary>
public static class TrasyEndpoints
{
    /// <summary>Hlavička, ve které telefon posílá svůj klíč.</summary>
    public const string HlavickaKlice = KliceSprava.Hlavicka;

    public static void MapTrasy(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/trasy").WithTags("Trasy");

        g.MapGet("/", MojeAsync)
            .Produces<List<TrasaDto>>()
            .WithSummary("Vypíše trasy nahrané tímhle telefonem")
            .WithDescription("Včetně rozdělaných — podle `dokoncena` se pozná, co se ještě doposílá.");

        g.MapPost("/", ZalozAsync)
            .Produces<TrasaDto>()
            .Produces<ChybaTrasy>(StatusCodes.Status409Conflict)
            .WithSummary("Založí trasu, nebo vrátí tu existující")
            .WithDescription(
                "Idempotentní podle `lokalniId`, které si vyrábí telefon. Opakované " +
                "volání druhou trasu nezaloží — na vodě signál padá a nahrání se " +
                "bude opakovat. **Bez běžícího okna regaty trasa nevznikne** a vrací " +
                "se 409: záznam smí běžet jen od rozpravy do uzavření závodního dne " +
                "a jen lodi, která je v té regatě přihlášená. Doposílat do už " +
                "založené trasy jde i potom.");

        g.MapPost("/{lokalniId}/body", PridejAsync)
            // Tělo se v dokumentu pojmenuje ručně, protože handler ho bere
            // jako `JsonElement` — viz komentář u `PridejAsync`.
            .Accepts<List<BodVstup>>("application/json")
            .Produces<DavkaDto>()
            .WithSummary("Přijme dávku bodů")
            .WithDescription(
                "Idempotentní podle pořadového čísla bodu v telefonu: body, které " +
                "už došly, se přeskočí a započítají jako `preskoceno`.");

        g.MapPost("/{lokalniId}/dokonceno", DokonciAsync)
            .Produces<TrasaDto>()
            .WithSummary("Uzavře nahrávání trasy")
            .WithDescription("Do té doby je trasa rozdělaná a smí se do ní doposílat.");
    }

    /// <summary>
    /// Najde klíč podle hlavičky. `null` u chybějícího, neznámého,
    /// odepnutého i odebraného — <b>všechny případy dopadnou stejně</b>, aby
    /// se z odpovědi nedalo nic vyčíst.
    /// </summary>
    private static Task<KlicLodi?> KlicAsync(
        HttpContext ctx, KliceSprava klice, CancellationToken ct) =>
        klice.ZHlavickyAsync(ctx, ct);

    private static async Task<Results<Ok<List<TrasaDto>>, UnauthorizedHttpResult>> MojeAsync(
        HttpContext ctx, KliceSprava klice, TrasySprava sprava, CancellationToken ct)
    {
        if (await KlicAsync(ctx, klice, ct) is not { } klic) return TypedResults.Unauthorized();
        return TypedResults.Ok(await sprava.MojeAsync(klic, ct));
    }

    private static async Task<Results<Ok<TrasaDto>, UnauthorizedHttpResult, ValidationProblem,
            Conflict<ChybaTrasy>>>
        ZalozAsync(
            ZalozTrasuVstup vstup, HttpContext ctx, KliceSprava klice, TrasySprava sprava,
            CancellationToken ct)
    {
        if (await KlicAsync(ctx, klice, ct) is not { } klic) return TypedResults.Unauthorized();

        if (string.IsNullOrWhiteSpace(vstup.LokalniId))
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["lokalniId"] = ["Identifikátor trasy z telefonu chybí."],
            });

        // Jméno lodi je povinné schválně: přejímací podmínka č. 6 je
        // „telefon přiřazený ke špatné lodi" a potvrzení jména při startu
        // záznamu je to nejmenší, co ji pokrývá. Klíč sice loď zná, ale
        // rozejití obou hodnot je právě ta chyba, kterou chceme vidět.
        if (string.IsNullOrWhiteSpace(vstup.Lod))
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["lod"] = ["Jméno lodi chybí."],
            });

        var (trasa, chyba) = await sprava.ZalozAsync(klic, vstup, ct);
        return trasa is null
            ? TypedResults.Conflict(new ChybaTrasy(chyba!))
            : TypedResults.Ok(trasa);
    }

    /// <summary>
    /// <b>Tělo bere jako <c>JsonElement</c> schválně.</b> U parametru typu
    /// <c>List&lt;BodVstup&gt;</c> odmítne špatný tvar rovnou model binding,
    /// tedy <b>dřív než se ověří klíč</b>, a endpoint pak i bez klíče
    /// odpoví 400 místo 401 — prozradí tím, že existuje a jaký tvar čeká.
    /// Chytil to test <c>OchranaZapisuTests</c>, protože měří skutečný
    /// výsledek, ne metadata. Tvar se proto kontroluje až tady, za
    /// autorizací.
    /// </summary>
    private static async Task<Results<Ok<DavkaDto>, NotFound, UnauthorizedHttpResult, ValidationProblem>>
        PridejAsync(
            string lokalniId, JsonElement? telo, HttpContext ctx, KliceSprava klice,
            TrasySprava sprava, CancellationToken ct)
    {
        if (await KlicAsync(ctx, klice, ct) is not { } klic) return TypedResults.Unauthorized();

        var body = Body(telo);
        if (body is null)
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [""] = ["Čekal se seznam bodů."],
            });

        return await sprava.PridejAsync(klic, lokalniId, body, ct) is { } davka
            ? TypedResults.Ok(davka)
            : TypedResults.NotFound();
    }

    private static async Task<Results<Ok<TrasaDto>, NotFound, UnauthorizedHttpResult>> DokonciAsync(
        string lokalniId, DokonceniVstup? vstup, HttpContext ctx, KliceSprava klice,
        TrasySprava sprava, CancellationToken ct)
    {
        if (await KlicAsync(ctx, klice, ct) is not { } klic) return TypedResults.Unauthorized();

        return await sprava.DokonciAsync(klic, lokalniId, vstup?.Konec, ct) is { } trasa
            ? TypedResults.Ok(trasa)
            : TypedResults.NotFound();
    }

    /// <summary>Převede tělo na dávku. `null` u jiného tvaru než seznamu.</summary>
    private static List<BodVstup>? Body(JsonElement? telo)
    {
        if (telo is not { ValueKind: JsonValueKind.Array } pole) return null;
        try
        {
            return pole.Deserialize<List<BodVstup>>(JsonSerializerOptions.Web);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}

/// <summary>Kdy posádka záznam ukončila. Nepovinné — server si vystačí s tím, co má.</summary>
public record DokonceniVstup(DateTimeOffset? Konec);

/// <summary>Proč záznam nejde založit. Text je pro člověka na palubě.</summary>
public record ChybaTrasy(string Error);

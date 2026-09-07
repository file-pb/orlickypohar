using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Import;

/// <summary>
/// Import celého ročníku z jednoho souboru. Do fáze 4 neexistuje žádná
/// identita, takže endpoint chrání sdílené tajemství ze souboru
/// v <c>/run/secrets/Import__Token</c>.
/// </summary>
public static class ImportEndpoints
{
    private const string Hlavicka = "X-Import-Token";

    public static void MapImport(this IEndpointRouteBuilder app)
    {
        app.MapPost("/import/serie", ImportujAsync)
            .WithTags("Import")
            .WithSummary("Nahraje celý ročník z jednoho souboru")
            .WithDescription(
                "Idempotentní: druhé odeslání téhož souboru nic nezduplikuje. " +
                "Buď projde celá dávka, nebo se neuloží nic.");
    }

    private static async Task<IResult> ImportujAsync(
        SerieVstup vstup,
        HttpContext ctx,
        AppDbContext db,
        IConfiguration config,
        ILoggerFactory logu,
        CancellationToken ct)
    {
        var ocekavany = config["Import:Token"];

        // Nenakonfigurovaný token neznamená otevřený endpoint. Bez něj se
        // neimportuje — jinak by stačilo zapomenout na soubor v /run/secrets.
        if (string.IsNullOrEmpty(ocekavany))
            return Results.Problem("Import není nakonfigurovaný.", statusCode: StatusCodes.Status503ServiceUnavailable);

        var poslany = ctx.Request.Headers[Hlavicka].ToString();
        if (!KonstantniPorovnani(poslany, ocekavany))
            return Results.Unauthorized();

        var log = logu.CreateLogger("Import");

        // Celá dávka, nebo nic. Napůl naimportovaný ročník je horší než žádný,
        // protože chybějící výsledky nikdo nepozná.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var vysledek = await ImportHandler.ZpracujAsync(db, vstup, ct);
            await tx.CommitAsync(ct);

            log.LogInformation(
                "Import série {Serie}: {NoveZavody} nových závodů, {NoveVysledky} nových výsledků.",
                vysledek.Serie, vysledek.Zavody.Nove, vysledek.Vysledky.Nove);

            return Results.Ok(vysledek);
        }
        catch (ImportException ex)
        {
            await tx.RollbackAsync(ct);
            return Results.BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Porovnání v konstantním čase. Běžné porovnání řetězců končí na prvním
    /// rozdílu a doba odpovědi tak prozrazuje, kolik znaků tajemství sedí.
    /// </summary>
    private static bool KonstantniPorovnani(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
}

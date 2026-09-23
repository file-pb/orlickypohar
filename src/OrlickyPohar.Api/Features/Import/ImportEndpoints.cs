using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;
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
        IUloziste uloziste,
        CancellationToken ct)
    {
        switch (ImportniToken.Over(ctx, config))
        {
            case StavTokenu.Nenakonfigurovan:
                return Results.Problem(
                    "Import není nakonfigurovaný.", statusCode: StatusCodes.Status503ServiceUnavailable);
            case StavTokenu.Nesedi:
                return Results.Unauthorized();
        }

        var log = logu.CreateLogger("Import");

        // Celá dávka, nebo nic. Napůl naimportovaný ročník je horší než žádný,
        // protože chybějící výsledky nikdo nepozná.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            // Adresa úložiště kvůli obrázkům v tělech článků: v textu projde jen
            // obrázek nahraný k nám, cizí se zahodí.
            var vysledek = await ImportHandler.ZpracujAsync(db, vstup, ct, uloziste.VerejnaAdresa);
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
}

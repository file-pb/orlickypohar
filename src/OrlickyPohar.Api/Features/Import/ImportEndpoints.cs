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
                "Buď projde celá dávka, nebo se neuloží nic.\n\n" +
                "`rezim=nahled` nic neuloží a vrátí, co by se stalo, i s otiskem " +
                "ročníku. `rezim=bezpecny` (výchozí) uloží, ale odmítne dávku, " +
                "která by přepsala výsledky zapsané v aplikaci nebo stáhla " +
                "publikaci. `rezim=oprava` přepíše i je a vyžaduje `otisk` " +
                "z náhledu — idempotence chrání před opakováním souboru, " +
                "ne před jeho zastaralostí.");
    }

    private static async Task<IResult> ImportujAsync(
        SerieVstup vstup,
        HttpContext ctx,
        AppDbContext db,
        IConfiguration config,
        ILoggerFactory logu,
        IUloziste uloziste,
        CancellationToken ct,
        RezimImportu rezim = RezimImportu.Bezpecny,
        string? otisk = null)
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

        // Otisk se čte před zápisem, aby šel vrátit i v odpovědi náhledu.
        var otiskPred = await Prepis.OtiskAsync(db, vstup.Slug, ct);

        // Náhled i oprava stojí na témže otisku: náhled ho vydá, oprava ho
        // musí poslat zpátky. Mezitím mohl někdo zapsat výsledky a rozdíl,
        // který člověk viděl, by už neplatil.
        if (otisk is not null && otisk != otiskPred)
            return Results.Json(new { error = Prepis.OtiskNesedi, otisk = otiskPred },
                statusCode: StatusCodes.Status409Conflict);

        if (rezim == RezimImportu.Oprava && otisk is null)
            return Results.BadRequest(new { error = Prepis.OtiskChybi, otisk = otiskPred });

        var kolize = await Prepis.KolizeAsync(db, vstup, ct);

        if (rezim == RezimImportu.Bezpecny && kolize.Count > 0)
            return Results.Json(
                new { error = Prepis.PotrebaOprava, otisk = otiskPred, kolize },
                statusCode: StatusCodes.Status409Conflict);

        // Celá dávka, nebo nic. Napůl naimportovaný ročník je horší než žádný,
        // protože chybějící výsledky nikdo nepozná.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            // Adresa úložiště kvůli obrázkům v tělech článků: v textu projde jen
            // obrázek nahraný k nám, cizí se zahodí.
            var vysledek = await ImportHandler.ZpracujAsync(db, vstup, ct, uloziste.VerejnaAdresa);

            // Náhled projde týmž kódem a pak se vrátí zpátky. Rozdíl se tím
            // nepočítá podruhé a nemá jak se s importem rozejít.
            if (rezim == RezimImportu.Nahled)
            {
                await tx.RollbackAsync(ct);
                log.LogInformation("Náhled importu série {Serie}: {Kolize} kolizí",
                    vstup.Slug, kolize.Count);
                return Results.Ok(new
                {
                    nahled = true, otisk = otiskPred, kolize, vysledek,
                });
            }

            await tx.CommitAsync(ct);

            log.LogInformation(
                "Import série {Serie} ({Rezim}): {NoveZavody} nových závodů, "
                + "{NoveVysledky} nových výsledků, {Kolize} přepsaných míst.",
                vysledek.Serie, rezim, vysledek.Zavody.Nove, vysledek.Vysledky.Nove,
                kolize.Count);

            return Results.Ok(vysledek);
        }
        catch (ImportException ex)
        {
            await tx.RollbackAsync(ct);
            return Results.BadRequest(new { error = ex.Message });
        }
    }
}

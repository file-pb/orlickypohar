using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Co se posílá zpátky na web: přihláška přijata, čeká na pořadatele.</summary>
public record PrijataPrihlaskaDto(string Zavod, string Lod, StavUcasti Stav);

/// <summary>
/// Veřejná přihláška lodi na zastávku (plán, oddíl <i>Veřejné přihlášky
/// lodí</i>).
/// <para>
/// <b>Bez přihlášení</b> — a proto vzniká jako požadavek, který pořadatel
/// vidí dřív, než se loď objeví na webu. Zápis přes prohlížeč z cizí
/// stránky nehrozí: CORS pouští jen GET, takže formulář odesílá server
/// webu, ne návštěvníkův prohlížeč.
/// </para>
/// </summary>
public static class VerejnaPrihlaskaEndpoints
{
    public static void MapVerejnePrihlasky(this IEndpointRouteBuilder app)
    {
        app.MapPost("/serie/{serie}/zavody/{zavod}/prihlasky", PrihlasAsync)
            .WithTags("Přihlášky")
            .Produces<PrijataPrihlaskaDto>(StatusCodes.Status201Created)
            .WithSummary("Přihlásí loď na regatu z veřejného formuláře")
            .WithDescription(
                "Bez přihlášení. Vzniká požadavek, který pořadatel zapíše, vrátí k doplnění, " +
                "nebo odmítne; na webu loď do té doby není. Vyžaduje kontakt a souhlas.");
    }

    private static async Task<IResult> PrihlasAsync(
        string serie, string zavod, VerejnaPrihlaskaVstup vstup,
        AppDbContext db, PrihlaskySprava sprava, CancellationToken ct)
    {
        // Nepublikovaný ročník ani nepublikovaná zastávka veřejně neexistují,
        // takže se na ně ani nepřihlašuje.
        var nalez = await db.Zavody
            .Where(z => z.Slug == zavod && z.Publikovano && z.Serie!.Slug == serie && z.Serie.Publikovano)
            .Select(z => new { z.Id, z.Nazev })
            .FirstOrDefaultAsync(ct);

        if (nalez is null) return Results.NotFound();

        var (ucastId, chyba) = await sprava.VerejnaAsync(nalez.Id, vstup, ct);

        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        var lod = await db.Ucasti.Where(u => u.Id == ucastId)
            .Select(u => u.Prihlaska!.Lod!.Nazev).FirstAsync(ct);

        return Results.Created(
            $"/serie/{serie}/zavody/{zavod}", new PrijataPrihlaskaDto(nalez.Nazev, lod, StavUcasti.Pozadavek));
    }
}

using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Prevzate;

/// <summary>
/// Přejatá novinka ve výpisu. Nemá slug ani tělo, protože u nás nemá
/// vlastní stránku — vede rovnou ke zdroji.
/// </summary>
public record PrevzatyClanekDto(
    string Titulek, string? Perex, DateTimeOffset PublikovanoV,
    string Odkaz, string Zdroj, string ZdrojOdkaz,
    // Adresa fotky u zdroje. Prázdná znamená, že ji nemá — web pak sáhne
    // po náhradní, karta bez fotky být nemá.
    string? Obrazek = null);

/// <summary>
/// Veřejné čtení přejatých novinek. Vlastní endpoint, ne součást
/// <c>/clanky</c>: klient musí poznat, že jde o cizí obsah, aby ho označil
/// a poslal ven — a appka i web to mají udělat stejně.
/// </summary>
public static class PrevzateEndpoints
{
    public static void MapPrevzate(this IEndpointRouteBuilder app)
    {
        app.MapGet("/prevzate-clanky", SeznamAsync)
            .WithTags("Články")
            .WithSummary("Vrátí novinky přejaté z cizích kanálů, od nejnovější")
            .WithDescription(
                "Titulek, perex a odkaz na originál — plný text se nepřebírá. " +
                "Drží se nejvýš osm; novější vytlačují starší.");
    }

    private static async Task<Ok<List<PrevzatyClanekDto>>> SeznamAsync(
        AppDbContext db, CancellationToken ct, int? limit = null)
    {
        var dotaz = db.PrevzateClanky
            .OrderByDescending(c => c.PublikovanoV).ThenByDescending(c => c.Id)
            .AsQueryable();

        // Stejné pravidlo jako u našich článků: nula i chybějící parametr
        // znamenají „bez limitu", jinak by překlep v odkazu vrátil prázdno.
        if (limit is > 0) dotaz = dotaz.Take(Math.Min(limit.Value, SberPrevzatych.Kolik));

        return TypedResults.Ok(await dotaz
            .Select(c => new PrevzatyClanekDto(
                c.Titulek, c.Perex, c.PublikovanoV, c.Odkaz, c.Zdroj, c.ZdrojOdkaz, c.Obrazek))
            .ToListAsync(ct));
    }
}

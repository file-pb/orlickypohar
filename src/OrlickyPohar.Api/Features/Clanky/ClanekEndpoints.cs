using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Clanky;

/// <summary>
/// Článek ve výpisu. Tělo tu schválně není: úvodní stránka i seznam novinek
/// by jinak stahovaly celý blog ročníku kvůli třem perexům.
/// </summary>
public record ClanekShrnutiDto(
    string Slug,
    string Titulek,
    string? Perex,
    string? Autor,
    DateTimeOffset PublikovanoV,
    string? Zavod,
    string? ZavodNazev);

public record ClanekDto(
    string Slug,
    string Titulek,
    string? Perex,
    string Telo,
    string? Autor,
    DateTimeOffset PublikovanoV,
    string? Zavod,
    string? ZavodNazev);

/// <summary>
/// Veřejné čtení blogu. Platí tu totéž co u ročníku: <b>nepublikovaný článek
/// neexistuje</b> a vrací 404, ne 403 — a nepublikovaný ročník schová i své
/// články, jinak by se dal obsah nezveřejněné sezóny přečíst po jednom.
/// </summary>
public static class ClanekEndpoints
{
    public static void MapClanky(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/serie/{slug}/clanky").WithTags("Články");

        g.MapGet("/", SeznamAsync)
            .WithSummary("Vrátí publikované články ročníku, od nejnovějšího")
            .WithDescription(
                "Parametrem zavod se výpis zúží na jednu zastávku, parametrem " +
                "limit na daný počet nejnovějších.");

        g.MapGet("/{clanek}", DetailAsync).WithSummary("Vrátí jeden článek i s tělem");
    }

    private static async Task<Results<Ok<List<ClanekShrnutiDto>>, NotFound>> SeznamAsync(
        string slug, AppDbContext db, CancellationToken ct, string? zavod = null, int? limit = null)
    {
        var serieId = await SerieIdAsync(db, slug, ct);
        if (serieId is null) return TypedResults.NotFound();

        var dotaz = Publikovane(db, serieId.Value);

        // Prázdný `zavod` je něco jiného než chybějící: `?zavod=` by se dalo
        // číst jako „články bez zastávky", ale spíš je to nevyplněný parametr.
        // Filtruje se tedy jen na neprázdnou hodnotu.
        if (!string.IsNullOrEmpty(zavod))
            dotaz = dotaz.Where(c => c.Zavod!.Slug == zavod);

        dotaz = dotaz.OrderByDescending(c => c.PublikovanoV).ThenByDescending(c => c.Id);

        // Limit se ořízne, ne odmítne: úvodní stránka chce tři a nemá důvod
        // se stránkováním počítat. Nula znamená „žádný limit" stejně jako
        // chybějící parametr — jinak by překlep v odkazu vrátil prázdno.
        if (limit is > 0)
            dotaz = dotaz.Take(Math.Min(limit.Value, 100));

        var clanky = await dotaz
            .Select(c => new ClanekShrnutiDto(
                c.Slug, c.Titulek, c.Perex, c.Autor, c.PublikovanoV,
                c.Zavod!.Slug, c.Zavod.Nazev))
            .ToListAsync(ct);

        return TypedResults.Ok(clanky);
    }

    private static async Task<Results<Ok<ClanekDto>, NotFound>> DetailAsync(
        string slug, string clanek, AppDbContext db, CancellationToken ct)
    {
        var serieId = await SerieIdAsync(db, slug, ct);
        if (serieId is null) return TypedResults.NotFound();

        var nalezeny = await Publikovane(db, serieId.Value)
            .Where(c => c.Slug == clanek)
            .Select(c => new ClanekDto(
                c.Slug, c.Titulek, c.Perex, c.Telo, c.Autor, c.PublikovanoV,
                c.Zavod!.Slug, c.Zavod.Nazev))
            .FirstOrDefaultAsync(ct);

        return nalezeny is null ? TypedResults.NotFound() : TypedResults.Ok(nalezeny);
    }

    private static async Task<int?> SerieIdAsync(AppDbContext db, string slug, CancellationToken ct)
    {
        var id = await db.Serie
            .Where(s => s.Slug == slug && s.Publikovano)
            .Select(s => (int?)s.Id)
            .FirstOrDefaultAsync(ct);

        return id;
    }

    /// <summary>
    /// Článek zastávky je vidět, jen když je vidět i ta zastávka. Bez toho by
    /// pozvánka prozradila závod, který ročník ještě nezveřejnil.
    /// </summary>
    private static IQueryable<Clanek> Publikovane(AppDbContext db, int serieId) =>
        db.Clanky.Where(c =>
            c.SerieId == serieId
            && c.Publikovano
            && (c.ZavodId == null || c.Zavod!.Publikovano));
}

using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;

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
    string? ZavodNazev,
    ObrazekDto? Obrazek = null);

public record ClanekDto(
    string Slug,
    string Titulek,
    string? Perex,
    string Telo,
    string? Autor,
    DateTimeOffset PublikovanoV,
    string? Zavod,
    string? ZavodNazev,
    ObrazekDto? Obrazek = null);

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
                "Parametrem zavod se výpis zúží na jednu regatu, parametrem " +
                "limit na daný počet nejnovějších.");

        g.MapGet("/{clanek}", DetailAsync).WithSummary("Vrátí jeden článek i s tělem");

        // Obecné články mimo ročník (od 22. 9. 2026). Vlastní adresa, ne
        // parametr u ročníku: nepatří žádnému a nemají zestárnout s ním.
        var obecne = app.MapGroup("/clanky").WithTags("Články");

        obecne.MapGet("/", ObecneSeznamAsync)
            .WithSummary("Vrátí publikované obecné články mimo ročník, od nejnovějšího")
            .WithDescription("Parametrem limit se výpis zúží na daný počet nejnovějších.");

        obecne.MapGet("/{clanek}", ObecnyDetailAsync)
            .WithSummary("Vrátí jeden obecný článek i s tělem");
    }

    private static async Task<Ok<List<ClanekShrnutiDto>>> ObecneSeznamAsync(
        AppDbContext db, IUloziste uloziste, CancellationToken ct, int? limit = null)
    {
        var dotaz = db.Clanky
            .Where(c => c.SerieId == null && c.Stav == StavClanku.Publikovano)
            .OrderByDescending(c => c.PublikovanoV).ThenByDescending(c => c.Id)
            .AsQueryable();

        if (limit is > 0) dotaz = dotaz.Take(Math.Min(limit.Value, 100));

        var adresa = uloziste.VerejnaAdresa;
        return TypedResults.Ok(await dotaz
            .Select(c => new ClanekShrnutiDto(
                c.Slug, c.Titulek, c.Perex, c.Autor, c.PublikovanoV,
                null, null, Nahravani.Dto(c.Fotka, adresa)))
            .ToListAsync(ct));
    }

    private static async Task<Results<Ok<ClanekDto>, NotFound>> ObecnyDetailAsync(
        string clanek, AppDbContext db, IUloziste uloziste, CancellationToken ct)
    {
        var adresa = uloziste.VerejnaAdresa;
        var nalezeny = await db.Clanky
            .Where(c => c.SerieId == null && c.Stav == StavClanku.Publikovano && c.Slug == clanek)
            .Select(c => new ClanekDto(
                c.Slug, c.Titulek, c.Perex, c.Telo, c.Autor, c.PublikovanoV,
                null, null, Nahravani.Dto(c.Fotka, adresa)))
            .FirstOrDefaultAsync(ct);

        return nalezeny is null ? TypedResults.NotFound() : TypedResults.Ok(nalezeny);
    }

    private static async Task<Results<Ok<List<ClanekShrnutiDto>>, NotFound>> SeznamAsync(
        string slug, AppDbContext db, IUloziste uloziste, CancellationToken ct,
        string? zavod = null, int? limit = null)
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

        // Adresa obrázku se skládá až po načtení; v SQL by z ní nic nebylo.
        var adresa = uloziste.VerejnaAdresa;
        var clanky = await dotaz
            .Select(c => new ClanekShrnutiDto(
                c.Slug, c.Titulek, c.Perex, c.Autor, c.PublikovanoV,
                c.Zavod!.Slug, c.Zavod.Nazev, Nahravani.Dto(c.Fotka, adresa)))
            .ToListAsync(ct);

        return TypedResults.Ok(clanky);
    }

    private static async Task<Results<Ok<ClanekDto>, NotFound>> DetailAsync(
        string slug, string clanek, AppDbContext db, IUloziste uloziste, CancellationToken ct)
    {
        var serieId = await SerieIdAsync(db, slug, ct);
        if (serieId is null) return TypedResults.NotFound();

        var adresa = uloziste.VerejnaAdresa;
        var nalezeny = await Publikovane(db, serieId.Value)
            .Where(c => c.Slug == clanek)
            .Select(c => new ClanekDto(
                c.Slug, c.Titulek, c.Perex, c.Telo, c.Autor, c.PublikovanoV,
                c.Zavod!.Slug, c.Zavod.Nazev, Nahravani.Dto(c.Fotka, adresa)))
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
    /// <para>
    /// A jen když ročník vydává výsledky regat (<c>Serie.VysledkyZavoduVerejne</c>).
    /// Zpráva ze závodu je výsledek napsaný větou — „PEZI bere kategorii nad
    /// 7 m" říká totéž co tabulka, kterou jsme právě schovali. Filip,
    /// 23. 9. 2026: „články ať taky mlčí".
    /// </para>
    /// <para>
    /// Článek celého ročníku zůstává: není o jedné regatě a konečné pořadí
    /// seriálu je veřejné tak jako tak.
    /// </para>
    /// </summary>
    private static IQueryable<Clanek> Publikovane(AppDbContext db, int serieId) =>
        db.Clanky.Where(c =>
            c.SerieId == serieId
            && c.Stav == StavClanku.Publikovano
            && (c.ZavodId == null
                || (c.Zavod!.Publikovano && c.Zavod.Serie!.VysledkyZavoduVerejne)));
}

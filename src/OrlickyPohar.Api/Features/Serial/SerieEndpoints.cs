using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Serial;

public record SerieShrnutiDto(string Slug, string Nazev, int Rok, int PocetZavodu);

public record KategorieDto(string Nazev, int Poradi);

public record ZavodShrnutiDto(
    string Slug, string Nazev, DateOnly Datum, DateOnly? DatumKonce,
    string? Typ, string? Poradatel, int Poradi, Zavody.StavZavodu Stav);

public record PrihlaskaDto(
    string Lod, string? CisloPlachty, string? TypLodi, string Majitel, string Kategorie);

public record SerieDetailDto(
    string Slug, string Nazev, int Rok,
    IReadOnlyList<KategorieDto> Kategorie,
    IReadOnlyList<ZavodShrnutiDto> Zavody,
    IReadOnlyList<PrihlaskaDto> Prihlasky);

/// <summary>
/// Veřejné čtení ročníku. <b>Nepublikovaný ročník neexistuje</b> — vrací se 404,
/// ne 403: prozradit, že něco existuje a jen se to neukazuje, je taky informace.
/// </summary>
public static class SerieEndpoints
{
    public static void MapSerie(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/serie").WithTags("Série");

        g.MapGet("/", SeznamAsync).WithSummary("Vrátí publikované ročníky");
        g.MapGet("/{slug}", DetailAsync).WithSummary("Vrátí ročník s kategoriemi, zastávkami a přihláškami");
    }

    private static async Task<IResult> SeznamAsync(AppDbContext db, CancellationToken ct)
    {
        var rocniky = await db.Serie
            .Where(s => s.Publikovano)
            .OrderByDescending(s => s.Rok)
            .Select(s => new SerieShrnutiDto(
                s.Slug, s.Nazev, s.Rok,
                db.Zavody.Count(z => z.SerieId == s.Id && z.Publikovano)))
            .ToListAsync(ct);

        return Results.Ok(rocniky);
    }

    private static async Task<IResult> DetailAsync(string slug, AppDbContext db, CancellationToken ct)
    {
        var serie = await db.Serie
            .Where(s => s.Slug == slug && s.Publikovano)
            .Select(s => new { s.Id, s.Slug, s.Nazev, s.Rok })
            .FirstOrDefaultAsync(ct);

        if (serie is null) return Results.NotFound();

        var kategorie = await db.Kategorie
            .Where(k => k.SerieId == serie.Id)
            .OrderBy(k => k.Poradi)
            .Select(k => new KategorieDto(k.Nazev, k.Poradi))
            .ToListAsync(ct);

        var zavody = await db.Zavody
            .Where(z => z.SerieId == serie.Id && z.Publikovano)
            .OrderBy(z => z.Poradi)
            .Select(z => new ZavodShrnutiDto(
                z.Slug, z.Nazev, z.Datum, z.DatumKonce, z.Typ, z.Poradatel, z.Poradi, z.Stav))
            .ToListAsync(ct);

        // Ve výsledcích se vedle lodi uvádí jméno majitele — proto se tahá i on.
        var prihlasky = await db.Prihlasky
            .Where(p => p.SerieId == serie.Id)
            .OrderBy(p => p.Kategorie!.Poradi).ThenBy(p => p.Lod!.Nazev)
            .Select(p => new PrihlaskaDto(
                p.Lod!.Nazev, p.Lod.CisloPlachty, p.Lod.Typ,
                p.Lod.Majitel!.Jmeno + " " + p.Lod.Majitel.Prijmeni,
                p.Kategorie!.Nazev))
            .ToListAsync(ct);

        return Results.Ok(new SerieDetailDto(serie.Slug, serie.Nazev, serie.Rok, kategorie, zavody, prihlasky));
    }
}

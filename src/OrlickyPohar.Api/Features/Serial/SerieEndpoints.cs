using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Serial;

public record SerieShrnutiDto(string Slug, string Nazev, int Rok, int PocetZavodu);

public record KategorieDto(string Nazev, int Poradi);

/// <summary>
/// Zastávka v kalendáři ročníku. Kalendář je zároveň rozcestník, takže nese
/// i stav — bez něj vypadá zastávka, která teprve bude, stejně jako ta,
/// která se nekonala.
/// </summary>
public record ZavodShrnutiDto(
    string Slug, string Nazev, DateOnly Datum, DateOnly? DatumKonce,
    string? Typ, string? Poradatel, int Poradi, Zavody.StavZavodu Stav,
    DateOnly? PuvodniDatum);

public record PrihlaskaDto(
    string Lod, string? CisloPlachty, string? TypLodi, string Majitel, string Kategorie);

/// <summary>
/// Ročník. <c>Zavody</c> jsou <b>jen kola poháru</b>, komunitní akce jdou
/// zvlášť v <c>Akce</c>: appka na telefonu o druhu neví a akci by jinak
/// vypsala jako zastávku a započítala mezi „odjeté".
/// </summary>
public record SerieDetailDto(
    string Slug, string Nazev, int Rok,
    IReadOnlyList<KategorieDto> Kategorie,
    IReadOnlyList<ZavodShrnutiDto> Zavody,
    IReadOnlyList<PrihlaskaDto> Prihlasky,
    IReadOnlyList<ZavodShrnutiDto> Akce);

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

    private static async Task<Ok<List<SerieShrnutiDto>>> SeznamAsync(AppDbContext db, CancellationToken ct)
    {
        var rocniky = await db.Serie
            .Where(s => s.Publikovano)
            .OrderByDescending(s => s.Rok)
            .Select(s => new SerieShrnutiDto(
                s.Slug, s.Nazev, s.Rok,
                db.Zavody.Count(z => z.SerieId == s.Id && z.Publikovano
                                     && z.Druh == Zavody.DruhZastavky.Pohar)))
            .ToListAsync(ct);

        return TypedResults.Ok(rocniky);
    }

    private static async Task<Results<Ok<SerieDetailDto>, NotFound>> DetailAsync(
        string slug, AppDbContext db, CancellationToken ct)
    {
        var serie = await db.Serie
            .Where(s => s.Slug == slug && s.Publikovano)
            .Select(s => new { s.Id, s.Slug, s.Nazev, s.Rok })
            .FirstOrDefaultAsync(ct);

        if (serie is null) return TypedResults.NotFound();

        var kategorie = await db.Kategorie
            .Where(k => k.SerieId == serie.Id)
            .OrderBy(k => k.Poradi)
            .Select(k => new KategorieDto(k.Nazev, k.Poradi))
            .ToListAsync(ct);

        var zastavky = await db.Zavody
            .Where(z => z.SerieId == serie.Id && z.Publikovano)
            .OrderBy(z => z.Poradi)
            .Select(z => new
            {
                z.Druh,
                Shrnuti = new ZavodShrnutiDto(
                    z.Slug, z.Nazev, z.Datum, z.DatumKonce, z.Typ, z.Poradatel, z.Poradi, z.Stav,
                    z.PuvodniDatum),
            })
            .ToListAsync(ct);

        var zavody = zastavky.Where(z => z.Druh == Zavody.DruhZastavky.Pohar).Select(z => z.Shrnuti).ToList();
        var akce = zastavky.Where(z => z.Druh == Zavody.DruhZastavky.Akce).Select(z => z.Shrnuti).ToList();

        // Ve výsledcích se vedle lodi uvádí jméno majitele — proto se tahá i on.
        var prihlasky = await db.Prihlasky
            .Where(p => p.SerieId == serie.Id)
            .OrderBy(p => p.Kategorie!.Poradi).ThenBy(p => p.Lod!.Nazev)
            .Select(p => new PrihlaskaDto(
                p.Lod!.Nazev, p.Lod.CisloPlachty, p.Lod.Typ,
                p.Lod.Majitel!.Jmeno + " " + p.Lod.Majitel.Prijmeni,
                p.Kategorie!.Nazev))
            .ToListAsync(ct);

        return TypedResults.Ok(new SerieDetailDto(
            serie.Slug, serie.Nazev, serie.Rok, kategorie, zavody, prihlasky, akce));
    }
}

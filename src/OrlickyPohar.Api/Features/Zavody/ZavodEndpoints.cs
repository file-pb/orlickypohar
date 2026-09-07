using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Zavody;

public record VysledekDto(
    string Lod, string Kategorie, string? Kormidelnik,
    int? PoradiVCili, int? CasSekundy, KodVysledku? Kod);

public record RozjizdkaDto(
    int Cislo, DateTimeOffset? StartV, StavRozjizdky Stav, bool DoSerie,
    IReadOnlyList<VysledekDto> Vysledky);

public record ZavodDetailDto(
    string Slug, string Nazev, DateOnly Datum, DateOnly? DatumKonce,
    string? Typ, string? Poradatel,
    int PocetSkrtu, Vyhodnoceni Vyhodnoceni, decimal KoeficientDoSerie,
    IReadOnlyList<RozjizdkaDto> Rozjizdky);

/// <summary>
/// Veřejné čtení jedné zastávky. Pravidla závodu (škrty, vyhodnocení,
/// koeficient) se vydávají spolu s výsledky schválně: bez nich se pořadí
/// nedá zkontrolovat a divák nemá jak poznat, proč se která rozjížďka
/// nepočítá.
/// </summary>
public static class ZavodEndpoints
{
    public static void MapZavody(this IEndpointRouteBuilder app)
    {
        app.MapGet("/serie/{serieSlug}/zavody/{slug}", DetailAsync)
            .WithTags("Závody")
            .WithSummary("Vrátí zastávku s rozjížďkami a výsledky");
    }

    private static async Task<IResult> DetailAsync(
        string serieSlug, string slug, AppDbContext db, CancellationToken ct)
    {
        var zavod = await db.Zavody
            .Where(z => z.Slug == slug && z.Publikovano
                        && z.Serie!.Slug == serieSlug && z.Serie.Publikovano)
            .Select(z => new
            {
                z.Id, z.Slug, z.Nazev, z.Datum, z.DatumKonce, z.Typ, z.Poradatel,
                z.PocetSkrtu, z.Vyhodnoceni, z.KoeficientDoSerie,
            })
            .FirstOrDefaultAsync(ct);

        if (zavod is null) return Results.NotFound();

        // Jeden dotaz na všechny výsledky závodu, ne dotaz na rozjížďku.
        // Rozjížděk bývá osm a lodí dvacet — N+1 by tu bylo osm zbytečných cest.
        var radky = await db.Vysledky
            .Where(v => v.Rozjizdka!.ZavodId == zavod.Id)
            .OrderBy(v => v.Rozjizdka!.Cislo)
            .ThenBy(v => v.PoradiVCili ?? int.MaxValue)
            .Select(v => new
            {
                v.Rozjizdka!.Cislo,
                v.Rozjizdka.StartV,
                v.Rozjizdka.Stav,
                v.Rozjizdka.DoSerie,
                Lod = v.Ucast!.Prihlaska!.Lod!.Nazev,
                Kategorie = v.Ucast.Prihlaska.Kategorie!.Nazev,
                Kormidelnik = v.Ucast.Kormidelnik == null
                    ? null
                    : v.Ucast.Kormidelnik.Jmeno + " " + v.Ucast.Kormidelnik.Prijmeni,
                v.PoradiVCili,
                v.NamerenyCas,
                v.Kod,
            })
            .ToListAsync(ct);

        // Rozjížďky bez jediného výsledku by se seskupením ztratily.
        var prazdne = await db.Rozjizdky
            .Where(r => r.ZavodId == zavod.Id && !db.Vysledky.Any(v => v.RozjizdkaId == r.Id))
            .Select(r => new RozjizdkaDto(r.Cislo, r.StartV, r.Stav, r.DoSerie, Array.Empty<VysledekDto>()))
            .ToListAsync(ct);

        var rozjizdky = radky
            .GroupBy(r => new { r.Cislo, r.StartV, r.Stav, r.DoSerie })
            .Select(g => new RozjizdkaDto(
                g.Key.Cislo, g.Key.StartV, g.Key.Stav, g.Key.DoSerie,
                [.. g.Select(v => new VysledekDto(
                    v.Lod, v.Kategorie, v.Kormidelnik, v.PoradiVCili,
                    v.NamerenyCas == null ? null : (int)v.NamerenyCas.Value.TotalSeconds,
                    v.Kod))]))
            .Concat(prazdne)
            .OrderBy(r => r.Cislo)
            .ToList();

        return Results.Ok(new ZavodDetailDto(
            zavod.Slug, zavod.Nazev, zavod.Datum, zavod.DatumKonce, zavod.Typ, zavod.Poradatel,
            zavod.PocetSkrtu, zavod.Vyhodnoceni, zavod.KoeficientDoSerie,
            rozjizdky));
    }
}

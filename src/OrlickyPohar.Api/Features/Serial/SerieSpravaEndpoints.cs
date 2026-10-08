using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Serial;

/// <summary>Ročník ve správě: jestli je venku a jestli s tím přihlášený smí hnout.</summary>
public record SerieSpravaDto(
    string Slug, string Nazev, int Rok, bool Publikovano, bool SmiPublikovat,
    // Aditivně na konci: starší klienti o výsledcích regat nevědí.
    bool VysledkyZavoduVerejne = true);

public record PublikaceSerieVstup(bool Publikovano);

/// <summary>Smí čtenář vidět výsledky jednotlivých regat ročníku?</summary>
public record VysledkySerieVstup(bool Verejne);

/// <summary>
/// Publikace celého ročníku.
/// <para>
/// <b>Proč vlastní endpoint:</b> publikaci zastávky i rozjížďky šlo přepnout
/// ve správě, ale u ročníku ji uměl nastavit jedině import. Nahrání souboru
/// tak ročník potichu schovalo, když v souboru stálo „nepublikováno"
/// a na produkci byl publikovaný ručně — 23. 9. 2026 se to stalo.
/// </para>
/// <para>
/// <b>Smí správce ročníku</b>, stejně jako u publikace výsledků: rozhodčí
/// říká „čísla platí", správce „ať to vidí veřejnost".
/// </para>
/// </summary>
public static class SerieSpravaEndpoints
{
    public static void MapSpravaSerie(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}");

        g.MapGet("/", StavAsync)
            .Produces<SerieSpravaDto>()
            .WithSummary("Vrátí ročník i s tím, jestli je venku")
            .WithDescription(
                "Vyžaduje roli rozhodčího v ročníku, nebo organizátora aspoň na jedné " +
                "regatě. Přepnout publikaci smí správce ročníku.");

        g.MapPost("/publikace", PublikaceAsync)
            .Produces<SerieSpravaDto>()
            .WithSummary("Pustí ročník ven, nebo ho stáhne")
            .WithDescription(
                "Správce ročníku. Nepublikovaný ročník veřejné čtení nevydává vůbec — " +
                "ani jeho regaty a výsledky.");

        g.MapPost("/vysledky-zavodu", VysledkyAsync)
            .Produces<SerieSpravaDto>()
            .WithSummary("Zapne nebo vypne veřejné výsledky jednotlivých regat")
            .WithDescription(
                "Správce ročníku. Vypnuté znamená, že kalendář i pořadí seriálu " +
                "zůstávají venku, ale stránka regaty nevydá rozjížďky ani výsledky. " +
                "Správci je vidí dál.");
    }

    private static async Task<IResult> StavAsync(
        string serie, ClaimsPrincipal kdo, Rozsahy rozsahy, AppDbContext db, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();

        // Vidí ten, kdo na ročník nějak dosáhne; mění jen správce.
        var rozhodci = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
        var (celyRocnik, zavody) = await rozsahy.KdeSmiAsync(kdo, Role.Organizator, rozsah.SerieId, ct);
        if (!rozhodci && !celyRocnik && zavody.Count == 0) return Results.Forbid();

        return Results.Ok(await DtoAsync(db, rozsah.SerieId, await SpravceAsync(kdo, rozsahy, rozsah.SerieId, ct), ct));
    }

    private static async Task<IResult> PublikaceAsync(
        string serie, PublikaceSerieVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, AppDbContext db, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await SpravceAsync(kdo, rozsahy, rozsah.SerieId, ct)) return Results.Forbid();

        var rocnik = await db.Serie.FirstAsync(s => s.Id == rozsah.SerieId, ct);
        rocnik.Publikovano = vstup.Publikovano;
        await db.SaveChangesAsync(ct);

        return Results.Ok(await DtoAsync(db, rozsah.SerieId, true, ct));
    }

    private static async Task<IResult> VysledkyAsync(
        string serie, VysledkySerieVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, AppDbContext db, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await SpravceAsync(kdo, rozsahy, rozsah.SerieId, ct)) return Results.Forbid();

        var rocnik = await db.Serie.FirstAsync(s => s.Id == rozsah.SerieId, ct);
        rocnik.VysledkyZavoduVerejne = vstup.Verejne;
        await db.SaveChangesAsync(ct);

        return Results.Ok(await DtoAsync(db, rozsah.SerieId, true, ct));
    }

    private static Task<bool> SpravceAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, int serieId, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, serieId), ct);

    private static async Task<SerieSpravaDto> DtoAsync(
        AppDbContext db, int serieId, bool smiPublikovat, CancellationToken ct) =>
        await db.Serie
            .Where(s => s.Id == serieId)
            .Select(s => new SerieSpravaDto(
                s.Slug, s.Nazev, s.Rok, s.Publikovano, smiPublikovat, s.VysledkyZavoduVerejne))
            .FirstAsync(ct);
}

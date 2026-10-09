using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Našeptávač lodí pro přihlášku (plán, oddíl <i>Veřejné přihlášky lodí</i>).
/// <para>
/// <b>Veřejné čtení</b>, jako výsledky. Vydává jen údaje, které na webu
/// stejně jsou; kontakty ani majitele nenapovídá nikdy (viz
/// <see cref="NapovedaLodiDto"/>).
/// </para>
/// <para>
/// Hledá se přes <b>všechny ročníky</b> — loď, která jela loni a letos
/// ještě ne, je přesně ten případ, kvůli kterému našeptávač vzniká.
/// </para>
/// </summary>
public static class NapovedaEndpoints
{
    public static void MapNapovedu(this IEndpointRouteBuilder app)
    {
        app.MapGet("/lode/napoveda", NajdiAsync)
            .WithTags("Lodě")
            .WithSummary("Napoví lodě podle jména nebo čísla plachty")
            .WithDescription(
                "Pro formulář přihlášky. Parametr serie říká, ke kterému ročníku se vztahuje " +
                "příznak vRocniku a kategorie. Kratší dotaz než dva znaky vrací prázdno; " +
                "vse=true vydá celý seznam pro nabídku prohlížeče.");
    }

    private static async Task<Ok<List<NapovedaLodiDto>>> NajdiAsync(
        AppDbContext db, CancellationToken ct, string? q = null, string? serie = null, bool vse = false)
    {
        // `vse` vydá celý seznam pro nabídku prohlížeče (datalist), aby
        // formulář napovídal i bez javascriptu. Lodí jsou nižší stovky.
        if (!vse && Napoveda.Klic(q).Length < Napoveda.NejmeneZnaku)
            return TypedResults.Ok(new List<NapovedaLodiDto>());

        var serieId = serie is null
            ? null
            : await db.Serie.Where(s => s.Slug == serie).Select(s => (int?)s.Id).FirstOrDefaultAsync(ct);

        // Lodí jsou nižší stovky, takže se načtou i s posledním ročníkem
        // a kormidelníkem a filtrují se v paměti — porovnání bez diakritiky
        // by v SQL potřebovalo `unaccent`, které na serveru být nemusí.
        var lode = await db.Lode
            .Select(l => new
            {
                l.Nazev,
                l.CisloPlachty,
                l.Typ,
                VRocniku = serieId != null && db.Prihlasky.Any(p => p.LodId == l.Id && p.SerieId == serieId),
                // Kategorie z ročníku, na který se ptáme; jinak z posledního,
                // kde loď jela — v něm se dá čekat i letos.
                Kategorie = db.Prihlasky
                    .Where(p => p.LodId == l.Id && (serieId == null || p.SerieId == serieId))
                    .OrderByDescending(p => p.Serie!.Rok)
                    .Select(p => p.Kategorie!.Nazev)
                    .FirstOrDefault()
                    ?? db.Prihlasky
                        .Where(p => p.LodId == l.Id)
                        .OrderByDescending(p => p.Serie!.Rok)
                        .Select(p => p.Kategorie!.Nazev)
                        .FirstOrDefault(),
                PosledniRok = db.Prihlasky
                    .Where(p => p.LodId == l.Id)
                    .OrderByDescending(p => p.Serie!.Rok)
                    .Select(p => (int?)p.Serie!.Rok)
                    .FirstOrDefault(),
                // Poslední kormidelník: z nejnovější zastávky, kde loď jela.
                Kormidelnik = db.Ucasti
                    .Where(u => u.Prihlaska!.LodId == l.Id && u.KormidelnikId != null
                                && u.Stav != StavUcasti.Zrusena && u.Stav != StavUcasti.Odmitnuta)
                    .OrderByDescending(u => u.Zavod!.Datum)
                    .Select(u => u.Kormidelnik!.Jmeno + " " + u.Kormidelnik.Prijmeni)
                    .FirstOrDefault(),
            })
            .ToListAsync(ct);

        var vsechny = lode.Select(l => new NapovedaLodiDto(
            l.Nazev, l.CisloPlachty, l.Typ, l.Kategorie, l.Kormidelnik, l.VRocniku, l.PosledniRok));

        var nabidka = vse
            ? [.. vsechny.OrderByDescending(l => l.VRocniku).ThenBy(l => l.Lod, Jmena.Cesky).Take(500)]
            : Napoveda.Najdi(q, vsechny);

        return TypedResults.Ok(nabidka.ToList());
    }
}

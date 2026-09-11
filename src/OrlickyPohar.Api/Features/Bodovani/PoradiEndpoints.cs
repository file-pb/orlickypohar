using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Bodovani;

/// <summary>Zastávka, ze které do pořadí přišly body. Slouží jako hlavička sloupce.</summary>
public record ZastavkaDto(string Slug, string Nazev, DateOnly Datum, int Poradi);

/// <summary>
/// Jedna loď v průběžném pořadí. <c>Zastavky</c> drží body po zastávkách ve
/// stejném pořadí, v jakém je vydává <c>Zastavky</c> na celé sérii — prázdné
/// místo znamená, že tam loď nestartovala.
/// </summary>
public record PoradiLodiDto(
    string Lod,
    string Majitel,
    IReadOnlyList<int?> Zastavky,
    int Body,
    int Poradi,
    int BodyPoSkrtu,
    int PoradiPoSkrtu,
    int? Skrtnuto);

public record PoradiKategorieDto(string Kategorie, IReadOnlyList<PoradiLodiDto> Lode);

public record PoradiSerieDto(
    string Slug, string Nazev, int Rok,
    IReadOnlyList<ZastavkaDto> Zastavky,
    IReadOnlyList<PoradiKategorieDto> Kategorie);

/// <summary>
/// Průběžné pořadí seriálu, po kategoriích. Do poháru se boduje vždy uvnitř
/// kategorie, i když se závod vyhodnocoval jako celé pole — seriál má proto
/// tři pořadí, ne jedno.
/// <para>
/// Vydávají se <b>obě čísla</b>, součet i součet po škrtu. Rozhodčí vede
/// v sešitu obojí a rozdíl mezi nimi rozhoduje; zahodit jedno by znamenalo
/// zahodit informaci, kterou si čtenář nemá jak dopočítat.
/// </para>
/// </summary>
public static class PoradiEndpoints
{
    public static void MapPoradi(this IEndpointRouteBuilder app)
    {
        app.MapGet("/serie/{slug}/poradi", PoradiAsync)
            .WithTags("Série")
            .WithSummary("Vrátí průběžné pořadí seriálu po kategoriích");
    }

    private static async Task<Results<Ok<PoradiSerieDto>, NotFound>> PoradiAsync(
        string slug, AppDbContext db, CancellationToken ct)
    {
        // Nepublikovaný ročník neexistuje — 404, ne 403, stejně jako u ostatního čtení.
        var serie = await db.Serie
            .Where(s => s.Slug == slug && s.Publikovano)
            .Select(s => new { s.Id, s.Slug, s.Nazev, s.Rok })
            .FirstOrDefaultAsync(ct);

        if (serie is null) return TypedResults.NotFound();

        // Jen odjeté zastávky. Plánovaná nemá výsledky a zrušená se do poháru
        // nepočítá vůbec — v tabulce by obojí vypadalo jako prázdný sloupec,
        // ale znamená to něco jiného.
        var zastavky = await db.Zavody
            .Where(z => z.SerieId == serie.Id && z.Publikovano && z.Stav == StavZavodu.Odjety)
            .OrderBy(z => z.Poradi)
            .Select(z => new
            {
                z.Id, z.Slug, z.Nazev, z.Datum, z.Poradi, z.PocetSkrtu, z.KoeficientDoSerie,
            })
            .ToListAsync(ct);

        // Jeden dotaz na všechny výsledky ročníku. Devět zastávek krát osm
        // rozjížděk by jinak bylo sedmdesát dotazů kvůli jedné tabulce.
        var radky = await db.Vysledky
            .Where(v => v.Rozjizdka!.DoSerie
                        // Do poháru jen to, co je venku a platí. Nepotvrzená
                        // čísla by pořadí měnila pod rukama a eliminovaná
                        // rozjížďka se nepočítá vůbec.
                        && v.Rozjizdka.Publikovano
                        && v.Rozjizdka.StavVysledku != StavVysledku.Eliminovano
                        && v.Rozjizdka.Zavod!.SerieId == serie.Id
                        && v.Rozjizdka.Zavod.Publikovano
                        && v.Rozjizdka.Zavod.Stav == StavZavodu.Odjety)
            .Select(v => new
            {
                v.Rozjizdka!.ZavodId,
                v.Rozjizdka.Cislo,
                Lod = v.Ucast!.Prihlaska!.Lod!.Nazev,
                Kategorie = v.Ucast.Prihlaska.Kategorie!.Nazev,
                v.PoradiVCili,
                v.Kod,
            })
            .ToListAsync(ct);

        var kategorie = await db.Kategorie
            .Where(k => k.SerieId == serie.Id)
            .OrderBy(k => k.Poradi)
            .Select(k => k.Nazev)
            .ToListAsync(ct);

        // Projekce až v databázi, ne v klíči slovníku: `ToDictionaryAsync`
        // materializuje přihlášky bez navigací, takže `p.Lod` by tam bylo
        // prázdné a klíč by spadl.
        var majitele = await db.Prihlasky
            .Where(p => p.SerieId == serie.Id)
            .Select(p => new
            {
                Lod = p.Lod!.Nazev,
                Majitel = p.Lod.Majitel!.Jmeno + " " + p.Lod.Majitel.Prijmeni,
            })
            .ToDictionaryAsync(x => x.Lod, x => x.Majitel, ct);

        // Body ze zastávek, v pořadí zastávek. Prázdné místo znamená, že tam
        // loď nestartovala — a nestartovaná zastávka se do součtu nepočítá.
        // Co s neúčastí dělá rozhodčí, ze sešitu čistě nevychází (nadcházející
        // zastávky mají prázdno, ale zrušené nuly), takže tady se nic
        // nedopočítává; je to otázka na něj.
        var body = new Dictionary<(string Lod, string Kategorie), int?[]>();

        for (var i = 0; i < zastavky.Count; i++)
        {
            var zastavka = zastavky[i];

            var rozjizdky = radky
                .Where(r => r.ZavodId == zastavka.Id)
                .GroupBy(r => r.Cislo)
                .OrderBy(g => g.Key)
                .Select(g => new RozjizdkaVstup(g.Key,
                    [.. g.Select(r => new VysledekVstup(r.Lod, r.Kategorie, r.PoradiVCili, r.Kod))]))
                .ToList();

            var vysledky = Bodovani.VysledkyZavodu(rozjizdky, zastavka.PocetSkrtu);

            foreach (var (lod, kat, bodyZeZastavky) in
                     SerieBodovani.BodyDoSerie(vysledky, zastavka.KoeficientDoSerie))
            {
                if (!body.TryGetValue((lod, kat), out var rada))
                    body[(lod, kat)] = rada = new int?[zastavky.Count];

                rada[i] = bodyZeZastavky;
            }
        }

        var poradi = kategorie
            .Select(kat =>
            {
                var lode = body.Where(x => x.Key.Kategorie == kat).ToList();

                var spocteno = SerieBodovani.Poradi(lode.Select(x =>
                    new LodVSerii(x.Key.Lod, [.. x.Value.Where(b => b is not null).Select(b => b!.Value)])));

                return new PoradiKategorieDto(kat,
                [
                    .. spocteno.Select(p => new PoradiLodiDto(
                        p.Lod,
                        majitele.GetValueOrDefault(p.Lod, string.Empty),
                        body[(p.Lod, kat)],
                        p.Body, p.Poradi, p.BodyPoSkrtu, p.PoradiPoSkrtu, p.Skrtnuto)),
                ]);
            })
            .ToList();

        return TypedResults.Ok(new PoradiSerieDto(
            serie.Slug, serie.Nazev, serie.Rok,
            [.. zastavky.Select(z => new ZastavkaDto(z.Slug, z.Nazev, z.Datum, z.Poradi))],
            poradi));
    }
}

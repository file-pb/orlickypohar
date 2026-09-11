using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
// Řez i třída se jmenují stejně, takže se prosté `Bodovani` uvnitř sousedního
// jmenného prostoru rozumí jako název jmenného prostoru. Alias to rozsekne.
using Vypocet = OrlickyPohar.Api.Features.Bodovani.Bodovani;

namespace OrlickyPohar.Api.Features.Zavody;

public record VysledekDto(
    string Lod, string Kategorie, string? Kormidelnik,
    int? PoradiVCili, int? CasSekundy, KodVysledku? Kod);

public record RozjizdkaDto(
    int Cislo, DateTimeOffset? StartV, StavRozjizdky Stav, bool DoSerie,
    IReadOnlyList<VysledekDto> Vysledky);

/// <summary>
/// Loď, která na zastávku přijela — bez ohledu na to, jestli se už jelo.
/// U plánované zastávky je to jediné, co o ní jde říct: výsledky ještě
/// nejsou a seznam přihlášených lodí ano.
/// </summary>
public record UcastDto(string Lod, string Kategorie, string? Kormidelnik);

/// <summary>Body lodi v jedné rozjížďce, už jako pořadí v její kategorii.</summary>
public record BodyVRozjizdceDto(int Cislo, int Body, bool Skrtnuto);

/// <summary>
/// Výsledek lodi v závodě: součet bodů z rozjížděk a pořadí v kategorii.
/// Vítěz závodu má jeden bod — do seriálu z toho jde pořadí, ne tenhle součet.
/// </summary>
public record VysledekZavoduDto(
    string Lod, string Kategorie, int Body, int Poradi,
    IReadOnlyList<BodyVRozjizdceDto> Rozjizdky);

public record ZavodDetailDto(
    string Slug, string Nazev, DateOnly Datum, DateOnly? DatumKonce,
    string? Typ, string? Poradatel, StavZavodu Stav, DateOnly? PuvodniDatum,
    int PocetSkrtu, Vyhodnoceni Vyhodnoceni, decimal KoeficientDoSerie,
    IReadOnlyList<RozjizdkaDto> Rozjizdky,
    IReadOnlyList<VysledekZavoduDto> Poradi,
    IReadOnlyList<UcastDto> Lode);

/// <summary>
/// Veřejné čtení jedné zastávky. Pravidla závodu (škrty, vyhodnocení,
/// koeficient) se vydávají spolu s výsledky schválně: bez nich se pořadí
/// nedá zkontrolovat a divák nemá jak poznat, proč se která rozjížďka
/// nepočítá.
/// <para>
/// Body počítá <b>server</b>. Vydávají se vedle výsledků, ne místo nich:
/// syrové pořadí z vody je pravda, body jsou z něj dopočítané.
/// </para>
/// </summary>
public static class ZavodEndpoints
{
    public static void MapZavody(this IEndpointRouteBuilder app)
    {
        app.MapGet("/serie/{serieSlug}/zavody/{slug}", DetailAsync)
            .WithTags("Závody")
            .WithSummary("Vrátí zastávku s rozjížďkami a výsledky");
    }

    private static async Task<Results<Ok<ZavodDetailDto>, NotFound>> DetailAsync(
        string serieSlug, string slug, AppDbContext db, CancellationToken ct)
    {
        var zavod = await db.Zavody
            .Where(z => z.Slug == slug && z.Publikovano
                        && z.Serie!.Slug == serieSlug && z.Serie.Publikovano)
            .Select(z => new
            {
                z.Id, z.SerieId, z.Slug, z.Nazev, z.Datum, z.DatumKonce, z.Typ, z.Poradatel,
                z.Stav, z.PuvodniDatum, z.PocetSkrtu, z.Vyhodnoceni, z.KoeficientDoSerie,
            })
            .FirstOrDefaultAsync(ct);

        if (zavod is null) return TypedResults.NotFound();

        // Jeden dotaz na všechny výsledky závodu, ne dotaz na rozjížďku.
        // Rozjížděk bývá osm a lodí dvacet — N+1 by tu bylo osm zbytečných cest.
        //
        // Jen publikované: dokud správce výsledky nepustí ven, rozjížďka na
        // stránce je (jelo se), ale čísla u ní ne. Prázdná rozjížďka je
        // pravda, nepotvrzené pořadí by pravda být nemuselo.
        var radky = await db.Vysledky
            .Where(v => v.Rozjizdka!.ZavodId == zavod.Id && v.Rozjizdka.Publikovano)
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

        // Kdo na zastávku přijel. U plánované zastávky je to jediný obsah,
        // který stránka má — a u odjeté se z toho pozná loď, která přijela
        // a nakonec nestartovala v žádné rozjížďce.
        var lode = await db.Ucasti
            .Where(u => u.ZavodId == zavod.Id)
            .OrderBy(u => u.Prihlaska!.Kategorie!.Poradi).ThenBy(u => u.Prihlaska!.Lod!.Nazev)
            .Select(u => new UcastDto(
                u.Prihlaska!.Lod!.Nazev,
                u.Prihlaska.Kategorie!.Nazev,
                u.Kormidelnik == null ? null : u.Kormidelnik.Jmeno + " " + u.Kormidelnik.Prijmeni))
            .ToListAsync(ct);

        // Seznam rozjížděk se bere z rozjížděk, ne z výsledků: rozjížďka bez
        // jediného zapsaného řádku i ta s nepublikovanými čísly na stránce
        // být má, jen prázdná. Eliminovaná ne — ta neplatí nikde.
        var vsechny = await db.Rozjizdky
            .Where(r => r.ZavodId == zavod.Id && r.StavVysledku != StavVysledku.Eliminovano)
            .OrderBy(r => r.Cislo)
            .Select(r => new { r.Cislo, r.StartV, r.Stav, r.DoSerie })
            .ToListAsync(ct);

        var podleCisla = radky.GroupBy(r => r.Cislo).ToDictionary(g => g.Key, g => g.ToList());

        var rozjizdky = vsechny
            .Select(r => new RozjizdkaDto(r.Cislo, r.StartV, r.Stav, r.DoSerie,
            [
                .. podleCisla.GetValueOrDefault(r.Cislo, []).Select(v => new VysledekDto(
                    v.Lod, v.Kategorie, v.Kormidelnik, v.PoradiVCili,
                    v.NamerenyCas == null ? null : (int)v.NamerenyCas.Value.TotalSeconds,
                    v.Kod)),
            ]))
            .ToList();

        // Do bodů jde všechno, co se v závodě odjelo a je venku — příznak
        // `DoSerie` rozhoduje o poháru, ne o výsledku závodu.
        var poradi = Vypocet.VysledkyZavodu(
        [
            .. rozjizdky.Select(r => new RozjizdkaVstup(r.Cislo,
                [.. r.Vysledky.Select(v => new VysledekVstup(v.Lod, v.Kategorie, v.PoradiVCili, v.Kod))])),
        ], zavod.PocetSkrtu);

        // Kategorie se řadí podle série, ne podle toho, v jakém pořadí je
        // vrátila databáze. Abecedně by Nad7m předběhlo Race bez důvodu
        // a klienti by to museli dorovnávat každý sám.
        var poradiKategorii = await db.Kategorie
            .Where(k => k.SerieId == zavod.SerieId)
            .ToDictionaryAsync(k => k.Nazev, k => k.Poradi, ct);

        poradi = [.. poradi
            .OrderBy(v => poradiKategorii.GetValueOrDefault(v.Kategorie, int.MaxValue))
            .ThenBy(v => v.Poradi)];

        return TypedResults.Ok(new ZavodDetailDto(
            zavod.Slug, zavod.Nazev, zavod.Datum, zavod.DatumKonce, zavod.Typ, zavod.Poradatel,
            zavod.Stav, zavod.PuvodniDatum, zavod.PocetSkrtu, zavod.Vyhodnoceni, zavod.KoeficientDoSerie,
            rozjizdky,
            [.. poradi.Select(v => new VysledekZavoduDto(
                v.Lod, v.Kategorie, v.Body, v.Poradi,
                [.. v.Rozjizdky.Select(b => new BodyVRozjizdceDto(b.Cislo, b.Body, b.Skrtnuto))]))],
            lode));
    }
}

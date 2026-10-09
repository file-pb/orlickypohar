using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;

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
    string? Obrazek = null,
    // Naše kopie té fotky ve dvou velikostech. Má přednost před `Obrazek`:
    // je v rozměru, který stránka potřebuje, a nezmizí, když je zdroj dole.
    ObrazekDto? Fotka = null,
    // Malé logo zdroje k jeho štítku, soubor ve webu. Zdroj je záznam
    // (`Zdroje.Vsechny`), takže klient o jednotlivých zdrojích nic neví.
    string? ZdrojLogo = null);

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
        AppDbContext db, IUloziste uloziste, CancellationToken ct, int? limit = null)
    {
        var dotaz = db.PrevzateClanky
            .OrderByDescending(c => c.PublikovanoV).ThenByDescending(c => c.Id)
            .AsQueryable();

        // Stejné pravidlo jako u našich článků: nula i chybějící parametr
        // znamenají „bez limitu", jinak by překlep v odkazu vrátil prázdno.
        // Strop je součet toho, co se drží u všech zdrojů — víc v databázi
        // stejně neleží.
        if (limit is > 0) dotaz = dotaz.Take(Math.Min(limit.Value, Zdroje.Vsechny.Sum(z => z.Kolik)));

        var clanky = await dotaz
            .Select(c => new
            {
                c.Titulek, c.Perex, c.PublikovanoV, c.Odkaz, c.Zdroj, c.ZdrojOdkaz,
                c.Obrazek, c.FotkaId, c.Sirka, c.Vyska,
            })
            .ToListAsync(ct);

        // Loga podle jména zdroje: v databázi je jméno, pravda o zdroji je
        // v `Zdroje.Vsechny`. Zdroj, který ze seznamu zmizí, tak nejvýš
        // přijde o logo — články po něm zůstanou čitelné.
        var loga = Zdroje.Vsechny.ToDictionary(z => z.Nazev, z => z.Logo);

        return TypedResults.Ok(clanky
            .Select(c => new PrevzatyClanekDto(
                c.Titulek, c.Perex, c.PublikovanoV, c.Odkaz, c.Zdroj, c.ZdrojOdkaz, c.Obrazek,
                NasObrazek(c.FotkaId, c.Sirka, c.Vyska, c.Zdroj, uloziste.VerejnaAdresa),
                loga.GetValueOrDefault(c.Zdroj)))
            .ToList());
    }

    /// <summary>
    /// Naše kopie fotky pro klienta, nebo <c>null</c>, když ji nemáme nebo
    /// neznáme veřejnou adresu úložiště. <b>Kredit je jméno zdroje</b> —
    /// fotografa od nich neznáme a vymýšlet si ho nebudeme.
    /// </summary>
    private static ObrazekDto? NasObrazek(
        Guid? id, int? sirka, int? vyska, string zdroj, string? verejnaAdresa) =>
        id is not { } fotka || string.IsNullOrWhiteSpace(verejnaAdresa)
            ? null
            : new ObrazekDto(
                Nahravani.Adresa(verejnaAdresa, PrevzateFotky.Klic(fotka, Nahravani.SirkaNahledu)),
                Nahravani.Adresa(verejnaAdresa, PrevzateFotky.Klic(fotka, Nahravani.SirkaVelke)),
                sirka ?? 0, vyska ?? 0, zdroj, null, fotka);
}

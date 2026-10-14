using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Vodocet;

public record BodHladinyDto(DateTimeOffset Cas, decimal Hladina);

/// <summary>
/// Stav Orlíku pro widget. Časy v UTC; objemy v m³, průtoky v m³/s,
/// objem nádrže v mil. m³ (tak ho uvádí Povodí).
/// </summary>
public record VodocetDto(
    DateTimeOffset Cas,
    decimal Hladina,
    decimal? Objem,
    decimal? Pritok,
    decimal? Odtok,
    // `null`, dokud sběr nepokrývá celých 24 h.
    double? PritokZaDen,
    double? OdtokZaDen,
    double? ZmenaObjemu,
    IReadOnlyList<BodHladinyDto> Historie,
    string Zdroj,
    /// <summary>
    /// Rozsahy, na které jde graf přepnout, protože pro ně data jsou.
    /// Widget z nich dělá tlačítka — nabízet pevný seznam by znamenalo
    /// nabízet prázdné grafy.
    /// </summary>
    IReadOnlyList<string> DostupneRozsahy);

/// <summary>Řada hladiny pro jeden rozsah grafu.</summary>
public record RadaHladinyDto(
    string Rozsah,
    DateTimeOffset Od,
    DateTimeOffset Do,
    IReadOnlyList<BodHladinyDto> Body);

public static class VodocetEndpoints
{
    public static void MapVodocet(this IEndpointRouteBuilder app)
    {
        app.MapGet("/vodocet/orlik/rada", RadaAsync)
            .WithTags("Vodočet")
            .WithSummary("Hladina Orlíku za zvolený rozsah")
            .WithDescription(
                "Rozsah je jeden z klíčů, které `/vodocet/orlik` vrací v `dostupneRozsahy`. "
                + "Body jsou prořídlé podle stáří už v databázi a odpověď je navíc zastropovaná, "
                + "takže ani roční graf nepřesáhne pár set bodů. 400 na neznámý rozsah, "
                + "404, dokud není uložené žádné měření.");

        app.MapGet("/vodocet/orlik", OrlikAsync)
            .WithTags("Vodočet")
            .WithSummary("Stav nádrže Orlík a přítok a odtok za posledních 24 h")
            .WithDescription(
                "Z měření, která aplikace každých deset minut sbírá z portálu Povodí Vltavy. " +
                "404, dokud není uložené žádné měření.");
    }

    private static async Task<Results<Ok<VodocetDto>, NotFound>> OrlikAsync(
        AppDbContext db, CancellationToken ct)
    {
        var posledni = await db.MereniNadrze.OrderByDescending(m => m.Cas).FirstOrDefaultAsync(ct);
        if (posledni is null) return TypedResults.NotFound();

        // Den a hodina navíc: přítok potřebuje měření těsně před začátkem okna.
        var od = posledni.Cas - Bilance.Okno - Bilance.NejdelsiMezera;
        var mereni = await db.MereniNadrze.Where(m => m.Cas >= od).OrderBy(m => m.Cas).ToListAsync(ct);

        // Aktuální hodnoty z posledního měření, které je má. Poslední řádek
        // může být jen z hodinové řady, bez přítoku a objemu.
        var aktualni = mereni.LastOrDefault(m => m.Pritok is not null || m.Objem is not null) ?? posledni;

        return TypedResults.Ok(new VodocetDto(
            aktualni.Cas,
            aktualni.Hladina,
            aktualni.Objem,
            aktualni.Pritok,
            aktualni.Odtok,
            Bilance.PritokZaDen(mereni, aktualni.Cas),
            Bilance.OdtokZaDen(mereni, aktualni.Cas),
            Bilance.ZmenaObjemu(mereni, aktualni.Cas),
            [.. mereni.Where(m => m.Cas > aktualni.Cas - Bilance.Okno && m.Cas <= aktualni.Cas)
                .Select(m => new BodHladinyDto(m.Cas, m.Hladina))],
            Pvl.Adresa,
            RozsahyGrafu.Dostupne(
                await db.MereniNadrze.MinAsync(m => (DateTimeOffset?)m.Cas, ct),
                posledni.Cas)));
    }

    /// <summary>
    /// Hladina za zvolený rozsah.
    /// <para>
    /// <b>Konec řady je poslední měření, ne „teď".</b> Kdyby sběr vypadl,
    /// okno počítané od systémového času by se postupně vyprázdnilo
    /// a graf by tvrdil, že data nejsou — místo aby ukázal, co je.
    /// </para>
    /// <para>
    /// <b>Vrací jen hladinu.</b> Průtoky mají v řadě jen hodinové hodnoty
    /// a na ročním grafu by z nich byl les; bilance je od toho, aby je
    /// shrnula čísly.
    /// </para>
    /// </summary>
    private static async Task<Results<Ok<RadaHladinyDto>, NotFound, BadRequest<string>>> RadaAsync(
        AppDbContext db, string rozsah, CancellationToken ct)
    {
        var delka = RozsahyGrafu.Delka(rozsah);
        if (delka is null)
            return TypedResults.BadRequest(
                $"Neznámý rozsah \u201e{rozsah}\u201c. Platné jsou: "
                + string.Join(", ", RozsahyGrafu.Vsechny.Select(r => r.Klic)) + ".");

        var posledni = await db.MereniNadrze.OrderByDescending(m => m.Cas).FirstOrDefaultAsync(ct);
        if (posledni is null) return TypedResults.NotFound();

        var od = posledni.Cas - delka.Value;
        var body = await db.MereniNadrze
            .Where(m => m.Cas >= od && m.Cas <= posledni.Cas)
            .OrderBy(m => m.Cas)
            .Select(m => new BodHladinyDto(m.Cas, m.Hladina))
            .ToListAsync(ct);

        return TypedResults.Ok(new RadaHladinyDto(
            rozsah, od, posledni.Cas, RozsahyGrafu.NaStrop(body)));
    }
}

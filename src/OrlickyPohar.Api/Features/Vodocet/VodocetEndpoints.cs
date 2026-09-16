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
    string Zdroj);

public static class VodocetEndpoints
{
    public static void MapVodocet(this IEndpointRouteBuilder app)
    {
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
            Pvl.Adresa));
    }
}

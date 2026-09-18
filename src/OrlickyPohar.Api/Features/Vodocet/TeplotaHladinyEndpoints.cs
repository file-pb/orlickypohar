using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Import;

namespace OrlickyPohar.Api.Features.Vodocet;

public record TeplotaMistaDto(string Misto, decimal Teplota, int Pixelu);

public record SnimekHladinyDto(string Snimek, DateTimeOffset Cas, IReadOnlyList<TeplotaMistaDto> Mista);

/// <summary>Snímky od nejnovějšího; prázdný seznam, dokud úloha nic neposlala.</summary>
public record TeplotaHladinyDto(IReadOnlyList<SnimekHladinyDto> Snimky, string Zdroj);

public record ZapisTeplotyRadek(string Snimek, DateTimeOffset Cas, string Misto, decimal Teplota, int Pixelu);

public record ZapisTeplotyVstup(IReadOnlyList<ZapisTeplotyRadek> Mereni);

public record ZapisTeplotyVysledek(int Nove, int Zmenene);

public static partial class TeplotaHladinyEndpoints
{
    public const string Hlavicka = "X-Landsat-Token";
    public const string Zdroj = "https://planetarycomputer.microsoft.com/dataset/landsat-c2-l2";

    /// <summary>
    /// Widget ukazuje poslední snímek a změnu proti předchozímu v rámci
    /// 14 dní (Filip, 18. 9. 2026: jachtaře zajímá týden až dva, ne sezóna).
    /// </summary>
    public const int VychoziDni = 14;
    public const int NejvicDni = 400;
    public const int NejvicRadku = 5000;

    public static void MapTeplotaHladiny(this IEndpointRouteBuilder app)
    {
        app.MapGet("/vodocet/teplota-hladiny", CtiAsync)
            .WithTags("Vodočet")
            .WithSummary("Povrchová teplota Orlíku ze satelitu Landsat")
            .WithDescription(
                "Snímky za `dni` dní před tím nejnovějším (výchozí 14), od nejnovějšího. " +
                "Odhad horní vrstvy kolem poledne, zatím neověřený teploměrem.");

        app.MapPost("/vodocet/teplota-hladiny", ZapisAsync)
            .WithTags("Vodočet")
            .WithSummary("Zápis teplot z plánované úlohy")
            .WithDescription(
                "Chráněno tokenem v hlavičce X-Landsat-Token. Idempotentní podle " +
                "snímku a místa: opakované odeslání hodnotu přepíše, nic nepřibude.");
    }

    private static async Task<TeplotaHladinyDto> CtiAsync(AppDbContext db, int? dni, CancellationToken ct)
    {
        var okno = TimeSpan.FromDays(Math.Clamp(dni ?? VychoziDni, 1, NejvicDni));
        var posledni = await db.TeplotyHladiny.MaxAsync(t => (DateTimeOffset?)t.Cas, ct);
        if (posledni is null) return new TeplotaHladinyDto([], Zdroj);

        var od = posledni.Value - okno;
        var radky = await db.TeplotyHladiny.AsNoTracking()
            .Where(t => t.Cas >= od)
            .ToListAsync(ct);

        return new TeplotaHladinyDto(
            [.. radky.GroupBy(t => t.Snimek)
                .Select(g => new SnimekHladinyDto(g.Key, g.First().Cas,
                    [.. g.OrderBy(t => t.Misto, StringComparer.Ordinal)
                        .Select(t => new TeplotaMistaDto(t.Misto, t.Teplota, t.Pixelu))]))
                .OrderByDescending(s => s.Cas).ThenBy(s => s.Snimek, StringComparer.Ordinal)],
            Zdroj);
    }

    private static async Task<IResult> ZapisAsync(
        ZapisTeplotyVstup vstup, HttpContext ctx, AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        switch (ImportniToken.Over(ctx, config["Landsat:Token"], Hlavicka))
        {
            case StavTokenu.Nenakonfigurovan:
                return Results.Problem(
                    "Zápis teploty není nakonfigurovaný.", statusCode: StatusCodes.Status503ServiceUnavailable);
            case StavTokenu.Nesedi:
                return Results.Unauthorized();
        }

        if (Chyba(vstup) is { } chyba) return Results.BadRequest(new { error = chyba });

        return Results.Ok(await UlozAsync(db, vstup.Mereni, ct));
    }

    public static string? Chyba(ZapisTeplotyVstup vstup)
    {
        if (vstup.Mereni is null || vstup.Mereni.Count == 0) return "Chybí měření.";
        if (vstup.Mereni.Count > NejvicRadku) return $"Nejvýš {NejvicRadku} měření v jedné dávce.";

        foreach (var r in vstup.Mereni)
        {
            if (string.IsNullOrWhiteSpace(r.Snimek) || r.Snimek.Length > TeplotaHladiny.SnimekNejvic)
                return "Snímek musí mít identifikátor.";
            if (r.Misto is null || !Slug().IsMatch(r.Misto))
                return $"Místo „{r.Misto}“ není slug.";
            // Rozsah, který voda na Orlíku může mít, s rezervou. Mimo něj
            // je to skoro jistě břeh nebo mrak, ne voda.
            if (r.Teplota is < -5 or > 45) return $"Teplota {r.Teplota} °C není voda.";
            if (r.Pixelu < 1) return "Měření musí stát aspoň na jednom pixelu.";
        }

        return vstup.Mereni.GroupBy(r => (r.Snimek, r.Misto)).Any(g => g.Count() > 1)
            ? "Snímek a místo se v dávce opakují."
            : null;
    }

    /// <summary>
    /// Upsert podle snímku a místa. Jedno uložení, takže projde celá
    /// dávka, nebo nic.
    /// </summary>
    public static async Task<ZapisTeplotyVysledek> UlozAsync(
        AppDbContext db, IReadOnlyList<ZapisTeplotyRadek> mereni, CancellationToken ct)
    {
        var snimky = mereni.Select(r => r.Snimek).Distinct().ToList();
        var ulozene = await db.TeplotyHladiny.Where(t => snimky.Contains(t.Snimek))
            .ToDictionaryAsync(t => (t.Snimek, t.Misto), ct);

        int nove = 0, zmenene = 0;
        foreach (var r in mereni)
        {
            var teplota = Math.Round(r.Teplota, 1);
            if (!ulozene.TryGetValue((r.Snimek, r.Misto), out var radek))
            {
                db.TeplotyHladiny.Add(new TeplotaHladiny
                {
                    Snimek = r.Snimek,
                    // Npgsql jiný posun než nulu do timestamptz nezapíše.
                    Cas = r.Cas.ToUniversalTime(),
                    Misto = r.Misto,
                    Teplota = teplota,
                    Pixelu = r.Pixelu,
                });
                nove++;
            }
            else if (radek.Teplota != teplota || radek.Pixelu != r.Pixelu)
            {
                radek.Teplota = teplota;
                radek.Pixelu = r.Pixelu;
                zmenene++;
            }
        }

        await db.SaveChangesAsync(ct);
        return new ZapisTeplotyVysledek(nove, zmenene);
    }

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex Slug();
}

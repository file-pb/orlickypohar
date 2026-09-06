using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Measurements;

// PŘÍKLADOVÝ ŘEZ. Ukazuje konvenci: endpointy, handlery, DTO i entita jedné
// funkce leží v jedné složce. Pro jiný projekt složku smaž a napiš si vlastní.

public record MeasurementInput(
    string Metric,
    double Value,
    DateTimeOffset ValidAt,
    DateTimeOffset? IssuedAt = null,
    Quality Quality = Quality.Good,
    string? EventId = null);

public record IngestRequest(string SourceId, IReadOnlyList<MeasurementInput> Measurements);

/// <summary>
/// Quarantined není chyba. Dávka je přijatá celá — neznámé metriky čekají
/// na povýšení do katalogu a zařízení nemá co opakovat.
/// </summary>
public record IngestResponse(int Accepted, int Duplicates, int Quarantined);

public record MeasurementDto(string Metric, double Value, string Unit, DateTimeOffset ValidAt, DateTimeOffset? IssuedAt, Quality Quality);

public static class MeasurementEndpoints
{
    public static void MapMeasurements(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/measurements").WithTags("Measurements");

        g.MapPost("/", IngestAsync)
            .WithSummary("Zapíše dávku pozorování")
            .WithDescription("Dávkově a idempotentně. Přijímá i data se zpětnými časy z offline provozu a neznámé metriky odkládá do karantény místo odmítnutí.");

        g.MapGet("/", QueryAsync)
            .WithSummary("Vrátí pozorování zdroje za časový rozsah");
    }

    private static async Task<IResult> IngestAsync(
        IngestRequest req, AppDbContext db, TimeProvider clock, CancellationToken ct)
    {
        if (req.Measurements.Count == 0)
            return Results.BadRequest(new { error = "Dávka neobsahuje žádná pozorování." });

        var paths = req.Measurements.Select(m => m.Metric).ToHashSet();
        var known = await db.Metrics
            .Where(d => paths.Contains(d.Path))
            .ToDictionaryAsync(d => d.Path, d => d.Id, ct);

        var eventIds = req.Measurements
            .Where(m => m.EventId is not null)
            .Select(m => m.EventId!)
            .ToHashSet();

        var seen = eventIds.Count == 0
            ? []
            : await db.Measurements
                .Where(m => m.SourceId == req.SourceId && m.EventId != null && eventIds.Contains(m.EventId))
                .Select(m => m.EventId!)
                .ToHashSetAsync(ct);

        var receivedAt = clock.GetUtcNow();
        int accepted = 0, duplicates = 0, quarantined = 0;

        foreach (var input in req.Measurements)
        {
            if (input.EventId is not null && seen.Contains(input.EventId)) { duplicates++; continue; }

            if (!known.TryGetValue(input.Metric, out var metricId))
            {
                db.Quarantine.Add(new QuarantinedMeasurement
                {
                    SourceId = req.SourceId,
                    MetricPath = input.Metric,
                    Value = input.Value,
                    ValidAt = input.ValidAt.ToUniversalTime(),
                    ReceivedAt = receivedAt,
                    IssuedAt = input.IssuedAt?.ToUniversalTime(),
                    EventId = input.EventId,
                    Reason = "Metrika není v katalogu.",
                });
                quarantined++;
                continue;
            }

            db.Measurements.Add(new Measurement
            {
                SourceId = req.SourceId,
                MetricId = metricId,
                Value = input.Value,
                ValidAt = input.ValidAt.ToUniversalTime(),
                ReceivedAt = receivedAt,
                IssuedAt = input.IssuedAt?.ToUniversalTime(),
                Quality = input.Quality,
                EventId = input.EventId,
            });
            accepted++;
        }

        await db.SaveChangesAsync(ct);
        return Results.Ok(new IngestResponse(accepted, duplicates, quarantined));
    }

    private static async Task<IResult> QueryAsync(
        AppDbContext db, string source, string? metric,
        DateTimeOffset? from, DateTimeOffset? to,
        CancellationToken ct, bool latestIssueOnly = true, int limit = 500)
    {
        var q = db.Measurements.Where(m => m.SourceId == source);

        // Prefixové hledání kopíruje hierarchii cest: "electrical.batteries" vrátí všechny baterie.
        if (metric is not null)
            q = q.Where(m => m.Metric!.Path == metric || m.Metric.Path.StartsWith(metric + "."));

        if (from is not null) q = q.Where(m => m.ValidAt >= from);
        if (to is not null) q = q.Where(m => m.ValidAt <= to);

        // U předpovědí chceš zpravidla jen poslední revizi pro každý čas platnosti.
        if (latestIssueOnly)
        {
            q = q.Where(m => m.IssuedAt == null || !db.Measurements.Any(o =>
                o.SourceId == m.SourceId && o.MetricId == m.MetricId &&
                o.ValidAt == m.ValidAt && o.IssuedAt > m.IssuedAt));
        }

        var rows = await q
            .OrderByDescending(m => m.ValidAt)
            .Take(Math.Clamp(limit, 1, 5000))
            .Select(m => new MeasurementDto(m.Metric!.Path, m.Value, m.Metric.Unit, m.ValidAt, m.IssuedAt, m.Quality))
            .ToListAsync(ct);

        return Results.Ok(rows);
    }
}

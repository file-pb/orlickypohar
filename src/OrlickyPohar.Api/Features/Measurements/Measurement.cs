namespace OrlickyPohar.Api.Features.Measurements;

public enum Quality { Good = 0, Suspect = 1, Bad = 2 }

/// <summary>
/// Katalog metrik. Drží cestu i kanonickou jednotku na jednom místě —
/// tabulka pozorování nese jen kompaktní MetricId.
/// </summary>
public class MetricDefinition
{
    public int Id { get; set; }

    /// <summary>Hierarchická cesta ve stylu Signal K: electrical.batteries.house.voltage.</summary>
    public required string Path { get; set; }

    public required string Unit { get; set; }
    public string? Description { get; set; }
}

/// <summary>
/// Jedno pozorování. Zdrojem může být zařízení, poller externího API nebo import —
/// úložiště ten rozdíl schválně nezná. Proto SourceId, ne DeviceId.
/// </summary>
public class Measurement
{
    public long Id { get; set; }

    public required string SourceId { get; set; }

    /// <summary>
    /// Cizí klíč do katalogu. Cesta ani jednotka se v řádcích neopakují —
    /// při dvaceti milionech řádků ročně by ses za text platil dvacetimilionkrát.
    /// </summary>
    public int MetricId { get; set; }
    public MetricDefinition? Metric { get; set; }

    /// <summary>
    /// Čas, ke kterému hodnota platí. U měření okamžik pozorování,
    /// u předpovědi čas platnosti. Neutrální název schválně — jeden sloupec
    /// se dvěma významy je zdroj pozdějších nedorozumění.
    /// </summary>
    public DateTimeOffset ValidAt { get; set; }

    /// <summary>Kdy hodnota dorazila. Rozdíl proti ValidAt odhalí zpožděné dávky z offline provozu.</summary>
    public DateTimeOffset ReceivedAt { get; set; }

    /// <summary>
    /// Vydání předpovědi; u měření null. Bez něj by dvě revize předpovědi
    /// na stejný čas platnosti kolidovaly.
    /// HRANICE: až bude potřeba víc než jedna lokalita nebo model,
    /// stane se z předpovědi vlastní typ záznamu, ne další sloupce sem.
    /// </summary>
    public DateTimeOffset? IssuedAt { get; set; }

    public double Value { get; set; }
    public Quality Quality { get; set; } = Quality.Good;

    /// <summary>Identifikátor z původce kvůli idempotenci opakovaných přenosů.</summary>
    public string? EventId { get; set; }
}

/// <summary>
/// Karanténa pro neznámé metriky. Bez ní by katalog vytvořil synchronní vazbu
/// mezi firmwarem na lodi a deploymentem serveru: zařízení nasbírá týden dat
/// s novou metrikou a server mu je odmítne. Takhle se přijme všechno,
/// neznámé počká tady a do katalogu se povýší ručně.
/// </summary>
public class QuarantinedMeasurement
{
    public long Id { get; set; }
    public required string SourceId { get; set; }
    public required string MetricPath { get; set; }
    public double Value { get; set; }
    public DateTimeOffset ValidAt { get; set; }
    public DateTimeOffset ReceivedAt { get; set; }
    public DateTimeOffset? IssuedAt { get; set; }
    public string? EventId { get; set; }
    public required string Reason { get; set; }
}

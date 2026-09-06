using OrlickyPohar.Api.Features.Measurements;
using Shouldly;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Kontrakt na úrovni JSON. Nepotřebuje databázi ani Docker, takže se dá pustit
/// kdekoliv a v CI běží první.
/// </summary>
public class ContractTests
{
    [Fact]
    public void V1Payload_SeNacteSprávně()
    {
        var req = Golden.Parse<IngestRequest>("esp32-batch.v1.json");

        req.SourceId.ShouldBe("esp32-lodni-baterie");
        req.Measurements.Count.ShouldBe(2);

        var first = req.Measurements[0];
        first.Metric.ShouldBe("electrical.batteries.house.voltage");
        first.Value.ShouldBe(13.42);
        first.ValidAt.ShouldBe(new DateTimeOffset(2026, 8, 30, 4, 12, 0, TimeSpan.Zero));
        first.EventId.ShouldBe("esp32-000141");
    }

    /// <summary>
    /// EVOLUČNÍ TEST v1 → v2. Zařízení na lodi nepřeflashuješ na dálku a starý
    /// firmware bude posílat v1 payload ještě dlouho po rozšíření schématu.
    /// Chybějící pole musí dostat bezpečné výchozí hodnoty, ne shodit ingest.
    /// </summary>
    [Fact]
    public void V1Payload_ZustavaPlatnyPoRozsireniNaV2()
    {
        var req = Golden.Parse<IngestRequest>("esp32-batch.v1.json");
        var m = req.Measurements[0];

        m.Quality.ShouldBe(Quality.Good);   // výchozí, ne výjimka
        m.IssuedAt.ShouldBeNull();          // měření, ne předpověď
    }

    [Fact]
    public void V2Payload_NeseQuality()
    {
        var req = Golden.Parse<IngestRequest>("esp32-batch.v2.json");

        req.Measurements[0].Quality.ShouldBe(Quality.Good);
        req.Measurements[1].Quality.ShouldBe(Quality.Suspect);
        req.Measurements[1].Metric.ShouldBe("electrical.batteries.house.stateOfCharge");
    }

    /// <summary>
    /// EVOLUCE OPAČNÝM SMĚREM. Nový firmware se nasadí dřív než server —
    /// zvlášť když je zařízení týden offline. Pole, která server ještě nezná,
    /// musí tiše ignorovat, ne odmítnout celou dávku.
    /// </summary>
    [Fact]
    public void BudouciPole_NeshodiIngest()
    {
        var req = Golden.Parse<IngestRequest>("esp32-batch.v3-future.json");

        req.Measurements.Count.ShouldBe(1);
        req.Measurements[0].Value.ShouldBe(13.42);
        req.Measurements[0].EventId.ShouldBe("esp32-000141");
    }

    [Fact]
    public void SignalK_CestyZustavajiHierarchicke()
    {
        var req = Golden.Parse<IngestRequest>("signalk-battery.json");

        req.Measurements.Select(m => m.Metric).ShouldBe(
        [
            "electrical.batteries.house.voltage",
            "electrical.batteries.start.voltage",
            "environment.wind.speedApparent",
        ]);

        // Prefix "electrical.batteries" musí pokrýt obě baterie a minout vítr.
        req.Measurements.Count(m => m.Metric.StartsWith("electrical.batteries.")).ShouldBe(2);
    }

    /// <summary>
    /// Dvě revize předpovědi na stejný čas platnosti se liší jen IssuedAt.
    /// Bez toho sloupce by kolidovaly — a právě tenhle případ rozbil původní
    /// návrh se čtyřmi sloupci.
    /// </summary>
    [Fact]
    public void RevizePredpovedi_SeLisiPouzeVydanim()
    {
        var req = Golden.Parse<IngestRequest>("forecast-revision.json");

        req.Measurements.Count.ShouldBe(2);
        req.Measurements.Select(m => m.ValidAt).Distinct().Count().ShouldBe(1);
        req.Measurements.Select(m => m.IssuedAt).Distinct().Count().ShouldBe(2);
        req.Measurements.ShouldAllBe(m => m.IssuedAt != null);

        // EventId nese vydání i platnost — jinak by retransmise starší revize
        // přepsala novější, nebo by se obě považovaly za duplicitu.
        req.Measurements.Select(m => m.EventId).Distinct().Count().ShouldBe(2);
    }
}

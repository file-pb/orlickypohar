using System.Net;
using System.Net.Http.Json;
using OrlickyPohar.Api.Features.Measurements;
using Shouldly;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Chování ingestu proti reálné databázi. Tři scénáře, na kterých kontrakt
/// stojí: offline retransmise, neznámá metrika a revidovaná předpověď.
/// </summary>
public class IngestTests(PostgresFixture fx) : IClassFixture<PostgresFixture>
{
    private HttpClient Client => fx.CreateClient();

    private static async Task<IngestResponse> PostAsync(HttpClient c, string payload)
    {
        var res = await c.PostAsync("/measurements",
            new StringContent(payload, System.Text.Encoding.UTF8, "application/json"));
        res.StatusCode.ShouldBe(HttpStatusCode.OK);
        return (await res.Content.ReadFromJsonAsync<IngestResponse>())!;
    }

    /// <summary>
    /// Zařízení ztratí spojení uprostřed přenosu a po obnovení pošle dávku znovu.
    /// Druhý pokus nesmí vyrobit duplicity ani vrátit chybu.
    /// </summary>
    [Fact]
    public async Task OfflineRetransmise_JeIdempotentni()
    {
        var c = Client;
        var payload = Golden.Read("esp32-batch.v1.json");

        var first = await PostAsync(c, payload);
        first.Accepted.ShouldBe(2);
        first.Duplicates.ShouldBe(0);

        var second = await PostAsync(c, payload);
        second.Accepted.ShouldBe(0);
        second.Duplicates.ShouldBe(2);
    }

    /// <summary>
    /// Nový firmware posílá metriku, kterou katalog nezná. Dávka musí projít
    /// celá — jinak by katalog vytvořil synchronní vazbu mezi firmwarem na lodi
    /// a deploymentem serveru a týden nasbíraných dat by se ztratil.
    /// </summary>
    [Fact]
    public async Task NeznamaMetrika_JdeDoKarantény_DavkaProjde()
    {
        var res = await PostAsync(Client, Golden.Read("esp32-batch.v2.json"));

        res.Quarantined.ShouldBe(1);            // stateOfCharge není v katalogu
        (res.Accepted + res.Duplicates).ShouldBe(1);
    }

    /// <summary>
    /// Dvě vydání předpovědi na stejný čas platnosti musí koexistovat
    /// a výchozí dotaz vrací to novější.
    /// </summary>
    [Fact]
    public async Task RevizePredpovedi_Koexistuji_DotazVraciNovejsi()
    {
        var c = Client;
        var res = await PostAsync(c, Golden.Read("forecast-revision.json"));
        res.Accepted.ShouldBe(2);

        var latest = await c.GetFromJsonAsync<List<MeasurementDto>>(
            "/measurements?source=poller-chmu&metric=environment.wind.speedTrue");

        latest!.Count.ShouldBe(1);
        latest[0].Value.ShouldBe(11.5);         // vydání z 12:00, ne z 06:00
        latest[0].Unit.ShouldBe("m/s");         // jednotka z katalogu, ne z payloadu

        var all = await c.GetFromJsonAsync<List<MeasurementDto>>(
            "/measurements?source=poller-chmu&metric=environment.wind.speedTrue&latestIssueOnly=false");
        all!.Count.ShouldBe(2);                 // historie revizí zůstává
    }

    /// <summary>Prefixové hledání kopíruje hierarchii cest ze Signal K.</summary>
    [Fact]
    public async Task PrefixovyDotaz_VratiCelouVetevHierarchie()
    {
        var c = Client;
        await PostAsync(c, Golden.Read("signalk-battery.json"));

        var batteries = await c.GetFromJsonAsync<List<MeasurementDto>>(
            "/measurements?source=signalk-orlik&metric=electrical.batteries");

        batteries!.Count.ShouldBe(2);           // house i start, vítr ne
        batteries.ShouldAllBe(m => m.Metric.StartsWith("electrical.batteries."));
    }
}

using System.Net;
using System.Text.Json;
using System.Text.Json.Schema;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using OrlickyPohar.Api.Features.Boje;
using OrlickyPohar.Api.Features.Fotky;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Schéma tvarů, které jdou ven. <b>Bez databáze a bez Dockeru</b>, protože
/// to, co dokument shodilo, je čistá vlastnost typu — a chyba, která projde
/// až do produkce, nemá čekat na test, který lokálně neběží.
/// <para>
/// Exportér zapisuje do schématu i <b>výchozí hodnoty</b> vlastností, takže
/// <c>Guid Id = default</c> ho shodí dřív, než se stihne něco vydat. Tahle
/// kontrola je ověřená obráceně: s výchozí hodnotou zpátky doopravdy padá.
/// </para>
/// </summary>
public class SchemaTests
{
    // `TypeInfoResolver` musí být nastavený, jinak exportér odmítne i tvar,
    // který je v pořádku — hostitel ho má z ASP.NET, tady se dodá ručně.
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        TypeInfoResolver = new DefaultJsonTypeInfoResolver(),
        Converters = { new JsonStringEnumConverter() },
    };

    [Theory]
    [InlineData(typeof(ObrazekDto))]
    [InlineData(typeof(BojeDto))]
    [InlineData(typeof(PipnutiVstup))]
    public void Schema_tvaru_jde_vyrobit(Type tvar)
    {
        var schema = Json.GetJsonSchemaAsNode(tvar);
        Assert.NotNull(schema);
    }
}

/// <summary>
/// Dokument OpenAPI musí jít vydat. <b>Z něj se generuje klient</b> pro web
/// i appku (`packages/api-client/generuj.sh` ho stahuje z produkce), takže
/// jeho pětistovka zastaví každou další změnu kontraktu — a navenek se
/// přitom nic nezdá, protože samotné endpointy běží dál.
/// <para>
/// Proč to tu je: 9. 10. 2026 shodila dokument jediná výchozí hodnota,
/// <c>Guid Id = default</c> v <c>ObrazekDto</c>. Exportér schématu výchozí
/// hodnoty zapisuje do dokumentu a na <c>default(Guid)</c> padá
/// (<c>JsonException: The JSON value could not be converted to System.Guid</c>).
/// Prošlo to buildem, testy i nasazením — nic na ten endpoint nesahalo.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class OpenApiTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Dokument_se_vyda_a_nese_tvary_boji()
    {
        var klient = fixture.CreateClient();

        var odpoved = await klient.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);

        using var dokument = JsonDocument.Parse(await odpoved.Content.ReadAsStringAsync());
        var schemata = dokument.RootElement.GetProperty("components").GetProperty("schemas");

        // Namátkou tvary, které se zrovna měnily: kdyby exportér spadl až
        // na některém z nich, nevydá se dokument celý a test to chytí výš.
        Assert.True(schemata.GetProperty("BojeDto").GetProperty("properties")
            .TryGetProperty("fotky", out _));
        Assert.True(schemata.GetProperty("PipnutiVstup").GetProperty("properties")
            .TryGetProperty("zdroj", out _));
        Assert.True(schemata.GetProperty("ObrazekDto").GetProperty("properties")
            .TryGetProperty("id", out _));
    }
}

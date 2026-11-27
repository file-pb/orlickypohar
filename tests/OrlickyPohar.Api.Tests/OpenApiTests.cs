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
    // Prvek stavěný jedním požadavkem: nese `Guid Klic` a seznam bodů,
    // tedy přesně tvary, na kterých exportér 9. 10. 2026 spadl.
    [InlineData(typeof(PostavPrvekVstup))]
    [InlineData(typeof(BodPrvkuVstup))]
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

    /// <summary>
    /// <b>Velení je v dokumentu.</b> Handler vrací <c>IResult</c>, takže se
    /// tvar odpovědi do dokumentu dostane jedině přes <c>Produces</c> — a
    /// když chybí, nic nespadne: appce se jen vygeneruje kontrakt bez
    /// <c>VeleniDto</c> a někdo ten tvar opíše ručně. Přesně to se stalo
    /// 7. 11. 2026 a drželo se to do 21. 11.
    /// </summary>
    [Fact]
    public async Task Dokument_nese_tvar_veleni()
    {
        var klient = fixture.CreateClient();

        using var dokument = JsonDocument.Parse(
            await (await klient.GetAsync("/openapi/v1.json")).Content.ReadAsStringAsync());
        var veleni = dokument.RootElement.GetProperty("components")
            .GetProperty("schemas").GetProperty("VeleniDto").GetProperty("properties");

        Assert.True(veleni.TryGetProperty("uzivatelId", out _));
        Assert.True(veleni.TryGetProperty("jmeno", out _));
        Assert.True(veleni.TryGetProperty("odV", out _));
        // Tohle pole je ten důvod, proč se telefon ptá při každém
        // připojení: velí pořád ten, kdo se ptá?
        Assert.True(veleni.TryGetProperty("jsemTo", out _));
    }

    /// <summary>
    /// <b>Vydání appky je v dokumentu</b>, protože appka z něj bere typ, podle
    /// kterého porovnává svůj otisk. Handler vrací typované <c>Results</c>
    /// právě kvůli tomu — s holým <c>IResult</c> by tvar v dokumentu chyběl
    /// a nespadlo by nic, jako u velení.
    /// </summary>
    [Fact]
    public async Task Dokument_nese_vydani_appky()
    {
        var klient = fixture.CreateClient();

        using var dokument = JsonDocument.Parse(
            await (await klient.GetAsync("/openapi/v1.json")).Content.ReadAsStringAsync());
        var vydani = dokument.RootElement.GetProperty("components")
            .GetProperty("schemas").GetProperty("VydaniAppkyDto").GetProperty("properties");

        Assert.True(vydani.TryGetProperty("cisloBalicku", out _));
        Assert.True(vydani.TryGetProperty("otisk", out _));
        Assert.True(vydani.TryGetProperty("vydanoV", out _));
    }

    /// <summary>
    /// <b>Flotila je v dokumentu</b>, protože z něj bere tvary web —
    /// obrazovka správy i profil s balíčkem telefonu. A výčty v něm musí
    /// nést <b>tatáž slova, jaká jdou po drátě</b> (<c>stary-balicek</c>,
    /// ne <c>StaryBalicek</c>): vygenerovaný klient by jinak porovnával
    /// s hodnotou, která nikdy nepřijde, a nespadlo by nic.
    /// </summary>
    [Fact]
    public async Task Dokument_nese_flotilu_a_publikace()
    {
        var klient = fixture.CreateClient();

        using var dokument = JsonDocument.Parse(
            await (await klient.GetAsync("/openapi/v1.json")).Content.ReadAsStringAsync());
        var schemata = dokument.RootElement.GetProperty("components").GetProperty("schemas");

        // Výčet použitý i jako nepovinná vlastnost nese v seznamu navíc
        // `null` — tak ho exportér popisuje a klient ho tak má i dostat.
        // Porovnávají se slova, ne to, jestli smí chybět.
        string[] Hodnoty(string vycet) =>
        [
            .. schemata.GetProperty(vycet).GetProperty("enum").EnumerateArray()
                .Where(e => e.ValueKind != JsonValueKind.Null)
                .Select(e => e.GetString()!),
        ];

        Assert.Equal(
            ["aktualni", "stary-balicek", "stara-aktualizace", "nouzove", "bez-hlaseni"],
            Hodnoty("StavVerzeAppky"));
        Assert.Equal(["ucet", "lod", "zarizeni"], Hodnoty("DruhIdentityFlotily"));
        Assert.Equal(["vestavena", "stazena", "nouzova"], Hodnoty("SpusteniAppky"));

        var radek = schemata.GetProperty("FlotilaRadekDto").GetProperty("properties");
        foreach (var pole in new[]
                 {
                     "druh", "popis", "platforma", "cisloBalicku", "kanal", "spusteni", "aktualizace",
                     "ceka", "odV", "hlasenoV", "aktivniV", "stav", "posledniCisloBalicku",
                     "posledniAktualizace",
                 })
            Assert.True(radek.TryGetProperty(pole, out _), $"FlotilaRadekDto nemá „{pole}“.");

        Assert.True(schemata.GetProperty("FlotilaDto").GetProperty("properties").TryGetProperty("souhrn", out _));
        Assert.True(schemata.GetProperty("FlotilaSouhrnDto").GetProperty("properties").TryGetProperty("aktualni", out _));
        Assert.True(schemata.GetProperty("PublikaceAppkyDto").GetProperty("properties").TryGetProperty("aktualizace", out _));

        // Vstup z CI: přesně tahle pole čte skript v CI.
        var zapis = schemata.GetProperty("ZapisPublikaceAppky").GetProperty("properties");
        foreach (var pole in new[] { "platforma", "kanal", "otisk", "aktualizace", "commit" })
            Assert.True(zapis.TryGetProperty(pole, out _), $"ZapisPublikaceAppky nemá „{pole}“.");

        // Profil: balíček a stav u napojeného telefonu.
        var klic = schemata.GetProperty("KlicUctuDto").GetProperty("properties");
        Assert.True(klic.TryGetProperty("cisloBalicku", out _));
        Assert.True(klic.TryGetProperty("stavVerze", out _));
    }
}

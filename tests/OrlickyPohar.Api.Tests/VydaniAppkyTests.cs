using System.Net;
using System.Net.Http.Json;
using OrlickyPohar.Api.Features.Appka;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Kontrola zápisu z CI. Bez databáze: co neprojde tady, do tabulky se
/// nedostane — a appka by pak porovnávala svůj otisk s nesmyslem.
/// </summary>
public class VydaniAppkyTests
{
    private const string Otisk = "84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b";

    private static ZapisVydaniAppky Zapis(
        string platforma = "android", int cislo = 18, string otisk = Otisk, string? commit = "69e42c75") =>
        new(platforma, cislo, otisk, commit);

    [Fact]
    public void Platny_zapis_projde()
    {
        Assert.Null(VydaniAppkyEndpoints.Chyba(Zapis()));
        Assert.Null(VydaniAppkyEndpoints.Chyba(Zapis(platforma: "ios", commit: null)));
    }

    [Theory]
    [InlineData("Android")]
    [InlineData("web")]
    [InlineData("")]
    public void Platforma_jen_android_nebo_ios(string platforma)
    {
        Assert.NotNull(VydaniAppkyEndpoints.Chyba(Zapis(platforma: platforma)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    // Play víc nepřijme; vyšší číslo je chyba v kroku CI, ne balíček.
    [InlineData(2_100_000_001)]
    public void Cislo_balicku_v_rozsahu_obchodu(int cislo)
    {
        Assert.NotNull(VydaniAppkyEndpoints.Chyba(Zapis(cislo: cislo)));
    }

    [Theory]
    [InlineData("")]
    // Mezera by se s `runtimeVersion` telefonu nikdy neshodla a appka by
    // tvrdila, že tenhle balíček nemá nikdo.
    [InlineData("84146e78 d94b")]
    [InlineData("84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b84146e78d94b4ab28d7e36a9c2")]
    public void Otisk_musi_jit_porovnat_s_telefonem(string otisk)
    {
        Assert.NotNull(VydaniAppkyEndpoints.Chyba(Zapis(otisk: otisk)));
    }

    [Theory]
    [InlineData("main")]
    [InlineData("69E42C75")]
    [InlineData("69e4")]
    public void Commit_musi_byt_hash(string commit)
    {
        Assert.NotNull(VydaniAppkyEndpoints.Chyba(Zapis(commit: commit)));
    }
}

/// <summary>
/// Zápis a čtení proti reálnému PostgreSQL. Idempotence stojí na unikátním
/// indexu platforma × číslo balíčku, který by in-memory databáze neověřila.
/// <para>
/// <b>Databázi sdílí celá kolekce a nic se neuklízí</b>, takže tyhle testy
/// píšou do platformy <c>ios</c> s čísly, která jiný test nepoužije, a
/// čtou jen to, co samy zapsaly.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class VydaniAppkySpravaTests(PostgresFixture fixture)
{
    private HttpClient Klient(string? token = PostgresFixture.VydaniToken)
    {
        var c = fixture.CreateClient();
        if (token is not null) c.DefaultRequestHeaders.Add(VydaniAppkyEndpoints.Hlavicka, token);
        return c;
    }

    private static ZapisVydaniAppky Zapis(int cislo, string otisk, string? commit = null) =>
        new("ios", cislo, otisk, commit);

    [Fact]
    public async Task Opakovany_zapis_nic_nezdvoji_a_cteni_jde_od_nejvyssiho()
    {
        using var k = Klient();

        var prvni = await k.PostAsJsonAsync("/appka/vydani", Zapis(900_017, "otisk-a", "aaaaaaa"));
        prvni.EnsureSuccessStatusCode();
        Assert.True((await prvni.Content.ReadFromJsonAsync<ZapisVydaniAppkyVysledek>())!.Nove);

        // Vyšší číslo přijde dřív, než se nižší pošle znovu: pořadí určuje
        // číslo balíčku, ne okamžik zápisu.
        (await k.PostAsJsonAsync("/appka/vydani", Zapis(900_018, "otisk-b"))).EnsureSuccessStatusCode();

        // Ruční „nahrát znovu" téhož čísla nic nezdvojí.
        var znovu = await k.PostAsJsonAsync("/appka/vydani", Zapis(900_017, "otisk-a"));
        Assert.False((await znovu.Content.ReadFromJsonAsync<ZapisVydaniAppkyVysledek>())!.Nove);

        var cteni = await k.GetFromJsonAsync<List<VydaniAppkyDto>>("/appka/vydani/ios");
        Assert.NotNull(cteni);
        var moje = cteni.Where(v => v.CisloBalicku is 900_017 or 900_018).ToList();
        Assert.Equal([900_018, 900_017], moje.Select(v => v.CisloBalicku));
        Assert.Equal(["otisk-b", "otisk-a"], moje.Select(v => v.Otisk));
    }

    [Fact]
    public async Task Cizi_platforma_se_nevydava_a_neznama_je_404()
    {
        using var k = Klient();
        (await k.PostAsJsonAsync("/appka/vydani", Zapis(900_101, "jen-ios"))).EnsureSuccessStatusCode();

        var android = await k.GetFromJsonAsync<List<VydaniAppkyDto>>("/appka/vydani/android");
        Assert.DoesNotContain(android!, v => v.Otisk == "jen-ios");

        Assert.Equal(HttpStatusCode.NotFound, (await k.GetAsync("/appka/vydani/web")).StatusCode);
    }

    [Fact]
    public async Task Cteni_nepotrebuje_token()
    {
        using var k = Klient(token: null);
        Assert.Equal(HttpStatusCode.OK, (await k.GetAsync("/appka/vydani/android")).StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("spatny")]
    // Importní ani satelitní token na zápis vydání nestačí: kdo ukradne
    // jeden, nemá dostat právo posílat appky lidí do obchodu.
    [InlineData(PostgresFixture.Token)]
    [InlineData(PostgresFixture.LandsatToken)]
    public async Task Zapis_bez_spravneho_tokenu_neprojde(string? token)
    {
        using var k = Klient(token);
        var r = await k.PostAsJsonAsync("/appka/vydani", Zapis(900_201, "otisk-c"));
        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }
}

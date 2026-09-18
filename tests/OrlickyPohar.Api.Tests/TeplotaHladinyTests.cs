using System.Net;
using System.Net.Http.Json;
using OrlickyPohar.Api.Features.Vodocet;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Kontrola dávky od satelitní úlohy. Bez databáze: co neprojde tady,
/// se do tabulky nedostane.
/// </summary>
public class TeplotaHladinyTests
{
    private static readonly DateTimeOffset Cas = new(2026, 8, 15, 9, 57, 0, TimeSpan.Zero);

    private static ZapisTeplotyVstup Davka(params ZapisTeplotyRadek[] r) => new(r);

    private static ZapisTeplotyRadek Radek(string misto = "radava", decimal teplota = 26.8m, string snimek = "LC09_A") =>
        new(snimek, Cas, misto, teplota, 40);

    [Fact]
    public void Platna_davka_projde()
    {
        Assert.Null(TeplotaHladinyEndpoints.Chyba(Davka(Radek(), Radek("velky-vir"))));
    }

    [Theory]
    [InlineData("Radava")]
    [InlineData("velký-vír")]
    [InlineData("velky vir")]
    [InlineData("")]
    public void Misto_musi_byt_slug(string misto)
    {
        Assert.NotNull(TeplotaHladinyEndpoints.Chyba(Davka(Radek(misto))));
    }

    [Theory]
    [InlineData(-6)]
    // Rozpálený břeh v úzké zátoce dával 36,5 °C; tohle už voda být nemůže.
    [InlineData(46)]
    public void Teplota_mimo_vodu_neprojde(double teplota)
    {
        Assert.NotNull(TeplotaHladinyEndpoints.Chyba(Davka(Radek(teplota: (decimal)teplota))));
    }

    [Fact]
    public void Opakovane_misto_ve_snimku_neprojde()
    {
        Assert.NotNull(TeplotaHladinyEndpoints.Chyba(Davka(Radek(), Radek(teplota: 20m))));
    }

    [Fact]
    public void Prazdna_davka_neprojde()
    {
        Assert.NotNull(TeplotaHladinyEndpoints.Chyba(Davka()));
    }
}

/// <summary>
/// Zápis a čtení proti reálnému PostgreSQL. Idempotence stojí na unikátním
/// indexu snímek × místo, který by in-memory databáze neověřila.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class TeplotaHladinySpravaTests(PostgresFixture fixture)
{
    private HttpClient Klient(string? token = PostgresFixture.LandsatToken)
    {
        var c = fixture.CreateClient();
        if (token is not null) c.DefaultRequestHeaders.Add(TeplotaHladinyEndpoints.Hlavicka, token);
        return c;
    }

    // Daleko v budoucnu, aby okno od nejnovějšího snímku patřilo tomuhle testu.
    private static readonly DateTimeOffset Den = new(2040, 7, 20, 11, 57, 0, TimeSpan.FromHours(2));

    private static ZapisTeplotyVstup Davka(decimal radava) => new(
    [
        new("LC09_STARY", Den.AddDays(-20), "radava", 20.0m, 50),
        new("LC09_PRED", Den.AddDays(-8), "radava", 23.4m, 50),
        new("LC09_PRED", Den.AddDays(-8), "trhovky", 23.1m, 44),
        new("LC09_NOVY", Den, "radava", radava, 50),
    ]);

    [Fact]
    public async Task Opakovany_zapis_nic_nezdvoji_a_cteni_ma_okno_14_dni()
    {
        using var k = Klient();

        var prvni = await k.PostAsJsonAsync("/vodocet/teplota-hladiny", Davka(25.04m));
        prvni.EnsureSuccessStatusCode();
        Assert.Equal(new ZapisTeplotyVysledek(4, 0), await prvni.Content.ReadFromJsonAsync<ZapisTeplotyVysledek>());

        // Druhé odeslání s opravenou hodnotou: přepíše se, nic nepřibude.
        var druhy = await k.PostAsJsonAsync("/vodocet/teplota-hladiny", Davka(24.9m));
        Assert.Equal(new ZapisTeplotyVysledek(0, 1), await druhy.Content.ReadFromJsonAsync<ZapisTeplotyVysledek>());

        var cteni = await k.GetFromJsonAsync<TeplotaHladinyDto>("/vodocet/teplota-hladiny");
        Assert.NotNull(cteni);
        Assert.Equal(["LC09_NOVY", "LC09_PRED"], cteni.Snimky.Select(s => s.Snimek));
        Assert.Equal(Den.ToUniversalTime(), cteni.Snimky[0].Cas);
        Assert.Equal(24.9m, Assert.Single(cteni.Snimky[0].Mista).Teplota);
        Assert.Equal(["radava", "trhovky"], cteni.Snimky[1].Mista.Select(m => m.Misto));
    }

    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized)]
    [InlineData("spatny", HttpStatusCode.Unauthorized)]
    // Importní token na zápis teploty nestačí a naopak.
    [InlineData(PostgresFixture.Token, HttpStatusCode.Unauthorized)]
    public async Task Zapis_bez_spravneho_tokenu_neprojde(string? token, HttpStatusCode ocekavany)
    {
        using var k = Klient(token);
        var r = await k.PostAsJsonAsync("/vodocet/teplota-hladiny", Davka(25m));
        Assert.Equal(ocekavany, r.StatusCode);
    }
}

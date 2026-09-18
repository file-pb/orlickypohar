using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Našeptávač proti reálnému PostgreSQL: co o lodi ví z ročníků a účastí.
/// Pravidla hledání jsou čisté funkce v <see cref="NapovedaTests"/>.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class NapovedaEndpointTests(PostgresFixture fixture)
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static SerieVstup Rocnik(string slug, int rok, string lod, string kategorie) => new(
        Slug: slug,
        Nazev: $"Pohár {slug}",
        Rok: rok,
        Kategorie: [new(kategorie, 1)],
        Osoby: [new("novak", "Jan", "Novák"), new("kormidelnik", "Petr", "Svoboda")],
        Lode: [new("lod", lod, "CZE 777", "Pirát", "novak")],
        Prihlasky: [new("lod", kategorie)],
        Zavody:
        [
            new(
                Slug: "zahajeni",
                Nazev: "Zahájení",
                Datum: new DateOnly(rok, 4, 25),
                Poradi: 1,
                Ucasti: [new("lod", "kormidelnik", null)],
                Rozjizdky: []),
        ]);

    private async Task<List<NapovedaLodiDto>> NapovedaAsync(string dotaz, string? serie = null)
    {
        var adresa = $"/lode/napoveda?q={Uri.EscapeDataString(dotaz)}"
                     + (serie is null ? "" : $"&serie={serie}");

        var odpoved = await fixture.CreateClient().GetAsync(adresa);
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);

        return (await odpoved.Content.ReadFromJsonAsync<List<NapovedaLodiDto>>(Json))!;
    }

    [Fact]
    public async Task Napovi_lod_z_minuleho_rocniku_i_s_kategorii_a_kormidelnikem()
    {
        var klient = fixture.CreateClient();
        klient.DefaultRequestHeaders.Add("X-Import-Token", PostgresFixture.Token);
        Assert.Equal(HttpStatusCode.OK,
            (await klient.PostAsJsonAsync("/import/serie", Rocnik("napoveda-2024", 2024, "Šárka", "Race"), Json))
            .StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await klient.PostAsJsonAsync("/import/serie", Rocnik("napoveda-2026", 2026, "Šumava", "Pod7m"), Json))
            .StatusCode);

        // Bez diakritiky a z jiného ročníku, než ve kterém loď jela.
        var sarka = Assert.Single(await NapovedaAsync("sark", "napoveda-2026"));

        Assert.Equal(("Šárka", "CZE 777", "Race"), (sarka.Lod, sarka.CisloPlachty, sarka.Kategorie));
        Assert.Equal("Petr Svoboda", sarka.Kormidelnik);
        Assert.Equal("Jan Novák", sarka.Majitel);
        Assert.Equal(2024, sarka.PosledniRok);
        Assert.False(sarka.VRocniku);

        var sumava = Assert.Single(await NapovedaAsync("sumav", "napoveda-2026"));
        Assert.True(sumava.VRocniku);
    }

    [Fact]
    public async Task Kratky_dotaz_vrati_prazdno()
    {
        Assert.Empty(await NapovedaAsync("a"));
    }
}

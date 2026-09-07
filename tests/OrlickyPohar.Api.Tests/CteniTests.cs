using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Veřejné čtení proti reálnému PostgreSQL. Nejcennější je tu hranice
/// publikovanosti: nepublikovaný ročník se nesmí dostat ven ani omylem,
/// protože v databázi leží vymyšlená data.
/// </summary>
[Trait("Category", "Integracni")]
public class CteniTests(PostgresFixture fixture) : IClassFixture<PostgresFixture>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task Nahraj(SerieVstup vstup)
    {
        var klient = fixture.CreateClient();
        klient.DefaultRequestHeaders.Add("X-Import-Token", PostgresFixture.Token);
        var odpoved = await klient.PostAsJsonAsync("/import/serie", vstup, Json);
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
    }

    private static SerieVstup Rocnik(string slug, bool publikovano, bool zavodPublikovan = true) => new(
        Slug: slug,
        Nazev: $"Pohár {slug}",
        Rok: 2025,
        Kategorie: [new("Race", 1), new("Pod7m", 2)],
        Osoby: [new("novak", "Jan", "Novák"), new("svoboda", "Petr", "Svoboda")],
        Lode:
        [
            new("anicka", $"Anička {slug}", "CZE 1", "Fireball", "novak"),
            new("bora", $"Bóra {slug}", "CZE 2", "Vaurien", "svoboda"),
        ],
        Prihlasky: [new("anicka", "Race"), new("bora", "Pod7m")],
        Zavody:
        [
            new(
                Slug: "zahajeni",
                Nazev: "Zahájení sezóny",
                Datum: new DateOnly(2025, 4, 26),
                Poradi: 1,
                Ucasti: [new("anicka", "novak", null), new("bora", "svoboda", null)],
                Rozjizdky:
                [
                    new(1, null, StavRozjizdky.Dokoncena,
                    [
                        new("anicka", PoradiVCili: 1, CasSekundy: 3600),
                        new("bora", Kod: KodVysledku.Dnf),
                    ]),
                    // Rozjížďka bez jediného výsledku: nesmí ze závodu zmizet.
                    new(2, null, StavRozjizdky.Planovana, []),
                ],
                Publikovano: zavodPublikovan),
        ],
        Publikovano: publikovano);

    [Fact]
    public async Task Publikovany_rocnik_je_videt_i_s_vysledky()
    {
        await Nahraj(Rocnik("verejny", publikovano: true));
        var klient = fixture.CreateClient();

        var detail = await klient.GetFromJsonAsync<SerieDetailDto>("/serie/verejny", Json);
        Assert.NotNull(detail);
        Assert.Equal(2, detail.Kategorie.Count);
        Assert.Single(detail.Zavody);
        Assert.Equal(2, detail.Prihlasky.Count);
        Assert.Contains(detail.Prihlasky, p => p.Majitel == "Jan Novák");

        var zavod = await klient.GetFromJsonAsync<ZavodDetailDto>("/serie/verejny/zavody/zahajeni", Json);
        Assert.NotNull(zavod);
        Assert.Equal(2, zavod.Rozjizdky.Count);

        var prvni = zavod.Rozjizdky[0];
        Assert.Equal(2, prvni.Vysledky.Count);
        Assert.Equal(1, prvni.Vysledky[0].PoradiVCili);
        Assert.Equal(3600, prvni.Vysledky[0].CasSekundy);
        Assert.Equal(KodVysledku.Dnf, prvni.Vysledky[1].Kod);

        // Prázdná rozjížďka tam musí být — seskupení podle výsledků by ji ztratilo.
        Assert.Empty(zavod.Rozjizdky[1].Vysledky);
    }

    [Fact]
    public async Task Nepublikovany_rocnik_se_ven_nedostane()
    {
        await Nahraj(Rocnik("skryty", publikovano: false));
        var klient = fixture.CreateClient();

        // 404, ne 403: „existuje, ale neukážu" je taky informace.
        Assert.Equal(HttpStatusCode.NotFound, (await klient.GetAsync("/serie/skryty")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await klient.GetAsync("/serie/skryty/zavody/zahajeni")).StatusCode);

        var seznam = await klient.GetFromJsonAsync<List<SerieShrnutiDto>>("/serie", Json);
        Assert.DoesNotContain(seznam!, s => s.Slug == "skryty");
    }

    [Fact]
    public async Task Nepublikovana_zastavka_se_neukaze_ani_v_publikovanem_rocniku()
    {
        await Nahraj(Rocnik("skryta-zastavka", publikovano: true, zavodPublikovan: false));
        var klient = fixture.CreateClient();

        var detail = await klient.GetFromJsonAsync<SerieDetailDto>("/serie/skryta-zastavka", Json);
        Assert.Empty(detail!.Zavody);

        Assert.Equal(
            HttpStatusCode.NotFound,
            (await klient.GetAsync("/serie/skryta-zastavka/zavody/zahajeni")).StatusCode);
    }
}

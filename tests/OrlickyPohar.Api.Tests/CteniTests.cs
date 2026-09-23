using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using OrlickyPohar.Api.Features.Bodovani;
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
[Collection(PostgresCollection.Name)]
public class CteniTests(PostgresFixture fixture)
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

    private static SerieVstup Rocnik(
        string slug, bool publikovano, bool zavodPublikovan = true,
        bool vysledkyVerejne = true) => new(
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
                Publikovano: zavodPublikovan,
                // Přesun není vlastní stav — zastávka je pořád tam, kde byla,
                // jen jindy. Termín, na který se lidé chystali, musí projít
                // až do kalendáře ročníku.
                PuvodniDatum: new DateOnly(2025, 4, 19)),
        ],
        Publikovano: publikovano,
        VysledkyZavoduVerejne: vysledkyVerejne);

    [Fact]
    public async Task Publikovany_rocnik_je_videt_i_s_vysledky()
    {
        await Nahraj(Rocnik("verejny", publikovano: true));
        var klient = fixture.CreateClient();

        var detail = await klient.GetFromJsonAsync<SerieDetailDto>("/serie/verejny", Json);
        Assert.NotNull(detail);
        Assert.Equal(2, detail.Kategorie.Count);
        var zastavka = Assert.Single(detail.Zavody);
        Assert.Equal(StavZavodu.Odjety, zastavka.Stav);
        Assert.Equal(new DateOnly(2025, 4, 19), zastavka.PuvodniDatum);
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

        // Kdo na zastávku přijel, se vydává zvlášť. U plánované zastávky je to
        // jediný obsah, který stránka má.
        Assert.Equal(2, zavod.Lode.Count);
        Assert.Contains(zavod.Lode, l => l.Lod.StartsWith("Anička") && l.Kormidelnik == "Jan Novák");
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

    [Fact]
    public async Task Rocnik_bez_verejnych_vysledku_vyda_zastavku_bez_cisel()
    {
        await Nahraj(Rocnik("bez-vysledku", publikovano: true, vysledkyVerejne: false));
        var klient = fixture.CreateClient();

        // Ročník i kalendář zůstávají venku — schovávají se výsledky regat,
        // ne ročník. Kdyby zmizel celý, byla by to publikace, ne tohle.
        var detail = await klient.GetFromJsonAsync<SerieDetailDto>("/serie/bez-vysledku", Json);
        Assert.NotNull(detail);
        Assert.Single(detail.Zavody);

        var zavod = await klient.GetFromJsonAsync<ZavodDetailDto>(
            "/serie/bez-vysledku/zavody/zahajeni", Json);
        Assert.NotNull(zavod);

        // Žádná rozjížďka, žádné pořadí — ani to celkové, které se počítá
        // z týchž čísel jen jinak seskupených.
        Assert.Empty(zavod.Rozjizdky);
        Assert.Empty(zavod.Poradi);
        Assert.Empty(zavod.PoradiCelkem ?? []);

        // Příznak musí jít ven, jinak odjetá regata vypadá jako ta, co se
        // nejela, a klient nemá jak rozdíl poznat.
        Assert.True(zavod.VysledkySkryte);

        // Termín, pořadatel a kdo přijel zůstávají: nejsou to výsledky.
        Assert.Equal(new DateOnly(2025, 4, 26), zavod.Datum);
        Assert.Equal(2, zavod.Lode.Count);
    }

    [Fact]
    public async Task Bez_verejnych_vysledku_zustava_poradi_serialu()
    {
        await Nahraj(Rocnik("poradi-zustava", publikovano: true, vysledkyVerejne: false));
        var klient = fixture.CreateClient();

        // Tohle je celý smysl příznaku: konečné pořadí platí a je venku,
        // jen se k němu nedá dojít přes jednotlivé rozjížďky. Kdyby se
        // pořadí počítalo ze skrytých zastávek jako z nepublikovaných,
        // vyšlo by prázdné a ročník by vypadal jako neodjetý.
        var odpoved = await klient.GetAsync("/serie/poradi-zustava/poradi");
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);

        var poradi = await odpoved.Content.ReadFromJsonAsync<PoradiSerieDto>(Json);
        Assert.NotNull(poradi);
        Assert.Contains(poradi.Kategorie, k => k.Lode.Count > 0);
    }

    [Fact]
    public async Task Vysledky_jsou_verejne_dokud_je_nekdo_nevypne()
    {
        // Výchozí hodnota je „ukazovat". Mlčení se zapíná vědomě: soubor,
        // který o příznaku neví, nesmí ročníku výsledky schovat.
        await Nahraj(Rocnik("vychozi", publikovano: true));
        var klient = fixture.CreateClient();

        var zavod = await klient.GetFromJsonAsync<ZavodDetailDto>(
            "/serie/vychozi/zavody/zahajeni", Json);
        Assert.NotNull(zavod);
        Assert.False(zavod.VysledkySkryte);
        Assert.NotEmpty(zavod.Rozjizdky);
    }
}

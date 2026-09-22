using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Zavody;
// Vstupní tvar výsledku má stejné jméno v importu i v počítání. Tady se
// plní importní soubor, tak platí ten importní.
using VysledekVstup = OrlickyPohar.Api.Features.Import.VysledekVstup;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Průběžné pořadí a body závodu proti reálnému PostgreSQL. Pravidla samotná
/// hlídají <see cref="BodovaniTests"/> a <see cref="SerieTests"/> bez databáze;
/// tady jde o to, co se do počítání vůbec dostane — nepublikované, neodjeté
/// a rozjížďky mimo pohár.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class PoradiTests(PostgresFixture fixture)
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private const string Slug = "poradi";

    private async Task Nahraj(SerieVstup vstup)
    {
        var klient = fixture.CreateClient();
        klient.DefaultRequestHeaders.Add("X-Import-Token", PostgresFixture.Token);
        var odpoved = await klient.PostAsJsonAsync("/import/serie", vstup, Json);
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
    }

    private static VysledekVstup Dojel(string lod, int poradi) => new(lod, PoradiVCili: poradi);

    private static UcastVstup[] Ucasti(params string[] lode) =>
        [.. lode.Select(l => new UcastVstup(l, null, null))];

    /// <summary>
    /// Ročník na tři lodě v RACE a jednu v Pod7m. Zastávky jsou schválně
    /// čtyři, ale do poháru smějí jen dvě: jedna je teprve plánovaná
    /// a jedna nepublikovaná.
    /// </summary>
    private static SerieVstup Rocnik(string slug, bool publikovano = true) => new(
        Slug: slug,
        Nazev: "Pohár na pořadí",
        Rok: 2026,
        Kategorie: [new("Race", 1), new("Pod7m", 2)],
        Osoby: [new("novak", "Jan", "Novák")],
        Lode:
        [
            new("a", $"Alfa {slug}", null, null, "novak"),
            new("b", $"Beta {slug}", null, null, "novak"),
            new("c", $"Cé {slug}", null, null, "novak"),
            new("d", $"Dé {slug}", null, null, "novak"),
        ],
        Prihlasky: [new("a", "Race"), new("b", "Race"), new("c", "Race"), new("d", "Pod7m")],
        Zavody:
        [
            new(
                Slug: "prvni",
                Nazev: "První",
                Datum: new DateOnly(2026, 4, 25),
                Poradi: 1,
                Ucasti: Ucasti("a", "b", "c", "d"),
                Rozjizdky:
                [
                    new(1, null, StavRozjizdky.Dokoncena,
                        [Dojel("a", 1), Dojel("b", 2), new("c", Kod: KodVysledku.Dnf), Dojel("d", 3)]),
                    new(2, null, StavRozjizdky.Dokoncena,
                        [Dojel("a", 1), Dojel("b", 2), Dojel("c", 3), Dojel("d", 4)]),
                    // Zábavná rozjížďka mimo pohár: do závodu se počítá,
                    // do seriálu ne — a musí to být na výsledku vidět.
                    new(3, null, StavRozjizdky.Dokoncena,
                        [Dojel("c", 1), Dojel("a", 2), Dojel("b", 3)], DoSerie: false),
                ]),
            new(
                Slug: "druhy",
                Nazev: "Druhý",
                Datum: new DateOnly(2026, 5, 30),
                Poradi: 2,
                Ucasti: Ucasti("a", "b", "d"),
                Rozjizdky:
                [
                    new(1, null, StavRozjizdky.Dokoncena, [Dojel("a", 1), Dojel("b", 2), Dojel("d", 3)]),
                ]),
            new(
                Slug: "planovany",
                Nazev: "Teprve bude",
                Datum: new DateOnly(2026, 9, 12),
                Poradi: 3,
                Ucasti: Ucasti("a"),
                Rozjizdky: [new(1, null, StavRozjizdky.Planovana, [Dojel("a", 1)])],
                Stav: StavZavodu.Planovany),
            new(
                Slug: "skryty",
                Nazev: "Zatím neveřejný",
                Datum: new DateOnly(2026, 9, 19),
                Poradi: 4,
                Ucasti: Ucasti("a"),
                Rozjizdky: [new(1, null, StavRozjizdky.Dokoncena, [Dojel("a", 1)])],
                Publikovano: false),
        ],
        Publikovano: publikovano);

    private async Task<PoradiSerieDto> NactiPoradi(string slug)
    {
        var poradi = await fixture.CreateClient().GetFromJsonAsync<PoradiSerieDto>($"/serie/{slug}/poradi", Json);
        Assert.NotNull(poradi);
        return poradi;
    }

    [Fact]
    public async Task Prubezne_poradi_vydava_soucet_i_soucet_po_skrtu()
    {
        await Nahraj(Rocnik(Slug));
        var poradi = await NactiPoradi(Slug);

        var race = poradi.Kategorie.Single(k => k.Kategorie == "Race").Lode;
        var alfa = race.Single(l => l.Lod.StartsWith("Alfa"));
        var beta = race.Single(l => l.Lod.StartsWith("Beta"));

        // Vítěz zastávky má v seriálu nulu, druhý jedničku.
        Assert.Equal([0, 0], alfa.Zastavky);
        Assert.Equal([1, 1], beta.Zastavky);

        Assert.Equal(0, alfa.Body);
        Assert.Equal(2, beta.Body);

        // Škrtá se jeden nejhorší závod — a obě čísla se vydávají vedle sebe,
        // protože rozhodčí vede obojí a rozdíl mezi nimi rozhoduje.
        Assert.Equal(1, beta.BodyPoSkrtu);
        Assert.Equal(1, beta.Skrtnuto);
        Assert.Equal(1, alfa.PoradiPoSkrtu);
        Assert.Equal(2, beta.PoradiPoSkrtu);

        Assert.Equal("Jan Novák", alfa.Majitel);
    }

    [Fact]
    public async Task Poradi_se_pocita_jen_z_odjetych_a_publikovanych_zastavek()
    {
        await Nahraj(Rocnik("poradi-zastavky"));
        var poradi = await NactiPoradi("poradi-zastavky");

        // Plánovaná zastávka výsledky mít nemá a nepublikovaná se nesmí
        // ukázat ani nepřímo, jako body v tabulce.
        Assert.Equal(["prvni", "druhy"], poradi.Zastavky.Select(z => z.Slug));
        Assert.All(poradi.Kategorie.SelectMany(k => k.Lode), l => Assert.Equal(2, l.Zastavky.Count));
    }

    [Fact]
    public async Task Lod_ktera_nestartovala_dostane_pocet_lodi_kategorie()
    {
        await Nahraj(Rocnik("poradi-neucast"));
        var poradi = await NactiPoradi("poradi-neucast");

        var ce = poradi.Kategorie.Single(k => k.Kategorie == "Race").Lode
            .Single(l => l.Lod.StartsWith("Cé"));

        // Na druhou zastávku Cé nepřijela a v RACE tam byly dvě lodě.
        // Pravidla rozhodčího (22. 9. 2026): neúčast = počet lodí ve třídě.
        Assert.Equal([2, 2], ce.Zastavky);
        Assert.Equal([null, "DNC"], ce.Kody);
        Assert.Equal(4, ce.Body);

        // Při stejných bodech se škrtá neúčast, ne umístění.
        Assert.Equal([1], ce.Skrtnute);
        Assert.Equal(2, ce.BodyPoSkrtu);
        Assert.Equal(2, ce.Skrtnuto);
        Assert.Equal(3, ce.PoradiPoSkrtu);
    }

    [Fact]
    public async Task Kazda_kategorie_ma_vlastni_poradi()
    {
        await Nahraj(Rocnik("poradi-kategorie"));
        var poradi = await NactiPoradi("poradi-kategorie");

        Assert.Equal(["Race", "Pod7m"], poradi.Kategorie.Select(k => k.Kategorie));

        // Dé jezdí sama v Pod7m, takže je pokaždé první a má nulu — pořadí
        // se počítá uvnitř kategorie, ne v celém poli.
        var pod7m = Assert.Single(poradi.Kategorie.Single(k => k.Kategorie == "Pod7m").Lode);
        Assert.Equal(0, pod7m.Body);
        Assert.Equal(1, pod7m.PoradiPoSkrtu);
    }

    [Fact]
    public async Task Nepublikovany_rocnik_nema_ani_poradi()
    {
        await Nahraj(Rocnik("poradi-skryte", publikovano: false));

        // 404, ne 403 — stejně jako u ostatního čtení.
        var odpoved = await fixture.CreateClient().GetAsync("/serie/poradi-skryte/poradi");
        Assert.Equal(HttpStatusCode.NotFound, odpoved.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await fixture.CreateClient().GetAsync("/serie/neexistuje/poradi")).StatusCode);
    }

    [Fact]
    public async Task Body_zavodu_pocita_server_a_pocita_i_rozjizdku_mimo_pohar()
    {
        await Nahraj(Rocnik("poradi-zavod"));

        var zavod = await fixture.CreateClient()
            .GetFromJsonAsync<ZavodDetailDto>("/serie/poradi-zavod/zavody/prvni", Json);
        Assert.NotNull(zavod);

        var race = zavod.Poradi.Where(v => v.Kategorie == "Race").ToList();
        var alfa = race.Single(v => v.Lod.StartsWith("Alfa"));
        var ce = race.Single(v => v.Lod.StartsWith("Cé"));

        // Do závodu se počítá všechno, co se odjelo: Alfa 1 + 1 + 2.
        Assert.Equal(4, alfa.Body);
        Assert.Equal(1, alfa.Poradi);

        // Cé nedokončila první rozjížďku: v RACE jsou přihlášené tři lodě,
        // takže má podle ZPJ A5.2 čtyři body, ne prázdno.
        Assert.Equal(4, ce.Rozjizdky.Single(r => r.Cislo == 1).Body);

        // Třetí rozjížďka mimo pohár se do závodu počítá: 4 + 3 + 1.
        Assert.Equal(8, ce.Body);
        Assert.Equal(3, ce.Poradi);
        Assert.Equal(2, race.Single(v => v.Lod.StartsWith("Beta")).Poradi);

        var poradi = await NactiPoradi("poradi-zavod");
        var vSerii = poradi.Kategorie.Single(k => k.Kategorie == "Race").Lode;
        Assert.Equal(2, vSerii.Single(l => l.Lod.StartsWith("Beta")).PoradiPoSkrtu);
        Assert.Equal(3, vSerii.Single(l => l.Lod.StartsWith("Cé")).PoradiPoSkrtu);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Workflow výsledků proti reálnému PostgreSQL.
/// <para>
/// Pravidla přechodů jsou čisté funkce a zkoušejí se v
/// <see cref="WorkflowTests"/>. Tady jde o to, co z workflow <b>vidí
/// veřejnost</b>: nepublikovaná rozjížďka nesmí pustit čísla ven ani do
/// poháru a eliminovaná nesmí platit nikde.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class VysledkySpravaTests(PostgresFixture fixture)
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

    /// <summary>
    /// Ročník se dvěma rozjížďkami; ta druhá se dá nechat neveřejnou nebo
    /// eliminovanou. V obou jede Anička první a Bóra druhá, takže se pozná,
    /// jestli se druhá rozjížďka počítala.
    /// </summary>
    private static SerieVstup Rocnik(
        string slug,
        bool druhaPublikovana = true,
        StavVysledku druhaStav = StavVysledku.Potvrzeno) => new(
        Slug: slug,
        Nazev: $"Pohár {slug}",
        Rok: 2026,
        Kategorie: [new("Race", 1)],
        Osoby: [new("novak", "Jan", "Novák"), new("svoboda", "Petr", "Svoboda")],
        Lode:
        [
            new("anicka", $"Anička {slug}", "CZE 1", "Fireball", "novak"),
            new("bora", $"Bóra {slug}", "CZE 2", "Vaurien", "svoboda"),
        ],
        Prihlasky: [new("anicka", "Race"), new("bora", "Race")],
        Zavody:
        [
            new(
                Slug: "zahajeni",
                Nazev: "Zahájení sezóny",
                Datum: new DateOnly(2026, 4, 25),
                Poradi: 1,
                Ucasti: [new("anicka", "novak", null), new("bora", "svoboda", null)],
                Rozjizdky:
                [
                    new(1, null, StavRozjizdky.Dokoncena,
                        [new("anicka", PoradiVCili: 1), new("bora", PoradiVCili: 2)]),
                    new(2, null, StavRozjizdky.Dokoncena,
                        [new("anicka", PoradiVCili: 1), new("bora", PoradiVCili: 2)],
                        DoSerie: true,
                        StavVysledku: druhaStav,
                        Publikovano: druhaPublikovana),
                ]),
        ]);

    private Task<ZavodDetailDto> ZavodAsync(string slug) =>
        Cti<ZavodDetailDto>($"/serie/{slug}/zavody/zahajeni");

    private async Task<T> Cti<T>(string adresa)
    {
        var odpoved = await fixture.CreateClient().GetAsync(adresa);
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);

        return (await odpoved.Content.ReadFromJsonAsync<T>(Json))!;
    }

    [Fact]
    public async Task Nepublikovana_rozjizdka_je_videt_ale_bez_cisel()
    {
        var slug = "wf-neverejna";
        await Nahraj(Rocnik(slug, druhaPublikovana: false));

        var zavod = await ZavodAsync(slug);

        // Rozjížďka na stránce zůstává — jelo se a to je pravda. Čísla u ní
        // nejsou, dokud je správce nepustí ven.
        Assert.Equal([1, 2], zavod.Rozjizdky.Select(r => r.Cislo));
        Assert.Equal(2, zavod.Rozjizdky.Single(r => r.Cislo == 1).Vysledky.Count);
        Assert.Empty(zavod.Rozjizdky.Single(r => r.Cislo == 2).Vysledky);

        // A do výsledku závodu se nepočítá: vítěz má jeden bod z jedné
        // rozjížďky, ne dva ze dvou.
        Assert.Equal(1, zavod.Poradi.Single(v => v.Poradi == 1).Body);
    }

    [Fact]
    public async Task Eliminovana_rozjizdka_zmizi_uplne()
    {
        var slug = "wf-eliminovana";
        await Nahraj(Rocnik(slug, druhaStav: StavVysledku.Eliminovano));

        var zavod = await ZavodAsync(slug);

        // Neplatná rozjížďka není prázdná rozjížďka: nepočítá se a na
        // stránce po ní nezůstane ani řádek.
        Assert.Equal([1], zavod.Rozjizdky.Select(r => r.Cislo));
        Assert.Equal(1, zavod.Poradi.Single(v => v.Poradi == 1).Body);
    }

    [Fact]
    public async Task Do_poharu_jde_jen_to_co_je_venku()
    {
        var slug = "wf-pohar";
        await Nahraj(Rocnik(slug, druhaPublikovana: false));

        var poradi = await Cti<PoradiSerieDto>($"/serie/{slug}/poradi");
        var vitez = poradi.Kategorie.Single().Lode.Single(l => l.Poradi == 1);

        // Vítěz zastávky má v seriálu nulu, ať byla rozjížďka jedna, nebo
        // deset — kontroluje se tu, že se sloupec vůbec spočítal z jedné.
        Assert.Equal(0, vitez.Body);
        Assert.Single(poradi.Zastavky);
    }

    [Fact]
    public async Task Vraceni_k_revizi_si_pamatuje_duvod()
    {
        var slug = "wf-revize";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sprava = scope.ServiceProvider.GetRequiredService<VysledkySprava>();

        var zavodId = await db.Zavody.Where(z => z.Serie!.Slug == slug).Select(z => z.Id).FirstAsync();
        var rozjizdka = (await sprava.NajdiAsync(zavodId, 1, default))!;

        Assert.Null(await sprava.PrepniStavAsync(
            rozjizdka, StavVysledku.KRevizi, "U Aničky sedí čas, ne pořadí.", false, default));

        // Důvod zůstává i po návratu do návrhu: kdo zápis opravuje,
        // potřebuje ho vidět právě tehdy.
        Assert.Null(await sprava.PrepniStavAsync(
            rozjizdka, StavVysledku.Navrzeno, null, false, default));

        var po = (await sprava.NajdiAsync(zavodId, 1, default))!;
        Assert.Equal(StavVysledku.Navrzeno, po.StavVysledku);
        Assert.Equal("U Aničky sedí čas, ne pořadí.", po.DuvodRevize);

        // Publikace se posunem stavu nemění — je to vlastní příznak.
        Assert.True(po.Publikovano);
    }

    [Fact]
    public async Task Import_prinasi_vysledky_jako_potvrzene_a_verejne()
    {
        var slug = "wf-import";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var rozjizdky = await db.Rozjizdky
            .Where(r => r.Zavod!.Serie!.Slug == slug)
            .ToListAsync();

        // Import je zápis ze sešitu rozhodčího, ne návrh — čísla prošla jeho
        // rukama dřív, než soubor vznikl. Kdyby přicházela jako nezveřejněná,
        // nahrání ročníku by web vyprázdnilo.
        Assert.All(rozjizdky, r => Assert.Equal(StavVysledku.Potvrzeno, r.StavVysledku));
        Assert.All(rozjizdky, r => Assert.True(r.Publikovano));
    }
}

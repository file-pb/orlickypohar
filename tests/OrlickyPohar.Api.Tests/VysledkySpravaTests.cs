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

    // --- Zápis výsledků -----------------------------------------------------

    /// <summary>Rozjížďka ročníku ve stavu, do kterého se dá zapisovat.</summary>
    private static async Task<(AppDbContext Db, ZapisSprava Zapis, Rozjizdka Rozjizdka, int[] Prihlasky)>
        OtevrenaAsync(AsyncServiceScope scope, string slug)
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var zapis = scope.ServiceProvider.GetRequiredService<ZapisSprava>();

        var rozjizdka = await db.Rozjizdky.FirstAsync(r => r.Zavod!.Serie!.Slug == slug && r.Cislo == 2);
        rozjizdka.StavVysledku = StavVysledku.Navrzeno;
        await db.SaveChangesAsync();

        // Anička, pak Bóra — v pořadí, v jakém je ročník vypisuje.
        var prihlasky = await db.Prihlasky
            .Where(p => p.Serie!.Slug == slug)
            .OrderBy(p => p.Lod!.Nazev)
            .Select(p => p.Id)
            .ToArrayAsync();

        return (db, zapis, rozjizdka, prihlasky);
    }

    [Fact]
    public async Task Zapis_prepise_poradi_a_smaze_co_v_sade_neni()
    {
        var slug = "zapis-sada";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        // Bóra vyhrála, Anička v téhle rozjížďce výsledek nemá.
        Assert.Null(await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0]), new(prihlasky[1], PoradiVCili: 1)], default));

        var vysledky = await db.Vysledky.AsNoTracking()
            .Where(v => v.RozjizdkaId == rozjizdka.Id)
            .Select(v => new { v.Ucast!.PrihlaskaId, v.PoradiVCili })
            .ToListAsync();

        var bora = Assert.Single(vysledky);
        Assert.Equal(prihlasky[1], bora.PrihlaskaId);
        Assert.Equal(1, bora.PoradiVCili);

        // Účast Aničce zůstává: v první rozjížďce výsledek má.
        Assert.Equal(2, await db.Ucasti.CountAsync(u => u.Zavod!.Serie!.Slug == slug));
    }

    [Fact]
    public async Task Zapis_nesahne_na_cas_z_importu()
    {
        var slug = "zapis-cas";
        var rocnik = Rocnik(slug);
        var zavod = rocnik.Zavody[0];
        await Nahraj(rocnik with
        {
            Zavody =
            [
                zavod with
                {
                    Rozjizdky =
                    [
                        zavod.Rozjizdky[0],
                        zavod.Rozjizdky[1] with
                        {
                            Vysledky = [new("anicka", PoradiVCili: 1, CasSekundy: 3600), new("bora", PoradiVCili: 2)],
                        },
                    ],
                },
            ],
        });

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        Assert.Null(await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 2), new(prihlasky[1], PoradiVCili: 1)], default));

        // Formulář čas nemá — prázdná hodnota z obrazovky ho nesmí smazat.
        var anicka = await db.Vysledky.AsNoTracking()
            .SingleAsync(v => v.RozjizdkaId == rozjizdka.Id && v.Ucast!.PrihlaskaId == prihlasky[0]);

        Assert.Equal(2, anicka.PoradiVCili);
        Assert.Equal(TimeSpan.FromSeconds(3600), anicka.NamerenyCas);
    }

    [Fact]
    public async Task Vysledek_lodi_bez_ucasti_ji_ucast_zalozi()
    {
        var slug = "zapis-ucast";
        var rocnik = Rocnik(slug);
        var zavod = rocnik.Zavody[0];

        // Bóra na zastávku podle importu nepřijela.
        await Nahraj(rocnik with
        {
            Zavody =
            [
                zavod with
                {
                    Ucasti = [zavod.Ucasti[0]],
                    Rozjizdky = [.. zavod.Rozjizdky.Select(r => r with { Vysledky = [r.Vysledky[0]] })],
                },
            ],
        });

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        var nacteny = await zapis.NactiAsync(rozjizdka, poradatel: true, default);

        // Nabízí se celý ročník, ne jen lodě s účastí — jinak by na nové
        // zastávce nebylo co zapsat.
        Assert.Equal(2, nacteny.Lode.Count);

        Assert.Null(await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1), new(prihlasky[1], Kod: KodVysledku.Dnf)], default));

        Assert.Equal(2, await db.Ucasti.CountAsync(u => u.Zavod!.Serie!.Slug == slug));
    }

    [Fact]
    public async Task Cilova_obrazovka_ulozi_dojezd_i_s_casem_od_startu()
    {
        var slug = "zapis-cil";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        var start = new DateTimeOffset(2026, 6, 20, 11, 0, 0, TimeSpan.FromHours(2));
        Assert.Null(await zapis.StartAsync(rozjizdka, start, default));

        Assert.Null(await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1, DojezdV: start.AddMinutes(42))], default));

        var v = await db.Vysledky.SingleAsync(x => x.RozjizdkaId == rozjizdka.Id && x.PoradiVCili == 1);
        Assert.Equal(TimeSpan.FromMinutes(42), v.NamerenyCas);

        // Posunutý start přepočítá i dojetou loď.
        Assert.Null(await zapis.StartAsync(rozjizdka, start.AddMinutes(2), default));
        await db.Entry(v).ReloadAsync();
        Assert.Equal(TimeSpan.FromMinutes(40), v.NamerenyCas);

        var nacteny = await zapis.NactiAsync(rozjizdka, poradatel: true, default);
        Assert.Equal(start.AddMinutes(2), nacteny.StartV);
    }

    [Fact]
    public async Task Podepsany_zapis_se_neprepise()
    {
        var slug = "zapis-zamek";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var zapis = scope.ServiceProvider.GetRequiredService<ZapisSprava>();

        // Import přináší potvrzené výsledky — ty se přepsat nesmějí.
        var rozjizdka = await db.Rozjizdky.FirstAsync(r => r.Zavod!.Serie!.Slug == slug && r.Cislo == 1);
        var prihlaska = await db.Prihlasky.Where(p => p.Serie!.Slug == slug).Select(p => p.Id).FirstAsync();

        Assert.NotNull(await zapis.UlozAsync(rozjizdka, [new(prihlaska, PoradiVCili: 5)], default));

        var nacteny = await zapis.NactiAsync(rozjizdka, poradatel: true, default);
        Assert.False(nacteny.SmiZapisovat);
        Assert.NotNull(nacteny.ProcNelze);
    }

    [Fact]
    public async Task Cizi_prihlaska_se_nezapise()
    {
        await Nahraj(Rocnik("zapis-cizi-a"));
        await Nahraj(Rocnik("zapis-cizi-b"));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, _) = await OtevrenaAsync(scope, "zapis-cizi-a");

        var cizi = await db.Prihlasky.Where(p => p.Serie!.Slug == "zapis-cizi-b").Select(p => p.Id).FirstAsync();

        Assert.NotNull(await zapis.UlozAsync(rozjizdka, [new(cizi, PoradiVCili: 1)], default));
    }

    [Fact]
    public async Task Nova_rozjizdka_je_navrh_a_neni_venku()
    {
        var slug = "zapis-nova";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var zapis = scope.ServiceProvider.GetRequiredService<ZapisSprava>();

        var zavodId = await db.Zavody.Where(z => z.Serie!.Slug == slug).Select(z => z.Id).FirstAsync();
        var (rozjizdka, chyba) = await zapis.PridejRozjizdkuAsync(zavodId, default);

        Assert.Null(chyba);
        Assert.Equal(3, rozjizdka!.Cislo);
        Assert.Equal(StavVysledku.Navrzeno, rozjizdka.StavVysledku);
        Assert.False(rozjizdka.Publikovano);
    }

    [Fact]
    public async Task Poznavaci_znak_jen_lodi_na_regate()
    {
        var slug = "zapis-znak";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        // Bóra se odhlásila.
        var bora = await db.Ucasti.SingleAsync(u => u.PrihlaskaId == prihlasky[1]);
        bora.Stav = StavUcasti.Zrusena;
        await db.SaveChangesAsync();

        Assert.Null(await zapis.ZnakAsync(rozjizdka.ZavodId, prihlasky[0], " modrý spinakr ", default));

        // Odhlášené lodi se znak nedává — kdo ji na vodě uvidí, přihlásí ji.
        Assert.NotNull(await zapis.ZnakAsync(rozjizdka.ZavodId, prihlasky[1], "bez čísla", default));

        var nacteny = await zapis.NactiAsync(rozjizdka, poradatel: true, default);
        var anicka = nacteny.Lode.Single(l => l.PrihlaskaId == prihlasky[0]);
        var odhlasena = nacteny.Lode.Single(l => l.PrihlaskaId == prihlasky[1]);

        Assert.True(anicka.NaRegate);
        Assert.Equal("modrý spinakr", anicka.PoznavaciZnak);
        Assert.False(odhlasena.NaRegate);
        Assert.Null(odhlasena.PoznavaciZnak);

        // Prázdný znak smaže.
        Assert.Null(await zapis.ZnakAsync(rozjizdka.ZavodId, prihlasky[0], "", default));
        nacteny = await zapis.NactiAsync(rozjizdka, poradatel: true, default);
        Assert.Null(nacteny.Lode.Single(l => l.PrihlaskaId == prihlasky[0]).PoznavaciZnak);
    }
}

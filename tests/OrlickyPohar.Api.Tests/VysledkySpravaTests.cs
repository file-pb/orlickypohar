using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Boje;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Identita;
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
        StavVysledku druhaStav = StavVysledku.Potvrzeno,
        bool procesniDej = false) => new(
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
                ProcesniDej: procesniDej,
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

    /// <summary>
    /// <b>Procesní děj pouští ven i nepodepsaná čísla</b> (Filip,
    /// 9. 10. 2026). Hospoda chce dojezdy hned, zápis schválně čeká na
    /// rozhodčího — spor se neřeší zamlčením, ale tím, že číslo nese svůj
    /// stav. Je to přepínač u regaty: bez něj platí ten konzervativní
    /// výchozí stav a tenhle test by viděl prázdno
    /// (<see cref="Nepublikovana_rozjizdka_je_videt_ale_bez_cisel"/>).
    /// </summary>
    [Fact]
    public async Task S_procesnim_dejem_jsou_venku_i_nepodepsana_cisla()
    {
        var slug = "wf-dej";
        await Nahraj(Rocnik(slug, druhaPublikovana: false,
            druhaStav: StavVysledku.Navrzeno, procesniDej: true));

        var zavod = await ZavodAsync(slug);

        Assert.True(zavod.ProcesniDej);
        var druha = zavod.Rozjizdky.Single(r => r.Cislo == 2);

        // Čísla jsou venku a nesou svůj stav, takže divák pozná, že je
        // ještě nikdo nepodepsal.
        Assert.Equal(2, druha.Vysledky.Count);
        Assert.Equal(StavVysledku.Navrzeno, druha.StavVysledku);

        // A počítají se: vítěz má dva body ze dvou rozjížděk, ne jeden.
        Assert.Equal(2, zavod.Poradi.Single(v => v.Poradi == 1).Body);
    }

    /// <summary>
    /// Zrušená rozjížďka ven nejde ani s procesním dějem. „Neplatí nikde"
    /// není stupeň rozpracovanosti, u kterého by mělo smysl ukazovat čísla
    /// a čekat, jak to dopadne.
    /// </summary>
    [Fact]
    public async Task Procesni_dej_nepousti_ven_zrusenou_rozjizdku()
    {
        var slug = "wf-dej-zrusena";
        await Nahraj(Rocnik(slug, druhaPublikovana: false,
            druhaStav: StavVysledku.Eliminovano, procesniDej: true));

        var zavod = await ZavodAsync(slug);
        var druha = zavod.Rozjizdky.Single(r => r.Cislo == 2);

        Assert.Empty(druha.Vysledky);
        Assert.Equal(StavRozjizdky.Zrusena, druha.Stav);
        Assert.Equal(1, zavod.Poradi.Single(v => v.Poradi == 1).Body);
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

    /// <summary>
    /// <b>Zrušená rozjížďka v řadě zůstane, jen se nepočítá</b> (Filip,
    /// 17. 10. 2026). Do té doby z výpisu mizela úplně a tenhle test to
    /// tvrdil jako správné chování — jenže divák pak nevidí zrušenou
    /// rozjížďku, vidí díru v číslování a neví proč.
    /// </summary>
    [Fact]
    public async Task Zrusena_rozjizdka_v_rade_zustane_ale_nepocita_se()
    {
        var slug = "wf-eliminovana";
        await Nahraj(Rocnik(slug, druhaStav: StavVysledku.Eliminovano));

        var zavod = await ZavodAsync(slug);

        // Obě rozjížďky jsou v seznamu a na té druhé je poznat, že se
        // nejela. Body má vítěz pořád z jedné, ne ze dvou.
        Assert.Equal([1, 2], zavod.Rozjizdky.Select(r => r.Cislo));
        Assert.Equal(StavRozjizdky.Zrusena, zavod.Rozjizdky.Single(r => r.Cislo == 2).Stav);
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

    /// <summary>
    /// <b>Zrušená rozjížďka zůstane vidět, ale nepočítá se</b> (Filip,
    /// 17. 10. 2026: *„ať zůstane vidět jako zrušená"*). Dřív se z výpisu
    /// vyfiltrovala a divákovi prostě zmizelo číslo z řady — to je horší
    /// než říct, že se nejela. Nepočítat ji se musí až u bodů; kdyby se
    /// filtr jen odstranil, začala by se bodovat.
    /// </summary>
    [Fact]
    public async Task Zrusena_rozjizdka_zustane_videt_a_nepocita_se()
    {
        var slug = "wf-zrusena-videt";
        await Nahraj(Rocnik(slug));

        var pred = await ZavodAsync(slug);
        var bodyPred = pred.Poradi.ToDictionary(v => v.Lod, v => v.Body);
        var cisel = pred.Rozjizdky.Count;
        Assert.NotEmpty(bodyPred);

        await using (var scope = fixture.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var sprava = scope.ServiceProvider.GetRequiredService<VysledkySprava>();
            var zavodId = await db.Zavody.Where(z => z.Serie!.Slug == slug).Select(z => z.Id).FirstAsync();
            var rozjizdka = (await sprava.NajdiAsync(zavodId, 1, default))!;

            Assert.Null(await sprava.PrepniStavAsync(
                rozjizdka, StavVysledku.Eliminovano, null, spravce: true, default));
        }

        var po = await ZavodAsync(slug);

        // Vidět zůstává, a je na ní poznat, že se nejela.
        Assert.Equal(cisel, po.Rozjizdky.Count);
        Assert.Equal(StavRozjizdky.Zrusena, po.Rozjizdky.Single(r => r.Cislo == 1).Stav);

        // A nepočítá se: body se musely změnit, protože jedna rozjížďka
        // z bodování vypadla.
        Assert.NotEqual(bodyPred, po.Poradi.ToDictionary(v => v.Lod, v => v.Body));
    }

    /// <summary>
    /// <b>Zrušená rozjížďka se pozná i na vodě, ne jen v zápisu.</b> Do
    /// 16. 10. 2026 se `Stav` při eliminaci neměnil, takže
    /// <see cref="StavRozjizdky.Zrusena"/> nenastal nikdy a semafor na
    /// tabuli svítil zeleně i u rozjížďky, kterou rozhodčí vyndal.
    /// </summary>
    [Fact]
    public async Task Zruseni_sebere_rozjizdku_i_z_vody_a_navrat_ji_vrati()
    {
        var slug = "wf-zruseni";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sprava = scope.ServiceProvider.GetRequiredService<VysledkySprava>();

        var zavodId = await db.Zavody.Where(z => z.Serie!.Slug == slug).Select(z => z.Id).FirstAsync();
        var rozjizdka = (await sprava.NajdiAsync(zavodId, 1, default))!;
        var puvodni = rozjizdka.Stav;

        Assert.Null(await sprava.PrepniStavAsync(
            rozjizdka, StavVysledku.Eliminovano, null, spravce: true, default));
        Assert.Equal(StavRozjizdky.Zrusena, rozjizdka.Stav);

        // Zpátky se z eliminace chodí jako návrh a rozjížďka se vrací tam,
        // kam patří podle zápisu — ne natvrdo na „plánovaná".
        Assert.Null(await sprava.PrepniStavAsync(
            rozjizdka, StavVysledku.Navrzeno, null, spravce: true, default));
        Assert.NotEqual(StavRozjizdky.Zrusena, rozjizdka.Stav);
        Assert.Equal(puvodni, rozjizdka.Stav);
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

        // Přijatá trať. <b>Bez ní se od 15. 10. 2026 nestartuje</b>, takže
        // „stav, do kterého se dá zapisovat" ji musí mít — jinak by testy
        // zápisu padaly na podmínku, se kterou nemají co do činění.
        db.Trate.Add(new Trat
        {
            ZavodId = rozjizdka.ZavodId,
            RozjizdkaId = rozjizdka.Id,
            Stav = StavTrati.Prijato,
            ZalozenaV = DateTimeOffset.UnixEpoch,
            PrijatoV = DateTimeOffset.UnixEpoch,
        });
        await db.SaveChangesAsync();

        // Anička, pak Bóra — v pořadí, v jakém je ročník vypisuje.
        var prihlasky = await db.Prihlasky
            .Where(p => p.Serie!.Slug == slug)
            .OrderBy(p => p.Lod!.Nazev)
            .Select(p => p.Id)
            .ToArrayAsync();

        return (db, zapis, rozjizdka, prihlasky);
    }

    /// <summary>
    /// <b>Rozjížďka dojede, až mají výsledek všichni — a oprava ji vrátí
    /// zpátky mezi probíhající.</b>
    ///
    /// <para>
    /// Objeveno 15. 10. 2026 při průchodu scénáři Izolepy: <c>Dokoncena</c>
    /// se nenastavovalo nikde a jediný přechod v celém API byl
    /// <c>Planovana → Probiha</c> při startu. Rozjížďka proto zůstala
    /// „probíhá" i po schválení a publikaci — tabule hlásila „jede se",
    /// alert „rozjížďka dojeta" nevyjel nikdy a veřejná trať, která bere
    /// rozjížďku na řadě, se po dojetí první už nikdy neposunula na další.
    /// </para>
    ///
    /// <para>
    /// Kód se počítá jako dojezd: loď s DNF rozjížďku nedrží otevřenou,
    /// protože se na ni nečeká.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Rozjizdka_dojede_az_maji_vysledek_vsichni()
    {
        var slug = "zapis-dojeto";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        // Ročník z fixture má rozjížďky rovnou dojeté, protože je takhle
        // nese importní soubor. Tenhle test začíná na vodě, takže si
        // výchozí stav nastaví sám — `StartAsync` přepíná jen z plánované,
        // aby oprava času startu u dojeté rozjížďky nevracela stav zpátky.
        rozjizdka.Stav = StavRozjizdky.Planovana;
        await db.SaveChangesAsync();

        Assert.Null(await zapis.StartAsync(rozjizdka, DateTimeOffset.UnixEpoch, default));
        Assert.Equal(StavRozjizdky.Probiha, rozjizdka.Stav);

        // Anička v cíli, Bóra pořád na vodě — čeká se na ni.
        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1), new(prihlasky[1])],
            default, revize: rozjizdka.Revize)).Chyba);
        Assert.Equal(StavRozjizdky.Probiha, rozjizdka.Stav);

        // Bóra nedokončila. Kód je taky vyřízení, takže je dojeto.
        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1), new(prihlasky[1], Kod: KodVysledku.Dnf)],
            default, revize: rozjizdka.Revize)).Chyba);
        Assert.Equal(StavRozjizdky.Dokoncena, rozjizdka.Stav);

        // Oprava: kód byl omyl, Bóra se pořád čeká.
        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1), new(prihlasky[1])],
            default, revize: rozjizdka.Revize)).Chyba);
        Assert.Equal(StavRozjizdky.Probiha, rozjizdka.Stav);

        // A sedí to i v databázi, ne jen na sledovaném objektu.
        Assert.Equal(
            StavRozjizdky.Probiha,
            await db.Rozjizdky.AsNoTracking()
                .Where(r => r.Id == rozjizdka.Id).Select(r => r.Stav).FirstAsync());
    }

    /// <summary>
    /// Odhlášená loď rozjížďku nedrží: na vodě není, takže se na ni nečeká.
    /// </summary>
    [Fact]
    public async Task Odhlasena_lod_rozjizdku_nedrzi_otevrenou()
    {
        var slug = "zapis-odhlasena";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        // Jako výš: fixture dává rozjížďky dojeté, tenhle test je chce rozjeté.
        rozjizdka.Stav = StavRozjizdky.Planovana;
        await db.SaveChangesAsync();
        Assert.Null(await zapis.StartAsync(rozjizdka, DateTimeOffset.UnixEpoch, default));

        var bora = await db.Ucasti.FirstAsync(
            u => u.ZavodId == rozjizdka.ZavodId && u.PrihlaskaId == prihlasky[1]);
        bora.Stav = StavUcasti.Zrusena;
        await db.SaveChangesAsync();

        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1), new(prihlasky[1])],
            default, revize: rozjizdka.Revize)).Chyba);

        Assert.Equal(StavRozjizdky.Dokoncena, rozjizdka.Stav);
    }

    [Fact]
    public async Task Zapis_prepise_poradi_a_smaze_co_v_sade_neni()
    {
        var slug = "zapis-sada";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        // Bóra vyhrála, Anička v téhle rozjížďce výsledek nemá.
        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0]), new(prihlasky[1], PoradiVCili: 1)], default, revize: rozjizdka.Revize)).Chyba);

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

        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 2), new(prihlasky[1], PoradiVCili: 1)], default, revize: rozjizdka.Revize)).Chyba);

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

        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1), new(prihlasky[1], Kod: KodVysledku.Dnf)], default, revize: rozjizdka.Revize)).Chyba);

        Assert.Equal(2, await db.Ucasti.CountAsync(u => u.Zavod!.Serie!.Slug == slug));
    }

    /// <summary>
    /// <b>Bez přijaté trati se nestartuje</b> (Filip, 15. 10. 2026:
    /// *„to, co nemá trať, nejde odstartovat"*, a na doptání: musí být
    /// přijatá rozhodčím). Přijetí je to, čím rozhodčí říká „jede se podle
    /// tohohle".
    /// </summary>
    [Fact]
    public async Task Rozjizdka_bez_prijate_trati_nejde_odstartovat()
    {
        var slug = "zapis-start-bez-trati";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, _) = await OtevrenaAsync(scope, slug);

        // <b>Stav se nastavuje, nepředpokládá.</b> Rozjížďka ze seedu je
        // dokončená, takže by zábrana vůbec nenastala a test by měřil
        // něco jiného, než si myslí.
        rozjizdka.Stav = StavRozjizdky.Planovana;

        // Trať z pomocníka odejde do přestavby: přiřazená je, přijatá ne.
        var trat = await db.Trate.FirstAsync(t => t.RozjizdkaId == rozjizdka.Id);
        trat.Stav = StavTrati.Prestavba;
        trat.PrijatoV = null;
        await db.SaveChangesAsync();

        var kdy = new DateTimeOffset(2026, 6, 20, 11, 0, 0, TimeSpan.FromHours(2));
        Assert.NotNull(await zapis.StartAsync(rozjizdka, kdy, default));
        Assert.Equal(StavRozjizdky.Planovana, rozjizdka.Stav);

        // Jakmile ji rozhodčí přijme, start projde.
        trat.Stav = StavTrati.Prijato;
        // <b>UTC</b>: Npgsql do `timestamp with time zone` jiný posun
        // nepustí. `StartAsync` si svůj čas převádí sám, tady to musí
        // udělat test.
        trat.PrijatoV = kdy.ToUniversalTime();
        await db.SaveChangesAsync();

        Assert.Null(await zapis.StartAsync(rozjizdka, kdy, default));
        Assert.Equal(StavRozjizdky.Probiha, rozjizdka.Stav);
    }

    /// <summary>
    /// <b>Běžící rozjížďce jde start přepsat i bez přijaté trati.</b>
    /// Tlačítko se na vodě snadno zmáčkne o znamení dřív a trať mezitím
    /// mohla odejít do přestavby — opravit čas musí jít pořád.
    /// </summary>
    [Fact]
    public async Task Bezici_rozjizdce_jde_start_prepsat_i_kdyz_trat_neni_prijata()
    {
        var slug = "zapis-start-prepis";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, _) = await OtevrenaAsync(scope, slug);

        // Plánovaná s přijatou tratí: první start projde a rozjížďka se
        // rozjede. Bez tohohle by byla dokončená a přepis by nic neříkal.
        rozjizdka.Stav = StavRozjizdky.Planovana;
        await db.SaveChangesAsync();

        var kdy = new DateTimeOffset(2026, 6, 20, 11, 0, 0, TimeSpan.FromHours(2));
        Assert.Null(await zapis.StartAsync(rozjizdka, kdy, default));
        Assert.Equal(StavRozjizdky.Probiha, rozjizdka.Stav);

        var trat = await db.Trate.FirstAsync(t => t.RozjizdkaId == rozjizdka.Id);
        trat.Stav = StavTrati.Prestavba;
        await db.SaveChangesAsync();

        Assert.Null(await zapis.StartAsync(rozjizdka, kdy.AddMinutes(3), default));
        await db.Entry(rozjizdka).ReloadAsync();
        Assert.Equal(kdy.AddMinutes(3), rozjizdka.StartV);
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

        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1, DojezdV: start.AddMinutes(42))], default, revize: rozjizdka.Revize)).Chyba);

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

        Assert.NotNull((await zapis.UlozAsync(
            rozjizdka, [new(prihlaska, PoradiVCili: 5)], default, revize: rozjizdka.Revize)).Chyba);

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

        Assert.NotNull((await zapis.UlozAsync(
            rozjizdka, [new(cizi, PoradiVCili: 1)], default, revize: rozjizdka.Revize)).Chyba);
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

    [Fact]
    public async Task Celkove_poradi_jde_napric_kategoriemi()
    {
        var slug = "zavod-celkem";

        // Dvě kategorie, dvě rozjížďky. Cyril je v obou před Aničkou, ale
        // každý jede v jiné kategorii, takže po kategoriích jsou oba první.
        await Nahraj(new SerieVstup(
            Slug: slug,
            Nazev: "Pohár celkem",
            Rok: 2026,
            Kategorie: [new("Race", 1), new("Nad7m", 2)],
            Osoby: [new("novak", "Jan", "Novák")],
            Lode:
            [
                new("anicka", "Anička celkem", "CZE 1", "Fireball", "novak"),
                new("cyril", "Cyril celkem", "CZE 3", "Micro", "novak"),
            ],
            Prihlasky: [new("anicka", "Race"), new("cyril", "Nad7m")],
            Zavody:
            [
                new(
                    Slug: "zahajeni",
                    Nazev: "Zahájení sezóny",
                    Datum: new DateOnly(2026, 4, 25),
                    Poradi: 1,
                    Ucasti: [new("anicka", "novak", null), new("cyril", "novak", null)],
                    Rozjizdky:
                    [
                        new(1, null, StavRozjizdky.Dokoncena,
                            [new("cyril", PoradiVCili: 1), new("anicka", PoradiVCili: 2)]),
                        new(2, null, StavRozjizdky.Dokoncena,
                            [new("cyril", PoradiVCili: 1), new("anicka", PoradiVCili: 2)]),
                    ]),
            ]));

        var zavod = await ZavodAsync(slug);

        // Po kategoriích je každý první ve své.
        Assert.All(zavod.Poradi, v => Assert.Equal(1, v.Poradi));

        // Celé pole dohromady rozhodne, kdo byl dřív v cíli.
        Assert.NotNull(zavod.PoradiCelkem);
        Assert.Equal(["Cyril celkem", "Anička celkem"], zavod.PoradiCelkem!.Select(v => v.Lod));
        Assert.Equal([1, 2], zavod.PoradiCelkem.Select(v => v.Poradi));

        // Kategorie u lodi zůstává, i když se pořadí počítá bez ní.
        Assert.Equal("Nad7m", zavod.PoradiCelkem[0].Kategorie);
    }

    [Fact]
    public async Task Dva_zapisovatele_maji_kazdy_svuj_snimek()
    {
        var slug = "zapis-dva";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        var anna = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Anna Zapisovatelka" };
        var bob = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Bob Zapisovatel" };
        db.Uzivatele.AddRange(anna, bob);
        await db.SaveChangesAsync();

        // Anna viděla Aničku první, Bob obráceně. Druhé uložení to první
        // přepíše — ale snímek Anny musí zůstat.
        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1), new(prihlasky[1], PoradiVCili: 2)], default, anna.Id, rozjizdka.Revize)).Chyba);
        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 2), new(prihlasky[1], PoradiVCili: 1)], default, bob.Id, rozjizdka.Revize)).Chyba);

        var navrhy = await zapis.NavrhyAsync(rozjizdka, anna.Id, default);
        Assert.Equal(2, navrhy.Navrhy.Count);

        var mujNavrh = navrhy.Navrhy.Single(n => n.Muj);
        Assert.Equal("Anna Zapisovatelka", mujNavrh.Kdo);
        Assert.Equal(prihlasky[0], mujNavrh.Radky[0].PrihlaskaId);

        // Ve výsledcích je zatím Bobova verze, protože ukládal poslední.
        var nacteny = await zapis.NactiAsync(rozjizdka, poradatel: true, default);
        Assert.Equal(2, nacteny.PocetNavrhu);
        Assert.Equal(prihlasky[1], nacteny.Lode.Single(l => l.PoradiVCili == 1).PrihlaskaId);

        // Zapisovatelé se shodnou na Annině verzi.
        var (nenalezen, chyba) = await zapis.PouzijNavrhAsync(rozjizdka, anna.Id, bob.Id, default);
        Assert.False(nenalezen);
        Assert.Null(chyba);

        nacteny = await zapis.NactiAsync(rozjizdka, poradatel: true, default);
        Assert.Equal(prihlasky[0], nacteny.Lode.Single(l => l.PoradiVCili == 1).PrihlaskaId);

        // Snímek Anny zůstal; Bobův se přepsal na to, co použil.
        navrhy = await zapis.NavrhyAsync(rozjizdka, anna.Id, default);
        Assert.Equal(2, navrhy.Navrhy.Count);
        Assert.All(navrhy.Navrhy, n => Assert.Equal(prihlasky[0], n.Radky[0].PrihlaskaId));
    }

    [Fact]
    public async Task Bez_zapisovatele_snimek_nevznika()
    {
        var slug = "zapis-bez-snimku";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        // Import ani úloha na pozadí nikoho přihlášeného nemají.
        Assert.Null((await zapis.UlozAsync(
            rozjizdka, [new(prihlasky[0], PoradiVCili: 1)], default, revize: rozjizdka.Revize)).Chyba);

        Assert.Empty(await db.ZapisyNavrhu.Where(n => n.RozjizdkaId == rozjizdka.Id).ToListAsync());
    }

    [Fact]
    public async Task Stara_sada_neprepise_novejsi_opravu()
    {
        // Přesně nález B: telefon bez signálu drží sadu s jednou lodí,
        // na webu se mezitím doplní druhá. Po připojení by stará sada
        // novější doplnění smazala, protože uložení maže, co v sadě není.
        var slug = "zapis-revize";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        var vychozi = rozjizdka.Revize;

        // Web doplní obě lodě.
        Assert.Null((await zapis.UlozAsync(
            rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1), new(prihlasky[1], PoradiVCili: 2)],
            default, revize: vychozi)).Chyba);

        // Telefon posílá sadu, ze které vycházel — jen první loď.
        var pozde = await zapis.UlozAsync(
            rozjizdka, [new(prihlasky[0], PoradiVCili: 1)], default, revize: vychozi);

        Assert.True(pozde.Konflikt);
        Assert.Equal(Zapis.RevizeNesedi, pozde.Chyba);

        // Druhá loď v databázi zůstala.
        Assert.Equal(2, await db.Vysledky.CountAsync(v => v.RozjizdkaId == rozjizdka.Id));
    }

    [Fact]
    public async Task Konflikt_rozlisi_cizi_ucet_od_druheho_telefonu()
    {
        // Zkouška ovládání C7: na vodě bývá jeden účet na dvou telefonech
        // a hláška „uložil někdo jiný" v tu chvíli tvrdila nepravdu.
        var slug = "zapis-dva-telefony";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        var dana = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Dana Zapisovatelka" };
        var bob = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Bob Zapisovatel" };
        db.Uzivatele.AddRange(dana, bob);
        await db.SaveChangesAsync();

        var vychozi = rozjizdka.Revize;

        // První telefon Dany uloží obě lodě.
        Assert.Null((await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1), new(prihlasky[1], PoradiVCili: 2)],
            default, dana.Id, vychozi)).Chyba);

        // Druhý telefon téhož účtu posílá sadu, ze které vycházel.
        var druhyTelefon = await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1)], default, dana.Id, vychozi);

        Assert.True(druhyTelefon.Konflikt);
        Assert.Equal(Zapis.RevizeNesediTentyzUcet, druhyTelefon.Chyba);

        // Cizí účet dostane původní hlášku — ta je pravdivá.
        var cizi = await zapis.UlozAsync(rozjizdka,
            [new(prihlasky[0], PoradiVCili: 1)], default, bob.Id, vychozi);

        Assert.True(cizi.Konflikt);
        Assert.Equal(Zapis.RevizeNesedi, cizi.Chyba);
    }

    [Fact]
    public async Task Zapis_bez_revize_se_neuklada()
    {
        // Krok 3: sada bez revize už neprojde. Uložení maže lodě, které
        // v sadě nejsou, takže sada odeslaná naslepo umí smazat opravu,
        // o které klient nevěděl.
        var slug = "zapis-bez-revize";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (db, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        // Rozjížďka z ročníku výsledky má — a právě proto na tom záleží:
        // sada bez revize by je přepsala a co v ní není, smazala.
        var pred = await db.Vysledky.AsNoTracking()
            .Where(v => v.RozjizdkaId == rozjizdka.Id)
            .Select(v => new { v.Ucast!.PrihlaskaId, v.PoradiVCili, v.Kod })
            .ToListAsync();

        var vysledek = await zapis.UlozAsync(
            rozjizdka, [new(prihlasky[0], PoradiVCili: 1)], default);

        Assert.Equal(Zapis.RevizeChybi, vysledek.Chyba);
        // Konflikt to není: klient neposlal nic, s čím by se dalo porovnávat.
        Assert.False(vysledek.Konflikt);

        var po = await db.Vysledky.AsNoTracking()
            .Where(v => v.RozjizdkaId == rozjizdka.Id)
            .Select(v => new { v.Ucast!.PrihlaskaId, v.PoradiVCili, v.Kod })
            .ToListAsync();

        Assert.Equal(pred, po);
        Assert.Equal(0, rozjizdka.Revize);
    }

    [Fact]
    public async Task Revize_roste_s_kazdym_ulozenim()
    {
        var slug = "zapis-revize-roste";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var (_, zapis, rozjizdka, prihlasky) = await OtevrenaAsync(scope, slug);

        var pred = rozjizdka.Revize;
        Assert.Null((await zapis.UlozAsync(
            rozjizdka, [new(prihlasky[0], PoradiVCili: 1)], default, revize: pred)).Chyba);
        Assert.Equal(pred + 1, rozjizdka.Revize);

        // A obrazovka ji vydává, aby ji klient měl co poslat zpátky.
        var nacteny = await zapis.NactiAsync(rozjizdka, poradatel: true, default);
        Assert.Equal(rozjizdka.Revize, nacteny.Revize);
    }

    /// <summary>
    /// <b>Rozcestník dostane čísla rozjížděk, ne jen počty</b> (Filip,
    /// 20. 10. 2026: *„tyhle tři tlačítka vypadá že dělají asi to samé"*).
    /// Bez čísel neumí dlaždice pustit do té rozjížďky, která čeká, a
    /// všechny vedly na tentýž seznam.
    /// </summary>
    [Fact]
    public async Task Zastavky_vydaji_cisla_rozjizdek_podle_toho_kdo_ceka()
    {
        var slug = "zastavky-cisla";
        // Druhá rozjížďka čeká na podpis; první je potvrzená a venku.
        await Nahraj(Rocnik(slug, druhaStav: StavVysledku.Overeno, druhaPublikovana: false));

        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sprava = scope.ServiceProvider.GetRequiredService<VysledkySprava>();

        var serieId = await db.Serie.Where(s => s.Slug == slug).Select(s => s.Id).SingleAsync();
        var zastavka = Assert.Single(await sprava.ZastavkyAsync(serieId, default));

        Assert.Equal([2], zastavka.KPodpisu);
        Assert.Empty(zastavka.KRevizi);
        Assert.Empty(zastavka.KPublikaci);

        // Vrácení prvni k revizi se musí objevit u pořadatele, ne u rozhodčího.
        var prvni = await db.Rozjizdky
            .Where(r => r.Zavod!.Serie!.Slug == slug && r.Cislo == 1)
            .SingleAsync();
        prvni.StavVysledku = StavVysledku.KRevizi;
        await db.SaveChangesAsync();

        var po = Assert.Single(await sprava.ZastavkyAsync(serieId, default));
        Assert.Equal([1], po.KRevizi);
        Assert.Equal([2], po.KPodpisu);
    }
}

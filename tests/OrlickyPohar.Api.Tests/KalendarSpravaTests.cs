using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Kalendář ročníku proti reálnému PostgreSQL.
/// <para>
/// Přes službu, ne přes HTTP — ze stejného důvodu jako u
/// <see cref="SpravaTests"/>: testovací hostitel nemá poskytovatele
/// identity. Pravidla přechodů a termínů jsou čisté funkce a zkoušejí se
/// v <see cref="KalendarTests"/>; tady jde o to, co na databázi skutečně
/// stojí — <b>unikátní adresa v ročníku</b> a <b>přečíslování podle data</b>.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class KalendarSpravaTests(PostgresFixture fixture)
{
    private async Task<T> VeSluzbeAsync<T>(Func<IServiceProvider, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        return await co(scope.ServiceProvider);
    }

    private Task<T> SpravaAsync<T>(Func<KalendarSprava, Task<T>> co) =>
        VeSluzbeAsync(sp => co(sp.GetRequiredService<KalendarSprava>()));

    /// <summary>Prázdný ročník. Slug musí být v každém testu jiný.</summary>
    private Task<int> RocnikAsync(string slug) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var serie = new Api.Features.Serial.Serie { Nazev = $"Pohár {slug}", Slug = slug, Rok = 2026 };

            db.Serie.Add(serie);
            await db.SaveChangesAsync();

            return serie.Id;
        });

    private static ZastavkaVstup Vstup(string nazev, int mesic, int den) =>
        new(nazev, new DateOnly(2026, mesic, den), Typ: "okruhový", Poradatel: "YC Písek");

    private Task<List<ZastavkaRadek>> VypisAsync(int serieId) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();

            return await db.Zavody
                .Where(z => z.SerieId == serieId)
                .OrderBy(z => z.Poradi)
                .Select(z => new ZastavkaRadek(
                    z.Slug, z.Nazev, z.Datum, z.DatumKonce, z.Typ, z.Poradatel, z.Poradi,
                    z.Stav, z.PuvodniDatum, z.Publikovano, false, false, Array.Empty<StavZavodu>(),
                    // Vyhodnocení se čte z databáze, ne z výchozí hodnoty
                    // záznamu — jinak by test zkoušel tuhle projekci.
                    z.Druh, null, false, z.Vyhodnoceni))
                .ToListAsync();
        });

    [Fact]
    public async Task Nova_zastavka_je_planovana_a_neverejna()
    {
        var serieId = await RocnikAsync("kalendar-nova");

        var (zastavka, chyba) = await SpravaAsync(s =>
            s.ZalozAsync(serieId, Vstup("Radavská regata", 5, 9), default));

        Assert.Null(chyba);
        Assert.NotNull(zastavka);

        // Kalendář začíná návrhem termínu. Potvrdit ho i pustit ven jsou
        // dvě další rozhodnutí a každé patří někomu jinému.
        Assert.Equal(StavZavodu.Planovany, zastavka.Stav);
        Assert.False(zastavka.Publikovano);
        Assert.Equal("radavska-regata", zastavka.Slug);
        Assert.Equal(1, zastavka.Poradi);
    }

    [Fact]
    public async Task Druha_zastavka_se_stejnym_nazvem_neprojde()
    {
        var serieId = await RocnikAsync("kalendar-duplicita");

        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Izolepa", 6, 20), default));
        var (druha, chyba) = await SpravaAsync(s =>
            s.ZalozAsync(serieId, Vstup("Izolepa", 8, 15), default));

        // Adresa je unikátní v rámci ročníku a stojí na ní i idempotence
        // importu. Bez téhle kontroly by to spadlo až na indexu v databázi.
        Assert.Null(druha);
        Assert.NotNull(chyba);
        Assert.Contains("izolepa", chyba);
    }

    [Fact]
    public async Task Dodatecne_zalozena_zastavka_se_zaradi_podle_data()
    {
        var serieId = await RocnikAsync("kalendar-poradi");

        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Jarní vítr", 4, 25), default));
        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Vánoční regata", 12, 12), default));
        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Radavská regata", 5, 9), default));

        var kalendar = await VypisAsync(serieId);

        // Veřejný výpis ročníku se řadí podle pořadí. Bez přečíslování by
        // zastávka doplněná dodatečně skončila až za Vánoční regatou.
        Assert.Equal(
            ["Jarní vítr", "Radavská regata", "Vánoční regata"],
            kalendar.Select(z => z.Nazev));
        Assert.Equal([1, 2, 3], kalendar.Select(z => z.Poradi));
    }

    [Fact]
    public async Task Presun_potvrzene_zastavky_prerovna_kalendar_a_zapamatuje_termin()
    {
        var serieId = await RocnikAsync("kalendar-presun");

        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Jarní vítr", 4, 25), default));
        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Izolepa", 6, 20), default));

        // Celý scénář v jednom scope: entita se mění v tom kontextu, který
        // ji sleduje. V produkci to tak je samo sebou — endpoint si zastávku
        // načte a upraví v témže požadavku.
        await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<KalendarSprava>();
            var jarni = await sprava.NajdiAsync(serieId, "jarni-vitr", default);

            await sprava.PrepniStavAsync(jarni!, StavZavodu.Potvrzeny, default);
            return await sprava.UpravAsync(jarni!, Vstup("Jarní vítr", 7, 4), default);
        });

        var kalendar = await VypisAsync(serieId);

        Assert.Equal(["Izolepa", "Jarní vítr"], kalendar.Select(z => z.Nazev));
        Assert.Equal(new DateOnly(2026, 4, 25), kalendar[1].PuvodniDatum);

        // Adresa zůstává, i když se kalendář přeskládal — odkaz na zastávku
        // už mohl někam odejít.
        Assert.Equal("jarni-vitr", kalendar[1].Slug);
    }

    [Fact]
    public async Task Publikace_neni_stav()
    {
        var serieId = await RocnikAsync("kalendar-publikace");

        await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<KalendarSprava>();
            var (zastavka, _) = await sprava.ZalozAsync(serieId, Vstup("Pohár Slunce", 9, 19), default);

            await sprava.PublikujAsync(zastavka!, true, default);
            return await sprava.PrepniStavAsync(zastavka!, StavZavodu.Potvrzeny, default);
        });

        var zastavka = await SpravaAsync(s => s.NajdiAsync(serieId, "pohar-slunce", default));

        // Plánovaná zastávka má být v kalendáři vidět dřív, než se cokoliv
        // vypíše — a posun stavu publikaci nepřepisuje.
        Assert.NotNull(zastavka);
        Assert.True(zastavka.Publikovano);
        Assert.Equal(StavZavodu.Potvrzeny, zastavka.Stav);
    }

    [Fact]
    public async Task Vyhodnoceni_se_zaklada_i_upravuje_v_kalendari()
    {
        var serieId = await RocnikAsync("kalendar-vyhodnoceni");

        // Bez hodnoty je regata po kategoriích, jako většina.
        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Jarní vítr", 4, 25), default));
        await SpravaAsync(s => s.ZalozAsync(
            serieId,
            Vstup("24hodinovka", 5, 23) with { Vyhodnoceni = Vyhodnoceni.CelePole },
            default));

        var zalozene = await VypisAsync(serieId);
        Assert.Equal(Vyhodnoceni.PoKategoriich, zalozene.Single(z => z.Slug == "jarni-vitr").Vyhodnoceni);
        Assert.Equal(Vyhodnoceni.CelePole, zalozene.Single(z => z.Slug == "24hodinovka").Vyhodnoceni);

        // Rozhodčí ho může změnit, třeba když se regata rozhodne vyhlásit
        // celkového vítěze i pořadí v kategoriích.
        await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<KalendarSprava>();
            var jarni = await sprava.NajdiAsync(serieId, "jarni-vitr", default);

            return await sprava.UpravAsync(
                jarni!, Vstup("Jarní vítr", 4, 25) with { Vyhodnoceni = Vyhodnoceni.Oboje }, default);
        });

        var upravene = await VypisAsync(serieId);
        Assert.Equal(Vyhodnoceni.Oboje, upravene.Single(z => z.Slug == "jarni-vitr").Vyhodnoceni);
    }

    /// <summary>
    /// <b>Kolonky vypsání se ukládají a prázdné maže</b> (R21, obrazovka
    /// z 22. 11. 2026). Je to rozdíl proti <c>UpravAsync</c>, kde prázdno
    /// znamená „neměnit": tamten formulář posouvá termín a nesmí cestou
    /// shodit, co přišlo importem, kdežto tenhle je jediné místo, kde se
    /// vypsání vyplňuje — a bez mazání by se překlep nedal vzít zpět.
    /// <para>
    /// <b>Načíst a uložit se musí v jednom scope</b>, jinak entita není
    /// sledovaná a uložení tiše neudělá nic. Je to napsané v hlavičce
    /// <see cref="KalendarSprava"/> a stálo to jeden běh CI u článků —
    /// a 22. 11. 2026 podruhé jeden tady.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Vypsani_se_ulozi_a_prazdne_pole_maze()
    {
        var serieId = await RocnikAsync("kalendar-vypsani");
        var (zalozena, _) = await SpravaAsync(s =>
            s.ZalozAsync(serieId, Vstup("Jarní vítr", 5, 15), default));
        Assert.NotNull(zalozena);

        var chyba = await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<KalendarSprava>();
            var zastavka = await sprava.NajdiAsync(serieId, zalozena!.Slug, default);
            return await sprava.VypsaniAsync(zastavka!, new VypsaniKolonkyVstup(
                MistoKonani: "  Marina Orlík  ",
                Draha: "start u mola, točná levobokem",
                PosledniStartV: new TimeOnly(16, 0),
                Startovne: "450 Kč",
                DelkaProceduryMin: 5), default);
        });

        Assert.Null(chyba);

        var ulozena = await VeSluzbeAsync(sp => sp.GetRequiredService<AppDbContext>()
            .Zavody.AsNoTracking().SingleAsync(z => z.Id == zalozena!.Id));

        // Okraje se ořezávají: „ Marina Orlík " a „Marina Orlík" je totéž
        // místo, ale v dokumentu by se lišilo.
        Assert.Equal("Marina Orlík", ulozena.MistoKonani);
        Assert.Equal("start u mola, točná levobokem", ulozena.Draha);
        Assert.Equal(new TimeOnly(16, 0), ulozena.PosledniStartV);

        // A teď to podstatné: prázdný formulář vymaže, nenechá staré.
        Assert.Null(await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<KalendarSprava>();
            var zastavka = await sprava.NajdiAsync(serieId, zalozena!.Slug, default);
            return await sprava.VypsaniAsync(zastavka!, new VypsaniKolonkyVstup(), default);
        }));

        var prazdna = await VeSluzbeAsync(sp => sp.GetRequiredService<AppDbContext>()
            .Zavody.AsNoTracking().SingleAsync(z => z.Id == zalozena!.Id));

        Assert.Null(prazdna.MistoKonani);
        Assert.Null(prazdna.Draha);
        Assert.Null(prazdna.PosledniStartV);
        Assert.Null(prazdna.Startovne);
        // Délka procedury prázdná být nemůže — bez ní by se nedal spustit
        // odpočet. Vrací se na výchozích pět minut podle ZPJ 26.
        Assert.Equal(Procedura.DelkaVychozi, prazdna.DelkaProceduryMin);
    }

    /// <summary>Délka procedury má mez; nesmyslnou vrátí jako chybu, ne jako uloženou.</summary>
    [Fact]
    public async Task Nesmyslna_delka_procedury_se_neulozi()
    {
        var serieId = await RocnikAsync("kalendar-vypsani-delka");
        var (zalozena, _) = await SpravaAsync(s =>
            s.ZalozAsync(serieId, Vstup("Izolepa", 6, 20), default));
        Assert.NotNull(zalozena);

        var chyba = await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<KalendarSprava>();
            var zastavka = await sprava.NajdiAsync(serieId, zalozena!.Slug, default);
            return await sprava.VypsaniAsync(
                zastavka!, new VypsaniKolonkyVstup(DelkaProceduryMin: 0), default);
        });

        Assert.NotNull(chyba);
    }

    // --- Odjetá regata a pohár (konzilium 27. 11. 2026, bod 3) -------------

    private static readonly System.Text.Json.JsonSerializerOptions Json =
        new(System.Text.Json.JsonSerializerDefaults.Web)
        {
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
        };

    /// <summary>
    /// Ročník s jednou odjetou regatou o dvou rozjížďkách: první se počítá
    /// do poháru, druhá je zábavná, mimo něj.
    /// </summary>
    private async Task NahrajOdjetouAsync(string slug)
    {
        static Api.Features.Import.VysledekVstup Dojel(string lod, int poradi) =>
            new(lod, PoradiVCili: poradi);

        var vstup = new Api.Features.Import.SerieVstup(
            Slug: slug,
            Nazev: $"Pohár {slug}",
            Rok: 2026,
            Kategorie: [new("Race", 1)],
            Osoby: [new("novak", "Jan", "Novák")],
            Lode: [new("a", $"Alfa {slug}", null, null, "novak"), new("b", $"Beta {slug}", null, null, "novak")],
            Prihlasky: [new("a", "Race"), new("b", "Race")],
            Zavody:
            [
                new(
                    Slug: "jarni",
                    Nazev: "Jarní vítr",
                    Datum: new DateOnly(2026, 4, 25),
                    Poradi: 1,
                    Ucasti: [new("a", null, null), new("b", null, null)],
                    Rozjizdky:
                    [
                        new(1, null, StavRozjizdky.Dokoncena, [Dojel("a", 1), Dojel("b", 2)]),
                        new(2, null, StavRozjizdky.Dokoncena, [Dojel("b", 1), Dojel("a", 2)], DoSerie: false),
                    ]),
            ]);

        var klient = fixture.CreateClient();
        klient.DefaultRequestHeaders.Add("X-Import-Token", PostgresFixture.Token);
        var odpoved = await System.Net.Http.Json.HttpClientJsonExtensions.PostAsJsonAsync(
            klient, "/import/serie", vstup, Json);
        Assert.Equal(System.Net.HttpStatusCode.OK, odpoved.StatusCode);
    }

    /// <summary>Slugy regat, které průběžné pořadí právě počítá.</summary>
    private async Task<List<string>> VPoradiAsync(string slug)
    {
        var poradi = await System.Net.Http.Json.HttpClientJsonExtensions
            .GetFromJsonAsync<Api.Features.Bodovani.PoradiSerieDto>(
                fixture.CreateClient(), $"/serie/{slug}/poradi", Json);
        return [.. poradi!.Zastavky.Select(z => z.Slug)];
    }

    private Task<string?> VratMeziVypsaneAsync(string slug) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var sprava = sp.GetRequiredService<KalendarSprava>();
            var serieId = await db.Serie.Where(x => x.Slug == slug).Select(x => x.Id).SingleAsync();
            var zastavka = await sprava.NajdiAsync(serieId, "jarni", default);

            return await sprava.PrepniStavAsync(zastavka!, StavZavodu.Vypsany, default);
        });

    private Task<Zavod> JarniAsync(string slug) =>
        VeSluzbeAsync(sp => sp.GetRequiredService<AppDbContext>().Zavody.AsNoTracking()
            .SingleAsync(z => z.Serie!.Slug == slug && z.Slug == "jarni"));

    [Fact]
    public async Task Odjeta_regata_s_vysledky_v_poharu_se_mezi_vypsane_nevrati()
    {
        const string slug = "kal-zpet-plna";
        await NahrajOdjetouAsync(slug);

        var chyba = await VratMeziVypsaneAsync(slug);

        // Počítá se jen první rozjížďka — druhá je mimo pohár.
        Assert.NotNull(chyba);
        Assert.Contains("1 rozjížďka", chyba);
        Assert.Equal(StavZavodu.Odjety, (await JarniAsync(slug)).Stav);
        // A pohár ji počítá dál: kvůli tomu to pravidlo je.
        Assert.Contains("jarni", await VPoradiAsync(slug));
    }

    [Fact]
    public async Task Regata_kterou_pravidlo_drzi_je_v_poradi_a_ta_kterou_pusti_tam_neni_co_brat()
    {
        // Podmínka „počítá se do poháru" je opsaná z dotazu na pořadí.
        // Tenhle test oba opisy drží u sebe: co pravidlo považuje za
        // prázdné, z toho pořadí opravdu žádné body nebere.
        const string slug = "kal-zpet-opis";
        await NahrajOdjetouAsync(slug);

        var zavodId = (await JarniAsync(slug)).Id;
        var vPoharu = await SpravaAsync(s => s.VPoharuAsync(zavodId, default));
        Assert.Equal(1, vPoharu);
        // Dokud se rozjížďka počítá, dělí lodě: první má bod, druhá dva.
        Assert.Equal(2, (await BodyZJarniAsync(slug)).Distinct().Count());

        // Vyndat z poháru jedinou rozjížďku, která se počítala.
        await VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var prvni = await db.Rozjizdky.SingleAsync(r => r.ZavodId == zavodId && r.Cislo == 1);
            prvni.DoSerie = false;
            return await db.SaveChangesAsync();
        });

        Assert.Equal(0, await SpravaAsync(s => s.VPoharuAsync(zavodId, default)));

        // Regata v pořadí zůstává jako sloupec — je pořád odjetá — ale
        // žádný výsledek z ní pořadí nebere: všechny lodě mají stejné body
        // za neúčast. Vrátit ji mezi vypsané proto pořadí lodí nerozhází.
        Assert.Single((await BodyZJarniAsync(slug)).Distinct());
    }

    /// <summary>
    /// Body, které má každá loď v průběžném pořadí z jediné regaty ročníku.
    /// Prázdný seznam, když pořadí regatu nevede vůbec.
    /// </summary>
    private async Task<List<int?>> BodyZJarniAsync(string slug)
    {
        var poradi = await System.Net.Http.Json.HttpClientJsonExtensions
            .GetFromJsonAsync<Api.Features.Bodovani.PoradiSerieDto>(
                fixture.CreateClient(), $"/serie/{slug}/poradi", Json);
        return [.. poradi!.Kategorie.SelectMany(k => k.Lode).SelectMany(l => l.Zastavky)];
    }

    [Theory]
    [InlineData("nezverejnena")]
    [InlineData("eliminovana")]
    [InlineData("regata-skryta")]
    [InlineData("bez-vysledku")]
    public async Task Co_poradi_nepocita_to_pravidlo_nedrzi(string pripad)
    {
        // Každá podmínka z dotazu na pořadí zvlášť. Kdyby pravidlo některou
        // nemělo, drželo by regatu kvůli rozjížďce, kterou pohár nevidí —
        // a člověk by neměl jak ji vrátit.
        var slug = $"kal-zpet-{pripad}";
        await NahrajOdjetouAsync(slug);
        var zavodId = (await JarniAsync(slug)).Id;

        await VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var prvni = await db.Rozjizdky.SingleAsync(r => r.ZavodId == zavodId && r.Cislo == 1);

            switch (pripad)
            {
                case "nezverejnena": prvni.Publikovano = false; break;
                case "eliminovana": prvni.StavVysledku = StavVysledku.Eliminovano; break;
                case "regata-skryta":
                    (await db.Zavody.SingleAsync(z => z.Id == zavodId)).Publikovano = false;
                    break;
                case "bez-vysledku":
                    db.Vysledky.RemoveRange(db.Vysledky.Where(v => v.RozjizdkaId == prvni.Id));
                    break;
            }

            return await db.SaveChangesAsync();
        });

        Assert.Equal(0, await SpravaAsync(s => s.VPoharuAsync(zavodId, default)));
        // Pořadí z ní výsledek nebere: buď ji nevede, nebo mají všichni stejně.
        Assert.True((await BodyZJarniAsync(slug)).Distinct().Count() <= 1);
        Assert.Null(await VratMeziVypsaneAsync(slug));
    }

    [Fact]
    public async Task Prazdnou_odjetou_regatu_jde_vratit_a_automat_ji_hned_nezavre()
    {
        const string slug = "kal-zpet-prazdna";
        await NahrajOdjetouAsync(slug);

        var zavodId = (await JarniAsync(slug)).Id;
        await VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var prvni = await db.Rozjizdky.SingleAsync(r => r.ZavodId == zavodId && r.Cislo == 1);
            prvni.DoSerie = false;
            // Jako by ji předtím zavřel robot: štítek po něm nesmí přežít.
            (await db.Zavody.SingleAsync(z => z.Id == zavodId)).UzavrenoAutomatemV =
                new DateTimeOffset(2026, 4, 28, 3, 0, 0, TimeSpan.Zero);
            return await db.SaveChangesAsync();
        });

        var pred = DateTimeOffset.UtcNow;
        Assert.Null(await VratMeziVypsaneAsync(slug));

        var vracena = await JarniAsync(slug);
        Assert.Equal(StavZavodu.Vypsany, vracena.Stav);
        Assert.Null(vracena.UzavrenoAutomatemV);
        Assert.NotNull(vracena.VracenoMeziVypsaneV);
        Assert.InRange(vracena.VracenoMeziVypsaneV.Value, pred.AddSeconds(-1), DateTimeOffset.UtcNow.AddSeconds(1));

        // Dubnová regata s dojetou rozjížďkou: přesně tu robot zavírá. Teď
        // ji ale vrátil člověk a lhůta jde znovu od vrácení.
        var zavrene = await VeSluzbeAsync(sp => UzavreniRegat.UzavriAsync(
            sp.GetRequiredService<AppDbContext>(), DateTimeOffset.UtcNow, default));

        Assert.DoesNotContain("jarni", zavrene);
        Assert.Equal(StavZavodu.Vypsany, (await JarniAsync(slug)).Stav);
    }
}

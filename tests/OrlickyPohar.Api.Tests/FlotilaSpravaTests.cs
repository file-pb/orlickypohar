using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Appka;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Na čem jede flotila — proti reálnému PostgreSQL a <b>přes HTTP</b>.
/// <para>
/// Hlášení verze se zapisuje v autentizačním handleru a v endpointech, takže
/// služba sama by neověřila to podstatné: že hlavička z požadavku doteče až
/// do řádku identity, a že rozbitá hlavička požadavek neshodí.
/// </para>
/// <para>
/// <b>Databázi sdílí celá kolekce a nic se neuklízí.</b> Každý test má
/// vlastní účty, otisky a identifikátory. Jediné společné je „poslední
/// vydaný balíček pro android" — ten je jeden pro celou databázi, a proto ho
/// test přehledu zapisuje pod nejvyšším číslem, které obchod přijme, a
/// hned čte; testy v kolekci běží po jednom, takže mu ho nikdo nepřepíše.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class FlotilaSpravaTests(PostgresFixture fixture)
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static string Znacka() => Guid.NewGuid().ToString("N")[..10];

    private static string Hlavicka(
        string otisk, Guid aktualizace, string spusteni = "stazena", string kanal = "production",
        string platforma = "android") =>
        $"platforma={platforma};otisk={otisk};aktualizace={aktualizace};kanal={kanal};spusteni={spusteni}";

    private async Task<T> VeScope<T>(Func<IServiceProvider, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        return await co(scope.ServiceProvider);
    }

    /// <summary>
    /// Měřítko balíčků se čte, i když se zatím žádný telefon nenahlásil —
    /// jinak by přehled první den tvrdil, že v obchodě nic není (nález
    /// kontroly 27. 11. 2026).
    /// </summary>
    [Fact]
    public async Task Vydani_jsou_v_meritku_i_bez_jedineho_hlaseni()
    {
        var otisk = $"bez-hlaseni-{Znacka()}";
        await VeScope(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            db.VydaniAppky.Add(new VydaniAppky
            {
                Platforma = "ios",
                CisloBalicku = 1_800_000_000 + Random.Shared.Next(1, 90_000_000),
                Otisk = otisk,
                VydanoV = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
            return 0;
        });

        var vydano = await VeScope(sp =>
            FlotilaEndpoints.NactiVydanoAsync(sp.GetRequiredService<AppDbContext>(), [], default));

        Assert.NotEmpty(vydano.PosledniBalicky);
    }

    /// <summary>Účet s napojeným telefonem. Vrací účet, tajemství klíče a číslo klíče.</summary>
    private Task<(Uzivatel Ucet, string Klic, int KlicId)> NapojenyTelefonAsync(string zarizeni = "Pixel u vody") =>
        VeScope(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var ucet = new Uzivatel
            {
                Id = Guid.NewGuid(),
                Zobrazovane = $"Flotila {Znacka()}",
                Email = $"{Guid.NewGuid():N}@priklad.cz",
                ZalozenV = DateTimeOffset.UtcNow,
            };
            db.Uzivatele.Add(ucet);
            await db.SaveChangesAsync();

            var klice = new KliceUctuSprava(db, TimeProvider.System);
            var kod = await klice.VystavKodAsync(ucet.Id, default);
            var napojeni = (await klice.NapojAsync(kod.Kod, zarizeni, default))!;
            var id = await db.KliceUctu.Where(k => k.UzivatelId == ucet.Id).Select(k => k.Id).SingleAsync();
            return (ucet, napojeni.Klic, id);
        });

    private HttpClient SKlicem(string klic, string? verze)
    {
        var c = fixture.CreateClient();
        c.DefaultRequestHeaders.Add(KliceUctuSprava.Hlavicka, klic);
        if (verze is not null) c.DefaultRequestHeaders.TryAddWithoutValidation(VerzeAppky.Hlavicka, verze);
        return c;
    }

    private Task<KlicUctu> KlicUctuAsync(int id) =>
        VeScope(sp => sp.GetRequiredService<AppDbContext>().KliceUctu.AsNoTracking().SingleAsync(k => k.Id == id));

    /// <summary>Loď s kapitánem a klíčem pro člena posádky. Vrací tajemství a číslo klíče.</summary>
    private Task<(string Klic, int KlicId, string Lod)> KlicKLodiAsync() =>
        VeScope(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var znacka = Znacka();
            var kapitan = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Kapitán flotily" };
            var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = "Flotily" };
            db.Uzivatele.Add(kapitan);
            db.Osoby.Add(osoba);
            await db.SaveChangesAsync();

            var lod = new Lod { Nazev = $"VLNA {znacka}", MajitelId = osoba.Id };
            db.Lode.Add(lod);
            await db.SaveChangesAsync();

            var klice = new KliceSprava(db, TimeProvider.System);
            var pozvanka = await klice.PozviAsync(lod.Id, kapitan.Id, "Tonda", default);
            var uplatneni = (await klice.UplatniAsync(pozvanka.Kod, default))!;
            var id = await db.Klice.Where(k => k.LodId == lod.Id).Select(k => k.Id).SingleAsync();
            return (uplatneni.Klic, id, lod.Nazev);
        });

    private Task<KlicLodi> KlicLodiAsync(int id) =>
        VeScope(sp => sp.GetRequiredService<AppDbContext>().Klice.AsNoTracking().SingleAsync(k => k.Id == id));

    /// <summary>Účet, který se přihlásil; volitelně s rolí správce celého webu. Vrací klienta s tokenem.</summary>
    private async Task<HttpClient> PrihlasenyAsync(bool spravceWebu)
    {
        var subjekt = $"flotila-{Znacka()}";
        var email = $"{subjekt}@priklad.cz";

        await VeScope(async sp =>
        {
            await sp.GetRequiredService<Uzivatele>().NajdiNeboZalozAsync(
                TestoveTokeny.Vydavatel, subjekt, $"Účet {subjekt}", email, TimeProvider.System, default);
            if (spravceWebu)
                await sp.GetRequiredService<OpravneniSprava>().UdelAsync(null, null, email, Role.Spravce, default);
            return 0;
        });

        return fixture.KlientJako(subjekt);
    }

    private HttpClient SVydanim()
    {
        var c = fixture.CreateClient();
        c.DefaultRequestHeaders.Add(VydaniAppkyEndpoints.Hlavicka, PostgresFixture.VydaniToken);
        return c;
    }

    // --- Zápis hlášení -----------------------------------------------------

    [Fact]
    public async Task Hlavicka_se_zapise_k_napojenemu_telefonu()
    {
        var (_, klic, id) = await NapojenyTelefonAsync();
        var otisk = $"otisk-{Znacka()}";
        var prvni = Guid.NewGuid();

        using (var k = SKlicem(klic, Hlavicka(otisk, prvni)))
            Assert.Equal(HttpStatusCode.OK, (await k.GetAsync("/ja/klice")).StatusCode);

        var po1 = await KlicUctuAsync(id);
        Assert.Equal("android", po1.VerzePlatforma);
        Assert.Equal(otisk, po1.VerzeOtisk);
        Assert.Equal(prvni, po1.VerzeAktualizace);
        Assert.Equal("production", po1.VerzeKanal);
        Assert.Equal(SpusteniAppky.Stazena, po1.VerzeSpusteni);
        Assert.Null(po1.VerzeCeka);
        Assert.NotNull(po1.VerzeOdV);
        Assert.Equal(po1.OzvalSeV, po1.VerzeHlasenaV);

        // Tatáž verze znovu: hlášení se posune, „od kdy" ne.
        using (var k = SKlicem(klic, Hlavicka(otisk, prvni)))
            (await k.GetAsync("/ja/klice")).EnsureSuccessStatusCode();
        var po2 = await KlicUctuAsync(id);
        Assert.Equal(po1.VerzeOdV, po2.VerzeOdV);
        Assert.True(po2.VerzeHlasenaV > po1.VerzeHlasenaV);

        // Nová aktualizace: od teď běží jiný kód.
        var druha = Guid.NewGuid();
        using (var k = SKlicem(klic, Hlavicka(otisk, druha)))
            (await k.GetAsync("/ja/klice")).EnsureSuccessStatusCode();
        var po3 = await KlicUctuAsync(id);
        Assert.Equal(druha, po3.VerzeAktualizace);
        Assert.True(po3.VerzeOdV > po1.VerzeOdV);
    }

    /// <summary>
    /// <b>Hlavička je telemetrie.</b> Rozbitá nesmí shodit požadavek, který
    /// by bez ní prošel, a nesmí přepsat poslední platné hlášení — jinak by
    /// jedna vadná verze appky vymazala, co o flotile víme.
    /// </summary>
    [Fact]
    public async Task Neplatna_hlavicka_nic_nerozbije_ani_nezapise()
    {
        var (_, klic, id) = await NapojenyTelefonAsync();
        var otisk = $"otisk-{Znacka()}";
        var aktualizace = Guid.NewGuid();

        using (var k = SKlicem(klic, Hlavicka(otisk, aktualizace)))
            (await k.GetAsync("/ja/klice")).EnsureSuccessStatusCode();
        var platne = await KlicUctuAsync(id);

        foreach (var rozbita in new[]
                 {
                     "nesmysl",
                     Hlavicka(otisk, aktualizace, spusteni: "jinak"),
                     Hlavicka("otisk s mezerou", aktualizace),
                     new string('x', 5000),
                 })
        {
            using var k = SKlicem(klic, rozbita);
            Assert.Equal(HttpStatusCode.OK, (await k.GetAsync("/ja/klice")).StatusCode);
        }

        var po = await KlicUctuAsync(id);
        Assert.Equal(platne.VerzeOtisk, po.VerzeOtisk);
        Assert.Equal(platne.VerzeAktualizace, po.VerzeAktualizace);
        Assert.Equal(platne.VerzeHlasenaV, po.VerzeHlasenaV);
        Assert.Equal(platne.VerzeOdV, po.VerzeOdV);
        // Ozvání se zapisuje dál — o tom hlavička nerozhoduje.
        Assert.True(po.OzvalSeV > platne.OzvalSeV);

        // A telefon, který se s platnou nikdy nehlásil, zůstane bez hlášení.
        var (_, cerstvy, cerstvyId) = await NapojenyTelefonAsync();
        using (var k = SKlicem(cerstvy, "platforma=android;otisk=x"))
            Assert.Equal(HttpStatusCode.OK, (await k.GetAsync("/ja/klice")).StatusCode);
        var nic = await KlicUctuAsync(cerstvyId);
        Assert.Null(nic.VerzeHlasenaV);
        Assert.Null(nic.VerzeOtisk);
        Assert.NotNull(nic.OzvalSeV);
    }

    /// <summary>
    /// Klíč k lodi hlásí verzi dvěma cestami: hlášením úlohy na pozadí
    /// a ověřením při posílání poloh. Obě musí zapisovat.
    /// </summary>
    [Fact]
    public async Task Klic_k_lodi_zapise_verzi_pri_hlaseni_i_overeni()
    {
        var (klic, id, _) = await KlicKLodiAsync();
        var otisk = $"otisk-{Znacka()}";
        var prvni = Guid.NewGuid();

        using (var c = fixture.CreateClient())
        {
            c.DefaultRequestHeaders.Add(KliceSprava.Hlavicka, klic);
            c.DefaultRequestHeaders.TryAddWithoutValidation(
                VerzeAppky.Hlavicka, Hlavicka(otisk, prvni, kanal: "preview"));
            var r = await c.PostAsJsonAsync("/klice/hlaseni", new { baterieProcent = 80 });
            Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        }

        var po = await KlicLodiAsync(id);
        Assert.Equal(otisk, po.VerzeOtisk);
        Assert.Equal(prvni, po.VerzeAktualizace);
        Assert.Equal("preview", po.VerzeKanal);
        Assert.Equal(80, po.BaterieProcent);

        // Ověření klíčem v hlavičce (`ZHlavickyAsync`) — tudy chodí polohy,
        // okna i obrazovka závodníka. Dnes loď nikde nejede, takže 204.
        var druha = Guid.NewGuid();
        using (var c = fixture.CreateClient())
        {
            c.DefaultRequestHeaders.Add(KliceSprava.Hlavicka, klic);
            c.DefaultRequestHeaders.TryAddWithoutValidation(
                VerzeAppky.Hlavicka, Hlavicka(otisk, druha, spusteni: "nouzova"));
            Assert.Equal(HttpStatusCode.NoContent, (await c.GetAsync("/lod/dnes")).StatusCode);
        }

        var poOvereni = await KlicLodiAsync(id);
        Assert.Equal(druha, poOvereni.VerzeAktualizace);
        Assert.Equal(SpusteniAppky.Nouzova, poOvereni.VerzeSpusteni);
    }

    [Fact]
    public async Task Zarizeni_zapise_verzi_s_registraci_a_odmitnute_nic()
    {
        var otisk = $"otisk-{Znacka()}";
        var aktualizace = Guid.NewGuid();
        var token = $"ExponentPushToken[{Znacka()}]";

        using var c = fixture.CreateClient();
        c.DefaultRequestHeaders.TryAddWithoutValidation(
            VerzeAppky.Hlavicka, Hlavicka(otisk, aktualizace, platforma: "ios", spusteni: "vestavena"));

        var r = await c.PutAsJsonAsync("/zarizeni", new { token, platforma = "Ios", odbery = new[] { "serie:2027" } });
        Assert.Equal(HttpStatusCode.NoContent, r.StatusCode);

        // Odmítnutá registrace nesmí nechat ani řádek, ani verzi.
        var spatny = await c.PutAsJsonAsync("/zarizeni", new { token = "neni-to-token", odbery = Array.Empty<string>() });
        Assert.Equal(HttpStatusCode.BadRequest, spatny.StatusCode);

        var zarizeni = await VeScope(sp => sp.GetRequiredService<AppDbContext>().Zarizeni.AsNoTracking()
            .Where(z => z.VerzeOtisk == otisk).ToListAsync());
        var jedno = Assert.Single(zarizeni);
        Assert.Equal(token, jedno.Token);
        Assert.Equal("ios", jedno.VerzePlatforma);
        Assert.Equal(SpusteniAppky.Vestavena, jedno.VerzeSpusteni);
        Assert.Equal(aktualizace, jedno.VerzeAktualizace);
    }

    // --- Publikace ---------------------------------------------------------

    [Fact]
    public async Task Publikace_je_idempotentni()
    {
        var otisk = $"otisk-{Znacka()}";
        var zapis = new ZapisPublikaceAppky("android", "production", otisk, Guid.NewGuid().ToString(), "69e42c75");
        using var c = SVydanim();

        var prvni = await c.PostAsJsonAsync("/appka/publikace", zapis);
        Assert.Equal(HttpStatusCode.OK, prvni.StatusCode);
        Assert.True((await prvni.Content.ReadFromJsonAsync<ZapisPublikaceAppkyVysledek>())!.Nove);
        var poPrvnim = await VeScope(sp => sp.GetRequiredService<AppDbContext>().PublikaceAppky.AsNoTracking()
            .SingleAsync(p => p.Otisk == otisk));

        var znovu = await c.PostAsJsonAsync("/appka/publikace", zapis with { Commit = null });
        Assert.Equal(HttpStatusCode.OK, znovu.StatusCode);
        Assert.False((await znovu.Content.ReadFromJsonAsync<ZapisPublikaceAppkyVysledek>())!.Nove);

        var radky = await VeScope(sp => sp.GetRequiredService<AppDbContext>().PublikaceAppky.AsNoTracking()
            .Where(p => p.Otisk == otisk).ToListAsync());
        var jedna = Assert.Single(radky);
        // Čas prvního zápisu zůstává a chybějící commit ten známý nesmaže.
        Assert.Equal(poPrvnim.PublikovanoV, jedna.PublikovanoV);
        Assert.Equal("69e42c75", jedna.Commit);

        // Jiný kanál je jiná publikace.
        var preview = await c.PostAsJsonAsync("/appka/publikace", zapis with { Kanal = "preview" });
        Assert.True((await preview.Content.ReadFromJsonAsync<ZapisPublikaceAppkyVysledek>())!.Nove);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("spatny")]
    // Importní ani satelitní token na zápis publikace nestačí.
    [InlineData(PostgresFixture.Token)]
    [InlineData(PostgresFixture.LandsatToken)]
    public async Task Publikace_bez_spravneho_tokenu_neprojde(string? token)
    {
        using var c = fixture.CreateClient();
        if (token is not null) c.DefaultRequestHeaders.Add(VydaniAppkyEndpoints.Hlavicka, token);

        var r = await c.PostAsJsonAsync("/appka/publikace",
            new ZapisPublikaceAppky("android", "production", "otisk-cizi", Guid.NewGuid().ToString(), null));

        Assert.Equal(HttpStatusCode.Unauthorized, r.StatusCode);
    }

    [Fact]
    public async Task Spatna_publikace_vrati_duvod()
    {
        using var c = SVydanim();
        var r = await c.PostAsJsonAsync("/appka/publikace",
            new ZapisPublikaceAppky("android", "production", "otisk", "neni-to-uuid", null));

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Contains("UUID", await r.Content.ReadAsStringAsync());
    }

    // --- Přehled -----------------------------------------------------------

    [Theory]
    [InlineData("/sprava/flotila")]
    [InlineData("/sprava/flotila/publikace")]
    public async Task Prehled_vidi_jen_spravce_celeho_webu(string cesta)
    {
        using var anonym = fixture.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonym.GetAsync(cesta)).StatusCode);

        using var bezRole = await PrihlasenyAsync(spravceWebu: false);
        Assert.Equal(HttpStatusCode.Forbidden, (await bezRole.GetAsync(cesta)).StatusCode);

        // Klíč k účtu je přihlášení jako každé jiné — role mu nepřidá.
        var (_, klic, _) = await NapojenyTelefonAsync();
        using var telefon = SKlicem(klic, null);
        Assert.Equal(HttpStatusCode.Forbidden, (await telefon.GetAsync(cesta)).StatusCode);

        using var spravce = await PrihlasenyAsync(spravceWebu: true);
        Assert.Equal(HttpStatusCode.OK, (await spravce.GetAsync(cesta)).StatusCode);
    }

    /// <summary>
    /// <b>Celý řetěz najednou</b>: CI zapíše balíčky a publikace, telefony se
    /// ozvou s hlavičkou, správce si přečte přehled — a u každé identity musí
    /// sedět stav, balíček i měřítko.
    /// </summary>
    [Fact]
    public async Task Prehled_spocita_stav_kazde_identity()
    {
        var znacka = Znacka();
        var stary = $"stary-{znacka}";
        var novy = $"novy-{znacka}";
        const string commit = "b870bd39b870bd39b870bd39b870bd39b870bd39";
        var cislo = VydaniAppkyEndpoints.NejvyssiCislo;

        using (var ci = SVydanim())
        {
            (await ci.PostAsJsonAsync("/appka/vydani",
                new ZapisVydaniAppky("android", cislo - 1, stary, null))).EnsureSuccessStatusCode();
            (await ci.PostAsJsonAsync("/appka/vydani",
                new ZapisVydaniAppky("android", cislo, novy, commit))).EnsureSuccessStatusCode();
        }

        var starsi = Guid.NewGuid();
        var posledni = Guid.NewGuid();
        using (var ci = SVydanim())
        {
            (await ci.PostAsJsonAsync("/appka/publikace",
                new ZapisPublikaceAppky("android", "production", novy, starsi.ToString(), "aaaaaaa"))).EnsureSuccessStatusCode();
            (await ci.PostAsJsonAsync("/appka/publikace",
                new ZapisPublikaceAppky("android", "production", novy, posledni.ToString(), commit[..12]))).EnsureSuccessStatusCode();
        }

        async Task<int> UcetSHlasenimAsync(string? hlavicka, string zarizeni = "Pixel u vody")
        {
            var (_, klic, id) = await NapojenyTelefonAsync(zarizeni);
            using var k = SKlicem(klic, hlavicka);
            (await k.GetAsync("/ja/klice")).EnsureSuccessStatusCode();
            return id;
        }

        var aktualni = await UcetSHlasenimAsync(Hlavicka(novy, posledni));
        var staraAktualizace = await UcetSHlasenimAsync(Hlavicka(novy, starsi));
        var staryBalicek = await UcetSHlasenimAsync(Hlavicka(stary, Guid.NewGuid()));
        var nouzove = await UcetSHlasenimAsync(Hlavicka(novy, Guid.NewGuid(), spusteni: "nouzova"));
        var bezHlaseni = await UcetSHlasenimAsync(null, zarizeni: $"Starý telefon {znacka}");
        // Čerstvá instalace z obchodu: vestavěný bundle z commitu poslední publikace.
        var vestavena = await UcetSHlasenimAsync(Hlavicka(novy, Guid.NewGuid(), spusteni: "vestavena"));

        var (klicLodi, klicLodiId, lod) = await KlicKLodiAsync();
        using (var c = fixture.CreateClient())
        {
            c.DefaultRequestHeaders.Add(KliceSprava.Hlavicka, klicLodi);
            c.DefaultRequestHeaders.TryAddWithoutValidation(VerzeAppky.Hlavicka, Hlavicka(novy, starsi));
            (await c.PostAsJsonAsync("/klice/hlaseni", new { })).EnsureSuccessStatusCode();
        }

        using var spravce = await PrihlasenyAsync(spravceWebu: true);
        var odpoved = await spravce.GetAsync("/sprava/flotila");
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);

        // Stav jde ven slovy ze zadání, ne jmény výčtu v C#.
        var surove = await odpoved.Content.ReadAsStringAsync();
        Assert.Contains("\"stav\":\"stara-aktualizace\"", surove);
        Assert.Contains("\"druh\":\"ucet\"", surove);
        Assert.DoesNotContain("\"stav\":\"StaraAktualizace\"", surove);

        var flotila = JsonSerializer.Deserialize<FlotilaDto>(surove, Json)!;
        FlotilaRadekDto Ucet(int id) => flotila.Radky.Single(r => r.Druh == DruhIdentityFlotily.Ucet && r.Id == id);

        Assert.Equal(StavVerzeAppky.Aktualni, Ucet(aktualni).Stav);
        Assert.Equal(cislo, Ucet(aktualni).CisloBalicku);
        Assert.Equal(cislo, Ucet(aktualni).PosledniCisloBalicku);
        Assert.Equal(posledni, Ucet(aktualni).PosledniAktualizace);

        Assert.Equal(StavVerzeAppky.StaraAktualizace, Ucet(staraAktualizace).Stav);
        Assert.Equal(posledni, Ucet(staraAktualizace).PosledniAktualizace);

        Assert.Equal(StavVerzeAppky.StaryBalicek, Ucet(staryBalicek).Stav);
        Assert.Equal(cislo - 1, Ucet(staryBalicek).CisloBalicku);
        Assert.Equal(cislo, Ucet(staryBalicek).PosledniCisloBalicku);

        Assert.Equal(StavVerzeAppky.Nouzove, Ucet(nouzove).Stav);
        Assert.Equal(StavVerzeAppky.Aktualni, Ucet(vestavena).Stav);

        var nic = Ucet(bezHlaseni);
        Assert.Equal(StavVerzeAppky.BezHlaseni, nic.Stav);
        Assert.Null(nic.CisloBalicku);
        Assert.NotNull(nic.AktivniV);
        Assert.Contains($"Starý telefon {znacka}", nic.Popis);

        var radekLodi = flotila.Radky.Single(r => r.Druh == DruhIdentityFlotily.Lod && r.Id == klicLodiId);
        Assert.Equal(StavVerzeAppky.StaraAktualizace, radekLodi.Stav);
        Assert.StartsWith(lod, radekLodi.Popis);

        // Žádné tajemství ven: ani otisk klíče, ani tajemství samo.
        Assert.DoesNotContain(klicLodi, surove);

        Assert.Contains(flotila.Balicky, b => b.Platforma == "android" && b.CisloBalicku == cislo && b.Otisk == novy);

        // Souhrn: jeden řádek na druh, nesčítaný přes druhy, a každý sedí
        // se svými řádky. Celkové počty závisí na ostatních testech, proto
        // se měří vnitřní shoda, ne čísla.
        Assert.Equal(Enum.GetValues<DruhIdentityFlotily>(), flotila.Souhrn.Select(s => s.Druh));
        foreach (var s in flotila.Souhrn)
        {
            var radky = flotila.Radky.Where(r => r.Druh == s.Druh).ToList();
            Assert.Equal(radky.Count, s.Celkem);
            Assert.Equal(s.Celkem, s.Aktualni + s.StaryBalicek + s.StaraAktualizace + s.Nouzove + s.BezHlaseni);
            Assert.Equal(radky.Count(r => r.Stav == StavVerzeAppky.Aktualni), s.Aktualni);
        }

        // Odebraný telefon do flotily nepatří.
        var (ucet, _, odebranyId) = await NapojenyTelefonAsync();
        await VeScope(sp => new KliceUctuSprava(sp.GetRequiredService<AppDbContext>(), TimeProvider.System)
            .OdeberAsync(ucet.Id, odebranyId, default));
        var poOdebrani = await spravce.GetFromJsonAsync<FlotilaDto>("/sprava/flotila", Json);
        Assert.DoesNotContain(poOdebrani!.Radky, r => r.Druh == DruhIdentityFlotily.Ucet && r.Id == odebranyId);
    }

    /// <summary>
    /// Profil ukazuje u telefonu balíček a stav — stejný výpočet jako
    /// přehled, aby si profil a správa o jednom telefonu neprotiřečily.
    /// </summary>
    [Fact]
    public async Task Moje_klice_nesou_balicek_a_stav()
    {
        var znacka = Znacka();
        var otisk = $"profil-{znacka}";
        using (var ci = SVydanim())
            (await ci.PostAsJsonAsync("/appka/vydani",
                new ZapisVydaniAppky("ios", 1_900_000_000 + Random.Shared.Next(1_000_000), otisk, null)))
                .EnsureSuccessStatusCode();

        var (_, klic, id) = await NapojenyTelefonAsync();
        using var k = SKlicem(klic, Hlavicka(otisk, Guid.NewGuid(), platforma: "ios"));
        var moje = await k.GetFromJsonAsync<List<KlicUctuDto>>("/ja/klice", Json);

        var muj = Assert.Single(moje!, x => x.Id == id);
        Assert.NotNull(muj.CisloBalicku);
        Assert.NotEqual(StavVerzeAppky.BezHlaseni, muj.StavVerze);

        // Telefon bez hlášení stav nemá, a balíček taky ne.
        var (_, cerstvy, cerstvyId) = await NapojenyTelefonAsync();
        using var bez = SKlicem(cerstvy, null);
        var jeho = Assert.Single((await bez.GetFromJsonAsync<List<KlicUctuDto>>("/ja/klice", Json))!);
        Assert.Equal(cerstvyId, jeho.Id);
        Assert.Equal(StavVerzeAppky.BezHlaseni, jeho.StavVerze);
        Assert.Null(jeho.CisloBalicku);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Boje;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Prvky trati proti reálnému PostgreSQL.
/// <para>
/// Jádro: <b>prvek je rozhodnutí o trati</b>, takže na něj platí tentýž
/// zámek jako na pípnutí, a jeho konce musí být bóje, které doopravdy stojí.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class PrvkySpravaTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 9, 8, 0, 0, TimeSpan.Zero);

    private sealed class ZadneUloziste : OrlickyPohar.Api.Features.Fotky.IUloziste
    {
        public bool Pripraveno => true;
        public string? VerejnaAdresa => "https://foto.example";
        /// <summary>Čtení tenhle test nepotřebuje; čte se jen u oponentury.</summary>
        public Task<Stream?> CtiAsync(string klic, CancellationToken ct) =>
            Task.FromResult<Stream?>(null);


        public Task UlozAsync(
            string klic, byte[] data, string typ, CancellationToken ct, string? cache = null) =>
            Task.CompletedTask;

        public Task SmazAsync(string klic, CancellationToken ct) => Task.CompletedTask;
    }

    private (AppDbContext Db, BojeSprava Boje, TratSprava Trat, PrvkySprava Prvky) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var trat = new TratSprava(db, TimeProvider.System, new ZadneUloziste());

        return (db,
            BojeSluzba(db, trat),
            trat,
            new PrvkySprava(db, trat, TimeProvider.System));
    }

    private static BojeSprava BojeSluzba(AppDbContext db, TratSprava trat)
    {
        var uloziste = new ZadneUloziste();
        return new BojeSprava(
            db, TimeProvider.System, uloziste, trat,
            new OrlickyPohar.Api.Features.Fotky.FotkySprava(
                db, uloziste, TimeProvider.System,
                NullLogger<OrlickyPohar.Api.Features.Fotky.FotkySprava>.Instance),
            NullLogger<BojeSprava>.Instance);
    }

    private static async Task<(Zavod Zavod, Uzivatel Kdo)> RegataAsync(AppDbContext db)
    {
        var klic = Guid.NewGuid().ToString("N")[..8];
        var serie = new Serie { Slug = $"prvky-{klic}", Nazev = "Prvková série", Rok = 2027 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{klic}",
            Nazev = "Prvková regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);

        var kdo = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = "Stavitel",
            Email = $"prvky-{klic}@example.test",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();
        return (zavod, kdo);
    }

    private static PipnutiVstup Bod(string nazev) => new(nazev, 0, 49.516, 14.165, 5, null);

    /// <summary>
    /// <b>Přenastavení bóje vezme prvky s sebou.</b> Přenastavení je tentýž
    /// kus plastu jinde, takže prvek, který tu bóji používá, musí ukazovat
    /// na nový záznam.
    ///
    /// <para>
    /// <b>Proč to je napsané takhle — měří se poloha v DTO, ne jen id.</b>
    /// `PrvekDto` nese souřadnice připojené bóje a z nich kreslí mapka
    /// i GPX. Dokud se prvky nepřepojovaly, visel prvek na starém záznamu
    /// a trať se kreslila podle **staré** polohy; v chartplotteru na lodi
    /// to je bod tam, kde bóje není. Test na samotné `BojeAId` by prošel
    /// i tehdy, kdyby se poloha brala odjinud — proto se tu porovnává to,
    /// co se doopravdy vykreslí.
    /// </para>
    ///
    /// <para>
    /// Objeveno 12. 10. 2026 na produkci: prvek „start“ na Jarním větru
    /// držel přenastavený levobok a nová bóje se mezitím hlásila jako
    /// „stojí mimo trať“.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Prenastaveni_boje_prepoji_prvek_i_jeho_polohu()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (levy, _) = await boje.PipniAsync(zavod.Id, Bod("start levobok"), kdo.Id, default);
        var (pravy, _) = await boje.PipniAsync(zavod.Id, Bod("start pravobok"), kdo.Id, default);

        var (prvek, _) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Start, 1, levy!.Id, pravy!.Id), kdo.Id, default);
        Assert.Equal(49.516, prvek!.A.Sirka, 3);

        // Levobok se posune o kus dál po proudu.
        var (posunuty, chyba) = await boje.PipniAsync(
            zavod.Id,
            new PipnutiVstup("start levobok", 0, 49.5205, 14.1702, 4, levy.Id),
            kdo.Id, default);
        Assert.Null(chyba);

        var po = Assert.Single(await prvky.SeznamAsync(zavod.Id, default));
        Assert.Equal(posunuty!.Id, po.A.Id);
        Assert.Equal(49.5205, po.A.Sirka, 4);
        Assert.Equal(14.1702, po.A.Delka, 4);

        // Druhý konec se nesahá.
        Assert.Equal(pravy!.Id, po.B!.Id);

        // <b>A nová bóje už není „mimo trať“.</b> Tak se totiž na obrazovce
        // hlásí každá, kterou žádný prvek nepoužívá — přenastavená bóje by
        // tam stála jako cizí.
        var naTrati = await boje.SeznamAsync(zavod.Id, iHistorie: false, default);
        Assert.Contains(naTrati, b => b.Id == posunuty.Id);
    }

    /// <summary>
    /// <b>Migrace, která dožene prvky visící na přenastavené bóji.</b>
    /// Pouští <b>tentýž</b> příkaz, jaký je v migraci
    /// <c>PrvekNaAktualniBoji</c> — vlastní kopie by měřila sama sebe.
    ///
    /// <para>
    /// <b>Proč to má vlastní test:</b> migrace se v CI spustí nad prázdnou
    /// databází, takže ověří syntaxi a nic víc. Jestli doopravdy přepojí,
    /// se bez vyrobených vadných dat nepozná.
    /// </para>
    ///
    /// <para>
    /// Data se staví ručně, protože `PipniAsync` dnes prvky přepojuje sám
    /// — tou cestou by se vadný stav už nevyrobil.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Migrace_dozene_prvky_visici_na_prenastavene_boji()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvni, _) = await boje.PipniAsync(zavod.Id, Bod("otočná"), kdo.Id, default);
        var (druhy, _) = await boje.PipniAsync(zavod.Id, Bod("brána pravá"), kdo.Id, default);
        var (prvek, _) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Brana, 1, prvni!.Id, druhy!.Id), kdo.Id, default);

        // Vadný stav jako před 12. 10. 2026: přenastavení, které prvek
        // nechalo viset na starém záznamu. Dvakrát za sebou, ať se ověří
        // i to, že cyklus dojde na konec řetězu.
        var stary = await db.Boje.FirstAsync(b => b.Id == prvni.Id);
        var prostredni = new Boje
        {
            ZavodId = zavod.Id, Nazev = "otočná", Poradi = stary.Poradi,
            Sirka = 49.52, Delka = 14.17, PostavenaV = Ted, PostavilId = kdo.Id,
            NahrazujeId = stary.Id, NahrazenaV = Ted.AddMinutes(2),
        };
        db.Boje.Add(prostredni);
        stary.NahrazenaV = Ted.AddMinutes(1);
        await db.SaveChangesAsync();

        var nejnovejsi = new Boje
        {
            ZavodId = zavod.Id, Nazev = "otočná", Poradi = stary.Poradi,
            Sirka = 49.53, Delka = 14.18, PostavenaV = Ted, PostavilId = kdo.Id,
            NahrazujeId = prostredni.Id,
        };
        db.Boje.Add(nejnovejsi);
        await db.SaveChangesAsync();

        // Prvek pořád ukazuje na úplně první záznam — to je ta vada.
        var pred = await db.PrvkyTrati.AsNoTracking().FirstAsync(p => p.Id == prvek!.Id);
        Assert.Equal(stary.Id, pred.BojeAId);

        await db.Database.ExecuteSqlRawAsync(
            OrlickyPohar.Api.Migrations.PrvekNaAktualniBoji.OpravaSql);

        db.ChangeTracker.Clear();
        var po = await db.PrvkyTrati.AsNoTracking().FirstAsync(p => p.Id == prvek!.Id);
        Assert.Equal(nejnovejsi.Id, po.BojeAId);

        // Druhý konec nikdo nepřenastavoval, takže se nesmí hnout.
        Assert.Equal(druhy.Id, po.BojeBId);

        // A druhý běh nemá co dělat: migrace je idempotentní.
        await db.Database.ExecuteSqlRawAsync(
            OrlickyPohar.Api.Migrations.PrvekNaAktualniBoji.OpravaSql);
        db.ChangeTracker.Clear();
        var znovu = await db.PrvkyTrati.AsNoTracking().FirstAsync(p => p.Id == prvek!.Id);
        Assert.Equal(nejnovejsi.Id, znovu.BojeAId);
    }

    /// <summary>
    /// <b>Záznam, který byl v prvku, se po přenastavení drží.</b>
    /// `ZahodAsync` existuje kvůli překlepům — pípnuto a hned přenastaveno,
    /// nic na tom neviselo. Bóje, na kterou ukazoval prvek, ale překlep
    /// nebyla: je to doklad o tom, jak trať vypadala.
    ///
    /// <para>
    /// Bez téhle podmínky by ho smazalo **právě to přepojení**, protože ho
    /// uvolnilo: po něm už na starém záznamu nic nevisí.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Zaznam_z_prvku_zustane_v_historii_i_po_prenastaveni()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (levy, _) = await boje.PipniAsync(zavod.Id, Bod("start levobok"), kdo.Id, default);
        var (pravy, _) = await boje.PipniAsync(zavod.Id, Bod("start pravobok"), kdo.Id, default);
        await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Start, 1, levy!.Id, pravy!.Id), kdo.Id, default);

        await boje.PipniAsync(
            zavod.Id,
            new PipnutiVstup("start levobok", 0, 49.5205, 14.1702, 4, levy.Id),
            kdo.Id, default);

        var vse = await boje.SeznamAsync(zavod.Id, iHistorie: true, default);
        Assert.Contains(vse, b => b.Id == levy.Id);

        // Pro srovnání: bóje, která v žádném prvku nebyla, se po
        // přenastavení nedrží — tak to bylo odjakživa a nemění se to.
        var (volna, _) = await boje.PipniAsync(zavod.Id, Bod("jen tak"), kdo.Id, default);
        await boje.PipniAsync(
            zavod.Id,
            new PipnutiVstup("jen tak", 0, 49.5301, 14.1801, 4, volna!.Id),
            kdo.Id, default);

        var potom = await boje.SeznamAsync(zavod.Id, iHistorie: true, default);
        Assert.DoesNotContain(potom, b => b.Id == volna.Id);
    }

    [Fact]
    public async Task Dve_boje_se_spoji_do_startovni_cary()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (levy, _) = await boje.PipniAsync(zavod.Id, Bod("start levý"), kdo.Id, default);
        var (pravy, _) = await boje.PipniAsync(zavod.Id, Bod("start pravý"), kdo.Id, default);

        var (prvek, chyba) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Start, 1, levy!.Id, pravy!.Id,
            Poznamka: "projíždí se po proudu"), kdo.Id, default);

        Assert.Null(chyba);
        Assert.Equal(TypPrvku.Start, prvek!.Typ);
        Assert.Equal("start levý", prvek.A.Nazev);
        Assert.Equal("start pravý", prvek.B!.Nazev);
        Assert.Equal("projíždí se po proudu", prvek.Poznamka);
    }

    /// <summary>
    /// <b>Nebójový bod se zapíše jako záznam značky</b> (Filip, 10. 10. 2026:
    /// <i>„cíl mezi lodí a molem je dost pravděpodobný“</i>, a totéž u startu).
    /// Dřív z něj byly tři kolonky na prvku, takže molo ani loď komise neměly
    /// fotku ani historii — a prvnímu bodu to nešlo vůbec.
    /// <para>
    /// Druhý konec proto vyjde jako <c>B</c>, tedy jako značka se jménem
    /// a značením — sloupce se souřadnicemi na prvku už neexistují.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Nebojovy_bod_vznikne_jako_znacka()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        var (b, _) = await boje.PipniAsync(zavod.Id, Bod("start levý"), kdo.Id, default);

        // Bez popisu to nejde dál: záznam značky by neměl jméno a na vodě
        // by se nepoznalo, kam se pluje.
        var (bez, chybaBez) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Start, 1, b!.Id, KonecBSirka: 49.52, KonecBDelka: 14.17),
            kdo.Id, default);
        Assert.Null(bez);
        Assert.NotNull(chybaBez);

        var (prvek, chyba) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Start, 1, b.Id, KonecBSirka: 49.52, KonecBDelka: 14.17,
            KonecBPopis: "plavidlo komise", KonecBZnaceni: DruhZnaceni.Plavidlo),
            kdo.Id, default);

        Assert.Null(chyba);
        Assert.Equal("plavidlo komise", prvek!.B!.Nazev);
        Assert.Equal(DruhZnaceni.Plavidlo, prvek.B.Znaceni);

        // A je to doopravdy záznam té regaty: zdroj mapa, protože to byly
        // opsané souřadnice, a přesnost prázdná, protože nikdo neměřil.
        var znacka = await db.Boje.AsNoTracking().FirstAsync(x => x.Id == prvek.B.Id);
        Assert.Equal(zavod.Id, znacka.ZavodId);
        Assert.Equal(ZdrojPolohy.Mapa, znacka.Zdroj);
        Assert.Null(znacka.PresnostM);
        Assert.Equal(kdo.Id, znacka.PostavilId);
        // Značení se nedoplňuje jinak než ze vstupu.
        Assert.Equal(DruhZnaceni.Plavidlo, znacka.Znaceni);
    }

    /// <summary>
    /// Úprava, která by z bodu udělala <b>další</b> značku, i když prvek už
    /// jednu na druhém konci má, se odmítne nahlas. Tiché zdvojení by
    /// nechalo v seznamu značku, kterou nikdo nepostavil; tiché zahození
    /// bodu by zapřelo, co volající poslal.
    /// <para>Web tuhle cestu nevolá — prvky jen zakládá a maže.</para>
    /// </summary>
    [Fact]
    public async Task Uprava_nezdvoji_znacku_na_druhem_konci()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        var (a, _) = await boje.PipniAsync(zavod.Id, Bod("start levý"), kdo.Id, default);

        var (prvek, _) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Start, 1, a!.Id, KonecBSirka: 49.52, KonecBDelka: 14.17,
            KonecBPopis: "plavidlo komise"), kdo.Id, default);
        var znacek = await db.Boje.CountAsync(x => x.ZavodId == zavod.Id);

        var (nic, chyba) = await prvky.UpravAsync(zavod.Id, prvek!.Id, new PrvekVstup(
            TypPrvku.Start, 1, a.Id, KonecBSirka: 49.53, KonecBDelka: 14.18,
            KonecBPopis: "jiné plavidlo"), kdo.Id, default);

        Assert.Null(nic);
        Assert.NotNull(chyba);
        Assert.Equal(znacek, await db.Boje.CountAsync(x => x.ZavodId == zavod.Id));
    }

    [Fact]
    public async Task Sebrana_boje_do_prvku_nepatri()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (stoji, _) = await boje.PipniAsync(zavod.Id, Bod("bóje 1"), kdo.Id, default);
        var (pryc, _) = await boje.PipniAsync(zavod.Id, Bod("bóje 2"), kdo.Id, default);
        Assert.Null(await boje.SeberAsync(zavod.Id, pryc!.Id, default));

        var (prvek, chyba) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Brana, 1, stoji!.Id, pryc.Id), kdo.Id, default);

        Assert.Null(prvek);
        Assert.NotNull(chyba);
    }

    [Fact]
    public async Task Do_prijate_trati_se_prvkem_nesaha()
    {
        var (db, boje, trate, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (a, _) = await boje.PipniAsync(zavod.Id, Bod("bóje 1"), kdo.Id, default);
        var (zalozeny, _) = await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, a!.Id), kdo.Id, default);

        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        // Tentýž zámek jako u pípnutí: veřejně vydaná trať se nesmí
        // přeskládat pod lodí, která podle ní pluje.
        Assert.NotNull((await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 2, a.Id), kdo.Id, default)).Chyba);
        Assert.NotNull((await prvky.UpravAsync(
            zavod.Id, zalozeny!.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 9, a.Id),
            kdo.Id, default)).Chyba);
        Assert.NotNull(await prvky.SmazAsync(zavod.Id, zalozeny.Id, default));

        // A nic se nezměnilo.
        var porad = await prvky.SeznamAsync(zavod.Id, default);
        Assert.Equal(1, Assert.Single(porad).Poradi);
    }

    [Fact]
    public async Task Prvky_se_vydavaji_v_poradi_a_opakovat_se_smi()
    {
        // Trať start → A → brána → A → brána → cíl potřebuje tutéž značku
        // dvakrát. Právě to pole Poradi na bóji neuneslo.
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (a, _) = await boje.PipniAsync(zavod.Id, Bod("bóje A"), kdo.Id, default);

        var (prvni, chybaPrvni) = await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 0, a!.Id), kdo.Id, default);
        var (druhy, chybaDruhy) = await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 0, a.Id), kdo.Id, default);
        Assert.Null(chybaPrvni);
        Assert.Null(chybaDruhy);

        // Přečíslování na tutéž hodnotu: právě to pole Poradi na bóji neuneslo.
        Assert.Null((await prvky.UpravAsync(
            zavod.Id, druhy!.Id, new PrvekVstup(TypPrvku.OtocnaBoje, prvni!.Poradi, a.Id),
            kdo.Id, default)).Chyba);

        var seznam = await prvky.SeznamAsync(zavod.Id, default);

        Assert.Equal([1, 1], seznam.Select(p => p.Poradi).ToArray());
        Assert.All(seznam, p => Assert.Equal(a.Id, p.A.Id));
    }

    /// <summary>
    /// <b>Pořadí prvku určuje server, ne obrazovka.</b> Nový prvek patří na
    /// konec trati i tehdy, když klient pošle číslo, které si spočítal ze
    /// zastaralého seznamu.
    ///
    /// <para>
    /// Objeveno 15. 10. 2026 při průchodu scénáři Izolepy: obrazovka brala
    /// pořadí z délky seznamu, který měla vyrenderovaný
    /// (<c>boje/[zavod]/page.tsx</c>), a mezi pípnutím prvního bodu a
    /// dokončením prvku se překreslila s prázdným seznamem. Cíl postavený
    /// jako třetí tak dostal jedničku, stejnou jako start — a veřejná trať
    /// pak závodníkovi vypsala <c>start → cíl → otočka</c>.
    /// </para>
    ///
    /// <para>
    /// Test proto posílá <b>jedničku u každého prvku</b>: to je přesně ta
    /// hodnota, kterou vadná obrazovka posílala.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Poradi_noveho_prvku_urci_server_i_kdyz_klient_posle_jinak()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (levy, _) = await boje.PipniAsync(zavod.Id, Bod("start levobok"), kdo.Id, default);
        var (pravy, _) = await boje.PipniAsync(zavod.Id, Bod("start pravobok"), kdo.Id, default);
        var (otocna, _) = await boje.PipniAsync(zavod.Id, Bod("otočná"), kdo.Id, default);
        var (cilA, _) = await boje.PipniAsync(zavod.Id, Bod("cíl levobok"), kdo.Id, default);
        var (cilB, _) = await boje.PipniAsync(zavod.Id, Bod("cíl pravobok"), kdo.Id, default);

        var (start, _) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Start, 1, levy!.Id, pravy!.Id, Smer: SvetovaStrana.S,
            DruhStartu: DruhStartu.PevnaLinie), kdo.Id, default);
        var (toc, _) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.OtocnaBoje, 1, otocna!.Id, Strana: StranaPrvku.PoLeve), kdo.Id, default);
        var (cil, _) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Cil, 1, cilA!.Id, cilB!.Id, Smer: SvetovaStrana.J), kdo.Id, default);

        Assert.Equal(1, start!.Poradi);
        Assert.Equal(2, toc!.Poradi);
        Assert.Equal(3, cil!.Poradi);

        // A hlavně: trať se čte start → otočka → cíl, ne start → cíl → otočka.
        var seznam = await prvky.SeznamAsync(zavod.Id, default);
        Assert.Equal(
            [TypPrvku.Start, TypPrvku.OtocnaBoje, TypPrvku.Cil],
            seznam.Select(p => p.Typ).ToArray());
    }

    /// <summary>
    /// Posun prvku pořadí měnit <b>smí</b> — přečíslování trati je úprava,
    /// ne zakládání, a právě tudy chodí tlačítka „posunout nahoru/dolů".
    /// </summary>
    [Fact]
    public async Task Uprava_poradi_ho_zmeni_a_nula_se_odmitne()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (a, _) = await boje.PipniAsync(zavod.Id, Bod("bóje A"), kdo.Id, default);
        var (prvek, _) = await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, a!.Id), kdo.Id, default);

        var (posunuty, chyba) = await prvky.UpravAsync(
            zavod.Id, prvek!.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 7, a.Id), kdo.Id, default);
        Assert.Null(chyba);
        Assert.Equal(7, posunuty!.Poradi);

        var (_, nula) = await prvky.UpravAsync(
            zavod.Id, prvek.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 0, a.Id), kdo.Id, default);
        Assert.Equal("Pořadí v trati začíná jedničkou.", nula);
    }

    /// <summary>
    /// <b>Prvek se zakládá a maže na vybrané trati</b>, a zámek se ptá
    /// jí, ne nejnovější (testovací session, 16. 10. 2026).
    ///
    /// <para>
    /// Dokud měla regata jednu trať, byl rozdíl nulový. Od chvíle, kdy má
    /// každá rozjížďka svou, šel prvek založit na trať, kterou uživatel
    /// nevidí — a smazat prvek zamčené trati pod záminkou odemčené jiné.
    /// Přesně proti tomu stojí hlavička téhle třídy: veřejně vydaná trať
    /// se nesmí dát přeskládat pod lodí, která podle ní pluje.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Prvek_patri_vybrane_trati_a_zamek_se_pta_ji()
    {
        var (db, boje, trate, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (a, _) = await boje.PipniAsync(zavod.Id, Bod("A"), kdo.Id, default);
        Assert.Null((await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, a!.Id), kdo.Id, default)).Chyba);

        var prvni = (await trate.AktualniAsync(zavod.Id, default))!;
        prvni.Stav = StavTrati.Prijato;
        prvni.PrijatoV = DateTimeOffset.UnixEpoch;
        await db.SaveChangesAsync();

        // Druhá, odemčená trať. Ta je „nejnovější".
        await trate.DalsiAsync(zavod.Id, true, default);
        var druha = (await trate.AktualniAsync(zavod.Id, default))!;
        Assert.NotEqual(prvni.Id, druha.Id);

        // Zakládání s vybranou tratí: na přijaté musí odmítnout…
        Assert.NotNull((await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, a.Id), kdo.Id, default,
            prvni.Id)).Chyba);

        // …a na odemčené projít, a skončit právě na ní.
        Assert.Null((await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, a.Id), kdo.Id, default,
            druha.Id)).Chyba);
        Assert.Equal(1, await db.PrvkyTrati.CountAsync(x => x.TratId == druha.Id));

        // Mazání prvku zamčené trati neprojde ani tehdy, když je nejnovější
        // trať odemčená — dřív se zámek zeptal jí.
        var naPrijate = await db.PrvkyTrati.FirstAsync(x => x.TratId == prvni.Id);
        Assert.NotNull(await prvky.SmazAsync(zavod.Id, naPrijate.Id, default, prvni.Id));
        Assert.True(await db.PrvkyTrati.AnyAsync(x => x.Id == naPrijate.Id));
    }

    /// <summary>Bod prvku, který se pípne spolu s ním.</summary>
    private static BodPrvkuVstup Znacka(
        string nazev, double sirka = 49.516, double delka = 14.165,
        DateTimeOffset? postavenaV = null) =>
        new(nazev, sirka, delka, PresnostM: 5, PostavenaV: postavenaV);

    /// <summary>
    /// <b>Buď celý prvek, nebo nic.</b> Jedním požadavkem vzniknou obě
    /// značky i prvek nad nimi — to je ten rozdíl proti stavbě po krocích,
    /// kde se mezi pípnutími dá ztratit signál a ve vodě zůstane značka,
    /// kterou žádný prvek nepoužívá.
    /// </summary>
    [Fact]
    public async Task Postaveni_zalozi_prvek_i_obe_jeho_znacky()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvek, chyba, opakovane) = await prvky.PostavAsync(
            zavod.Id,
            new PostavPrvekVstup(
                Guid.CreateVersion7(), TypPrvku.Brana,
                [Znacka("brána 1 vlevo"), Znacka("brána 1 vpravo", 49.517, 14.166)]),
            kdo.Id, default);

        Assert.Null(chyba);
        Assert.False(opakovane);
        Assert.NotNull(prvek);
        Assert.Equal(TypPrvku.Brana, prvek!.Typ);
        Assert.Equal(1, prvek.Poradi);

        // Obě značky stojí ve vodě a prvek na ně ukazuje.
        Assert.Equal("brána 1 vlevo", prvek.A.Nazev);
        Assert.Equal("brána 1 vpravo", prvek.B!.Nazev);
        Assert.Equal(49.517, prvek.B.Sirka, 3);

        var naTrati = await boje.SeznamAsync(zavod.Id, iHistorie: false, default);
        Assert.Equal(2, naTrati.Count);

        // <b>Značky mají každá své pořadí.</b> Dokud se počítalo dotazem
        // na každou zvlášť, dostaly by oba konce brány totéž číslo —
        // žádný z nich v tu chvíli ještě není uložený.
        Assert.Equal([1, 2], naTrati.Select(b => b.Poradi).Order());
    }

    /// <summary>
    /// <b>Stavba začíná první značkou.</b> Regata bez jediné bóje trať
    /// nemá, a prvek postavený jedním požadavkem jí ji musí založit —
    /// jinak by první prvek neměl do čeho spadnout.
    /// </summary>
    [Fact]
    public async Task Postaveni_zalozi_trat_regate_bez_boji()
    {
        var (db, _, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        Assert.False(await db.Trate.AnyAsync(t => t.ZavodId == zavod.Id));

        var (prvek, chyba, _) = await prvky.PostavAsync(
            zavod.Id,
            new PostavPrvekVstup(
                Guid.CreateVersion7(), TypPrvku.OtocnaBoje, [Znacka("otočná 1")],
                Strana: StranaPrvku.PoLeve),
            kdo.Id, default);

        Assert.Null(chyba);
        Assert.NotNull(prvek);
        Assert.True(await db.Trate.AnyAsync(t => t.ZavodId == zavod.Id));
    }

    /// <summary>
    /// <b>Opakované odeslání téhož klíče nic nezdvojí.</b> Na vodě požadavek
    /// dojde a odpověď se ztratí; telefon pak neví, jestli prvek stojí,
    /// a pošle ho znovu. Bez klíče by na trati vznikl dvakrát, se dvěma
    /// sadami značek, a nikdo by nepoznal, která je ta ve vodě.
    /// </summary>
    [Fact]
    public async Task Opakovane_odeslani_tehoz_klice_postavi_jeden_prvek()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var klic = Guid.CreateVersion7();
        PostavPrvekVstup Vstup() => new(
            klic, TypPrvku.Start, [Znacka("start levobok"), Znacka("start pravobok", 49.518)],
            Smer: SvetovaStrana.J, DruhStartu: DruhStartu.PevnaLinie);

        var (poprve, chybaPoprve, bylOpakovany) = await prvky.PostavAsync(
            zavod.Id, Vstup(), kdo.Id, default);
        var (podruhe, chybaPodruhe, opakovane) = await prvky.PostavAsync(
            zavod.Id, Vstup(), kdo.Id, default);

        Assert.Null(chybaPoprve);
        Assert.Null(chybaPodruhe);
        Assert.False(bylOpakovany);

        // <b>Druhé odeslání není chyba, je to táž odpověď.</b> Odmítnout ho
        // konfliktem by znamenalo, že fronta v telefonu zůstane stát na
        // prvku, který už dávno stojí ve vodě.
        Assert.True(opakovane);
        Assert.Equal(poprve!.Id, podruhe!.Id);

        Assert.Single(await prvky.SeznamAsync(zavod.Id, default));
        Assert.Equal(2, (await boje.SeznamAsync(zavod.Id, iHistorie: true, default)).Count);
    }

    /// <summary>
    /// <b>Klíč od cizí regaty se nevrací.</b> Trefa do cizího klíče je
    /// buď vada klienta, nebo pokus; vydat prvek jiné regaty by byl únik.
    /// </summary>
    [Fact]
    public async Task Klic_patrici_jine_regate_se_nevrati()
    {
        var (db, _, _, prvky) = Sluzby();
        var (prvni, kdo) = await RegataAsync(db);
        var (druha, _) = await RegataAsync(db);

        var klic = Guid.CreateVersion7();
        await prvky.PostavAsync(
            prvni.Id,
            new PostavPrvekVstup(klic, TypPrvku.OtocnaBoje, [Znacka("otočná 1")]),
            kdo.Id, default);

        var (prvek, chyba, _) = await prvky.PostavAsync(
            druha.Id,
            new PostavPrvekVstup(klic, TypPrvku.OtocnaBoje, [Znacka("otočná 1")]),
            kdo.Id, default);

        Assert.Null(prvek);
        Assert.NotNull(chyba);
        Assert.Empty(await prvky.SeznamAsync(druha.Id, default));
    }

    /// <summary>
    /// <b>Do přijaté trati se nepostaví ani jedním požadavkem</b> — a co je
    /// důležitější, <b>nezůstanou po tom pokusu značky</b>. Kdyby se bóje
    /// zapsaly a prvek ne, stály by ve vodě záznamy, které si nikdo
    /// neobjednal, a obrazovka by je hlásila jako „mimo trať".
    /// </summary>
    [Fact]
    public async Task Postaveni_do_prijate_trati_nenecha_ani_znacky()
    {
        var (db, boje, trate, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (a, _) = await boje.PipniAsync(zavod.Id, Bod("bóje 1"), kdo.Id, default);
        await prvky.ZalozAsync(zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, a!.Id), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        var (prvek, chyba, _) = await prvky.PostavAsync(
            zavod.Id,
            new PostavPrvekVstup(
                Guid.CreateVersion7(), TypPrvku.Brana,
                [Znacka("brána 1 vlevo"), Znacka("brána 1 vpravo", 49.517)]),
            kdo.Id, default);

        Assert.Null(prvek);
        Assert.NotNull(chyba);
        Assert.Single(await prvky.SeznamAsync(zavod.Id, default));
        Assert.Single(await boje.SeznamAsync(zavod.Id, iHistorie: true, default));
    }

    /// <summary>
    /// <b>Čas pípnutí je ten z telefonu, ne čas nahrání.</b> Prvek z fronty
    /// dorazí, až telefon chytí síť; serverový čas by tvrdil, že se bóje
    /// postavila tehdy. Platí na to tatáž váha jako jinde —
    /// <c>CasKlienta</c> přijme jen čas v okně kolem serverového.
    /// </summary>
    [Fact]
    public async Task Postaveni_vezme_cas_z_telefonu()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        // Půl hodiny zpátky: tolik může prvek čekat ve frontě, než se
        // telefon dostane k signálu.
        var pipnuto = DateTimeOffset.UtcNow.AddMinutes(-30);

        var (prvek, chyba, _) = await prvky.PostavAsync(
            zavod.Id,
            new PostavPrvekVstup(
                Guid.CreateVersion7(), TypPrvku.OtocnaBoje,
                [Znacka("otočná 1", postavenaV: pipnuto)]),
            kdo.Id, default);

        Assert.Null(chyba);
        var zapsana = await db.Boje.FirstAsync(b => b.Id == prvek!.A.Id);
        Assert.Equal(pipnuto, zapsana.PostavenaV, TimeSpan.FromSeconds(1));
        Assert.Equal(OrlickyPohar.Api.Features.Spolecne.CasKlienta.Posun.Prijat, zapsana.PosunCasu);

        // A zápis je pozdější než postavení — jedno je měření, druhé doručení.
        Assert.True(zapsana.ZapsanaV > zapsana.PostavenaV);
    }

    /// <summary>
    /// <b>Bez klíče se nestaví.</b> Požadavek, který se z fronty dá poslat
    /// znovu, a nemá podle čeho poznat, že je to totéž, je past: druhé
    /// odeslání by postavilo druhý prvek.
    /// </summary>
    [Fact]
    public async Task Postaveni_bez_klice_neprojde()
    {
        var (db, _, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvek, chyba, _) = await prvky.PostavAsync(
            zavod.Id,
            new PostavPrvekVstup(Guid.Empty, TypPrvku.OtocnaBoje, [Znacka("otočná 1")]),
            kdo.Id, default);

        Assert.Null(prvek);
        Assert.NotNull(chyba);
    }

    /// <summary>
    /// <b>Pravidla pípnutí platí i tady.</b> Poloha mimo Orlík je nejčastěji
    /// prohozená šířka s délkou a postavila by bóji v Africe; nesmí projít
    /// jen proto, že přišla jinou cestou.
    /// </summary>
    [Fact]
    public async Task Postaveni_mimo_Orlik_neprojde_ani_tady()
    {
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvek, chyba, _) = await prvky.PostavAsync(
            zavod.Id,
            new PostavPrvekVstup(
                Guid.CreateVersion7(), TypPrvku.Brana,
                [Znacka("brána 1 vlevo"), Znacka("brána 1 vpravo", 14.165, 49.516)]),
            kdo.Id, default);

        Assert.Null(prvek);
        Assert.NotNull(chyba);

        // A ani první značka se nezapsala — pravidla se posoudí dřív, než
        // se do databáze sáhne.
        Assert.Empty(await boje.SeznamAsync(zavod.Id, iHistorie: true, default));
    }
}

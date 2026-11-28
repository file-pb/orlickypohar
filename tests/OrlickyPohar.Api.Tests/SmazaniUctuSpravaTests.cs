using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Trasy;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Samoobslužné smazání účtu proti reálnému PostgreSQL.
///
/// <para>
/// <b>Patří sem, a ne mezi čisté testy.</b> Celé smazání je jedna transakce
/// nad osmi tabulkami a jeho podstatná vlastnost je, <b>co přežilo</b> — a to
/// drží jen tam, kde jsou skutečné cizí klíče. In-memory provider by zelenou
/// dal i tehdy, kdyby smazání vzalo s sebou zápis z vody.
/// </para>
/// <para>
/// <b>Nic se neuklízí mazáním tabulek</b>, databázi sdílí celá kolekce. Každý
/// test si proto vyrábí vlastní ročník s vlastním slugem.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class SmazaniUctuSpravaTests(PostgresFixture fixture)
{
    private const string Vydavatel = "https://ucty.priklad.cz";
    private static readonly DateTimeOffset Ted = new(2026, 11, 22, 12, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, SmazaniUctu Smazani, Uzivatele Uzivatele) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (
            db,
            new SmazaniUctu(db, TimeProvider.System),
            scope.ServiceProvider.GetRequiredService<Uzivatele>());
    }

    /// <summary>
    /// Účet se vším, co se na něj za sezónu nalepí: přihlášení, role, loď,
    /// nárok, osoba s kontakty, přihláška s kontaktem — a vedle toho dvě
    /// věci ze závodu, které <b>musí přežít</b>: zápis z vody a vydaný
    /// mobilní klíč s nahranou trasou.
    /// </summary>
    private sealed record Podklad(
        Uzivatel Uzivatel, string Subjekt, Osoba Osoba, Lod Lod,
        Ucast Ucast, ZapisNavrh Zapis, KlicLodi Klic, Trasa Trasa);

    private static async Task<Podklad> PodkladAsync(AppDbContext db, Uzivatele uzivatele)
    {
        var jmeno = $"{Guid.NewGuid():N}"[..12];
        var subjekt = $"sub-{jmeno}";
        var email = $"smazani-{jmeno}@example.test";

        // Účet vzniká tou cestou, kterou vzniká doopravdy — přihlášením.
        // Tím se založí i vazba (vydavatel, subjekt), bez které by test
        // neověřil to podstatné: že se tím účtem po smazání nedá přihlásit.
        var uzivatel = await uzivatele.NajdiNeboZalozAsync(
            Vydavatel, subjekt, "Jan Smazaný", email, TimeProvider.System, default);

        var serie = new Serie { Nazev = $"Pohár {jmeno}", Rok = 2027, Slug = $"smazani-{jmeno}" };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var kategorie = new Kategorie { SerieId = serie.Id, Nazev = "Race", Poradi = 1 };
        db.Kategorie.Add(kategorie);

        var osoba = new Osoba
        {
            Jmeno = "Jan", Prijmeni = "Smazaný", UserId = uzivatel.Id,
        };
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();

        db.Set<KontaktOsoby>().Add(new KontaktOsoby
        {
            OsobaId = osoba.Id, Email = email, Telefon = "+420 777 000 111", ZadanoV = Ted,
        });

        var lod = new Lod { Nazev = $"Loď {jmeno}", MajitelId = osoba.Id };
        db.Lode.Add(lod);
        await db.SaveChangesAsync();

        var prihlaska = new Prihlaska
        {
            SerieId = serie.Id, LodId = lod.Id, KategorieId = kategorie.Id,
        };
        db.Prihlasky.Add(prihlaska);

        var zavod = new Zavod
        {
            SerieId = serie.Id, Nazev = $"Regata {jmeno}", Slug = $"regata-{jmeno}",
            Datum = new DateOnly(2027, 6, 5),
        };
        db.Zavody.Add(zavod);
        await db.SaveChangesAsync();

        var ucast = new Ucast
        {
            ZavodId = zavod.Id, PrihlaskaId = prihlaska.Id, KormidelnikId = osoba.Id,
            KontaktEmail = email, KontaktTelefon = "+420 777 000 111",
        };
        db.Ucasti.Add(ucast);

        db.VazbyKLodim.Add(new VazbaKLodi
        {
            LodId = lod.Id, UzivatelId = uzivatel.Id,
            Role = RoleKLodi.Kapitan, Puvod = PuvodVazby.Email, VzniklaV = Ted,
        });

        db.ZmenyRoli.Add(new ZmenaRoleKLodi
        {
            LodId = lod.Id, UzivatelId = uzivatel.Id,
            Predchozi = RoleKLodi.Posadka, Nova = RoleKLodi.Kapitan, ZmenenoV = Ted,
        });

        db.Naroky.Add(new NarokNaLod
        {
            LodId = lod.Id, UzivatelId = uzivatel.Id, Poznamka = "Kormidluju ji", PodanV = Ted,
        });

        db.Opravneni.Add(new Opravneni
        {
            UzivatelId = uzivatel.Id, Role = Role.Organizator,
            SerieId = serie.Id, ZavodId = zavod.Id, UdelenoV = Ted,
        });

        db.Pomocnici.Add(new Pomocnik
        {
            ZavodId = zavod.Id, UzivatelId = uzivatel.Id, OdV = Ted,
        });

        var rozjizdka = new Rozjizdka { ZavodId = zavod.Id, Cislo = 1 };
        db.Rozjizdky.Add(rozjizdka);

        var klic = new KlicLodi
        {
            LodId = lod.Id, Otisk = $"otisk-{jmeno}", Jmeno = "Telefon kapitána",
            VydalUcetId = uzivatel.Id, VydanV = Ted,
        };
        db.Klice.Add(klic);
        await db.SaveChangesAsync();

        // Zápis z vody je autorství v závodním záznamu — cizí klíč na účet
        // je `Cascade`, takže kdyby se mazal řádek uživatele, zmizel by s ním.
        var zapis = new ZapisNavrh
        {
            RozjizdkaId = rozjizdka.Id, UzivatelId = uzivatel.Id, ZapsanoV = Ted,
        };
        db.ZapisyNavrhu.Add(zapis);

        var trasa = new Trasa
        {
            LokalniId = $"trasa-{jmeno}", KlicId = klic.Id, LodId = lod.Id,
            LodNazev = lod.Nazev, ZavodId = zavod.Id, Zacatek = Ted,
            NahranoV = Ted, PosledniDavkaV = Ted, Dokoncena = true,
        };
        db.Trasy.Add(trasa);
        await db.SaveChangesAsync();

        return new Podklad(uzivatel, subjekt, osoba, lod, ucast, zapis, klic, trasa);
    }

    [Fact]
    public async Task Osobni_vazby_zmizi_a_ucet_zustane_bezejmenny()
    {
        var (db, smazani, uzivatele) = Sluzby();
        var p = await PodkladAsync(db, uzivatele);

        var uctenka = await smazani.SmazAsync(p.Uzivatel.Id, default);

        Assert.NotNull(uctenka);
        Assert.Equal(1, uctenka.Prihlaseni);
        Assert.Equal(1, uctenka.Opravneni);
        Assert.Equal(1, uctenka.VazebKLodim);
        Assert.Equal(1, uctenka.ZmenRoli);
        Assert.Equal(1, uctenka.Naroku);
        Assert.Equal(1, uctenka.Pomocniku);
        Assert.Equal(1, uctenka.OsobOdpojeno);
        Assert.Equal(1, uctenka.Kontaktu);
        Assert.Equal(1, uctenka.PrihlasekSKontaktem);

        // Nic z toho nesmí zůstat ani v databázi, ne jen v účtence.
        Assert.Empty(await db.Vazby.Where(v => v.UzivatelId == p.Uzivatel.Id).ToListAsync());
        Assert.Empty(await db.Opravneni.Where(o => o.UzivatelId == p.Uzivatel.Id).ToListAsync());
        Assert.Empty(await db.VazbyKLodim.Where(v => v.UzivatelId == p.Uzivatel.Id).ToListAsync());
        Assert.Empty(await db.ZmenyRoli.Where(z => z.UzivatelId == p.Uzivatel.Id).ToListAsync());
        Assert.Empty(await db.Naroky.Where(n => n.UzivatelId == p.Uzivatel.Id).ToListAsync());
        Assert.Empty(await db.Pomocnici.Where(x => x.UzivatelId == p.Uzivatel.Id).ToListAsync());

        // Náhrobek: řádek je, jméno a e-mail ne.
        var zbytek = await db.Uzivatele.AsNoTracking().FirstAsync(u => u.Id == p.Uzivatel.Id);
        Assert.Equal(SmazaniUctu.Nahrobek, zbytek.Zobrazovane);
        Assert.Null(zbytek.Email);
        Assert.NotNull(zbytek.SmazanV);
    }

    [Fact]
    public async Task Zavodni_zaznamy_prezijou_a_ukazuji_na_nahrobek()
    {
        var (db, smazani, uzivatele) = Sluzby();
        var p = await PodkladAsync(db, uzivatele);

        await smazani.SmazAsync(p.Uzivatel.Id, default);

        // Tohle je ten důvod, proč se řádek uživatele nemaže. Kdyby se mazal,
        // `Cascade` by zápis z vody vzal s sebou — a `Restrict` jinde by to
        // celé shodilo.
        var zapis = await db.ZapisyNavrhu.AsNoTracking().FirstOrDefaultAsync(z => z.Id == p.Zapis.Id);
        Assert.NotNull(zapis);
        Assert.Equal(p.Uzivatel.Id, zapis.UzivatelId);

        // Osoba závodníka zůstává — visí na ní výsledky. Odpojí se jen účet.
        var osoba = await db.Osoby.AsNoTracking().FirstOrDefaultAsync(o => o.Id == p.Osoba.Id);
        Assert.NotNull(osoba);
        Assert.Null(osoba.UserId);
    }

    [Fact]
    public async Task Trasa_i_klic_zustavaji_lodi()
    {
        var (db, smazani, uzivatele) = Sluzby();
        var p = await PodkladAsync(db, uzivatele);

        await smazani.SmazAsync(p.Uzivatel.Id, default);

        // Trasa patří lodi, ne člověku: nahrála ji posádka mobilním klíčem
        // a je podkladem k protestu pro celou loď. Maže ji retence, ne odchod
        // jednoho účtu (rozhodl Filip, 22. 11. 2026).
        Assert.NotNull(await db.Trasy.AsNoTracking().FirstOrDefaultAsync(t => t.Id == p.Trasa.Id));
        Assert.NotNull(await db.Klice.AsNoTracking().FirstOrDefaultAsync(k => k.Id == p.Klic.Id));
    }

    [Fact]
    public async Task Kontakty_zmizi_i_z_prihlasky()
    {
        var (db, smazani, uzivatele) = Sluzby();
        var p = await PodkladAsync(db, uzivatele);

        await smazani.SmazAsync(p.Uzivatel.Id, default);

        Assert.Empty(await db.Set<KontaktOsoby>()
            .Where(k => k.OsobaId == p.Osoba.Id).ToListAsync());

        var ucast = await db.Ucasti.AsNoTracking().FirstAsync(u => u.Id == p.Ucast.Id);
        Assert.Null(ucast.KontaktEmail);
        Assert.Null(ucast.KontaktTelefon);
    }

    [Fact]
    public async Task Kontakt_jineho_cloveka_na_tomtez_zavode_zustane()
    {
        var (db, smazani, uzivatele) = Sluzby();
        var p = await PodkladAsync(db, uzivatele);

        // Druhá loď na téže regatě s cizím kontaktem. Párování e-mailem
        // nesmí sahat dál, než kam patří.
        var cizi = new Osoba { Jmeno = "Petr", Prijmeni = "Zůstává" };
        db.Osoby.Add(cizi);
        await db.SaveChangesAsync();

        var ucast = await db.Ucasti.AsNoTracking().FirstAsync(u => u.Id == p.Ucast.Id);
        var ciziUcast = new Ucast
        {
            ZavodId = ucast.ZavodId, PrihlaskaId = ucast.PrihlaskaId,
            KormidelnikId = cizi.Id, KontaktEmail = "petr@example.test",
            KontaktTelefon = "+420 777 999 888",
        };
        db.Ucasti.Add(ciziUcast);
        await db.SaveChangesAsync();

        await smazani.SmazAsync(p.Uzivatel.Id, default);

        var zbyla = await db.Ucasti.AsNoTracking().FirstAsync(u => u.Id == ciziUcast.Id);
        Assert.Equal("petr@example.test", zbyla.KontaktEmail);
    }

    [Fact]
    public async Task Prihlaseni_tymz_subjektem_zaklada_novy_ucet()
    {
        var (db, smazani, uzivatele) = Sluzby();
        var p = await PodkladAsync(db, uzivatele);

        await smazani.SmazAsync(p.Uzivatel.Id, default);

        // Tohle je ta vlastnost, kvůli které se maže vazba (vydavatel,
        // subjekt): starý účet se nesmí „vzkřísit" příštím přihlášením.
        var znovu = await uzivatele.NajdiNeboZalozAsync(
            Vydavatel, p.Subjekt, "Jan Smazaný", "jan@example.test", TimeProvider.System, default);

        Assert.NotEqual(p.Uzivatel.Id, znovu.Id);
        Assert.Empty(await db.Opravneni.Where(o => o.UzivatelId == znovu.Id).ToListAsync());
        Assert.Empty(await db.VazbyKLodim.Where(v => v.UzivatelId == znovu.Id).ToListAsync());
    }

    [Fact]
    public async Task Druhe_smazani_uz_nic_nedela()
    {
        var (db, smazani, uzivatele) = Sluzby();
        var p = await PodkladAsync(db, uzivatele);

        Assert.NotNull(await smazani.SmazAsync(p.Uzivatel.Id, default));

        // Druhé odeslání téhož formuláře nesmí skončit chybou ani druhou
        // účtenkou, ve které by stály nuly jako výsledek práce.
        Assert.Null(await smazani.SmazAsync(p.Uzivatel.Id, default));
    }

    [Fact]
    public async Task Neznamy_ucet_vrati_nic()
    {
        var (_, smazani, _) = Sluzby();
        Assert.Null(await smazani.SmazAsync(Guid.CreateVersion7(), default));
    }

    /// <summary>
    /// Uživatelé s vlastní konfigurací stropu. Limity se berou relativně
    /// k tomu, co v databázi zrovna je — <b>kolekce ji sdílí</b>, takže
    /// absolutní číslo by záviselo na tom, co stihly ostatní testy.
    /// </summary>
    private static Uzivatele SeStropem(AppDbContext db, int? nejvic = null, int? zaDen = null) =>
        new(db, new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Identita:NejvicUctu"] = (nejvic ?? 0).ToString(),
            ["Identita:NejvicUctuZaDen"] = (zaDen ?? 0).ToString(),
        }).Build());

    [Fact]
    public async Task Strop_zastavi_zakladani_novych_uctu()
    {
        var (db, _, _) = Sluzby();
        var zivych = await db.Uzivatele.CountAsync(u => u.SmazanV == null);

        // Strop přesně na dnešním počtu: další účet se už nesmí založit.
        var plno = SeStropem(db, nejvic: zivych);

        var chyba = await Assert.ThrowsAsync<UctuJePlno>(() => plno.NajdiNeboZalozAsync(
            Vydavatel, $"sub-strop-{Guid.NewGuid():N}", "Nový", "novy@example.test",
            TimeProvider.System, default));

        Assert.Contains(zivych.ToString(), chyba.Message);
    }

    [Fact]
    public async Task Pod_stropem_se_zaklada_dal()
    {
        var (db, _, _) = Sluzby();
        var zivych = await db.Uzivatele.CountAsync(u => u.SmazanV == null);

        // Kontrola obráceně: strop o jeden výš musí jeden účet pustit. Bez
        // ní by test výš prošel i tehdy, kdyby se nezakládalo nikdy.
        var jdeTo = SeStropem(db, nejvic: zivych + 1);

        var uzivatel = await jdeTo.NajdiNeboZalozAsync(
            Vydavatel, $"sub-pod-stropem-{Guid.NewGuid():N}", "Nový", "novy2@example.test",
            TimeProvider.System, default);

        Assert.NotEqual(Guid.Empty, uzivatel.Id);
    }

    [Fact]
    public async Task Denni_rozpocet_zastavi_zakladani()
    {
        var (db, _, _) = Sluzby();
        var odPolnoci = StropUctu.OdPolnoci(DateTimeOffset.UtcNow);
        var dnes = await db.Uzivatele.CountAsync(u => u.ZalozenV >= odPolnoci);

        var vycerpano = SeStropem(db, zaDen: dnes);

        await Assert.ThrowsAsync<UctuJePlno>(() => vycerpano.NajdiNeboZalozAsync(
            Vydavatel, $"sub-rozpocet-{Guid.NewGuid():N}", "Nový", "novy3@example.test",
            TimeProvider.System, default));
    }

    [Fact]
    public async Task Znamy_ucet_se_pres_strop_dostane()
    {
        var (db, _, uzivatele) = Sluzby();
        var subjekt = $"sub-znamy-{Guid.NewGuid():N}";

        var prvni = await uzivatele.NajdiNeboZalozAsync(
            Vydavatel, subjekt, "Jan Známý", "znamy@example.test", TimeProvider.System, default);

        // Tohle je ta vlastnost, kvůli které strop smí existovat: <b>nesmí
        // vyhodit toho, kdo účet už má</b>. Jinak by z brzdy proti zátěži
        // byla závora před lidmi, kteří se zrovna chtějí přihlásit.
        var plno = SeStropem(db, nejvic: 1, zaDen: 1);

        var druhe = await plno.NajdiNeboZalozAsync(
            Vydavatel, subjekt, "Jan Známý", "znamy@example.test", TimeProvider.System, default);

        Assert.Equal(prvni.Id, druhe.Id);
    }
}

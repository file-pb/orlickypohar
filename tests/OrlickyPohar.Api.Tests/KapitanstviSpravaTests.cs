using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Určování kapitána proti reálnému PostgreSQL. Patří sem, a ne mezi čisté
/// testy, ze dvou důvodů: převod je jedna transakce a pravidlo o posledním
/// kapitánovi drží jen pod zámkem řádku lodi. Ani jedno by in-memory
/// provider neověřil — a právě tam vzniká loď bez kapitána.
/// <para>
/// <b>Nic se neuklízí mazáním tabulek</b>, databázi sdílí celá kolekce.
/// Každý test si vyrobí vlastní ročník, loď a účty.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class KapitanstviSpravaTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 5, 12, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, KapitanstviSprava Sprava, KodySprava Kody) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (
            db,
            new KapitanstviSprava(db, TimeProvider.System, NullLogger<KapitanstviSprava>.Instance),
            new KodySprava(db, TimeProvider.System, NullLogger<KodySprava>.Instance));
    }

    /// <summary>Ročník s jednou lodí v jedné kategorii — podklad obrazovky správce.</summary>
    private static async Task<(Serie Serie, Lod Lod)> RocnikSLodiAsync(AppDbContext db)
    {
        var jmeno = $"{Guid.NewGuid():N}"[..12];

        var serie = new Serie { Nazev = $"Pohár {jmeno}", Rok = 2027, Slug = $"kapitan-{jmeno}" };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var kategorie = new Kategorie { SerieId = serie.Id, Nazev = "Race", Poradi = 1 };
        db.Kategorie.Add(kategorie);

        var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = "Testovací" };
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();

        var lod = new Lod { Nazev = $"Loď {jmeno}", MajitelId = osoba.Id };
        db.Lode.Add(lod);
        await db.SaveChangesAsync();

        db.Prihlasky.Add(new Prihlaska
        {
            SerieId = serie.Id, LodId = lod.Id, KategorieId = kategorie.Id,
        });
        await db.SaveChangesAsync();

        return (serie, lod);
    }

    private static async Task<Uzivatel> UcetAsync(AppDbContext db, string jmeno = "Účet")
    {
        var uzivatel = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = jmeno,
            Email = $"kapitanstvi-{Guid.NewGuid():N}@example.test",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(uzivatel);
        await db.SaveChangesAsync();
        return uzivatel;
    }

    private static Task<RoleKLodi?> RoleAsync(AppDbContext db, int lodId, Guid uzivatelId) =>
        db.VazbyKLodim
            .Where(v => v.LodId == lodId && v.UzivatelId == uzivatelId)
            .Select(v => (RoleKLodi?)v.Role)
            .FirstOrDefaultAsync();

    [Fact]
    public async Task Spravce_urci_kapitana_z_posadky()
    {
        var (db, sprava, kody) = Sluzby();
        var (_, lod) = await RocnikSLodiAsync(db);
        var spravce = await UcetAsync(db, "Správce");
        var kod = await kody.VystavAsync(lod.Id, spravce.Id, default);
        var posadka = await UcetAsync(db, "Posádka");
        await kody.PripojAsync(kod.Kod, posadka.Id, default);

        var chyba = await sprava.UrciKapitanaAsync(lod.Id, posadka.Id, spravce.Id, default);

        Assert.Null(chyba);
        Assert.Equal(RoleKLodi.Kapitan, await RoleAsync(db, lod.Id, posadka.Id));
    }

    [Fact]
    public async Task Spravce_urci_kapitanem_i_toho_kdo_k_lodi_jeste_nepatri()
    {
        // Nouzová páka, kterou `PuvodVazby.Rucne` popisoval, ale nikdo
        // neimplementoval. Bez ní se loď bez jediné vazby nedala zachránit.
        var (db, sprava, _) = Sluzby();
        var (_, lod) = await RocnikSLodiAsync(db);
        var spravce = await UcetAsync(db, "Správce");
        var kapitan = await UcetAsync(db, "Kapitán");

        Assert.Null(await sprava.UrciKapitanaAsync(lod.Id, kapitan.Id, spravce.Id, default));

        var vazba = await db.VazbyKLodim
            .FirstAsync(v => v.LodId == lod.Id && v.UzivatelId == kapitan.Id);
        Assert.Equal(RoleKLodi.Kapitan, vazba.Role);
        Assert.Equal(PuvodVazby.Rucne, vazba.Puvod);
        Assert.True(vazba.RoleUrcenaRucne);
    }

    [Fact]
    public async Task Chybne_urceneho_kapitana_jde_nahradit()
    {
        // Přesně ten scénář z nálezu A: kód udělal kapitána ze člena posádky.
        // Dřív se to nedalo opravit ničím mimo databázi.
        var (db, sprava, kody) = Sluzby();
        var (_, lod) = await RocnikSLodiAsync(db);
        var spravce = await UcetAsync(db, "Správce");
        var kod = await kody.VystavAsync(lod.Id, spravce.Id, default);
        var omylem = await UcetAsync(db, "První u stolu");
        var skutecny = await UcetAsync(db, "Skutečný kapitán");
        await kody.PripojAsync(kod.Kod, omylem.Id, default);
        await kody.PripojAsync(kod.Kod, skutecny.Id, default);
        await sprava.UrciKapitanaAsync(lod.Id, omylem.Id, spravce.Id, default);

        var chyba = await sprava.UrciKapitanaAsync(lod.Id, skutecny.Id, spravce.Id, default);

        Assert.Null(chyba);
        Assert.Equal(RoleKLodi.Kapitan, await RoleAsync(db, lod.Id, skutecny.Id));
        // Dosavadní kapitán spadl na posádku v tomtéž úkonu, ne druhým krokem.
        Assert.Equal(RoleKLodi.Posadka, await RoleAsync(db, lod.Id, omylem.Id));
    }

    [Fact]
    public async Task Prevod_majitele_nesnizi()
    {
        var (db, sprava, _) = Sluzby();
        var (_, lod) = await RocnikSLodiAsync(db);
        var spravce = await UcetAsync(db, "Správce");
        var majitel = await UcetAsync(db, "Majitel");
        var kapitan = await UcetAsync(db, "Kapitán");

        db.VazbyKLodim.Add(new VazbaKLodi
        {
            LodId = lod.Id, UzivatelId = majitel.Id, Role = RoleKLodi.Majitel,
            Puvod = PuvodVazby.Email, VzniklaV = Ted,
        });
        await db.SaveChangesAsync();

        Assert.Null(await sprava.UrciKapitanaAsync(lod.Id, kapitan.Id, spravce.Id, default));

        // Vlastnictví je fakt o ročníku, ne pravomoc k předání.
        Assert.Equal(RoleKLodi.Majitel, await RoleAsync(db, lod.Id, majitel.Id));
        Assert.Equal(RoleKLodi.Kapitan, await RoleAsync(db, lod.Id, kapitan.Id));
    }

    [Fact]
    public async Task Zmena_role_zaznamena_autora_cas_i_obe_role()
    {
        var (db, sprava, kody) = Sluzby();
        var (serie, lod) = await RocnikSLodiAsync(db);
        var spravce = await UcetAsync(db, "Správce");
        var kod = await kody.VystavAsync(lod.Id, spravce.Id, default);
        var clovek = await UcetAsync(db, "Posádka");
        await kody.PripojAsync(kod.Kod, clovek.Id, default);

        await sprava.UrciKapitanaAsync(lod.Id, clovek.Id, spravce.Id, default);

        var detail = await sprava.DetailAsync(serie.Id, lod.Id, default);
        var zmena = Assert.Single(detail!.Zmeny);
        Assert.Equal("Posádka", zmena.Kdo);
        Assert.Equal(RoleKLodi.Posadka, zmena.Predchozi);
        Assert.Equal(RoleKLodi.Kapitan, zmena.Nova);
        Assert.Equal("Správce", zmena.Zmenil);
        Assert.NotEqual(default, zmena.ZmenenoV);
    }

    [Fact]
    public async Task Posledniho_kapitana_snizit_nejde()
    {
        var (db, sprava, _) = Sluzby();
        var (_, lod) = await RocnikSLodiAsync(db);
        var spravce = await UcetAsync(db, "Správce");
        var kapitan = await UcetAsync(db, "Kapitán");
        await sprava.UrciKapitanaAsync(lod.Id, kapitan.Id, spravce.Id, default);

        var vazba = await db.VazbyKLodim.FirstAsync(v => v.UzivatelId == kapitan.Id);
        var chyba = await sprava.ZmenRoliAsync(
            lod.Id, vazba.Id, RoleKLodi.Posadka, spravce.Id, default);

        Assert.Equal(Kapitanstvi.PosledniOdpovedny, chyba);
        Assert.Equal(RoleKLodi.Kapitan, await RoleAsync(db, lod.Id, kapitan.Id));
    }

    [Fact]
    public async Task Potvrzeni_kapitana_od_kodu_ho_sunda_ze_seznamu_ke_kontrole()
    {
        var (db, sprava, kody) = Sluzby();
        var (serie, lod) = await RocnikSLodiAsync(db);
        var spravce = await UcetAsync(db, "Správce");
        var kod = await kody.VystavAsync(lod.Id, spravce.Id, default);
        var clovek = await UcetAsync(db, "Kapitán od kódu");
        await kody.PripojAsync(kod.Kod, clovek.Id, default);

        // Loď z doby před opravou: kapitán od kódu, nikdo ho nepotvrdil.
        var vazba = await db.VazbyKLodim.FirstAsync(v => v.UzivatelId == clovek.Id);
        vazba.Role = RoleKLodi.Kapitan;
        await db.SaveChangesAsync();

        var pred = (await sprava.SeznamAsync(serie.Id, default)).Single(l => l.LodId == lod.Id);
        Assert.True(pred.KeKontrole);

        Assert.Null(await sprava.ZmenRoliAsync(
            lod.Id, vazba.Id, RoleKLodi.Kapitan, spravce.Id, default));

        var po = (await sprava.SeznamAsync(serie.Id, default)).Single(l => l.LodId == lod.Id);
        Assert.False(po.KeKontrole);
        Assert.True(po.MaKapitana);
    }

    [Fact]
    public async Task Dva_soubezne_prevody_nechaji_lodi_prave_jednoho_kapitana()
    {
        // Bez zámku řádku lodi si oba požadavky přečtou tentýž výchozí stav
        // a loď skončí se dvěma kapitány, nebo s žádným.
        var (db, _, _) = Sluzby();
        var (_, lod) = await RocnikSLodiAsync(db);
        var spravce = await UcetAsync(db, "Správce");
        var prvni = await UcetAsync(db, "První");
        var druhy = await UcetAsync(db, "Druhý");

        // Vlastní služby nad vlastním spojením: jeden DbContext požadavky
        // neserializuje jako dva souběžné požadavky na API.
        var (_, spravaA, _) = Sluzby();
        var (_, spravaB, _) = Sluzby();

        await Task.WhenAll(
            spravaA.UrciKapitanaAsync(lod.Id, prvni.Id, spravce.Id, default),
            spravaB.UrciKapitanaAsync(lod.Id, druhy.Id, spravce.Id, default));

        var kapitani = await db.VazbyKLodim
            .Where(v => v.LodId == lod.Id
                        && (v.Role == RoleKLodi.Kapitan || v.Role == RoleKLodi.Majitel))
            .ToListAsync();

        Assert.Single(kapitani);
    }

    [Fact]
    public async Task Dve_soubezna_odebrani_nenechaji_lod_bez_kapitana()
    {
        var (db, sprava, _) = Sluzby();
        var (_, lod) = await RocnikSLodiAsync(db);
        var spravce = await UcetAsync(db, "Správce");
        var a = await UcetAsync(db, "Kapitán A");
        var b = await UcetAsync(db, "Kapitán B");

        await sprava.UrciKapitanaAsync(lod.Id, a.Id, spravce.Id, default);
        // Druhý kapitán rovnou do databáze: převod by prvního snížil, a my
        // chceme loď, která má dva odpovědné a oba se odebírají naráz.
        db.VazbyKLodim.Add(new VazbaKLodi
        {
            LodId = lod.Id, UzivatelId = b.Id, Role = RoleKLodi.Kapitan,
            Puvod = PuvodVazby.Rucne, VzniklaV = Ted,
            RoleUrcilId = spravce.Id, RoleUrcenaV = Ted,
        });
        await db.SaveChangesAsync();

        var vazbaA = await db.VazbyKLodim.FirstAsync(v => v.UzivatelId == a.Id);
        var vazbaB = await db.VazbyKLodim.FirstAsync(v => v.UzivatelId == b.Id);

        var (_, _, kodyA) = Sluzby();
        var (_, _, kodyB) = Sluzby();

        await Task.WhenAll(
            kodyA.OdeberAsync(lod.Id, vazbaA.Id, default, spravce.Id),
            kodyB.OdeberAsync(lod.Id, vazbaB.Id, default, spravce.Id));

        var zbyva = await db.VazbyKLodim
            .Where(v => v.LodId == lod.Id
                        && (v.Role == RoleKLodi.Kapitan || v.Role == RoleKLodi.Majitel))
            .ToListAsync();

        Assert.Single(zbyva);
    }
}

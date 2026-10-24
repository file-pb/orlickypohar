using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Mobilní klíče k lodi proti reálnému PostgreSQL.
/// <para>
/// Jádro věci: <b>QR nenese klíč, ale jednorázovou pozvánku</b>. Kód se dá
/// vyfotit přes rameno nebo zůstat na papíře na stole, takže co se uplatní
/// jednou, podruhé neprojde.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class KliceTests(PostgresFixture fixture)
{
    private (AppDbContext Db, KliceSprava Klice) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (db, new KliceSprava(db, TimeProvider.System));
    }

    private static async Task<(Guid Kapitan, int LodId)> LodSKapitanemAsync(AppDbContext db)
    {
        var u = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Kapitán" };
        var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = "Testovací" };
        db.Uzivatele.Add(u);
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();

        // Loď musí mít majitele, MajitelId není nullable.
        var lod = new Lod { Nazev = $"LUNA {Guid.NewGuid():N}"[..20], MajitelId = osoba.Id };
        db.Lode.Add(lod);
        await db.SaveChangesAsync();

        db.VazbyKLodim.Add(new VazbaKLodi
        {
            LodId = lod.Id,
            UzivatelId = u.Id,
            Role = RoleKLodi.Kapitan,
            Puvod = PuvodVazby.Kod,
            VzniklaV = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
        return (u.Id, lod.Id);
    }

    /// <summary>Regata s jednou přihlášenou lodí. Víc k pořadatelovu výpisu netřeba.</summary>
    private static async Task<(int ZavodId, int LodId)> RegataSLodiAsync(
        AppDbContext db, int lodId)
    {
        var znacka = Guid.NewGuid().ToString("N")[..8];
        var serie = new Serie { Slug = $"klice-{znacka}", Nazev = "Klíčová série", Rok = 2027 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var kategorie = new Kategorie { SerieId = serie.Id, Nazev = "Kajutové" };
        db.Kategorie.Add(kategorie);
        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{znacka}",
            Nazev = "Klíčová regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);
        await db.SaveChangesAsync();

        db.Prihlasky.Add(new Prihlaska
        {
            SerieId = serie.Id, LodId = lodId, KategorieId = kategorie.Id,
        });
        await db.SaveChangesAsync();

        var prihlaska = db.Prihlasky.Single(p => p.SerieId == serie.Id && p.LodId == lodId);
        db.Ucasti.Add(new Ucast { ZavodId = zavod.Id, PrihlaskaId = prihlaska.Id });
        await db.SaveChangesAsync();

        return (zavod.Id, lodId);
    }

    /// <summary>
    /// <b>Pořadatel vidí celé pole, ne jen lodě s klíčem.</b> Otázka před
    /// procedurou zní „má celé pole zapnutý tracker?", a na tu loď chybějící
    /// ve výpisu neodpovídá — stejný důvod, proč celé pole vrací i snímek
    /// poloh.
    /// </summary>
    [Fact]
    public async Task Poradatel_vidi_klice_celeho_pole()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var (zavod, _) = await RegataSLodiAsync(db, lod);

        // Druhá loď na téže regatě, bez jediného klíče.
        var (_, bezKlice) = await LodSKapitanemAsync(db);
        var prihlaska = new Prihlaska
        {
            SerieId = db.Zavody.Single(z => z.Id == zavod).SerieId,
            LodId = bezKlice,
            KategorieId = db.Kategorie.First(k => k.SerieId == db.Zavody.Single(z => z.Id == zavod).SerieId).Id,
        };
        db.Prihlasky.Add(prihlaska);
        await db.SaveChangesAsync();
        db.Ucasti.Add(new Ucast { ZavodId = zavod, PrihlaskaId = prihlaska.Id });
        await db.SaveChangesAsync();

        var pozvanka = await klice.PozviAsync(lod, kapitan, "Tonda", default);
        await klice.UplatniAsync(pozvanka.Kod, default);

        var pole = await klice.ProRegatuAsync(zavod, default);

        Assert.Equal(2, pole.Count);
        Assert.Single(pole.Single(l => l.LodId == lod).Klice);
        Assert.Empty(pole.Single(l => l.LodId == bezKlice).Klice);
    }

    /// <summary>
    /// <b>Role na jedné regatě neotvírá cizí lodě.</b> Pořadatel sáhne jen
    /// na klíč lodi, která tu regatu doopravdy jede — jinak by pověření
    /// k jedné zastávce znamenalo přístup k telefonům celého seriálu.
    /// </summary>
    [Fact]
    public async Task Na_cizi_lod_poradatel_nedosahne()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var (zavod, _) = await RegataSLodiAsync(db, lod);

        var (cizikapitan, ciziLod) = await LodSKapitanemAsync(db);
        var ciziPozvanka = await klice.PozviAsync(ciziLod, cizikapitan, "Cizí", default);
        await klice.UplatniAsync(ciziPozvanka.Kod, default);
        var ciziKlic = (await klice.SeznamAsync(ciziLod, default)).Single().Id;

        var pozvanka = await klice.PozviAsync(lod, kapitan, "Tonda", default);
        await klice.UplatniAsync(pozvanka.Kod, default);
        var mujKlic = (await klice.SeznamAsync(lod, default)).Single().Id;

        Assert.NotNull(await klice.NaRegateAsync(zavod, mujKlic, default));
        Assert.Null(await klice.NaRegateAsync(zavod, ciziKlic, default));
    }

    /// <summary>Požadavek s klíčem v hlavičce — tak, jak ho posílá telefon.</summary>
    private static HttpContext Kontext(string klic)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Headers[KliceSprava.Hlavicka] = klic;
        return ctx;
    }

    /// <summary>
    /// <b>Kdo odjíždí, vypne si to sám.</b> Plán to žádá větou, ne poznámkou
    /// pod čarou, a držitel klíče k tomu nemá účet — jen klíč.
    /// <para>
    /// Podstatné je, že je to <b>obousměrné</b>: odepnutý klíč posílat nesmí,
    /// ale mluvit sám o sobě ano. Kdyby <c>ProSebeAsync</c> odmítal odepnutý
    /// klíč stejně jako <c>OverAsync</c>, bylo by odepnutí jednosměrné a
    /// k ničemu právě v tom případě, kvůli kterému vzniklo — *„odjel po
    /// prvním dni domů"* a příští den jede zas.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Drzitel_klice_se_odepne_i_pripne_sam()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var pozvanka = await klice.PozviAsync(lod, kapitan, "Tonda", default);
        var uplatneni = await klice.UplatniAsync(pozvanka.Kod, default);
        Assert.NotNull(uplatneni);

        var muj = await klice.ProSebeAsync(Kontext(uplatneni!.Klic), default);
        Assert.NotNull(muj);
        Assert.False(await klice.SledujSamAsync(muj!, false, default));

        // Odepnutý klíč neposílá — pro nahrávání dopadne jako neexistující.
        Assert.Null(await klice.OverAsync(uplatneni.Klic, default));

        // Ale o sobě mluvit smí, jinak by nebylo jak se vrátit.
        var znovu = await klice.ProSebeAsync(Kontext(uplatneni.Klic), default);
        Assert.NotNull(znovu);
        Assert.True(await klice.SledujSamAsync(znovu!, true, default));
        Assert.NotNull(await klice.OverAsync(uplatneni.Klic, default));
    }

    /// <summary>
    /// <b>Odebraný klíč se sám neoživí.</b> Odepnutí je „dneska nejedu",
    /// odebrání je odchod z posádky — a o tom rozhoduje kapitán, ne telefon.
    /// </summary>
    [Fact]
    public async Task Odebrany_klic_se_sam_nepripne()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var pozvanka = await klice.PozviAsync(lod, kapitan, "Tonda", default);
        var uplatneni = await klice.UplatniAsync(pozvanka.Kod, default);
        Assert.NotNull(uplatneni);

        var klicId = (await klice.SeznamAsync(lod, default)).Single().Id;
        Assert.True(await klice.OdeberAsync(lod, klicId, default));

        Assert.Null(await klice.ProSebeAsync(Kontext(uplatneni!.Klic), default));
    }

    /// <summary>Bez hlavičky a s vymyšleným klíčem dopadne dotaz stejně.</summary>
    [Fact]
    public async Task Bez_klice_se_o_sobe_nedozvi_nikdo()
    {
        var (_, klice) = Sluzby();

        Assert.Null(await klice.ProSebeAsync(new DefaultHttpContext(), default));
        Assert.Null(await klice.ProSebeAsync(Kontext("vymyslene"), default));
    }

    [Fact]
    public async Task Pozvanka_se_da_uplatnit_jen_jednou()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);

        var pozvanka = await klice.PozviAsync(lod, kapitan, "Tonda", default);
        var prvni = await klice.UplatniAsync(pozvanka.Kod, default);
        var druhy = await klice.UplatniAsync(pozvanka.Kod, default);

        Assert.NotNull(prvni);
        Assert.Equal(lod, prvni!.LodId);
        Assert.Equal("Tonda", prvni.Jmeno);
        Assert.Null(druhy);
    }

    [Fact]
    public async Task Vymyslena_pozvanka_dopadne_stejne_jako_uplatnena()
    {
        var (_, klice) = Sluzby();

        // Obojí vrací null: z odpovědi se nesmí dát vyčíst, jestli kód
        // existoval.
        Assert.Null(await klice.UplatniAsync("tohle-nikdy-nebylo", default));
    }

    [Fact]
    public async Task Tajemstvi_se_v_databazi_neuklada_citelne()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);

        var pozvanka = await klice.PozviAsync(lod, kapitan, null, default);
        var uplatneni = await klice.UplatniAsync(pozvanka.Kod, default);

        // Kdyby se databáze dostala ven, s otiskem nikdo polohy neposílá.
        Assert.False(await db.Pozvanky.AnyAsync(p => p.Otisk == pozvanka.Kod));
        Assert.False(await db.Klice.AnyAsync(k => k.Otisk == uplatneni!.Klic));
    }

    [Fact]
    public async Task Klic_se_overi_a_zapise_si_posledni_pouziti()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var uplatneni = await klice.UplatniAsync(
            (await klice.PozviAsync(lod, kapitan, null, default)).Kod, default);

        var overeny = await klice.OverAsync(uplatneni!.Klic, default);

        Assert.NotNull(overeny);
        Assert.Equal(lod, overeny!.LodId);
        Assert.NotNull(overeny.PosledniPouzitiV);
    }

    [Fact]
    public async Task Odepnuty_klic_neprojde_ale_pripnuti_ho_vrati()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var uplatneni = await klice.UplatniAsync(
            (await klice.PozviAsync(lod, kapitan, null, default)).Kod, default);
        var klic = (await klice.OverAsync(uplatneni!.Klic, default))!;

        // Dočasné odepnutí: člen posádky zůstává, jen tuhle regatu nejede.
        Assert.True(await klice.SledujAsync(lod, klic.Id, false, default));
        Assert.Null(await klice.OverAsync(uplatneni.Klic, default));

        Assert.True(await klice.SledujAsync(lod, klic.Id, true, default));
        Assert.NotNull(await klice.OverAsync(uplatneni.Klic, default));
    }

    [Fact]
    public async Task Odebrany_klic_uz_nejde_ozivit()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var uplatneni = await klice.UplatniAsync(
            (await klice.PozviAsync(lod, kapitan, null, default)).Kod, default);
        var klic = (await klice.OverAsync(uplatneni!.Klic, default))!;

        Assert.True(await klice.OdeberAsync(lod, klic.Id, default));
        Assert.Null(await klice.OverAsync(uplatneni.Klic, default));

        // Připnutí odebraného klíče nesmí projít — odchod z posádky je
        // trvalý, na rozdíl od odepnutí ze sledování.
        Assert.False(await klice.SledujAsync(lod, klic.Id, true, default));
        Assert.Null(await klice.OverAsync(uplatneni.Klic, default));
    }

    [Fact]
    public async Task Klice_jine_lodi_nejdou_odebrat()
    {
        var (db, klice) = Sluzby();
        var (kapitan, moje) = await LodSKapitanemAsync(db);
        var (_, cizi) = await LodSKapitanemAsync(db);
        var uplatneni = await klice.UplatniAsync(
            (await klice.PozviAsync(moje, kapitan, null, default)).Kod, default);
        var klic = (await klice.OverAsync(uplatneni!.Klic, default))!;

        Assert.False(await klice.OdeberAsync(cizi, klic.Id, default));
        Assert.NotNull(await klice.OverAsync(uplatneni.Klic, default));
    }

    [Fact]
    public async Task Vydavat_klice_smi_i_posadka_ale_ne_kdokoli()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var clen = await ClenAsync(db, lod, RoleKLodi.Posadka);
        var fanousek = await ClenAsync(db, lod, RoleKLodi.Fanousek);
        var kolemjdouci = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Kolemjdoucí" };
        db.Uzivatele.Add(kolemjdouci);
        await db.SaveChangesAsync();

        Assert.True(await klice.SmiVydavatAsync(lod, kapitan, default));
        // Kapitán nemusí být u každého párování (Filip, 23. 10. 2026).
        Assert.True(await klice.SmiVydavatAsync(lod, clen, default));
        Assert.False(await klice.SmiVydavatAsync(lod, fanousek, default));
        Assert.False(await klice.SmiVydavatAsync(lod, kolemjdouci.Id, default));
    }

    /// <summary>
    /// Vydat klíč smí víc lidí než ho vzít: odebrání a vypnutí sledování je
    /// zásah do cizího telefonu a za posádku odpovídá kapitán.
    /// </summary>
    [Fact]
    public async Task Odebirat_klice_posadka_nesmi()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var clen = await ClenAsync(db, lod, RoleKLodi.Posadka);

        Assert.True(await klice.SmiSpravovatAsync(lod, kapitan, default));
        Assert.False(await klice.SmiSpravovatAsync(lod, clen, default));
    }

    private static async Task<Guid> ClenAsync(AppDbContext db, int lodId, RoleKLodi role)
    {
        var u = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = role.ToString() };
        db.Uzivatele.Add(u);
        await db.SaveChangesAsync();

        db.VazbyKLodim.Add(new VazbaKLodi
        {
            LodId = lodId,
            UzivatelId = u.Id,
            Role = role,
            Puvod = PuvodVazby.Kod,
            VzniklaV = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
        return u.Id;
    }
}

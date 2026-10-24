using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Okna;
using OrlickyPohar.Api.Features.Trasy;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Tracker;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>Hodiny, které stojí tam, kde je test postaví.</summary>
public sealed class ZastavenyCas(DateTimeOffset ted) : TimeProvider
{
    public DateTimeOffset Ted { get; set; } = ted;

    public override DateTimeOffset GetUtcNow() => Ted;
}

/// <summary>
/// Okna závodních dnů proti reálnému PostgreSQL.
/// <para>
/// Jádro věci: <b>okno rozhoduje, kdy smí tracker zaznamenávat</b> — a musí
/// skončit i tehdy, když ho nikdo nezavře. Bez tvrdého konce se vrátíme
/// k trase přes hospodu domů, což je přejímací podmínka č. 5.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class OknaTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Rozprava = new(2027, 5, 15, 7, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, OknaSprava Okna, ZastavenyCas Cas) Sluzby(DateTimeOffset? ted = null)
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cas = new ZastavenyCas(ted ?? Rozprava);
        return (db, new OknaSprava(db, cas, new NastaveniSprava(db, cas)), cas);
    }

    /// <summary>Klíč k lodi — trasa se bez něj nedá založit.</summary>
    private static async Task<KlicLodi> KlicAsync(AppDbContext db, int lodId, Guid kdo)
    {
        var klic = new KlicLodi
        {
            LodId = lodId,
            Otisk = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"),
            VydalUcetId = kdo,
            VydanV = Rozprava,
        };
        db.Klice.Add(klic);
        await db.SaveChangesAsync();
        return klic;
    }

    /// <summary>Regata s jednou přihlášenou lodí — bez účasti není co trackovat.</summary>
    private static async Task<(Zavod Zavod, Lod Lod, Guid Kdo)> RegataAsync(
        AppDbContext db, StavUcasti stav = StavUcasti.Potvrzena)
    {
        var znacka = Guid.NewGuid().ToString("N")[..8];

        var serie = new Serie { Slug = $"okna-{znacka}", Nazev = "Okenní série", Rok = 2027 };
        db.Serie.Add(serie);
        var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = znacka };
        db.Osoby.Add(osoba);
        var kdo = new Uzivatel { Id = Guid.CreateVersion7(), Zobrazovane = "Pořadatel" };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();

        var kategorie = new Kategorie { SerieId = serie.Id, Nazev = "Kajutové" };
        db.Kategorie.Add(kategorie);
        var lod = new Lod { Nazev = $"LUNA {znacka}", MajitelId = osoba.Id };
        db.Lode.Add(lod);
        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{znacka}",
            Nazev = "Okenní regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);
        await db.SaveChangesAsync();

        var prihlaska = new Prihlaska
        {
            SerieId = serie.Id, LodId = lod.Id, KategorieId = kategorie.Id,
        };
        db.Prihlasky.Add(prihlaska);
        await db.SaveChangesAsync();

        db.Ucasti.Add(new Ucast { ZavodId = zavod.Id, PrihlaskaId = prihlaska.Id, Stav = stav });
        await db.SaveChangesAsync();

        return (zavod, lod, kdo.Id);
    }

    [Fact]
    public async Task Rozprava_otevre_okno_a_podruhe_nezalozi_druhe()
    {
        var (db, okna, cas) = Sluzby();
        var (zavod, _, kdo) = await RegataAsync(db);

        var (prvni, nove) = await okna.OtevriAsync(zavod.Id, kdo, null, default);
        cas.Ted = cas.Ted.AddMinutes(3);
        var (druhe, znovu) = await okna.OtevriAsync(zavod.Id, kdo, null, default);

        Assert.True(nove);
        Assert.False(znovu);
        Assert.Equal(prvni.Id, druhe.Id);
        Assert.Equal(1, await db.Okna.CountAsync(o => o.ZavodId == zavod.Id));
    }

    [Fact]
    public async Task Vychozi_okno_konci_tvrdym_koncem()
    {
        var (db, okna, cas) = Sluzby();
        var (zavod, lod, kdo) = await RegataAsync(db);

        var (okno, _) = await okna.OtevriAsync(zavod.Id, kdo, null, default);
        Assert.Equal(Rozprava.AddHours(OknoRegaty.VychoziHodin), okno.TvrdyKonec);

        // Posádka zapomněla záznam ukončit a nikdo den nezavřel. Okno
        // i tak skončí samo — tohle je ta pojistka proti trase přes hospodu.
        cas.Ted = Rozprava.AddHours(OknoRegaty.VychoziHodin + 1);
        Assert.Null(await okna.ProLodAsync(lod.Id, cas.Ted, default));
    }

    [Fact]
    public async Task Dvacetictyrhodinovka_si_rekne_o_delsi_okno()
    {
        var (db, okna, cas) = Sluzby(new DateTimeOffset(2027, 7, 9, 17, 0, 0, TimeSpan.Zero));
        var (zavod, lod, kdo) = await RegataAsync(db);

        var (okno, _) = await okna.OtevriAsync(zavod.Id, kdo, 30, default);

        Assert.Equal(cas.Ted.AddHours(30), okno.TvrdyKonec);

        // Start v 19:00, cíl druhý den večer — uprostřed závodu okno běží.
        cas.Ted = cas.Ted.AddHours(26);
        Assert.NotNull(await okna.ProLodAsync(lod.Id, cas.Ted, default));
    }

    [Fact]
    public async Task Delsi_okno_nez_strop_se_zkrati()
    {
        var (db, okna, _) = Sluzby();
        var (zavod, _, kdo) = await RegataAsync(db);

        var (okno, _) = await okna.OtevriAsync(zavod.Id, kdo, 240, default);

        Assert.Equal(Rozprava.AddHours(OknoRegaty.NejvicHodin), okno.TvrdyKonec);
    }

    [Fact]
    public async Task Uzavreny_den_okno_zastavi_a_druha_rozprava_otevre_dalsi()
    {
        var (db, okna, cas) = Sluzby();
        var (zavod, lod, kdo) = await RegataAsync(db);

        await okna.OtevriAsync(zavod.Id, kdo, null, default);
        cas.Ted = Rozprava.AddHours(10);
        var zavrene = await okna.UzavriAsync(zavod.Id, kdo, default);

        Assert.False(zavrene!.Bezi);
        // Mezi dny se nesleduje: hodinu po vyhlášení už loď zapisovat nesmí.
        cas.Ted = Rozprava.AddHours(11);
        Assert.Null(await okna.ProLodAsync(lod.Id, cas.Ted, default));

        // Ráno je rozprava znovu a je to druhý den téže regaty.
        cas.Ted = Rozprava.AddDays(1);
        var (rano, nove) = await okna.OtevriAsync(zavod.Id, kdo, null, default);

        Assert.True(nove);
        Assert.Equal(2, rano.Den);
        Assert.NotNull(await okna.ProLodAsync(lod.Id, cas.Ted, default));
    }

    [Fact]
    public async Task Uzavreni_dne_rekne_co_zustalo_otevrene()
    {
        var (db, okna, cas) = Sluzby();
        var (zavod, lod, kdo) = await RegataAsync(db);
        await okna.OtevriAsync(zavod.Id, kdo, null, default);

        // Rozjížďka, kterou nikdo nezastavil, a trasa, kterou telefon
        // nedokončil — dvě věci, co po dni zůstanou viset.
        db.Rozjizdky.Add(new Rozjizdka
        {
            ZavodId = zavod.Id, Cislo = 3, StartV = Rozprava.AddHours(2),
            Stav = StavRozjizdky.Probiha,
        });
        var bezici = await okna.BeziciAsync(zavod.Id, Rozprava.AddHours(1), default);
        db.Trasy.Add(new Trasa
        {
            LokalniId = $"t-{Guid.NewGuid():N}",
            KlicId = (await KlicAsync(db, lod.Id, kdo)).Id,
            LodId = lod.Id,
            LodNazev = "LUNA",
            ZavodId = zavod.Id,
            OknoId = bezici!.Id,
            Zacatek = Rozprava.AddHours(1),
            NahranoV = Rozprava.AddHours(1),
            PosledniDavkaV = Rozprava.AddHours(1),
        });
        await db.SaveChangesAsync();

        cas.Ted = Rozprava.AddHours(9);
        var zavrene = await okna.UzavriAsync(zavod.Id, kdo, default);

        // Nic se nezavírá — jen se řekne, co zbylo. Konec rozjížďky je
        // rozhodnutí rozhodčího, ne dopočet.
        Assert.NotNull(zavrene!.Zbylo);
        Assert.True(zavrene.Zbylo!.Neco);
        Assert.Equal([3], zavrene.Zbylo.Rozjizdky);
        Assert.Equal(1, zavrene.Zbylo.RozdelaneTrasy);
        Assert.Equal(StavRozjizdky.Probiha,
            (await db.Rozjizdky.SingleAsync(r => r.ZavodId == zavod.Id && r.Cislo == 3)).Stav);
    }

    [Fact]
    public async Task Po_uklizenem_dni_nezbyva_nic()
    {
        var (db, okna, cas) = Sluzby();
        var (zavod, _, kdo) = await RegataAsync(db);
        await okna.OtevriAsync(zavod.Id, kdo, null, default);

        cas.Ted = Rozprava.AddHours(9);
        var zavrene = await okna.UzavriAsync(zavod.Id, kdo, default);

        Assert.False(zavrene!.Zbylo!.Neco);
    }

    [Fact]
    public async Task Uzavrit_zavrene_neni_chyba()
    {
        var (db, okna, cas) = Sluzby();
        var (zavod, _, kdo) = await RegataAsync(db);

        await okna.OtevriAsync(zavod.Id, kdo, null, default);
        cas.Ted = Rozprava.AddHours(9);
        var prvni = await okna.UzavriAsync(zavod.Id, kdo, default);
        cas.Ted = Rozprava.AddHours(9).AddMinutes(1);
        var podruhe = await okna.UzavriAsync(zavod.Id, kdo, default);

        Assert.Equal(prvni!.Id, podruhe!.Id);
        Assert.Equal(prvni.ZavrenoV, podruhe.ZavrenoV);
    }

    [Fact]
    public async Task Lod_mimo_regatu_zadne_okno_nedostane()
    {
        var (db, okna, cas) = Sluzby();
        var (zavod, _, kdo) = await RegataAsync(db);
        var (_, cizi, _) = await RegataAsync(db);

        await okna.OtevriAsync(zavod.Id, kdo, null, default);

        Assert.Null(await okna.ProLodAsync(cizi.Id, cas.Ted, default));
    }

    [Fact]
    public async Task Odhlasena_lod_okno_nedostane()
    {
        var (db, okna, cas) = Sluzby();
        var (zavod, lod, kdo) = await RegataAsync(db, StavUcasti.Zrusena);

        await okna.OtevriAsync(zavod.Id, kdo, null, default);

        Assert.Null(await okna.ProLodAsync(lod.Id, cas.Ted, default));
    }

    [Fact]
    public async Task Telefon_dostane_okno_i_s_regatou()
    {
        var (db, okna, _) = Sluzby();
        var (zavod, lod, kdo) = await RegataAsync(db);
        await okna.OtevriAsync(zavod.Id, kdo, null, default);

        var pro = await okna.ProTelefonAsync(lod.Id, default);

        var nase = Assert.Single(pro, o => o.ZavodId == zavod.Id);
        Assert.True(nase.Bezi);
        Assert.Equal(zavod.Slug, nase.Zavod);
        Assert.Equal("Okenní regata", nase.Nazev);
    }
}

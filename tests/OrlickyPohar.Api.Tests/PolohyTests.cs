using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Okna;
using OrlickyPohar.Api.Features.Polohy;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Trasy;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Snímek poloh pro mapu a pro pořadatelský přehled.
/// <para>
/// Jádro věci: <b>vrací se celé pole, ne jen to, co se hlásí</b>. Otázka
/// před procedurou zní „trackuje nám celé pole?", a na tu loď, která ve
/// výpisu chybí, neodpovídá.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class PolohyTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Rozprava = new(2027, 5, 15, 7, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, PolohySprava Polohy, OknaSprava Okna, ZastavenyCas Cas) Sluzby(
        DateTimeOffset? ted = null)
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cas = new ZastavenyCas(ted ?? Rozprava);
        var okna = new OknaSprava(db, cas);
        return (db, new PolohySprava(db, cas, okna), okna, cas);
    }

    private sealed record Regata(int ZavodId, Guid Kdo, List<(int LodId, KlicLodi Klic)> Lode);

    private static async Task<Regata> RegataAsync(AppDbContext db, int lodi = 2)
    {
        var znacka = Guid.NewGuid().ToString("N")[..8];

        var serie = new Serie { Slug = $"polohy-{znacka}", Nazev = "Polohová série", Rok = 2027 };
        db.Serie.Add(serie);
        var kdo = new Uzivatel { Id = Guid.CreateVersion7(), Zobrazovane = "Pořadatel" };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();

        var kategorie = new Kategorie { SerieId = serie.Id, Nazev = "Kajutové" };
        db.Kategorie.Add(kategorie);
        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{znacka}",
            Nazev = "Polohová regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);
        await db.SaveChangesAsync();

        var vysledek = new List<(int, KlicLodi)>();
        for (var i = 0; i < lodi; i += 1)
        {
            var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = $"{znacka}{i}" };
            db.Osoby.Add(osoba);
            await db.SaveChangesAsync();

            var lod = new Lod { Nazev = $"LUNA {znacka}{i}", MajitelId = osoba.Id };
            db.Lode.Add(lod);
            await db.SaveChangesAsync();

            db.Prihlasky.Add(new Prihlaska
            {
                SerieId = serie.Id, LodId = lod.Id, KategorieId = kategorie.Id,
            });
            await db.SaveChangesAsync();

            var prihlaska = db.Prihlasky.Single(p => p.SerieId == serie.Id && p.LodId == lod.Id);
            db.Ucasti.Add(new Ucast { ZavodId = zavod.Id, PrihlaskaId = prihlaska.Id });

            var klic = new KlicLodi
            {
                LodId = lod.Id,
                Otisk = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"),
                VydalUcetId = kdo.Id,
                VydanV = Rozprava,
            };
            db.Klice.Add(klic);
            await db.SaveChangesAsync();

            vysledek.Add((lod.Id, klic));
        }

        return new Regata(zavod.Id, kdo.Id, vysledek);
    }

    /// <summary>Trasa s jedním bodem v daném čase — tolik stačí na „poslední poloha".</summary>
    private static async Task BodAsync(
        AppDbContext db, TimeProvider cas, OknaSprava okna, KlicLodi klic, DateTimeOffset kdy,
        double sirka = 49.5163, long poradi = 1)
    {
        var trasy = new TrasySprava(db, cas, okna);
        var lokalni = $"t-{klic.Id}";
        var (trasa, chyba) = await trasy.ZalozAsync(
            klic, new ZalozTrasuVstup(lokalni, "LUNA", null, ZdrojTrasy.Gps, kdy), default);
        Assert.True(trasa is not null, chyba);

        await trasy.PridejAsync(
            klic, lokalni,
            [new BodVstup(poradi, sirka, 14.1651, 6, 2.5, 180, null, kdy, kdy, false)],
            default);
    }

    [Fact]
    public async Task Ve_snimku_je_cele_pole_vcetne_lodi_bez_polohy()
    {
        var (db, polohy, okna, cas) = Sluzby();
        var regata = await RegataAsync(db);
        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);
        PolohySprava.Zapomen(regata.ZavodId);

        cas.Ted = Rozprava.AddMinutes(10);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted);
        PolohySprava.Zapomen(regata.ZavodId);

        var snimek = await polohy.SnimekAsync(regata.ZavodId, default);

        Assert.Equal(2, snimek.Lode.Count);
        var hlasi = snimek.Lode.Single(l => l.LodId == regata.Lode[0].LodId);
        var mlci = snimek.Lode.Single(l => l.LodId == regata.Lode[1].LodId);
        Assert.Equal(StavPolohy.Cerstva, hlasi.Stav);
        Assert.Equal("Kajutové", hlasi.Kategorie);
        // Loď, která se neozvala, ve výpisu zůstává — jinak by se na ni
        // zapomnělo zrovna ve chvíli, kdy je po ní potřeba se ptát.
        Assert.Equal(StavPolohy.Nedostupna, mlci.Stav);
        Assert.Null(mlci.Sirka);
    }

    [Fact]
    public async Task Stari_polohy_rozhoduje_o_stavu()
    {
        var (db, polohy, okna, cas) = Sluzby();
        var regata = await RegataAsync(db, 1);
        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);

        cas.Ted = Rozprava.AddMinutes(10);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted);

        // Do minuty čerstvá, do pěti stárne, pak nedostupná — tři stavy,
        // protože výpadek rádia není totéž co ztracená loď.
        cas.Ted = Rozprava.AddMinutes(10).AddSeconds(30);
        PolohySprava.Zapomen(regata.ZavodId);
        Assert.Equal(StavPolohy.Cerstva, (await polohy.SnimekAsync(regata.ZavodId, default)).Lode[0].Stav);

        cas.Ted = Rozprava.AddMinutes(12);
        PolohySprava.Zapomen(regata.ZavodId);
        Assert.Equal(StavPolohy.Starne, (await polohy.SnimekAsync(regata.ZavodId, default)).Lode[0].Stav);

        cas.Ted = Rozprava.AddMinutes(20);
        PolohySprava.Zapomen(regata.ZavodId);
        var pozde = await polohy.SnimekAsync(regata.ZavodId, default);
        Assert.Equal(StavPolohy.Nedostupna, pozde.Lode[0].Stav);
        // Poloha nemizí: „kde byla naposledy" je ta otázka, kvůli které to
        // celé existuje.
        Assert.NotNull(pozde.Lode[0].Sirka);
    }

    [Fact]
    public async Task Snimek_se_drzi_v_cache_a_nepta_se_znovu()
    {
        var (db, polohy, okna, cas) = Sluzby();
        var regata = await RegataAsync(db, 1);
        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);
        PolohySprava.Zapomen(regata.ZavodId);

        cas.Ted = Rozprava.AddMinutes(10);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted);
        var prvni = await polohy.SnimekAsync(regata.ZavodId, default);

        // Mezitím dorazí novější poloha. Snímek se po pět sekund nemění —
        // čtyřicet obrazovek nesmí znamenat čtyřicet dotazů do databáze.
        cas.Ted = Rozprava.AddMinutes(10).AddSeconds(2);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted, 49.52, 2);
        var zcache = await polohy.SnimekAsync(regata.ZavodId, default);
        Assert.Equal(prvni.Lode[0].CasGps, zcache.Lode[0].CasGps);

        cas.Ted = Rozprava.AddMinutes(10).AddSeconds(8);
        var cerstvy = await polohy.SnimekAsync(regata.ZavodId, default);
        Assert.NotEqual(prvni.Lode[0].CasGps, cerstvy.Lode[0].CasGps);
    }

    [Fact]
    public async Task Polohy_z_minuleho_dne_se_neberou()
    {
        var (db, polohy, okna, cas) = Sluzby();
        var regata = await RegataAsync(db, 1);
        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);

        cas.Ted = Rozprava.AddMinutes(10);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted);

        cas.Ted = Rozprava.AddHours(10);
        await okna.UzavriAsync(regata.ZavodId, regata.Kdo, default);

        // Druhý den je nové okno a včerejší poloha není „poslední známá",
        // je to záznam z jiného dne.
        cas.Ted = Rozprava.AddDays(1);
        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);
        PolohySprava.Zapomen(regata.ZavodId);

        var snimek = await polohy.SnimekAsync(regata.ZavodId, default);

        Assert.Equal(StavPolohy.Nedostupna, snimek.Lode[0].Stav);
        Assert.Null(snimek.Lode[0].CasGps);
    }

    [Fact]
    public async Task Bez_okna_je_snimek_prazdny_ale_lode_v_nem_jsou()
    {
        var (db, polohy, _, _) = Sluzby();
        var regata = await RegataAsync(db, 2);
        PolohySprava.Zapomen(regata.ZavodId);

        var snimek = await polohy.SnimekAsync(regata.ZavodId, default);

        Assert.False(snimek.OknoBezi);
        Assert.Null(snimek.OknoOd);
        Assert.Equal(2, snimek.Lode.Count);
        Assert.All(snimek.Lode, l => Assert.Equal(StavPolohy.Nedostupna, l.Stav));
    }
}

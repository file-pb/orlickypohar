using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Okna;
using OrlickyPohar.Api.Features.Polohy;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Tracker;
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
        var okna = new OknaSprava(db, cas, new NastaveniSprava(db, cas));
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

    /// <summary>Rozjížďka, která právě běží. Veřejný výdej na ní stojí.</summary>
    private static async Task<Rozjizdka> RozjizdkaBeziAsync(
        AppDbContext db, int zavodId, DateTimeOffset start)
    {
        var r = new Rozjizdka
        {
            ZavodId = zavodId,
            Cislo = await db.Rozjizdky.CountAsync(x => x.ZavodId == zavodId) + 1,
            StartV = start,
            Stav = StavRozjizdky.Probiha,
        };
        db.Rozjizdky.Add(r);
        await db.SaveChangesAsync();
        return r;
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
    public async Task Ven_se_nevysila_dokud_to_rozhodci_nepovoli()
    {
        var (db, polohy, okna, cas) = Sluzby();
        var regata = await RegataAsync(db, 1);
        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);
        cas.Ted = Rozprava.AddMinutes(10);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted);
        await RozjizdkaBeziAsync(db, regata.ZavodId, Rozprava.AddMinutes(5));
        PolohySprava.Zapomen(regata.ZavodId);

        var ven = await polohy.VerejnyAsync(regata.ZavodId, default);

        // Výchozí hodnota je bezpečná: ven nejde nic, i když se jede.
        Assert.False(ven.Vysila);
        Assert.Empty(ven.Lode);
    }

    /// <summary>
    /// <b>Výchozí hodnota platí i tam, kde ji nikdo nenastavil.</b> Posádka
    /// vidí sebe — ne nic. Zamrzá i to, co nikdo nenastavil, takže výchozí
    /// hodnota musí být bezpečná, ale ne tak, aby tracker vypadal rozbitě.
    /// <para>
    /// Mimo běžící okno se nevydává nic: klíč říká kdo, okno říká kdy.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Posadka_vidi_vychozi_jen_sebe()
    {
        var (db, polohy, okna, cas) = Sluzby();
        var regata = await RegataAsync(db, 2);

        // Bez okna neplatí ani výchozí hodnota — není co ukazovat.
        Assert.False((await polohy.ProPosadkuAsync(regata.Lode[0].LodId, default)).Vidi);

        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);
        cas.Ted = Rozprava.AddMinutes(10);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted);
        await BodAsync(db, cas, okna, regata.Lode[1].Klic, cas.Ted, 49.52);
        PolohySprava.Zapomen(regata.ZavodId);

        var muj = await polohy.ProPosadkuAsync(regata.Lode[0].LodId, default);

        Assert.True(muj.Vidi);
        Assert.Equal(regata.Lode[0].LodId, Assert.Single(muj.Lode).LodId);
    }

    /// <summary>
    /// <b>Přepínač *co vidí posádky* něco dělá.</b> Do oponentury 24. 10.
    /// 2026 se zamykal, zapisoval do dokladu ke sporu *„vy jste nás viděli
    /// a my vás ne"* — a nečetl ho žádný kód. Doklad, který tvrdí „posádky
    /// viděly jen sebe", přitom neviděly nic, je horší než žádný.
    /// </summary>
    [Fact]
    public async Task Posadka_vidi_ostatni_kdyz_to_rozhodci_pustil()
    {
        var (db, polohy, okna, cas) = Sluzby();
        var regata = await RegataAsync(db, 2);
        var nastaveni = new NastaveniSprava(db, cas);

        // Rozšířit jde jen do rozpravy — ta nastavení zamyká.
        await nastaveni.UlozAsync(
            regata.ZavodId,
            new NastaveniVstup(CoVidiPosadky.IOstatni, false, false, null),
            regata.Kdo, default);

        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);
        cas.Ted = Rozprava.AddMinutes(10);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted);
        await BodAsync(db, cas, okna, regata.Lode[1].Klic, cas.Ted, 49.52);
        PolohySprava.Zapomen(regata.ZavodId);

        Assert.Equal(2, (await polohy.ProPosadkuAsync(regata.Lode[0].LodId, default)).Lode.Count);

        // Zpřísnit smí rozhodčí i po zámku — a tohle je nejpřísnější.
        await nastaveni.UlozAsync(
            regata.ZavodId,
            new NastaveniVstup(CoVidiPosadky.Nic, false, false, "Posádky to řešily za jízdy."),
            regata.Kdo, default);
        PolohySprava.Zapomen(regata.ZavodId);

        var po = await polohy.ProPosadkuAsync(regata.Lode[0].LodId, default);
        Assert.False(po.Vidi);
        Assert.Empty(po.Lode);
    }

    /// <summary>
    /// <b>Nezveřejněná regata veřejně neexistuje</b> — a na cestě, kterou
    /// jdou ven polohy lodí, to platí dvakrát.
    /// <para>
    /// Měří se přes HTTP, protože podmínku drží <b>endpoint</b>, ne služba
    /// pod ním: `VerejnyAsync` dostane rovnou `zavodId` a o zveřejnění nic
    /// neví. Test přes službu by tedy prošel i tehdy, kdyby ta podmínka
    /// v endpointu nebyla — a přesně tak to 24. 10. 2026 bylo. Cesta tehdy
    /// odpovídala 200 na regatu, kterou detail vrací jako 404.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Nezverejnena_regata_se_ven_nevyda()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var regata = await RegataAsync(db, 1);

        var zavod = await db.Zavody.Include(z => z.Serie).FirstAsync(z => z.Id == regata.ZavodId);
        var cesta = $"/serie/{zavod.Serie!.Slug}/zavody/{zavod.Slug}/polohy";
        var klient = fixture.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await klient.GetAsync(cesta)).StatusCode);

        // Zveřejněná zastávka v nezveřejněném ročníku pořád ne: širší rozsah
        // rozhoduje, stejně jako u detailu regaty a u trati.
        zavod.Publikovano = true;
        await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await klient.GetAsync(cesta)).StatusCode);

        zavod.Serie.Publikovano = true;
        await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.OK, (await klient.GetAsync(cesta)).StatusCode);
    }

    [Fact]
    public async Task Ven_se_vysila_jen_kdyz_bezi_rozjizdka()
    {
        var (db, polohy, okna, cas) = Sluzby();
        var regata = await RegataAsync(db, 1);
        var nastaveni = new NastaveniSprava(db, cas);
        await nastaveni.UlozAsync(
            regata.ZavodId,
            new NastaveniVstup(CoVidiPosadky.JenSebe, true, false, null),
            regata.Kdo, default);
        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);

        cas.Ted = Rozprava.AddMinutes(10);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted);
        PolohySprava.Zapomen(regata.ZavodId);

        // Přenos je povolený, ale žádná rozjížďka neběží — ven se nevysílá.
        // Tracker přitom hlásí dál, pořadatelský přehled na tom stojí.
        var mimo = await polohy.VerejnyAsync(regata.ZavodId, default);
        Assert.False(mimo.Vysila);

        var rozjizdka = await RozjizdkaBeziAsync(db, regata.ZavodId, Rozprava.AddMinutes(8));
        PolohySprava.Zapomen(regata.ZavodId);
        var zajizdy = await polohy.VerejnyAsync(regata.ZavodId, default);

        Assert.True(zajizdy.Vysila);
        var lod = Assert.Single(zajizdy.Lode);
        Assert.NotNull(lod.Sirka);

        // Po dojezdu se vydávání zastaví. Ořez zezadu se nedá udělat
        // dopředu, takže se vypíná, ne dodatečně maže.
        rozjizdka.Stav = StavRozjizdky.Dokoncena;
        await db.SaveChangesAsync();
        PolohySprava.Zapomen(regata.ZavodId);

        Assert.False((await polohy.VerejnyAsync(regata.ZavodId, default)).Vysila);
    }

    [Fact]
    public async Task Ven_jdou_jen_polohy_z_rozjizdky_vcetne_procedury()
    {
        var (db, polohy, okna, cas) = Sluzby();
        var regata = await RegataAsync(db, 2);
        var nastaveni = new NastaveniSprava(db, cas);
        await nastaveni.UlozAsync(
            regata.ZavodId,
            new NastaveniVstup(CoVidiPosadky.JenSebe, true, false, null),
            regata.Kdo, default);
        await okna.OtevriAsync(regata.ZavodId, regata.Kdo, null, default);

        // První loď hlásila hodinu před startem — to je čekání na vodě
        // a ven nepatří. Druhá při proceduře, čtyři minuty před výstřelem.
        cas.Ted = Rozprava.AddMinutes(5);
        await BodAsync(db, cas, okna, regata.Lode[0].Klic, cas.Ted);
        cas.Ted = Rozprava.AddMinutes(61);
        await BodAsync(db, cas, okna, regata.Lode[1].Klic, cas.Ted, 49.52);

        await RozjizdkaBeziAsync(db, regata.ZavodId, Rozprava.AddMinutes(65));
        cas.Ted = Rozprava.AddMinutes(66);
        PolohySprava.Zapomen(regata.ZavodId);

        var ven = await polohy.VerejnyAsync(regata.ZavodId, default);

        Assert.True(ven.Vysila);
        var lod = Assert.Single(ven.Lode);
        Assert.Equal(regata.Lode[1].LodId, lod.LodId);
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

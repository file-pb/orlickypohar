using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Okna;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Trasy;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Nahrávání tras proti reálnému PostgreSQL.
/// <para>
/// Jádro věci: <b>na vodě signál padá a dávka se pošle znovu</b>. Všechno
/// nahrávání je proto idempotentní — opakování nesmí zdvojit trasu ani bod.
/// To jsou přejímací podmínky pilotu č. 3 a 4.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class TrasyTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2027, 6, 26, 8, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, TrasySprava Trasy) Sluzby()
    {
        var (db, trasy, _, _) = SluzbySCasem(TimeProvider.System);
        return (db, trasy);
    }

    /// <summary>
    /// Služby na daných hodinách. Okno závodního dne má tvrdý konec, takže
    /// všechno kolem něj se měří posunem času, ne čekáním.
    /// </summary>
    private (AppDbContext Db, TrasySprava Trasy, OknaSprava Okna, TimeProvider Cas)
        SluzbySCasem(TimeProvider cas)
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var okna = new OknaSprava(db, cas);
        return (db, new TrasySprava(db, cas, okna), okna, cas);
    }

    /// <summary>
    /// Trasa, nebo výjimka s důvodem. Většina testů měří idempotenci
    /// nahrávání, ne okna — ta mají vlastní třídu.
    /// </summary>
    private static async Task<TrasaDto> ZalozAsync(
        TrasySprava trasy, KlicLodi klic, ZalozTrasuVstup vstup)
    {
        var (trasa, chyba) = await trasy.ZalozAsync(klic, vstup, default);
        return trasa ?? throw new InvalidOperationException(chyba);
    }

    /// <summary>
    /// Klíč k lodi — tím se telefon prokazuje. Trasa patří lodi, ne člověku,
    /// takže testy pracují s klíčem, ne s přihlášeným uživatelem.
    /// </summary>
    private static async Task<KlicLodi> KlicAsync(AppDbContext db, string znacka)
    {
        var (klic, _) = await KlicVRegateAsync(db, znacka);
        return klic;
    }

    /// <summary>
    /// Klíč k lodi, která je v regatě přihlášená — <b>bez účasti a bez
    /// běžícího okna trasa nevznikne</b>, takže setup musí být celý.
    /// </summary>
    private static async Task<(KlicLodi Klic, Zavod Zavod)> KlicVRegateAsync(
        AppDbContext db, string znacka, DateTimeOffset? ted = null, bool sOknem = true)
    {
        var u = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = $"Kapitán {znacka}" };
        var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = znacka };
        db.Uzivatele.Add(u);
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();

        // Loď musí mít majitele, MajitelId není nullable.
        var lod = new Lod { Nazev = $"LUNA {znacka} {Guid.NewGuid():N}"[..20], MajitelId = osoba.Id };
        db.Lode.Add(lod);
        await db.SaveChangesAsync();

        var klic = new KlicLodi
        {
            LodId = lod.Id,
            Otisk = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"),
            Jmeno = $"Posádka {znacka}",
            VydalUcetId = u.Id,
            VydanV = Ted,
        };
        db.Klice.Add(klic);

        var serie = new Serie { Slug = $"trasy-{znacka}-{Guid.NewGuid():N}"[..40], Nazev = "Trasová série", Rok = 2027 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var kategorie = new Kategorie { SerieId = serie.Id, Nazev = "Kajutové" };
        db.Kategorie.Add(kategorie);
        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{Guid.NewGuid():N}"[..40],
            Nazev = "Trasová regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);
        await db.SaveChangesAsync();

        var prihlaska = new Prihlaska { SerieId = serie.Id, LodId = lod.Id, KategorieId = kategorie.Id };
        db.Prihlasky.Add(prihlaska);
        await db.SaveChangesAsync();

        db.Ucasti.Add(new Ucast { ZavodId = zavod.Id, PrihlaskaId = prihlaska.Id });

        if (sOknem)
        {
            // Okno už hodinu běží: rozprava byla před startem, jak to chodí.
            var kdy = ted ?? DateTimeOffset.UtcNow;
            db.Okna.Add(new OknoRegaty
            {
                ZavodId = zavod.Id,
                Den = 1,
                OtevrenoV = kdy.AddHours(-1),
                OtevrelId = u.Id,
                TvrdyKonec = kdy.AddHours(12),
            });
        }

        await db.SaveChangesAsync();

        return (klic, zavod);
    }

    private static ZalozTrasuVstup Vstup(string lokalniId) =>
        new(lokalniId, "LUNA", "Radavská regata", ZdrojTrasy.Gps, Ted);

    private static List<BodVstup> Davka(long od, int kolik) =>
        Enumerable.Range(0, kolik)
            .Select(i => new BodVstup(
                od + i,
                49.5163 + i * 0.0001,
                14.1651 + i * 0.0001,
                6, 2.5, 180, null,
                Ted.AddSeconds((od + i) * 5),
                Ted.AddSeconds((od + i) * 5),
                false))
            .ToList();

    [Fact]
    public async Task Zalozeni_tehoz_lokalniho_id_nevyrobi_druhou_trasu()
    {
        var (db, trasy) = Sluzby();
        var kdo = await KlicAsync(db, "A");
        var lokalni = $"t-{Guid.NewGuid():N}";

        var prvni = await ZalozAsync(trasy, kdo, Vstup(lokalni));
        var druha = await ZalozAsync(trasy, kdo, Vstup(lokalni));

        Assert.Equal(prvni.LokalniId, druha.LokalniId);
        Assert.Equal(1, await db.Trasy.CountAsync(t => t.KlicId == kdo.Id && t.LokalniId == lokalni));
    }

    [Fact]
    public async Task Tataz_davka_podruhe_nic_nezdvoji()
    {
        var (db, trasy) = Sluzby();
        var kdo = await KlicAsync(db, "B");
        var lokalni = $"t-{Guid.NewGuid():N}";
        await ZalozAsync(trasy, kdo, Vstup(lokalni));

        var prvni = await trasy.PridejAsync(kdo, lokalni, Davka(0, 50), default);
        var znovu = await trasy.PridejAsync(kdo, lokalni, Davka(0, 50), default);

        Assert.Equal(50, prvni!.Prijato);
        Assert.Equal(0, znovu!.Prijato);
        Assert.Equal(50, znovu.Preskoceno);

        var trasa = await db.Trasy.SingleAsync(t => t.LokalniId == lokalni && t.KlicId == kdo.Id);
        Assert.Equal(50, await db.TrasaBody.CountAsync(b => b.TrasaId == trasa.Id));
    }

    [Fact]
    public async Task Prekryvajici_se_davka_doplni_jen_chybejici()
    {
        var (db, trasy) = Sluzby();
        var kdo = await KlicAsync(db, "C");
        var lokalni = $"t-{Guid.NewGuid():N}";
        await ZalozAsync(trasy, kdo, Vstup(lokalni));

        // Telefon poslal 0–29, potvrzení se ztratilo, tak posílá 20–49 znovu.
        await trasy.PridejAsync(kdo, lokalni, Davka(0, 30), default);
        var druha = await trasy.PridejAsync(kdo, lokalni, Davka(20, 30), default);

        Assert.Equal(20, druha!.Prijato);
        Assert.Equal(10, druha.Preskoceno);
        Assert.Equal(49, druha.PosledniBod);

        var trasa = await db.Trasy.SingleAsync(t => t.LokalniId == lokalni && t.KlicId == kdo.Id);
        Assert.Equal(50, await db.TrasaBody.CountAsync(b => b.TrasaId == trasa.Id));
    }

    [Fact]
    public async Task Dvakrat_tyz_bod_v_jedne_davce_se_ulozi_jednou()
    {
        var (db, trasy) = Sluzby();
        var kdo = await KlicAsync(db, "D");
        var lokalni = $"t-{Guid.NewGuid():N}";
        await ZalozAsync(trasy, kdo, Vstup(lokalni));

        var davka = Davka(0, 3);
        davka.Add(davka[1]);

        var vysledek = await trasy.PridejAsync(kdo, lokalni, davka, default);

        Assert.Equal(3, vysledek!.Prijato);
        var trasa = await db.Trasy.SingleAsync(t => t.LokalniId == lokalni && t.KlicId == kdo.Id);
        Assert.Equal(3, await db.TrasaBody.CountAsync(b => b.TrasaId == trasa.Id));
    }

    [Fact]
    public async Task Prerusene_nahrani_jde_dokoncit()
    {
        var (db, trasy) = Sluzby();
        var kdo = await KlicAsync(db, "E");
        var lokalni = $"t-{Guid.NewGuid():N}";
        await ZalozAsync(trasy, kdo, Vstup(lokalni));
        await trasy.PridejAsync(kdo, lokalni, Davka(0, 10), default);

        // Trasa zůstává rozdělaná, dokud ji posádka neuzavře — podmínka č. 4.
        var rozdelana = (await trasy.MojeAsync(kdo, default)).Single(t => t.LokalniId == lokalni);
        Assert.False(rozdelana.Dokoncena);

        await trasy.PridejAsync(kdo, lokalni, Davka(10, 10), default);
        var hotova = await trasy.DokonciAsync(kdo, lokalni, Ted.AddHours(2), default);

        Assert.True(hotova!.Dokoncena);
        Assert.Equal(20, hotova.PocetBodu);
        Assert.Equal(Ted.AddHours(2), hotova.Konec);
    }

    [Fact]
    public async Task Cizim_klicem_nelze_doplnit_ani_pri_znalosti_identifikatoru()
    {
        var (db, trasy) = Sluzby();
        var moje = await KlicAsync(db, "F");
        var cizi = await KlicAsync(db, "G");
        var lokalni = $"t-{Guid.NewGuid():N}";
        await ZalozAsync(trasy, moje, Vstup(lokalni));

        var pokus = await trasy.PridejAsync(cizi, lokalni, Davka(0, 5), default);

        Assert.Null(pokus);
    }

    [Fact]
    public async Task Posun_hodin_se_ulozi_a_body_se_nezahazuji()
    {
        var (db, trasy) = Sluzby();
        var kdo = await KlicAsync(db, "H");
        var lokalni = $"t-{Guid.NewGuid():N}";

        // Telefon tvrdí, že záznam začal za dva dny — hodiny má rozjeté.
        var zbudoucnosti = DateTimeOffset.UtcNow.AddDays(2);
        var zalozena = await ZalozAsync(
            trasy, kdo, new ZalozTrasuVstup(lokalni, "LUNA", null, ZdrojTrasy.Gps, zbudoucnosti));

        // Posun se drží, aby se trasa dala vrátit na původní měření; příznak
        // „čas opraven" by řekl jen, že se něco stalo, ne o kolik.
        Assert.NotNull(zalozena.PosunMs);
        Assert.True(zalozena.PosunMs < 0, $"posun měl být záporný, je {zalozena.PosunMs}");

        var davka = await trasy.PridejAsync(
            kdo, lokalni,
            [new BodVstup(1, 49.5, 14.1, 6, null, null, null, zbudoucnosti, zbudoucnosti, false)],
            default);

        Assert.Equal(1, davka!.Prijato);
    }

    [Fact]
    public async Task Bez_bezneho_okna_trasa_nevznikne()
    {
        var (db, trasy) = Sluzby();
        var (kdo, _) = await KlicVRegateAsync(db, "J", sOknem: false);
        var lokalni = $"t-{Guid.NewGuid():N}";

        var (trasa, chyba) = await trasy.ZalozAsync(kdo, Vstup(lokalni), default);

        // Záznam mimo okno regaty je sledovací zařízení, ne tracker —
        // přesně ta cesta přes hospodu domů z přejímací podmínky č. 5.
        Assert.Null(trasa);
        Assert.Equal(TrasySprava.MimoOkno, chyba);
        Assert.False(await db.Trasy.AnyAsync(t => t.LokalniId == lokalni));
    }

    [Fact]
    public async Task Trasa_dostane_regatu_z_bezneho_okna()
    {
        var (db, trasy) = Sluzby();
        var (kdo, zavod) = await KlicVRegateAsync(db, "K");
        var lokalni = $"t-{Guid.NewGuid():N}";

        // Jméno regaty z telefonu je volný text a nesmí rozhodovat o ničem;
        // vazbu určuje server z klíče a z běžícího okna.
        var zalozena = await ZalozAsync(
            trasy, kdo, new ZalozTrasuVstup(lokalni, "LUNA", "Úplně jiná regata", ZdrojTrasy.Gps, Ted));

        Assert.Equal(zavod.Id, zalozena.ZavodId);
        var v_db = await db.Trasy.SingleAsync(t => t.KlicId == kdo.Id && t.LokalniId == lokalni);
        Assert.Equal(zavod.Id, v_db.ZavodId);
        Assert.NotNull(v_db.OknoId);
    }

    [Fact]
    public async Task Po_uzavreni_dne_jde_zalozit_zaznam_ze_dne_i_doposlat()
    {
        var rozprava = new DateTimeOffset(2027, 5, 15, 7, 0, 0, TimeSpan.Zero);
        var cas = new ZastavenyCas(rozprava.AddHours(1));
        var (db, trasy, okna, _) = SluzbySCasem(cas);
        var (kdo, zavod) = await KlicVRegateAsync(db, "L", cas.Ted);
        var lokalni = $"t-{Guid.NewGuid():N}";

        // Záznam začal za jízdy, nahrává se ale až večer v hospodě, kdy je
        // signál — a to je po uzavření dne. Výpadek sítě na vodě je normál.
        var zacatek = cas.Ted;
        cas.Ted = rozprava.AddHours(11);
        await okna.UzavriAsync(zavod.Id, Guid.CreateVersion7(), default);
        cas.Ted = rozprava.AddHours(13);

        var zalozena = await ZalozAsync(
            trasy, kdo, new ZalozTrasuVstup(lokalni, "LUNA", null, ZdrojTrasy.Gps, zacatek));
        var davka = await trasy.PridejAsync(kdo, lokalni, Davka(0, 10), default);
        var hotova = await trasy.DokonciAsync(kdo, lokalni, cas.Ted, default);

        Assert.Equal(zavod.Id, zalozena.ZavodId);
        Assert.Equal(10, davka!.Prijato);
        Assert.True(hotova!.Dokoncena);
    }

    [Fact]
    public async Task Simulovana_trasa_zustane_oznacena()
    {
        var (db, trasy) = Sluzby();
        var kdo = await KlicAsync(db, "I");
        var lokalni = $"t-{Guid.NewGuid():N}";

        await ZalozAsync(
            trasy, kdo, new ZalozTrasuVstup(lokalni, "LUNA", null, ZdrojTrasy.Simulace, Ted));
        var moje = (await trasy.MojeAsync(kdo, default)).Single(t => t.LokalniId == lokalni);

        Assert.Equal(ZdrojTrasy.Simulace, moje.Zdroj);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Trasy;

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
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (db, new TrasySprava(db, TimeProvider.System));
    }

    /// <summary>
    /// Klíč k lodi — tím se telefon prokazuje. Trasa patří lodi, ne člověku,
    /// takže testy pracují s klíčem, ne s přihlášeným uživatelem.
    /// </summary>
    private static async Task<KlicLodi> KlicAsync(AppDbContext db, string znacka)
    {
        var u = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = $"Kapitán {znacka}" };
        db.Uzivatele.Add(u);
        var lod = new Lod { Nazev = $"LUNA {znacka} {Guid.NewGuid():N}"[..20] };
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
        await db.SaveChangesAsync();
        return klic;
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

        var prvni = await trasy.ZalozAsync(kdo, Vstup(lokalni), default);
        var druha = await trasy.ZalozAsync(kdo, Vstup(lokalni), default);

        Assert.Equal(prvni.LokalniId, druha.LokalniId);
        Assert.Equal(1, await db.Trasy.CountAsync(t => t.KlicId == kdo.Id && t.LokalniId == lokalni));
    }

    [Fact]
    public async Task Tataz_davka_podruhe_nic_nezdvoji()
    {
        var (db, trasy) = Sluzby();
        var kdo = await KlicAsync(db, "B");
        var lokalni = $"t-{Guid.NewGuid():N}";
        await trasy.ZalozAsync(kdo, Vstup(lokalni), default);

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
        await trasy.ZalozAsync(kdo, Vstup(lokalni), default);

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
        await trasy.ZalozAsync(kdo, Vstup(lokalni), default);

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
        await trasy.ZalozAsync(kdo, Vstup(lokalni), default);
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
        await trasy.ZalozAsync(moje, Vstup(lokalni), default);

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
        var zalozena = await trasy.ZalozAsync(
            kdo, new ZalozTrasuVstup(lokalni, "LUNA", null, ZdrojTrasy.Gps, zbudoucnosti), default);

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
    public async Task Simulovana_trasa_zustane_oznacena()
    {
        var (db, trasy) = Sluzby();
        var kdo = await KlicAsync(db, "I");
        var lokalni = $"t-{Guid.NewGuid():N}";

        await trasy.ZalozAsync(
            kdo, new ZalozTrasuVstup(lokalni, "LUNA", null, ZdrojTrasy.Simulace, Ted), default);
        var moje = (await trasy.MojeAsync(kdo, default)).Single(t => t.LokalniId == lokalni);

        Assert.Equal(ZdrojTrasy.Simulace, moje.Zdroj);
    }
}

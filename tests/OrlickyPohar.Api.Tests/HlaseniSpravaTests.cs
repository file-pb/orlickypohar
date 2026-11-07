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
/// Hlášení telefonu proti reálnému PostgreSQL (nález R3).
/// <para>
/// Vzorec T−20 je čistá funkce v <see cref="HlaseniTests"/>. Tady jde o dvě
/// věci, které bez databáze nejdou říct: že se <b>baterie poprvé dostane na
/// břeh</b> (dosud tekla jedině z dávky bodů, tedy až z vody), a že čas,
/// kterým se telefon řídí, přijde <b>z té rozjížďky, kterou vidí posádka na
/// obrazovce</b> — ne z jiné.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class HlaseniSpravaTests(PostgresFixture fixture)
{
    private sealed record Svet(
        AppDbContext Db, KliceSprava Klice, ZavodnikSprava Zavodnik, KlicLodi Klic,
        int ZavodId, int LodId);

    /// <summary>
    /// Dnešní regata s jednou lodí, klíčem k ní a jednou plánovanou
    /// rozjížďkou. Datum musí být <b>dnešní</b>: den, ne okno, je to, podle
    /// čeho <c>ZavodnikSprava</c> hledá.
    /// </summary>
    private async Task<T> VeSveteAsync<T>(DateTimeOffset? startV, Func<Svet, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var klice = new KliceSprava(db, TimeProvider.System);
        var zavodnik = new ZavodnikSprava(db, TimeProvider.System);
        var znacka = Guid.NewGuid().ToString("N")[..8];

        var kapitan = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Kapitán" };
        var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = "Testovací" };
        db.Uzivatele.Add(kapitan);
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();

        var lod = new Lod { Nazev = $"LUNA {znacka}", MajitelId = osoba.Id };
        db.Lode.Add(lod);
        await db.SaveChangesAsync();

        db.VazbyKLodim.Add(new VazbaKLodi
        {
            LodId = lod.Id, UzivatelId = kapitan.Id, Role = RoleKLodi.Kapitan,
            Puvod = PuvodVazby.Kod, VzniklaV = DateTimeOffset.UtcNow,
        });

        var serie = new Serie { Slug = $"hlaseni-{znacka}", Nazev = "Hlásná série", Rok = 2026 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var kategorie = new Kategorie { SerieId = serie.Id, Nazev = "Kajutové" };
        db.Kategorie.Add(kategorie);
        var zavod = new Zavod
        {
            SerieId = serie.Id, Slug = $"dnes-{znacka}", Nazev = "Dnešní regata",
            Datum = DateOnly.FromDateTime(DateTimeOffset.UtcNow.UtcDateTime),
        };
        db.Zavody.Add(zavod);
        await db.SaveChangesAsync();

        db.Prihlasky.Add(new Prihlaska
        {
            SerieId = serie.Id, LodId = lod.Id, KategorieId = kategorie.Id,
        });
        await db.SaveChangesAsync();

        var prihlaska = db.Prihlasky.Single(p => p.SerieId == serie.Id && p.LodId == lod.Id);
        db.Ucasti.Add(new Ucast { ZavodId = zavod.Id, PrihlaskaId = prihlaska.Id });
        db.Rozjizdky.Add(new Rozjizdka
        {
            ZavodId = zavod.Id, Cislo = 1, Stav = StavRozjizdky.Planovana, StartV = startV,
        });
        await db.SaveChangesAsync();

        var pozvanka = await klice.PozviAsync(lod.Id, kapitan.Id, "Tonda", default);
        await klice.UplatniAsync(pozvanka.Kod, default);
        var klic = db.Klice.Single(k => k.LodId == lod.Id);

        return await co(new Svet(db, klice, zavodnik, klic, zavod.Id, lod.Id));
    }

    /// <summary>
    /// <b>Tohle je ta chybějící polovina bodu 11 návodu.</b> Procenta se do
    /// 7. 11. 2026 plnila jedině z dávky bodů trasy, takže pořadatel
    /// v klubovně — na jediném místě, kde se vybitý telefon ještě dá
    /// spravit — viděl prázdno.
    /// </summary>
    [Fact]
    public Task Hlaseni_prinese_baterii_na_breh() => VeSveteAsync(null, async svet =>
    {
        Assert.Null(svet.Klic.BaterieProcent);
        Assert.Null(svet.Klic.PosledniPouzitiV);

        await svet.Klice.HlasSeAsync(svet.Klic, 63, default);

        var ulozeny = await svet.Db.Klice.AsNoTracking().SingleAsync(k => k.Id == svet.Klic.Id);
        Assert.Equal(63, ulozeny.BaterieProcent);
        Assert.NotNull(ulozeny.PosledniPouzitiV);
        return true;
    });

    /// <summary>
    /// „Neříkám" není „nevím nic": simulátor baterii nezná a starší appka ji
    /// neposílá. Zapomenout, co se vědělo, by bylo horší než držet starší
    /// hodnotu — proto se <c>null</c> nepropisuje.
    /// </summary>
    [Fact]
    public Task Hlaseni_bez_baterie_nesmaze_posledni_znamou() =>
        VeSveteAsync(null, async svet =>
        {
            await svet.Klice.HlasSeAsync(svet.Klic, 40, default);
            await svet.Klice.HlasSeAsync(svet.Klic, null, default);

            var ulozeny = await svet.Db.Klice.AsNoTracking().SingleAsync(k => k.Id == svet.Klic.Id);
            Assert.Equal(40, ulozeny.BaterieProcent);
            return true;
        });

    /// <summary>
    /// Čas, kterým se telefon řídí, je <b>tentýž</b>, jaký obrazovka posádky
    /// ukazuje jako čas startu. Jeden dotaz pro obojí
    /// (<c>ZavodnikSprava.DnesniAsync</c>) je právě proto, aby se tyhle dvě
    /// odpovědi nemohly rozejít.
    /// </summary>
    [Fact]
    public Task Cas_nahravani_jde_z_te_rozjizdky_kterou_vidi_posadka()
    {
        var start = DateTimeOffset.UtcNow.AddHours(2);
        return VeSveteAsync(start, async svet =>
        {
            var dnesek = await svet.Zavodnik.DnesniAsync(svet.LodId, default);
            Assert.NotNull(dnesek);
            Assert.Equal(start, dnesek!.Value.Rozjizdka!.StartV);

            var obrazovka = await svet.Zavodnik.DnesAsync(svet.Klic, default);
            Assert.NotNull(obrazovka);
            Assert.Equal(Hlaseni.NahravatOd(start), obrazovka!.NahravatOd);
            Assert.Equal(start.AddMinutes(-20), obrazovka.NahravatOd);
            return true;
        });
    }

    /// <summary>
    /// Zbytek R34: posádka na břehu kontroluje, že telefon visí u správné
    /// lodi — a <b>jméno lodi na to nestačí</b>, dvě Luny na Orlíku nejsou
    /// nic divného. Posádka je seznam <b>telefonů</b>, ne lidí na palubě.
    /// </summary>
    [Fact]
    public Task Obrazovka_nese_plachetni_cislo_i_jmena_z_klicu() =>
        VeSveteAsync(null, async svet =>
        {
            var obrazovka = await svet.Zavodnik.DnesAsync(svet.Klic, default);
            Assert.NotNull(obrazovka);

            // `VeSveteAsync` vydal jeden klíč, na jméno Tonda — a je to ten,
            // kterým se tahle obrazovka ptá, takže „tvůj".
            var tonda = Assert.Single(obrazovka!.Posadka);
            Assert.Equal("Tonda", tonda.Jmeno);
            Assert.True(tonda.Ja);

            // Telefon se ještě neozval, takže nevysílá a baterii neříká.
            // `false` tu znamená „komise ho nevidí", ne „ozval se dávno".
            Assert.False(tonda.Vysila);
            Assert.Null(tonda.OzvalSeV);
            Assert.Null(tonda.BaterieProcent);

            // Číslo plachty loď v tomhle světě nemá — `null` je správná
            // odpověď, ne prázdný řetězec, který by se vykreslil jako mezera.
            Assert.Null(obrazovka.CisloPlachty);
            return true;
        });

    /// <summary>
    /// Po hlášení telefon <b>vysílá</b> a nese baterii — tohle je ta
    /// polovina R34, která bez R3 nemohla fungovat: do 7. 11. 2026 se
    /// <c>PosledniPouzitiV</c> plnilo jedině z dávky bodů trasy.
    /// </summary>
    [Fact]
    public Task Po_hlaseni_telefon_vysila() => VeSveteAsync(null, async svet =>
    {
        await svet.Klice.HlasSeAsync(svet.Klic, 78, default);

        var obrazovka = await svet.Zavodnik.DnesAsync(svet.Klic, default);
        var tonda = Assert.Single(obrazovka!.Posadka);
        Assert.True(tonda.Vysila);
        Assert.Equal(78, tonda.BaterieProcent);
        Assert.NotNull(tonda.OzvalSeV);
        return true;
    });

    /// <summary>
    /// <b>Odepnutý telefon v poli není.</b> „Dneska nejedu" znamená, že tam
    /// nepatří — kdyby zůstal, hlásil by se jako chybějící a *„2 ze 3
    /// vysílají"* by lhalo oběma čísly.
    /// </summary>
    [Fact]
    public Task Odepnuty_telefon_se_v_poli_nepocita() => VeSveteAsync(null, async svet =>
    {
        await svet.Klice.SledujSamAsync(svet.Klic, false, default);

        var obrazovka = await svet.Zavodnik.DnesAsync(svet.Klic, default);
        Assert.NotNull(obrazovka);
        Assert.Empty(obrazovka!.Posadka);
        return true;
    });

    /// <summary>
    /// Bez rozpravy není plánovaný start, a bez něj se nenahrává —
    /// nahrávání nemá proti čemu měřit. Je to ta tichá polovina řetězu:
    /// rozprava udá čas, teprve pak se telefon rozjede.
    /// </summary>
    [Fact]
    public Task Dokud_rozprava_nedala_cas_se_nenahrava() => VeSveteAsync(null, async svet =>
    {
        var obrazovka = await svet.Zavodnik.DnesAsync(svet.Klic, default);
        Assert.NotNull(obrazovka);
        Assert.Null(obrazovka!.StartV);
        Assert.Null(obrazovka.NahravatOd);
        return true;
    });
}

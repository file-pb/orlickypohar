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

        public Task UlozAsync(
            string klic, byte[] data, string typ, CancellationToken ct, string? cache = null) =>
            Task.CompletedTask;

        public Task SmazAsync(string klic, CancellationToken ct) => Task.CompletedTask;
    }

    private (AppDbContext Db, BojeSprava Boje, TratSprava Trat, PrvkySprava Prvky) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var trat = new TratSprava(db, TimeProvider.System);

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

        Assert.Null((await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 2, a!.Id), kdo.Id, default)).Chyba);
        Assert.Null((await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 4, a.Id), kdo.Id, default)).Chyba);

        var seznam = await prvky.SeznamAsync(zavod.Id, default);

        Assert.Equal([2, 4], seznam.Select(p => p.Poradi).ToArray());
        Assert.All(seznam, p => Assert.Equal(a.Id, p.A.Id));
    }
}

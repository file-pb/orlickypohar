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
            new BojeSprava(db, TimeProvider.System, new ZadneUloziste(), trat,
                NullLogger<BojeSprava>.Instance),
            trat,
            new PrvkySprava(db, trat));
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
            TypPrvku.CaraStart, 1, levy!.Id, pravy!.Id,
            Poznamka: "projíždí se po proudu"), default);

        Assert.Null(chyba);
        Assert.Equal(TypPrvku.CaraStart, prvek!.Typ);
        Assert.Equal("start levý", prvek.A.Nazev);
        Assert.Equal("start pravý", prvek.B!.Nazev);
        Assert.Equal("projíždí se po proudu", prvek.Poznamka);
        Assert.Null(prvek.BodB);
    }

    [Fact]
    public async Task Konec_smi_byt_bod_kdyz_rekne_cim_je()
    {
        // Start se běžně vytyčí mezi bójí a plavidlem komise.
        var (db, boje, _, prvky) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        var (b, _) = await boje.PipniAsync(zavod.Id, Bod("start levý"), kdo.Id, default);

        var (bez, chybaBez) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.CaraStart, 1, b!.Id, KonecBSirka: 49.52, KonecBDelka: 14.17), default);
        Assert.Null(bez);
        Assert.NotNull(chybaBez);

        var (prvek, chyba) = await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.CaraStart, 1, b.Id, KonecBSirka: 49.52, KonecBDelka: 14.17,
            KonecBPopis: "plavidlo komise"), default);

        Assert.Null(chyba);
        Assert.Equal("plavidlo komise", prvek!.BodB!.Popis);
        Assert.Null(prvek.B);
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
            TypPrvku.Brana, 1, stoji!.Id, pryc.Id), default);

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
            zavod.Id, new PrvekVstup(TypPrvku.Znacka, 1, a!.Id), default);

        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        // Tentýž zámek jako u pípnutí: veřejně vydaná trať se nesmí
        // přeskládat pod lodí, která podle ní pluje.
        Assert.NotNull((await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.Znacka, 2, a.Id), default)).Chyba);
        Assert.NotNull((await prvky.UpravAsync(
            zavod.Id, zalozeny!.Id, new PrvekVstup(TypPrvku.Znacka, 9, a.Id), default)).Chyba);
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
            zavod.Id, new PrvekVstup(TypPrvku.Znacka, 2, a!.Id), default)).Chyba);
        Assert.Null((await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.Znacka, 4, a.Id), default)).Chyba);

        var seznam = await prvky.SeznamAsync(zavod.Id, default);

        Assert.Equal([2, 4], seznam.Select(p => p.Poradi).ToArray());
        Assert.All(seznam, p => Assert.Equal(a.Id, p.A.Id));
    }
}

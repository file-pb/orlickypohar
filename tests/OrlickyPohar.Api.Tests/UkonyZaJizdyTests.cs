using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Boje;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Úkony komise za jízdy — změna úseku (ZPJ 33) a chybějící značka (34).
/// <para>
/// Jádro věci: <b>trať se tím nepřestavuje</b> (Filip, 28. 10. 2026). Úkon
/// je doklad o tom, co komise vyhlásila, platí jen pro rozjížďku, která se
/// zrovna jede, a drží prvek, kterého se týkal — aby na to šlo jednou
/// navázat hendikepem, který zatím není.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class UkonyZaJizdyTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 28, 8, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, UkonyZaJizdySprava Ukony) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (db, new UkonyZaJizdySprava(db, TimeProvider.System));
    }

    /// <summary>Regata s jednou rozjížďkou, tratí a jedním prvkem na ní.</summary>
    private static async Task<(Zavod Zavod, Rozjizdka Rozjizdka, PrvekTrati Prvek, Guid Kdo)>
        PoleAsync(AppDbContext db, StavRozjizdky stav)
    {
        var klic = Guid.NewGuid().ToString("N")[..8];
        var serie = new Serie { Slug = $"ukon-{klic}", Nazev = "Úkonová série", Rok = 2027 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{klic}",
            Nazev = "Úkonová regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);

        var kdo = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = "Rozhodčí",
            Email = $"ukon-{klic}@example.test",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();

        var rozjizdka = new Rozjizdka { ZavodId = zavod.Id, Cislo = 1, Stav = stav };
        db.Rozjizdky.Add(rozjizdka);

        var boje = new Boje
        {
            ZavodId = zavod.Id,
            Nazev = "bóje 1",
            Poradi = 1,
            Sirka = 49.516,
            Delka = 14.165,
            PostavenaV = Ted,
            PostavilId = kdo.Id,
        };
        db.Boje.Add(boje);
        await db.SaveChangesAsync();

        var trat = new Trat { ZavodId = zavod.Id, RozjizdkaId = rozjizdka.Id, ZalozenaV = Ted };
        db.Trate.Add(trat);
        await db.SaveChangesAsync();

        var prvek = new PrvekTrati
        {
            TratId = trat.Id,
            Typ = TypPrvku.OtocnaBoje,
            Poradi = 2,
            Strana = StranaPrvku.PoLeve,
            BojeAId = boje.Id,
        };
        db.PrvkyTrati.Add(prvek);
        await db.SaveChangesAsync();

        return (zavod, rozjizdka, prvek, kdo.Id);
    }

    /// <summary>
    /// <b>Vlajka C beze změny směru i délky nenese žádnou informaci</b> —
    /// posádky by hledaly, co se vlastně změnilo.
    /// </summary>
    [Fact]
    public async Task Zmena_useku_musi_rict_kurz_nebo_delku()
    {
        var (db, ukony) = Sluzby();
        var (zavod, _, prvek, kdo) = await PoleAsync(db, StavRozjizdky.Probiha);

        var chyba = await ukony.VyhlasAsync(
            zavod.Id, 1, new UkonVstup(DruhUkonu.ZmenaUseku, prvek.Id), kdo, default);

        Assert.NotNull(chyba);
        Assert.Empty(await ukony.SeznamAsync(zavod.Id, 1, default));
    }

    /// <summary>
    /// Tatáž mez jako u zkrácení dráhy: před startem se staví rovnou jiná
    /// trať, po dojetí se zpětně nedoplňuje, kudy se jelo.
    /// </summary>
    [Theory]
    [InlineData(StavRozjizdky.Planovana)]
    [InlineData(StavRozjizdky.Dokoncena)]
    public async Task Mimo_bezici_rozjizdku_se_nevyhlasuje(StavRozjizdky stav)
    {
        var (db, ukony) = Sluzby();
        var (zavod, _, prvek, kdo) = await PoleAsync(db, stav);

        var chyba = await ukony.VyhlasAsync(
            zavod.Id, 1,
            new UkonVstup(DruhUkonu.ChybejiciZnacka, prvek.Id, Poznamka: "nahrazuje člun"),
            kdo, default);

        Assert.NotNull(chyba);
    }

    /// <summary>
    /// Vyhlášený úkon drží prvek, vlajku i to, co se změnilo — a <b>trati se
    /// nedotkne</b>: ta zůstává tím, co rozhodčí přijal.
    /// </summary>
    [Fact]
    public async Task Vyhlaseny_ukon_nese_vlajku_a_trat_nechava_byt()
    {
        var (db, ukony) = Sluzby();
        var (zavod, rozjizdka, prvek, kdo) = await PoleAsync(db, StavRozjizdky.Probiha);
        var tratPredtim = await db.Trate.FindAsync(prvek.TratId);
        var zkracenoPredtim = tratPredtim!.ZkracenoUPrvkuId;

        Assert.Null(await ukony.VyhlasAsync(
            zavod.Id, 1,
            new UkonVstup(DruhUkonu.ZmenaUseku, prvek.Id, Kurz: 215, Delka: ZmenaDelky.Zkraceno),
            kdo, default));
        Assert.Null(await ukony.VyhlasAsync(
            zavod.Id, 1,
            new UkonVstup(
                DruhUkonu.ChybejiciZnacka, prvek.Id,
                NahradniSirka: 49.52, NahradniDelka: 14.17, Poznamka: "doprovodný člun"),
            kdo, default));

        var seznam = await ukony.SeznamAsync(zavod.Id, 1, default);

        Assert.Equal(2, seznam.Count);
        Assert.Equal("C", seznam[0].Vlajka);
        Assert.Equal(215, seznam[0].Kurz);
        Assert.Equal(ZmenaDelky.Zkraceno, seznam[0].Delka);
        Assert.Equal(prvek.Poradi, seznam[0].PrvekPoradi);

        Assert.Equal("M", seznam[1].Vlajka);
        // U chybějící značky se kurz nevyhlašuje, i kdyby ho klient poslal.
        Assert.Null(seznam[1].Kurz);
        Assert.Equal(49.52, seznam[1].NahradniSirka);

        db.ChangeTracker.Clear();
        var tratPotom = await db.Trate.FindAsync(prvek.TratId);
        Assert.Equal(zkracenoPredtim, tratPotom!.ZkracenoUPrvkuId);
        Assert.Equal(rozjizdka.Id, tratPotom.RozjizdkaId);
    }

    /// <summary>Odvolat jde, dokud se jede; potom je to doklad.</summary>
    [Fact]
    public async Task Odvolat_jde_jen_za_jizdy()
    {
        var (db, ukony) = Sluzby();
        var (zavod, rozjizdka, prvek, kdo) = await PoleAsync(db, StavRozjizdky.Probiha);
        Assert.Null(await ukony.VyhlasAsync(
            zavod.Id, 1, new UkonVstup(DruhUkonu.ChybejiciZnacka, prvek.Id), kdo, default));

        var ukon = (await ukony.SeznamAsync(zavod.Id, 1, default))[0];

        rozjizdka.Stav = StavRozjizdky.Dokoncena;
        await db.SaveChangesAsync();
        Assert.NotNull(await ukony.OdvolejAsync(zavod.Id, 1, ukon.Id, default));

        rozjizdka.Stav = StavRozjizdky.Probiha;
        await db.SaveChangesAsync();
        Assert.Null(await ukony.OdvolejAsync(zavod.Id, 1, ukon.Id, default));
        Assert.Empty(await ukony.SeznamAsync(zavod.Id, 1, default));
    }
}

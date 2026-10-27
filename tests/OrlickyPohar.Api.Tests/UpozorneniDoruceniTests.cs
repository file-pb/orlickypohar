using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Upozorneni;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Spojení obou konců upozornění: <b>hlásí se telefon na tentýž odběr, na
/// jaký server posílá?</b>
/// <para>
/// Proč to má vlastní soubor: <c>UpozorneniTests</c> zkouší `Odbery` —
/// tvar položky, meze, duplicity — a všechno v něm procházelo, zatímco
/// zpráva nedošla nikomu. Server zařazoval na `zavod:&lt;slug&gt;`, appka se
/// hlásila na `serie:&lt;slug&gt;`, a protože se odběr hledá jako celá
/// položka, nesešly se (změřeno 26. 10. 2026). Byla to kontrola, která
/// měřila nástroj místo světa: pomocné funkce fungovaly, řetěz ne.
/// </para>
/// <para>
/// Tenhle test jde proto odjinud: zapíše zařízení přesně tak, jak ho zapisuje
/// appka, pustí ven rozjížďku a ptá se, jestli je token mezi příjemci
/// zařazeného úkolu. Kdyby se kterýkoliv konec zase přejmenoval, spadne.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class UpozorneniDoruceniTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2027, 5, 15, 16, 0, 0, TimeSpan.Zero);

    /// <summary>Token v tom tvaru, jaký vydává Expo — jiný `Odbery` nepustí.</summary>
    private static string Token() => $"ExponentPushToken[{Guid.NewGuid():N}]";

    private (AppDbContext Db, UpozorneniSprava Upozorneni, VysledkySprava Vysledky) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (db, new UpozorneniSprava(db, new ZastavenyCas(Ted)), new VysledkySprava(db, new ZastavenyCas(Ted)));
    }

    private static async Task<(string SerieSlug, Rozjizdka Rozjizdka)> RegataAsync(AppDbContext db)
    {
        var znacka = Guid.NewGuid().ToString("N")[..8];

        var serie = new Serie { Slug = $"odbery-{znacka}", Nazev = "Odběrová série", Rok = 2027 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{znacka}",
            Nazev = "Odběrová regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);
        await db.SaveChangesAsync();

        var rozjizdka = new Rozjizdka
        {
            ZavodId = zavod.Id,
            Cislo = 1,
            Stav = StavRozjizdky.Dokoncena,
        };
        db.Rozjizdky.Add(rozjizdka);
        await db.SaveChangesAsync();

        return (serie.Slug, rozjizdka);
    }

    [Fact]
    public async Task TelefonPrihlasenyKRocnikuDostaneVysledky()
    {
        var (db, upozorneni, vysledky) = Sluzby();
        var (serieSlug, rozjizdka) = await RegataAsync(db);

        // Přesně to, co posílá `app/src/lib/upozorneni.ts`.
        var token = Token();
        Assert.Null(await upozorneni.ZapisZarizeniAsync(
            token, PlatformaZarizeni.Android, [Odbery.Serie(serieSlug)], default));

        await vysledky.PublikujAsync(rozjizdka, true, default, upozorneni);

        var ukol = Assert.Single(
            await upozorneni.CekajiciAsync(default), u => u.Odber == Odbery.Serie(serieSlug));

        // Jádro věci: adresát úkolu a odběr telefonu musí být tentýž řetězec.
        var prijemci = await upozorneni.TokenyAsync(ukol.Odber, default);
        Assert.Contains(token, prijemci);
        Assert.Contains("1. rozjížďky", ukol.Text);
    }

    /// <summary>
    /// Cizí ročník zprávu nedostane. Bez tohohle by test výš prošel
    /// i tehdy, kdyby se posílalo všem.
    /// </summary>
    [Fact]
    public async Task TelefonUJinehoRocnikuNicNedostane()
    {
        var (db, upozorneni, vysledky) = Sluzby();
        var (serieSlug, rozjizdka) = await RegataAsync(db);

        var cizi = Token();
        Assert.Null(await upozorneni.ZapisZarizeniAsync(
            cizi, PlatformaZarizeni.Ios, [Odbery.Serie($"jiny-{Guid.NewGuid():N}")], default));

        await vysledky.PublikujAsync(rozjizdka, true, default, upozorneni);

        var ukol = Assert.Single(
            await upozorneni.CekajiciAsync(default), u => u.Odber == Odbery.Serie(serieSlug));
        Assert.DoesNotContain(cizi, await upozorneni.TokenyAsync(ukol.Odber, default));
    }

    /// <summary>
    /// Stažení z webu zprávu nezařadí a druhá publikace téže rozjížďky taky
    /// ne — jinak by „výsledky jsou venku" přišlo podruhé.
    /// </summary>
    [Fact]
    public async Task OpakovanaPublikaceNeposilaDvakrat()
    {
        var (db, upozorneni, vysledky) = Sluzby();
        var (serieSlug, rozjizdka) = await RegataAsync(db);

        await vysledky.PublikujAsync(rozjizdka, true, default, upozorneni);
        await vysledky.PublikujAsync(rozjizdka, true, default, upozorneni);
        await vysledky.PublikujAsync(rozjizdka, false, default, upozorneni);

        Assert.Single(
            await upozorneni.CekajiciAsync(default), u => u.Odber == Odbery.Serie(serieSlug));
    }
}

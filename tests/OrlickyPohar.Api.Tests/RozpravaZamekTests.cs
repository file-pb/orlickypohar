using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Okna;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// <b>Čím se zavírá startovní listina</b> (nálezy R38 a R39, oprava
/// z 22. 11. 2026) — proti reálnému PostgreSQL, protože je to dotaz, ne
/// pravidlo.
///
/// <para>
/// Pravidlo nad tím boolem je čistá funkce a zkouší ho
/// <see cref="PrihlaskyTests"/>. Tady jde o to, <b>odkud ten bool vzniká</b>:
/// do 22. 11. 2026 jen ze zapsaného času startu, takže mezi vyhlášenou
/// rozpravou a zápisem toho času — klidně dvacet minut — směl pořadatel
/// do listiny sahat dál. Filip 21. 11.: *„řeknu to … je to podle situace
/// v klubovně."*
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class RozpravaZamekTests(PostgresFixture fixture)
{
    private async Task<T> VeSluzbeAsync<T>(Func<IServiceProvider, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        return await co(scope.ServiceProvider);
    }

    /// <summary>Ročník s jednou zastávkou. Slug musí být v každém testu jiný.</summary>
    private Task<int> ZastavkaAsync(string slug) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var serie = new Api.Features.Serial.Serie { Nazev = $"Pohár {slug}", Slug = slug, Rok = 2026 };
            db.Serie.Add(serie);
            await db.SaveChangesAsync();

            var zavod = new Zavod
            {
                SerieId = serie.Id,
                Nazev = "Jarní vítr",
                Slug = $"jarni-vitr-{slug}",
                Datum = new DateOnly(2026, 5, 15),
                Poradi = 1,
            };
            db.Zavody.Add(zavod);
            await db.SaveChangesAsync();

            return zavod.Id;
        });

    private Task<bool> PoRozpraveAsync(int zavodId) =>
        VeSluzbeAsync(sp =>
            sp.GetRequiredService<PrihlaskySprava>().PoRozpraveAsync(zavodId, default));

    [Fact]
    public async Task Pred_rozpravou_a_bez_casu_startu_je_listina_otevrena()
    {
        Assert.False(await PoRozpraveAsync(await ZastavkaAsync("zamek-pred")));
    }

    /// <summary>
    /// <b>Jádro opravy:</b> rozprava zavírá listinu sama, ještě než někdo
    /// zapíše čas startu.
    /// </summary>
    [Fact]
    public async Task Vyhlasena_rozprava_zavira_listinu_i_bez_casu_startu()
    {
        var zavodId = await ZastavkaAsync("zamek-rozprava");

        await VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            db.Okna.Add(new OknoRegaty
            {
                ZavodId = zavodId,
                Den = 1,
                OtevrenoV = new DateTimeOffset(2026, 5, 15, 8, 30, 0, TimeSpan.Zero),
                OtevrelId = Guid.NewGuid(),
                TvrdyKonec = new DateTimeOffset(2026, 5, 15, 22, 30, 0, TimeSpan.Zero),
            });
            await db.SaveChangesAsync();
            return true;
        });

        Assert.True(await PoRozpraveAsync(zavodId));
    }

    /// <summary>
    /// Druhá cesta zůstává: kdo tlačítko rozpravy mine a rovnou nastaví
    /// čas startu, zamkne listinu tím.
    /// </summary>
    [Fact]
    public async Task Zapsany_cas_startu_zavira_listinu_i_bez_rozpravy()
    {
        var zavodId = await ZastavkaAsync("zamek-start");

        await VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            db.Rozjizdky.Add(new Rozjizdka
            {
                ZavodId = zavodId,
                Cislo = 1,
                StartV = new DateTimeOffset(2026, 5, 15, 9, 0, 0, TimeSpan.Zero),
            });
            await db.SaveChangesAsync();
            return true;
        });

        Assert.True(await PoRozpraveAsync(zavodId));
    }

    /// <summary>
    /// Rozjížďka <b>bez</b> času startu listinu nezavírá — založit ji jde
    /// i před rozpravou (ohlášení rozjížďky je dvoukrokové).
    /// </summary>
    [Fact]
    public async Task Rozjizdka_bez_casu_startu_listinu_nezavira()
    {
        var zavodId = await ZastavkaAsync("zamek-bez-casu");

        await VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            db.Rozjizdky.Add(new Rozjizdka { ZavodId = zavodId, Cislo = 1 });
            await db.SaveChangesAsync();
            return true;
        });

        Assert.False(await PoRozpraveAsync(zavodId));
    }
}

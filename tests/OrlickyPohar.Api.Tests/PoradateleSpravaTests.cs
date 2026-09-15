using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Poradatele;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pořadatelé proti reálnému PostgreSQL. Pravidla medailonku jsou čisté
/// funkce v <see cref="MedailonekTests"/>; tady jde o to, co stojí na
/// databázi — <b>párování podle unikátního slugu</b> a <b>přejmenování,
/// které dojede až na zastávky</b>.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class PoradateleSpravaTests(PostgresFixture fixture)
{
    private async Task<T> VeSluzbeAsync<T>(Func<IServiceProvider, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        return await co(scope.ServiceProvider);
    }

    private Task<int> RocnikAsync(string slug) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var serie = new Api.Features.Serial.Serie { Nazev = $"Pohár {slug}", Slug = slug, Rok = 2026 };

            db.Serie.Add(serie);
            await db.SaveChangesAsync();

            return serie.Id;
        });

    private Task ZalozAsync(int serieId, string nazev, string? poradatel, int den) =>
        VeSluzbeAsync(async sp =>
        {
            var (_, chyba) = await sp.GetRequiredService<KalendarSprava>()
                .ZalozAsync(serieId, new ZastavkaVstup(nazev, new DateOnly(2026, 6, den), Poradatel: poradatel), default);

            Assert.Null(chyba);
            return 0;
        });

    private Task<List<(string Zavod, string? Text, string? Slug)>> ZastavkyAsync(int serieId) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var radky = await db.Zavody
                .Where(z => z.SerieId == serieId)
                .OrderBy(z => z.Datum)
                .Select(z => new { z.Nazev, z.Poradatel, Slug = z.PoradatelZaznam == null ? null : z.PoradatelZaznam.Slug })
                .ToListAsync();

            return radky.Select(r => (r.Nazev, r.Poradatel, r.Slug)).ToList();
        });

    [Fact]
    public async Task Tyz_klub_napsany_jinak_je_jeden_zaznam()
    {
        // Slug je napříč ročníky, takže jméno musí být v každém testu jiné.
        var serie = await RocnikAsync("poradatel-parovani");

        await ZalozAsync(serie, "Jarní vítr", "YC Párování", 1);
        await ZalozAsync(serie, "Izolepa", "yc parovani", 2);

        var zastavky = await ZastavkyAsync(serie);

        Assert.All(zastavky, z => Assert.Equal("yc-parovani", z.Slug));
        // Text na zastávce dostane jméno záznamu, ne to, jak ho kdo napsal.
        Assert.All(zastavky, z => Assert.Equal("YC Párování", z.Text));
        Assert.Equal(1, await VeSluzbeAsync(sp =>
            sp.GetRequiredService<AppDbContext>().Poradatele.CountAsync(p => p.Slug == "yc-parovani")));
    }

    [Fact]
    public async Task Zastavka_bez_poradatele_zaznam_nema()
    {
        var serie = await RocnikAsync("poradatel-zadny");

        await ZalozAsync(serie, "Setkání", null, 1);

        Assert.Equal((null, null), (await ZastavkyAsync(serie)).Select(z => (z.Text, z.Slug)).Single());
    }

    [Fact]
    public async Task Prejmenovani_prepise_jmeno_na_vsech_zastavkach()
    {
        var serie = await RocnikAsync("poradatel-prejmenovani");
        await ZalozAsync(serie, "Jarní vítr", "YC Staré jméno", 1);
        await ZalozAsync(serie, "Izolepa", "YC Staré jméno", 2);

        var chyba = await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<PoradateleSprava>();
            var p = await sprava.NajdiAsync("yc-stare-jmeno", default);
            return await sprava.UlozAsync(p!, new PoradatelVstup(
                "Yacht Club Nové jméno", Web: "yachtclub-nove.cz", Telefon: "+420 777 123 456"), default);
        });

        Assert.Null(chyba);
        var zastavky = await ZastavkyAsync(serie);
        Assert.All(zastavky, z => Assert.Equal("Yacht Club Nové jméno", z.Text));
        // Slug jde se jménem: další zápis nového jména v kalendáři musí
        // najít tentýž klub, ne založit druhý.
        Assert.All(zastavky, z => Assert.Equal("yacht-club-nove-jmeno", z.Slug));

        var web = await VeSluzbeAsync(sp => sp.GetRequiredService<AppDbContext>().Poradatele
            .Where(p => p.Slug == "yacht-club-nove-jmeno").Select(p => p.Web).SingleAsync());
        Assert.Equal("https://yachtclub-nove.cz", web);
    }

    [Fact]
    public async Task Prejmenovat_na_existujici_klub_nejde()
    {
        var serie = await RocnikAsync("poradatel-kolize");
        await ZalozAsync(serie, "Jarní vítr", "YC Kolize A", 1);
        await ZalozAsync(serie, "Izolepa", "YC Kolize B", 2);

        var chyba = await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<PoradateleSprava>();
            var p = await sprava.NajdiAsync("yc-kolize-a", default);
            return await sprava.UlozAsync(p!, new PoradatelVstup("yc kolize b"), default);
        });

        // Sloučit dva kluby je rozhodnutí o zastávkách, ne vedlejší účinek
        // přejmenování — dělá se v kalendáři.
        Assert.NotNull(chyba);
        Assert.Contains("kalendáři", chyba);
    }

    [Fact]
    public async Task Javascript_v_adrese_webu_se_neulozi()
    {
        var serie = await RocnikAsync("poradatel-xss");
        await ZalozAsync(serie, "Jarní vítr", "YC Skript", 1);

        var chyba = await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<PoradateleSprava>();
            var p = await sprava.NajdiAsync("yc-skript", default);
            return await sprava.UlozAsync(p!, new PoradatelVstup("YC Skript", Web: "javascript:alert(1)"), default);
        });

        Assert.NotNull(chyba);
        Assert.Null(await VeSluzbeAsync(sp => sp.GetRequiredService<AppDbContext>().Poradatele
            .Where(p => p.Slug == "yc-skript").Select(p => p.Web).SingleAsync()));
    }
}

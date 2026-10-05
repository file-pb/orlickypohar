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
/// Stavění a přenastavování bójí proti reálnému PostgreSQL.
/// <para>
/// Jádro věci: <b>přenastavení nesmí přepsat, kde bóje stála</b>. Trasa lodi
/// se k trati vztahuje tak, jak stála tehdy — bez historie by se po posunu
/// bóje přepsala i minulost.
/// </para>
/// <para>Nic se neuklízí mazáním tabulek, databázi sdílí celá kolekce.</para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class BojeTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 5, 8, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, BojeSprava Boje) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (db, new BojeSprava(db, TimeProvider.System, NullLogger<BojeSprava>.Instance));
    }

    private static async Task<(Zavod Zavod, Uzivatel Kdo)> RegataAsync(AppDbContext db)
    {
        var klic = Guid.NewGuid().ToString("N")[..8];
        var serie = new Serie { Slug = $"boje-{klic}", Nazev = "Bójová série", Rok = 2027 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{klic}",
            Nazev = "Bójová regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);

        var kdo = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = "Pořadatel",
            Email = $"boje-{klic}@example.test",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();
        return (zavod, kdo);
    }

    private static PipnutiVstup Bod(string nazev, double sirka = 49.516, int? nahrazuje = null) =>
        new(nazev, 0, sirka, 14.165, 5, nahrazuje);

    [Fact]
    public async Task Postavena_boje_dostane_poradi_za_posledni()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvni, _) = await boje.PipniAsync(zavod.Id, Bod("Start levý"), kdo.Id, default);
        var (druha, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);

        Assert.Equal(1, prvni!.Poradi);
        Assert.Equal(2, druha!.Poradi);
        Assert.Equal("Pořadatel", druha.Postavil);
    }

    [Fact]
    public async Task Prenastaveni_nechava_puvodni_zaznam_v_historii()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        var (puvodni, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);

        var (nova, chyba) = await boje.PipniAsync(
            zavod.Id, Bod("Bóje 1", sirka: 49.52, nahrazuje: puvodni!.Id), kdo.Id, default);

        Assert.Null(chyba);
        // Trať vidí jen novou polohu…
        var platne = await boje.SeznamAsync(zavod.Id, iHistorie: false, default);
        Assert.Single(platne);
        Assert.Equal(nova!.Id, platne[0].Id);
        Assert.Equal(49.52, platne[0].Sirka, 5);
        // …ale stará poloha zůstává, aby šlo přečíst trasu z té doby.
        var vse = await boje.SeznamAsync(zavod.Id, iHistorie: true, default);
        Assert.Equal(2, vse.Count);
        Assert.Contains(vse, b => b.Id == puvodni.Id && Math.Abs(b.Sirka - 49.516) < 0.0001);
        // Pořadí se po bóji, kterou nahrazuje, převezme.
        Assert.Equal(puvodni.Poradi, nova.Poradi);
    }

    [Fact]
    public async Task Tataz_boje_se_neprenastavi_dvakrat()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        var (puvodni, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);
        await boje.PipniAsync(zavod.Id, Bod("Bóje 1", nahrazuje: puvodni!.Id), kdo.Id, default);

        var (nic, chyba) = await boje.PipniAsync(
            zavod.Id, Bod("Bóje 1", nahrazuje: puvodni.Id), kdo.Id, default);

        Assert.Null(nic);
        Assert.NotNull(chyba);
    }

    [Fact]
    public async Task Sebrana_boje_zmizi_z_trati_ale_ne_ze_zaznamu()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        var (postavena, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);

        Assert.Null(await boje.SeberAsync(zavod.Id, postavena!.Id, default));

        Assert.Empty(await boje.SeznamAsync(zavod.Id, iHistorie: false, default));
        var vse = await boje.SeznamAsync(zavod.Id, iHistorie: true, default);
        Assert.True(vse.Single().Sebrana);
    }

    [Fact]
    public async Task Cizi_boje_se_prenastavit_nebo_sebrat_neda()
    {
        var (db, boje) = Sluzby();
        var (prvni, kdo) = await RegataAsync(db);
        var (druha, _) = await RegataAsync(db);
        var (cizi, _) = await boje.PipniAsync(prvni.Id, Bod("Bóje 1"), kdo.Id, default);

        var (nic, chyba) = await boje.PipniAsync(
            druha.Id, Bod("Bóje 1", nahrazuje: cizi!.Id), kdo.Id, default);

        Assert.Null(nic);
        Assert.NotNull(chyba);
        Assert.NotNull(await boje.SeberAsync(druha.Id, cizi.Id, default));
    }

    [Fact]
    public async Task Nepresne_pipnuti_se_do_databaze_nedostane()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (nic, chyba) = await boje.PipniAsync(
            zavod.Id, new PipnutiVstup("Bóje 1", 0, 49.516, 14.165, 250, null), kdo.Id, default);

        Assert.Null(nic);
        Assert.NotNull(chyba);
        Assert.Empty(await db.Boje.Where(b => b.ZavodId == zavod.Id).ToListAsync());
    }
}

using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Clanky;
using OrlickyPohar.Api.Features.Prevzate;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Rotace přejatých novinek proti reálnému PostgreSQL. Stojí na unikátním
/// indexu a na mazání, což by fake databáze neověřila — a právě duplicita
/// nebo nezastavená rotace jsou tu jediné dvě věci, které můžou bolet.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class PrevzateTests(PostgresFixture fixture)
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static readonly DateTimeOffset Ted =
        new(2026, 9, 23, 12, 0, 0, TimeSpan.Zero);

    private static PolozkaKanalu Polozka(int poradi) => new(
        $"https://www.sailing.cz/clanky/clanek-{poradi}",
        $"Článek {poradi}",
        $"Perex článku {poradi}.",
        Ted.AddDays(-poradi));

    private async Task<AppDbContext> CistaDbAsync()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.PrevzateClanky.ExecuteDeleteAsync();
        return db;
    }

    [Fact]
    public async Task Novejsi_clanky_vytlaci_starsi_a_drzi_se_jich_osm()
    {
        var db = await CistaDbAsync();

        // Dvanáct článků, z nichž se osm nejnovějších udrží a čtyři vypadnou.
        var (nove, smazane) = await SberPrevzatych.UlozAsync(
            db, [.. Enumerable.Range(1, 12).Select(Polozka)], Ted, default);

        Assert.Equal(12, nove);
        Assert.Equal(4, smazane);

        var zbylo = await db.PrevzateClanky
            .OrderByDescending(c => c.PublikovanoV)
            .Select(c => c.Titulek)
            .ToListAsync();

        Assert.Equal(SberPrevzatych.Kolik, zbylo.Count);
        // Nejnovější je ten s nejmenším odstupem od „teď", tedy Článek 1.
        Assert.Equal(["Článek 1", "Článek 2", "Článek 3", "Článek 4",
                      "Článek 5", "Článek 6", "Článek 7", "Článek 8"], zbylo);
    }

    [Fact]
    public async Task Druhe_stazeni_tehoz_kanalu_nic_nezdvoji()
    {
        var db = await CistaDbAsync();
        var kanal = Enumerable.Range(1, 5).Select(Polozka).ToList();

        await SberPrevzatych.UlozAsync(db, kanal, Ted, default);
        var (nove, smazane) = await SberPrevzatych.UlozAsync(db, kanal, Ted.AddHours(6), default);

        // Idempotence, stejně jako u importu ročníku: druhý běh téhož vstupu
        // nesmí nic založit ani smazat.
        Assert.Equal(0, nove);
        Assert.Equal(0, smazane);
        Assert.Equal(5, await db.PrevzateClanky.CountAsync());
    }

    [Fact]
    public async Task Opraveny_titulek_u_zdroje_se_prepise()
    {
        var db = await CistaDbAsync();
        await SberPrevzatych.UlozAsync(db, [Polozka(1)], Ted, default);

        var opravena = Polozka(1) with { Titulek = "Článek 1 (opraveno)" };
        await SberPrevzatych.UlozAsync(db, [opravena], Ted.AddHours(6), default);

        // Zdroj smí článek opravit; přepsaný titulek je oprava, ne nový
        // článek. Klíčem je odkaz, takže se nic nezdvojí.
        var clanek = await db.PrevzateClanky.SingleAsync();
        Assert.Equal("Článek 1 (opraveno)", clanek.Titulek);
    }

    [Fact]
    public async Task Rotace_nema_co_delat_kdyz_jich_je_min_nez_osm()
    {
        var db = await CistaDbAsync();

        var (_, smazane) = await SberPrevzatych.UlozAsync(
            db, [.. Enumerable.Range(1, 3).Select(Polozka)], Ted, default);

        Assert.Equal(0, smazane);
        Assert.Equal(3, await db.PrevzateClanky.CountAsync());
    }

    [Fact]
    public async Task Verejne_cteni_vydava_odkaz_i_zdroj()
    {
        var db = await CistaDbAsync();
        await SberPrevzatych.UlozAsync(db, [Polozka(1)], Ted, default);

        var klient = fixture.CreateClient();
        var novinky = await klient.GetFromJsonAsync<List<PrevzatyClanekDto>>(
            "/prevzate-clanky", Json);

        var novinka = Assert.Single(novinky!);
        Assert.Equal("Článek 1", novinka.Titulek);

        // Odkaz na originál a jméno zdroje musí jít ven vždycky: bez nich by
        // web nemohl splnit podmínku, za které se smí přebírat.
        Assert.Equal("https://www.sailing.cz/clanky/clanek-1", novinka.Odkaz);
        Assert.Equal(SberPrevzatych.Zdroj, novinka.Zdroj);
        Assert.Equal(SberPrevzatych.ZdrojOdkaz, novinka.ZdrojOdkaz);
    }

    [Fact]
    public async Task Nas_kanal_prejate_clanky_nevydava()
    {
        var db = await CistaDbAsync();
        await SberPrevzatych.UlozAsync(db, [Polozka(1)], Ted, default);

        var klient = fixture.CreateClient();

        // Přeposílat cizí obsah dál nám nikdo nedovolil. Náš RSS staví web
        // nad `/clanky`, takže tohle je ta hranice: přejaté se tam nesmí
        // objevit ani omylem.
        var nase = await klient.GetFromJsonAsync<List<ClanekShrnutiDto>>("/clanky", Json);
        Assert.DoesNotContain(nase!, c => c.Titulek == "Článek 1");
    }
}

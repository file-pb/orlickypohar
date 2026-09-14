using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Komunitní akce proti reálnému PostgreSQL. Jde hlavně o jedno: <b>akce
/// nesmí vstoupit do poháru</b> — ani do pořadí, ani mezi zastávky, které
/// vidí appka, ani do číslování kol.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class AkceSpravaTests(PostgresFixture fixture)
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<HttpResponseMessage> Nahraj(SerieVstup vstup)
    {
        var klient = fixture.CreateClient();
        klient.DefaultRequestHeaders.Add("X-Import-Token", PostgresFixture.Token);
        return await klient.PostAsJsonAsync("/import/serie", vstup, Json);
    }

    /// <summary>
    /// Ročník s jedním odjetým kolem poháru a jednou odjetou akcí. Akce je
    /// schválně později a odjetá — kdyby ji něco bralo jako kolo, bylo by
    /// to vidět v pořadí i v číslování.
    /// </summary>
    private static SerieVstup Rocnik(string slug) => new(
        Slug: slug,
        Nazev: $"Pohár {slug}",
        Rok: 2026,
        Kategorie: [new("Race", 1)],
        Osoby: [new("novak", "Jan", "Novák")],
        Lode: [new("anicka", $"Anička {slug}", "CZE 1", "Fireball", "novak")],
        Prihlasky: [new("anicka", "Race")],
        Zavody:
        [
            new(
                Slug: "zahajeni",
                Nazev: "Zahájení sezóny",
                Datum: new DateOnly(2026, 4, 25),
                Poradi: 1,
                Ucasti: [new("anicka", "novak", null)],
                Rozjizdky: [new(1, null, StavRozjizdky.Dokoncena, [new("anicka", PoradiVCili: 1)])]),
            new(
                Slug: "setkani",
                Nazev: "Setkání u Radavy",
                Datum: new DateOnly(2026, 6, 13),
                Poradi: 1,
                Ucasti: [],
                Rozjizdky: [],
                Druh: DruhZastavky.Akce),
        ]);

    private async Task<T> Cti<T>(string adresa)
    {
        var odpoved = await fixture.CreateClient().GetAsync(adresa);
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
        return (await odpoved.Content.ReadFromJsonAsync<T>(Json))!;
    }

    [Fact]
    public async Task Akce_neni_mezi_zastavkami_poharu_ale_zvlast()
    {
        var slug = "akce-rocnik";
        Assert.Equal(HttpStatusCode.OK, (await Nahraj(Rocnik(slug))).StatusCode);

        var serie = await Cti<SerieDetailDto>($"/serie/{slug}");

        // Appka čte `Zavody` a o druhu neví — akce tam být nesmí.
        Assert.Equal(["zahajeni"], serie.Zavody.Select(z => z.Slug));
        Assert.Equal(["setkani"], serie.Akce.Select(z => z.Slug));

        var rocniky = await Cti<List<SerieShrnutiDto>>("/serie");
        Assert.Equal(1, rocniky.Single(r => r.Slug == slug).PocetZavodu);
    }

    [Fact]
    public async Task Odjeta_akce_nevstoupi_do_poradi()
    {
        var slug = "akce-poradi";
        await Nahraj(Rocnik(slug));

        var poradi = await Cti<PoradiSerieDto>($"/serie/{slug}/poradi");

        Assert.Equal(["zahajeni"], poradi.Zastavky.Select(z => z.Slug));
    }

    [Fact]
    public async Task Akce_ma_verejnou_stranku_s_druhem()
    {
        var slug = "akce-stranka";
        await Nahraj(Rocnik(slug));

        var akce = await Cti<ZavodDetailDto>($"/serie/{slug}/zavody/setkani");

        Assert.Equal(DruhZastavky.Akce, akce.Druh);
        Assert.Empty(akce.Rozjizdky);
    }

    [Fact]
    public async Task Import_akce_s_rozjizdkami_neprojde()
    {
        var rocnik = Rocnik("akce-import");
        var akce = rocnik.Zavody[1] with { Rozjizdky = rocnik.Zavody[0].Rozjizdky, Ucasti = rocnik.Zavody[0].Ucasti };

        var odpoved = await Nahraj(rocnik with { Zavody = [rocnik.Zavody[0], akce] });

        Assert.Equal(HttpStatusCode.BadRequest, odpoved.StatusCode);
    }

    [Fact]
    public async Task Akce_a_kola_poharu_se_cisluji_kazde_zvlast()
    {
        var slug = "akce-cislovani";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var kalendar = scope.ServiceProvider.GetRequiredService<KalendarSprava>();

        var serieId = await db.Serie.Where(s => s.Slug == slug).Select(s => s.Id).FirstAsync();

        // Akce před prvním kolem poháru i před dosavadní akcí.
        var (grilovani, chyba) = await kalendar.ZalozAsync(
            serieId, new ZastavkaVstup("Grilování v přístavu", new DateOnly(2026, 4, 1), Druh: DruhZastavky.Akce), default);
        Assert.Null(chyba);

        var poradi = await db.Zavody.AsNoTracking()
            .Where(z => z.SerieId == serieId)
            .ToDictionaryAsync(z => z.Slug, z => z.Poradi);

        // Zahájení zůstává prvním kolem, i když je akce dřív.
        Assert.Equal(1, poradi["zahajeni"]);
        Assert.Equal(1, poradi[grilovani!.Slug]);
        Assert.Equal(2, poradi["setkani"]);
    }

    [Fact]
    public async Task Na_akci_nejde_pridat_rozjizdku_ani_prihlasit_lod()
    {
        var slug = "akce-bez-poharu";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var zapis = scope.ServiceProvider.GetRequiredService<ZapisSprava>();
        var prihlasky = scope.ServiceProvider.GetRequiredService<PrihlaskySprava>();

        var akceId = await db.Zavody.Where(z => z.Serie!.Slug == slug && z.Slug == "setkani").Select(z => z.Id).FirstAsync();
        var prihlaska = await db.Prihlasky.Where(p => p.Serie!.Slug == slug).Select(p => p.Id).FirstAsync();

        Assert.NotNull((await zapis.PridejRozjizdkuAsync(akceId, default)).Chyba);
        Assert.NotNull((await prihlasky.PrihlasAsync(akceId, new(PrihlaskaId: prihlaska), default)).Chyba);

        var prehled = await prihlasky.PrehledAsync(akceId, poradatel: true, default);
        Assert.False(prehled.SmiSpravovat);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using OrlickyPohar.Api.Features.Clanky;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Blog proti reálnému PostgreSQL. Dvě věci, které se jinde neověří:
/// <b>hranice publikovanosti</b> — článek nesmí prozradit ročník ani zastávku,
/// které nejsou vidět — a <b>idempotence importu</b>, protože článek se páruje
/// podle slugu v sérii a druhý běh téhož souboru nesmí blog zdvojit.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class ClankyTests(PostgresFixture fixture)
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task<ImportVysledek> Nahraj(SerieVstup vstup)
    {
        var klient = fixture.CreateClient();
        klient.DefaultRequestHeaders.Add("X-Import-Token", PostgresFixture.Token);
        var odpoved = await klient.PostAsJsonAsync("/import/serie", vstup, Json);
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
        return (await odpoved.Content.ReadFromJsonAsync<ImportVysledek>(Json))!;
    }

    private static readonly DateTimeOffset Kveten =
        new(2025, 5, 9, 20, 30, 0, TimeSpan.FromHours(2));

    private static SerieVstup Rocnik(
        string slug, bool publikovano = true, bool zavodPublikovan = true,
        IReadOnlyList<ClanekVstup>? clanky = null) => new(
        Slug: slug,
        Nazev: $"Pohár {slug}",
        Rok: 2025,
        Kategorie: [new("Race", 1)],
        Osoby: [new("novak", "Jan", "Novák")],
        Lode: [new("anicka", $"Anička {slug}", "CZE 1", "Fireball", "novak")],
        Prihlasky: [new("anicka", "Race")],
        Zavody:
        [
            new(
                Slug: "zahajeni",
                Nazev: "Zahájení sezóny",
                Datum: new DateOnly(2025, 4, 26),
                Poradi: 1,
                Ucasti: [new("anicka", "novak", null)],
                Rozjizdky: [new(1, null, StavRozjizdky.Dokoncena, [new("anicka", PoradiVCili: 1)])],
                Publikovano: zavodPublikovan),
        ],
        Publikovano: publikovano,
        Clanky: clanky);

    private static ClanekVstup Novinka(
        string slug, string? zavod = null, bool publikovano = true, int denVKvetnu = 9) =>
        new(
            Slug: slug,
            Titulek: $"Titulek {slug}",
            Telo: "První odstavec.\n\nDruhý odstavec.",
            PublikovanoV: new DateTimeOffset(2025, 5, denVKvetnu, 20, 30, 0, TimeSpan.FromHours(2)),
            Perex: "Pár vět do výpisu.",
            Autor: "Organizátor",
            Zavod: zavod,
            Publikovano: publikovano);

    [Fact]
    public async Task Clanky_se_ctou_od_nejnovejsiho_i_s_telem()
    {
        await Nahraj(Rocnik("blog", clanky:
        [
            Novinka("stara", denVKvetnu: 1),
            Novinka("nova", zavod: "zahajeni", denVKvetnu: 20),
        ]));

        var klient = fixture.CreateClient();

        var seznam = await klient.GetFromJsonAsync<List<ClanekShrnutiDto>>("/serie/blog/clanky", Json);
        Assert.NotNull(seznam);
        Assert.Equal(["nova", "stara"], seznam.Select(c => c.Slug));

        // Výpis nese perex, ne tělo. Úvodní stránka by jinak stahovala celý
        // blog ročníku kvůli třem odstavcům, které nezobrazí.
        var novejsi = seznam[0];
        Assert.Equal("Pár vět do výpisu.", novejsi.Perex);
        Assert.Equal("zahajeni", novejsi.Zavod);
        Assert.Equal("Zahájení sezóny", novejsi.ZavodNazev);
        Assert.Null(seznam[1].Zavod);

        var detail = await klient.GetFromJsonAsync<ClanekDto>("/serie/blog/clanky/nova", Json);
        Assert.Equal("První odstavec.\n\nDruhý odstavec.", detail!.Telo);

        // Čas se ukládá v UTC, ale musí to být tentýž okamžik, jaký přišel.
        Assert.Equal(Kveten.AddDays(11).ToUniversalTime(), detail.PublikovanoV.ToUniversalTime());
    }

    [Fact]
    public async Task Vypis_jde_zuzit_na_zastavku_i_na_pocet()
    {
        await Nahraj(Rocnik("filtr", clanky:
        [
            Novinka("serie-1", denVKvetnu: 1),
            Novinka("zastavka-1", zavod: "zahajeni", denVKvetnu: 2),
            Novinka("zastavka-2", zavod: "zahajeni", denVKvetnu: 3),
        ]));

        var klient = fixture.CreateClient();

        var uZastavky = await klient.GetFromJsonAsync<List<ClanekShrnutiDto>>(
            "/serie/filtr/clanky?zavod=zahajeni", Json);
        Assert.Equal(["zastavka-2", "zastavka-1"], uZastavky!.Select(c => c.Slug));

        var nejnovejsi = await klient.GetFromJsonAsync<List<ClanekShrnutiDto>>(
            "/serie/filtr/clanky?limit=1", Json);
        Assert.Equal(["zastavka-2"], nejnovejsi!.Select(c => c.Slug));

        // Prázdný parametr je nevyplněný, ne filtr na „články bez zastávky".
        var vse = await klient.GetFromJsonAsync<List<ClanekShrnutiDto>>(
            "/serie/filtr/clanky?zavod=&limit=0", Json);
        Assert.Equal(3, vse!.Count);
    }

    [Fact]
    public async Task Nepublikovany_clanek_rocnik_ani_zastavka_se_ven_nedostanou()
    {
        await Nahraj(Rocnik("skryte", clanky:
        [
            Novinka("koncept", publikovano: false),
            Novinka("videt"),
        ]));

        // Celý ročník neveřejný.
        await Nahraj(Rocnik("tajny", publikovano: false, clanky: [Novinka("uvnitr")]));

        // Ročník veřejný, ale zastávka ne — a s ní ani její pozvánka.
        await Nahraj(Rocnik("skryta-zastavka", zavodPublikovan: false, clanky:
        [
            Novinka("pozvanka", zavod: "zahajeni"),
            Novinka("o-serii"),
        ]));

        var klient = fixture.CreateClient();

        var verejne = await klient.GetFromJsonAsync<List<ClanekShrnutiDto>>("/serie/skryte/clanky", Json);
        Assert.Equal(["videt"], verejne!.Select(c => c.Slug));

        // 404, ne 403 — stejně jako u ročníku a zastávky.
        Assert.Equal(HttpStatusCode.NotFound,
            (await klient.GetAsync("/serie/skryte/clanky/koncept")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await klient.GetAsync("/serie/tajny/clanky")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await klient.GetAsync("/serie/tajny/clanky/uvnitr")).StatusCode);

        var uSkryte = await klient.GetFromJsonAsync<List<ClanekShrnutiDto>>(
            "/serie/skryta-zastavka/clanky", Json);
        Assert.Equal(["o-serii"], uSkryte!.Select(c => c.Slug));
        Assert.Equal(HttpStatusCode.NotFound,
            (await klient.GetAsync("/serie/skryta-zastavka/clanky/pozvanka")).StatusCode);
    }

    [Fact]
    public async Task Druhy_import_blog_nezdvoji_a_opravu_propise()
    {
        var prvni = await Nahraj(Rocnik("dvakrat", clanky: [Novinka("zprava", zavod: "zahajeni")]));
        Assert.Equal(1, prvni.Clanky.Nove);

        var podruhe = await Nahraj(Rocnik("dvakrat", clanky:
        [
            Novinka("zprava", zavod: "zahajeni") with { Titulek = "Opravený titulek" },
        ]));

        // Druhý běh nezakládá, jen aktualizuje — to je pozorovatelný důkaz,
        // že se článek páruje podle slugu a ne podle pořadí v souboru.
        Assert.Equal(0, podruhe.Clanky.Nove);
        Assert.Equal(1, podruhe.Clanky.Aktualizovane);

        var klient = fixture.CreateClient();
        var seznam = await klient.GetFromJsonAsync<List<ClanekShrnutiDto>>("/serie/dvakrat/clanky", Json);
        var jediny = Assert.Single(seznam!);
        Assert.Equal("Opravený titulek", jediny.Titulek);
    }

    [Fact]
    public async Task Castecny_soubor_blog_nesmaze()
    {
        await Nahraj(Rocnik("nemazat", clanky: [Novinka("prvni"), Novinka("druhy", denVKvetnu: 10)]));

        // Uvnitř závodu je soubor úplná pravda, u blogu ne: až bude psát
        // pořadatel v administraci, import ročníku o jeho článcích vědět
        // nebude — a smazal by je.
        await Nahraj(Rocnik("nemazat", clanky: [Novinka("prvni")]));

        var klient = fixture.CreateClient();
        var seznam = await klient.GetFromJsonAsync<List<ClanekShrnutiDto>>("/serie/nemazat/clanky", Json);
        Assert.Equal(2, seznam!.Count);
    }

    [Fact]
    public async Task Clanek_na_neexistujici_zastavku_neprojde()
    {
        var klient = fixture.CreateClient();
        klient.DefaultRequestHeaders.Add("X-Import-Token", PostgresFixture.Token);

        var odpoved = await klient.PostAsJsonAsync(
            "/import/serie",
            Rocnik("preklep", clanky: [Novinka("pozvanka", zavod: "zahajeni-preklep")]),
            Json);

        // Překlep ve slugu by jinak vyrobil novinku viset u ničeho.
        Assert.Equal(HttpStatusCode.BadRequest, odpoved.StatusCode);
    }
}

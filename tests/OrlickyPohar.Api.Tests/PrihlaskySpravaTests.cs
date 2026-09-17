using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Přihlášky lodí na zastávku proti reálnému PostgreSQL.
/// <para>
/// Pravidla jsou čisté funkce v <see cref="PrihlaskyTests"/>. Tady jde o to,
/// co s nimi dělá databáze: zakládání lodí, soužití s importem a co z toho
/// vidí veřejnost.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class PrihlaskySpravaTests(PostgresFixture fixture)
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private async Task Nahraj(SerieVstup vstup)
    {
        var klient = fixture.CreateClient();
        klient.DefaultRequestHeaders.Add("X-Import-Token", PostgresFixture.Token);
        var odpoved = await klient.PostAsJsonAsync("/import/serie", vstup, Json);
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
    }

    /// <summary>
    /// Ročník se dvěma kategoriemi a dvěma loděmi. Na zastávku podle importu
    /// přijela jen Anička; Bóra je v ročníku, ale na zastávce ne.
    /// </summary>
    private static SerieVstup Rocnik(string slug) => new(
        Slug: slug,
        Nazev: $"Pohár {slug}",
        Rok: 2026,
        Kategorie: [new("Race", 1), new("Pod7m", 2)],
        Osoby: [new("novak", "Jan", "Novák"), new("svoboda", "Petr", "Svoboda")],
        Lode:
        [
            new("anicka", $"Anička {slug}", "CZE 1", "Fireball", "novak"),
            new("bora", $"Bóra {slug}", "CZE 2", "Vaurien", "svoboda"),
        ],
        Prihlasky: [new("anicka", "Race"), new("bora", "Race")],
        Zavody:
        [
            new(
                Slug: "zahajeni",
                Nazev: "Zahájení sezóny",
                Datum: new DateOnly(2026, 4, 25),
                Poradi: 1,
                Ucasti: [new("anicka", "novak", null)],
                Rozjizdky:
                [
                    new(1, null, StavRozjizdky.Dokoncena, [new("anicka", PoradiVCili: 1)],
                        StavVysledku: StavVysledku.Navrzeno),
                ]),
        ]);

    private sealed record Kontext(AppDbContext Db, PrihlaskySprava Sprava, int ZavodId, int Anicka, int Bora);

    private static async Task<Kontext> KontextAsync(AsyncServiceScope scope, string slug)
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sprava = scope.ServiceProvider.GetRequiredService<PrihlaskySprava>();

        var zavodId = await db.Zavody.Where(z => z.Serie!.Slug == slug).Select(z => z.Id).FirstAsync();
        var prihlasky = await db.Prihlasky
            .Where(p => p.Serie!.Slug == slug)
            .Select(p => new { p.Id, p.Lod!.Nazev })
            .ToListAsync();

        return new Kontext(db, sprava, zavodId,
            prihlasky.Single(p => p.Nazev.StartsWith("Anička")).Id,
            prihlasky.Single(p => p.Nazev.StartsWith("Bóra")).Id);
    }

    private async Task<ZavodDetailDto> VerejneAsync(string slug)
    {
        var odpoved = await fixture.CreateClient().GetAsync($"/serie/{slug}/zavody/zahajeni");
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
        return (await odpoved.Content.ReadFromJsonAsync<ZavodDetailDto>(Json))!;
    }

    [Fact]
    public async Task Prihlasena_lod_je_verejne_videt_jako_nepotvrzena_a_zrusena_zmizi()
    {
        var slug = "prihlasky-verejne";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var k = await KontextAsync(scope, slug);

        var (lod, nova, chyba) = await k.Sprava.PrihlasAsync(k.ZavodId, new(PrihlaskaId: k.Bora), default);

        Assert.Null(chyba);
        Assert.True(nova);
        Assert.Equal(StavUcasti.Prihlasena, lod!.Stav);

        var bora = (await VerejneAsync(slug)).Lode.Single(l => l.Lod.StartsWith("Bóra"));
        Assert.False(bora.Potvrzena);

        Assert.Null((await k.Sprava.PrepniAsync(k.ZavodId, k.Bora, StavUcasti.Zrusena, default)).Chyba);

        // Zrušená přihláška veřejně neexistuje; záznam pro pořadatele zůstává.
        Assert.DoesNotContain((await VerejneAsync(slug)).Lode, l => l.Lod.StartsWith("Bóra"));
        Assert.True(await k.Db.Ucasti.AnyAsync(u => u.ZavodId == k.ZavodId && u.PrihlaskaId == k.Bora));
    }

    [Fact]
    public async Task Nova_lod_se_zalozi_i_s_majitelem_a_druhe_prihlaseni_nic_nezduplikuje()
    {
        var slug = "prihlasky-nova";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var k = await KontextAsync(scope, slug);

        var vstup = new PrihlaseniVstup(NovaLod: new($"Cassiopeia {slug}", "Pod7m", "Eva", "Malá", "CZE 886"));

        var prvni = await k.Sprava.PrihlasAsync(k.ZavodId, vstup, default);
        var druhe = await k.Sprava.PrihlasAsync(k.ZavodId, vstup, default);

        Assert.Null(prvni.Chyba);
        Assert.True(prvni.Nova);
        Assert.Equal("Pod7m", prvni.Lod!.Kategorie);
        Assert.Equal("Eva Malá", prvni.Lod.Majitel);

        // Druhé přihlášení téže lodi není chyba, jen se nic nezmění.
        Assert.Null(druhe.Chyba);
        Assert.False(druhe.Nova);

        Assert.Equal(1, await k.Db.Lode.CountAsync(l => l.Nazev == $"Cassiopeia {slug}"));
        Assert.Equal(3, await k.Db.Prihlasky.CountAsync(p => p.Serie!.Slug == slug));
    }

    [Fact]
    public async Task Lod_z_rocniku_v_jine_kategorii_neprojde()
    {
        var slug = "prihlasky-kategorie";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var k = await KontextAsync(scope, slug);

        // Anička jede Race. Změna kategorie je rozhodnutí správce, ne
        // vedlejší účinek přihlášky.
        var (_, _, chyba) = await k.Sprava.PrihlasAsync(
            k.ZavodId, new(NovaLod: new($"Anička {slug}", "Pod7m", "Jan", "Novák")), default);

        Assert.Contains("Race", chyba);
    }

    [Fact]
    public async Task Lod_s_vysledky_zrusit_nejde()
    {
        var slug = "prihlasky-vysledky";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var k = await KontextAsync(scope, slug);

        var (_, chyba) = await k.Sprava.PrepniAsync(k.ZavodId, k.Anicka, StavUcasti.Zrusena, default);

        Assert.NotNull(chyba);
    }

    [Fact]
    public async Task Nove_nahrani_rocniku_prihlasky_poradatele_nesmaze()
    {
        var slug = "prihlasky-import";
        await Nahraj(Rocnik(slug));

        await using (var scope = fixture.Services.CreateAsyncScope())
        {
            var k = await KontextAsync(scope, slug);
            Assert.Null((await k.Sprava.PrihlasAsync(k.ZavodId, new(PrihlaskaId: k.Bora), default)).Chyba);
        }

        // Sešit rozhodčího o přihlášce neví. Je to úplná pravda o tom, kdo
        // jel, ne o tom, kdo se přihlásil.
        await Nahraj(Rocnik(slug));

        await using (var scope = fixture.Services.CreateAsyncScope())
        {
            var k = await KontextAsync(scope, slug);
            var bora = await k.Db.Ucasti.SingleAsync(u => u.ZavodId == k.ZavodId && u.PrihlaskaId == k.Bora);

            Assert.Equal(StavUcasti.Prihlasena, bora.Stav);
        }
    }

    [Fact]
    public async Task Vysledek_prihlasenou_lod_potvrdi()
    {
        var slug = "prihlasky-zapis";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var k = await KontextAsync(scope, slug);
        var zapis = scope.ServiceProvider.GetRequiredService<ZapisSprava>();

        Assert.Null((await k.Sprava.PrihlasAsync(k.ZavodId, new(PrihlaskaId: k.Bora), default)).Chyba);

        var rozjizdka = await k.Db.Rozjizdky.FirstAsync(r => r.ZavodId == k.ZavodId && r.Cislo == 1);
        Assert.Null(await zapis.UlozAsync(rozjizdka,
            [new(k.Anicka, PoradiVCili: 1), new(k.Bora, PoradiVCili: 2)], default));

        // Loď s výsledkem přijela, ať byla jen přihlášená, nebo ne.
        var bora = await k.Db.Ucasti.AsNoTracking()
            .SingleAsync(u => u.ZavodId == k.ZavodId && u.PrihlaskaId == k.Bora);
        Assert.Equal(StavUcasti.Potvrzena, bora.Stav);
    }

    [Fact]
    public async Task Zmeny_stavu_se_zapisuji_i_s_duvodem_a_nepotvrzeny_pozadavek_neni_videt()
    {
        var slug = "prihlasky-historie";
        await Nahraj(Rocnik(slug));

        await using var scope = fixture.Services.CreateAsyncScope();
        var k = await KontextAsync(scope, slug);

        await k.Sprava.PrihlasAsync(k.ZavodId, new(PrihlaskaId: k.Bora), default);

        // Vrácení k doplnění bez důvodu neprojde, s důvodem ano.
        Assert.NotNull((await k.Sprava.PrepniAsync(k.ZavodId, k.Bora, StavUcasti.KDoplneni, default)).Chyba);
        var (lod, chyba) = await k.Sprava.PrepniAsync(
            k.ZavodId, k.Bora, StavUcasti.KDoplneni, default, duvod: "Chybí telefon.");
        Assert.Null(chyba);
        Assert.Equal("Chybí telefon.", lod!.Duvod);

        Assert.DoesNotContain((await VerejneAsync(slug)).Lode, l => l.Lod.StartsWith("Bóra"));

        // Pořadatel nevylučuje.
        Assert.NotNull((await k.Sprava.PrepniAsync(
            k.ZavodId, k.Anicka, StavUcasti.Vyloucena, default, duvod: "Zkratka.")).Chyba);
        Assert.Null((await k.Sprava.PrepniAsync(
            k.ZavodId, k.Anicka, StavUcasti.Vyloucena, default, duvod: "Zkratka.",
            role: Prihlasky.Kdo.Rozhodci)).Chyba);

        var anicka = (await VerejneAsync(slug)).Lode.Single(l => l.Lod.StartsWith("Anička"));
        Assert.True(anicka.Vyloucena);

        var zmeny = await k.Db.Set<ZmenaUcasti>()
            .Where(z => z.Ucast!.ZavodId == k.ZavodId)
            .OrderBy(z => z.Id)
            .Select(z => new { z.Ze, z.Na, z.Duvod })
            .ToListAsync();

        Assert.Equal(
            [(null, StavUcasti.Prihlasena, null), (StavUcasti.Prihlasena, StavUcasti.KDoplneni, "Chybí telefon."),
             (StavUcasti.Potvrzena, StavUcasti.Vyloucena, "Zkratka.")],
            zmeny.Select(z => ((StavUcasti?)z.Ze, z.Na, z.Duvod)));
    }
}

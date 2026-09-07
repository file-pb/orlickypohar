using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Import;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Import proti reálnému PostgreSQL. Nejdražší vlastnost celého endpointu je
/// idempotence: kdyby druhý běh duplikoval, pozná se to až podle rozdvojených
/// výsledků v pořadí seriálu — tedy pozdě a nápadně.
/// </summary>
public class ImportTests(PostgresFixture fixture) : IClassFixture<PostgresFixture>
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private HttpClient Klient(string? token = PostgresFixture.Token)
    {
        var c = fixture.CreateClient();
        if (token is not null) c.DefaultRequestHeaders.Add("X-Import-Token", token);
        return c;
    }

    private static SerieVstup Rocnik(string slug) => new(
        Slug: slug,
        Nazev: $"Testovací pohár {slug}",
        Rok: 2025,
        Kategorie: [new("Race", 1), new("Pod7m", 2)],
        Osoby: [new("novak", "Jan", "Novák"), new("svoboda", "Petr", "Svoboda")],
        Lode:
        [
            new("anicka", $"Anička {slug}", "CZE 1", "Fireball", "novak"),
            new("bora", $"Bóra {slug}", "CZE 2", "Vaurien", "svoboda"),
        ],
        Prihlasky: [new("anicka", "Race"), new("bora", "Pod7m")],
        Zavody:
        [
            new(
                Slug: "zahajeni",
                Nazev: "Zahájení sezóny",
                Datum: new DateOnly(2025, 4, 26),
                Poradi: 1,
                Ucasti: [new("anicka", "novak", null), new("bora", "svoboda", null)],
                Rozjizdky:
                [
                    new(1, null, OrlickyPohar.Api.Features.Zavody.StavRozjizdky.Dokoncena,
                    [
                        new("anicka", PoradiVCili: 1, CasSekundy: 3600),
                        new("bora", Kod: OrlickyPohar.Api.Features.Zavody.KodVysledku.Dnf),
                    ]),
                ]),
        ]);

    private async Task<ImportVysledek> Posli(SerieVstup vstup)
    {
        var odpoved = await Klient().PostAsJsonAsync("/import/serie", vstup, Json);
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
        return (await odpoved.Content.ReadFromJsonAsync<ImportVysledek>(Json))!;
    }

    [Fact]
    public async Task Druhy_beh_tehoz_souboru_nic_nezduplikuje()
    {
        var vstup = Rocnik("idempotence");

        var prvni = await Posli(vstup);
        Assert.Equal(2, prvni.Lode.Nove);
        Assert.Equal(2, prvni.Vysledky.Nove);

        var druhy = await Posli(vstup);
        Assert.Equal(0, druhy.Lode.Nove);
        Assert.Equal(0, druhy.Prihlasky.Nove);
        Assert.Equal(0, druhy.Zavody.Nove);
        Assert.Equal(0, druhy.Rozjizdky.Nove);
        Assert.Equal(0, druhy.Vysledky.Nove);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var serie = await db.Serie.SingleAsync(s => s.Slug == "idempotence");

        Assert.Equal(1, await db.Zavody.CountAsync(z => z.SerieId == serie.Id));
        Assert.Equal(2, await db.Prihlasky.CountAsync(p => p.SerieId == serie.Id));
    }

    [Fact]
    public async Task Oprava_vysledku_prepise_puvodni_radek()
    {
        var vstup = Rocnik("oprava");
        await Posli(vstup);

        // Rozhodčí opraví Bóře DNF na třetí místo — týž soubor, jiná hodnota.
        var rozjizdka = vstup.Zavody[0].Rozjizdky[0];
        var opravene = vstup with
        {
            Zavody =
            [
                vstup.Zavody[0] with
                {
                    Rozjizdky =
                    [
                        rozjizdka with
                        {
                            Vysledky =
                            [
                                rozjizdka.Vysledky[0],
                                new("bora", PoradiVCili: 2, CasSekundy: 4200),
                            ],
                        },
                    ],
                },
            ],
        };

        var druhy = await Posli(opravene);
        Assert.Equal(0, druhy.Vysledky.Nove);
        Assert.Equal(2, druhy.Vysledky.Aktualizovane);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var bora = await db.Vysledky
            .Include(v => v.Ucast!).ThenInclude(u => u.Prihlaska!).ThenInclude(p => p.Lod)
            .SingleAsync(v => v.Ucast!.Prihlaska!.Lod!.Nazev == "Bóra oprava");

        Assert.Equal(2, bora.PoradiVCili);
        Assert.Null(bora.Kod);
    }

    [Fact]
    public async Task Bez_tokenu_se_neimportuje()
    {
        var odpoved = await Klient(token: null).PostAsJsonAsync("/import/serie", Rocnik("bez-tokenu"), Json);

        Assert.Equal(HttpStatusCode.Unauthorized, odpoved.StatusCode);
    }

    [Fact]
    public async Task Spatny_odkaz_neulozi_nic()
    {
        var vstup = Rocnik("rollback");
        var rozbity = vstup with
        {
            Prihlasky = [.. vstup.Prihlasky, new("neexistujici-lod", "Race")],
        };

        var odpoved = await Klient().PostAsJsonAsync("/import/serie", rozbity, Json);
        Assert.Equal(HttpStatusCode.BadRequest, odpoved.StatusCode);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Klíčové: dávka je celá, nebo žádná. Série se nesmí založit ani zpola.
        Assert.False(await db.Serie.AnyAsync(s => s.Slug == "rollback"));
    }

    [Fact]
    public async Task Vysledek_bez_poradi_i_kodu_je_chyba()
    {
        var vstup = Rocnik("neuplny");
        var rozjizdka = vstup.Zavody[0].Rozjizdky[0];
        var rozbity = vstup with
        {
            Zavody =
            [
                vstup.Zavody[0] with
                {
                    Rozjizdky = [rozjizdka with { Vysledky = [new("anicka")] }],
                },
            ],
        };

        var odpoved = await Klient().PostAsJsonAsync("/import/serie", rozbity, Json);

        Assert.Equal(HttpStatusCode.BadRequest, odpoved.StatusCode);
    }
}

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
/// Import proti reálnému PostgreSQL. Nejdražší vlastnost celého endpointu je
/// idempotence: kdyby druhý běh duplikoval, pozná se to až podle rozdvojených
/// výsledků v pořadí seriálu — tedy pozdě a nápadně.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class ImportTests(PostgresFixture fixture)
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
    public async Task Lod_ktera_ze_souboru_zmizi_odejde_z_rocniku()
    {
        // Rozhodčí loď přejmenuje a ta stará ze sešitu zmizí. Když zůstane
        // přihlášená do ročníku, sbírá dál neúčast na každé regatě a stojí
        // v průběžném pořadí — přesně to dělala SANDY přejmenovaná na SENDY.
        var puvodni = Rocnik("odchod");
        await Posli(puvodni);

        var zavod = puvodni.Zavody[0];
        var opraveny = puvodni with
        {
            Lode = [puvodni.Lode[0]],
            Prihlasky = [puvodni.Prihlasky[0]],
            Zavody =
            [
                zavod with
                {
                    Ucasti = [zavod.Ucasti[0]],
                    Rozjizdky = [zavod.Rozjizdky[0] with { Vysledky = [zavod.Rozjizdky[0].Vysledky[0]] }],
                },
            ],
        };

        var druhy = await Posli(opraveny);
        Assert.Equal(1, druhy.Prihlasky.Smazane);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lode = await db.Prihlasky
            .Where(p => p.Serie!.Slug == "odchod")
            .Select(p => p.Lod!.Nazev)
            .ToListAsync();

        Assert.Equal(["Anička odchod"], lode);
    }

    [Fact]
    public async Task Lod_prihlasenou_v_administraci_import_nesmaze()
    {
        // Pořadatel zapíše na příští regatu loď, o které sešit rozhodčího
        // neví. Nahrání ročníku ji nesmí odnést — soubor je pravda o tom,
        // co se odjelo, ne o tom, kdo se teprve chystá.
        var vstup = Rocnik("prihlaska-navic");
        await Posli(vstup);

        using (var scope = fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var serie = await db.Serie.SingleAsync(s => s.Slug == "prihlaska-navic");
            var kategorie = await db.Kategorie.FirstAsync(k => k.SerieId == serie.Id);
            var zavod = await db.Zavody.FirstAsync(z => z.SerieId == serie.Id);
            var majitel = await db.Osoby.FirstAsync();
            var lod = new OrlickyPohar.Api.Features.Lode.Lod
            {
                Nazev = "Pozdní host",
                MajitelId = majitel.Id,
            };

            var prihlaska = new OrlickyPohar.Api.Features.Serial.Prihlaska
            {
                Serie = serie,
                Lod = lod,
                Kategorie = kategorie,
            };
            db.Ucasti.Add(new Ucast { Zavod = zavod, Prihlaska = prihlaska, Stav = StavUcasti.Prihlasena });
            await db.SaveChangesAsync();
        }

        await Posli(vstup);

        using var overeni = fixture.Services.CreateScope();
        var db2 = overeni.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(await db2.Prihlasky.AnyAsync(p => p.Lod!.Nazev == "Pozdní host"));
    }

    [Fact]
    public async Task Prvni_import_nastavi_pravidla_rocniku()
    {
        // Pravidla ročníku (škrty, mlčení o výsledcích regat) musí platit už
        // po prvním importu. Zakládací cesta je dřív neznala, takže první
        // běh dal jiný ročník než druhý a mlčení se zapnulo až opravou.
        var vstup = Rocnik("pravidla-hned") with { PocetSkrtu = 2, VysledkyZavoduVerejne = false };
        await Posli(vstup);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var serie = await db.Serie.SingleAsync(s => s.Slug == "pravidla-hned");

        Assert.Equal(2, serie.PocetSkrtu);
        Assert.False(serie.VysledkyZavoduVerejne);
    }

    [Fact]
    public async Task Oprava_ktera_radek_ubere_ho_smaze()
    {
        // Idempotence sama o sobě nestačí. Když z opraveného ročníku výsledek
        // zmizí, musí zmizet i z databáze — jinak umí oprava jen přidávat
        // a přepisovat a loď, která nikdy nestartovala, zůstane v pořadí
        // napořád. Přesně to se stalo na produkci: loď vypadla ze souboru
        // a v tabulce zůstala.
        var puvodni = Rocnik("mazani") with
        {
            Zavody =
            [
                Rocnik("mazani").Zavody[0] with
                {
                    Rozjizdky =
                    [
                        Rocnik("mazani").Zavody[0].Rozjizdky[0],
                        new(2, null, StavRozjizdky.Dokoncena,
                        [
                            new("anicka", PoradiVCili: 1),
                            new("bora", PoradiVCili: 2),
                        ]),
                    ],
                },
            ],
        };

        var prvni = await Posli(puvodni);
        Assert.Equal(2, prvni.Rozjizdky.Nove);
        Assert.Equal(4, prvni.Vysledky.Nove);

        // Opravený ročník: Bóra na závodě vůbec nebyla a druhá rozjížďka
        // se nejela.
        var opraveny = puvodni with
        {
            Zavody =
            [
                puvodni.Zavody[0] with
                {
                    Ucasti = [new("anicka", "novak", null)],
                    Rozjizdky =
                    [
                        new(1, null, StavRozjizdky.Dokoncena, [new("anicka", PoradiVCili: 1)]),
                    ],
                },
            ],
        };

        var druhy = await Posli(opraveny);
        Assert.Equal(1, druhy.Ucasti.Smazane);
        Assert.Equal(1, druhy.Rozjizdky.Smazane);
        // Tři: Bóřin výsledek z první rozjížďky a obě z té zrušené.
        Assert.Equal(3, druhy.Vysledky.Smazane);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var zavod = await db.Zavody.SingleAsync(z => z.Serie!.Slug == "mazani");

        Assert.Equal(1, await db.Ucasti.CountAsync(u => u.ZavodId == zavod.Id));
        Assert.Equal(1, await db.Rozjizdky.CountAsync(r => r.ZavodId == zavod.Id));
        Assert.Equal(1, await db.Vysledky.CountAsync(v => v.Rozjizdka!.ZavodId == zavod.Id));

        // A opakovaný běh opraveného souboru už nemaže nic — mazání je
        // součást idempotence, ne výjimka z ní.
        var treti = await Posli(opraveny);
        Assert.Equal(0, treti.Ucasti.Smazane);
        Assert.Equal(0, treti.Rozjizdky.Smazane);
        Assert.Equal(0, treti.Vysledky.Smazane);
        Assert.Equal(0, treti.Vysledky.Nove);
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
    public async Task Cas_s_letnim_posunem_se_ulozi()
    {
        // Skutečná data mají +02:00, ne UTC. PostgreSQL jiný posun než nula
        // nepřijme, takže se převádí — a chybí-li převod, selže to až při
        // zápisu do databáze, tedy uprostřed importu.
        var start = new DateTimeOffset(2025, 4, 26, 10, 0, 0, TimeSpan.FromHours(2));
        var vstup = Rocnik("letni-cas");
        var rozjizdka = vstup.Zavody[0].Rozjizdky[0];
        var sCasem = vstup with
        {
            Zavody =
            [
                vstup.Zavody[0] with
                {
                    Rozjizdky =
                    [
                        rozjizdka with
                        {
                            StartV = start,
                            Vysledky =
                            [
                                new("anicka", PoradiVCili: 1, DojezdV: start.AddHours(1), CasSekundy: 3600),
                                rozjizdka.Vysledky[1],
                            ],
                        },
                    ],
                },
            ],
        };

        await Posli(sCasem);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ulozena = await db.Rozjizdky
            .SingleAsync(r => r.Zavod!.Serie!.Slug == "letni-cas");

        Assert.Equal(start.ToUniversalTime(), ulozena.StartV);
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

    // --- Zastaralý soubor (oponentura, 5. 10. 2026) -------------------------
    // Idempotence chrání před opakováním téhož souboru, ne před jeho
    // zastaralostí. Co tu padá, je přepsání provozních výsledků souborem,
    // který vznikl dřív.

    private async Task<(HttpStatusCode Stav, JsonDocument Telo)> PosliSurove(
        SerieVstup vstup, string dotaz = "")
    {
        var odpoved = await Klient().PostAsJsonAsync($"/import/serie{dotaz}", vstup, Json);
        return (odpoved.StatusCode,
            JsonDocument.Parse(await odpoved.Content.ReadAsStringAsync()));
    }

    /// <summary>Zapíše sadu výsledků aplikací, tedy mimo import — `Revize` povyroste.</summary>
    private async Task ZapisAplikaciAsync(string slug)
    {
        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var zapis = scope.ServiceProvider.GetRequiredService<ZapisSprava>();

        var rozjizdka = await db.Rozjizdky.FirstAsync(r => r.Zavod!.Serie!.Slug == slug);
        var prihlaska = await db.Prihlasky.Where(p => p.Serie!.Slug == slug)
            .Select(p => p.Id).FirstAsync();

        // Import nese potvrzené výsledky a do těch se nezapisuje. Rozhodčí
        // je v takovém případě vrátí k revizi — tohle je ta situace.
        rozjizdka.StavVysledku = StavVysledku.KRevizi;
        await db.SaveChangesAsync();

        Assert.Null((await zapis.UlozAsync(
            rozjizdka, [new(prihlaska, PoradiVCili: 1)], default,
            revize: rozjizdka.Revize)).Chyba);
    }

    [Fact]
    public async Task Nahled_nic_neulozi_ale_rekne_co_by_se_stalo()
    {
        var vstup = Rocnik("nahled");

        var (stav, telo) = await PosliSurove(vstup, "?rezim=nahled");

        Assert.Equal(HttpStatusCode.OK, stav);
        Assert.True(telo.RootElement.GetProperty("nahled").GetBoolean());
        Assert.Equal(2, telo.RootElement.GetProperty("vysledek")
            .GetProperty("lode").GetProperty("nove").GetInt32());
        Assert.NotEmpty(telo.RootElement.GetProperty("otisk").GetString()!);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(await db.Serie.Where(x => x.Slug == "nahled").ToListAsync());
    }

    [Fact]
    public async Task Soubor_neprepise_vysledky_zapsane_aplikaci()
    {
        var vstup = Rocnik("zastaraly");
        await Posli(vstup);
        await ZapisAplikaciAsync("zastaraly");

        // Tentýž soubor, který předtím prošel, teď vrací závod do minulosti.
        var (stav, telo) = await PosliSurove(vstup);

        Assert.Equal(HttpStatusCode.Conflict, stav);
        Assert.Equal(Prepis.PotrebaOprava, telo.RootElement.GetProperty("error").GetString());
        var kolize = telo.RootElement.GetProperty("kolize");
        Assert.True(kolize.GetArrayLength() >= 1);
        Assert.Contains("aplikaci", kolize[0].GetProperty("co").GetString());
    }

    [Fact]
    public async Task Rezim_opravy_bez_otisku_neprojde()
    {
        var vstup = Rocnik("oprava-naslepo");
        await Posli(vstup);

        var (stav, telo) = await PosliSurove(vstup, "?rezim=oprava");

        Assert.Equal(HttpStatusCode.BadRequest, stav);
        Assert.Equal(Prepis.OtiskChybi, telo.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Otisk_z_nahledu_prestane_platit_po_zapisu()
    {
        var vstup = Rocnik("otisk");
        await Posli(vstup);

        var (_, nahled) = await PosliSurove(vstup, "?rezim=nahled");
        var otisk = nahled.RootElement.GetProperty("otisk").GetString()!;

        // Mezi náhledem a potvrzením někdo zapsal výsledky.
        await ZapisAplikaciAsync("otisk");

        var (stav, telo) = await PosliSurove(vstup, $"?rezim=oprava&otisk={otisk}");

        Assert.Equal(HttpStatusCode.Conflict, stav);
        Assert.Equal(Prepis.OtiskNesedi, telo.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Rezim_opravy_se_spravnym_otiskem_prepise()
    {
        var vstup = Rocnik("rezim-oprava");
        await Posli(vstup);
        await ZapisAplikaciAsync("rezim-oprava");

        var (_, nahled) = await PosliSurove(vstup, "?rezim=nahled");
        var otisk = nahled.RootElement.GetProperty("otisk").GetString()!;
        Assert.True(nahled.RootElement.GetProperty("kolize").GetArrayLength() >= 1);

        var (stav, _) = await PosliSurove(vstup, $"?rezim=oprava&otisk={otisk}");

        Assert.Equal(HttpStatusCode.OK, stav);

        // Soubor je pravda o tom, co pojmenuje — tady vědomě.
        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var vysledky = await db.Vysledky.AsNoTracking()
            .Where(v => v.Rozjizdka!.Zavod!.Serie!.Slug == "rezim-oprava")
            .ToListAsync();
        Assert.Equal(2, vysledky.Count);
    }

    [Fact]
    public async Task Prvni_import_do_prazdna_bezpecny_rezim_nezastavi()
    {
        // Prázdný ročník nemá co přepsat, takže výchozí režim musí projít
        // bez jakéhokoliv dotazu — jinak by se nový ročník nedal nahrát.
        var (stav, _) = await PosliSurove(Rocnik("do-prazdna"));
        Assert.Equal(HttpStatusCode.OK, stav);
    }

    [Fact]
    public async Task Prejmenovany_zavod_se_nerozdvoji_potichu()
    {
        // Nález D: rozhodčí přejmenuje regatu, generátor vyrobí jiný slug
        // a import ho vezme jako nový závod. Ten původní zůstane, protože
        // závody se nemažou — a jedné události pak patří dvě řady výsledků.
        var puvodni = Rocnik("prejmenovani");
        await Posli(puvodni);

        var prejmenovany = puvodni with
        {
            Zavody = [puvodni.Zavody[0] with { Slug = "zahajeni-sezony", Nazev = "Zahájení sezóny 2025" }],
        };

        var (stav, telo) = await PosliSurove(prejmenovany);

        Assert.Equal(HttpStatusCode.Conflict, stav);
        var kolize = telo.RootElement.GetProperty("kolize");
        Assert.Contains("nepřejmenoval",
            string.Join(" ", kolize.EnumerateArray().Select(k => k.GetProperty("co").GetString())));

        // A dokud se to nepotvrdí, žádný druhý závod nevznikl.
        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Zavody.CountAsync(z => z.Serie!.Slug == "prejmenovani"));
    }

    [Fact]
    public async Task Dve_regaty_v_jeden_den_jdou_potvrdit()
    {
        // Vodítko, ne důkaz: dvě regaty v jeden den být mohou, takže to
        // musí jít projít režimem opravy.
        var puvodni = Rocnik("jeden-den");
        await Posli(puvodni);

        var druha = puvodni with
        {
            Zavody =
            [
                puvodni.Zavody[0] with { Slug = "odpoledni", Nazev = "Odpolední rozjížďky" },
            ],
        };

        var (_, nahled) = await PosliSurove(druha, "?rezim=nahled");
        var otisk = nahled.RootElement.GetProperty("otisk").GetString()!;

        var (stav, _) = await PosliSurove(druha, $"?rezim=oprava&otisk={otisk}");

        Assert.Equal(HttpStatusCode.OK, stav);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(2, await db.Zavody.CountAsync(z => z.Serie!.Slug == "jeden-den"));
    }

    [Fact]
    public async Task Prejmenovana_regata_si_nechava_adresu_i_vysledky()
    {
        // Řešení nálezu D: soubor řekne, pod kterou adresou ta regata leží,
        // a import ji přejmenuje místo toho, aby založil druhou.
        var puvodni = Rocnik("prejmenovani-slugem");
        await Posli(puvodni);

        var prejmenovany = puvodni with
        {
            Zavody =
            [
                puvodni.Zavody[0] with
                {
                    Slug = "zahajeni-sezony-2025",
                    Nazev = "Zahájení sezóny 2025",
                    PuvodniSlug = "zahajeni",
                },
            ],
        };

        var druhy = await Posli(prejmenovany);

        Assert.Equal(0, druhy.Zavody.Nove);
        Assert.Equal(1, druhy.Zavody.Aktualizovane);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var zavody = await db.Zavody.AsNoTracking()
            .Where(z => z.Serie!.Slug == "prejmenovani-slugem")
            .ToListAsync();

        var zavod = Assert.Single(zavody);
        // Jméno nové, adresa stará: odkaz na zastávku už mohl někam odejít.
        Assert.Equal("Zahájení sezóny 2025", zavod.Nazev);
        Assert.Equal("zahajeni", zavod.Slug);
        // A výsledky zůstaly u ní, ne u osiřelého dvojníka.
        Assert.Equal(2, await db.Vysledky.CountAsync(v => v.Rozjizdka!.ZavodId == zavod.Id));
    }

    [Fact]
    public async Task Prejmenovani_je_idempotentni()
    {
        // Druhé nahrání téhož souboru se musí spárovat zas přes `puvodniSlug`
        // — slug v databázi se nezměnil, takže nový slug ze souboru nesedí.
        var puvodni = Rocnik("prejmenovani-dvakrat");
        await Posli(puvodni);

        var prejmenovany = puvodni with
        {
            Zavody = [puvodni.Zavody[0] with { Slug = "jine-jmeno", PuvodniSlug = "zahajeni" }],
        };

        await Posli(prejmenovany);
        var treti = await Posli(prejmenovany);

        Assert.Equal(0, treti.Zavody.Nove);
        Assert.Equal(0, treti.Vysledky.Nove);

        using var scope = fixture.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Zavody.CountAsync(z => z.Serie!.Slug == "prejmenovani-dvakrat"));
    }

    [Fact]
    public async Task Prejmenovani_na_sebe_sama_neprojde()
    {
        var vstup = Rocnik("prejmenovani-nesmysl");
        var spatny = vstup with
        {
            Zavody = [vstup.Zavody[0] with { PuvodniSlug = vstup.Zavody[0].Slug }],
        };

        var (stav, telo) = await PosliSurove(spatny);

        Assert.Equal(HttpStatusCode.BadRequest, stav);
        Assert.Contains("stejnou jako novou", telo.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Prejmenovani_na_adresu_jine_regaty_ze_souboru_neprojde()
    {
        // Dvě regaty jednu adresu sdílet nemůžou — jinak by si soubor sám
        // určil, která z nich tu druhou přepíše.
        var vstup = Rocnik("prejmenovani-kolize");
        var zavod = vstup.Zavody[0];
        var spatny = vstup with
        {
            Zavody =
            [
                zavod,
                zavod with { Slug = "druha", Nazev = "Druhá", PuvodniSlug = zavod.Slug },
            ],
        };

        var (stav, telo) = await PosliSurove(spatny);

        Assert.Equal(HttpStatusCode.BadRequest, stav);
        Assert.Contains("má jiná regata", telo.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Prejmenovani_se_nehlasi_jako_rozdvojeni()
    {
        // Vodítko podle termínu má mlčet, když soubor přejmenování přizná.
        var puvodni = Rocnik("prejmenovani-bez-kolize");
        await Posli(puvodni);

        var prejmenovany = puvodni with
        {
            Zavody = [puvodni.Zavody[0] with { Slug = "nova-adresa", PuvodniSlug = "zahajeni" }],
        };

        var (stav, telo) = await PosliSurove(prejmenovany, "?rezim=nahled");

        Assert.Equal(HttpStatusCode.OK, stav);
        Assert.Equal(0, telo.RootElement.GetProperty("kolize").GetArrayLength());
    }
}

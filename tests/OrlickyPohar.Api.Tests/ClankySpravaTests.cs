using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Clanky;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Psaní článků proti reálnému PostgreSQL.
/// <para>
/// Přes službu, ne přes HTTP — ze stejného důvodu jako u
/// <see cref="SpravaTests"/>: testovací hostitel nemá poskytovatele identity,
/// takže se k endpointům nedá dostat s platným tokenem. Ověřuje se to, co
/// na databázi skutečně stojí: <b>unikátní slug v ročníku</b> a <b>rozsah
/// výpisu</b>.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class ClankySpravaTests(PostgresFixture fixture)
{
    private async Task<T> VeSluzbeAsync<T>(Func<IServiceProvider, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        return await co(scope.ServiceProvider);
    }

    private Task<T> SpravaAsync<T>(Func<ClankySprava, Task<T>> co) =>
        VeSluzbeAsync(sp => co(sp.GetRequiredService<ClankySprava>()));

    /// <summary>Ročník se dvěma zastávkami. Slug musí být v každém testu jiný.</summary>
    private Task<(int SerieId, int Radava, int Izolepa)> RocnikAsync(string slug) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();

            var serie = new Api.Features.Serial.Serie { Nazev = $"Pohár {slug}", Slug = slug, Rok = 2026 };
            db.Serie.Add(serie);
            await db.SaveChangesAsync();

            var zavody = new[] { ("Radavská regata", 1), ("Izolepa", 2) }
                .Select(z => new Api.Features.Zavody.Zavod
                {
                    SerieId = serie.Id,
                    Nazev = z.Item1,
                    Slug = $"{Psani.Slug(z.Item1)}-{slug}",
                    Datum = new DateOnly(2026, 5, 16),
                    Poradi = z.Item2,
                })
                .ToList();

            db.Zavody.AddRange(zavody);
            await db.SaveChangesAsync();

            return (serie.Id, zavody[0].Id, zavody[1].Id);
        });

    private static ClanekVstupSprava Vstup(string titulek, string? zavod = null) =>
        new(titulek, "První odstavec.\n\nDruhý odstavec.", Perex: "Perex.", Autor: "Pořadatel", Zavod: zavod);

    [Fact]
    public async Task Novy_clanek_je_koncept_a_verejne_ho_nikdo_neuvidi()
    {
        var (serieId, radava, _) = await RocnikAsync("koncept");

        var (clanek, chyba) = await SpravaAsync(s =>
            s.ZalozAsync(serieId, radava, Vstup("Pozvánka na regatu"), default));

        Assert.Null(chyba);
        Assert.NotNull(clanek);

        // Tohle je ta podstatná vlastnost: uložit rozepsaný text nesmí
        // znamenat vydat ho. Publikuje se zvlášť, jedním vědomým krokem.
        Assert.Equal(StavClanku.Draft, clanek.Stav);
        Assert.Equal("pozvanka-na-regatu", clanek.Slug);
    }

    [Fact]
    public async Task Druhy_clanek_se_stejnym_titulkem_neprojde()
    {
        var (serieId, radava, _) = await RocnikAsync("duplicita");

        await SpravaAsync(s => s.ZalozAsync(serieId, radava, Vstup("Stejný titulek"), default));
        var (druhy, chyba) = await SpravaAsync(s =>
            s.ZalozAsync(serieId, radava, Vstup("Stejný titulek"), default));

        // Slug je unikátní v rámci ročníku a stojí na něm i idempotence
        // importu. Bez téhle kontroly by to spadlo až na indexu v databázi.
        Assert.Null(druhy);
        Assert.NotNull(chyba);
        Assert.Contains("stejny-titulek", chyba);
    }

    [Fact]
    public async Task Uprava_titulku_nemeni_adresu()
    {
        var (serieId, radava, _) = await RocnikAsync("adresa");

        // Založení i úprava v jednom scope: entita se mění v tom kontextu,
        // který ji sleduje. V produkci to tak je samo sebou — endpoint si
        // článek načte a upraví v témže požadavku.
        await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<ClankySprava>();
            var (clanek, _) = await sprava.ZalozAsync(serieId, radava, Vstup("Původní titulek"), default);
            return await sprava.UpravAsync(clanek!, Vstup("Úplně jiný titulek"), radava, default);
        });

        var po = await SpravaAsync(s => s.NajdiAsync(serieId, "puvodni-titulek", default));

        // Adresa už mohla někam odejít — přepsat ji znamená rozbít odkaz.
        Assert.NotNull(po);
        Assert.Equal("Úplně jiný titulek", po.Titulek);
    }

    [Fact]
    public async Task Smazany_clanek_zmizi_z_vypisu_ale_ne_z_databaze()
    {
        var (serieId, radava, _) = await RocnikAsync("koes");

        await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<ClankySprava>();
            var (clanek, _) = await sprava.ZalozAsync(serieId, radava, Vstup("Omylem napsaný"), default);
            return await sprava.PrepniStavAsync(clanek!, StavClanku.Smazano, default);
        });

        var vypis = await SpravaAsync(s => s.VypisAsync(serieId, true, [], default));
        Assert.DoesNotContain(vypis, r => r.Slug == "omylem-napsany");

        // Řádek zůstává, takže se dá vrátit a slug zůstává obsazený.
        var porad = await SpravaAsync(s => s.NajdiAsync(serieId, "omylem-napsany", default));
        Assert.NotNull(porad);
        Assert.Equal(StavClanku.Smazano, porad.Stav);
    }

    [Fact]
    public async Task Editor_zastavky_vidi_jen_jeji_clanky()
    {
        var (serieId, radava, izolepa) = await RocnikAsync("rozsah");

        await SpravaAsync(s => s.ZalozAsync(serieId, radava, Vstup("Zpráva z Radavy"), default));
        await SpravaAsync(s => s.ZalozAsync(serieId, izolepa, Vstup("Zpráva z Izolepy"), default));
        await SpravaAsync(s => s.ZalozAsync(serieId, null, Vstup("Souhrn ročníku"), default));

        var jenRadava = await SpravaAsync(s => s.VypisAsync(serieId, false, [radava], default));

        // Editor jedné zastávky nevidí cizí ani článek ročníku — ten patří
        // organizátorovi poháru.
        Assert.Equal(["zprava-z-radavy"], jenRadava.Select(r => r.Slug));

        var vsechno = await SpravaAsync(s => s.VypisAsync(serieId, true, [], default));
        Assert.Equal(3, vsechno.Count);
    }

    [Fact]
    public async Task Cas_vydani_se_uklada_v_UTC()
    {
        var (serieId, radava, _) = await RocnikAsync("cas");

        var letni = new DateTimeOffset(2026, 7, 11, 20, 30, 0, TimeSpan.FromHours(2));
        var (clanek, chyba) = await SpravaAsync(s => s.ZalozAsync(
            serieId, radava, Vstup("Vydáno večer") with { PublikovanoV = letni }, default));

        // Npgsql jiný posun než nula do `timestamp with time zone` nepřijme
        // a padlo by to až při zápisu — tedy uprostřed ukládání.
        Assert.Null(chyba);
        Assert.Equal(TimeSpan.Zero, clanek!.PublikovanoV.Offset);
        Assert.Equal(letni.ToUniversalTime(), clanek.PublikovanoV);
    }

    [Fact]
    public async Task Publikovany_clanek_uvidi_verejnost_skryty_ne()
    {
        var (serieId, radava, _) = await RocnikAsync("verejne");

        await VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var serie = await db.Serie.FirstAsync(s => s.Id == serieId);
            serie.Publikovano = true;
            var zavod = await db.Zavody.FirstAsync(z => z.Id == radava);
            zavod.Publikovano = true;
            await db.SaveChangesAsync();
            return true;
        });

        await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<ClankySprava>();
            var (vydany, _) = await sprava.ZalozAsync(serieId, radava, Vstup("Vyšlo"), default);
            var (stazeny, _) = await sprava.ZalozAsync(serieId, radava, Vstup("Staženo"), default);

            await sprava.PrepniStavAsync(vydany!, StavClanku.Publikovano, default);
            return await sprava.PrepniStavAsync(stazeny!, StavClanku.Skryty, default);
        });

        var slug = await VeSluzbeAsync(sp =>
            sp.GetRequiredService<AppDbContext>().Serie
                .Where(s => s.Id == serieId).Select(s => s.Slug).FirstAsync());

        var klient = fixture.CreateClient();
        var verejne = await klient.GetStringAsync($"/serie/{slug}/clanky");

        Assert.Contains("vyslo", verejne);
        Assert.DoesNotContain("stazeno", verejne);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Kalendář ročníku proti reálnému PostgreSQL.
/// <para>
/// Přes službu, ne přes HTTP — ze stejného důvodu jako u
/// <see cref="SpravaTests"/>: testovací hostitel nemá poskytovatele
/// identity. Pravidla přechodů a termínů jsou čisté funkce a zkoušejí se
/// v <see cref="KalendarTests"/>; tady jde o to, co na databázi skutečně
/// stojí — <b>unikátní adresa v ročníku</b> a <b>přečíslování podle data</b>.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class KalendarSpravaTests(PostgresFixture fixture)
{
    private async Task<T> VeSluzbeAsync<T>(Func<IServiceProvider, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        return await co(scope.ServiceProvider);
    }

    private Task<T> SpravaAsync<T>(Func<KalendarSprava, Task<T>> co) =>
        VeSluzbeAsync(sp => co(sp.GetRequiredService<KalendarSprava>()));

    /// <summary>Prázdný ročník. Slug musí být v každém testu jiný.</summary>
    private Task<int> RocnikAsync(string slug) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();
            var serie = new Api.Features.Serial.Serie { Nazev = $"Pohár {slug}", Slug = slug, Rok = 2026 };

            db.Serie.Add(serie);
            await db.SaveChangesAsync();

            return serie.Id;
        });

    private static ZastavkaVstup Vstup(string nazev, int mesic, int den) =>
        new(nazev, new DateOnly(2026, mesic, den), Typ: "okruhový", Poradatel: "YC Písek");

    private Task<List<ZastavkaRadek>> VypisAsync(int serieId) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();

            return await db.Zavody
                .Where(z => z.SerieId == serieId)
                .OrderBy(z => z.Poradi)
                .Select(z => new ZastavkaRadek(
                    z.Slug, z.Nazev, z.Datum, z.DatumKonce, z.Typ, z.Poradatel, z.Poradi,
                    z.Stav, z.PuvodniDatum, z.Publikovano, false, false, Array.Empty<StavZavodu>()))
                .ToListAsync();
        });

    [Fact]
    public async Task Nova_zastavka_je_planovana_a_neverejna()
    {
        var serieId = await RocnikAsync("kalendar-nova");

        var (zastavka, chyba) = await SpravaAsync(s =>
            s.ZalozAsync(serieId, Vstup("Radavská regata", 5, 9), default));

        Assert.Null(chyba);
        Assert.NotNull(zastavka);

        // Kalendář začíná návrhem termínu. Potvrdit ho i pustit ven jsou
        // dvě další rozhodnutí a každé patří někomu jinému.
        Assert.Equal(StavZavodu.Planovany, zastavka.Stav);
        Assert.False(zastavka.Publikovano);
        Assert.Equal("radavska-regata", zastavka.Slug);
        Assert.Equal(1, zastavka.Poradi);
    }

    [Fact]
    public async Task Druha_zastavka_se_stejnym_nazvem_neprojde()
    {
        var serieId = await RocnikAsync("kalendar-duplicita");

        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Izolepa", 6, 20), default));
        var (druha, chyba) = await SpravaAsync(s =>
            s.ZalozAsync(serieId, Vstup("Izolepa", 8, 15), default));

        // Adresa je unikátní v rámci ročníku a stojí na ní i idempotence
        // importu. Bez téhle kontroly by to spadlo až na indexu v databázi.
        Assert.Null(druha);
        Assert.NotNull(chyba);
        Assert.Contains("izolepa", chyba);
    }

    [Fact]
    public async Task Dodatecne_zalozena_zastavka_se_zaradi_podle_data()
    {
        var serieId = await RocnikAsync("kalendar-poradi");

        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Jarní vítr", 4, 25), default));
        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Vánoční regata", 12, 12), default));
        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Radavská regata", 5, 9), default));

        var kalendar = await VypisAsync(serieId);

        // Veřejný výpis ročníku se řadí podle pořadí. Bez přečíslování by
        // zastávka doplněná dodatečně skončila až za Vánoční regatou.
        Assert.Equal(
            ["Jarní vítr", "Radavská regata", "Vánoční regata"],
            kalendar.Select(z => z.Nazev));
        Assert.Equal([1, 2, 3], kalendar.Select(z => z.Poradi));
    }

    [Fact]
    public async Task Presun_potvrzene_zastavky_prerovna_kalendar_a_zapamatuje_termin()
    {
        var serieId = await RocnikAsync("kalendar-presun");

        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Jarní vítr", 4, 25), default));
        await SpravaAsync(s => s.ZalozAsync(serieId, Vstup("Izolepa", 6, 20), default));

        // Celý scénář v jednom scope: entita se mění v tom kontextu, který
        // ji sleduje. V produkci to tak je samo sebou — endpoint si zastávku
        // načte a upraví v témže požadavku.
        await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<KalendarSprava>();
            var jarni = await sprava.NajdiAsync(serieId, "jarni-vitr", default);

            await sprava.PrepniStavAsync(jarni!, StavZavodu.Potvrzeny, default);
            return await sprava.UpravAsync(jarni!, Vstup("Jarní vítr", 7, 4), default);
        });

        var kalendar = await VypisAsync(serieId);

        Assert.Equal(["Izolepa", "Jarní vítr"], kalendar.Select(z => z.Nazev));
        Assert.Equal(new DateOnly(2026, 4, 25), kalendar[1].PuvodniDatum);

        // Adresa zůstává, i když se kalendář přeskládal — odkaz na zastávku
        // už mohl někam odejít.
        Assert.Equal("jarni-vitr", kalendar[1].Slug);
    }

    [Fact]
    public async Task Publikace_neni_stav()
    {
        var serieId = await RocnikAsync("kalendar-publikace");

        await VeSluzbeAsync(async sp =>
        {
            var sprava = sp.GetRequiredService<KalendarSprava>();
            var (zastavka, _) = await sprava.ZalozAsync(serieId, Vstup("Pohár Slunce", 9, 19), default);

            await sprava.PublikujAsync(zastavka!, true, default);
            return await sprava.PrepniStavAsync(zastavka!, StavZavodu.Potvrzeny, default);
        });

        var zastavka = await SpravaAsync(s => s.NajdiAsync(serieId, "pohar-slunce", default));

        // Plánovaná zastávka má být v kalendáři vidět dřív, než se cokoliv
        // vypíše — a posun stavu publikaci nepřepisuje.
        Assert.NotNull(zastavka);
        Assert.True(zastavka.Publikovano);
        Assert.Equal(StavZavodu.Potvrzeny, zastavka.Stav);
    }
}

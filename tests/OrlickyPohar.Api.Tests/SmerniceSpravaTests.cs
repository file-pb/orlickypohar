using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Smernice;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Vyvěšení a stažení plachetní směrnice proti reálnému PostgreSQL.
/// <para>
/// Jádro je tu <b>stažení</b>: že po něm soubor v úložišti není, že záznam
/// zůstane i s důvodem, a že se klíč neztratí, když se mazání nepovede.
/// Právě na tom stojí nález F — příznak v databázi sám veřejnou adresu
/// nezastaví.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class SmerniceSpravaTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 6, 8, 0, 0, TimeSpan.Zero);

    /// <summary>Úložiště v paměti. <c>Pada</c> dělá z každého mazání chybu.</summary>
    private sealed class PametoveUloziste : IUloziste
    {
        public Dictionary<string, byte[]> Soubory { get; } = [];
        public Dictionary<string, string?> Cache { get; } = [];
        public bool Pada { get; set; }
        public bool Pripraveno => true;
        public string? VerejnaAdresa => "https://foto.example";

        public Task UlozAsync(
            string klic, byte[] data, string typ, CancellationToken ct, string? cache = null)
        {
            Soubory[klic] = data;
            Cache[klic] = cache;
            return Task.CompletedTask;
        }

        public Task SmazAsync(string klic, CancellationToken ct)
        {
            if (Pada) throw new InvalidOperationException("R2 zaškobrtlo");
            Soubory.Remove(klic);
            return Task.CompletedTask;
        }
    }

    private (AppDbContext Db, SmerniceSprava Sprava, PametoveUloziste Uloziste) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var uloziste = new PametoveUloziste();
        return (db, new SmerniceSprava(db, uloziste, TimeProvider.System,
            NullLogger<SmerniceSprava>.Instance), uloziste);
    }

    private static async Task<(Zavod Zavod, Uzivatel Kdo)> ZastavkaAsync(AppDbContext db)
    {
        var jmeno = $"{Guid.NewGuid():N}"[..12];

        var serie = new Serie { Nazev = $"Pohár {jmeno}", Rok = 2027, Slug = $"smernice-{jmeno}" };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var zavod = new Zavod
        {
            SerieId = serie.Id, Slug = $"regata-{jmeno}", Nazev = "Zkušební regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);

        var kdo = new Uzivatel
        {
            Id = Guid.CreateVersion7(), Zobrazovane = "Pořadatel",
            Email = $"smernice-{jmeno}@example.test", ZalozenV = Ted,
        };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();

        return (zavod, kdo);
    }

    private static SmerniceFormular Formular(string poznamka = "první vyvěšení")
    {
        var data = new MemoryStream("%PDF-1.7\nplachetni smernice"u8.ToArray());
        return new SmerniceFormular(
            new FormFile(data, 0, data.Length, "soubor", "smernice.pdf"), poznamka);
    }

    [Fact]
    public async Task Smernice_se_uklada_bez_cache()
    {
        // Roční `immutable` jako u fotek by znamenalo, že odvolání nezabere.
        var (db, sprava, uloziste) = Sluzby();
        var (zavod, kdo) = await ZastavkaAsync(db);

        var (smernice, chyba) = await sprava.VyvesAsync(zavod.Id, Formular(), kdo.Id, default);

        Assert.Null(chyba);
        Assert.NotNull(smernice);
        Assert.Equal(Vyveseni.Cache, Assert.Single(uloziste.Cache).Value);
    }

    [Fact]
    public async Task Stazeni_smaze_soubor_a_necha_zaznam()
    {
        var (db, sprava, uloziste) = Sluzby();
        var (zavod, kdo) = await ZastavkaAsync(db);
        await sprava.VyvesAsync(zavod.Id, Formular(), kdo.Id, default);

        var zapis = await db.Smernice.FirstAsync(s => s.ZavodId == zavod.Id);
        var klic = Vyveseni.Klic(zapis.Id);
        Assert.True(uloziste.Soubory.ContainsKey(klic));

        var chyba = await sprava.StahniAsync(
            zavod.Id, 1, "Omylem nahraný soubor s kontakty posádky.", kdo.Id, default);

        Assert.Null(chyba);
        // Obsah je pryč z úložiště…
        Assert.False(uloziste.Soubory.ContainsKey(klic));
        // …a nic nezůstalo ve frontě úklidu, protože smazání vyšlo hned.
        Assert.Empty(await db.SouboryKeSmazani.Where(s => s.Klic == klic).ToListAsync());

        // …ale řádek zůstal i s tím, kdo stáhl a proč.
        await db.Entry(zapis).ReloadAsync();
        Assert.NotNull(zapis.StazenoV);
        Assert.Equal(kdo.Id, zapis.StahlId);
        Assert.Equal("Omylem nahraný soubor s kontakty posádky.", zapis.DuvodStazeni);
    }

    [Fact]
    public async Task Stazena_verze_je_ve_sprave_videt()
    {
        var (db, sprava, _) = Sluzby();
        var (zavod, kdo) = await ZastavkaAsync(db);
        await sprava.VyvesAsync(zavod.Id, Formular(), kdo.Id, default);
        await sprava.StahniAsync(zavod.Id, 1, "Špatný soubor.", kdo.Id, default);

        var seznam = await sprava.SeznamAsync(zavod.Id, default);

        var stazena = Assert.Single(seznam);
        Assert.NotNull(stazena.StazenoV);
        Assert.Equal("Pořadatel", stazena.Stahl);
        Assert.Equal("Špatný soubor.", stazena.DuvodStazeni);
    }

    [Fact]
    public async Task Kdyz_mazani_spadne_klic_zustane_ve_fronte()
    {
        // Záznam a soubor v cizí službě nejdou smazat jednou transakcí.
        // Stažení proto platí a klíč čeká na pravidelný úklid — jinak by
        // soubor v bucketu zůstal a řádek, podle kterého se dá najít, by
        // tvrdil, že je odvolaný.
        var (db, sprava, uloziste) = Sluzby();
        var (zavod, kdo) = await ZastavkaAsync(db);
        await sprava.VyvesAsync(zavod.Id, Formular(), kdo.Id, default);

        var zapis = await db.Smernice.FirstAsync(s => s.ZavodId == zavod.Id);
        var klic = Vyveseni.Klic(zapis.Id);

        uloziste.Pada = true;
        Assert.Null(await sprava.StahniAsync(zavod.Id, 1, "Špatný soubor.", kdo.Id, default));

        await db.Entry(zapis).ReloadAsync();
        Assert.NotNull(zapis.StazenoV);
        Assert.Single(await db.SouboryKeSmazani.Where(s => s.Klic == klic).ToListAsync());

        // Úklid, který po chvíli dojde, soubor dorazí.
        uloziste.Pada = false;
        var (smazano, neuspechu) = await Uklid.VyprazdniAsync(
            db, uloziste, NullLogger.Instance, default);
        Assert.True(smazano >= 1);
        Assert.Equal(0, neuspechu);
        Assert.False(uloziste.Soubory.ContainsKey(klic));
    }

    [Fact]
    public async Task Stahnout_podruhe_nebo_neznamou_verzi_nejde()
    {
        var (db, sprava, _) = Sluzby();
        var (zavod, kdo) = await ZastavkaAsync(db);
        await sprava.VyvesAsync(zavod.Id, Formular(), kdo.Id, default);

        Assert.Null(await sprava.StahniAsync(zavod.Id, 1, "Špatný soubor.", kdo.Id, default));
        Assert.Equal(Vyveseni.JeStazena,
            await sprava.StahniAsync(zavod.Id, 1, "Znovu.", kdo.Id, default));
        Assert.NotNull(await sprava.StahniAsync(zavod.Id, 7, "Neexistuje.", kdo.Id, default));
    }

    [Fact]
    public async Task Stazeni_nebrani_vyveseni_opravene_verze()
    {
        // Pořadatel, který nahrál špatný soubor, musí mít cestu dál:
        // stáhnout chybnou verzi a vyvěsit správnou.
        var (db, sprava, uloziste) = Sluzby();
        var (zavod, kdo) = await ZastavkaAsync(db);
        await sprava.VyvesAsync(zavod.Id, Formular(), kdo.Id, default);
        await sprava.StahniAsync(zavod.Id, 1, "Špatný soubor.", kdo.Id, default);

        var (nova, chyba) = await sprava.VyvesAsync(
            zavod.Id, Formular("opravená verze"), kdo.Id, default);

        Assert.Null(chyba);
        // Verze se čísluje dál, ne odznova: stažená verze v historii je.
        Assert.Equal(2, nova!.Verze);
        Assert.Single(uloziste.Soubory);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Napojení telefonu na účet kódem z webu — náhrada přihlašování v appce
/// (Filip, 26. 11. 2026: *„na zitadel uživatele tahat nechci"*).
///
/// <para>
/// Patří sem, a ne mezi čisté testy: celé to stojí na <b>unikátním indexu
/// otisku</b> a na tom, že se jednorázovost zapíše do databáze. Fake
/// databáze by ani jedno neověřila, a právě tam vzniká kód, který jde
/// uplatnit dvakrát.
/// </para>
///
/// <para>
/// <b>Nic se neuklízí mazáním tabulek</b>, databázi sdílí celá kolekce.
/// Každý test si vyrobí vlastní účet.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class KliceUctuTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 11, 26, 18, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, KliceUctuSprava Klice, FakeCas Cas) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cas = new FakeCas(Ted);
        return (db, new KliceUctuSprava(db, cas), cas);
    }

    private static async Task<Uzivatel> UcetAsync(AppDbContext db)
    {
        var u = new Uzivatel
        {
            Id = Guid.NewGuid(),
            Zobrazovane = $"Zkouška {Guid.NewGuid():N}"[..20],
            Email = $"{Guid.NewGuid():N}@priklad.cz",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(u);
        await db.SaveChangesAsync();
        return u;
    }

    [Fact]
    public async Task Kod_vymeni_se_za_klic_a_ten_patri_uctu()
    {
        var (db, klice, _) = Sluzby();
        var ucet = await UcetAsync(db);

        var kod = await klice.VystavKodAsync(ucet.Id, default);
        var napojeni = await klice.NapojAsync(kod.Kod, "iPhone u vody", default);

        Assert.NotNull(napojeni);
        Assert.Equal(ucet.Zobrazovane, napojeni.Zobrazovane);

        var klic = await klice.OverAsync(napojeni.Klic, default);
        Assert.NotNull(klic);
        Assert.Equal(ucet.Id, klic.UzivatelId);
        Assert.Equal("iPhone u vody", klic.Zarizeni);
    }

    [Fact]
    public async Task Tajemstvi_se_neuklada_v_citelne_podobe()
    {
        // Kdyby se databáze dostala ven, s otiskem se za nikoho nevydá.
        var (db, klice, _) = Sluzby();
        var ucet = await UcetAsync(db);

        var kod = await klice.VystavKodAsync(ucet.Id, default);
        var napojeni = await klice.NapojAsync(kod.Kod, null, default);
        Assert.NotNull(napojeni);

        Assert.False(await db.NapojeniUctu.AnyAsync(n => n.Otisk == kod.Kod));
        Assert.False(await db.KliceUctu.AnyAsync(k => k.Otisk == napojeni.Klic));
    }

    [Fact]
    public async Task Kod_jde_uplatnit_jen_jednou()
    {
        // Filip, 26. 11. 2026: „pokud to budeme moct dělat jenom jednou,
        // tak je to legitimní." Kód svítí na obrazovce a kdokoliv kolem
        // si ho vyfotí přes rameno.
        var (db, klice, _) = Sluzby();
        var ucet = await UcetAsync(db);

        var kod = await klice.VystavKodAsync(ucet.Id, default);
        Assert.NotNull(await klice.NapojAsync(kod.Kod, null, default));
        Assert.Null(await klice.NapojAsync(kod.Kod, null, default));
    }

    [Fact]
    public async Task Propadly_kod_neprojde()
    {
        var (db, klice, cas) = Sluzby();
        var ucet = await UcetAsync(db);

        var kod = await klice.VystavKodAsync(ucet.Id, default);
        cas.Posun(KliceUctuSprava.PlatnostKodu + TimeSpan.FromSeconds(1));

        Assert.Null(await klice.NapojAsync(kod.Kod, null, default));
    }

    [Fact]
    public async Task Vystaveni_noveho_kodu_rusi_stary()
    {
        // Dva platné kódy na jeden účet znamenají dvě okna, kterými se dá
        // projít, a to druhé nikdo nehlídá.
        var (db, klice, _) = Sluzby();
        var ucet = await UcetAsync(db);

        var stary = await klice.VystavKodAsync(ucet.Id, default);
        var novy = await klice.VystavKodAsync(ucet.Id, default);

        Assert.Null(await klice.NapojAsync(stary.Kod, null, default));
        Assert.NotNull(await klice.NapojAsync(novy.Kod, null, default));
    }

    [Fact]
    public async Task Vymysleny_kod_dopadne_stejne_jako_propadly()
    {
        var (_, klice, _) = Sluzby();
        Assert.Null(await klice.NapojAsync("tenhle-kod-nikdy-neexistoval", null, default));
    }

    [Fact]
    public async Task Odebrany_klic_uz_neoveri()
    {
        // Tohle je celá cesta ven po ztrátě telefonu.
        var (db, klice, _) = Sluzby();
        var ucet = await UcetAsync(db);

        var kod = await klice.VystavKodAsync(ucet.Id, default);
        var napojeni = await klice.NapojAsync(kod.Kod, null, default);
        Assert.NotNull(napojeni);

        var seznam = await klice.MojeAsync(ucet.Id, default);
        var jediny = Assert.Single(seznam);

        Assert.True(await klice.OdeberAsync(ucet.Id, jediny.Id, default));
        Assert.Null(await klice.OverAsync(napojeni.Klic, default));
        Assert.Empty(await klice.MojeAsync(ucet.Id, default));
    }

    [Fact]
    public async Task Cizi_klic_odebrat_nejde()
    {
        // Odebrat klíč je zásah do cizího telefonu.
        var (db, klice, _) = Sluzby();
        var majitel = await UcetAsync(db);
        var cizi = await UcetAsync(db);

        var kod = await klice.VystavKodAsync(majitel.Id, default);
        var napojeni = await klice.NapojAsync(kod.Kod, null, default);
        Assert.NotNull(napojeni);
        var jediny = Assert.Single(await klice.MojeAsync(majitel.Id, default));

        Assert.False(await klice.OdeberAsync(cizi.Id, jediny.Id, default));
        Assert.NotNull(await klice.OverAsync(napojeni.Klic, default));
    }

    [Fact]
    public async Task Overeni_zapise_ze_se_telefon_ozval()
    {
        // Jediné, k čemu to je: poznat v seznamu mrtvý klíč.
        var (db, klice, cas) = Sluzby();
        var ucet = await UcetAsync(db);

        var kod = await klice.VystavKodAsync(ucet.Id, default);
        var napojeni = await klice.NapojAsync(kod.Kod, null, default);
        Assert.NotNull(napojeni);

        cas.Posun(TimeSpan.FromHours(3));
        await klice.OverAsync(napojeni.Klic, default);

        var jediny = Assert.Single(await klice.MojeAsync(ucet.Id, default));
        Assert.Equal(Ted + TimeSpan.FromHours(3), jediny.OzvalSeV);
    }

    /// <summary>Posunovatelný čas; `TimeProvider.System` by propadnutí neověřil.</summary>
    private sealed class FakeCas(DateTimeOffset ted) : TimeProvider
    {
        private DateTimeOffset _ted = ted;
        public void Posun(TimeSpan o) => _ted += o;
        public override DateTimeOffset GetUtcNow() => _ted;
    }
}

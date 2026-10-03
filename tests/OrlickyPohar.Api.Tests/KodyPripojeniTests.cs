using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Připojení k lodi kódem proti reálnému PostgreSQL. Co se tu ověřuje, je
/// přesně to, co by jinak pustilo cizího člověka k cizí lodi: platnost
/// kódu, role prvního a dalších, a že se poslední kapitán nedá odebrat.
/// <para>
/// Stejně jako u párování se nic nemaže — databázi sdílí celá kolekce.
/// Každý test si vyrobí vlastní loď a účty.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class KodyPripojeniTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 4, 12, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, KodySprava Kody) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (db, new KodySprava(db, TimeProvider.System, NullLogger<KodySprava>.Instance));
    }

    private static async Task<Lod> LodAsync(AppDbContext db)
    {
        var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = "Testovací" };
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();

        var lod = new Lod { Nazev = $"Kódovaná {Guid.NewGuid():N}"[..20], MajitelId = osoba.Id };
        db.Lode.Add(lod);
        await db.SaveChangesAsync();
        return lod;
    }

    private static async Task<Uzivatel> UcetAsync(AppDbContext db)
    {
        var uzivatel = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = "Posádka",
            Email = $"kody-{Guid.NewGuid():N}@example.test",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(uzivatel);
        await db.SaveChangesAsync();
        return uzivatel;
    }

    [Fact]
    public async Task Prvni_kodem_je_kapitan_druhy_posadka()
    {
        var (db, kody) = Sluzby();
        var lod = await LodAsync(db);
        var vystavil = await UcetAsync(db);
        var kod = await kody.VystavAsync(lod.Id, vystavil.Id, default);

        var prvni = await UcetAsync(db);
        var druhy = await UcetAsync(db);

        var (a, chybaA) = await kody.PripojAsync(kod.Kod, prvni.Id, default);
        var (b, chybaB) = await kody.PripojAsync(kod.Kod, druhy.Id, default);

        Assert.Null(chybaA);
        Assert.Null(chybaB);
        Assert.Equal(RoleKLodi.Kapitan, a!.Role);
        Assert.Equal(RoleKLodi.Posadka, b!.Role);
        Assert.Equal(lod.Nazev, a.Nazev);
        Assert.False(a.JizBylo);
    }

    [Fact]
    public async Task Opsany_kod_s_mezerami_a_malymi_pismeny_projde()
    {
        var (db, kody) = Sluzby();
        var lod = await LodAsync(db);
        var kod = await kody.VystavAsync(lod.Id, (await UcetAsync(db)).Id, default);
        var ucet = await UcetAsync(db);

        var opsany = kod.Kod.ToLowerInvariant().Insert(3, " - ");
        var (pripojeni, chyba) = await kody.PripojAsync(opsany, ucet.Id, default);

        Assert.Null(chyba);
        Assert.Equal(lod.Id, pripojeni!.LodId);
    }

    [Fact]
    public async Task Druhe_zadani_tehoz_kodu_roli_nemeni()
    {
        var (db, kody) = Sluzby();
        var lod = await LodAsync(db);
        var kod = await kody.VystavAsync(lod.Id, (await UcetAsync(db)).Id, default);
        var ucet = await UcetAsync(db);

        await kody.PripojAsync(kod.Kod, ucet.Id, default);
        var (znovu, chyba) = await kody.PripojAsync(kod.Kod, ucet.Id, default);

        Assert.Null(chyba);
        Assert.True(znovu!.JizBylo);
        Assert.Equal(RoleKLodi.Kapitan, znovu.Role);
        Assert.Single(await db.VazbyKLodim.Where(v => v.UzivatelId == ucet.Id).ToListAsync());
    }

    [Fact]
    public async Task Propadly_kod_neprojde()
    {
        var (db, kody) = Sluzby();
        var lod = await LodAsync(db);
        var kod = await kody.VystavAsync(lod.Id, (await UcetAsync(db)).Id, default);

        // Posun platnosti do minulosti dělá totéž co čekání čtvrt hodiny.
        var zaznam = await db.PripojovaciKody.FirstAsync(k => k.Kod == kod.Kod);
        zaznam.PlatiDo = DateTimeOffset.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();

        var (pripojeni, chyba) = await kody.PripojAsync(kod.Kod, (await UcetAsync(db)).Id, default);

        Assert.Null(pripojeni);
        Assert.Equal(Kody.Neplatny, chyba);
    }

    [Fact]
    public async Task Vymysleny_kod_dava_tutez_odpoved_jako_propadly()
    {
        var (db, kody) = Sluzby();

        // Z odpovědi nesmí jít vyčíst, že loď s takovým kódem existuje.
        var (pripojeni, chyba) = await kody.PripojAsync("ZZZZZZ", (await UcetAsync(db)).Id, default);

        Assert.Null(pripojeni);
        Assert.Equal(Kody.Neplatny, chyba);
    }

    [Fact]
    public async Task Posledni_kapitan_se_odebrat_neda()
    {
        var (db, kody) = Sluzby();
        var lod = await LodAsync(db);
        var kod = await kody.VystavAsync(lod.Id, (await UcetAsync(db)).Id, default);
        var kapitan = await UcetAsync(db);
        var posadka = await UcetAsync(db);
        await kody.PripojAsync(kod.Kod, kapitan.Id, default);
        await kody.PripojAsync(kod.Kod, posadka.Id, default);

        var vazby = await kody.PripojeniAsync(lod.Id, default);
        var vazbaKapitana = vazby.Single(v => v.Role == RoleKLodi.Kapitan);
        var vazbaPosadky = vazby.Single(v => v.Role == RoleKLodi.Posadka);

        // Posádku odebrat jde, kapitána ne — loď by zůstala bez někoho,
        // kdo k ní smí vystavit kód.
        Assert.Null(await kody.OdeberAsync(lod.Id, vazbaPosadky.Id, default));
        Assert.NotNull(await kody.OdeberAsync(lod.Id, vazbaKapitana.Id, default));
        Assert.Single(await db.VazbyKLodim.Where(v => v.LodId == lod.Id).ToListAsync());
    }

    [Fact]
    public async Task Kod_smi_vystavit_kapitan_ne_posadka()
    {
        var (db, kody) = Sluzby();
        var lod = await LodAsync(db);
        var kod = await kody.VystavAsync(lod.Id, (await UcetAsync(db)).Id, default);
        var kapitan = await UcetAsync(db);
        var posadka = await UcetAsync(db);
        await kody.PripojAsync(kod.Kod, kapitan.Id, default);
        await kody.PripojAsync(kod.Kod, posadka.Id, default);

        Assert.True(await kody.SmiVystavitAsync(lod.Id, kapitan.Id, default));
        Assert.False(await kody.SmiVystavitAsync(lod.Id, posadka.Id, default));
        Assert.False(await kody.SmiVystavitAsync(lod.Id, (await UcetAsync(db)).Id, default));
    }
}

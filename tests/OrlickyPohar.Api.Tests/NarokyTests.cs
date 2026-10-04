using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Nárok na loď a jeho potvrzení proti reálnému PostgreSQL.
/// <para>
/// Ověřuje se tu hlavně to, co by jinak pustilo člověka k cizí lodi nebo
/// obešlo kapitánovo „ne": že nárok sám o sobě nedává nic, že zamítnutí
/// platí, a že přijetí dělá posádku, ne kapitána.
/// </para>
/// <para>
/// Nic se neuklízí mazáním tabulek — databázi sdílí celá kolekce.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class NarokyTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 4, 14, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, NarokySprava Naroky, KodySprava Kody) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (
            db,
            new NarokySprava(db, TimeProvider.System, NullLogger<NarokySprava>.Instance),
            new KodySprava(db, TimeProvider.System, NullLogger<KodySprava>.Instance));
    }

    private static async Task<Lod> LodAsync(AppDbContext db)
    {
        var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = "Testovací" };
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();

        var lod = new Lod { Nazev = $"Nárok {Guid.NewGuid():N}"[..20], MajitelId = osoba.Id };
        db.Lode.Add(lod);
        await db.SaveChangesAsync();
        return lod;
    }

    private static async Task<Uzivatel> UcetAsync(AppDbContext db)
    {
        var uzivatel = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = "Žadatel",
            Email = $"narok-{Guid.NewGuid():N}@example.test",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(uzivatel);
        await db.SaveChangesAsync();
        return uzivatel;
    }

    [Fact]
    public async Task Podany_narok_sam_o_sobe_nedava_zadnou_roli()
    {
        var (db, naroky, _) = Sluzby();
        var lod = await LodAsync(db);
        var zadatel = await UcetAsync(db);

        Assert.Null(await naroky.PodejAsync(zadatel.Id, new NarokVstup(lod.Id, "Jsem posádka"), default));

        // Dokud kapitán nepotvrdí, není to nic víc než žádost.
        Assert.Empty(await db.VazbyKLodim.Where(v => v.UzivatelId == zadatel.Id).ToListAsync());
        var ceka = await naroky.CekajiciAsync(lod.Id, default);
        Assert.Single(ceka);
        Assert.Equal("Jsem posádka", ceka[0].Poznamka);
    }

    [Fact]
    public async Task Dvakrat_o_tutez_lod_zadat_nejde()
    {
        var (db, naroky, _) = Sluzby();
        var lod = await LodAsync(db);
        var zadatel = await UcetAsync(db);

        await naroky.PodejAsync(zadatel.Id, new NarokVstup(lod.Id, null), default);

        Assert.Equal(NarokySprava.Dvakrat,
            await naroky.PodejAsync(zadatel.Id, new NarokVstup(lod.Id, null), default));
        Assert.Single(await naroky.CekajiciAsync(lod.Id, default));
    }

    [Fact]
    public async Task Prijeti_dela_posadku_ne_kapitana()
    {
        var (db, naroky, kody) = Sluzby();
        var lod = await LodAsync(db);
        var kapitan = await UcetAsync(db);
        var kod = await kody.VystavAsync(lod.Id, kapitan.Id, default);
        await kody.PripojAsync(kod.Kod, kapitan.Id, default);

        var zadatel = await UcetAsync(db);
        await naroky.PodejAsync(zadatel.Id, new NarokVstup(lod.Id, null), default);
        var ceka = await naroky.CekajiciAsync(lod.Id, default);

        Assert.Null(await naroky.RozhodniAsync(lod.Id, ceka[0].Id, prijmout: true, kapitan.Id, default));

        var vazba = await db.VazbyKLodim.SingleAsync(v => v.UzivatelId == zadatel.Id);
        Assert.Equal(RoleKLodi.Posadka, vazba.Role);
        Assert.Equal(PuvodVazby.Narok, vazba.Puvod);
        Assert.Equal(kapitan.Id, vazba.PotvrdilId);
        Assert.Empty(await naroky.CekajiciAsync(lod.Id, default));
    }

    [Fact]
    public async Task Zamitnuty_zadatel_uz_znovu_zadat_nemuze()
    {
        var (db, naroky, _) = Sluzby();
        var lod = await LodAsync(db);
        var kapitan = await UcetAsync(db);
        var zadatel = await UcetAsync(db);
        await naroky.PodejAsync(zadatel.Id, new NarokVstup(lod.Id, null), default);
        var ceka = await naroky.CekajiciAsync(lod.Id, default);

        await naroky.RozhodniAsync(lod.Id, ceka[0].Id, prijmout: false, kapitan.Id, default);

        // Druhá žádost by byla obcházení kapitánova „ne".
        Assert.Equal(NarokySprava.Zamitnuto,
            await naroky.PodejAsync(zadatel.Id, new NarokVstup(lod.Id, null), default));
        Assert.Empty(await db.VazbyKLodim.Where(v => v.UzivatelId == zadatel.Id).ToListAsync());
    }

    [Fact]
    public async Task Kdo_uz_k_lodi_patri_nezada()
    {
        var (db, naroky, kody) = Sluzby();
        var lod = await LodAsync(db);
        var clen = await UcetAsync(db);
        var kod = await kody.VystavAsync(lod.Id, clen.Id, default);
        await kody.PripojAsync(kod.Kod, clen.Id, default);

        Assert.Equal(NarokySprava.UzPatris,
            await naroky.PodejAsync(clen.Id, new NarokVstup(lod.Id, null), default));
    }

    [Fact]
    public async Task O_rozhodnutem_naroku_se_podruhe_nerozhoduje()
    {
        var (db, naroky, _) = Sluzby();
        var lod = await LodAsync(db);
        var kapitan = await UcetAsync(db);
        var zadatel = await UcetAsync(db);
        await naroky.PodejAsync(zadatel.Id, new NarokVstup(lod.Id, null), default);
        var ceka = await naroky.CekajiciAsync(lod.Id, default);

        await naroky.RozhodniAsync(lod.Id, ceka[0].Id, prijmout: false, kapitan.Id, default);

        // Jinak by zamítnutí šlo po čase tiše otočit na přijetí.
        Assert.NotNull(
            await naroky.RozhodniAsync(lod.Id, ceka[0].Id, prijmout: true, kapitan.Id, default));
    }

    [Fact]
    public async Task Moje_naroky_rikaji_jak_dopadly()
    {
        var (db, naroky, _) = Sluzby();
        var lod = await LodAsync(db);
        var kapitan = await UcetAsync(db);
        var zadatel = await UcetAsync(db);
        await naroky.PodejAsync(zadatel.Id, new NarokVstup(lod.Id, "Jedu s nimi"), default);

        var pred = await naroky.MojeAsync(zadatel.Id, default);
        Assert.True(pred[0].Ceka);
        Assert.Equal(lod.Nazev, pred[0].Lod);

        var ceka = await naroky.CekajiciAsync(lod.Id, default);
        await naroky.RozhodniAsync(lod.Id, ceka[0].Id, prijmout: true, kapitan.Id, default);

        var po = await naroky.MojeAsync(zadatel.Id, default);
        Assert.False(po[0].Ceka);
        Assert.True(po[0].Prijat);
    }
}

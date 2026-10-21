using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Mobilní klíče k lodi proti reálnému PostgreSQL.
/// <para>
/// Jádro věci: <b>QR nenese klíč, ale jednorázovou pozvánku</b>. Kód se dá
/// vyfotit přes rameno nebo zůstat na papíře na stole, takže co se uplatní
/// jednou, podruhé neprojde.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class KliceTests(PostgresFixture fixture)
{
    private (AppDbContext Db, KliceSprava Klice) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (db, new KliceSprava(db, TimeProvider.System));
    }

    private static async Task<(Guid Kapitan, int LodId)> LodSKapitanemAsync(AppDbContext db)
    {
        var u = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Kapitán" };
        var lod = new Lod { Nazev = $"LUNA {Guid.NewGuid():N}"[..20] };
        db.Uzivatele.Add(u);
        db.Lode.Add(lod);
        await db.SaveChangesAsync();

        db.VazbyKLodim.Add(new VazbaKLodi
        {
            LodId = lod.Id,
            UzivatelId = u.Id,
            Role = RoleKLodi.Kapitan,
            Puvod = PuvodVazby.Kod,
            VzniklaV = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();
        return (u.Id, lod.Id);
    }

    [Fact]
    public async Task Pozvanka_se_da_uplatnit_jen_jednou()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);

        var pozvanka = await klice.PozviAsync(lod, kapitan, "Tonda", default);
        var prvni = await klice.UplatniAsync(pozvanka.Kod, default);
        var druhy = await klice.UplatniAsync(pozvanka.Kod, default);

        Assert.NotNull(prvni);
        Assert.Equal(lod, prvni!.LodId);
        Assert.Equal("Tonda", prvni.Jmeno);
        Assert.Null(druhy);
    }

    [Fact]
    public async Task Vymyslena_pozvanka_dopadne_stejne_jako_uplatnena()
    {
        var (_, klice) = Sluzby();

        // Obojí vrací null: z odpovědi se nesmí dát vyčíst, jestli kód
        // existoval.
        Assert.Null(await klice.UplatniAsync("tohle-nikdy-nebylo", default));
    }

    [Fact]
    public async Task Tajemstvi_se_v_databazi_neuklada_citelne()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);

        var pozvanka = await klice.PozviAsync(lod, kapitan, null, default);
        var uplatneni = await klice.UplatniAsync(pozvanka.Kod, default);

        // Kdyby se databáze dostala ven, s otiskem nikdo polohy neposílá.
        Assert.False(await db.Pozvanky.AnyAsync(p => p.Otisk == pozvanka.Kod));
        Assert.False(await db.Klice.AnyAsync(k => k.Otisk == uplatneni!.Klic));
    }

    [Fact]
    public async Task Klic_se_overi_a_zapise_si_posledni_pouziti()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var uplatneni = await klice.UplatniAsync(
            (await klice.PozviAsync(lod, kapitan, null, default)).Kod, default);

        var overeny = await klice.OverAsync(uplatneni!.Klic, default);

        Assert.NotNull(overeny);
        Assert.Equal(lod, overeny!.LodId);
        Assert.NotNull(overeny.PosledniPouzitiV);
    }

    [Fact]
    public async Task Odepnuty_klic_neprojde_ale_pripnuti_ho_vrati()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var uplatneni = await klice.UplatniAsync(
            (await klice.PozviAsync(lod, kapitan, null, default)).Kod, default);
        var klic = (await klice.OverAsync(uplatneni!.Klic, default))!;

        // Dočasné odepnutí: člen posádky zůstává, jen tuhle regatu nejede.
        Assert.True(await klice.SledujAsync(lod, klic.Id, false, default));
        Assert.Null(await klice.OverAsync(uplatneni.Klic, default));

        Assert.True(await klice.SledujAsync(lod, klic.Id, true, default));
        Assert.NotNull(await klice.OverAsync(uplatneni.Klic, default));
    }

    [Fact]
    public async Task Odebrany_klic_uz_nejde_ozivit()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var uplatneni = await klice.UplatniAsync(
            (await klice.PozviAsync(lod, kapitan, null, default)).Kod, default);
        var klic = (await klice.OverAsync(uplatneni!.Klic, default))!;

        Assert.True(await klice.OdeberAsync(lod, klic.Id, default));
        Assert.Null(await klice.OverAsync(uplatneni.Klic, default));

        // Připnutí odebraného klíče nesmí projít — odchod z posádky je
        // trvalý, na rozdíl od odepnutí ze sledování.
        Assert.False(await klice.SledujAsync(lod, klic.Id, true, default));
        Assert.Null(await klice.OverAsync(uplatneni.Klic, default));
    }

    [Fact]
    public async Task Klice_jine_lodi_nejdou_odebrat()
    {
        var (db, klice) = Sluzby();
        var (kapitan, moje) = await LodSKapitanemAsync(db);
        var (_, cizi) = await LodSKapitanemAsync(db);
        var uplatneni = await klice.UplatniAsync(
            (await klice.PozviAsync(moje, kapitan, null, default)).Kod, default);
        var klic = (await klice.OverAsync(uplatneni!.Klic, default))!;

        Assert.False(await klice.OdeberAsync(cizi, klic.Id, default));
        Assert.NotNull(await klice.OverAsync(uplatneni.Klic, default));
    }

    [Fact]
    public async Task Vydavat_klice_smi_jen_kapitan_nebo_majitel()
    {
        var (db, klice) = Sluzby();
        var (kapitan, lod) = await LodSKapitanemAsync(db);
        var kolemjdouci = new Uzivatel { Id = Guid.NewGuid(), Zobrazovane = "Kolemjdoucí" };
        db.Uzivatele.Add(kolemjdouci);
        await db.SaveChangesAsync();

        Assert.True(await klice.SmiVydavatAsync(lod, kapitan, default));
        Assert.False(await klice.SmiVydavatAsync(lod, kolemjdouci.Id, default));
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Párování účtu s lodí podle e-mailu proti reálnému PostgreSQL. Stojí to
/// na unikátním indexu a na dotazech přes kontakty — fake databáze by ani
/// jedno neověřila, a přitom právě tady by chyba spárovala cizího člověka
/// s cizí lodí.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class ParovaniTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 4, 10, 0, 0, TimeSpan.Zero);

    private async Task<(AppDbContext Db, Parovani Parovani)> CistaDbAsync()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.VazbyKLodim.ExecuteDeleteAsync();
        await db.Lode.ExecuteDeleteAsync();
        await db.Osoby.ExecuteDeleteAsync();
        return (db, new Parovani(db, TimeProvider.System, NullLogger<Parovani>.Instance));
    }

    private static Osoba Osoba(string jmeno, params string[] emaily) => new()
    {
        Jmeno = jmeno,
        Prijmeni = "Testovací",
        Kontakty = [.. emaily.Select(e => new KontaktOsoby { Email = e, ZadanoV = Ted })],
    };

    private async Task<Uzivatel> UcetAsync(AppDbContext db, string email)
    {
        var uzivatel = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = "Testovací účet",
            Email = email,
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(uzivatel);
        await db.SaveChangesAsync();
        return uzivatel;
    }

    [Fact]
    public async Task Majitel_lodi_se_sparuje_podle_emailu()
    {
        var (db, parovani) = await CistaDbAsync();
        var osoba = Osoba("Kapitán", "kapitan@example.test");
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();
        db.Lode.Add(new Lod { Nazev = "Anička", MajitelId = osoba.Id });
        await db.SaveChangesAsync();

        var ucet = await UcetAsync(db, "kapitan@example.test");
        var pribylo = await parovani.PodleEmailuAsync(ucet.Id, ucet.Email, default);

        Assert.Equal(1, pribylo);
        var vazba = await db.VazbyKLodim.SingleAsync();
        Assert.Equal(RoleKLodi.Majitel, vazba.Role);
        Assert.Equal(PuvodVazby.Email, vazba.Puvod);

        // Účet si k sobě vezme i záznam osoby — kontakty a historie pak
        // visí na jednom člověku.
        Assert.Equal(ucet.Id, (await db.Osoby.SingleAsync()).UserId);
    }

    [Fact]
    public async Task Sdilena_adresa_klubu_neparuje_nic()
    {
        var (db, parovani) = await CistaDbAsync();
        var prvni = Osoba("První", "klub@example.test");
        var druhy = Osoba("Druhý", "klub@example.test");
        db.Osoby.AddRange(prvni, druhy);
        await db.SaveChangesAsync();
        db.Lode.Add(new Lod { Nazev = "Anička", MajitelId = prvni.Id });
        await db.SaveChangesAsync();

        var ucet = await UcetAsync(db, "klub@example.test");
        var pribylo = await parovani.PodleEmailuAsync(ucet.Id, ucet.Email, default);

        // Adresa, kterou má v kontaktech víc lidí, nesmí spárovat nikoho:
        // jinak by se ke člunu připojil kdokoliv z klubu.
        Assert.Equal(0, pribylo);
        Assert.Empty(await db.VazbyKLodim.ToListAsync());
    }

    [Fact]
    public async Task Osoba_patrici_jinemu_uctu_se_neprebira()
    {
        var (db, parovani) = await CistaDbAsync();
        var cizi = await UcetAsync(db, "cizi@example.test");
        var osoba = Osoba("Kapitán", "kapitan@example.test");
        osoba.UserId = cizi.Id;
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();
        db.Lode.Add(new Lod { Nazev = "Anička", MajitelId = osoba.Id });
        await db.SaveChangesAsync();

        var ucet = await UcetAsync(db, "kapitan@example.test");
        Assert.Equal(0, await parovani.PodleEmailuAsync(ucet.Id, ucet.Email, default));
        Assert.Empty(await db.VazbyKLodim.ToListAsync());
    }

    [Fact]
    public async Task Druhe_prihlaseni_nic_nezdvoji_ani_nesnizi_roli()
    {
        var (db, parovani) = await CistaDbAsync();
        var osoba = Osoba("Kapitán", "kapitan@example.test");
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();
        db.Lode.Add(new Lod { Nazev = "Anička", MajitelId = osoba.Id });
        await db.SaveChangesAsync();

        var ucet = await UcetAsync(db, "kapitan@example.test");
        await parovani.PodleEmailuAsync(ucet.Id, ucet.Email, default);
        var podruhe = await parovani.PodleEmailuAsync(ucet.Id, ucet.Email, default);

        Assert.Equal(0, podruhe);
        var vazba = await db.VazbyKLodim.SingleAsync();
        Assert.Equal(RoleKLodi.Majitel, vazba.Role);
    }

    [Fact]
    public async Task Bez_emailu_se_neparuje()
    {
        var (db, parovani) = await CistaDbAsync();
        var ucet = await UcetAsync(db, "nikdo@example.test");

        Assert.Equal(0, await parovani.PodleEmailuAsync(ucet.Id, null, default));
        Assert.Equal(0, await parovani.PodleEmailuAsync(ucet.Id, "  ", default));
    }

    [Fact]
    public async Task Moje_lode_vraci_lod_i_s_roli()
    {
        var (db, parovani) = await CistaDbAsync();
        var osoba = Osoba("Kapitán", "kapitan@example.test");
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();
        db.Lode.Add(new Lod { Nazev = "Anička", CisloPlachty = "CZE 7", MajitelId = osoba.Id });
        await db.SaveChangesAsync();

        var ucet = await UcetAsync(db, "kapitan@example.test");
        await parovani.PodleEmailuAsync(ucet.Id, ucet.Email, default);

        var lode = await parovani.MojeLodeAsync(ucet.Id, default);
        var lod = Assert.Single(lode);
        Assert.Equal("Anička", lod.Nazev);
        Assert.Equal("CZE 7", lod.CisloPlachty);
        Assert.Equal(RoleKLodi.Majitel, lod.Role);
    }
}

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Párování účtu s lodí podle e-mailu proti reálnému PostgreSQL. Stojí to
/// na unikátním indexu a na dotazech přes kontakty — fake databáze by ani
/// jedno neověřila, a přitom právě tady by chyba spárovala cizího člověka
/// s cizí lodí.
/// <para>
/// <b>Nic se neuklízí mazáním tabulek.</b> Databázi sdílí celá kolekce
/// a lodě i osoby v ní visí na přihláškách jiných testů — první verze je
/// mazala a shodila půlku integračního běhu. Každý test si proto vyrobí
/// vlastní data s unikátním e-mailem a ptá se jen na ně.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class ParovaniTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 4, 10, 0, 0, TimeSpan.Zero);

    /// <summary>Adresa, kterou nemůže mít nikdo jiný — párování stojí na jedinečnosti.</summary>
    private static string Email() => $"parovani-{Guid.NewGuid():N}@example.test";

    private (AppDbContext Db, Parovani Parovani) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (db, new Parovani(db, TimeProvider.System, NullLogger<Parovani>.Instance));
    }

    private static Osoba Osoba(string jmeno, params string[] emaily) => new()
    {
        Jmeno = jmeno,
        Prijmeni = "Testovací",
        Kontakty = [.. emaily.Select(e => new KontaktOsoby { Email = e, ZadanoV = Ted })],
    };

    /// <summary>Osoba s kontaktem a loď, kterou vlastní.</summary>
    private static async Task<(Osoba Osoba, Lod Lod)> OsobaSLodiAsync(AppDbContext db, string email)
    {
        var osoba = Osoba("Kapitán", email);
        db.Osoby.Add(osoba);
        await db.SaveChangesAsync();

        var lod = new Lod { Nazev = $"Anička {Guid.NewGuid():N}"[..20], MajitelId = osoba.Id };
        db.Lode.Add(lod);
        await db.SaveChangesAsync();
        return (osoba, lod);
    }

    private static async Task<Uzivatel> UcetAsync(AppDbContext db, string email)
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
        var (db, parovani) = Sluzby();
        var email = Email();
        var (osoba, lod) = await OsobaSLodiAsync(db, email);
        var ucet = await UcetAsync(db, email);

        Assert.Equal(1, await parovani.PodleEmailuAsync(ucet.Id, email, default));

        var vazba = await db.VazbyKLodim.SingleAsync(v => v.UzivatelId == ucet.Id);
        Assert.Equal(lod.Id, vazba.LodId);
        Assert.Equal(RoleKLodi.Majitel, vazba.Role);
        Assert.Equal(PuvodVazby.Email, vazba.Puvod);

        // Účet si k sobě vezme i záznam osoby — kontakty a historie pak
        // visí na jednom člověku.
        Assert.Equal(ucet.Id, (await db.Osoby.SingleAsync(o => o.Id == osoba.Id)).UserId);
    }

    [Fact]
    public async Task Sdilena_adresa_klubu_neparuje_nic()
    {
        var (db, parovani) = Sluzby();
        var email = Email();
        await OsobaSLodiAsync(db, email);
        db.Osoby.Add(Osoba("Druhý", email));
        await db.SaveChangesAsync();

        var ucet = await UcetAsync(db, email);

        // Adresa, kterou má v kontaktech víc lidí, nesmí spárovat nikoho:
        // jinak by se ke člunu připojil kdokoliv z klubu.
        Assert.Equal(0, await parovani.PodleEmailuAsync(ucet.Id, email, default));
        Assert.Empty(await db.VazbyKLodim.Where(v => v.UzivatelId == ucet.Id).ToListAsync());
    }

    [Fact]
    public async Task Osoba_patrici_jinemu_uctu_se_neprebira()
    {
        var (db, parovani) = Sluzby();
        var email = Email();
        var (osoba, _) = await OsobaSLodiAsync(db, email);

        var cizi = await UcetAsync(db, Email());
        osoba.UserId = cizi.Id;
        await db.SaveChangesAsync();

        var ucet = await UcetAsync(db, email);

        Assert.Equal(0, await parovani.PodleEmailuAsync(ucet.Id, email, default));
        Assert.Empty(await db.VazbyKLodim.Where(v => v.UzivatelId == ucet.Id).ToListAsync());
    }

    [Fact]
    public async Task Druhe_prihlaseni_nic_nezdvoji_ani_nesnizi_roli()
    {
        var (db, parovani) = Sluzby();
        var email = Email();
        await OsobaSLodiAsync(db, email);
        var ucet = await UcetAsync(db, email);

        await parovani.PodleEmailuAsync(ucet.Id, email, default);
        Assert.Equal(0, await parovani.PodleEmailuAsync(ucet.Id, email, default));

        var vazba = await db.VazbyKLodim.SingleAsync(v => v.UzivatelId == ucet.Id);
        Assert.Equal(RoleKLodi.Majitel, vazba.Role);
    }

    [Fact]
    public async Task Bez_emailu_se_neparuje()
    {
        var (db, parovani) = Sluzby();
        var ucet = await UcetAsync(db, Email());

        Assert.Equal(0, await parovani.PodleEmailuAsync(ucet.Id, null, default));
        Assert.Equal(0, await parovani.PodleEmailuAsync(ucet.Id, "  ", default));
    }

    [Fact]
    public async Task Moje_lode_vraci_lod_i_s_roli()
    {
        var (db, parovani) = Sluzby();
        var email = Email();
        var (_, lod) = await OsobaSLodiAsync(db, email);
        var ucet = await UcetAsync(db, email);
        await parovani.PodleEmailuAsync(ucet.Id, email, default);

        var mojeLode = await parovani.MojeLodeAsync(ucet.Id, default);

        var moje = Assert.Single(mojeLode);
        Assert.Equal(lod.Id, moje.LodId);
        Assert.Equal(lod.Nazev, moje.Nazev);
        Assert.Equal(RoleKLodi.Majitel, moje.Role);
    }
}

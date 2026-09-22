using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Mapování <c>(issuer, subject) → UserId</c> proti reálnému PostgreSQL.
/// <para>
/// Stojí to na unikátním indexu nad dvojicí, takže in-memory provider by tu
/// neověřil to podstatné — stejný důvod, proč je takhle psaný i import.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class IdentitaTests(PostgresFixture fixture)
{
    private const string Vydavatel = "https://ucty.priklad.cz";

    private async Task<T> VeSluzbeAsync<T>(Func<Uzivatele, AppDbContext, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        return await co(
            scope.ServiceProvider.GetRequiredService<Uzivatele>(),
            scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private static Task<Uzivatel> Prihlas(
        Uzivatele uzivatele, string subject, string jmeno = "Jan Novák", string? email = "jan@priklad.cz",
        string vydavatel = Vydavatel) =>
        uzivatele.NajdiNeboZalozAsync(vydavatel, subject, jmeno, email, TimeProvider.System, default);

    [Fact]
    public async Task Prvni_prihlaseni_zaklada_ucet_a_druhe_uz_ne()
    {
        var (prvni, druhe) = await VeSluzbeAsync(async (u, _) =>
            (await Prihlas(u, "sub-opakovane"), await Prihlas(u, "sub-opakovane")));

        // Tentýž člověk musí dostat tentýž interní identifikátor. Kdyby se
        // při každém přihlášení zakládal nový, rozpadla by se mu s ním
        // všechna oprávnění.
        Assert.Equal(prvni.Id, druhe.Id);

        var vazeb = await VeSluzbeAsync((_, db) =>
            db.Vazby.CountAsync(v => v.Subject == "sub-opakovane"));
        Assert.Equal(1, vazeb);
    }

    [Fact]
    public async Task Jmeno_a_mail_se_pri_prihlaseni_srovnaji()
    {
        await VeSluzbeAsync((u, _) => Prihlas(u, "sub-prejmenovany", "Jan Novák", "jan@priklad.cz"));
        var po = await VeSluzbeAsync((u, _) =>
            Prihlas(u, "sub-prejmenovany", "Jana Nováková", "jana@priklad.cz"));

        // Autoritativní jsou u poskytovatele, tady jen k zobrazení.
        Assert.Equal("Jana Nováková", po.Zobrazovane);
        Assert.Equal("jana@priklad.cz", po.Email);
        Assert.NotNull(po.NaposledyPrihlasenV);
    }

    [Fact]
    public async Task Tentyz_subject_od_jineho_vydavatele_je_jiny_clovek()
    {
        var a = await VeSluzbeAsync((u, _) => Prihlas(u, "12345", vydavatel: "https://prvni.priklad.cz"));
        var b = await VeSluzbeAsync((u, _) => Prihlas(u, "12345", vydavatel: "https://druhy.priklad.cz"));

        // Garantovaně unikátní je až dvojice. „12345" může u dvou
        // poskytovatelů patřit dvěma různým lidem — a kdyby se slili,
        // zdědil by jeden práva druhého.
        Assert.NotEqual(a.Id, b.Id);
    }

    [Fact]
    public async Task Novy_ucet_nema_zadna_prava()
    {
        var uzivatel = await VeSluzbeAsync((u, _) => Prihlas(u, "sub-bez-prav"));
        var prava = await VeSluzbeAsync((u, _) => u.PravaAsync(uzivatel.Id, default));

        // Účet se zakládá při prvním přihlášení, takže tohle musí platit —
        // jinak by pozvánkou bylo samo přihlášení, ne udělení role.
        Assert.Empty(prava);
        Assert.False(Prava.Smi(prava, new(Role.Editor, 1)));
    }

    [Fact]
    public async Task Prava_se_ctou_i_s_rozsahem()
    {
        var uzivatel = await VeSluzbeAsync((u, _) => Prihlas(u, "sub-s-pravy"));

        var (serieId, zavodId) = await VeSluzbeAsync(async (_, db) =>
        {
            var serie = new Api.Features.Serial.Serie
            {
                Nazev = "Pohár práv", Slug = "prava", Rok = 2025,
            };
            db.Serie.Add(serie);
            await db.SaveChangesAsync();

            var zavod = new Api.Features.Zavody.Zavod
            {
                SerieId = serie.Id, Nazev = "Zastávka", Slug = "zastavka",
                Datum = new DateOnly(2025, 5, 1),
            };
            db.Zavody.Add(zavod);
            await db.SaveChangesAsync();

            db.Opravneni.Add(new Opravneni
            {
                UzivatelId = uzivatel.Id, Role = Role.Spravce,
                SerieId = serie.Id, ZavodId = zavod.Id,
                UdelenoV = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
            return (serie.Id, zavod.Id);
        });

        var prava = await VeSluzbeAsync((u, _) => u.PravaAsync(uzivatel.Id, default));

        Assert.True(Prava.Smi(prava, new(Role.Spravce, serieId, zavodId)));
        // Právo na zastávku není právo na ročník.
        Assert.False(Prava.Smi(prava, new(Role.Spravce, serieId)));
    }

    /// <summary>
    /// Založí ročník se zastávkou a pořadatele jen té zastávky.
    /// </summary>
    private async Task<(Guid Uzivatel, int Serie, int Zavod)> PoradatelZastavkyAsync(string subject, string slug)
    {
        var uzivatel = await VeSluzbeAsync((u, _) => Prihlas(u, subject));

        return await VeSluzbeAsync(async (_, db) =>
        {
            var serie = new Api.Features.Serial.Serie { Nazev = "Pohár mazání", Slug = slug, Rok = 2025 };
            db.Serie.Add(serie);
            await db.SaveChangesAsync();

            var zavod = new Api.Features.Zavody.Zavod
            {
                SerieId = serie.Id, Nazev = "Mazaná zastávka", Slug = "mazana",
                Datum = new DateOnly(2025, 6, 1),
            };
            db.Zavody.Add(zavod);
            await db.SaveChangesAsync();

            db.Opravneni.Add(new Opravneni
            {
                UzivatelId = uzivatel.Id, Role = Role.Organizator,
                SerieId = serie.Id, ZavodId = zavod.Id,
                UdelenoV = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
            return (uzivatel.Id, serie.Id, zavod.Id);
        });
    }

    private async Task PravoNaRocnikNevzniklo(Guid uzivatelId, int serieId)
    {
        var prava = await VeSluzbeAsync((u, _) => u.PravaAsync(uzivatelId, default));

        // Prázdné ZavodId znamená celý ročník. Vynulováním by se z pořadatele
        // jedné zastávky potichu stal pořadatel všech.
        Assert.False(Prava.Smi(prava, new(Role.Organizator, serieId)));
        Assert.False(Prava.Smi(prava, new(Role.Editor, serieId)));

        var radku = await VeSluzbeAsync((_, db) =>
            db.Opravneni.CountAsync(o => o.UzivatelId == uzivatelId));
        Assert.Equal(0, radku);
    }

    [Fact]
    public async Task Smazana_zastavka_nedava_pravo_na_rocnik_ani_v_databazi()
    {
        var (uzivatel, serie, zavod) = await PoradatelZastavkyAsync("sub-mazani-sql", "mazani-sql");

        // Mimo EF, jako ruční DELETE: rozhoduje pravidlo cizího klíče.
        await VeSluzbeAsync((_, db) => db.Zavody.Where(z => z.Id == zavod).ExecuteDeleteAsync());

        await PravoNaRocnikNevzniklo(uzivatel, serie);
    }

    [Fact]
    public async Task Smazana_zastavka_nedava_pravo_na_rocnik_ani_pres_ef()
    {
        var (uzivatel, serie, zavod) = await PoradatelZastavkyAsync("sub-mazani-ef", "mazani-ef");

        // S načteným právem v kontextu rozhoduje EF, ne databáze — při
        // SetNull by řádek sám přepsal na ZavodId = null.
        await VeSluzbeAsync(async (_, db) =>
        {
            await db.Opravneni.Where(o => o.ZavodId == zavod).LoadAsync();
            db.Zavody.Remove(await db.Zavody.SingleAsync(z => z.Id == zavod));
            return await db.SaveChangesAsync();
        });

        await PravoNaRocnikNevzniklo(uzivatel, serie);
    }
}

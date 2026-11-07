using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pomoc u startu a u cíle proti reálnému PostgreSQL (nález K8).
/// <para>
/// Pravidla samotná jsou čisté funkce v <see cref="PomocniciTests"/>. Tady
/// jde o to, co s nimi dělá databáze: <b>kdo je vůbec kandidát</b> (a to se
/// počítá z udělených práv přes <see cref="Prava.Smi"/>, ne porovnáním rolí),
/// a jestli po odškrtnutí zůstane doklad.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class PomocniciSpravaTests(PostgresFixture fixture)
{
    private const string Vydavatel = "https://ucty.priklad.cz";

    /// <summary>
    /// Ročník s dvěma zastávkami. <b>Pepa pořádá Zahájení, Milan Radavskou</b>
    /// — a právě Pepa je ten, kdo v K8 stojí u cíle cizí regaty.
    /// </summary>
    private sealed record Svet(
        AppDbContext Db, PomocniciSprava Sprava, int SerieId, int Zahajeni, int Radavska,
        Guid Pepa, Guid Milan, Guid Rozhodci, Guid Cizi);

    private async Task<T> VeSveteAsync<T>(string slug, Func<Svet, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var uzivatele = scope.ServiceProvider.GetRequiredService<Uzivatele>();

        var serie = new Api.Features.Serial.Serie { Nazev = $"Pohár {slug}", Slug = slug, Rok = 2026 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var zahajeni = new Zavod
        {
            SerieId = serie.Id, Nazev = "Zahájení sezóny", Slug = $"{slug}-zahajeni",
            Datum = new DateOnly(2026, 4, 25),
        };
        var radavska = new Zavod
        {
            SerieId = serie.Id, Nazev = "Radavská regata", Slug = $"{slug}-radavska",
            Datum = new DateOnly(2026, 6, 13),
        };
        db.Zavody.AddRange(zahajeni, radavska);
        await db.SaveChangesAsync();

        async Task<Guid> Ucet(string sub, string jmeno) =>
            (await uzivatele.NajdiNeboZalozAsync(
                Vydavatel, $"{slug}-{sub}", jmeno, null, TimeProvider.System, default)).Id;

        var pepa = await Ucet("pepa", "Pepa Pořadatel");
        var milan = await Ucet("milan", "Milan Místní");
        var rozhodci = await Ucet("rozhodci", "Miloš Rozhodčí");
        var cizi = await Ucet("cizi", "Cizí Člověk");

        db.Opravneni.AddRange(
            new Opravneni
            {
                UzivatelId = pepa, Role = Role.Organizator,
                SerieId = serie.Id, ZavodId = zahajeni.Id, UdelenoV = DateTimeOffset.UtcNow,
            },
            new Opravneni
            {
                UzivatelId = milan, Role = Role.Organizator,
                SerieId = serie.Id, ZavodId = radavska.Id, UdelenoV = DateTimeOffset.UtcNow,
            },
            new Opravneni
            {
                UzivatelId = rozhodci, Role = Role.Rozhodci,
                SerieId = serie.Id, ZavodId = null, UdelenoV = DateTimeOffset.UtcNow,
            });
        await db.SaveChangesAsync();

        return await co(new Svet(
            db, scope.ServiceProvider.GetRequiredService<PomocniciSprava>(),
            serie.Id, zahajeni.Id, radavska.Id, pepa, milan, rozhodci, cizi));
    }

    /// <summary>
    /// <b>Kandidátem je pořadatel kterékoliv zastávky ročníku</b>, a u toho
    /// zdejšího se to pozná. Kdyby se seznam omezil na pořadatele téhle
    /// zastávky, nebyl by koho zaškrtávat a celé K8 by nic nevyřešilo;
    /// kdyby <c>jeZdejsi</c> chybělo, rozhodčí by zaškrtával lidi, kterým
    /// tím nic nepřidá.
    /// </summary>
    [Fact]
    public async Task Kandidatem_je_poradatel_kterekoliv_zastavky_rocniku()
    {
        await VeSveteAsync("pomocnici-kandidati", async s =>
        {
            var lide = await s.Sprava.PoradateleAsync(s.SerieId, s.Radavska, default);

            var pepa = Assert.Single(lide, p => p.UzivatelId == s.Pepa);
            Assert.False(pepa.JeZdejsi);
            Assert.False(pepa.Pomaha);

            var milan = Assert.Single(lide, p => p.UzivatelId == s.Milan);
            Assert.True(milan.JeZdejsi);

            // Rozhodčí ani kolemjdoucí pořadateli nejsou, takže se
            // nenabízejí. Rozhodčí je funkce v procesu, ne stupeň nad
            // pořadatelem — a kdyby se nabízel, zaškrtával by sám sebe.
            Assert.DoesNotContain(s.Rozhodci, lide.Select(p => p.UzivatelId));
            Assert.DoesNotContain(s.Cizi, lide.Select(p => p.UzivatelId));

            return 0;
        });
    }

    /// <summary>
    /// <b>Jádro K8 proti databázi:</b> dokud není zaškrtnutý, Pepa na cizí
    /// regatě u vody nic nesmí; po zaškrtnutí ano. Obě strany schválně —
    /// příznak, který by platil pořád, by byl totéž jako žádný.
    /// </summary>
    [Fact]
    public async Task Zaskrtnuti_otevre_vodu_a_bez_nej_zavrena_je()
    {
        await VeSveteAsync("pomocnici-zaskrtnuti", async s =>
        {
            Assert.False(await s.Sprava.JeAsync(s.Radavska, s.Pepa, default));

            Assert.Null(await s.Sprava.ZaskrtniAsync(
                s.SerieId, s.Radavska, s.Pepa, s.Rozhodci, default));

            Assert.True(await s.Sprava.JeAsync(s.Radavska, s.Pepa, default));

            // Doklad: kdo ho zaškrtl. Když se o start strhne spor, je to
            // první otázka.
            var jeho = Assert.Single(
                await s.Sprava.PoradateleAsync(s.SerieId, s.Radavska, default),
                p => p.UzivatelId == s.Pepa);
            Assert.True(jeho.Pomaha);
            Assert.Equal("Miloš Rozhodčí", jeho.Zaskrtl);
            Assert.NotNull(jeho.OdV);

            return 0;
        });
    }

    /// <summary>
    /// <b>Příznak se váže na jednu regatu</b>, ne na ročník. Jinak by
    /// pomocník zaškrtnutý na Radavské platil i tam, kde toho dne vůbec
    /// není.
    /// </summary>
    [Fact]
    public async Task Priznak_plati_jen_na_tu_jednu_regatu()
    {
        await VeSveteAsync("pomocnici-jedna-regata", async s =>
        {
            Assert.Null(await s.Sprava.ZaskrtniAsync(
                s.SerieId, s.Radavska, s.Pepa, s.Rozhodci, default));

            Assert.True(await s.Sprava.JeAsync(s.Radavska, s.Pepa, default));
            Assert.False(await s.Sprava.JeAsync(s.Zahajeni, s.Pepa, default));

            // A opačně: Milan zaškrtnutý není nikde, i když Radavskou pořádá.
            Assert.False(await s.Sprava.JeAsync(s.Radavska, s.Milan, default));

            return 0;
        });
    }

    /// <summary>
    /// <b>Odškrtnutí zapisuje, nemaže.</b> Po regatě musí zůstat doklad, kdo
    /// toho dne u startu a u cíle stál — a kdo ho odškrtl.
    /// </summary>
    [Fact]
    public async Task Odskrtnuti_zapisuje_a_doklad_zustava()
    {
        await VeSveteAsync("pomocnici-doklad", async s =>
        {
            Assert.Null(await s.Sprava.ZaskrtniAsync(
                s.SerieId, s.Radavska, s.Pepa, s.Rozhodci, default));
            Assert.Null(await s.Sprava.OdskrtniAsync(s.Radavska, s.Pepa, s.Rozhodci, default));

            Assert.False(await s.Sprava.JeAsync(s.Radavska, s.Pepa, default));

            var zapsane = await s.Db.Pomocnici
                .Where(p => p.ZavodId == s.Radavska && p.UzivatelId == s.Pepa)
                .ToListAsync();

            var radek = Assert.Single(zapsane);
            Assert.NotNull(radek.DoV);
            Assert.Equal(s.Rozhodci, radek.ZaskrtlId);
            Assert.Equal(s.Rozhodci, radek.OdskrtlId);

            // Odškrtnout podruhé nejde — jinak by v dokladu vznikl záznam
            // o ukončení něčeho, co nezačalo.
            Assert.Equal(
                Pomocnici.NepomahaOdkdy,
                await s.Sprava.OdskrtniAsync(s.Radavska, s.Pepa, s.Rozhodci, default));

            return 0;
        });
    }

    /// <summary>
    /// <b>Příznak roli nepřidává.</b> Koho ročník nezná jako pořadatele,
    /// zaškrtnout nejde — jinak by se startérem stal někdo, komu to nikdo
    /// neudělil, a udělování práv by se dalo obejít touhle cestou.
    /// </summary>
    [Fact]
    public async Task Koho_rocnik_nezna_zaskrtnout_nejde()
    {
        await VeSveteAsync("pomocnici-cizi", async s =>
        {
            Assert.Equal(
                Pomocnici.NeniPoradatel,
                await s.Sprava.ZaskrtniAsync(s.SerieId, s.Radavska, s.Cizi, s.Rozhodci, default));

            Assert.False(await s.Sprava.JeAsync(s.Radavska, s.Cizi, default));

            // Druhé zaškrtnutí téhož člověka nepřidá druhý řádek bez konce:
            // dvě odpovědi na „odkdy pomáhá" by doklad přestaly být dokladem.
            Assert.Null(await s.Sprava.ZaskrtniAsync(
                s.SerieId, s.Radavska, s.Pepa, s.Rozhodci, default));
            Assert.Equal(
                Pomocnici.JizPomaha,
                await s.Sprava.ZaskrtniAsync(s.SerieId, s.Radavska, s.Pepa, s.Rozhodci, default));

            Assert.Equal(
                1,
                await s.Db.Pomocnici.CountAsync(
                    p => p.ZavodId == s.Radavska && p.UzivatelId == s.Pepa && p.DoV == null));

            return 0;
        });
    }
}

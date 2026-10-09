using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Boje;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Stavění a přenastavování bójí proti reálnému PostgreSQL.
/// <para>
/// Jádro věci: <b>přenastavení nesmí přepsat, kde bóje stála</b>. Trasa lodi
/// se k trati vztahuje tak, jak stála tehdy — bez historie by se po posunu
/// bóje přepsala i minulost.
/// </para>
/// <para>Nic se neuklízí mazáním tabulek, databázi sdílí celá kolekce.</para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class BojeTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 5, 8, 0, 0, TimeSpan.Zero);

    /// <summary>Úložiště, které nic neukládá, ale zná veřejnou adresu.</summary>
    private sealed class VerejneUloziste : OrlickyPohar.Api.Features.Fotky.IUloziste
    {
        public bool Pripraveno => true;
        public string? VerejnaAdresa => "https://foto.example";

        public Task UlozAsync(
            string klic, byte[] data, string typ, CancellationToken ct, string? cache = null) =>
            Task.CompletedTask;

        public Task SmazAsync(string klic, CancellationToken ct) => Task.CompletedTask;
    }

    private (AppDbContext Db, BojeSprava Boje) Sluzby()
    {
        var (db, boje, _) = SluzbyITrat();
        return (db, boje);
    }

    /// <summary>
    /// Služby i s tratí. Potřeba tam, kde se měří, jestli na záznamu bóje
    /// něco visí: přijetí trati je právě ta věc, která ho udělá důležitým.
    /// </summary>
    private (AppDbContext Db, BojeSprava Boje, TratSprava Trat) SluzbyITrat()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // Úložiště vlastní, ne ze služeb: v CI není nastavené a `Nahravani.Dto`
        // by bez veřejné adresy vydal null. Test má měřit projekci, ne to,
        // jestli má běh nakonfigurované R2.
        var uloziste = new VerejneUloziste();
        var trate = new TratSprava(db, TimeProvider.System);
        return (db, new BojeSprava(
            db, TimeProvider.System, uloziste, trate,
            new OrlickyPohar.Api.Features.Fotky.FotkySprava(
                db, uloziste, TimeProvider.System,
                NullLogger<OrlickyPohar.Api.Features.Fotky.FotkySprava>.Instance),
            NullLogger<BojeSprava>.Instance), trate);
    }

    /// <summary>
    /// Udělá z bóje „důležitou": rozhodčí trať přijme, takže šla ven ve
    /// veřejné trati. Pak se zase odemkne, aby se dalo pípat a sbírat.
    /// </summary>
    private static async Task DulezitaAsync(TratSprava trate, Zavod zavod, Uzivatel kdo)
    {
        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);
        await trate.PrestavbaAsync(zavod.Id, true, default);
    }

    private static async Task<(Zavod Zavod, Uzivatel Kdo)> RegataAsync(AppDbContext db)
    {
        var klic = Guid.NewGuid().ToString("N")[..8];
        var serie = new Serie { Slug = $"boje-{klic}", Nazev = "Bójová série", Rok = 2027 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{klic}",
            Nazev = "Bójová regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);

        var kdo = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = "Pořadatel",
            Email = $"boje-{klic}@example.test",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();
        return (zavod, kdo);
    }

    private static PipnutiVstup Bod(string nazev, double sirka = 49.516, int? nahrazuje = null) =>
        new(nazev, 0, sirka, 14.165, 5, nahrazuje);

    /// <summary>Bod odečtený z mapy: bez přesnosti, protože mapa neměří.</summary>
    private static PipnutiVstup ZMapy(string nazev, ZdrojPolohy zdroj = ZdrojPolohy.Mapa) =>
        new(nazev, 0, 49.4957254, 14.1841419, null, null, zdroj);

    [Fact]
    public async Task Postavena_boje_dostane_poradi_za_posledni()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvni, _) = await boje.PipniAsync(zavod.Id, Bod("Start levý"), kdo.Id, default);
        var (druha, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);

        Assert.Equal(1, prvni!.Poradi);
        Assert.Equal(2, druha!.Poradi);
        Assert.Equal("Pořadatel", druha.Postavil);
    }

    [Fact]
    public async Task Zdroj_polohy_se_ulozi_a_vrati()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (pipnuta, _) = await boje.PipniAsync(zavod.Id, Bod("Start levý"), kdo.Id, default);
        var (zmapy, _) = await boje.PipniAsync(zavod.Id, ZMapy("Bóje 1"), kdo.Id, default);
        var (zqr, _) = await boje.PipniAsync(zavod.Id, ZMapy("Cíl", ZdrojPolohy.Qr), kdo.Id, default);

        // Pípnutí měří a hlásí přesnost; odečtený bod ji nemá a nesmí mít.
        Assert.Equal(ZdrojPolohy.Telefon, pipnuta!.Zdroj);
        Assert.Equal(5, pipnuta.PresnostM);
        Assert.Equal(ZdrojPolohy.Mapa, zmapy!.Zdroj);
        Assert.Null(zmapy.PresnostM);
        Assert.Equal(ZdrojPolohy.Qr, zqr!.Zdroj);

        // A drží to i po novém načtení, ne jen v odpovědi na zápis.
        var vse = await boje.SeznamAsync(zavod.Id, iHistorie: true, default);
        Assert.Equal(ZdrojPolohy.Mapa, vse.Single(b => b.Id == zmapy.Id).Zdroj);
    }

    /// <summary>
    /// <b>Přenastavení při stavbě historii nevyrábí.</b> Dřív tenhle test
    /// tvrdil opak — že původní záznam zůstane vždycky. Filip to otočil
    /// (9. 10. 2026): <i>„Když se překlepnem, nebo rozhodneme to přendat
    /// při stavbě, před schválením, tak nám ten údaj k ničemu není a ani
    /// na něm nic nevisí."</i> Že záznam zůstane, když na něm něco visí,
    /// hlídají testy ve <c>TratSpravaTests</c>.
    /// </summary>
    [Fact]
    public async Task Prenastaveni_pri_stavbe_nevyrabi_historii()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        var (puvodni, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);

        var (nova, chyba) = await boje.PipniAsync(
            zavod.Id, Bod("Bóje 1", sirka: 49.52, nahrazuje: puvodni!.Id), kdo.Id, default);

        Assert.Null(chyba);
        // Trať vidí jen novou polohu…
        var platne = await boje.SeznamAsync(zavod.Id, iHistorie: false, default);
        Assert.Single(platne);
        Assert.Equal(nova!.Id, platne[0].Id);
        Assert.Equal(49.52, platne[0].Sirka, 5);
        // …a historie je prázdná: trať nikdo nepřijal a žádný prvek na
        // ten záznam neukazoval, takže na něm nic neviselo.
        var vse = await boje.SeznamAsync(zavod.Id, iHistorie: true, default);
        Assert.Single(vse);
        Assert.DoesNotContain(vse, b => b.Id == puvodni.Id);
        // Pořadí se po bóji, kterou nahrazuje, převezme.
        Assert.Equal(puvodni.Poradi, nova.Poradi);
    }

    [Fact]
    public async Task Tataz_boje_se_neprenastavi_dvakrat()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        var (puvodni, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);
        await boje.PipniAsync(zavod.Id, Bod("Bóje 1", nahrazuje: puvodni!.Id), kdo.Id, default);

        var (nic, chyba) = await boje.PipniAsync(
            zavod.Id, Bod("Bóje 1", nahrazuje: puvodni.Id), kdo.Id, default);

        Assert.Null(nic);
        Assert.NotNull(chyba);
    }

    /// <summary>
    /// <b>Sebraná bóje zůstane v záznamech jen tehdy, když na ní něco
    /// visí</b> (Filip, 9. 10. 2026). Dřív tenhle test tvrdil, že zůstane
    /// vždycky; bóje sebraná při stavbě ale nikomu nesloužila a v seznamu
    /// jen překážela tomu, co platí.
    /// </summary>
    [Fact]
    public async Task Sebrana_boje_zustane_v_zaznamech_jen_kdyz_na_ni_neco_visi()
    {
        var (db, boje, trate) = SluzbyITrat();
        var (zavod, kdo) = await RegataAsync(db);

        // Bóje sebraná při stavbě: nic na ní nevisí, takže nezůstane nic.
        var (pri_stavbe, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);
        Assert.Null(await boje.SeberAsync(zavod.Id, pri_stavbe!.Id, default));
        Assert.Empty(await boje.SeznamAsync(zavod.Id, iHistorie: true, default));

        // Bóje, která stála ve vodě při přijetí trati, šla ven veřejně —
        // a co bylo veřejné, se zpětně nepřepisuje.
        var (verejna, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 2"), kdo.Id, default);
        await DulezitaAsync(trate, zavod, kdo);
        Assert.Null(await boje.SeberAsync(zavod.Id, verejna!.Id, default));

        Assert.Empty(await boje.SeznamAsync(zavod.Id, iHistorie: false, default));
        var vse = await boje.SeznamAsync(zavod.Id, iHistorie: true, default);
        Assert.True(vse.Single().Sebrana);
    }

    [Fact]
    public async Task Cizi_boje_se_prenastavit_nebo_sebrat_neda()
    {
        var (db, boje) = Sluzby();
        var (prvni, kdo) = await RegataAsync(db);
        var (druha, _) = await RegataAsync(db);
        var (cizi, _) = await boje.PipniAsync(prvni.Id, Bod("Bóje 1"), kdo.Id, default);

        var (nic, chyba) = await boje.PipniAsync(
            druha.Id, Bod("Bóje 1", nahrazuje: cizi!.Id), kdo.Id, default);

        Assert.Null(nic);
        Assert.NotNull(chyba);
        Assert.NotNull(await boje.SeberAsync(druha.Id, cizi.Id, default));
    }

    [Fact]
    public async Task Nepresne_pipnuti_se_do_databaze_nedostane()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (nic, chyba) = await boje.PipniAsync(
            zavod.Id, new PipnutiVstup("Bóje 1", 0, 49.516, 14.165, 250, null), kdo.Id, default);

        Assert.Null(nic);
        Assert.NotNull(chyba);
        Assert.Empty(await db.Boje.Where(b => b.ZavodId == zavod.Id).ToListAsync());
    }

    /// <summary>
    /// Fotky jsou doklad k poloze, takže musí dojít až ke klientovi — a čerstvě
    /// pípnutá bóje žádnou nemá. Bez téhle kontroly by se projekce dala
    /// omylem zúžit zpátky na SQL a fotky by tiše vypadly.
    /// <para>
    /// <b>Víc než jedna</b>: jeden snímek zblízka neukáže zároveň bóji
    /// i břeh za ní, a teprve obojí dohromady říká, kde to je.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Fotky_u_boje_dojdou_do_seznamu_v_poradi_nahrani()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (postavena, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);
        Assert.Empty(postavena!.Fotky);
        Assert.Empty((await boje.SeznamAsync(zavod.Id, false, default)).Single().Fotky);

        var zblizka = Snimek(kdo.Id, "Bóje zblízka", Ted);
        // Druhá je starší, ať je vidět, že se řadí podle nahrání a ne
        // podle toho, jak je vrátí databáze.
        var sbrehem = Snimek(kdo.Id, "Bóje a břeh za ní", Ted.AddMinutes(-5));
        db.Fotky.AddRange(sbrehem, zblizka);
        foreach (var f in new[] { zblizka, sbrehem }) f.UBojeId = postavena.Id;
        await db.SaveChangesAsync();

        var sFotkami = (await boje.SeznamAsync(zavod.Id, false, default)).Single();
        Assert.Equal(2, sFotkami.Fotky.Count);
        Assert.Equal(["Bóje a břeh za ní", "Bóje zblízka"], sFotkami.Fotky.Select(f => f.Popis));
        Assert.Equal("Miloš Zvonař", sFotkami.Fotky[0].Autor);
        Assert.Contains(sbrehem.Id.ToString("N"), sFotkami.Fotky[0].Nahled);
        // Id musí dojít ke klientovi, jinak nejde odebrat jedna z několika.
        Assert.Equal(sbrehem.Id, sFotkami.Fotky[0].Id);
    }

    /// <summary>
    /// <b>Fotka jde se záznamem.</b> Dřív tu stálo, že sebraná bóje si
    /// fotky nechává a úklid patří na konec ročníku — to bylo Filipovo
    /// ranní rozhodnutí z 9. 10. 2026. Večer téhož dne ho otočil:
    /// <i>„a ty fotky nemá taky cenu držet."</i> U polohy, kterou nikdo
    /// neviděl a na které nic nestojí, není co dokládat — a fotka na
    /// rozdíl od řádku stojí místo na disku.
    /// <para>
    /// Když na záznamu něco visí, zůstává i s fotkami.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Fotka_jde_se_zaznamem()
    {
        var (db, boje, trate) = SluzbyITrat();
        var (zavod, kdo) = await RegataAsync(db);

        var (pri_stavbe, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);
        var zahozena = Snimek(kdo.Id, "Bóje zblízka", Ted);
        zahozena.UBojeId = pri_stavbe!.Id;
        db.Fotky.Add(zahozena);
        await db.SaveChangesAsync();

        Assert.Null(await boje.SeberAsync(zavod.Id, pri_stavbe.Id, default));
        Assert.Empty(await boje.SeznamAsync(zavod.Id, iHistorie: true, default));
        Assert.False(await db.Fotky.AnyAsync(f => f.Id == zahozena.Id));

        // A naopak: na čem něco visí, tomu fotka zůstane.
        var (verejna, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 2"), kdo.Id, default);
        var zustane = Snimek(kdo.Id, "Bóje a břeh", Ted);
        zustane.UBojeId = verejna!.Id;
        db.Fotky.Add(zustane);
        await db.SaveChangesAsync();
        await DulezitaAsync(trate, zavod, kdo);

        Assert.Null(await boje.SeberAsync(zavod.Id, verejna.Id, default));

        var sebrana = (await boje.SeznamAsync(zavod.Id, iHistorie: true, default))
            .Single(b => b.Id == verejna.Id);
        Assert.True(sebrana.Sebrana);
        Assert.Single(sebrana.Fotky);
    }

    /// <summary>
    /// Sebraná bóje ve vodě není, takže se nemá co přenastavovat. Dřív
    /// se hlídalo jen nahrazení, takže šla sebraná bóje přenastavením
    /// „oživit" — vznikl by platný záznam navazující na něco, co leží
    /// na břehu (oponentura, 9. 10. 2026).
    /// </summary>
    [Fact]
    public async Task Sebranou_boji_nejde_prenastavit()
    {
        var (db, boje, trate) = SluzbyITrat();
        var (zavod, kdo) = await RegataAsync(db);
        var (postavena, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);
        // Bóje musí po sebrání zůstat, jinak by se neměřila tahle ochrana,
        // ale jen to, že záznam zmizel.
        await DulezitaAsync(trate, zavod, kdo);
        Assert.Null(await boje.SeberAsync(zavod.Id, postavena!.Id, default));

        var (nic, chyba) = await boje.PipniAsync(
            zavod.Id, Bod("Bóje 1", nahrazuje: postavena.Id), kdo.Id, default);

        Assert.Null(nic);
        Assert.Contains("sebraná", chyba);
        // A trať tím nezískala druhý záznam.
        Assert.Empty(await boje.SeznamAsync(zavod.Id, iHistorie: false, default));
    }

    /// <summary>
    /// „Za poslední" znamená za poslední <b>na trati</b>. Dřív se počítalo
    /// přes všechny záznamy včetně sebraných, takže po sebrání poslední
    /// bóje dostala další číslo, které na trati nikomu nepatřilo
    /// (oponentura, 9. 10. 2026).
    /// </summary>
    [Fact]
    public async Task Poradi_za_posledni_pocita_jen_to_co_stoji()
    {
        var (db, boje) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvni, _) = await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        var (druha, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);
        Assert.Equal(2, druha!.Poradi);

        // Druhou sebereme: na trati zůstala jedna, takže další je druhá.
        Assert.Null(await boje.SeberAsync(zavod.Id, druha.Id, default));
        var (treti, _) = await boje.PipniAsync(zavod.Id, Bod("Cíl"), kdo.Id, default);
        Assert.Equal(2, treti!.Poradi);

        // Přenastavení pořadí nemění ani teď — bere ho po staré bóji.
        var (ctvrta, _) = await boje.PipniAsync(
            zavod.Id, Bod("Start", nahrazuje: prvni!.Id), kdo.Id, default);
        Assert.Equal(prvni.Poradi, ctvrta!.Poradi);
    }

    private static OrlickyPohar.Api.Features.Fotky.Fotka Snimek(
        Guid kdo, string popis, DateTimeOffset kdy) => new()
    {
        Id = Guid.NewGuid(),
        Autor = "Miloš Zvonař",
        Popis = popis,
        Sirka = 1600,
        Vyska = 1200,
        NahralId = kdo,
        NahranoV = kdy,
    };
}

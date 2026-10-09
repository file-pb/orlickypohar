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
/// Stavy trati proti reálnému PostgreSQL.
/// <para>
/// Jádro věci: <b>zámek musí něco znamenat</b>. Přijatá trať je veřejná, takže
/// se do ní nesmí dát sáhnout bez toho, aby se o tom venku vědělo — a trať,
/// podle které se jelo, se nepřepisuje vůbec.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class TratSpravaTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 9, 8, 0, 0, TimeSpan.Zero);

    private sealed class ZadneUloziste : OrlickyPohar.Api.Features.Fotky.IUloziste
    {
        public bool Pripraveno => true;
        public string? VerejnaAdresa => "https://foto.example";

        public Task UlozAsync(
            string klic, byte[] data, string typ, CancellationToken ct, string? cache = null) =>
            Task.CompletedTask;

        public Task SmazAsync(string klic, CancellationToken ct) => Task.CompletedTask;
    }

    private (AppDbContext Db, BojeSprava Boje, TratSprava Trat) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var trat = new TratSprava(db, TimeProvider.System);

        return (db, new BojeSprava(
            db, TimeProvider.System, new ZadneUloziste(), trat,
            NullLogger<BojeSprava>.Instance), trat);
    }

    private static async Task<(Zavod Zavod, Uzivatel Kdo)> RegataAsync(AppDbContext db)
    {
        var klic = Guid.NewGuid().ToString("N")[..8];
        var serie = new Serie { Slug = $"trat-{klic}", Nazev = "Traťová série", Rok = 2027 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{klic}",
            Nazev = "Traťová regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);

        var kdo = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = "Rozhodčí",
            Email = $"trat-{klic}@example.test",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();
        return (zavod, kdo);
    }

    private static PipnutiVstup Bod(string nazev) => new(nazev, 0, 49.516, 14.165, 5, null);

    [Fact]
    public async Task Stavba_zacina_prvni_boji()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        // Dokud regata nemá bóji, nemá ani trať — a nemá se co zakládat
        // naprázdno.
        Assert.Null(await trate.StavAsync(zavod.Id, true, true, default));

        Assert.Null((await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default)).Chyba);

        var stav = await trate.StavAsync(zavod.Id, true, true, default);
        Assert.Equal(StavTrati.Rozestaveno, stav!.Stav);
        Assert.False(stav.Odjeta);
    }

    [Fact]
    public async Task Prijata_trat_je_zamcena_pro_pipnuti_i_sebrani()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvni, _) = await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        Assert.Null((await trate.HotovoAsync(zavod.Id, true, default)).Chyba);
        Assert.Null((await trate.PrijmiAsync(zavod.Id, kdo.Id, default)).Chyba);

        // Tohle je ten zámek. Bez něj by byl stav jen nápis.
        Assert.NotNull((await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default)).Chyba);
        Assert.NotNull(await boje.SeberAsync(zavod.Id, prvni!.Id, default));

        // A zapsat se nesmělo nic.
        Assert.Equal(1, await db.Boje.CountAsync(b => b.ZavodId == zavod.Id));
        Assert.Null(await db.Boje.Where(b => b.ZavodId == zavod.Id)
            .Select(b => b.SebranaV).FirstAsync());
    }

    [Fact]
    public async Task Prestavba_neodjete_trate_ji_jen_odemkne()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        var (po, chyba) = await trate.PrestavbaAsync(zavod.Id, true, default);

        Assert.Null(chyba);
        Assert.Equal(StavTrati.Prestavba, po!.Stav);
        // Přijetí se maže, aby `PrijatoV` neukazovalo na stav, který neplatí.
        Assert.Null(po.PrijatoV);
        // Historie se nevyrábí: tahle trať ještě nikomu nesloužila.
        Assert.Equal(1, await db.Trate.CountAsync(t => t.ZavodId == zavod.Id));
        // A stavět se zase smí.
        Assert.Null((await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default)).Chyba);
    }

    [Fact]
    public async Task Podle_odjete_trate_se_jelo_takze_vznikne_nova()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);
        var (prijata, _) = await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        // Rozjížďka odstartovala po přijetí, tedy se podle téhle trati jelo.
        // Nikam se to nezapisuje, dopočítá se ze startu.
        db.Rozjizdky.Add(new Rozjizdka
        {
            ZavodId = zavod.Id,
            Cislo = 1,
            StartV = prijata!.PrijatoV!.Value.AddMinutes(5),
        });
        await db.SaveChangesAsync();

        Assert.True((await trate.StavAsync(zavod.Id, true, true, default))!.Odjeta);

        // Krizová přestavba: vítr odfoukne bójku. Stará trať zůstane přijatá,
        // protože podle ní lodě jely, a navazuje na ni nová.
        var (nova, chyba) = await trate.PrestavbaAsync(zavod.Id, true, default);

        Assert.Null(chyba);
        Assert.Equal(StavTrati.Prestavba, nova!.Stav);
        Assert.NotEqual(prijata.Id, nova.Id);

        var stara = await db.Trate.FirstAsync(t => t.Id == prijata.Id);
        Assert.Equal(StavTrati.Prijato, stara.Stav);
        Assert.NotNull(stara.PrijatoV);

        var zalozena = await db.Trate.FirstAsync(t => t.Id == nova.Id);
        Assert.Equal(prijata.Id, zalozena.NahrazujeId);
    }

    [Fact]
    public async Task Verejne_se_vydava_jen_prijata_trat()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        var (nahrazena, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);
        var (sebrana, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 2"), kdo.Id, default);

        // Rozestavěná trať veřejně neexistuje — ani když bóje ve vodě stojí.
        Assert.Null(await trate.VerejnaAsync(zavod.Id, default));

        // Jedna se přenastaví, jedna sebere. Ani jedna nemá být venku:
        // nahrazená proto, že na jejím místě stojí novější záznam, sebraná
        // proto, že ve vodě není.
        await boje.PipniAsync(
            zavod.Id, new PipnutiVstup("Bóje 1", 0, 49.517, 14.166, 5, nahrazena!.Id), kdo.Id, default);
        Assert.Null(await boje.SeberAsync(zavod.Id, sebrana!.Id, default));

        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        var verejna = await trate.VerejnaAsync(zavod.Id, default);

        Assert.NotNull(verejna);
        Assert.False(verejna!.Prestavba);
        Assert.NotNull(verejna.PrijatoV);
        Assert.Equal(["Start", "Bóje 1"], verejna.Boje.Select(b => b.Nazev).ToArray());

        // Přestavba veřejně znamená „počkej", ne tiché zmizení a ne starý
        // obrázek: příznak ano, bóje ne.
        await trate.PrestavbaAsync(zavod.Id, true, default);

        var behem = await trate.VerejnaAsync(zavod.Id, default);
        Assert.True(behem!.Prestavba);
        Assert.Empty(behem.Boje);
        Assert.Null(behem.PrijatoV);
    }

    [Fact]
    public async Task Vraceni_stavitelum_nese_duvod()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);

        Assert.NotNull((await trate.VratAsync(zavod.Id, "  ", default)).Chyba);

        var (po, chyba) = await trate.VratAsync(zavod.Id, " chybí cílová bóje ", default);

        Assert.Null(chyba);
        Assert.Equal(StavTrati.Rozestaveno, po!.Stav);
        Assert.Equal("chybí cílová bóje", po.DuvodVraceni);

        // Dalším hotovo důvod zmizí — už neplatí.
        Assert.Null((await trate.HotovoAsync(zavod.Id, true, default)).Trat!.DuvodVraceni);
    }
}

using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Okna;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Tracker;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Nastavení zobrazení trackingu a zámek, který na něj věší rozprava.
/// <para>
/// Jádro věci: <b>zpřísnit smí rozhodčí pořád, rozšířit nikdo.</b> Zámek
/// má bránit tomu, aby se pravidla překlopila podle toho, co je na mapě
/// vidět — a zamrznout musí i nastavení, které nikdo nezadal, takže
/// výchozí hodnota musí být bezpečná.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class NastaveniTrackeruTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Rozprava = new(2027, 5, 15, 7, 0, 0, TimeSpan.Zero);

    private (AppDbContext Db, NastaveniSprava Nastaveni, OknaSprava Okna, ZastavenyCas Cas) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cas = new ZastavenyCas(Rozprava);
        var nastaveni = new NastaveniSprava(db, cas);
        return (db, nastaveni, new OknaSprava(db, cas, nastaveni), cas);
    }

    private static async Task<(int ZavodId, Guid Kdo)> RegataAsync(AppDbContext db)
    {
        var znacka = Guid.NewGuid().ToString("N")[..8];
        var serie = new Serie { Slug = $"nastaveni-{znacka}", Nazev = "Série", Rok = 2027 };
        db.Serie.Add(serie);
        var kdo = new Uzivatel { Id = Guid.CreateVersion7(), Zobrazovane = "Rozhodčí" };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();

        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{znacka}",
            Nazev = "Regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);
        await db.SaveChangesAsync();
        return (zavod.Id, kdo.Id);
    }

    [Fact]
    public async Task Vychozi_nastaveni_je_bezpecne()
    {
        var (db, nastaveni, _, _) = Sluzby();
        var (zavod, _) = await RegataAsync(db);

        var n = await nastaveni.NactiAsync(zavod, default);

        // Zamrzne i to, co nikdo nenastavil — výchozí hodnota proto nesmí
        // nikomu nic otevírat.
        Assert.Equal(CoVidiPosadky.JenSebe, n.CoVidiPosadky);
        Assert.False(n.ZivyPrenosVen);
        Assert.False(n.JizdyPoRegateVerejne);
        Assert.False(n.Zamceno);
    }

    [Fact]
    public async Task Rozprava_nastaveni_zamkne()
    {
        var (db, nastaveni, okna, _) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await nastaveni.UlozAsync(
            zavod, new NastaveniVstup(CoVidiPosadky.IOstatni, true, false, null), kdo, default);

        await okna.OtevriAsync(zavod, kdo, null, default);

        var n = await nastaveni.NactiAsync(zavod, default);
        Assert.True(n.Zamceno);
        Assert.Equal(Rozprava, n.ZamcenoV);
        // Co bylo nastavené před rozpravou, platí dál — zámek nic nemění,
        // jen zavírá.
        Assert.Equal(CoVidiPosadky.IOstatni, n.CoVidiPosadky);
    }

    [Fact]
    public async Task Druha_rozprava_zamek_nelomi()
    {
        var (db, nastaveni, okna, cas) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        await okna.OtevriAsync(zavod, kdo, null, default);
        cas.Ted = Rozprava.AddHours(10);
        await okna.UzavriAsync(zavod, kdo, default);

        // Druhý den otevírá nové okno, ale zámek zůstává z prvního dne —
        // jinak by se mezi dny dalo překlopit vidění ostatních podle toho,
        // jak to komu vyšlo.
        cas.Ted = Rozprava.AddDays(1);
        await okna.OtevriAsync(zavod, kdo, null, default);

        var n = await nastaveni.NactiAsync(zavod, default);
        Assert.Equal(Rozprava, n.ZamcenoV);
    }

    [Fact]
    public async Task Po_zamku_jde_zprisnit_s_duvodem()
    {
        var (db, nastaveni, okna, cas) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await nastaveni.UlozAsync(
            zavod, new NastaveniVstup(CoVidiPosadky.IOstatni, true, false, null), kdo, default);
        await okna.OtevriAsync(zavod, kdo, null, default);

        cas.Ted = Rozprava.AddHours(2);
        var (n, chyba) = await nastaveni.UlozAsync(
            zavod,
            new NastaveniVstup(CoVidiPosadky.JenSebe, false, false, "Posádky to řešily za jízdy."),
            kdo, default);

        Assert.Null(chyba);
        Assert.Equal(CoVidiPosadky.JenSebe, n!.CoVidiPosadky);
        Assert.False(n.ZivyPrenosVen);

        // Zásah je doklad: po regatě se musí dát zjistit, proč se to vyplo.
        var zmeny = await nastaveni.ZmenyAsync(zavod, default);
        var posledni = zmeny[^1];
        Assert.True(posledni.PoZamku);
        Assert.Equal("Posádky to řešily za jízdy.", posledni.Duvod);
        Assert.Equal(CoVidiPosadky.IOstatni, posledni.ZPosadky);
    }

    [Fact]
    public async Task Po_zamku_se_rozsirit_neda()
    {
        var (db, nastaveni, okna, cas) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await okna.OtevriAsync(zavod, kdo, null, default);

        cas.Ted = Rozprava.AddHours(1);
        var (sirsi, chyba) = await nastaveni.UlozAsync(
            zavod,
            new NastaveniVstup(CoVidiPosadky.IOstatni, false, false, "Chceme to vidět."),
            kdo, default);

        Assert.Null(sirsi);
        Assert.Equal(NastaveniSprava.ZamceneRozsireni, chyba);

        var (ven, chybaVen) = await nastaveni.UlozAsync(
            zavod, new NastaveniVstup(CoVidiPosadky.JenSebe, true, false, "Zapni přenos."),
            kdo, default);
        Assert.Null(ven);
        Assert.Equal(NastaveniSprava.ZamceneRozsireni, chybaVen);

        Assert.Equal(CoVidiPosadky.JenSebe, (await nastaveni.NactiAsync(zavod, default)).CoVidiPosadky);
    }

    [Fact]
    public async Task Zasah_do_zamceneho_bez_duvodu_neprojde()
    {
        var (db, nastaveni, okna, cas) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await okna.OtevriAsync(zavod, kdo, null, default);

        cas.Ted = Rozprava.AddHours(1);
        var (n, chyba) = await nastaveni.UlozAsync(
            zavod, new NastaveniVstup(CoVidiPosadky.Nic, false, false, null), kdo, default);

        Assert.Null(n);
        Assert.Equal(NastaveniSprava.ChybiDuvod, chyba);
    }

    [Fact]
    public async Task Jizdy_po_regate_jdou_zapnout_i_po_zamku()
    {
        var (db, nastaveni, okna, cas) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await okna.OtevriAsync(zavod, kdo, null, default);

        // Tenhle přepínač se nezamyká: rozhoduje se o něm až po závodě
        // a na jeho průběh nemá vliv.
        cas.Ted = Rozprava.AddHours(12);
        var (n, chyba) = await nastaveni.UlozAsync(
            zavod,
            new NastaveniVstup(CoVidiPosadky.JenSebe, false, true, "Stopy po regatě ven."),
            kdo, default);

        Assert.Null(chyba);
        Assert.True(n!.JizdyPoRegateVerejne);
    }

    [Fact]
    public async Task Stejne_hodnoty_po_zamku_duvod_nepotrebuji()
    {
        var (db, nastaveni, okna, cas) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await okna.OtevriAsync(zavod, kdo, null, default);

        // Uložení beze změny je přeťuknutí formuláře, ne zásah do pravidel.
        cas.Ted = Rozprava.AddMinutes(5);
        var (n, chyba) = await nastaveni.UlozAsync(
            zavod, new NastaveniVstup(CoVidiPosadky.JenSebe, false, false, null), kdo, default);

        Assert.Null(chyba);
        Assert.NotNull(n);
    }
}

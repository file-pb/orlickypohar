using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;
using VysledekVstup = OrlickyPohar.Api.Features.Import.VysledekVstup;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Přeřazení lodi do jiné kategorie ročníku proti reálnému PostgreSQL.
/// <para>
/// Patří sem, a ne mezi čisté testy, kvůli tomu, co se tu doopravdy tvrdí:
/// že se <b>pořadí seriálu přepočítá</b>. To není vlastnost té jedné metody,
/// ale toho, že pořadí je čtený výpočet nad uloženými výsledky — a ověřit se
/// dá jedině tak, že se ročník naimportuje, pořadí se přečte, kategorie se
/// přepíše a pořadí se přečte znovu.
/// </para>
/// <para>
/// <b>Nic se neuklízí</b>, databázi sdílí celá kolekce. Každý test má proto
/// vlastní slug ročníku.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class KategorieLodiTests(PostgresFixture fixture)
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static readonly Guid Spravce = Guid.Parse("00000000-0000-0000-0000-0000000000aa");

    private async Task Nahraj(SerieVstup vstup)
    {
        var klient = fixture.CreateClient();
        klient.DefaultRequestHeaders.Add("X-Import-Token", PostgresFixture.Token);
        var odpoved = await klient.PostAsJsonAsync("/import/serie", vstup, Json);
        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
    }

    /// <summary>
    /// Ročník na tři lodě: dvě v RACE a jedna v Pod7m. Jedna odjetá zastávka
    /// o dvou rozjížďkách, ať má co přesouvat body.
    /// </summary>
    private static SerieVstup Rocnik(string slug) => new(
        Slug: slug,
        Nazev: "Pohár na kategorie",
        Rok: 2026,
        Kategorie: [new("Race", 1), new("Pod7m", 2)],
        Osoby: [new("novak", "Jan", "Novák")],
        Lode:
        [
            new("a", $"Alfa {slug}", null, null, "novak"),
            new("b", $"Beta {slug}", null, null, "novak"),
            new("c", $"Cé {slug}", null, null, "novak"),
        ],
        Prihlasky: [new("a", "Race"), new("b", "Race"), new("c", "Pod7m")],
        Zavody:
        [
            new(
                Slug: "prvni",
                Nazev: "První",
                Datum: new DateOnly(2026, 4, 25),
                Poradi: 1,
                Ucasti: [new("a", null, null), new("b", null, null), new("c", null, null)],
                Rozjizdky:
                [
                    new(1, null, StavRozjizdky.Dokoncena,
                        [new VysledekVstup("a", PoradiVCili: 1),
                         new VysledekVstup("b", PoradiVCili: 2),
                         new VysledekVstup("c", PoradiVCili: 3)]),
                    new(2, null, StavRozjizdky.Dokoncena,
                        [new VysledekVstup("a", PoradiVCili: 1),
                         new VysledekVstup("b", PoradiVCili: 2),
                         new VysledekVstup("c", PoradiVCili: 3)]),
                ]),
        ],
        Publikovano: true);

    private async Task<PoradiSerieDto> NactiPoradi(string slug)
    {
        var poradi = await fixture.CreateClient()
            .GetFromJsonAsync<PoradiSerieDto>($"/serie/{slug}/poradi", Json);
        Assert.NotNull(poradi);
        return poradi;
    }

    private async Task<T> VeScope<T>(Func<AppDbContext, KategorieLodiSprava, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sprava = new KategorieLodiSprava(db, NullLogger<KategorieLodiSprava>.Instance);
        return await co(db, sprava);
    }

    private static async Task<(int SerieId, int LodId, int Kam)> KdeAKamAsync(
        AppDbContext db, string slug, string lod, string kam)
    {
        var serieId = await db.Serie.Where(s => s.Slug == slug).Select(s => s.Id).SingleAsync();
        var lodId = await db.Lode.Where(l => l.Nazev == lod).Select(l => l.Id).SingleAsync();
        var kamId = await db.Kategorie
            .Where(k => k.SerieId == serieId && k.Nazev == kam)
            .Select(k => k.Id).SingleAsync();
        return (serieId, lodId, kamId);
    }

    /// <summary>
    /// To podstatné, a zároveň to, co se snadno čeká obráceně: <b>body se
    /// nepřenášejí, přepočítají se</b>. Body v rozjížďce vznikají uvnitř
    /// kategorie (<c>Bodovani.cs:209</c> seskupuje výsledky podle kategorie),
    /// takže přeřazení jedné lodi změní čísla <b>v obou</b> kategoriích —
    /// i lodím, které se na vodě ničeho nedopustily.
    /// </summary>
    [Fact]
    public async Task Prerazeni_prepocita_body_v_obou_kategoriich()
    {
        const string slug = "kategorie-prerazeni";
        await Nahraj(Rocnik(slug));

        var pred = await NactiPoradi(slug);
        var racePred = pred.Kategorie.Single(k => k.Kategorie == "Race").Lode;
        Assert.Equal(2, racePred.Count);
        Assert.Single(pred.Kategorie.Single(k => k.Kategorie == "Pod7m").Lode);

        // Vítěz zastávky má v seriálu nulu, druhý jedničku. Beta dojela
        // dvakrát za Alfou, takže v RACE nese jeden bod a je druhá.
        var betaPred = racePred.Single(l => l.Lod.StartsWith("Beta"));
        Assert.Equal(1, betaPred.Body);
        Assert.Equal(2, betaPred.Poradi);

        var chyba = await VeScope(async (db, sprava) =>
        {
            var (serieId, lodId, kam) = await KdeAKamAsync(db, slug, $"Beta {slug}", "Pod7m");
            return await sprava.ZmenAsync(serieId, lodId, kam, Spravce, CancellationToken.None);
        });
        Assert.Null(chyba);

        var po = await NactiPoradi(slug);

        // V RACE zbyla Alfa sama, Pod7m má teď dvě lodě.
        var race = po.Kategorie.Single(k => k.Kategorie == "Race").Lode;
        Assert.Single(race);
        Assert.StartsWith("Alfa", race[0].Lod);

        var podSedm = po.Kategorie.Single(k => k.Kategorie == "Pod7m").Lode;
        Assert.Equal(2, podSedm.Count);

        // Beta teď soupeří s Cé, kterou dvakrát předjela, takže je v nové
        // kategorii první a její jeden bod je pryč — nepřenesl se, přepočítal
        // se proti jinému poli.
        var beta = podSedm.Single(l => l.Lod.StartsWith("Beta"));
        Assert.Equal(0, beta.Body);
        Assert.Equal(1, beta.Poradi);

        // A tohle je ta cena, kterou je potřeba znát: Cé nic neudělala a
        // z nuly spadla na jeden bod a druhé místo.
        var ce = podSedm.Single(l => l.Lod.StartsWith("Cé"));
        Assert.Equal(0, pred.Kategorie.Single(k => k.Kategorie == "Pod7m").Lode[0].Body);
        Assert.Equal(1, ce.Body);
        Assert.Equal(2, ce.Poradi);
    }

    /// <summary>
    /// Kategorie patří sérii. Bez téhle kontroly by správce jednoho ročníku
    /// přivěsil loď na kategorii cizího a pořadí by se počítalo v přihrádce,
    /// kterou v jeho ročníku nikdo nevidí.
    /// </summary>
    [Fact]
    public async Task Kategorie_z_jineho_rocniku_neprojde()
    {
        const string slug = "kategorie-cizi";
        const string cizi = "kategorie-cizi-druhy";
        await Nahraj(Rocnik(slug));
        await Nahraj(Rocnik(cizi));

        var (chyba, zustala) = await VeScope(async (db, sprava) =>
        {
            var serieId = await db.Serie.Where(s => s.Slug == slug).Select(s => s.Id).SingleAsync();
            var lodId = await db.Lode.Where(l => l.Nazev == $"Beta {slug}")
                .Select(l => l.Id).SingleAsync();
            var cizijeId = await db.Serie.Where(s => s.Slug == cizi).Select(s => s.Id).SingleAsync();
            var cizikategorie = await db.Kategorie
                .Where(k => k.SerieId == cizijeId && k.Nazev == "Pod7m")
                .Select(k => k.Id).SingleAsync();

            var vysledek = await sprava.ZmenAsync(
                serieId, lodId, cizikategorie, Spravce, CancellationToken.None);

            var jeV = await db.Prihlasky
                .Where(p => p.SerieId == serieId && p.LodId == lodId)
                .Select(p => p.Kategorie!.Nazev)
                .SingleAsync();

            return (vysledek, jeV);
        });

        Assert.Equal("Taková kategorie v ročníku není.", chyba);
        Assert.Equal("Race", zustala);
    }

    /// <summary>Přeřazení tam, kde loď už je, projde a nic nezmění.</summary>
    [Fact]
    public async Task Prerazeni_do_tehoz_projde_a_nic_nezmeni()
    {
        const string slug = "kategorie-tataz";
        await Nahraj(Rocnik(slug));

        var (chyba, zustala) = await VeScope(async (db, sprava) =>
        {
            var (serieId, lodId, kam) = await KdeAKamAsync(db, slug, $"Beta {slug}", "Race");
            var vysledek = await sprava.ZmenAsync(serieId, lodId, kam, Spravce, CancellationToken.None);

            var jeV = await db.Prihlasky
                .Where(p => p.SerieId == serieId && p.LodId == lodId)
                .Select(p => p.Kategorie!.Nazev)
                .SingleAsync();

            return (vysledek, jeV);
        });

        Assert.Null(chyba);
        Assert.Equal("Race", zustala);
    }

    /// <summary>Loď, která v ročníku přihlášená není, přeřadit nejde.</summary>
    [Fact]
    public async Task Lod_mimo_rocnik_prerazit_nejde()
    {
        const string slug = "kategorie-mimo";
        await Nahraj(Rocnik(slug));

        var chyba = await VeScope(async (db, sprava) =>
        {
            var serieId = await db.Serie.Where(s => s.Slug == slug).Select(s => s.Id).SingleAsync();
            var kam = await db.Kategorie
                .Where(k => k.SerieId == serieId && k.Nazev == "Pod7m")
                .Select(k => k.Id).SingleAsync();

            // Číslo lodi, které v ročníku nikdo nepřihlásil.
            var neexistujici = await db.Lode.Select(l => l.Id).MaxAsync() + 1000;
            return await sprava.ZmenAsync(serieId, neexistujici, kam, Spravce, CancellationToken.None);
        });

        Assert.Equal("Loď v ročníku přihlášená není.", chyba);
    }

    /// <summary>Seznam kategorií ročníku jde v pořadí, ve kterém se zobrazují.</summary>
    [Fact]
    public async Task Seznam_kategorii_drzi_poradi_zobrazeni()
    {
        const string slug = "kategorie-seznam";
        await Nahraj(Rocnik(slug));

        var seznam = await VeScope(async (db, sprava) =>
        {
            var serieId = await db.Serie.Where(s => s.Slug == slug).Select(s => s.Id).SingleAsync();
            return await sprava.SeznamAsync(serieId, CancellationToken.None);
        });

        Assert.Equal(["Race", "Pod7m"], seznam.Select(k => k.Nazev));
    }
}

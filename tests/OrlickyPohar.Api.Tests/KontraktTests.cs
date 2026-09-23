using System.Text.Json;
using System.Text.Json.Serialization;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Tvar importního souboru, bez databáze a bez Dockeru. V CI běží první.
/// Soubor s ročníkem píší i lidé ručně — když se rozejde s kontraktem, musí
/// to spadnout tady, ne až při nahrávání dat.
/// <para>
/// Mock má <b>skutečná jména lodí, kategorií i zastávek</b> z tabulek
/// rozhodčího. Není to kosmetika: skutečná data mají diakritiku, dvojité
/// mezery (<c>FAR  STAR III</c>) i zavináč (<c>M@rtina</c>), a právě takové
/// vstupy odhalí chyby, které si na hezkých vymyšlených názvech nikdo
/// nevšimne.
/// </para>
/// </summary>
public class KontraktTests
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static SerieVstup Mock() =>
        JsonSerializer.Deserialize<SerieVstup>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "2026-nanecisto.json")), Json)
        ?? throw new InvalidOperationException("Mock ročník se nepodařilo načíst.");

    [Fact]
    public void Mock_rocnik_odpovida_kontraktu()
    {
        var serie = Mock();

        Assert.Equal(2026, serie.Rok);
        Assert.Equal(3, serie.Kategorie.Count);
        Assert.Equal(9, serie.Zavody.Count);
        Assert.NotEmpty(serie.Prihlasky);

        // Vymyšlená data se nesmějí dostat na veřejné stránky. Až bude čtení
        // respektovat Publikovano, drží tenhle test hranici za nás.
        Assert.False(serie.Publikovano);
        Assert.All(serie.Zavody, z => Assert.False(z.Publikovano));
    }

    [Fact]
    public void Kazdy_odkaz_v_mocku_nekam_vede()
    {
        var serie = Mock();
        var osoby = serie.Osoby.Select(o => o.Klic).ToHashSet();
        var lode = serie.Lode.Select(l => l.Klic).ToHashSet();
        var kategorie = serie.Kategorie.Select(k => k.Nazev).ToHashSet();

        Assert.All(serie.Lode, l => Assert.Contains(l.Majitel, osoby));
        Assert.All(serie.Prihlasky, p =>
        {
            Assert.Contains(p.Lod, lode);
            Assert.Contains(p.Kategorie, kategorie);
        });

        foreach (var z in serie.Zavody)
        {
            var startuji = z.Ucasti.Select(u => u.Lod).ToHashSet();
            Assert.All(z.Ucasti, u => Assert.Contains(u.Lod, lode));
            Assert.All(z.Rozjizdky, r => Assert.All(r.Vysledky, v => Assert.Contains(v.Lod, startuji)));
        }
    }

    [Fact]
    public void Izolepa_pousti_do_serie_jen_jednu_rozjizdku()
    {
        var izolepa = Mock().Zavody.Single(z => z.Slug == "izolepa");

        // Fun závod: část rozjížděk se nejede na vodě a do poháru nesmí.
        Assert.True(izolepa.Rozjizdky.Count > 1);
        Assert.Single(izolepa.Rozjizdky, r => r.DoSerie);
    }

    [Fact]
    public void Kazdy_vysledek_ma_poradi_nebo_kod()
    {
        var serie = Mock();

        // Loď, která nedokončila, není loď bez výsledku — proto kód.
        Assert.All(
            serie.Zavody.SelectMany(z => z.Rozjizdky).SelectMany(r => r.Vysledky),
            v => Assert.True(v.PoradiVCili is not null || v.Kod is not null));
    }

    [Fact]
    public void Skrta_se_az_pri_ctyrech_rozjizdkach()
    {
        // Okruhový závod, který odjel čtyři a víc rozjížděk, škrtá jednu
        // nejhorší; se třemi a méně se neškrtá nic. Mock to jednou porušoval
        // — Radavský pohár měl tři rozjížďky a přitom škrt — a nešlo to
        // poznat jinak než přepočítáním tabulky. Ruční listina z 29. 8. 2026
        // pak ukázala, že rozjížďky byly čtyři; rozhodčí to potvrdil
        // 23. 9. 2026, takže škrt v sešitu byl správně a chyběla rozjížďka.
        //
        // V API se to schválně nevynucuje: počet rozjížděk se rozhoduje na
        // vodě, takže hodnota vzniká až po závodě a rozhodčí ji smí přepsat.
        // Pravidlo tedy hlídá zdroj dat, ne kód, který je přijímá.
        foreach (var z in Mock().Zavody)
        {
            var ocekavane = z.Typ == "okruhový" && z.Rozjizdky.Count >= 4 ? 1 : 0;
            Assert.Equal(ocekavane, z.PocetSkrtu);
        }
    }

    [Fact]
    public void Neznama_pole_neshodi_deserializaci()
    {
        // Soubor nese "_poznamka", kterou server nezná. Kdyby na neznámém poli
        // padal, znamenalo by to, že se rozšíření formátu nedá zavést postupně.
        var s = JsonSerializer.Deserialize<SerieVstup>(
            """
            {"slug":"x","nazev":"X","rok":2025,"_poznamka":"neznamé pole",
             "kategorie":[{"nazev":"Race","poradi":1}],
             "osoby":[],"lode":[],"prihlasky":[],"zavody":[]}
            """, Json);

        Assert.NotNull(s);
    }

    [Fact]
    public void Clanky_v_mocku_odkazuji_na_existujici_zastavky()
    {
        var serie = Mock();
        var zavody = serie.Zavody.Select(z => z.Slug).ToHashSet();

        Assert.NotNull(serie.Clanky);
        Assert.NotEmpty(serie.Clanky);

        // Článek zastávky musí zastávku najít. Překlep ve slugu by jinak
        // vyrobil novinku, kterou nikdo neuvidí — visela by u závodu, který
        // v ročníku není.
        Assert.All(serie.Clanky, c =>
        {
            Assert.False(string.IsNullOrWhiteSpace(c.Slug));
            Assert.False(string.IsNullOrWhiteSpace(c.Titulek));
            Assert.False(string.IsNullOrWhiteSpace(c.Telo));
            if (c.Zavod is not null) Assert.Contains(c.Zavod, zavody);
        });

        // Blog má obě úrovně: pozvánky a zprávy píše pořadatel zastávky,
        // souhrny organizátor poháru. Kdyby mock uměl jen jednu, nešlo by
        // na webu vidět, jak vypadá výpis s obojím.
        Assert.Contains(serie.Clanky, c => c.Zavod is not null);
        Assert.Contains(serie.Clanky, c => c.Zavod is null);
    }

    [Fact]
    public void Rocnik_bez_clanku_je_platny_vstup()
    {
        // Ročníky nahrané před fází 6 blog nemají a jejich soubory se kvůli
        // tomu nepřepisují. Chybějící seznam proto znamená „žádné články".
        var s = JsonSerializer.Deserialize<SerieVstup>(
            """
            {"slug":"x","nazev":"X","rok":2025,
             "kategorie":[{"nazev":"Race","poradi":1}],
             "osoby":[],"lode":[],"prihlasky":[],"zavody":[]}
            """, Json);

        Assert.NotNull(s);
        Assert.Null(s.Clanky);
    }

    private static SerieVstup Kalendar2027() =>
        JsonSerializer.Deserialize<SerieVstup>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "2027-kalendar.json")), Json)
        ?? throw new InvalidOperationException("Kalendář 2027 se nepodařilo načíst.");

    [Fact]
    public void Kalendar_2027_je_platny_importni_vstup()
    {
        var serie = Kalendar2027();

        // Termínová listina od rozhodčího, doručená 23. 9. 2026. Jsou to
        // skutečná data, takže na rozdíl od mocku je ročník publikovaný —
        // kalendář má být vidět dřív, než sezóna začne.
        Assert.Equal(2027, serie.Rok);
        Assert.Equal(3, serie.Kategorie.Count);
        Assert.Equal(9, serie.Zavody.Count);
        Assert.True(serie.Publikovano);

        // Devět zastávek znamená dva škrty (rozhodčí, 22. 9. 2026).
        Assert.Equal(2, serie.PocetSkrtu);
    }

    [Fact]
    public void Kalendar_2027_nema_nic_krome_terminu()
    {
        var serie = Kalendar2027();

        // Lodě se do ročníku přihlásí až se sezónou a rozjížďky vzniknou na
        // vodě. Kdyby se sem cokoliv z toho doplnilo dřív, bylo by to
        // vymyšlené — a tenhle soubor je tu právě proto, že vymyšlený není.
        Assert.Empty(serie.Osoby);
        Assert.Empty(serie.Lode);
        Assert.Empty(serie.Prihlasky);
        Assert.All(serie.Zavody, z =>
        {
            Assert.Equal(StavZavodu.Planovany, z.Stav);
            Assert.Empty(z.Ucasti);
            Assert.Empty(z.Rozjizdky);

            // Škrt se dopočítá z odjetých rozjížděk, takže u plánované
            // zastávky nemá být z čeho.
            Assert.Equal(0, z.PocetSkrtu);
        });
    }

    [Fact]
    public void Kalendar_2027_je_serazeny_a_v_jedne_sezone()
    {
        var zavody = Kalendar2027().Zavody;

        // Pořadí je zápis kalendáře, ne samostatný údaj: musí jít s daty.
        Assert.Equal(Enumerable.Range(1, zavody.Count), zavody.Select(z => z.Poradi));
        Assert.Equal(zavody.OrderBy(z => z.Datum).Select(z => z.Slug), zavody.Select(z => z.Slug));
        Assert.All(zavody, z => Assert.Equal(2027, z.Datum.Year));

        // Dvoudenní zastávka končí po svém začátku, jednodenní konec nemá.
        Assert.All(zavody, z => Assert.True(z.DatumKonce is null || z.DatumKonce > z.Datum));
    }
}

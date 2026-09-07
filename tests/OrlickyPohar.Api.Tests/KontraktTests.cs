using System.Text.Json;
using System.Text.Json.Serialization;
using OrlickyPohar.Api.Features.Import;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Tvar importního souboru, bez databáze a bez Dockeru. V CI běží první.
/// Soubor s ročníkem píší i lidé ručně — když se rozejde s kontraktem, musí
/// to spadnout tady, ne až při nahrávání dat.
/// </summary>
public class KontraktTests
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private static SerieVstup Mock() =>
        JsonSerializer.Deserialize<SerieVstup>(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "2025-mock.json")), Json)
        ?? throw new InvalidOperationException("Mock ročník se nepodařilo načíst.");

    [Fact]
    public void Mock_rocnik_odpovida_kontraktu()
    {
        var serie = Mock();

        Assert.Equal(2025, serie.Rok);
        Assert.Equal(3, serie.Kategorie.Count);
        Assert.Equal(10, serie.Zavody.Count);
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
    public void Kazdy_vysledek_ma_poradi_nebo_kod()
    {
        var serie = Mock();

        // Loď, která nedokončila, není loď bez výsledku — proto kód.
        Assert.All(
            serie.Zavody.SelectMany(z => z.Rozjizdky).SelectMany(r => r.Vysledky),
            v => Assert.True(v.PoradiVCili is not null || v.Kod is not null));
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
}

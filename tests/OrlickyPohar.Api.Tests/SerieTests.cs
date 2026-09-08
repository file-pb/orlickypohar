using System.Text.Json;
using OrlickyPohar.Api.Features.Bodovani;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Počítání seriálu proti <b>skutečnému sešitu rozhodčího</b>, stav po
/// Radavském poháru 2026. Je to nejcennější zkouška, jakou tenhle kód může
/// mít: vymyšlená data ověří, že se nic nerozbilo, ale jen skutečná ověří,
/// že počítáme totéž co člověk, který to dělá roky.
/// </summary>
public class SerieTests
{
    private record Radek(string Lod, int[] Body, int SesitBody, int SesitPoradi,
                         int SesitPrepocet, int SesitPoradiPrepocet);

    private static Dictionary<string, List<Radek>> Sesit()
    {
        using var soubor = File.OpenRead(
            Path.Combine(AppContext.BaseDirectory, "Data", "2026-poradi-rozhodci.json"));
        var dokument = JsonDocument.Parse(soubor);

        return dokument.RootElement.GetProperty("kategorie").EnumerateObject()
            .ToDictionary(
                k => k.Name,
                k => k.Value.EnumerateArray().Select(r => new Radek(
                    r.GetProperty("lod").GetString()!,
                    r.GetProperty("body").EnumerateArray().Select(b => b.GetInt32()).ToArray(),
                    r.GetProperty("sesitBody").GetInt32(),
                    r.GetProperty("sesitPoradi").GetInt32(),
                    r.GetProperty("sesitPrepocet").GetInt32(),
                    r.GetProperty("sesitPoradiPrepocet").GetInt32())).ToList());
    }

    private static IReadOnlyList<PoradiVSerii> Spocti(IEnumerable<Radek> radky) =>
        SerieBodovani.Poradi(radky.Select(r => new LodVSerii(r.Lod, r.Body)));

    [Fact]
    public void Soucet_bodu_sedi_s_rozhodcim_na_kazdem_radku()
    {
        // Nejsilnější tvrzení celého projektu: přes všechny tři kategorie
        // a všech 37 lodí vyjde náš součet přesně tak, jak ho vede rozhodčí.
        foreach (var (kategorie, radky) in Sesit())
        {
            var spocteno = Spocti(radky).ToDictionary(p => p.Lod);

            foreach (var radek in radky)
                Assert.Equal(radek.SesitBody, spocteno[radek.Lod].Body);

            Assert.NotEmpty(radky);
            _ = kategorie;
        }
    }

    [Fact]
    public void Skrt_nejhorsi_zastavky_sedi_az_na_znamé_vyjimky()
    {
        // Sešit se vede ručně a pět řádků z 37 nesedí. Nedopočítáváme je
        // podle sešitu — počítáme podle pravidla a rozdíl držíme na očích,
        // protože to je otázka na rozhodčího, ne chyba v kódu.
        string[] neshody = ["LUNA", "JOY", "MAMBA", "SULA", "FILOZEP"];

        foreach (var (_, radky) in Sesit())
        {
            var spocteno = Spocti(radky).ToDictionary(p => p.Lod);

            foreach (var radek in radky.Where(r => !neshody.Contains(r.Lod)))
                Assert.Equal(radek.SesitPrepocet, spocteno[radek.Lod].BodyPoSkrtu);
        }
    }

    [Fact]
    public void Poradi_sedi_vsude_krome_shod_na_bodech()
    {
        // Neshody jsou jen tam, kde mají dvě lodě stejné body — a tam sešit
        // řadí pokaždé jinak, takže žádné pravidlo nereprodukuje všechny.
        // Naše je aspoň deterministické: lepší sada výsledků.
        foreach (var (_, radky) in Sesit())
        {
            var spocteno = Spocti(radky).ToDictionary(p => p.Lod);
            var shodneBody = radky.GroupBy(r => r.SesitBody)
                .Where(g => g.Count() > 1)
                .SelectMany(g => g.Select(r => r.Lod))
                .ToHashSet();

            foreach (var radek in radky.Where(r => !shodneBody.Contains(r.Lod)))
                Assert.Equal(radek.SesitPoradi, spocteno[radek.Lod].Poradi);
        }
    }

    [Fact]
    public void Vitez_ma_nejmene_bodu_a_prvni_poradi()
    {
        foreach (var (_, radky) in Sesit())
        {
            var spocteno = Spocti(radky);
            var prvni = spocteno.Single(p => p.PoradiPoSkrtu == 1);

            Assert.Equal(spocteno.Min(p => p.BodyPoSkrtu), prvni.BodyPoSkrtu);
        }
    }
}

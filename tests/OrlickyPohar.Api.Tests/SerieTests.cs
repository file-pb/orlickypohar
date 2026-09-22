using System.Text.Json;
using OrlickyPohar.Api.Features.Bodovani;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Počítání seriálu proti <b>skutečnému sešitu rozhodčího</b>, stav po
/// Poháru Slunce 2026 (sešit doručený 22. 9. 2026). Je to nejcennější
/// zkouška, jakou tenhle kód může mít: vymyšlená data ověří, že se nic
/// nerozbilo, ale jen skutečná ověří, že počítáme totéž co člověk, který
/// to dělá roky.
/// <para>
/// Pravidla jsou z podkladů rozhodčího: dva škrty, rozstřel počtem
/// lepších umístění a pak poslední společně dokončenou regatou. Sešit se
/// vede ručně, takže pár řádků nesedí — ty jsou níž vyjmenované jménem
/// a každý má důvod.
/// </para>
/// </summary>
public class SerieTests
{
    private record Radek(string Lod, BodyZeZastavky[] Zastavky, int SesitBody, int SesitPoradi,
                         int SesitPrepocet, int SesitPoradiPrepocet);

    private static (int PocetSkrtu, Dictionary<string, List<Radek>> Kategorie) Sesit()
    {
        using var soubor = File.OpenRead(
            Path.Combine(AppContext.BaseDirectory, "Data", "2026-poradi-rozhodci.json"));
        var koren = JsonDocument.Parse(soubor).RootElement;

        static int? Cislo(JsonElement e, string jmeno) =>
            e.TryGetProperty(jmeno, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : null;

        var kategorie = koren.GetProperty("kategorie").EnumerateObject()
            .ToDictionary(
                k => k.Name,
                k => k.Value.EnumerateArray().Select(r => new Radek(
                    r.GetProperty("lod").GetString()!,
                    // Prázdná buňka by v Excelu byla nula. Jediná (JOY) je
                    // v datech doplněná podle rozhodčího, takže tu nenastane.
                    [.. r.GetProperty("zastavky").EnumerateArray().Select(z => new BodyZeZastavky(
                        Cislo(z, "body") ?? 0,
                        Cislo(z, "misto"),
                        z.TryGetProperty("kod", out var kod) ? kod.GetString() : null))],
                    r.GetProperty("sesitBody").GetInt32(),
                    r.GetProperty("sesitPoradi").GetInt32(),
                    r.GetProperty("sesitPrepocet").GetInt32(),
                    r.GetProperty("sesitPoradiPrepocet").GetInt32())).ToList());

        return (koren.GetProperty("pocetSkrtu").GetInt32(), kategorie);
    }

    private static Dictionary<string, PoradiVSerii> Spocti(IEnumerable<Radek> radky, int pocetSkrtu) =>
        SerieBodovani.Poradi(radky.Select(r => new LodVSerii(r.Lod, r.Zastavky)), pocetSkrtu)
            .ToDictionary(p => p.Lod);

    /// <summary>
    /// Řádky, kde se sešit od pravidla odchyluje. Nedopočítáváme je podle
    /// sešitu — počítáme podle pravidla a rozdíl držíme na očích. LUNA
    /// a DEPRESSO rozhodčí 22. 9. 2026 potvrdil jako chybu sešitu.
    /// <list type="bullet">
    /// <item>LUNA: po dvou škrtech (1 a 0) vychází −1, sešit má 0.</item>
    /// <item>DEPRESSO: 23 − 8 − 5 = 10, sešit 13.</item>
    /// <item>MICHELLE: 51 − 11 − 8 = 32, sešit 36.</item>
    /// </list>
    /// </summary>
    private static readonly string[] SkrtNesedi = ["LUNA", "DEPRESSO", "MICHELLE"];

    /// <summary>
    /// Pořadí po škrtu, které nesedí:
    /// <list type="bullet">
    /// <item>CASSIOPEIA a SPRUNZEL se posunou, protože je MICHELLE s 32 body
    /// předběhne.</item>
    /// <item>JOY a Charlotte III mají po škrtech obě 7. Charlotte má jedno
    /// první místo (Radavský pohár), JOY žádné, takže podle pravidla „počet
    /// 1. míst" vede Charlotte; sešit má před ní JOY. Rozhodčí: „asi moje
    /// chyba".</item>
    /// </list>
    /// </summary>
    private static readonly string[] PoradiNesedi =
        [.. SkrtNesedi, "CASSIOPEIA", "SPRUNZEL", "JOY", "Charlotte III"];

    [Fact]
    public void Soucet_bodu_sedi_s_rozhodcim_na_kazdem_radku()
    {
        // Přes všechny tři kategorie a všech 37 lodí vyjde náš součet
        // přesně tak, jak ho vede rozhodčí.
        var (skrty, kategorie) = Sesit();

        foreach (var (_, radky) in kategorie)
        {
            var spocteno = Spocti(radky, skrty);

            Assert.NotEmpty(radky);
            foreach (var radek in radky)
                Assert.Equal(radek.SesitBody, spocteno[radek.Lod].Body);
        }
    }

    [Fact]
    public void Dva_skrty_sedi_az_na_zname_vyjimky()
    {
        var (skrty, kategorie) = Sesit();
        Assert.Equal(2, skrty);

        var porovnano = 0;
        foreach (var (_, radky) in kategorie)
        {
            var spocteno = Spocti(radky, skrty);

            foreach (var radek in radky.Where(r => !SkrtNesedi.Contains(r.Lod)))
            {
                Assert.Equal(radek.SesitPrepocet, spocteno[radek.Lod].BodyPoSkrtu);
                porovnano++;
            }
        }

        // Pojistka, aby seznam výjimek nerostl potichu.
        Assert.Equal(34, porovnano);
    }

    [Fact]
    public void Poradi_po_skrtu_vcetne_shod_sedi_az_na_zname_vyjimky()
    {
        // Rozstřel podle pravidel seriálu reprodukuje shody v sešitu — PEZI
        // před MAMBOU, M1 před THEOU a Riem a další; výjimky jsou výš.
        var (skrty, kategorie) = Sesit();

        foreach (var (_, radky) in kategorie)
        {
            var spocteno = Spocti(radky, skrty);

            foreach (var radek in radky.Where(r => !PoradiNesedi.Contains(r.Lod)))
                Assert.Equal(radek.SesitPoradiPrepocet, spocteno[radek.Lod].PoradiPoSkrtu);
        }
    }

    [Fact]
    public void Pezi_vede_pred_mambou_podle_umisteni_ne_podle_bodu()
    {
        // Obě mají po škrtech jeden bod. MAMBA má −1 ze 24hodinovky, takže
        // podle bodů by vedla; podle umístění je to první místo stejně jako
        // nula jinde a rozhodne až Pohár Slunce, kde byla PEZI první.
        var (skrty, kategorie) = Sesit();
        var spocteno = Spocti(kategorie["Nad7m"], skrty);

        Assert.Equal(1, spocteno["PEZI"].BodyPoSkrtu);
        Assert.Equal(1, spocteno["MAMBA"].BodyPoSkrtu);
        Assert.Equal(1, spocteno["PEZI"].PoradiPoSkrtu);
        Assert.Equal(2, spocteno["MAMBA"].PoradiPoSkrtu);
    }

    [Fact]
    public void Dvacitka_za_diskvalifikaci_se_da_skrtnout()
    {
        var (skrty, kategorie) = Sesit();

        var cervene = Spocti(kategorie["Race"], skrty)["ČERVENÉ CAFE"];
        var sprunzel = Spocti(kategorie["Nad7m"], skrty)["SPRUNZEL"];

        Assert.Equal(11, cervene.BodyPoSkrtu);   // 35 − 20 − 4
        Assert.Equal(34, sprunzel.BodyPoSkrtu);  // 66 − 20 − 12
    }

    [Fact]
    public void Vitez_ma_nejmene_bodu_a_prvni_poradi()
    {
        var (skrty, kategorie) = Sesit();

        foreach (var (_, radky) in kategorie)
        {
            var spocteno = Spocti(radky, skrty).Values;
            var prvni = spocteno.Single(p => p.PoradiPoSkrtu == 1);

            Assert.Equal(spocteno.Min(p => p.BodyPoSkrtu), prvni.BodyPoSkrtu);
        }
    }
}

using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Našeptávač lodí pro přihlášku. Čisté funkce, bez databáze.
/// </summary>
public class NapovedaTests
{
    private static NapovedaLodiDto Lod(
        string nazev, string? plachta = null, bool vRocniku = false, int? rok = 2026) =>
        new(nazev, plachta, "Pirát", "Race", null, vRocniku, rok);

    private static readonly NapovedaLodiDto[] Lode =
    [
        Lod("ANIČKA", "CZE 430"),
        Lod("Anička II", "CZE 431", vRocniku: true),
        Lod("Bóra", "CZE 12"),
        Lod("Modré Cafe", "CZE 836"),
        Lod("Červené Cafe", "CZE 125", vRocniku: true),
    ];

    [Theory]
    [InlineData("anicka")]
    [InlineData("ANIČKA")]
    [InlineData("aNiČ")]
    [InlineData("  anič  ")]
    public void Diakritika_ani_velikost_pismen_nevadi(string dotaz)
    {
        // Kdo přihlašuje loď z telefonu, háčky psát nebude.
        Assert.Equal(2, Napoveda.Najdi(dotaz, Lode).Count);
    }

    [Fact]
    public void Kratky_dotaz_nenapovida()
    {
        // Jedno písmeno vrátí půlku startovní listiny a nikomu nepomůže.
        Assert.Empty(Napoveda.Najdi("a", Lode));
        Assert.Empty(Napoveda.Najdi(null, Lode));
    }

    [Fact]
    public void Jmeno_od_zacatku_predchazi_jmenu_uvnitr_i_plachte()
    {
        var nalez = Napoveda.Najdi("cafe", Lode);

        // Obě mají „cafe" uvnitř, ani jedna na začátku — rozhoduje ročník.
        Assert.Equal(["Červené Cafe", "Modré Cafe"], nalez.Select(l => l.Lod));
    }

    [Fact]
    public void Najde_i_podle_cisla_plachty_a_az_za_jmeny()
    {
        var nalez = Napoveda.Najdi("43", [.. Lode, Lod("Kachna", "CZE 43")]);

        Assert.Equal(["Anička II", "ANIČKA", "Kachna"], nalez.Select(l => l.Lod));
    }

    [Fact]
    public void Lod_z_rocniku_ma_prednost_pred_lodi_z_minulych_let()
    {
        var nalez = Napoveda.Najdi("anic", Lode);

        Assert.Equal("Anička II", nalez[0].Lod);
        Assert.True(nalez[0].VRocniku);
    }

    [Fact]
    public void Nabidka_je_kratka()
    {
        var hodne = Enumerable.Range(1, 30).Select(i => Lod($"Racek {i}")).ToList();

        Assert.Equal(Napoveda.NejvicVysledku, Napoveda.Najdi("racek", hodne).Count);
    }

    [Fact]
    public void Napoveda_nenese_kontakt_ani_majitele()
    {
        // Pojistka na tvar: našeptávač je veřejný a kontakt se z něj
        // nesmí dát vylovit napsáním názvu lodi. Majitel k zákazu přibyl
        // 9. 10. 2026 — veřejně je kormidelník, majitel jen pod /sprava/.
        var pole = typeof(NapovedaLodiDto).GetProperties().Select(p => p.Name);

        Assert.DoesNotContain(pole, p => p.Contains("mail", StringComparison.OrdinalIgnoreCase)
                                         || p.Contains("telefon", StringComparison.OrdinalIgnoreCase)
                                         || p.Contains("kontakt", StringComparison.OrdinalIgnoreCase)
                                         || p.Contains("majitel", StringComparison.OrdinalIgnoreCase));
    }
}

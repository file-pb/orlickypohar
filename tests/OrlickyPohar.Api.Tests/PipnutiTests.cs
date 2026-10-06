using OrlickyPohar.Api.Features.Boje;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla pípnutí bóje. Čisté funkce — tohle musí platit dřív, než se
/// cokoliv uloží, protože špatná poloha posune celou trať.
/// </summary>
public class PipnutiTests
{
    private static PipnutiVstup Bod(
        double sirka = 49.516, double delka = 14.165, double? presnost = 6, string? nazev = "Bóje 1") =>
        new(nazev, 1, sirka, delka, presnost, null);

    [Fact]
    public void Dobre_pipnuti_projde()
    {
        Assert.Null(Pipnuti.ProcNejde(Bod()));
        // Bez hlášené přesnosti taky: některé telefony ji nedávají.
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: null)));
    }

    [Fact]
    public void Nepresna_poloha_se_odmitne()
    {
        // Sto metrů znamená polohu ze sítě, ne z družic.
        Assert.NotNull(Pipnuti.ProcNejde(Bod(presnost: Pipnuti.NejhorsiPresnostM + 1)));
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: Pipnuti.NejhorsiPresnostM)));
    }

    [Fact]
    public void Poloha_mimo_Orlik_se_odmitne()
    {
        // Nejčastější překlep je prohozená šířka a délka — ta by bóji
        // postavila někam do Afriky a nikdo by si toho nevšiml.
        Assert.NotNull(Pipnuti.ProcNejde(Bod(sirka: 14.165, delka: 49.516)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(sirka: 50.1)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(delka: 16.8)));
    }

    [Fact]
    public void Bez_jmena_to_nejde()
    {
        Assert.NotNull(Pipnuti.ProcNejde(Bod(nazev: null)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(nazev: "   ")));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(nazev: new string('a', Pipnuti.NazevNejvic + 1))));
    }
}

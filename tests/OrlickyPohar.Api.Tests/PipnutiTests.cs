using OrlickyPohar.Api.Features.Boje;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla pípnutí bóje. Čisté funkce — tohle musí platit dřív, než se
/// cokoliv uloží, protože špatná poloha posune celou trať.
/// </summary>
public class PipnutiTests
{
    private static PipnutiVstup Bod(
        double sirka = 49.516, double delka = 14.165, double? presnost = 6, string? nazev = "Bóje 1",
        ZdrojPolohy? zdroj = null) =>
        new(nazev, 1, sirka, delka, presnost, null, zdroj);

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
    public void Poloha_z_mapy_jde_jen_bez_presnosti()
    {
        // Mapa nic neměří. Číslo u ní by bylo vymyšlené, a přesně kvůli
        // tomu se zdroj zavedl — dřív se „telefon přesnost nehlásí"
        // a „opsáno z mapy" slily do jednoho prázdného pole.
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: null, zdroj: ZdrojPolohy.Mapa)));
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: null, zdroj: ZdrojPolohy.Qr)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: ZdrojPolohy.Mapa)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: ZdrojPolohy.Qr)));
    }

    [Fact]
    public void Chybejici_zdroj_je_telefon()
    {
        // Klient, který o poli neví, posílá dál pravdu: jinudy než
        // pípnutím to dřív nešlo. Proto smí hlásit přesnost.
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: null)));
        Assert.Equal(
            Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: null)),
            Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: ZdrojPolohy.Telefon)));
    }

    [Fact]
    public void Mimo_Orlik_radi_mape_jinak_nez_telefonu()
    {
        // Telefon bez družic a prohozená šířka s délkou v odkazu jsou dvě
        // různé příčiny, takže věta nesmí být jedna pro obojí.
        var zTelefonu = Pipnuti.ProcNejde(Bod(sirka: 14.165, delka: 49.516));
        var zMapy = Pipnuti.ProcNejde(Bod(sirka: 14.165, delka: 49.516, presnost: null, zdroj: ZdrojPolohy.Mapa));

        Assert.NotNull(zTelefonu);
        Assert.NotNull(zMapy);
        Assert.NotEqual(zTelefonu, zMapy);
        Assert.Contains("družic", zTelefonu);
        Assert.Contains("prohodila", zMapy);
    }

    [Fact]
    public void Bez_jmena_to_nejde()
    {
        Assert.NotNull(Pipnuti.ProcNejde(Bod(nazev: null)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(nazev: "   ")));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(nazev: new string('a', Pipnuti.NazevNejvic + 1))));
    }
}

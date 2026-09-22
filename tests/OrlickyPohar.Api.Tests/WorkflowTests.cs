using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Workflow výsledků. Čisté funkce, bez databáze — plán to říká rovnou:
/// přechody hlídá jedna funkce s testy, ne rozeseté podmínky po endpointech.
/// </summary>
public class WorkflowTests
{
    private const bool Kdokoliv = false;
    private const bool Spravce = true;

    [Theory]
    [InlineData(StavVysledku.Navrzeno, StavVysledku.Overeno)]
    [InlineData(StavVysledku.Overeno, StavVysledku.Schvaleno)]
    [InlineData(StavVysledku.Schvaleno, StavVysledku.Potvrzeno)]
    public void Radou_se_jde_po_jednom_kroku(StavVysledku ze, StavVysledku na)
    {
        Assert.Null(Workflow.ProcNejde(ze, na, Kdokoliv));
    }

    [Theory]
    [InlineData(StavVysledku.Navrzeno, StavVysledku.Schvaleno)]
    [InlineData(StavVysledku.Navrzeno, StavVysledku.Potvrzeno)]
    [InlineData(StavVysledku.Overeno, StavVysledku.Potvrzeno)]
    public void Preskocit_smi_jen_spravce(StavVysledku ze, StavVysledku na)
    {
        // Každý stupeň je něčí podpis — proto se běžně neskáče. Správce ve
        // svém rozsahu smí všechno, včetně „tenhle závod jsem si prošel sám".
        Assert.NotNull(Workflow.ProcNejde(ze, na, Kdokoliv));
        Assert.Null(Workflow.ProcNejde(ze, na, Spravce));
    }

    [Theory]
    [InlineData(StavVysledku.Overeno, StavVysledku.Navrzeno)]
    [InlineData(StavVysledku.Potvrzeno, StavVysledku.Schvaleno)]
    public void Zpatky_se_couvat_neda_ani_spravci(StavVysledku ze, StavVysledku na)
    {
        // Vrácení má důvod a ten je k ničemu, když se dá obejít couvnutím
        // o stupeň. I správce tedy vrací k revizi.
        var chyba = Workflow.ProcNejde(ze, na, Spravce);

        Assert.NotNull(chyba);
        Assert.Contains("revizi", chyba);
    }

    [Theory]
    [InlineData(StavVysledku.Overeno)]
    [InlineData(StavVysledku.Schvaleno)]
    [InlineData(StavVysledku.Potvrzeno)]
    public void K_revizi_jde_vratit_cokoliv_zkontrolovaneho(StavVysledku ze)
    {
        Assert.Null(Workflow.ProcNejde(ze, StavVysledku.KRevizi, Kdokoliv));
    }

    [Fact]
    public void Navrh_se_nema_k_cemu_vracet()
    {
        Assert.NotNull(Workflow.ProcNejde(StavVysledku.Navrzeno, StavVysledku.KRevizi, Spravce));
    }

    [Fact]
    public void Vraceni_k_revizi_chce_duvod()
    {
        Assert.NotNull(Workflow.ProcNejdeBezDuvodu(StavVysledku.KRevizi, null));
        Assert.NotNull(Workflow.ProcNejdeBezDuvodu(StavVysledku.KRevizi, "   "));
        Assert.Null(Workflow.ProcNejdeBezDuvodu(StavVysledku.KRevizi, "U Aničky sedí čas, ne pořadí."));

        // Jinde by to bylo formulářové pole navíc u úkonu na jedno kliknutí.
        Assert.Null(Workflow.ProcNejdeBezDuvodu(StavVysledku.Overeno, null));
    }

    [Theory]
    [InlineData(StavVysledku.KRevizi)]
    [InlineData(StavVysledku.Eliminovano)]
    public void Zpatky_do_hry_se_vraci_jako_navrh(StavVysledku ze)
    {
        Assert.Null(Workflow.ProcNejde(ze, StavVysledku.Navrzeno, Kdokoliv));

        // Opravený zápis musí projít ověřením znovu, jinak je revize
        // jen zdržení.
        Assert.NotNull(Workflow.ProcNejde(ze, StavVysledku.Overeno, Spravce));
        Assert.NotNull(Workflow.ProcNejde(ze, StavVysledku.Potvrzeno, Spravce));
    }

    [Fact]
    public void Eliminovat_jde_odkudkoliv()
    {
        // Neplatná rozjížďka se pozná i po potvrzení.
        foreach (var ze in Enum.GetValues<StavVysledku>())
            Assert.Null(Workflow.ProcNejde(ze, StavVysledku.Eliminovano, Kdokoliv));
    }

    [Fact]
    public void Nabidka_stavu_sedi_s_tim_co_zapis_pusti()
    {
        foreach (var spravce in new[] { Kdokoliv, Spravce })
            foreach (var ze in Enum.GetValues<StavVysledku>())
            {
                var nabidka = Workflow.MozneZ(ze, spravce).ToList();

                Assert.All(nabidka, na => Assert.Null(Workflow.ProcNejde(ze, na, spravce)));
                Assert.All(
                    Enum.GetValues<StavVysledku>().Where(na => na != ze && !nabidka.Contains(na)),
                    na => Assert.NotNull(Workflow.ProcNejde(ze, na, spravce)));
            }
    }

    [Theory]
    [InlineData(StavVysledku.Navrzeno, Role.Organizator)]
    [InlineData(StavVysledku.Overeno, Role.Rozhodci)]
    [InlineData(StavVysledku.Schvaleno, Role.Rozhodci)]
    [InlineData(StavVysledku.KRevizi, Role.Rozhodci)]
    [InlineData(StavVysledku.Potvrzeno, Role.Spravce)]
    [InlineData(StavVysledku.Eliminovano, Role.Spravce)]
    public void Zapisuje_poradatel_schvaluje_rozhodci_potvrzuje_spravce(StavVysledku na, Role kdo)
    {
        Assert.Equal(kdo, Workflow.KdoSmi(na));
    }

    [Theory]
    [InlineData(StavVysledku.Navrzeno, Role.Organizator)]
    [InlineData(StavVysledku.KRevizi, Role.Organizator)]
    [InlineData(StavVysledku.Overeno, Role.Rozhodci)]
    [InlineData(StavVysledku.Schvaleno, Role.Rozhodci)]
    [InlineData(StavVysledku.Potvrzeno, Role.Rozhodci)]
    [InlineData(StavVysledku.Eliminovano, Role.Rozhodci)]
    public void Do_poharu_zaradi_poradatel_dokud_jsou_cisla_rozepsana(StavVysledku stav, Role kdo)
    {
        // Na vodě se podle podmínek pozná, jestli se rozjížďka počítá —
        // a zakládá ji pořadatel. U podepsaných čísel je to zásah do poháru
        // a patří rozhodčímu.
        Assert.Equal(kdo, Workflow.KdoSmiDoSerie(stav));
    }

    [Fact]
    public void Zapsat_a_schvalit_nesmi_tentyz_clovek()
    {
        // Jinak je schválení jen druhé kliknutí téhož. Organizátor zapíše,
        // ale ověřit ani schválit nesmí; rozhodčí naopak nezapisuje.
        var organizator = new[] { new UdeleneRole(Role.Organizator, 1, 7) };
        var rozhodci = new[] { new UdeleneRole(Role.Rozhodci, 1) };

        Assert.True(Prava.Smi(organizator, new Pozadavek(Workflow.KdoSmi(StavVysledku.Navrzeno), 1, 7)));
        Assert.False(Prava.Smi(organizator, new Pozadavek(Workflow.KdoSmi(StavVysledku.Overeno), 1, 7)));

        Assert.True(Prava.Smi(rozhodci, new Pozadavek(Workflow.KdoSmi(StavVysledku.Schvaleno), 1, 7)));
        Assert.False(Prava.Smi(rozhodci, new Pozadavek(Workflow.KdoSmi(StavVysledku.Navrzeno), 1, 7)));

        // A potvrdit ani eliminovat nesmí ani jeden.
        foreach (var stav in new[] { StavVysledku.Potvrzeno, StavVysledku.Eliminovano })
        {
            Assert.False(Prava.Smi(organizator, new Pozadavek(Workflow.KdoSmi(stav), 1, 7)));
            Assert.False(Prava.Smi(rozhodci, new Pozadavek(Workflow.KdoSmi(stav), 1, 7)));
        }
    }

    [Fact]
    public void Eliminovana_rozjizdka_neplati_nikde()
    {
        // Rozdíl proti `DoSerie`: ta bere body jen poháru, ve výsledku
        // závodu rozjížďka platí dál.
        Assert.False(Workflow.Plati(StavVysledku.Eliminovano));

        foreach (var stav in Enum.GetValues<StavVysledku>().Where(s => s != StavVysledku.Eliminovano))
            Assert.True(Workflow.Plati(stav));
    }
}

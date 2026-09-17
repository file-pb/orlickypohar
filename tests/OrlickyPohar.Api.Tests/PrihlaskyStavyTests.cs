using OrlickyPohar.Api.Features.Zavody;
using Kdo = OrlickyPohar.Api.Features.Zavody.Prihlasky.Kdo;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Stavy veřejných přihlášek (plán 17. 9. 2026): kdo co smí, kdy je
/// potřeba důvod a co je vidět na webu. Čisté funkce.
/// </summary>
public class PrihlaskyStavyTests
{
    [Theory]
    [InlineData(StavUcasti.Pozadavek, StavUcasti.Prihlasena)]
    [InlineData(StavUcasti.Pozadavek, StavUcasti.KDoplneni)]
    [InlineData(StavUcasti.Pozadavek, StavUcasti.Odmitnuta)]
    [InlineData(StavUcasti.KDoplneni, StavUcasti.Prihlasena)]
    [InlineData(StavUcasti.Odmitnuta, StavUcasti.Prihlasena)]
    [InlineData(StavUcasti.Prihlasena, StavUcasti.Nedostavila)]
    [InlineData(StavUcasti.Nedostavila, StavUcasti.Potvrzena)]
    public void Poradatel_vede_prihlasku_obema_smery(StavUcasti ze, StavUcasti na)
    {
        Assert.Null(Prihlasky.ProcNejdePrepnout(ze, na, maVysledky: false, Kdo.Poradatel));
    }

    [Theory]
    [InlineData(StavUcasti.Prihlasena)]
    [InlineData(StavUcasti.KDoplneni)]
    public void Do_pozadavku_se_rucne_nevraci(StavUcasti ze)
    {
        // Požadavek je přihláška z webu, kterou ještě nikdo neviděl.
        Assert.NotNull(Prihlasky.ProcNejdePrepnout(ze, StavUcasti.Pozadavek, false, Kdo.Poradatel));
    }

    [Fact]
    public void Vylucuje_jen_rozhodci_a_nic_jineho_nemeni()
    {
        Assert.NotNull(Prihlasky.ProcNejdePrepnout(StavUcasti.Potvrzena, StavUcasti.Vyloucena, true, Kdo.Poradatel));
        Assert.NotNull(Prihlasky.ProcNejdePrepnout(StavUcasti.Vyloucena, StavUcasti.Potvrzena, true, Kdo.Poradatel));

        Assert.Null(Prihlasky.ProcNejdePrepnout(StavUcasti.Potvrzena, StavUcasti.Vyloucena, true, Kdo.Rozhodci));
        Assert.Null(Prihlasky.ProcNejdePrepnout(StavUcasti.Vyloucena, StavUcasti.Potvrzena, true, Kdo.Rozhodci));
        Assert.NotNull(Prihlasky.ProcNejdePrepnout(StavUcasti.Prihlasena, StavUcasti.Potvrzena, false, Kdo.Rozhodci));
    }

    [Theory]
    [InlineData(StavUcasti.Zrusena)]
    [InlineData(StavUcasti.Odmitnuta)]
    [InlineData(StavUcasti.KDoplneni)]
    [InlineData(StavUcasti.Nedostavila)]
    public void Lod_s_vysledky_prijela(StavUcasti na)
    {
        Assert.NotNull(Prihlasky.ProcNejdePrepnout(StavUcasti.Potvrzena, na, maVysledky: true));
    }

    [Fact]
    public void Rozhodci_s_vysledky_nabizi_jen_vylouceni()
    {
        Assert.Equal([StavUcasti.Vyloucena], Prihlasky.MozneZ(StavUcasti.Potvrzena, true, Kdo.Rozhodci));
    }

    [Fact]
    public void Poradatel_u_pozadavku_nabizi_zapis_vraceni_odmitnuti()
    {
        var mozne = Prihlasky.MozneZ(StavUcasti.Pozadavek, false).ToList();

        Assert.Contains(StavUcasti.Prihlasena, mozne);
        Assert.Contains(StavUcasti.KDoplneni, mozne);
        Assert.Contains(StavUcasti.Odmitnuta, mozne);
        Assert.DoesNotContain(StavUcasti.Vyloucena, mozne);
        Assert.DoesNotContain(StavUcasti.Pozadavek, mozne);
    }

    [Theory]
    [InlineData(StavUcasti.KDoplneni)]
    [InlineData(StavUcasti.Odmitnuta)]
    [InlineData(StavUcasti.Vyloucena)]
    public void Vraceni_odmitnuti_a_vylouceni_chteji_duvod(StavUcasti na)
    {
        Assert.NotNull(Prihlasky.ProcNejdeDuvod(na, "  "));
        Assert.Null(Prihlasky.ProcNejdeDuvod(na, "Chybí číslo plachty."));
    }

    [Fact]
    public void Zapis_a_potvrzeni_duvod_nechteji()
    {
        Assert.Null(Prihlasky.ProcNejdeDuvod(StavUcasti.Prihlasena, null));
        Assert.Null(Prihlasky.ProcNejdeDuvod(StavUcasti.Potvrzena, null));
        Assert.NotNull(Prihlasky.ProcNejdeDuvod(StavUcasti.Potvrzena, new string('x', 501)));
    }

    [Theory]
    [InlineData(StavUcasti.Prihlasena, true)]
    [InlineData(StavUcasti.Potvrzena, true)]
    [InlineData(StavUcasti.Vyloucena, true)]
    [InlineData(StavUcasti.Pozadavek, false)]
    [InlineData(StavUcasti.KDoplneni, false)]
    [InlineData(StavUcasti.Odmitnuta, false)]
    [InlineData(StavUcasti.Zrusena, false)]
    [InlineData(StavUcasti.Nedostavila, false)]
    public void Na_webu_jen_lode_ktere_jedou_nebo_jely(StavUcasti stav, bool videt)
    {
        // Nepřečtený požadavek z webu nesmí veřejně vypadat jako přihlášená loď.
        Assert.Equal(videt, Prihlasky.VerejneViditelna(stav));
    }
}

using OrlickyPohar.Api.Features.Klice;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Kdy si telefon sám zapne nahrávání (R3).
/// <para>
/// Každé pravidlo se tvrdí <b>oběma směry</b>: čas, který by vracel vždycky
/// nebo nikdy, by prošel polovinou tvrzení.
/// </para>
/// </summary>
public class HlaseniTests
{
    private static readonly DateTimeOffset Start =
        new(2026, 5, 16, 11, 0, 0, TimeSpan.FromHours(2));

    [Fact]
    public void Nahrava_se_dvacet_minut_pred_startem()
    {
        // Patnáct minut před procedurou, a procedura trvá pět — tedy T−20.
        Assert.Equal(Start.AddMinutes(-20), Hlaseni.NahravatOd(Start));
        Assert.Equal(TimeSpan.FromMinutes(20), Hlaseni.PredStartem);
    }

    [Fact]
    public void Hlaseni_zije_driv_nez_mapa()
    {
        // Mapa naskakuje 10 minut před procedurou (R4), tedy T−15. Hlášení
        // musí být dřív, jinak nemá mapa co kreslit.
        var mapa = Start - Hlaseni.Procedura - TimeSpan.FromMinutes(10);
        Assert.True(Hlaseni.NahravatOd(Start) < mapa);
    }

    [Fact]
    public void Bez_casu_startu_se_nenahrava()
    {
        Assert.Null(Hlaseni.NahravatOd(null));
        Assert.False(Hlaseni.NahravatTed(null, Start));
    }

    [Fact]
    public void Pred_dvacitkou_jeste_ne_a_po_ni_uz_ano()
    {
        Assert.False(Hlaseni.NahravatTed(Start, Start.AddMinutes(-21)));
        Assert.True(Hlaseni.NahravatTed(Start, Start.AddMinutes(-20)));
        Assert.True(Hlaseni.NahravatTed(Start, Start.AddMinutes(-19)));
    }

    [Fact]
    public void Po_startu_se_nahrava_dal()
    {
        // Horní mez tu schválně není: rozjížďka, která se vleče, je přesně
        // ta, u které je stopa nejpotřebnější. Zastaví se tím, že dojetá
        // rozjížďka čas nevydá.
        Assert.True(Hlaseni.NahravatTed(Start, Start.AddHours(3)));
    }
}

using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Protestní časový limit (ZPJ 60.3(b), nález K2).
/// <para>
/// Celé protesty se nestaví — to je velká věc s vlastním rozhodnutím.
/// Tohle je ten kus, na který aplikace data má, a tvrdí se oběma směry:
/// lhůta, která by uplynula vždycky nebo nikdy, by prošla polovinou
/// tvrzení.
/// </para>
/// </summary>
public class ProtestyTests
{
    private static readonly DateTimeOffset Dojezd =
        new(2026, 5, 16, 13, 40, 0, TimeSpan.FromHours(2));

    [Fact]
    public void Limit_je_dve_hodiny_po_dojezdu_posledni_lodi()
    {
        Assert.Equal(Dojezd.AddHours(2), Protesty.Limit(Dojezd));
        Assert.Equal(TimeSpan.FromHours(2), Protesty.Lhuta);
    }

    [Fact]
    public void Dokud_nikdo_nedojel_limit_neexistuje()
    {
        // Není od čeho měřit — a to je jiná zpráva než „už uplynul".
        Assert.Null(Protesty.Limit(null));
        Assert.False(Protesty.Uplynul(null, Dojezd.AddDays(7)));
    }

    [Fact]
    public void Pred_limitem_jeste_ne_a_na_nem_uz_ano()
    {
        Assert.False(Protesty.Uplynul(Dojezd, Dojezd.AddMinutes(119)));
        Assert.True(Protesty.Uplynul(Dojezd, Dojezd.AddHours(2)));
        Assert.True(Protesty.Uplynul(Dojezd, Dojezd.AddHours(3)));
    }

    [Fact]
    public void Zona_dojezdu_na_limit_nema_vliv()
    {
        // Tentýž okamžik zapsaný v jiné zóně musí dát tentýž limit —
        // jinak by lhůta záležela na tom, odkud se zapisovalo.
        var vUtc = Dojezd.ToUniversalTime();
        Assert.Equal(Protesty.Limit(Dojezd), Protesty.Limit(vUtc));
    }
}

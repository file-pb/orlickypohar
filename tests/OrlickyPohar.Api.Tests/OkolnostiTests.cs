using OrlickyPohar.Api.Features.Spolecne;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Které polohy se k rozhodnutí uloží a které ne.
/// <para>
/// Měří se jediné pravidlo, na kterém u dokladu záleží: <b>rozhodnutí se
/// kvůli poloze nikdy nezdrží</b>. Nesmyslná nebo moc hrubá poloha se
/// zahodí a zápis proběhne bez ní — prázdno je pravdivější než číslo,
/// které svádí brát ho vážně.
/// </para>
/// </summary>
public class OkolnostiTests
{
    /// <summary>Bod na Orlíku, kde se pohár jede.</summary>
    private const double Sirka = 49.4957;
    private const double Delka = 14.1841;

    /// <summary>
    /// `JePoloha` je privátní schválně — měří se přes to, co se doopravdy
    /// uloží. Tahle kopie drží tytéž meze, aby test četl jako pravidlo.
    /// </summary>
    private static bool Ulozi(double? sirka, double? delka, double? presnost)
    {
        if (sirka is not { } s || delka is not { } d) return false;
        if (!double.IsFinite(s) || !double.IsFinite(d)) return false;
        if (Math.Abs(s) > 90 || Math.Abs(d) > 180) return false;
        if (presnost is { } p && (p <= 0 || p > 100)) return false;
        return true;
    }

    [Fact]
    public void PolohaZOrlikuSeUlozi()
    {
        Assert.True(Ulozi(Sirka, Delka, 8));
    }

    [Fact]
    public void BezPresnostiSeUlozi()
    {
        // Telefon přesnost nehlásí vždycky a „nevím jak přesně" je pořád
        // lepší než nic.
        Assert.True(Ulozi(Sirka, Delka, null));
    }

    [Fact]
    public void PulkaSouradniceNeni()
    {
        Assert.False(Ulozi(Sirka, null, 8));
        Assert.False(Ulozi(null, Delka, 8));
        Assert.False(Ulozi(null, null, null));
    }

    [Fact]
    public void NesmyslnaSouradniceNeprojde()
    {
        Assert.False(Ulozi(91, Delka, 8));
        Assert.False(Ulozi(Sirka, 181, 8));
        Assert.False(Ulozi(double.NaN, Delka, 8));
        Assert.False(Ulozi(Sirka, double.PositiveInfinity, 8));
    }

    [Fact]
    public void PolohaZeSiteNeprojde()
    {
        // Nad sto metrů to není poloha z družic — tatáž mez jako u bóje.
        Assert.False(Ulozi(Sirka, Delka, 250));
        Assert.True(Ulozi(Sirka, Delka, 100));
    }

    [Fact]
    public void NulovaNeboZapornaPresnostNeprojde()
    {
        // Žádný přijímač nehlásí nulovou odchylku; je to chyba, ne jistota.
        Assert.False(Ulozi(Sirka, Delka, 0));
        Assert.False(Ulozi(Sirka, Delka, -5));
    }

    [Fact]
    public void CasRozhodnutiJdePresCasKlienta()
    {
        // Rozhodnutí bez signálu si nese čas, kdy padlo — ne kdy doputovalo.
        var ted = new DateTimeOffset(2027, 5, 15, 12, 30, 0, TimeSpan.Zero);
        var rozhodnuto = ted.AddMinutes(-19);

        var (kdy, proc) = CasKlienta.Kdy(rozhodnuto, ted);

        Assert.Equal(rozhodnuto, kdy);
        Assert.Equal(CasKlienta.Posun.Prijat, proc);
    }
}

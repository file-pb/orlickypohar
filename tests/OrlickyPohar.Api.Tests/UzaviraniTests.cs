using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Kdy regatu zavře server sám (Filip, 21. 11. 2026: *„pokud na to
/// zapomeneme, udělej ho za dva dny sám"*). Čisté funkce, bez databáze.
/// </summary>
public class UzaviraniTests
{
    private static readonly DateOnly Datum = new(2026, 5, 2);
    private static readonly DateTimeOffset KonecDne = new(2026, 5, 2, 17, 0, 0, TimeSpan.Zero);

    private static bool Uzavrit(
        DateTimeOffset ted,
        StavZavodu stav = StavZavodu.Vypsany,
        bool odjeta = true,
        DateTimeOffset? konec = null) =>
        Uzavirani.MaSeUzavrit(stav, odjeta, konec ?? KonecDne, Datum, ted);

    [Fact]
    public void Dva_dny_po_konci_dne_se_zavre()
    {
        Assert.False(Uzavrit(KonecDne.AddDays(2).AddMinutes(-1)));
        Assert.True(Uzavrit(KonecDne.AddDays(2)));
    }

    [Fact]
    public void Bez_okna_se_meri_od_konce_dne_terminu()
    {
        // Okno nikdo neotevřel: lhůta běží od půlnoci termínu, ne od
        // půlnoci, kterou má datum na začátku.
        var ted = new DateTimeOffset(Datum.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero)
                  + Uzavirani.Lhuta;

        // Přímo, ne přes pomocníka: ten by `null` nahradil koncem okna.
        Assert.True(Uzavirani.MaSeUzavrit(
            StavZavodu.Vypsany, maOdjetouRozjizdku: true, konecPoslednihoDne: null, Datum, ted));
        Assert.False(Uzavirani.MaSeUzavrit(
            StavZavodu.Vypsany, maOdjetouRozjizdku: true, konecPoslednihoDne: null, Datum,
            ted.AddMinutes(-1)));
    }

    [Fact]
    public void Dvacetictyrhodinovka_se_meri_od_konce_okna_ne_od_data()
    {
        // Začne druhého v poledne a skončí třetího; podle data by se
        // zavřela o den dřív, než doopravdy skončila.
        var konec = new DateTimeOffset(2026, 5, 3, 12, 0, 0, TimeSpan.Zero);

        Assert.False(Uzavrit(konec.AddDays(2).AddHours(-1), konec: konec));
        Assert.True(Uzavrit(konec.AddDays(2), konec: konec));
    }

    [Theory]
    [InlineData(StavZavodu.Planovany)]
    [InlineData(StavZavodu.Potvrzeny)]
    [InlineData(StavZavodu.Odjety)]
    [InlineData(StavZavodu.Zruseny)]
    public void Zavira_se_jen_vypsana(StavZavodu stav)
    {
        Assert.False(Uzavrit(KonecDne.AddDays(30), stav));
    }

    [Fact]
    public void Regata_bez_odjete_rozjizdky_zustane_stat()
    {
        // „Odjetý" znamená, že se jelo. Kdyby to robot tvrdil o regatě,
        // která se nekonala a nikdo ji nezrušil, dostala by se do poháru
        // jako odjetá bez výsledků.
        Assert.False(Uzavrit(KonecDne.AddDays(30), odjeta: false));
    }
}

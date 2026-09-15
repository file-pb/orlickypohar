using OrlickyPohar.Api.Features.Poradatele;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla medailonku pořadatele. Čisté funkce, bez databáze.
/// </summary>
public class MedailonekTests
{
    [Theory]
    [InlineData("https://yachtclubpisek.cz/", "https://yachtclubpisek.cz/")]
    [InlineData("http://yc-orlik.cz", "http://yc-orlik.cz")]
    [InlineData("  yachtclubpisek.cz  ", "https://yachtclubpisek.cz")]
    [InlineData("www.yachtclubpisek.cz/o-nas", "https://www.yachtclubpisek.cz/o-nas")]
    public void Web_se_ulozi_jako_uplna_adresa(string zadano, string ulozeno)
    {
        // Z adresního řádku se kopíruje všelijak a bez schématu je adresa
        // pořád jednoznačná.
        Assert.Equal((ulozeno, null), Medailonek.NormalizujWeb(zadano));
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("JavaScript:alert(document.cookie)")]
    [InlineData("data:text/html,<script>alert(1)</script>")]
    [InlineData("mailto:info@yc.cz")]
    [InlineData("ftp://yc.cz")]
    [InlineData("yc pisek")]
    [InlineData("localhost")]
    public void Web_jinde_nez_na_http_neprojde(string zadano)
    {
        // Adresa jde do `href`. Kdyby prošlo `javascript:`, spustilo by se
        // po kliknutí na odkaz pořadatele u každého návštěvníka.
        var (web, chyba) = Medailonek.NormalizujWeb(zadano);

        Assert.Null(web);
        Assert.NotNull(chyba);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Prazdny_web_je_nevyplneny(string? zadano)
    {
        Assert.Equal((null, null), Medailonek.NormalizujWeb(zadano));
    }

    [Fact]
    public void Staci_nazev()
    {
        // Ven jde jen to, co někdo vyplní. Nevyplněné pole je odpověď.
        Assert.Null(Medailonek.ProcNejdeUlozit("Yacht Club Písek", null, null, null, null, null, null, null));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("---")]
    public void Bez_nazvu_to_nejde(string nazev)
    {
        Assert.NotNull(Medailonek.ProcNejdeUlozit(nazev, null, null, null, null, null, null, null));
    }

    [Theory]
    [InlineData("info@yachtclubpisek.cz", true)]
    [InlineData("jan.novak+pohar@seznam.cz", true)]
    [InlineData("info@", false)]
    [InlineData("@yc.cz", false)]
    [InlineData("info@yc", false)]
    [InlineData("in fo@yc.cz", false)]
    [InlineData("a@b@yc.cz", false)]
    public void Email_se_kontroluje_jen_nahrubo(string email, bool projde)
    {
        var chyba = Medailonek.ProcNejdeUlozit("YC", null, email, null, null, null, null, null);
        Assert.Equal(projde, chyba is null);
    }

    [Theory]
    [InlineData("+420 777 123 456", true)]
    [InlineData("777123456", true)]
    [InlineData("(+420) 777-123-456", true)]
    [InlineData("12345", false)]
    [InlineData("volat večer", false)]
    public void Telefon_musi_byt_cislo(string telefon, bool projde)
    {
        var chyba = Medailonek.ProcNejdeUlozit("YC", null, null, telefon, null, null, null, null);
        Assert.Equal(projde, chyba is null);
    }

    [Fact]
    public void Souradnice_jsou_obe_nebo_zadna()
    {
        // Jedna bez druhé je celý poledník — odkaz na mapu by vedl jinam,
        // než si kdo myslí.
        Assert.NotNull(Medailonek.ProcNejdeUlozit("YC", null, null, null, null, null, 49.5, null));
        Assert.NotNull(Medailonek.ProcNejdeUlozit("YC", null, null, null, null, null, null, 14.2));
        Assert.Null(Medailonek.ProcNejdeUlozit("YC", null, null, null, null, null, 49.5047, 14.1834));
    }

    [Theory]
    [InlineData(91, 14)]
    [InlineData(-91, 14)]
    [InlineData(49, 181)]
    [InlineData(49, -181)]
    public void Souradnice_mimo_zemekouli_neprojdou(double sirka, double delka)
    {
        Assert.NotNull(Medailonek.ProcNejdeUlozit("YC", null, null, null, null, null, sirka, delka));
    }

    [Fact]
    public void Dlouhy_popis_neprojde()
    {
        var popis = new string('a', Medailonek.PopisNejvic + 1);
        Assert.NotNull(Medailonek.ProcNejdeUlozit("YC", popis, null, null, null, null, null, null));
    }

    [Theory]
    [InlineData("YC Písek", "yc-pisek")]
    [InlineData("yc pisek", "yc-pisek")]
    [InlineData("  YC  PÍSEK ", "yc-pisek")]
    [InlineData("Plachtič z Vltavy", "plachtic-z-vltavy")]
    public void Kluby_se_paruji_bez_ohledu_na_psani(string nazev, string slug)
    {
        // Podle slugu kalendář i import najdou existující klub, místo aby
        // ho založily podruhé.
        Assert.Equal(slug, Medailonek.Slug(nazev));
    }

    [Fact]
    public void Rozhodci_smi_upravit_kazdeho_poradatele_v_rocniku()
    {
        Assert.True(Medailonek.SmiUpravit(rozhodci: true, organizatorRocniku: false, [], [7]));
    }

    [Fact]
    public void Organizator_zastavky_smi_upravit_jejiho_poradatele()
    {
        Assert.True(Medailonek.SmiUpravit(false, false, mojeZastavky: [3], zastavkyPoradatele: [3, 7]));
    }

    [Fact]
    public void Organizator_ciziho_zavodu_nesmi()
    {
        // Pořadatel Radavské regaty nesmí přepsat medailonek klubu, který
        // pořádá Izolepu.
        Assert.False(Medailonek.SmiUpravit(false, false, mojeZastavky: [3], zastavkyPoradatele: [7]));
    }

    [Fact]
    public void Organizator_rocniku_smi_vsude()
    {
        Assert.True(Medailonek.SmiUpravit(false, organizatorRocniku: true, [], [7]));
    }

    [Fact]
    public void Poradatel_bez_zastavky_v_rocniku_neni_k_uprave()
    {
        // Rozsah je ročník. Klub, který v něm nic nepořádá, v něm neexistuje
        // a rozhodčí jiného ročníku mu nemá co přepisovat.
        Assert.False(Medailonek.SmiUpravit(rozhodci: true, organizatorRocniku: true, [3], []));
    }

    [Fact]
    public void Souradnice_do_odkazu_maji_tecku()
    {
        Assert.Equal("49.504712", Medailonek.Cislo(49.5047123));
    }
}

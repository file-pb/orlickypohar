using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla připojovacího kódu. Čisté funkce, bez databáze — tvar kódu
/// a role nového člena jsou to, co musí platit vždycky.
/// </summary>
public class KodyTests
{
    [Fact]
    public void Kod_nema_znaky_ktere_se_pletou()
    {
        // U vody se kód opisuje z papíru. Nula a O, jednička a I jsou tam
        // k nerozeznání, proto v abecedě nejsou vůbec.
        Assert.DoesNotContain('0', Kody.Abeceda);
        Assert.DoesNotContain('O', Kody.Abeceda);
        Assert.DoesNotContain('1', Kody.Abeceda);
        Assert.DoesNotContain('I', Kody.Abeceda);
        Assert.Equal(32, Kody.Abeceda.Length);
    }

    [Fact]
    public void Novy_kod_ma_danou_delku_a_jen_povolene_znaky()
    {
        for (var i = 0; i < 50; i++)
        {
            var kod = Kody.Novy();
            Assert.Equal(Kody.Delka, kod.Length);
            Assert.All(kod, z => Assert.Contains(z, Kody.Abeceda));
        }
    }

    [Fact]
    public void Dva_kody_za_sebou_nejsou_stejne()
    {
        // Kód je přístupový údaj; generátor musí být náhodný, ne pořadový.
        Assert.NotEqual(Kody.Novy(), Kody.Novy());
    }

    [Theory]
    [InlineData("abc234", "ABC234")]
    [InlineData("ABC-234", "ABC234")]
    [InlineData(" abc 234 ", "ABC234")]
    [InlineData(null, "")]
    public void Opsany_kod_se_srovna(string? zadany, string ocekavany)
    {
        // Lidé si do opisu přidávají mezery a pomlčky a píšou malými.
        Assert.Equal(ocekavany, Kody.Uprav(zadany));
    }

    [Fact]
    public void Znaky_mimo_abecedu_se_zahodi()
    {
        // „0" a „O" se nepletou jen lidem: zahodit je je lepší než hledat
        // kód, který nikdy nevznikl.
        Assert.Equal("ABC", Kody.Uprav("A0B1C"));
    }

    [Fact]
    public void Kazdy_pripojeny_kodem_je_posadka()
    {
        // Do 5. 10. 2026 byl první kapitán. Pořadí u stolu ale o pravomoci
        // rozhodovat nemá — podrobněji v `KapitanstviTests`.
        Assert.Equal(RoleKLodi.Posadka, Kody.RoleProNoveho);
    }

    [Fact]
    public void Platnost_je_v_minutach_ne_v_hodinach()
    {
        // Kód na displeji si kdokoliv vyfotí přes rameno; krátká platnost
        // je jediné, co to riziko drží dole.
        Assert.True(Kody.Platnost <= TimeSpan.FromMinutes(30));
    }
}

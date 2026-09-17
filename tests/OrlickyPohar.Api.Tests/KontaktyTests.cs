using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Tests;

/// <summary>Kontakty kapitánů: kontrola a historie. Čisté funkce.</summary>
public class KontaktyTests
{
    private static readonly DateTimeOffset Ted = new(2026, 9, 17, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Prihlaska_chce_aspon_jeden_kontakt()
    {
        Assert.NotNull(Kontakty.ProcNejde(null, " ", povinny: true));
        Assert.Null(Kontakty.ProcNejde(null, "+420 777 123 456", povinny: true));
        Assert.Null(Kontakty.ProcNejde("kapitan@example.cz", null, povinny: true));
        Assert.Null(Kontakty.ProcNejde(null, null, povinny: false));
    }

    [Theory]
    [InlineData("kapitan", null)]
    [InlineData(null, "123")]
    [InlineData(null, "777 abc 456")]
    public void Nesmysl_v_kontaktu_neprojde(string? email, string? telefon)
    {
        Assert.NotNull(Kontakty.ProcNejde(email, telefon, povinny: false));
    }

    [Fact]
    public void Prvni_kontakt_se_ulozi()
    {
        var novy = Kontakty.Novy(null, " kapitan@example.cz ", "777123456", Ted, ucastId: 5);

        Assert.NotNull(novy);
        Assert.Equal(("kapitan@example.cz", "777123456", 5), (novy.Email, novy.Telefon, novy.UcastId));
    }

    [Fact]
    public void Stejny_kontakt_nepribude()
    {
        var posledni = new KontaktOsoby { Email = "Kapitan@Example.cz", Telefon = "777123456" };

        Assert.Null(Kontakty.Novy(posledni, "kapitan@example.cz", "777123456", Ted, null));
    }

    [Fact]
    public void Zmena_pribude_a_prazdne_pole_si_nechava_stary_udaj()
    {
        var posledni = new KontaktOsoby { Email = "stary@example.cz", Telefon = "777123456" };

        var novy = Kontakty.Novy(posledni, null, "608 000 111", Ted, null);

        Assert.NotNull(novy);
        Assert.Equal(("stary@example.cz", "608 000 111"), (novy.Email, novy.Telefon));
    }
}

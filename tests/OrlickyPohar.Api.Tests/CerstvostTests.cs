using OrlickyPohar.Api.Features.Klice;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Kdy se o telefonu dá říct, že vysílá (R34 podle návrhu
/// <c>Zavodnik.dc.html</c>: *„2 ze 3 vysílají"*).
/// <para>
/// Mez drží server schválně: posádka i pořadatel čtou totéž, a kdyby si
/// čerstvost počítal každý po svém, jeden by viděl loď v poli a druhý ne.
/// </para>
/// </summary>
public class CerstvostTests
{
    private static readonly DateTimeOffset Ted =
        new(2026, 5, 16, 11, 0, 0, TimeSpan.FromHours(2));

    [Fact]
    public void Deset_minut_je_dvojnasobek_taktu_hlaseni()
    {
        // Appka tluče po pěti minutách; jedno vynechané kolo se stane,
        // dvě už znamenají, že se něco děje.
        Assert.Equal(TimeSpan.FromMinutes(10), Hlaseni.JesteCerstve);
    }

    [Fact]
    public void Do_meze_vysila_a_za_mezi_uz_ne()
    {
        Assert.True(Hlaseni.Cerstve(Ted.AddMinutes(-9), Ted));
        Assert.True(Hlaseni.Cerstve(Ted.AddMinutes(-10), Ted));
        Assert.False(Hlaseni.Cerstve(Ted.AddMinutes(-11), Ted));
    }

    [Fact]
    public void Kdo_se_neozval_nikdy_nevysila()
    {
        // Není to totéž jako „ozval se dávno", ale na vodě z toho plyne
        // totéž: komise ho nevidí.
        Assert.False(Hlaseni.Cerstve(null, Ted));
    }
}

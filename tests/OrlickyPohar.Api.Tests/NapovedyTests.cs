using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Našeptávání do formuláře regaty (Filip, 21. 11. 2026: *„pro každou
/// regatu extra, ale s našeptáváním z mediánu"*). Čisté funkce.
/// </summary>
public class NapovedyTests
{
    private static TimeOnly H(int hodina, int minuta = 0) => new(hodina, minuta);

    [Fact]
    public void Medianem_je_prostredni_hodnota()
    {
        Assert.Equal(H(16), Napovedy.Median([H(15), H(16), H(17)]));
    }

    [Fact]
    public void Vybocujici_hodnota_median_neutahne()
    {
        // Jedna regata startovala v deset večer. Průměr by vyšel po 17.
        Assert.Equal(H(16), Napovedy.Median([H(16), H(16), H(22)]));
    }

    [Fact]
    public void U_sudeho_poctu_se_bere_dolni_prostredni()
    {
        // Ne průměr: nápověda má nabídnout čas, který už někdo použil.
        Assert.Equal(H(16), Napovedy.Median([H(16), H(17)]));
    }

    [Fact]
    public void Bez_hodnot_se_nenapovida()
    {
        Assert.Null(Napovedy.Median([]));
        Assert.Null(Napovedy.Posledni([]));
    }

    [Fact]
    public void Napovida_se_posledni_pouzity_text()
    {
        var zaznamy = new (DateOnly, string?)[]
        {
            (new DateOnly(2026, 5, 2), "start u mola, točná levobokem"),
            (new DateOnly(2026, 9, 5), "start u zelené bóje, brána"),
            (new DateOnly(2026, 6, 20), "jiná trať"),
        };

        Assert.Equal("start u zelené bóje, brána", Napovedy.Posledni(zaznamy));
    }

    [Fact]
    public void Prazdny_text_se_preskoci()
    {
        var zaznamy = new (DateOnly, string?)[]
        {
            (new DateOnly(2026, 5, 2), "platná trať"),
            (new DateOnly(2026, 9, 5), "   "),
            (new DateOnly(2026, 6, 20), null),
        };

        Assert.Equal("platná trať", Napovedy.Posledni(zaznamy));
    }
}

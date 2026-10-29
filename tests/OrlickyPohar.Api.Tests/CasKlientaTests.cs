using OrlickyPohar.Api.Features.Spolecne;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Čas, který poslal telefon. Čisté funkce, žádná databáze.
/// <para>
/// Měří se tu jediná věc, na které u vody záleží: podržený úkon si má
/// nést čas, kdy rozhodčí klepl, ale cizí hodiny se nesmí brát naslepo.
/// Obojí selhává tiše — zapisuje se jednou a čte se potom.
/// </para>
/// </summary>
public class CasKlientaTests
{
    /// <summary>Start Jarního větru: 15. 5. 2027 ve 14:00 pražského času.</summary>
    private static readonly DateTimeOffset Ted = new(2027, 5, 15, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void BezCasuOdKlientaPlatiServer()
    {
        var (kdy, proc) = CasKlienta.Kdy(null, Ted);

        Assert.Equal(Ted, kdy);
        Assert.Equal(CasKlienta.Posun.Neuveden, proc);
    }

    [Fact]
    public void PodrzenyUkonSiNeseSvujCas()
    {
        // Rozhodčí klepl ve 14:12, signál chytil telefon až ve 14:31.
        var klepnuto = Ted.AddMinutes(12);
        var odeslano = Ted.AddMinutes(31);

        var (kdy, proc) = CasKlienta.Kdy(klepnuto, odeslano);

        Assert.Equal(klepnuto, kdy);
        Assert.Equal(CasKlienta.Posun.Prijat, proc);
    }

    [Fact]
    public void MalyRozchodHodinJesteProjde()
    {
        // Telefon, který se nesynchronizuje, jde běžně o minutu napřed.
        var napred = Ted.AddSeconds(90);

        var (kdy, proc) = CasKlienta.Kdy(napred, Ted);

        Assert.Equal(napred, kdy);
        Assert.Equal(CasKlienta.Posun.Prijat, proc);
    }

    [Fact]
    public void CasZBudoucnostiNeprojde()
    {
        // Událost, která se ještě nestala, nedává smysl ani v záznamu.
        var (kdy, proc) = CasKlienta.Kdy(Ted.AddHours(3), Ted);

        Assert.Equal(Ted, kdy);
        Assert.Equal(CasKlienta.Posun.ZBudoucnosti, proc);
    }

    [Fact]
    public void PrilisStaryCasNeprojde()
    {
        // Telefon se zapomenutým datem po výměně baterie.
        var (kdy, proc) = CasKlienta.Kdy(Ted.AddYears(-3), Ted);

        Assert.Equal(Ted, kdy);
        Assert.Equal(CasKlienta.Posun.PrilisStary, proc);
    }

    [Fact]
    public void DvacetictyrhodinovkaSeVejde()
    {
        // „24 se jede klidně 30 h i s tou přípravou a dojezdy" (Filip,
        // 24. 10. 2026) — úkon z jejího začátku musí projít i na konci.
        var zacatek = Ted.AddHours(-30);

        var (kdy, proc) = CasKlienta.Kdy(zacatek, Ted);

        Assert.Equal(zacatek, kdy);
        Assert.Equal(CasKlienta.Posun.Prijat, proc);
    }

    [Fact]
    public void NikdyNevraciChybu()
    {
        // Úkon u vody se nesmí ztratit kvůli hodinám: i nesmyslný čas
        // vrátí platný zápis, jen se serverovým časem.
        foreach (var nesmysl in new[]
                 {
                     DateTimeOffset.MinValue,
                     DateTimeOffset.MaxValue,
                     Ted.AddDays(-1000),
                     Ted.AddDays(1000),
                 })
        {
            var (kdy, _) = CasKlienta.Kdy(nesmysl, Ted);
            Assert.Equal(Ted, kdy);
        }
    }
}

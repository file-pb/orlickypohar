using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Protestní časový limit (ZPJ 60.3(b), nález K2). Čisté funkce, bez databáze.
///
/// <para>
/// Do 22. 11. 2026 byl limit <b>jen věta na obrazovce</b>. Filip ho toho dne
/// proměnil v zámek: *„dvě hodiny jsou v poho, klidně."* Co se tím nemění:
/// aplikace pořád neví, jestli nějaký protest visí — hlídá uplynutí lhůty,
/// ne čistotu pořadí.
/// </para>
/// </summary>
public class ProtestyTests
{
    private static readonly DateTimeOffset Dojezd = new(2026, 5, 2, 14, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Behem_lhuty_podpis_nejde()
    {
        var chyba = Protesty.ProcNejdePodepsat(Dojezd, Dojezd.AddMinutes(30));

        Assert.NotNull(chyba);
        // Zbývající čas musí být v hlášce: zamčené tlačítko bez čísla
        // vypadá jako porucha.
        Assert.Contains("90 min", chyba, StringComparison.Ordinal);
    }

    [Fact]
    public void Po_lhute_podpis_jde()
    {
        Assert.Null(Protesty.ProcNejdePodepsat(Dojezd, Dojezd + Protesty.Lhuta));
        Assert.Null(Protesty.ProcNejdePodepsat(Dojezd, Dojezd.AddHours(3)));
    }

    [Fact]
    public void Rozjizdka_bez_dojezdu_necka()
    {
        // Nikdo nedokončil (všichni DNF, nebo se zrušila). Není od čeho
        // měřit — držet podpis donekonečna by znamenalo, že takovou
        // rozjížďku nejde zavřít.
        Assert.Null(Protesty.ProcNejdePodepsat(null, Dojezd.AddDays(1)));
    }

    [Fact]
    public void Hlaska_pise_cas_Orliku_ne_serveru()
    {
        // Server jede v UTC. Dojezd ve 14:00 UTC druhého května je
        // v Praze 16:00, takže limit padne v 18:00 — a to musí být
        // v hlášce, jinak posílá rozhodčího čekat o dvě hodiny jinam.
        var chyba = Protesty.ProcNejdePodepsat(Dojezd, Dojezd.AddMinutes(1));

        Assert.NotNull(chyba);
        Assert.Contains("18:00", chyba, StringComparison.Ordinal);
    }

    [Fact]
    public void Limit_a_Uplynul_drzi_tentyz_okamzik()
    {
        var limit = Protesty.Limit(Dojezd);

        Assert.Equal(Dojezd + Protesty.Lhuta, limit);
        Assert.False(Protesty.Uplynul(Dojezd, limit!.Value.AddSeconds(-1)));
        Assert.True(Protesty.Uplynul(Dojezd, limit.Value));
        // Z neznámého dojezdu se netvrdí ani jedno.
        Assert.False(Protesty.Uplynul(null, Dojezd.AddDays(1)));
        Assert.Null(Protesty.Limit(null));
    }
}

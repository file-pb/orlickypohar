using OrlickyPohar.Api.Features.Zavody;

using static OrlickyPohar.Api.Features.Zavody.CilZTrasovani;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Průjezd cílem podle stopy z telefonu (nález R33).
///
/// <para>
/// Řez testů je ten rozdíl, na kterém to celé stojí: <b>protnout čáru
/// nestačí, musí to být správným směrem a mezi bójemi</b>. U Orlíku leží
/// cíl na startu, takže bez směru by trasování hlásilo dojezd celému poli
/// ve chvíli startu — a loď, která obeplula konec cílové čáry, cílem
/// neprojela.
/// </para>
/// </summary>
public class CilZTrasovaniTests
{
    /// <summary>Cílová čára u Orlíku: zhruba 72 m podél rovnoběžky.</summary>
    private static readonly Misto CilA = new(49.5000, 14.3000);
    private static readonly Misto CilB = new(49.5000, 14.3010);

    /// <summary>Předchozí prvek trati leží na jihu — odtamtud se přijíždí.</summary>
    private static readonly Misto ZTrati = new(49.4990, 14.3005);

    private static readonly DateTimeOffset Start =
        new(2027, 5, 15, 12, 0, 0, TimeSpan.FromHours(2));

    private static BodStopy Bod(double sirka, double delka, int vterin) =>
        new(new Misto(sirka, delka), Start.AddSeconds(vterin));

    /// <summary>
    /// <b>Čas průjezdu se dopočítá mezi body stopy.</b> Telefon posílá
    /// polohu po vteřinách, ale cílem loď projede mezi dvěma z nich —
    /// a čas dojezdu je přesně ten okamžik, ne nejbližší zapsaný bod.
    /// </summary>
    [Fact]
    public void Prujezd_se_dopocita_mezi_body_stopy()
    {
        var stopa = new[]
        {
            Bod(49.4995, 14.3005, 0),   // jižně od čáry
            Bod(49.5005, 14.3005, 10),  // severně od ní
        };

        Assert.Equal(Start.AddSeconds(5), Posledni(stopa, CilA, CilB, ZTrati));
    }

    /// <summary>
    /// <b>Opačný směr se nepočítá</b> — a právě tím se u Orlíku pozná
    /// start od dojezdu: cíl tam leží na startu, takže tutéž čáru pole
    /// protne hned na začátku rozjížďky, jen na druhou stranu.
    /// </summary>
    [Fact]
    public void Opacny_smer_neni_dojezd()
    {
        var stopa = new[]
        {
            Bod(49.5005, 14.3005, 0),
            Bod(49.4995, 14.3005, 10),
        };

        Assert.Null(Posledni(stopa, CilA, CilB, ZTrati));
    }

    /// <summary>
    /// <b>Vrátit se a projet znovu je dojezd ten druhý.</b> Takhle vypadá
    /// celá rozjížďka u Orlíku: start ven přes tutéž čáru, okruh, a návrat
    /// do cíle.
    /// </summary>
    [Fact]
    public void Po_startu_ven_se_dojezd_pozna_az_pri_navratu()
    {
        var stopa = new[]
        {
            Bod(49.5005, 14.3005, 0),    // stojí za čárou, start
            Bod(49.4995, 14.3005, 10),   // vyjíždí ven (opačný směr)
            Bod(49.4900, 14.3005, 600),  // okruh
            Bod(49.4995, 14.3005, 1190), // vrací se
            Bod(49.5005, 14.3005, 1200), // protíná cíl
        };

        Assert.Equal(Start.AddSeconds(1195), Posledni(stopa, CilA, CilB, ZTrati));
    }

    /// <summary>
    /// <b>Mimo čáru to není dojezd.</b> Čára končí u bóje; loď, která
    /// obeplula její konec, cílem neprojela, i když překročila její
    /// prodloužení.
    /// </summary>
    [Fact]
    public void Za_koncem_cary_se_neprojizdi()
    {
        var stopa = new[]
        {
            Bod(49.4995, 14.3030, 0),   // dobrých sto metrů za bójí B
            Bod(49.5005, 14.3030, 10),
        };

        Assert.Null(Posledni(stopa, CilA, CilB, ZTrati));
    }

    /// <summary>Poslední průjezd vyhrává — dřívější byla branka, ne cíl.</summary>
    [Fact]
    public void Z_vice_pruchodu_plati_posledni()
    {
        var stopa = new[]
        {
            Bod(49.4995, 14.3005, 0),
            Bod(49.5005, 14.3005, 10),   // první průjezd správným směrem
            Bod(49.4995, 14.3005, 20),   // ven
            Bod(49.5005, 14.3005, 30),   // druhý, ten platí
        };

        Assert.Equal(Start.AddSeconds(25), Posledni(stopa, CilA, CilB, ZTrati));
    }

    /// <summary>
    /// Průjezd před startem patří jiné rozjížďce — telefon nahrává celý
    /// den a mezi rozjížďkami se po té čáře jezdí.
    /// </summary>
    [Fact]
    public void Prujezd_pred_startem_se_nepocita()
    {
        var stopa = new[]
        {
            Bod(49.4995, 14.3005, -60),
            Bod(49.5005, 14.3005, -50),
        };

        Assert.Null(Posledni(stopa, CilA, CilB, ZTrati, neDriv: Start));
        // Bez meze je to tentýž průjezd, jen se počítá.
        Assert.Equal(Start.AddSeconds(-55), Posledni(stopa, CilA, CilB, ZTrati));
    }

    /// <summary>Z jednoho bodu ani z nulové čáry směr nevyjde.</summary>
    [Fact]
    public void Co_nema_smer_nevraci_nic()
    {
        var stopa = new[] { Bod(49.4995, 14.3005, 0), Bod(49.5005, 14.3005, 10) };

        Assert.Null(Posledni([Bod(49.4995, 14.3005, 0)], CilA, CilB, ZTrati));
        // Dvě bóje na jednom místě: rovina se tím nedělí.
        Assert.Null(Posledni(stopa, CilA, CilA, ZTrati));
        // Předchozí prvek přesně na čáře — ze které strany se přijíždí, neplyne.
        Assert.Null(Posledni(stopa, CilA, CilB, new Misto(49.5000, 14.3005)));
    }
}

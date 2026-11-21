using OrlickyPohar.Api.Features.Boje;
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

/// <summary>
/// <b>Co se dá z trati o cíli vůbec zjistit</b> — <see
/// cref="CilZTrasovaniSprava.CilASmer"/>.
///
/// <para>
/// Řez je jedna věta z plánu: <i>„Konec rozjížďky je rozhodnutí"</i>
/// (20. 10. 2026). Trať bez cíle je u dálkové plavby <b>normální stav</b>,
/// ne nedodělaná práce — dojezdy odpiskává rozhodčí z vody. Trať se navíc
/// k téhle metodě dostane jedině ve stavu <c>Prijato</c>, tedy zamčená
/// rozhodčím, takže chybějící cíl nemůže být rozdělaná stavba.
/// </para>
/// </summary>
public class CilZTratiTests
{
    private static Boje B(string nazev, double sirka, double delka) =>
        new() { Nazev = nazev, Sirka = sirka, Delka = delka };

    private static PrvekTrati Prvek(TypPrvku typ, int poradi, Boje a, Boje? b = null) =>
        new() { Typ = typ, Poradi = poradi, BojeA = a, BojeB = b };

    private static readonly Boje Otocna = B("Otočná 1", 49.4990, 14.3005);
    private static readonly Boje CilLeva = B("Cíl levá", 49.5000, 14.3000);
    private static readonly Boje CilPrava = B("Cíl pravá", 49.5000, 14.3010);

    /// <summary>
    /// <b>Trať bez cíle není vada trati.</b> Dřív se vracela věta „Trať
    /// nemá cíl vytyčený dvěma konci", která zapisovatele posílala trať
    /// dodělat — jenže u dálkové plavby na ní dodělat není co.
    /// </summary>
    [Fact]
    public void Trat_bez_cile_posle_rozhodciho_na_vodu_a_nevini_trat()
    {
        var (cil, predchozi, procNe) = CilZTrasovaniSprava.CilASmer(
            [Prvek(TypPrvku.Start, 1, CilLeva, CilPrava), Prvek(TypPrvku.OtocnaBoje, 2, Otocna)]);

        Assert.Null(cil);
        Assert.Null(predchozi);
        Assert.NotNull(procNe);
        Assert.Contains("rozhodčí", procNe);
        Assert.DoesNotContain("dvěma konci", procNe);
    }

    /// <summary>
    /// <b>Cíl o jednom konci je jiná věta.</b> Čára potřebuje dva konce,
    /// a tohle je skutečně nedodělaný cíl — nesmí splynout s tratí, která
    /// cíl mít nemá.
    /// </summary>
    [Fact]
    public void Cil_s_jednim_koncem_se_nepleta_s_trati_bez_cile()
    {
        var (_, _, procNe) = CilZTrasovaniSprava.CilASmer(
            [Prvek(TypPrvku.OtocnaBoje, 1, Otocna), Prvek(TypPrvku.Cil, 2, CilLeva)]);

        Assert.NotNull(procNe);
        Assert.Contains("jeden konec", procNe);
        Assert.DoesNotContain("rozhodčí", procNe);
    }

    /// <summary>
    /// <b>Bez předchozího prvku není směr.</b> U Orlíku leží cíl na startu,
    /// takže tutéž čáru pole protne i na začátku.
    /// </summary>
    [Fact]
    public void Cil_bez_predchoziho_prvku_nema_smer()
    {
        var (cil, _, procNe) = CilZTrasovaniSprava.CilASmer(
            [Prvek(TypPrvku.Cil, 1, CilLeva, CilPrava)]);

        Assert.Null(cil);
        Assert.NotNull(procNe);
        Assert.Contains("směr", procNe);
    }

    /// <summary>Úplná trať vydá cíl i prvek, ze kterého plyne směr.</summary>
    [Fact]
    public void Uplna_trat_vrati_cil_i_smer()
    {
        var (cil, predchozi, procNe) = CilZTrasovaniSprava.CilASmer(
            [Prvek(TypPrvku.Start, 1, CilLeva, CilPrava),
             Prvek(TypPrvku.OtocnaBoje, 2, Otocna),
             Prvek(TypPrvku.Cil, 3, CilLeva, CilPrava)]);

        Assert.Null(procNe);
        Assert.Equal(3, cil!.Poradi);
        Assert.Equal(2, predchozi!.Poradi);
    }

    /// <summary>
    /// <b>Platí poslední cíl v pořadí.</b> Maraton jede velké kolo
    /// a uvnitř menší okruh (plán, 11. 10. 2026), takže se prvky opakují
    /// a cíl může být v trati víckrát.
    /// </summary>
    [Fact]
    public void Z_vice_cilu_plati_posledni()
    {
        var (cil, predchozi, procNe) = CilZTrasovaniSprava.CilASmer(
            [Prvek(TypPrvku.OtocnaBoje, 1, Otocna),
             Prvek(TypPrvku.Cil, 2, CilLeva, CilPrava),
             Prvek(TypPrvku.OtocnaBoje, 3, Otocna),
             Prvek(TypPrvku.Cil, 4, CilLeva, CilPrava)]);

        Assert.Null(procNe);
        Assert.Equal(4, cil!.Poradi);
        Assert.Equal(3, predchozi!.Poradi);
    }
}

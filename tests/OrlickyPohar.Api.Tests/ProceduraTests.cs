using OrlickyPohar.Api.Features.Spolecne;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Startovní procedura podle ZPJ 26 a její přerušení (nálezy R5 a R12
/// oponentury rozhodčího, 28. 10. 2026). Čisté funkce, bez databáze.
/// <para>
/// Řez testů je ten rozdíl, kvůli kterému nález vznikl: <b>přerušení
/// nejsou jedna věc, ale dvě, a dělí je startovní znamení.</b> Před
/// startem se odkládá a nový čas je volný; po startu se všeobecně
/// odvolává a nový čas volný není.
/// </para>
/// </summary>
public class ProceduraTests
{
    private static readonly DateTimeOffset Ted =
        new(2027, 5, 15, 10, 20, 0, TimeSpan.FromHours(2));

    /// <summary>
    /// Spuštění procedury dá start za tolik minut, kolik má regata
    /// nastaveno — ne za pět napevno. Pětka má v ZPJ 26 hvězdičku.
    /// </summary>
    [Theory]
    [InlineData(5)]
    [InlineData(10)]
    [InlineData(3)]
    public void Spusteni_odpocita_delku_procedury_te_regaty(int delka)
    {
        Assert.Equal(
            Ted.AddMinutes(delka),
            Procedura.NovyStart(DruhProcedury.Spustit, Ted, delka));
    }

    /// <summary>
    /// <b>Odložení nechává čas volný</b> — ZPJ 27.3, odkládá se *„z
    /// jakékoli příčiny"* a kdy se pojede, rozhodne startér. Prázdný čas
    /// je tedy odpověď, ne chybějící hodnota.
    /// </summary>
    [Fact]
    public void Odlozeni_nechava_cas_volny()
    {
        Assert.Null(Procedura.NovyStart(DruhProcedury.Odlozit, Ted, 5));
    }

    /// <summary>
    /// <b>Odvolání samo žádný čas nedává</b> — a tohle je ta oprava
    /// z 8. 11. 2026. ZPJ 29.2 doslova: *„The warning signal for a new
    /// start for the recalled class shall be made one minute after the
    /// First Substitute <b>is removed</b> (one sound)."* Minuta se měří
    /// od <b>svěšení</b> opakovače, ne od jeho vyvěšení — a jak dlouho
    /// visí, pravidlo neurčuje vůbec: drží ho komise, dokud se pole
    /// nevrátí za čáru.
    /// <para>
    /// Do té doby se tu počítalo <c>ted + 1 + procedura</c> rovnou při
    /// odvolání, což platí jedině tehdy, kdyby komise opakovač svěsila
    /// v tutéž vteřinu, kdy ho vytáhla. Appka ten čas ukazovala
    /// posádkám (Filip: *„ta minuta se mi nějak nezdá"*).
    /// </para>
    /// </summary>
    [Fact]
    public void Odvolani_samo_zadny_cas_nedava()
    {
        Assert.Null(Procedura.NovyStart(DruhProcedury.Odvolat, Ted, 5));
    }

    /// <summary>
    /// <b>Čas dává svěšení opakovače</b> — minuta do vyzývacího znamení
    /// a od něj celá procedura (ZPJ 29.2 a 26).
    /// </summary>
    [Fact]
    public void Svesen_opakovac_pocita_cas_z_pravidla()
    {
        Assert.Equal(
            Ted.AddMinutes(1 + 5),
            Procedura.NovyStart(DruhProcedury.OpakovacDolu, Ted, 5));

        // A s delší procedurou se posune jen ta druhá část; minuta je z 29.2.
        Assert.Equal(
            Ted.AddMinutes(1 + 10),
            Procedura.NovyStart(DruhProcedury.OpakovacDolu, Ted, 10));
    }

    /// <summary>
    /// <b>Dokud opakovač visí, nic jiného se nestartuje.</b> Nový start
    /// se počítá od jeho svěšení, takže spuštění procedury, odklad ani
    /// druhé odvolání tu minutu obejít nesmějí.
    /// </summary>
    [Fact]
    public void Pri_visicim_opakovaci_jde_jen_svesit()
    {
        foreach (var druh in Enum.GetValues<DruhProcedury>())
        {
            var chyba = Procedura.ProcNejde(druh, StavRozjizdky.Planovana, null, Ted);
            if (druh == DruhProcedury.OpakovacDolu) Assert.Null(chyba);
            else Assert.Contains("opakovač", chyba);
        }
    }

    /// <summary>
    /// A obráceně: svěsit jde jen to, co visí — s jedinou výjimkou
    /// rozjížďky, která na serveru pořád „probíhá". Tam odvolání
    /// nedoletělo ze vody a svěšení ho dohání, protože appka drží jediný
    /// čekající úkon.
    /// </summary>
    [Fact]
    public void Svesit_nevisici_opakovac_nejde()
    {
        Assert.NotNull(
            Procedura.ProcNejde(DruhProcedury.OpakovacDolu, StavRozjizdky.Planovana, Ted, null));
        Assert.Null(
            Procedura.ProcNejde(DruhProcedury.OpakovacDolu, StavRozjizdky.Probiha, Ted, null));
    }

    /// <summary>Opakovač vyvěsí odvolání a svěsí ho kterýkoliv další úkon.</summary>
    [Fact]
    public void Opakovac_visi_jen_po_odvolani()
    {
        Assert.True(Procedura.VisiOpakovac(DruhProcedury.Odvolat));
        Assert.False(Procedura.VisiOpakovac(DruhProcedury.OpakovacDolu));
        Assert.False(Procedura.VisiOpakovac(DruhProcedury.Odlozit));
        Assert.False(Procedura.VisiOpakovac(DruhProcedury.Spustit));
    }

    /// <summary>
    /// <b>Odložení a odvolání se nezaměňují.</b> Není to formalita: liší
    /// se v tom, kdy se smějí použít i jaký čas z nich vyjde, a kdyby
    /// aplikace nabídla obojí vždycky, startér by si vybíral podle jména,
    /// ne podle toho, co se stalo.
    /// </summary>
    [Fact]
    public void Odlozit_jde_pred_startem_a_odvolat_po_nem()
    {
        // Před startem: odložit ano, odvolat ne.
        Assert.Null(Procedura.ProcNejde(DruhProcedury.Odlozit, StavRozjizdky.Planovana, Ted));
        Assert.NotNull(Procedura.ProcNejde(DruhProcedury.Odvolat, StavRozjizdky.Planovana, Ted));

        // Po startu: odvolat ano, odložit ne.
        Assert.Null(Procedura.ProcNejde(DruhProcedury.Odvolat, StavRozjizdky.Probiha, Ted));
        Assert.NotNull(Procedura.ProcNejde(DruhProcedury.Odlozit, StavRozjizdky.Probiha, Ted));
    }

    /// <summary>
    /// Odložit se dá jen to, co má čas. Rozjížďka, která na startu teprve
    /// stojí bez termínu, nemá co odkládat — a hláška to má říct, místo
    /// aby úkon tiše prošel bez účinku.
    /// </summary>
    [Fact]
    public void Odlozit_rozjizdku_bez_casu_nejde()
    {
        var chyba = Procedura.ProcNejde(DruhProcedury.Odlozit, StavRozjizdky.Planovana, null);

        Assert.NotNull(chyba);
        Assert.Contains("není co odložit", chyba);
    }

    /// <summary>
    /// Spustit proceduru běžící rozjížďce by posunulo start dopředu a
    /// lodím, které podle prvního odpočtu najíždějí, vzalo minuty.
    /// Na nový start je odvolání.
    /// </summary>
    [Fact]
    public void Spustit_proceduru_bezici_rozjizdce_nejde()
    {
        var chyba = Procedura.ProcNejde(DruhProcedury.Spustit, StavRozjizdky.Probiha, Ted);

        Assert.NotNull(chyba);
        Assert.Contains("všeobecné odvolání", chyba);
    }

    /// <summary>Zrušená se nestartuje a dojetá se nejdřív pustí znovu.</summary>
    [Theory]
    [InlineData(StavRozjizdky.Zrusena)]
    [InlineData(StavRozjizdky.Dokoncena)]
    public void Na_zrusenou_a_dojetou_procedura_nesaha(StavRozjizdky stav)
    {
        foreach (var druh in Enum.GetValues<DruhProcedury>())
            Assert.NotNull(Procedura.ProcNejde(druh, stav, Ted));
    }

    /// <summary>
    /// Všechny úkony vracejí rozjížďku mezi plánované: procedura
    /// znamená, že se teprve pojede.
    /// </summary>
    [Theory]
    [InlineData(DruhProcedury.Spustit)]
    [InlineData(DruhProcedury.Odlozit)]
    [InlineData(DruhProcedury.Odvolat)]
    [InlineData(DruhProcedury.OpakovacDolu)]
    public void Po_procedure_je_rozjizdka_planovana(DruhProcedury druh)
    {
        Assert.Equal(StavRozjizdky.Planovana, Procedura.StavPo(druh));
    }

    /// <summary>
    /// <b>Opakováním startu je jen odvolání</b> (ZPJ 36). Odložená
    /// rozjížďka se nestartovala, takže se ani neopakuje — a počítadlo,
    /// které by ji počítalo, by tvrdilo, že se už jednou jelo.
    /// </summary>
    [Fact]
    public void Opakovanym_startem_je_jen_odvolani()
    {
        Assert.True(Procedura.JeOpakovanyStart(DruhProcedury.Odvolat));
        Assert.False(Procedura.JeOpakovanyStart(DruhProcedury.Odlozit));
        Assert.False(Procedura.JeOpakovanyStart(DruhProcedury.Spustit));
    }

    /// <summary>Délka procedury má meze — nesmysl se nemá uložit.</summary>
    [Theory]
    [InlineData(null, true)]
    [InlineData(5, true)]
    [InlineData(1, true)]
    [InlineData(60, true)]
    [InlineData(0, false)]
    [InlineData(-5, false)]
    [InlineData(61, false)]
    public void Delka_procedury_ma_meze(int? minut, bool projde)
    {
        Assert.Equal(projde, Procedura.ProcNejdeDelka(minut) is null);
    }

    /// <summary>
    /// <b>Podržený úkon startuje od chvíle stisku, ne od doručení.</b>
    /// Appka u vody odpočítává z vlastních hodin a úkon podrží, dokud
    /// nemá kam ho odeslat. Kdyby se pravidlo použilo na čas doručení,
    /// padl by start o celý výpadek později, než ho posádky slyšely.
    /// </summary>
    [Fact]
    public void Podrzeny_ukon_pocita_od_stisku()
    {
        var stisk = Ted;
        var doruceno = Ted.AddMinutes(3); // telefon chytil síť až teď

        var (kdy, proc) = CasKlienta.Kdy(stisk, doruceno);

        Assert.Equal(CasKlienta.Posun.Prijat, proc);
        Assert.Equal(stisk.AddMinutes(5), Procedura.NovyStart(DruhProcedury.Spustit, kdy, 5));
    }

    /// <summary>
    /// <b>Cizí hodiny se neberou naslepo.</b> Telefon s přenastaveným
    /// datem by jinak tiše posunul start a nikdo by si toho nevšiml;
    /// mimo okno platí server.
    /// </summary>
    [Fact]
    public void Rozhozene_hodiny_telefonu_start_neposunou()
    {
        var doruceno = Ted;

        var (zbudoucnosti, proc) = CasKlienta.Kdy(Ted.AddMinutes(10), doruceno);
        Assert.Equal(CasKlienta.Posun.ZBudoucnosti, proc);
        Assert.Equal(
            doruceno.AddMinutes(5),
            Procedura.NovyStart(DruhProcedury.Spustit, zbudoucnosti, 5));

        var (bezCasu, neuveden) = CasKlienta.Kdy(null, doruceno);
        Assert.Equal(CasKlienta.Posun.Neuveden, neuveden);
        Assert.Equal(doruceno, bezCasu);
    }
}

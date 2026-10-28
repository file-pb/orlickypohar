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
    /// <b>Po všeobecném odvolání volný není</b> — ZPJ 29.2: *„Vyzývací
    /// znamení nového startu odvolané třídy musí být dáno jednu minutu
    /// poté, co je první opakovač spuštěn."* Od vyzývacího znamení do
    /// startu pak uplyne celá procedura.
    /// </summary>
    [Fact]
    public void Vseobecne_odvolani_pocita_cas_z_pravidla()
    {
        Assert.Equal(
            Ted.AddMinutes(1 + 5),
            Procedura.NovyStart(DruhProcedury.Odvolat, Ted, 5));

        // A s delší procedurou se posune jen ta druhá část; minuta je z 29.2.
        Assert.Equal(
            Ted.AddMinutes(1 + 10),
            Procedura.NovyStart(DruhProcedury.Odvolat, Ted, 10));
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
    /// Všechny tři úkony vracejí rozjížďku mezi plánované: procedura
    /// znamená, že se teprve pojede.
    /// </summary>
    [Theory]
    [InlineData(DruhProcedury.Spustit)]
    [InlineData(DruhProcedury.Odlozit)]
    [InlineData(DruhProcedury.Odvolat)]
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
}

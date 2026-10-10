using OrlickyPohar.Api.Features.Boje;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla pípnutí bóje. Čisté funkce — tohle musí platit dřív, než se
/// cokoliv uloží, protože špatná poloha posune celou trať.
/// </summary>
public class PipnutiTests
{
    private static PipnutiVstup Bod(
        double sirka = 49.516, double delka = 14.165, double? presnost = 6, string? nazev = "Bóje 1",
        ZdrojPolohy? zdroj = null) =>
        new(nazev, 1, sirka, delka, presnost, null, zdroj);

    [Fact]
    public void Dobre_pipnuti_projde()
    {
        Assert.Null(Pipnuti.ProcNejde(Bod()));
        // Bez hlášené přesnosti taky: některé telefony ji nedávají.
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: null)));
    }

    [Fact]
    public void Nepresna_poloha_se_odmitne()
    {
        // Sto metrů znamená polohu ze sítě, ne z družic.
        Assert.NotNull(Pipnuti.ProcNejde(Bod(presnost: Pipnuti.NejhorsiPresnostM + 1)));
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: Pipnuti.NejhorsiPresnostM)));
    }

    [Fact]
    public void Poloha_mimo_Orlik_se_odmitne()
    {
        // Nejčastější překlep je prohozená šířka a délka — ta by bóji
        // postavila někam do Afriky a nikdo by si toho nevšiml.
        Assert.NotNull(Pipnuti.ProcNejde(Bod(sirka: 14.165, delka: 49.516)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(sirka: 50.1)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(delka: 16.8)));
    }

    [Fact]
    public void Poloha_z_mapy_jde_jen_bez_presnosti()
    {
        // Mapa nic neměří. Číslo u ní by bylo vymyšlené, a přesně kvůli
        // tomu se zdroj zavedl — dřív se „telefon přesnost nehlásí"
        // a „opsáno z mapy" slily do jednoho prázdného pole.
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: null, zdroj: ZdrojPolohy.Mapa)));
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: null, zdroj: ZdrojPolohy.Qr)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: ZdrojPolohy.Mapa)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: ZdrojPolohy.Qr)));
    }

    [Fact]
    public void Chybejici_zdroj_je_telefon()
    {
        // Klient, který o poli neví, posílá dál pravdu: jinudy než
        // pípnutím to dřív nešlo. Proto smí hlásit přesnost.
        Assert.Null(Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: null)));
        Assert.Equal(
            Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: null)),
            Pipnuti.ProcNejde(Bod(presnost: 6, zdroj: ZdrojPolohy.Telefon)));
    }

    [Fact]
    public void Mimo_Orlik_radi_mape_jinak_nez_telefonu()
    {
        // Telefon bez družic a prohozená šířka s délkou v odkazu jsou dvě
        // různé příčiny, takže věta nesmí být jedna pro obojí.
        var zTelefonu = Pipnuti.ProcNejde(Bod(sirka: 14.165, delka: 49.516));
        var zMapy = Pipnuti.ProcNejde(Bod(sirka: 14.165, delka: 49.516, presnost: null, zdroj: ZdrojPolohy.Mapa));

        Assert.NotNull(zTelefonu);
        Assert.NotNull(zMapy);
        Assert.NotEqual(zTelefonu, zMapy);
        Assert.Contains("družic", zTelefonu);
        Assert.Contains("prohodila", zMapy);
    }

    [Fact]
    public void Bez_jmena_to_nejde()
    {
        Assert.NotNull(Pipnuti.ProcNejde(Bod(nazev: null)));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(nazev: "   ")));
        Assert.NotNull(Pipnuti.ProcNejde(Bod(nazev: new string('a', Pipnuti.NazevNejvic + 1))));
    }

    /// <summary>
    /// <b>Plavidlo ani objekt na břehu nejsou kus plastu</b>, takže barva
    /// a tvar u nich nic neznamenají. Kdyby je směly nést, nakreslila by
    /// mapka u lodi komise červený válec a závodník by hledal bóji, která
    /// tam není.
    /// </summary>
    [Fact]
    public void Plavidlo_a_breh_nemaji_barvu_ani_tvar()
    {
        Assert.NotNull(Pipnuti.ProcNejde(
            Bod() with { Znaceni = DruhZnaceni.Plavidlo, Barva = BarvaBoje.Cervena }));
        Assert.NotNull(Pipnuti.ProcNejde(
            Bod() with { Znaceni = DruhZnaceni.Plavidlo, Tvar = TvarBoje.Valcova }));
        Assert.NotNull(Pipnuti.ProcNejde(
            Bod() with { Znaceni = DruhZnaceni.ObjektNaBrehu, Barva = BarvaBoje.Bila }));

        // Samotné plavidlo ano — poloha komisní lodi je měření jako každé jiné.
        Assert.Null(Pipnuti.ProcNejde(Bod() with { Znaceni = DruhZnaceni.Plavidlo }));
        Assert.Null(Pipnuti.ProcNejde(Bod() with { Znaceni = DruhZnaceni.ObjektNaBrehu }));
    }

    /// <summary>
    /// Barva a tvar u znaku plavební dráhy <b>se schválně nevynucují</b>.
    /// Vyhláškové kombinace jsou standard, ale server nemá odmítat zápis
    /// toho, co rozhodčí na vodě skutečně vidí — předvolba v obrazovce
    /// je nabídka, ne zákon.
    /// </summary>
    [Fact]
    public void Znak_drahy_smi_mit_jakoukoli_barvu()
    {
        Assert.Null(Pipnuti.ProcNejde(
            Bod() with { Znaceni = DruhZnaceni.DrahaPrava, Barva = BarvaBoje.Cervena, Tvar = TvarBoje.Valcova }));
        // Netypická kombinace projde taky: na vodě plave, co plave.
        Assert.Null(Pipnuti.ProcNejde(
            Bod() with { Znaceni = DruhZnaceni.DrahaPrava, Barva = BarvaBoje.Zluta, Tvar = TvarBoje.Kuzelova }));
    }

    /// <summary>
    /// Poznámka ke značce je krátká schválně — doplněk ke jménu, ne popis
    /// trati. Na ten je plachetní směrnice.
    /// </summary>
    [Fact]
    public void Dlouha_poznamka_se_odmitne()
    {
        Assert.Null(Pipnuti.ProcNejde(
            Bod() with { Popis = new string('a', Pipnuti.PopisNejvic) }));
        Assert.NotNull(Pipnuti.ProcNejde(
            Bod() with { Popis = new string('a', Pipnuti.PopisNejvic + 1) }));
        // Prázdná poznámka je v pořádku: píše se jen občas.
        Assert.Null(Pipnuti.ProcNejde(Bod() with { Popis = null }));
        Assert.Null(Pipnuti.ProcNejde(Bod() with { Popis = "   " }));
    }

    /// <summary>
    /// Co je bóje a co ne. Rozhoduje to, co u značky smí být vyplněné,
    /// takže se to měří zvlášť — a nová hodnota výčtu tím dostane otázku,
    /// na kterou musí někdo odpovědět.
    /// </summary>
    [Fact]
    public void Boje_je_vsechno_krome_plavidla_a_brehu()
    {
        Assert.True(Pipnuti.JeBoje(DruhZnaceni.DrahaPrava));
        Assert.True(Pipnuti.JeBoje(DruhZnaceni.DrahaLeva));
        Assert.True(Pipnuti.JeBoje(DruhZnaceni.DrahaSport));
        Assert.True(Pipnuti.JeBoje(DruhZnaceni.DrahaZakaz));
        Assert.True(Pipnuti.JeBoje(DruhZnaceni.NaseBoje));
        Assert.False(Pipnuti.JeBoje(DruhZnaceni.Plavidlo));
        Assert.False(Pipnuti.JeBoje(DruhZnaceni.ObjektNaBrehu));
    }
}

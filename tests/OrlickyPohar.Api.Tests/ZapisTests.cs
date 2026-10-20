using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Zápis výsledků rozjížďky. Čisté funkce, bez databáze — kdy se smí
/// přepisovat a co musí sada splnit, aby se uložila.
/// </summary>
public class ZapisTests
{
    private static ZapisRadek Radek(
        int id, string lod, string kategorie, int? poradi = null, KodVysledku? kod = null) =>
        new(new ZapisRadekVstup(id, poradi, kod), lod, kategorie);

    [Theory]
    [InlineData(StavVysledku.Navrzeno)]
    [InlineData(StavVysledku.KRevizi)]
    public void Prepsat_jde_navrh_a_vraceny_zapis(StavVysledku stav)
    {
        Assert.True(Zapis.Otevreny(stav));
        Assert.Null(Zapis.ProcNejdePrepsat(StavZavodu.Odjety, stav));
    }

    [Theory]
    [InlineData(StavVysledku.Overeno)]
    [InlineData(StavVysledku.Schvaleno)]
    [InlineData(StavVysledku.Potvrzeno)]
    [InlineData(StavVysledku.Eliminovano)]
    public void Podepsana_cisla_se_neprepisuji(StavVysledku stav)
    {
        // Od ověření čísla někdo podepsal. Oprava vede přes revizi s důvodem,
        // ne přes tiché přepsání.
        Assert.False(Zapis.Otevreny(stav));
        Assert.NotNull(Zapis.ProcNejdePrepsat(StavZavodu.Odjety, stav));
    }

    [Theory]
    [InlineData(StavZavodu.Vypsany)]
    [InlineData(StavZavodu.Odjety)]
    public void Zapisuje_se_od_vypsani(StavZavodu stav)
    {
        // V den závodu je zastávka často ještě vypsaná — přepnout ji na
        // odjetou je krok, na který se na břehu zapomene.
        Assert.Null(Zapis.ProcNejdeNaZavod(stav));
    }

    [Theory]
    [InlineData(StavZavodu.Planovany)]
    [InlineData(StavZavodu.Potvrzeny)]
    [InlineData(StavZavodu.Zruseny)]
    public void Pred_vypsanim_a_na_zrusenou_se_nezapisuje(StavZavodu stav)
    {
        Assert.NotNull(Zapis.ProcNejdeNaZavod(stav));
        Assert.NotNull(Zapis.ProcNejdePrepsat(stav, StavVysledku.Navrzeno));
    }

    [Fact]
    public void Prazdny_radek_znamena_bez_vysledku()
    {
        var radky = new[] { Radek(1, "LUNA", "Pod7m"), Radek(2, "SENDY", "Pod7m", poradi: 1) };

        Assert.Null(Zapis.ProcNejdeUlozit(radky));
        Assert.False(radky[0].MaVysledek);
        Assert.True(radky[1].MaVysledek);
    }

    [Fact]
    public void Poradi_i_kod_zaroven_neprojde()
    {
        // Bodování by pořadí vedle kódu nevzalo — zůstalo by číslo, které
        // vypadá, že platí.
        var chyba = Zapis.ProcNejdeUlozit([Radek(1, "LUNA", "Pod7m", poradi: 3, kod: KodVysledku.Ocs)]);

        Assert.Contains("LUNA", chyba);
    }

    [Fact]
    public void Poradi_zacina_jednickou()
    {
        Assert.NotNull(Zapis.ProcNejdeUlozit([Radek(1, "LUNA", "Pod7m", poradi: 0)]));
    }

    [Fact]
    public void Stejne_poradi_v_jedne_kategorii_neprojde()
    {
        var chyba = Zapis.ProcNejdeUlozit(
        [
            Radek(1, "LUNA", "Pod7m", poradi: 2),
            Radek(2, "SENDY", "Pod7m", poradi: 2),
        ]);

        Assert.Contains("LUNA", chyba);
        Assert.Contains("SENDY", chyba);
    }

    [Fact]
    public void Poradi_se_hlida_uvnitr_kategorie_ne_pres_cele_pole()
    {
        // Pořadatel, který čísluje každou kategorii zvlášť, nesmí dostat
        // chybu — body se počítají po kategoriích tak jako tak.
        Assert.Null(Zapis.ProcNejdeUlozit(
        [
            Radek(1, "LUNA", "Pod7m", poradi: 1),
            Radek(2, "VALHALLA", "Race", poradi: 1),
        ]));
    }

    [Fact]
    public void Cislovani_pres_cele_pole_s_mezerami_projde()
    {
        // Tak vypadá skutečný zápis z cíle: čísla jdou přes všechny lodě,
        // takže v kategorii zbydou mezery.
        Assert.Null(Zapis.ProcNejdeUlozit(
        [
            Radek(1, "VALHALLA", "Race", poradi: 1),
            Radek(2, "LUNA", "Pod7m", poradi: 2),
            Radek(3, "CAPRICE", "Race", poradi: 3),
            Radek(4, "SENDY", "Pod7m", poradi: 5),
        ]));
    }

    [Fact]
    public void Stejny_kod_smi_mit_vic_lodi()
    {
        Assert.Null(Zapis.ProcNejdeUlozit(
        [
            Radek(1, "LUNA", "Pod7m", kod: KodVysledku.Dnf),
            Radek(2, "SENDY", "Pod7m", kod: KodVysledku.Dnf),
        ]));
    }

    [Fact]
    public void Lod_dvakrat_v_zapisu_neprojde()
    {
        var chyba = Zapis.ProcNejdeUlozit(
        [
            Radek(1, "LUNA", "Pod7m", poradi: 1),
            Radek(1, "LUNA", "Pod7m", poradi: 4),
        ]);

        Assert.Contains("dvakrát", chyba);
    }

    [Fact]
    public void Nameny_cas_je_od_startu_do_dojezdu()
    {
        var start = new DateTimeOffset(2026, 6, 20, 11, 0, 0, TimeSpan.FromHours(2));

        Assert.Equal(TimeSpan.FromMinutes(42), Zapis.NamerenyCas(start, start.AddMinutes(42)));

        // Bez startu čas není, a dojezd před startem je špatně zmáčknutý
        // start, ne rekord.
        Assert.Null(Zapis.NamerenyCas(null, start));
        Assert.Null(Zapis.NamerenyCas(start, start.AddMinutes(-1)));
    }

    [Fact]
    public void Znak_se_orizne_a_prazdny_je_zadny()
    {
        Assert.Equal(("modrý spinakr", null), Zapis.UpravZnak("  modrý spinakr "));

        // Prázdné pole na obrazovce znak maže, neukládá mezeru.
        Assert.Equal((null, null), Zapis.UpravZnak("   "));
        Assert.Equal((null, null), Zapis.UpravZnak(null));
    }

    [Fact]
    public void Dlouhy_znak_neprojde()
    {
        var (znak, chyba) = Zapis.UpravZnak(new string('x', Zapis.ZnakNejvic + 1));

        Assert.Null(znak);
        Assert.NotNull(chyba);
    }

    [Theory]
    [InlineData(StavUcasti.Prihlasena, true)]
    [InlineData(StavUcasti.Potvrzena, true)]
    [InlineData(StavUcasti.Vyloucena, true)]
    [InlineData(StavUcasti.Pozadavek, false)]
    [InlineData(StavUcasti.KDoplneni, false)]
    [InlineData(StavUcasti.Odmitnuta, false)]
    [InlineData(StavUcasti.Zrusena, false)]
    [InlineData(StavUcasti.Nedostavila, false)]
    public void Na_regate_je_lod_na_startu(StavUcasti stav, bool naRegate)
    {
        // Vyloučená na startu byla — výsledky má, jen neplatí. Požadavek
        // z webu pořadatel ještě nepřijal, takže tlačítko v cíli nedostane.
        Assert.Equal(naRegate, Zapis.NaRegate(stav));
    }

    [Fact]
    public void Zapis_bez_revize_neprojde()
    {
        // Není to „tak tedy bez kontroly": uložení maže lodě, které v sadě
        // nejsou, takže sada odeslaná naslepo umí smazat opravu, o které
        // klient nevěděl (oponentura, 5. 10. 2026).
        Assert.Equal(Zapis.RevizeChybi, Zapis.ProcNejdeUlozitRevizi(null, 3));
    }

    [Fact]
    public void Starsi_revize_neprepise_novejsi()
    {
        // Telefon bez signálu drží sadu z revize 2, zatímco na webu už někdo
        // uložil revizi 3. Jeho uložení by novější opravu smazalo.
        Assert.Equal(Zapis.RevizeNesedi, Zapis.ProcNejdeUlozitRevizi(2, 3));

        // I novější číslo, než jaké server zná, je nesoulad — klient vychází
        // z něčeho, co tady nevzniklo.
        Assert.Equal(Zapis.RevizeNesedi, Zapis.ProcNejdeUlozitRevizi(4, 3));
    }

    [Fact]
    public void Shodna_revize_projde()
        => Assert.Null(Zapis.ProcNejdeUlozitRevizi(3, 3));

    [Fact]
    public void Prvni_zapis_vychazi_z_nulove_revize()
        => Assert.Null(Zapis.ProcNejdeUlozitRevizi(0, 0));

    [Fact]
    public void Ulozeno_je_bez_chyby_a_bez_konfliktu()
    {
        // `new(null)` se u recordu rozhodne pro kopírovací konstruktor
        // a spadne při inicializaci typu — překladač to nehlásí a pozná se
        // to až za běhu, v integračním testu. Tenhle test to drží.
        Assert.Null(VysledekUlozeni.Ulozeno.Chyba);
        Assert.False(VysledekUlozeni.Ulozeno.Konflikt);
    }

    /// <summary>
    /// <b>Rozjížďka dojede, až mají výsledek všichni na vodě.</b>
    ///
    /// <para>
    /// Objeveno 15. 10. 2026 při průchodu scénáři Izolepy: <c>Dokoncena</c>
    /// se nenastavovalo nikde a jediný přechod v API byl
    /// <c>Planovana → Probiha</c> při startu. Rozjížďka proto zůstala
    /// „probíhá" i po schválení a publikaci — tabule hlásila „jede se",
    /// alert „rozjížďka dojeta" nevyjel nikdy a veřejná trať se po dojetí
    /// první rozjížďky už neposunula na další.
    /// </para>
    /// </summary>
    [Fact]
    public void Dojeto_az_maji_vysledek_vsichni_na_vode()
    {
        (StavUcasti, bool)[] jednaCeka =
            [(StavUcasti.Potvrzena, true), (StavUcasti.Prihlasena, false)];

        Assert.Equal(
            StavRozjizdky.Probiha,
            Zapis.StavPoZapisu(StavRozjizdky.Probiha, true, jednaCeka));

        // Kód je taky vyřízení — na loď s DNF se nečeká.
        Assert.Equal(
            StavRozjizdky.Dokoncena,
            Zapis.StavPoZapisu(StavRozjizdky.Probiha, true,
                [(StavUcasti.Potvrzena, true), (StavUcasti.Potvrzena, true)]));
    }

    /// <summary>
    /// Kdo na vodě není, rozjížďku nedrží — a vyloučená loď své výsledky má,
    /// takže se počítá. Stejné rozdělení jako <see cref="Zapis.NaRegate"/>.
    /// </summary>
    [Theory]
    [InlineData(StavUcasti.Zrusena, StavRozjizdky.Dokoncena)]
    [InlineData(StavUcasti.Nedostavila, StavRozjizdky.Dokoncena)]
    [InlineData(StavUcasti.Pozadavek, StavRozjizdky.Dokoncena)]
    [InlineData(StavUcasti.Vyloucena, StavRozjizdky.Probiha)]
    [InlineData(StavUcasti.Prihlasena, StavRozjizdky.Probiha)]
    public void Ceka_se_jen_na_lode_na_vode(StavUcasti druha, StavRozjizdky cekam)
    {
        Assert.Equal(
            cekam,
            Zapis.StavPoZapisu(StavRozjizdky.Probiha, true,
                [(StavUcasti.Potvrzena, true), (druha, false)]));
    }

    /// <summary>
    /// Oprava vrací rozjížďku zpátky: smazaný dojezd nesmí nechat dojetou
    /// rozjížďku s dírou. Bez startu se vrací mezi plánované — do rozjížďky
    /// přepisované z papíru se nikdy nestartovalo.
    /// </summary>
    [Theory]
    [InlineData(true, StavRozjizdky.Probiha)]
    [InlineData(false, StavRozjizdky.Planovana)]
    public void Smazany_dojezd_vrati_rozjizdku_zpatky(bool odstartovano, StavRozjizdky cekam)
    {
        Assert.Equal(
            cekam,
            Zapis.StavPoZapisu(StavRozjizdky.Dokoncena, odstartovano,
                [(StavUcasti.Potvrzena, true), (StavUcasti.Potvrzena, false)]));
    }

    /// <summary>
    /// Zrušená rozjížďka se nejede, ať je v ní zapsáno cokoliv. A prázdná
    /// regata nedojede sama od sebe — bez lodí na vodě není co dojet.
    /// </summary>
    [Fact]
    public void Zrusena_a_prazdna_rozjizdka_stav_nemeni()
    {
        Assert.Equal(
            StavRozjizdky.Zrusena,
            Zapis.StavPoZapisu(StavRozjizdky.Zrusena, true,
                [(StavUcasti.Potvrzena, true)]));

        Assert.Equal(
            StavRozjizdky.Probiha,
            Zapis.StavPoZapisu(StavRozjizdky.Probiha, true, []));
    }

    /// <summary>
    /// <b>Zastavená časomíra uzavře rozjížďku bez ohledu na zápis</b>
    /// (Filip, 20. 10. 2026: *„lodě bez cíle dopíšeme, ale čas už
    /// zastav"*). Dokud to uměl jen zápis, rozjížďka se dvěma lodmi bez
    /// dojezdu zůstávala „jede se" i hodinu po tom, co se na vodě
    /// dojezdilo.
    /// </summary>
    [Fact]
    public void Zastaveny_cas_rozjizdku_dojede_i_bez_zapisu()
    {
        // Dvě lodě na vodě, jen jedna zapsaná — bez zastavení se jede dál.
        var jednaCeka = new[] { (StavUcasti.Potvrzena, true), (StavUcasti.Potvrzena, false) };

        Assert.Equal(
            StavRozjizdky.Probiha,
            Zapis.StavPoZapisu(StavRozjizdky.Probiha, true, jednaCeka));

        Assert.Equal(
            StavRozjizdky.Dokoncena,
            Zapis.StavPoZapisu(StavRozjizdky.Probiha, true, jednaCeka, casZastaven: true));

        // Ani prázdná rozjížďka nezůstane viset: zastavit čas je rozhodnutí
        // pořadatele, ne dopočet z toho, kdo dojel.
        Assert.Equal(
            StavRozjizdky.Dokoncena,
            Zapis.StavPoZapisu(StavRozjizdky.Probiha, true, [], casZastaven: true));
    }

    /// <summary>
    /// <b>Zrušená zůstane zrušená</b>, i když někdo zastaví čas. „Neplatí
    /// nikde" není stupeň rozpracovanosti a zastavení časomíry z ní
    /// rozjížďku nedělá.
    /// </summary>
    [Fact]
    public void Zastaveny_cas_zrusenou_rozjizdku_neoziví()
    {
        Assert.Equal(
            StavRozjizdky.Zrusena,
            Zapis.StavPoZapisu(StavRozjizdky.Zrusena, true,
                [(StavUcasti.Potvrzena, true)], casZastaven: true));
    }

    /// <summary>
    /// Puštění časomíry zpátky vrátí rozhodování zápisu: dojetá rozjížďka
    /// s nedopsanou lodí se zase jede.
    /// </summary>
    [Fact]
    public void Pusteni_casu_vrati_rozhodovani_zapisu()
    {
        var jednaCeka = new[] { (StavUcasti.Potvrzena, true), (StavUcasti.Potvrzena, false) };

        Assert.Equal(
            StavRozjizdky.Probiha,
            Zapis.StavPoZapisu(StavRozjizdky.Dokoncena, true, jednaCeka, casZastaven: false));

        // Bez startu spadne až na plánovanou — nedojetá rozjížďka, co se
        // nikdy nerozjela.
        Assert.Equal(
            StavRozjizdky.Planovana,
            Zapis.StavPoZapisu(StavRozjizdky.Dokoncena, false, jednaCeka, casZastaven: false));
    }
}

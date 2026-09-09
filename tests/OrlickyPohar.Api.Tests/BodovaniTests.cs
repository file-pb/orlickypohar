using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Body závodu z rozjížděk. Čisté funkce, žádná databáze.
/// <para>
/// Doložené případy jsou z výsledkové listiny <b>FxCK Cancer 2026</b>,
/// kategorie nad 7 m: dvě rozjížďky, čtrnáct lodí. V první má Caprice
/// <c>DNF</c> a třináct bodů, Thea <c>DNS</c> a čtrnáct. Ve druhé žádný
/// <c>DNF</c> nebyl, takže všechny lodě s <c>DNS</c> spadly na dvanáct.
/// Zbytek testů hlídá pravidla, která z listiny plynou, ale samy o sobě
/// v ní vidět nejsou.
/// </para>
/// </summary>
public class BodovaniTests
{
    private static VysledekVstup Dojel(string lod, string kategorie, int poradiVCili) =>
        new(lod, kategorie, poradiVCili, null);

    private static VysledekVstup Kod(string lod, string kategorie, KodVysledku kod) =>
        new(lod, kategorie, null, kod);

    /// <summary>Rozjížďka jedné kategorie: lodě v tom pořadí, v jakém dojely.</summary>
    private static RozjizdkaVstup Rozjizdka(int cislo, params string[] vPoradi) =>
        new(cislo, [.. vPoradi.Select((lod, i) => Dojel(lod, "Race", i + 1))]);

    private static Dictionary<string, int> Body(params VysledekVstup[] vysledky) =>
        Bodovani.BodyRozjizdky(vysledky).ToDictionary(b => b.Lod, b => b.Body);

    // --- Jedna rozjížďka ---

    [Fact]
    public void Vitez_kategorie_ma_jeden_bod_a_dalsi_jdou_po_sobe()
    {
        var body = Body(
            Dojel("první", "Race", 1),
            Dojel("druhá", "Race", 2),
            Dojel("třetí", "Race", 3));

        Assert.Equal(1, body["první"]);
        Assert.Equal(2, body["druhá"]);
        Assert.Equal(3, body["třetí"]);
    }

    [Fact]
    public void Body_jsou_poradi_v_kategorii_ne_v_celem_poli()
    {
        // Lodě dojely v poli druhá, pátá a devátá, ale v kategorii jsou
        // první tři. Do bodů jde pořadí uvnitř kategorie — jinak by malá
        // kategorie sbírala vysoká čísla jen proto, že je pomalejší.
        var body = Body(
            Dojel("mamba", "Nad7m", 2),
            Dojel("pezi", "Nad7m", 5),
            Dojel("depresso", "Nad7m", 9));

        Assert.Equal(1, body["mamba"]);
        Assert.Equal(2, body["pezi"]);
        Assert.Equal(3, body["depresso"]);
    }

    [Fact]
    public void Dnf_je_prvni_misto_za_dokoncivsimi_a_Dns_hned_za_nim()
    {
        // Doloženo: FxCK Cancer 2026, první rozjížďka nad 7 m.
        var body = Body([.. Dokoncilo(12), Kod("caprice", "Nad7m", KodVysledku.Dnf), Kod("thea", "Nad7m", KodVysledku.Dns)]);

        Assert.Equal(13, body["caprice"]);
        Assert.Equal(14, body["thea"]);
    }

    [Fact]
    public void Bez_Dnf_spadne_Dns_na_prvni_volne_misto()
    {
        // Doloženo: FxCK Cancer 2026, druhá rozjížďka nad 7 m. Není to pevné
        // „+2" za DNS — je to další místo v řadě za posledním, kdo dojel.
        var body = Body([.. Dokoncilo(11),
            Kod("caprice", "Nad7m", KodVysledku.Dns),
            Kod("thea", "Nad7m", KodVysledku.Dns),
            Kod("luna", "Nad7m", KodVysledku.Dns)]);

        Assert.Equal(12, body["caprice"]);
        Assert.Equal(12, body["thea"]);
        Assert.Equal(12, body["luna"]);
    }

    [Fact]
    public void Stejny_kod_znamena_stejne_body_i_kdyz_je_kodu_vic_druhu()
    {
        var body = Body([.. Dokoncilo(3),
            Kod("a", "Nad7m", KodVysledku.Dnf),
            Kod("b", "Nad7m", KodVysledku.Dnf),
            Kod("c", "Nad7m", KodVysledku.Dns),
            Kod("d", "Nad7m", KodVysledku.Dns)]);

        Assert.Equal(4, body["a"]);
        Assert.Equal(4, body["b"]);
        Assert.Equal(5, body["c"]);
        Assert.Equal(5, body["d"]);
    }

    [Fact]
    public void Kody_jdou_za_sebou_podle_zavaznosti()
    {
        // Doložené je jen pořadí DNF před DNS. Zbytek je náš odhad podle
        // logiky „kdo víc odjel, je na tom líp" — tenhle test ho drží
        // napsaný, aby se dal ukázat rozhodčímu a případně změnit na
        // jediném místě.
        var body = Body([.. Dokoncilo(1),
            Kod("rdg", "Race", KodVysledku.Rdg),
            Kod("ret", "Race", KodVysledku.Ret),
            Kod("dnf", "Race", KodVysledku.Dnf),
            Kod("ocs", "Race", KodVysledku.Ocs),
            Kod("dsq", "Race", KodVysledku.Dsq),
            Kod("dns", "Race", KodVysledku.Dns),
            Kod("dnc", "Race", KodVysledku.Dnc)]);

        Assert.Equal([2, 3, 4, 5, 6, 7, 8],
            new[] { "rdg", "ret", "dnf", "ocs", "dsq", "dns", "dnc" }.Select(l => body[l]));
    }

    [Fact]
    public void Kdyz_nikdo_nedojel_zacinaji_kody_od_jednicky()
    {
        var body = Body(
            Kod("a", "Race", KodVysledku.Dnf),
            Kod("b", "Race", KodVysledku.Dns));

        Assert.Equal(1, body["a"]);
        Assert.Equal(2, body["b"]);
    }

    [Fact]
    public void Kazda_kategorie_ma_vlastni_radu_od_jednicky()
    {
        var vysledky = new[]
        {
            Dojel("race1", "Race", 1),
            Dojel("nad1", "Nad7m", 2),
            Dojel("race2", "Race", 3),
            Dojel("nad2", "Nad7m", 4),
        };

        var zavod = Bodovani.VysledkyZavodu([new RozjizdkaVstup(1, vysledky)])
            .ToDictionary(v => v.Lod);

        Assert.Equal(1, zavod["race1"].Body);
        Assert.Equal(1, zavod["nad1"].Body);
        Assert.Equal(2, zavod["race2"].Body);
        Assert.Equal(2, zavod["nad2"].Body);
        Assert.Equal(1, zavod["nad1"].Poradi);
    }

    // --- Celý závod ---

    [Fact]
    public void Body_zavodu_jsou_souctem_rozjizdek_vcetne_kodu()
    {
        // Caprice: DNF ve dvanáctičlenném poli (13) a DNS v jedenáctičlenném
        // (12) — za závod 25. Každá rozjížďka se počítá zvlášť.
        var zavod = FxckCancerNad7m();
        var caprice = zavod.Single(v => v.Lod == "caprice");

        Assert.Equal(25, caprice.Body);
        Assert.Equal([13, 12], caprice.Rozjizdky.Select(r => r.Body));
    }

    [Fact]
    public void Dve_prvni_mista_znamenaji_dva_body_a_vitezstvi()
    {
        // Sea Mouse III byla v obou rozjížďkách první v RACE → 1 + 1 = 2.
        var zavod = Bodovani.VysledkyZavodu(
        [
            Rozjizdka(1, "sea mouse iii", "druhá"),
            Rozjizdka(2, "sea mouse iii", "druhá"),
        ]);

        var vitez = zavod.Single(v => v.Poradi == 1);
        Assert.Equal("sea mouse iii", vitez.Lod);
        Assert.Equal(2, vitez.Body);
    }

    [Fact]
    public void Lod_boduje_jen_z_rozjizdek_kterych_se_ucastnila()
    {
        // Loď bez výsledku v rozjížďce není loď s kódem: nepřijela, takže
        // nemá co dostat. Kód by musel být v datech.
        var zavod = Bodovani.VysledkyZavodu(
        [
            Rozjizdka(1, "a", "b", "c"),
            Rozjizdka(2, "a", "c"),
        ]).ToDictionary(v => v.Lod);

        Assert.Equal(2, zavod["a"].Body);
        Assert.Equal(2, zavod["b"].Body);
        Assert.Single(zavod["b"].Rozjizdky);
    }

    [Fact]
    public void Skrt_zahodi_nejhorsi_rozjizdku_a_oznaci_ji()
    {
        var zavod = Bodovani.VysledkyZavodu(
        [
            Rozjizdka(1, "a", "b", "c"),
            Rozjizdka(2, "b", "c", "a"),
            Rozjizdka(3, "b", "a", "c"),
        ], pocetSkrtu: 1);

        var a = zavod.Single(v => v.Lod == "a");
        // Jedna, tři, dvě → škrtne se trojka a zůstanou tři body.
        Assert.Equal(3, a.Body);
        Assert.Equal([false, true, false], a.Rozjizdky.Select(r => r.Skrtnuto));
    }

    [Fact]
    public void Skrt_nikdy_nezahodi_posledni_vysledek()
    {
        // Vytrvalostní závod má jednu rozjížďku. Kdyby se z ní škrtlo,
        // hodnotil by se závod, ve kterém se nic nejelo.
        var zavod = Bodovani.VysledkyZavodu(
            [Rozjizdka(1, "b", "c", "d", "a")], pocetSkrtu: 2);

        var a = zavod.Single(v => v.Lod == "a");
        Assert.Equal(4, a.Body);
        Assert.All(a.Rozjizdky, r => Assert.False(r.Skrtnuto));
    }

    [Fact]
    public void Bez_skrtu_se_pocita_vsechno()
    {
        var zavod = Bodovani.VysledkyZavodu(
        [
            Rozjizdka(1, "a", "b", "c", "d", "e"),
            Rozjizdka(2, "b", "c", "d", "e", "a"),
        ]);

        Assert.Equal(6, zavod.Single(v => v.Lod == "a").Body);
    }

    [Fact]
    public void Pri_shode_bodu_rozhoduje_lepsi_jednotlivy_vysledek()
    {
        var zavod = Bodovani.VysledkyZavodu(
        [
            Rozjizdka(1, "vyhrala", "stabilni", "rychla", "pomala"),
            Rozjizdka(2, "rychla", "pomala", "stabilni", "vyhrala"),
        ]).ToDictionary(v => v.Lod);

        // Vyhrála 1 + 4, stabilní 2 + 3 — pět bodů obě. Rozhodne lepší
        // jednotlivý výsledek, takže je vyhrála napřed; a bude napřed
        // i při každém dalším výpočtu, protože pravidlo nezávisí na
        // pořadí vstupu.
        Assert.Equal(5, zavod["vyhrala"].Body);
        Assert.Equal(5, zavod["stabilni"].Body);
        Assert.Equal(2, zavod["vyhrala"].Poradi);
        Assert.Equal(3, zavod["stabilni"].Poradi);
    }

    [Fact]
    public void Poradi_je_uvnitr_kategorie_a_serazene_podle_bodu()
    {
        var zavod = FxckCancerNad7m();

        Assert.Equal([1, 2, 3], zavod.Where(v => v.Poradi <= 3).OrderBy(v => v.Poradi).Select(v => v.Poradi));
        Assert.Equal("l01", zavod.Single(v => v.Poradi == 1).Lod);

        // Lodě s kódy skončí na konci kategorie, ne mimo ni.
        Assert.Equal(14, zavod.Count);
        Assert.Equal("thea", zavod.Single(v => v.Poradi == 14).Lod);
    }

    [Fact]
    public void Pri_uplne_shode_rozhoduje_ceska_abeceda()
    {
        // Dvě lodě se stejným kódem mají všechno stejné — body i nejlepší
        // výsledek — takže rozhodne až jméno. A `Č` patří hned za `C`, ne
        // za `Z`: ordinálně by to vyšlo obráceně a přesně to se dělo
        // v produkčním kontejneru bez ICU.
        var zavod = Bodovani.VysledkyZavodu(
        [
            new RozjizdkaVstup(1,
            [
                Dojel("SOCKA", "Race", 1),
                Kod("Zephyr", "Race", KodVysledku.Ret),
                Kod("ČERVENÉ CAFE", "Race", KodVysledku.Ret),
            ]),
        ]).ToDictionary(v => v.Lod);

        Assert.Equal(zavod["Zephyr"].Body, zavod["ČERVENÉ CAFE"].Body);
        Assert.Equal(2, zavod["ČERVENÉ CAFE"].Poradi);
        Assert.Equal(3, zavod["Zephyr"].Poradi);
    }

    // --- Závod → body do seriálu ---

    [Fact]
    public void Do_serie_ma_vitez_nulu_a_dalsi_o_jedna_vic()
    {
        // Dvě různé stupnice, ne jedna posunutá: v závodě má vítěz jeden bod,
        // v seriálu nulu. Kdo to napíše jako jedno pravidlo, dostane všude
        // posun o jedničku — a ten se projeví až u lodí se stejným součtem.
        var zavod = Bodovani.VysledkyZavodu([Rozjizdka(1, "první", "druhá", "třetí")]);

        var doSerie = SerieBodovani.BodyDoSerie(zavod).ToDictionary(v => v.Lod, v => v.Body);

        Assert.Equal(0, doSerie["první"]);
        Assert.Equal(1, doSerie["druhá"]);
        Assert.Equal(2, doSerie["třetí"]);
    }

    [Fact]
    public void Do_serie_si_kazda_kategorie_zacina_od_nuly()
    {
        var zavod = Bodovani.VysledkyZavodu(
        [
            new RozjizdkaVstup(1,
            [
                Dojel("race1", "Race", 1),
                Dojel("nad1", "Nad7m", 2),
                Dojel("race2", "Race", 3),
                Dojel("nad2", "Nad7m", 4),
            ]),
        ]);

        var doSerie = SerieBodovani.BodyDoSerie(zavod).ToDictionary(v => v.Lod);

        Assert.Equal(0, doSerie["race1"].Body);
        Assert.Equal(0, doSerie["nad1"].Body);
        Assert.Equal("Nad7m", doSerie["nad1"].Kategorie);
        Assert.Equal(1, doSerie["nad2"].Body);
    }

    [Fact]
    public void Koeficient_nasobi_a_zaokrouhluje_nahoru_od_pulky()
    {
        // Žádná zastávka ročníku 2026 koeficient jiný než 1 nemá, takže
        // zaokrouhlení je nedoložené. Test ho drží aspoň napsaný — až první
        // takový závod vznikne, je tohle místo, kde se to potvrdí u rozhodčího.
        var zavod = Bodovani.VysledkyZavodu([Rozjizdka(1, "a", "b", "c", "d")]);

        var pulky = SerieBodovani.BodyDoSerie(zavod, koeficient: 0.5m)
            .ToDictionary(v => v.Lod, v => v.Body);

        Assert.Equal(0, pulky["a"]);   // 0 × 0,5
        Assert.Equal(1, pulky["b"]);   // 1 × 0,5 = 0,5 → nahoru
        Assert.Equal(1, pulky["c"]);   // 2 × 0,5
        Assert.Equal(2, pulky["d"]);   // 3 × 0,5 = 1,5 → nahoru
    }

    [Fact]
    public void Lod_s_kodem_dostane_do_serie_poradi_ze_sve_kategorie()
    {
        // Doklad z sešitu rozhodčího: ČERVENÉ CAFE si ze 24hodinovky odneslo
        // dvacítku z celkového pořadí, protože loď s kódem nemá pořadí
        // v kategorii a ruční přepočet neměl pravidlo. V seriálu je to víc
        // než součet čtyř běžných závodů.
        var zavod = Bodovani.VysledkyZavodu(
        [
            new RozjizdkaVstup(1,
            [
                Dojel("race1", "Race", 1),
                Dojel("race2", "Race", 2),
                Kod("odstoupila", "Race", KodVysledku.Ret),
                .. Dokoncilo(12),
            ]),
        ]);

        var doSerie = SerieBodovani.BodyDoSerie(zavod).ToDictionary(v => v.Lod, v => v.Body);

        // Třetí v RACE, ne patnáctá v poli.
        Assert.Equal(2, doSerie["odstoupila"]);
    }

    /// <summary>Dvanáct lodí, které dojely, v kategorii nad 7 m.</summary>
    private static VysledekVstup[] Dokoncilo(int kolik) =>
        [.. Enumerable.Range(1, kolik).Select(i => Dojel($"l{i:00}", "Nad7m", i))];

    /// <summary>
    /// Nad 7 m na FxCK Cancer 2026: dvě rozjížďky, čtrnáct lodí. V první
    /// dvanáct dojelo, Caprice odstoupila a Thea nevyjela; ve druhé dojelo
    /// jedenáct a tři lodě nevyjely.
    /// </summary>
    private static IReadOnlyList<VysledekZavodu> FxckCancerNad7m() =>
        Bodovani.VysledkyZavodu(
        [
            new RozjizdkaVstup(1,
            [
                .. Dokoncilo(12),
                Kod("caprice", "Nad7m", KodVysledku.Dnf),
                Kod("thea", "Nad7m", KodVysledku.Dns),
            ]),
            new RozjizdkaVstup(2,
            [
                .. Dokoncilo(11),
                Kod("l12", "Nad7m", KodVysledku.Dns),
                Kod("caprice", "Nad7m", KodVysledku.Dns),
                Kod("thea", "Nad7m", KodVysledku.Dns),
            ]),
        ]);
}

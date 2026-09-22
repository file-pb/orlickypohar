using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Body závodu z rozjížděk. Čisté funkce, žádná databáze.
/// <para>
/// Vzorový závod je <b>FxCK Cancer 2026</b>, kategorie nad 7 m: dvě
/// rozjížďky, čtrnáct lodí. Kódy se od 22. 9. 2026 bodují podle ZPJ A5.2
/// (přihlášených + 1), ne podle tehdejší listiny.
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
    public void Dnf_i_Dns_maji_pocet_prihlasenych_plus_jedna()
    {
        // ZPJ A5.2 a rozhodčí (22. 9. 2026). FxCK Cancer 2026, první rozjížďka
        // nad 7 m: čtrnáct lodí, dvanáct dojelo. Listina tehdy dala DNF 13
        // a DNS 14; podle pravidel mají obě 15.
        var body = Body([.. Dokoncilo(12), Kod("caprice", "Nad7m", KodVysledku.Dnf), Kod("thea", "Nad7m", KodVysledku.Dns)]);

        Assert.Equal(15, body["caprice"]);
        Assert.Equal(15, body["thea"]);
    }

    [Fact]
    public void Vsechny_tresty_maji_stejne_body_rdg_ne()
    {
        // Jeden dojel, sedm kódů: přihlášených osm, trest devět. Náprava
        // není trest — dokud ji neumí fáze 5, je hned za posledním.
        var body = Body([.. Dokoncilo(1),
            Kod("rdg", "Race", KodVysledku.Rdg),
            Kod("ret", "Race", KodVysledku.Ret),
            Kod("dnf", "Race", KodVysledku.Dnf),
            Kod("ocs", "Race", KodVysledku.Ocs),
            Kod("dsq", "Race", KodVysledku.Dsq),
            Kod("dns", "Race", KodVysledku.Dns),
            Kod("dnc", "Race", KodVysledku.Dnc)]);

        Assert.Equal(2, body["rdg"]);
        Assert.All(new[] { "ret", "dnf", "ocs", "dsq", "dns", "dnc" }, l => Assert.Equal(9, body[l]));
    }

    [Fact]
    public void Prihlaseni_se_pocitaji_z_celeho_zavodu_ne_z_rozjizdky()
    {
        // Ve druhé rozjížďce chybí loď „c" úplně, přihlášené jsou ale tři.
        var zavod = Bodovani.VysledkyZavodu(
        [
            new RozjizdkaVstup(1, [Dojel("a", "Race", 1), Dojel("b", "Race", 2), Dojel("c", "Race", 3)]),
            new RozjizdkaVstup(2, [Dojel("a", "Race", 1), Kod("b", "Race", KodVysledku.Dnf)]),
        ]).ToDictionary(v => v.Lod);

        Assert.Equal(4, zavod["b"].Rozjizdky.Single(r => r.Cislo == 2).Body);
    }

    [Fact]
    public void Kdyz_nikdo_nedojel_maji_vsichni_prihlasenych_plus_jedna()
    {
        var body = Body(
            Kod("a", "Race", KodVysledku.Dnf),
            Kod("b", "Race", KodVysledku.Dns));

        Assert.Equal(3, body["a"]);
        Assert.Equal(3, body["b"]);
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
        // Caprice: DNF a DNS, čtrnáct přihlášených — 15 + 15. Každá
        // rozjížďka se počítá zvlášť a pak se sečtou.
        var zavod = FxckCancerNad7m();
        var caprice = zavod.Single(v => v.Lod == "caprice");

        Assert.Equal(30, caprice.Body);
        Assert.Equal([15, 15], caprice.Rozjizdky.Select(r => r.Body));
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
    public void Pri_uplne_shode_umisteni_rozhoduje_posledni_rozjizdka()
    {
        // ZPJ A8.2, doloženo listinou FxCK Cancer 2026 v Race: SOCKA 3 + 4,
        // FAR STAR III 4 + 3 (pořadí v kategorii). Stejné body i stejná
        // umístění; ve druhé rozjížďce byla SOCKA lepší, takže je třetí.
        // Abecedně by vyhrála FAR STAR — tak to počítal kód do 22. 9. 2026.
        var zavod = Bodovani.VysledkyZavodu(
        [
            Rozjizdka(1, "sea mouse", "modre", "far star", "socka"),
            Rozjizdka(2, "sea mouse", "modre", "socka", "far star"),
        ]).ToDictionary(v => v.Lod);

        Assert.Equal(3, zavod["socka"].Poradi);
        Assert.Equal(4, zavod["far star"].Poradi);
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
        // I u závodu na celé pole jde do seriálu pořadí z kategorie. Dvacítka
        // ČERVENÉHO CAFE ze 24hodinovky s tím nesouvisí — je to diskvalifikace,
        // viz Diskvalifikace_v_zavode_je_dvacet_bodu.
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

    // --- Pravidla seriálu podle rozhodčího (22. 9. 2026) ---

    [Fact]
    public void Na_24hodinovce_ma_vitez_minus_jedna()
    {
        // „Za účast ve 24hodinovce bodové zvýhodnění: 1. místo −1 bod,
        // 2. místo 0 bodů, 3. místo 1." Posun, ne násobek.
        var zavod = Bodovani.VysledkyZavodu([Rozjizdka(1, "první", "druhá", "třetí")]);

        var doSerie = SerieBodovani.BodyDoSerie(zavod, posun: -1).ToDictionary(v => v.Lod);

        Assert.Equal(-1, doSerie["první"].Body);
        Assert.Equal(0, doSerie["druhá"].Body);
        Assert.Equal(1, doSerie["třetí"].Body);
        Assert.Equal(1, doSerie["první"].Misto);
    }

    [Fact]
    public void Neucast_dostane_pocet_lodi_kategorie_na_zastavce()
    {
        // „Loď se neúčastnila regaty: stejný počet bodů, jako je lodí ve
        // třídě." Sešit to dokládá u všech zastávek: nad 7 m na Jarním větru
        // jelo osm lodí a kdo nejel, má osm. Počítá se kategorie, ne celé pole.
        var zavod = Bodovani.VysledkyZavodu(
        [
            new RozjizdkaVstup(1,
            [
                Dojel("race1", "Race", 1),
                Dojel("nad1", "Nad7m", 2),
                Dojel("nad2", "Nad7m", 3),
                Kod("nad3", "Nad7m", KodVysledku.Dnf),
            ]),
        ]);

        var doSerie = SerieBodovani.BodyDoSerie(zavod,
            [("race1", "Race"), ("race2", "Race"), ("nad1", "Nad7m"), ("doma", "Nad7m")])
            .ToDictionary(v => v.Lod);

        Assert.Equal(3, doSerie["doma"].Body);
        Assert.Equal("DNC", doSerie["doma"].Kod);
        Assert.Null(doSerie["doma"].Misto);
        Assert.Equal(1, doSerie["race2"].Body);
        Assert.Equal(6, doSerie.Count);   // čtyři na vodě a dvě neúčasti
    }

    [Fact]
    public void Neucast_pocita_i_prihlasene_lode_ktere_neprijely()
    {
        // „Musí to být podle přihlášených lodí do závodu" (rozhodčí,
        // 22. 9. 2026). Dojely dvě, přihlášené byly čtyři → neúčast 4.
        var prihlaseno = new Dictionary<string, int> { ["Race"] = 4 };
        var zavod = Bodovani.VysledkyZavodu([Rozjizdka(1, "a", "b")], prihlaseno: prihlaseno);

        var doSerie = SerieBodovani.BodyDoSerie(zavod, [("doma", "Race")], prihlasenoDoZavodu: prihlaseno)
            .ToDictionary(v => v.Lod);

        Assert.Equal(4, doSerie["doma"].Body);
    }

    [Fact]
    public void Kod_v_rozjizdce_pocita_s_prihlasenymi_do_zavodu()
    {
        // Pět přihlášených, v rozjížďce jen dvě lodě: DNF má 6, ne 3.
        var zavod = Bodovani.VysledkyZavodu(
            [new RozjizdkaVstup(1, [Dojel("a", "Race", 1), Kod("b", "Race", KodVysledku.Dnf)])],
            prihlaseno: new Dictionary<string, int> { ["Race"] = 5 });

        Assert.Equal(6, zavod.Single(v => v.Lod == "b").Body);
    }

    [Fact]
    public void Neucast_na_24hodinovce_bonus_nema()
    {
        // Sešit: nad 7 m jelo osm lodí (−1 až 6) a kdo nejel, má 8, ne 7.
        var zavod = Bodovani.VysledkyZavodu([Rozjizdka(1, "a", "b")]);

        var doSerie = SerieBodovani.BodyDoSerie(zavod, [("doma", "Race")], posun: -1)
            .ToDictionary(v => v.Lod);

        Assert.Equal(2, doSerie["doma"].Body);
    }

    [Fact]
    public void Diskvalifikace_v_zavode_je_dvacet_bodu()
    {
        // „Diskvalifikace v regatě 20 bodů." Doloženo dvakrát: ČERVENÉ CAFE
        // na 24hodinovce, SPRUNZEL na Poháru Slunce. Platí i s bonusem.
        var zavod = Bodovani.VysledkyZavodu(
        [
            new RozjizdkaVstup(1,
            [
                Dojel("a", "Race", 1),
                Kod("dsq", "Race", KodVysledku.Dsq),
            ]),
        ]);

        var doSerie = SerieBodovani.BodyDoSerie(zavod, posun: -1).ToDictionary(v => v.Lod);

        Assert.Equal(20, doSerie["dsq"].Body);
        Assert.Equal("DSQ", doSerie["dsq"].Kod);
        Assert.Null(doSerie["dsq"].Misto);
    }

    [Fact]
    public void Diskvalifikace_v_jedne_rozjizdce_z_vice_je_bezny_kod()
    {
        var zavod = Bodovani.VysledkyZavodu(
        [
            new RozjizdkaVstup(1, [Dojel("a", "Race", 1), Kod("b", "Race", KodVysledku.Dsq)]),
            new RozjizdkaVstup(2, [Dojel("b", "Race", 1), Dojel("a", "Race", 2)]),
        ]);

        var doSerie = SerieBodovani.BodyDoSerie(zavod).ToDictionary(v => v.Lod);

        Assert.False(zavod.Single(v => v.Lod == "b").Diskvalifikovana);
        Assert.Equal(1, doSerie["b"].Body);
    }

    [Fact]
    public void Skrta_se_zadany_pocet_nejhorsich_zastavek()
    {
        var poradi = SerieBodovani.Poradi(
            [new LodVSerii("a", [Z(0), Z(5), Z(3), Z(1)])], pocetSkrtu: 2).Single();

        Assert.Equal(9, poradi.Body);
        Assert.Equal(1, poradi.BodyPoSkrtu);
        Assert.Equal(8, poradi.Skrtnuto);
        Assert.Equal([1, 2], poradi.Skrtnute);
    }

    [Fact]
    public void Pri_stejne_spatnych_vysledcich_se_skrta_drivejsi()
    {
        // ZPJ A2.1, rozhodčí potvrdil pro seriál 22. 9. 2026.
        var poradi = SerieBodovani.Poradi(
            [new LodVSerii("a", [Z(0), Z(3), Z(1), Z(3)])], pocetSkrtu: 1).Single();

        Assert.Equal([1], poradi.Skrtnute);
    }

    [Fact]
    public void Shodu_rozhoduje_pocet_lepsich_umisteni()
    {
        // Obě po 2 bodech. „a" má dvě první místa, „b" jen jedno.
        var poradi = SerieBodovani.Poradi(
        [
            new LodVSerii("b", [Z(0), Z(1), Z(1)]),
            new LodVSerii("a", [Z(0), Z(0), Z(2)]),
        ], pocetSkrtu: 0).ToDictionary(p => p.Lod);

        Assert.Equal(1, poradi["a"].PoradiPoSkrtu);
        Assert.Equal(2, poradi["b"].PoradiPoSkrtu);
    }

    [Fact]
    public void Pri_stejnych_umistenich_rozhoduje_posledni_spolecne_dokoncena_regata()
    {
        // Stejná umístění v jiném pořadí. Poslední zastávku „a" nejela (DNC),
        // takže rozhoduje předposlední, kde byla „b" lepší.
        var poradi = SerieBodovani.Poradi(
        [
            new LodVSerii("a", [Z(0), Z(1), Z(2, misto: null)]),
            new LodVSerii("b", [Z(1), Z(0), Z(2)]),
        ], pocetSkrtu: 0).ToDictionary(p => p.Lod);

        // „b" má o jedno umístění víc (třetí místo na poslední), a to
        // rozhodne už v prvním kritériu. Bez něj rozhoduje druhá zastávka.
        Assert.Equal(1, poradi["b"].PoradiPoSkrtu);

        var bezTretiho = SerieBodovani.Poradi(
        [
            new LodVSerii("a", [Z(0), Z(1)]),
            new LodVSerii("b", [Z(1), Z(0)]),
        ], pocetSkrtu: 0).ToDictionary(p => p.Lod);

        Assert.Equal(1, bezTretiho["b"].PoradiPoSkrtu);
        Assert.Equal(2, bezTretiho["a"].PoradiPoSkrtu);
    }

    [Fact]
    public void Skrtnuta_regata_v_rozstrelu_nerozhoduje()
    {
        // Poslední zastávku má „b" škrtnutou, takže rozhoduje předposlední,
        // kde byla lepší „a".
        var poradi = SerieBodovani.Poradi(
        [
            new LodVSerii("a", [Z(1), Z(0), Z(9), Z(0)]),
            new LodVSerii("b", [Z(0), Z(1), Z(0), Z(9)]),
        ], pocetSkrtu: 1).ToDictionary(p => p.Lod);

        Assert.Equal(1, poradi["a"].BodyPoSkrtu);
        Assert.Equal(1, poradi["b"].BodyPoSkrtu);
        Assert.Equal(1, poradi["a"].PoradiPoSkrtu);
    }

    /// <summary>Body ze zastávky; místo se odvodí jako body + 1, pokud není dané.</summary>
    private static BodyZeZastavky Z(int body, int? misto = -1) =>
        new(body, misto == -1 ? body + 1 : misto);

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

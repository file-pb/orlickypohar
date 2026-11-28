using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Kdy regatu zavře server sám (Filip, 21. 11. 2026: *„pokud na to
/// zapomeneme, udělej ho za dva dny sám"*). Čisté funkce, bez databáze.
/// </summary>
public class UzaviraniTests
{
    private static readonly DateOnly Datum = new(2026, 5, 2);

    /// <summary>Konec vypsaného dne: půlnoc na Orlíku, v květnu 22:00 UTC.</summary>
    private static readonly DateTimeOffset KonecDne = new(2026, 5, 2, 22, 0, 0, TimeSpan.Zero);

    /// <summary>Okno prvního dne, zavřené v podvečer.</summary>
    private static readonly DateTimeOffset KonecOkna = new(2026, 5, 2, 17, 0, 0, TimeSpan.Zero);

    private static bool Uzavrit(
        DateTimeOffset ted,
        StavZavodu stav = StavZavodu.Vypsany,
        bool odjeta = true,
        DateTimeOffset? konecOkna = null,
        DateOnly? datumKonce = null,
        DateTimeOffset? vraceno = null) =>
        Uzavirani.MaSeUzavrit(stav, odjeta, konecOkna ?? KonecOkna, Datum, datumKonce, vraceno, ted);

    [Fact]
    public void Dva_dny_po_konci_vypsaneho_dne_se_zavre()
    {
        Assert.False(Uzavrit(KonecDne.AddDays(2).AddMinutes(-1)));
        Assert.True(Uzavrit(KonecDne.AddDays(2)));
    }

    [Fact]
    public void Okno_zavrene_drive_nez_skonci_den_lhutu_nezkracuje()
    {
        // Pořadatel zavřel den v 17:00, ale vypsaný je celý den. Dřív než
        // dva dny po jeho konci se nezavírá.
        Assert.False(Uzavrit(KonecOkna.AddDays(2)));
    }

    [Fact]
    public void Dvoudenni_regata_se_neridi_oknem_prvniho_dne()
    {
        // Past, na kterou Filip ukázal 22. 11.: první den se jel a jeho
        // okno se zavřelo, druhý den teprve přijde. Podle okna by robot
        // zavřel regatu, která ještě běží.
        var druhyDen = Datum.AddDays(1);
        var konecDruhehoDne = new DateTimeOffset(2026, 5, 3, 22, 0, 0, TimeSpan.Zero);

        Assert.False(Uzavrit(KonecOkna.AddDays(2), datumKonce: druhyDen));
        Assert.False(Uzavrit(konecDruhehoDne.AddDays(2).AddMinutes(-1), datumKonce: druhyDen));
        Assert.True(Uzavrit(konecDruhehoDne.AddDays(2), datumKonce: druhyDen));
    }

    [Fact]
    public void Dvacetictyrhodinovka_se_meri_od_konce_okna_ne_od_data()
    {
        // Jeden závodní den přes dva kalendářní: začne druhého v poledne
        // a skončí třetího. Okno končí za vypsaným dnem, takže rozhoduje.
        var konec = new DateTimeOffset(2026, 5, 3, 12, 0, 0, TimeSpan.Zero);

        Assert.False(Uzavrit(konec.AddDays(2).AddHours(-1), konecOkna: konec));
        Assert.True(Uzavrit(konec.AddDays(2), konecOkna: konec));
    }

    [Fact]
    public void Bez_okna_se_meri_od_konce_vypsaneho_dne()
    {
        // Okno nikdo neotevřel: lhůta běží od konce termínu, ne od
        // půlnoci, kterou má datum na začátku.
        Assert.True(Uzavirani.MaSeUzavrit(
            StavZavodu.Vypsany, maOdjetouRozjizdku: true, konecPoslednihoOkna: null,
            Datum, datumKonce: null, vracenoMeziVypsaneV: null, KonecDne + Uzavirani.Lhuta));
        Assert.False(Uzavirani.MaSeUzavrit(
            StavZavodu.Vypsany, maOdjetouRozjizdku: true, konecPoslednihoOkna: null,
            Datum, datumKonce: null, vracenoMeziVypsaneV: null, KonecDne + Uzavirani.Lhuta - TimeSpan.FromMinutes(1)));
    }

    [Fact]
    public void Konec_dne_se_bere_v_case_Orliku_ne_v_UTC()
    {
        // Půlnoc na Orlíku je v květnu 22:00 UTC. Kdyby se počítala
        // půlnoc UTC, lhůta by se o ty dvě hodiny opozdila — a v jiný den
        // roku o jednu, podle letního času.
        Assert.Equal(KonecDne, Uzavirani.Zacatek(null, Datum, null, null));

        var listopad = new DateOnly(2026, 11, 2);
        Assert.Equal(
            new DateTimeOffset(2026, 11, 2, 23, 0, 0, TimeSpan.Zero),
            Uzavirani.Zacatek(null, listopad, null, null));
    }

    [Theory]
    [InlineData(StavZavodu.Planovany)]
    [InlineData(StavZavodu.Potvrzeny)]
    [InlineData(StavZavodu.Odjety)]
    [InlineData(StavZavodu.Zruseny)]
    public void Zavira_se_jen_vypsana(StavZavodu stav)
    {
        Assert.False(Uzavrit(KonecDne.AddDays(30), stav));
    }

    [Fact]
    public void Regata_bez_odjete_rozjizdky_zustane_stat()
    {
        // „Odjetý" znamená, že se jelo. Kdyby to robot tvrdil o regatě,
        // která se nekonala a nikdo ji nezrušil, dostala by se do poháru
        // jako odjetá bez výsledků.
        Assert.False(Uzavrit(KonecDne.AddDays(30), odjeta: false));
    }

    [Fact]
    public void Regatu_vracenou_clovekem_automat_do_dne_nezavre()
    {
        // Podmínka konzilia k bodu 3 (27. 11. 2026): srpnovou regatu někdo
        // v listopadu vrátil mezi vypsané. Bez téhle stopy by ji robot
        // zavřel při nejbližším běhu a vrácení by žilo nejvýš den.
        var vraceno = KonecDne.AddDays(90);

        Assert.False(Uzavrit(vraceno.AddHours(1), vraceno: vraceno));
        Assert.False(Uzavrit(vraceno + Uzavirani.Lhuta - TimeSpan.FromMinutes(1), vraceno: vraceno));
    }

    [Fact]
    public void Dva_dny_po_vraceni_se_zavre_zase_sama()
    {
        // „Už nikdy sama" by znamenalo, že regata vrácená kvůli druhému dni
        // a pak zapomenutá zůstane vypsaná napořád — a do poháru se tiše
        // nepočítá. Hodiny jdou znovu, od posledního lidského rozhodnutí.
        var vraceno = KonecDne.AddDays(90);

        Assert.True(Uzavrit(vraceno + Uzavirani.Lhuta, vraceno: vraceno));
    }

    [Fact]
    public void Vraceni_starsi_nez_konec_regaty_lhutu_nezkracuje()
    {
        // První den se omylem zavřelo a hned vrátilo; druhý den se teprve
        // jede. Rozhoduje pozdější z konců, tedy konec regaty.
        var druhyDen = Datum.AddDays(1);
        var konecDruhehoDne = new DateTimeOffset(2026, 5, 3, 22, 0, 0, TimeSpan.Zero);

        Assert.False(Uzavrit(
            konecDruhehoDne.AddDays(2).AddMinutes(-1), datumKonce: druhyDen, vraceno: KonecOkna));
        Assert.True(Uzavrit(konecDruhehoDne.AddDays(2), datumKonce: druhyDen, vraceno: KonecOkna));
    }
}

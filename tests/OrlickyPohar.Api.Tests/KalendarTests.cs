using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla kalendáře. Čisté funkce, bez databáze — ptá se na ně každý
/// posun zastávky, takže se to musí dát zkoušet levně a hodně.
/// </summary>
public class KalendarTests
{
    [Theory]
    [InlineData(StavZavodu.Planovany, StavZavodu.Potvrzeny)]
    [InlineData(StavZavodu.Potvrzeny, StavZavodu.Vypsany)]
    [InlineData(StavZavodu.Vypsany, StavZavodu.Odjety)]
    public void Radou_se_jde_dopredu_po_jednom_kroku(StavZavodu ze, StavZavodu na)
    {
        Assert.Null(Kalendar.ProcNejde(ze, na));
    }

    [Theory]
    [InlineData(StavZavodu.Potvrzeny, StavZavodu.Planovany)]
    [InlineData(StavZavodu.Vypsany, StavZavodu.Potvrzeny)]
    [InlineData(StavZavodu.Odjety, StavZavodu.Vypsany)]
    public void Krok_zpatky_jde_taky(StavZavodu ze, StavZavodu na)
    {
        // Překlep se musí dát vzít zpět. Výsledky u toho nikam nemizí —
        // stav zastávky je o kalendáři, ne o datech v ní.
        Assert.Null(Kalendar.ProcNejde(ze, na));
    }

    [Theory]
    [InlineData(StavZavodu.Planovany, StavZavodu.Vypsany)]
    [InlineData(StavZavodu.Planovany, StavZavodu.Odjety)]
    [InlineData(StavZavodu.Potvrzeny, StavZavodu.Odjety)]
    public void Dopredu_se_neskace(StavZavodu ze, StavZavodu na)
    {
        // Vypsat závod na termín, který rozhodčí nepotvrdil, by znamenalo,
        // že si organizátor odsouhlasil termín sám.
        Assert.NotNull(Kalendar.ProcNejde(ze, na));
    }

    [Theory]
    [InlineData(StavZavodu.Planovany)]
    [InlineData(StavZavodu.Potvrzeny)]
    [InlineData(StavZavodu.Vypsany)]
    public void Zrusit_jde_vsechno_co_se_jeste_nejelo(StavZavodu ze)
    {
        Assert.Null(Kalendar.ProcNejde(ze, StavZavodu.Zruseny));
    }

    [Fact]
    public void Odjety_zavod_se_zrusit_neda()
    {
        // Jsou v něm výsledky a ty se počítají do poháru — zmizely by, aniž
        // by je kdo smazal.
        var chyba = Kalendar.ProcNejde(StavZavodu.Odjety, StavZavodu.Zruseny);

        Assert.NotNull(chyba);
        Assert.Contains("výsledky", chyba);
    }

    [Fact]
    public void Zrusena_zastavka_se_vraci_jako_planovana()
    {
        Assert.Null(Kalendar.ProcNejde(StavZavodu.Zruseny, StavZavodu.Planovany));

        // Ne rovnou jako vypsaná: obnovený termín musí někdo znovu potvrdit.
        Assert.NotNull(Kalendar.ProcNejde(StavZavodu.Zruseny, StavZavodu.Vypsany));
        Assert.NotNull(Kalendar.ProcNejde(StavZavodu.Zruseny, StavZavodu.Odjety));
    }

    [Fact]
    public void Stav_do_sebe_je_bez_chyby_a_neni_v_nabidce()
    {
        // Dvě kliknutí na totéž tlačítko nemají skončit hláškou; nabídnout
        // se to ale nemá.
        Assert.Null(Kalendar.ProcNejde(StavZavodu.Vypsany, StavZavodu.Vypsany));
        Assert.DoesNotContain(StavZavodu.Vypsany, Kalendar.MozneZ(StavZavodu.Vypsany));
    }

    [Fact]
    public void Nabidka_stavu_sedi_s_tim_co_zapis_pusti()
    {
        // Obrazovka nabízí přesně to, co endpoint dovolí. Kdyby si nabídku
        // počítala sama, rozejde se to při první změně pravidla.
        foreach (var ze in Enum.GetValues<StavZavodu>())
        {
            var nabidka = Kalendar.MozneZ(ze).ToList();

            Assert.All(nabidka, na => Assert.Null(Kalendar.ProcNejde(ze, na)));
            Assert.All(
                Enum.GetValues<StavZavodu>().Where(na => na != ze && !nabidka.Contains(na)),
                na => Assert.NotNull(Kalendar.ProcNejde(ze, na)));
        }
    }

    [Theory]
    [InlineData(StavZavodu.Planovany, Role.Rozhodci)]
    [InlineData(StavZavodu.Potvrzeny, Role.Rozhodci)]
    [InlineData(StavZavodu.Zruseny, Role.Rozhodci)]
    [InlineData(StavZavodu.Vypsany, Role.Organizator)]
    [InlineData(StavZavodu.Odjety, Role.Organizator)]
    public void Termin_patri_rozhodcimu_prubeh_zavodu_poradateli(StavZavodu na, Role kdo)
    {
        Assert.Equal(kdo, Kalendar.KdoSmi(na));
    }

    [Fact]
    public void Spravce_smi_oboji_a_editor_nic()
    {
        // Neopisuje se to do kalendáře, plyne to z `Prava`. Zkouší se to
        // tady proto, že na tom stojí, kdo tlačítka uvidí.
        var spravce = new[] { new UdeleneRole(Role.Spravce, 1) };
        var editor = new[] { new UdeleneRole(Role.Editor, 1) };

        foreach (var na in Enum.GetValues<StavZavodu>())
        {
            Assert.True(Prava.Smi(spravce, new Pozadavek(Kalendar.KdoSmi(na), 1, 7)));
            Assert.False(Prava.Smi(editor, new Pozadavek(Kalendar.KdoSmi(na), 1, 7)));
        }
    }

    [Fact]
    public void Poradatel_jedne_zastavky_hne_jen_svoji()
    {
        var organizator = new[] { new UdeleneRole(Role.Organizator, 1, 7) };

        Assert.True(Prava.Smi(organizator, new Pozadavek(Role.Organizator, 1, 7)));
        Assert.False(Prava.Smi(organizator, new Pozadavek(Role.Organizator, 1, 8)));

        // A termín nepotvrzuje ani na té svojí.
        Assert.False(Prava.Smi(organizator, new Pozadavek(Role.Rozhodci, 1, 7)));
    }

    [Theory]
    [InlineData("Radavská regata", "radavska-regata")]
    [InlineData("24hodinovka", "24hodinovka")]
    [InlineData("O pohár Vltavy", "o-pohar-vltavy")]
    public void Adresa_vznikne_z_nazvu(string nazev, string ocekavano)
    {
        Assert.Equal(ocekavano, Kalendar.Slug(nazev));
    }

    [Fact]
    public void Adresa_se_vejde_do_sloupce()
    {
        // Sloupec zastávky má 80 znaků, kdežto článek 120 — delší slug by
        // padl až při zápisu do databáze.
        var dlouhy = Kalendar.Slug(new string('a', 300));

        Assert.True(dlouhy.Length <= 80);
        Assert.False(dlouhy.EndsWith('-'));
    }

    [Fact]
    public void Nazev_je_povinny_a_musi_z_nej_jit_adresa()
    {
        var datum = new DateOnly(2026, 5, 16);

        Assert.NotNull(Kalendar.ProcNejdeUlozit("", datum, null, "slug"));
        Assert.NotNull(Kalendar.ProcNejdeUlozit("???", datum, null, Kalendar.Slug("???")));
        Assert.Null(Kalendar.ProcNejdeUlozit("Radavská regata", datum, null, "radavska-regata"));
    }

    [Fact]
    public void Konec_zavodu_nesmi_byt_pred_zacatkem()
    {
        var zacatek = new DateOnly(2026, 5, 16);

        Assert.NotNull(Kalendar.ProcNejdeUlozit("Regata", zacatek, zacatek.AddDays(-1), "regata"));

        // Jednodenní zapsaný dvakrát je neškodný.
        Assert.Null(Kalendar.ProcNejdeUlozit("Regata", zacatek, zacatek, "regata"));
        Assert.Null(Kalendar.ProcNejdeUlozit("Regata", zacatek, zacatek.AddDays(1), "regata"));
    }

    [Fact]
    public void Presun_potvrzene_zastavky_si_pamatuje_puvodni_termin()
    {
        var puvodni = new DateOnly(2026, 5, 16);
        var novy = new DateOnly(2026, 5, 23);

        Assert.Equal(puvodni, Kalendar.PuvodniPoPresunu(StavZavodu.Potvrzeny, puvodni, novy, null));

        // Pamatuje se první termín, ne předposlední: to je ten, na který se
        // lidé chystali.
        Assert.Equal(
            puvodni,
            Kalendar.PuvodniPoPresunu(StavZavodu.Vypsany, novy, novy.AddDays(7), puvodni));
    }

    [Fact]
    public void Planovana_zastavka_se_nepresouva_jen_meni_termin()
    {
        // Předběžný kalendář je návrh. Hlásit u něj „přesunuto z" by
        // znamenalo tvrdit, že něco platilo, když nic neplatilo.
        var puvodni = new DateOnly(2026, 5, 16);

        Assert.Null(Kalendar.PuvodniPoPresunu(
            StavZavodu.Planovany, puvodni, puvodni.AddDays(7), null));
    }

    [Fact]
    public void Stejny_termin_nic_neprepise()
    {
        var datum = new DateOnly(2026, 5, 16);
        var drivejsi = new DateOnly(2026, 5, 9);

        Assert.Equal(drivejsi, Kalendar.PuvodniPoPresunu(StavZavodu.Vypsany, datum, datum, drivejsi));
    }

    [Fact]
    public void Kalendar_se_radi_casem()
    {
        // Zastávka doplněná dodatečně nesmí skončit v ročníku až za Vánoční
        // regatou jen proto, že dostala nejvyšší číslo.
        var poradi = Kalendar.Preradit([
            (Id: 1, Datum: new DateOnly(2026, 4, 25), Poradi: 1),
            (Id: 2, Datum: new DateOnly(2026, 12, 12), Poradi: 2),
            (Id: 3, Datum: new DateOnly(2026, 5, 9), Poradi: 3),
        ]);

        Assert.Equal(1, poradi[1]);
        Assert.Equal(2, poradi[3]);
        Assert.Equal(3, poradi[2]);
    }

    [Fact]
    public void Shodny_termin_rozhodne_dosavadni_poradi()
    {
        // Dvoudenní víkend se nesmí přehazovat při každém uložení.
        var vstup = new[]
        {
            (Id: 5, Datum: new DateOnly(2026, 7, 11), Poradi: 2),
            (Id: 4, Datum: new DateOnly(2026, 7, 11), Poradi: 1),
        };

        Assert.Equal(1, Kalendar.Preradit(vstup)[4]);
        Assert.Equal(2, Kalendar.Preradit(vstup)[5]);
    }
}

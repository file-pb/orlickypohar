using System.Text.Json;
using OrlickyPohar.Api.Features.Naklady;
using Shouldly;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Přepočet nákladů z přehledu platformy na obrazovku správce. Čisté
/// funkce, bez souboru i bez databáze.
/// <para>
/// JSON v testech je <b>skutečný tvar</b> souboru <c>stav/naklady.json</c>,
/// jak ho 24. 9. 2026 zapisuje <c>prehled-stav.sh</c> v repozitáři platformy.
/// Je to kontrakt mezi dvěma repozitáři: když se zdroj přejmenuje, má
/// prasknout test, ne obrazovka.
/// </para>
/// </summary>
public class NakladyTests
{
    private const string Vzorek = """
        {
          "kdy": "2026-09-24T06:45:03Z",
          "kurz": { "eur_kc": 24.380, "usd_kc": 21.369 },
          "server_eur_mesicne": 7.25,
          "servis_spocitano": "2026-09-23T15:12:22Z",
          "projekty": [
            {
              "projekt": "orlickypohar",
              "podil_stroje_procent": 16.5,
              "kdyby_sam": "CPX12",
              "provoz": [
                { "polozka": "Podíl na serveru", "eur_mesicne": 1.20, "kc_mesicne": 100.00, "poznamka": "17,1 % stroje",
                  "slozky": [
                    { "polozka": "Paměť", "kc_mesicne": 80.00, "poznamka": "222 MB z 3814 MB, váha 50 %" },
                    { "polozka": "Procesor", "kc_mesicne": 15.00, "poznamka": "31 s za 24 h, váha 40 %" },
                    { "polozka": "Disk", "kc_mesicne": 5.00, "poznamka": "1,0 GB, váha 10 %" }
                  ] }
              ],
              "servis": [
                { "polozka": "Předplatné Claude Code", "kc_mesicne": 2000.00, "eur_mesicne": 82.04, "poznamka": "95 % z 100 $" }
              ],
              "prace": { "stavba_h": 119, "udrzba30_h": 119, "ci_minut": 1345, "podil_procent": 95 },
              "historie": [
                { "den": "2026-09-22", "provoz_kc_mesicne": 100.00, "podil_procent": 17.0 },
                { "den": "2026-09-23", "provoz_kc_mesicne": 200.00, "podil_procent": 34.0 }
              ]
            },
            {
              "projekt": "stack",
              "podil_stroje_procent": 78.1,
              "kdyby_sam": "CPX12",
              "provoz": [
                { "polozka": "Podíl na serveru", "eur_mesicne": 5.66, "kc_mesicne": 137.99, "poznamka": "78,1 % stroje" },
                { "polozka": "Doména klihovka.cz", "eur_mesicne": 0.85, "kc_mesicne": 20.83, "poznamka": "250 Kč ročně za celou hračkárnu" }
              ],
              "servis": [],
              "prace": null
            }
          ]
        }
        """;

    private static NakladyDto Naklady(decimal prirazka = 7m) =>
        Prepocet.ZeJsonu(Vzorek, "orlickypohar", prirazka).ShouldNotBeNull();

    [Fact]
    public void Prirazka_se_pricita_ke_kazde_polozce()
    {
        // Sedm procent nad tím, co ukazuje přehled platformy — a na řádcích,
        // ne až na součtu. Tabulka, jejíž řádky nedávají její vlastní součet,
        // vypadá jako chyba.
        var naklady = Naklady();

        naklady.Provoz[0].KcMesicne.ShouldBe(107m);
        naklady.Servis[0].KcMesicne.ShouldBe(2140m);
        naklady.PrirazkaProcent.ShouldBe(7m);
    }

    [Fact]
    public void Domenu_projektu_prehled_nepricita()
    {
        // Doména se platí za celou hračkárnu a pohár sedí na subdoméně.
        // Kdyby se tu objevila, znamenalo by to, že se zdroj změnil.
        Naklady().Provoz.ShouldHaveSingleItem().Polozka.ShouldBe("Podíl na serveru");
    }

    [Fact]
    public void Soucty_sedi_s_radky_a_rok_je_dvanactkrat_mesic()
    {
        var naklady = Naklady();

        naklady.ProvozKcMesicne.ShouldBe(107m);
        naklady.ServisKcMesicne.ShouldBe(2140m);
        naklady.CelkemKcMesicne.ShouldBe(2247m);

        naklady.ProvozKcRocne.ShouldBe(107m * 12);
        naklady.ServisKcRocne.ShouldBe(2140m * 12);
        naklady.CelkemKcRocne.ShouldBe(2247m * 12);

        // Součet řádků se musí rovnat součtu v hlavičce, jinak se dvě čísla
        // na jedné obrazovce rozcházejí.
        naklady.Provoz.Sum(p => p.KcMesicne).ShouldBe(naklady.ProvozKcMesicne);
        naklady.Servis.Sum(p => p.KcRocne).ShouldBe(naklady.ServisKcRocne);
    }

    [Fact]
    public void Bez_prirazky_jsou_to_cisla_prehledu()
    {
        // Nula je legitimní nastavení: „chci vidět totéž co platforma".
        var naklady = Naklady(0m);

        naklady.Provoz[0].KcMesicne.ShouldBe(100m);
        naklady.CelkemKcMesicne.ShouldBe(2100m);
    }

    [Fact]
    public void Polozka_jen_v_eurech_se_prepocte_kurzem_ze_stejneho_souboru()
    {
        // Kurz je v tomtéž souboru schválně: přepočet se nikdy nesmí potkat
        // s kurzem z jiného dne, než ze kterého jsou částky.
        const string jenEura = """
            {
              "kdy": "2026-09-24T06:45:03Z",
              "kurz": { "eur_kc": 25.0 },
              "projekty": [
                { "projekt": "orlickypohar",
                  "provoz": [ { "polozka": "Podíl na serveru", "eur_mesicne": 2.00, "poznamka": null } ],
                  "servis": [] }
              ]
            }
            """;

        var naklady = Prepocet.ZeJsonu(jenEura, "orlickypohar", 0m).ShouldNotBeNull();

        naklady.Provoz[0].KcMesicne.ShouldBe(50m);
    }

    [Fact]
    public void Neznamy_projekt_neni_nula()
    {
        // „Přehled o nás neví" a „stojíme nulu" jsou dvě různé věci a
        // obrazovka je musí říct jinak.
        Prepocet.ZeJsonu(Vzorek, "jachtarna", 7m).ShouldBeNull();
    }

    [Fact]
    public void Projekt_bez_servisu_ma_jen_provoz()
    {
        // Režie platformy nemá řádek ve výrobních nákladech. Prázdný seznam,
        // ne chybějící objekt — obrazovka pak nemusí řešit null.
        var naklady = Prepocet.ZeJsonu(Vzorek, "stack", 0m).ShouldNotBeNull();

        naklady.Servis.ShouldBeEmpty();
        naklady.ServisKcMesicne.ShouldBe(0m);
        naklady.ProvozKcMesicne.ShouldBe(137.99m + 20.83m);
    }

    [Fact]
    public void Kdy_je_z_prehledu_a_ne_ze_cteni()
    {
        // Na obrazovce musí být vidět stáří čísel: soubor přepisuje cron
        // každých pět minut, ale když přestane, nesmí to vypadat čerstvě.
        Naklady().Kdy.ShouldBe(new DateTimeOffset(2026, 9, 24, 6, 45, 3, TimeSpan.Zero));
    }

    [Fact]
    public void Slozky_nesou_prirazku_a_skladaji_se_do_sve_polozky()
    {
        // Paměť, procesor a disk jsou rozbor jedné faktury. Musí dát dohromady
        // řádek nad sebou — jinak by tabulka tvrdila dvě různé věci najednou.
        var server = Naklady().Provoz[0];

        server.Slozky.ShouldNotBeNull().Count.ShouldBe(3);
        server.Slozky.Sum(s => s.KcMesicne).ShouldBe(server.KcMesicne);
        server.Slozky[0].KcMesicne.ShouldBe(85.6m);
    }

    [Fact]
    public void Historie_nese_tutez_prirazku_jako_dnesek()
    {
        // Kdyby ji nenesla, graf by ukazoval nižší čísla než tabulka nad ním
        // a vypadalo by to jako pokles, který se nestal.
        var historie = Naklady().Historie;

        historie.Count.ShouldBe(2);
        historie[0].Den.ShouldBe("2026-09-22");
        historie[0].ProvozKcMesicne.ShouldBe(107m);
        historie[1].ProvozKcMesicne.ShouldBe(214m);
    }

    [Fact]
    public void Prace_se_vydava_v_hodinach_a_minutach_bez_penez()
    {
        // Hodinová sazba nikde zadaná není; vymyslet si ji by z odhadu
        // udělalo fakturu.
        var prace = Naklady().Prace.ShouldNotBeNull();

        prace.StavbaH.ShouldBe(119m);
        prace.Udrzba30H.ShouldBe(119m);
        prace.CiMinut.ShouldBe(1345);
    }

    [Fact]
    public void Projekt_bez_historie_ma_prazdny_seznam_a_ne_null()
    {
        // Obrazovka pak nemusí řešit null, jen krátký seznam.
        Prepocet.ZeJsonu(Vzorek, "stack", 0m).ShouldNotBeNull().Historie.ShouldBeEmpty();
    }

    [Fact]
    public void Rozbity_soubor_je_vyjimka_a_ne_prazdna_tabulka()
    {
        Should.Throw<JsonException>(() => Prepocet.ZeJsonu("{tohle není json", "orlickypohar", 7m));
    }
}

using OrlickyPohar.Api.Features.Prevzate;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Rozbor cizího RSS. Bez sítě a bez databáze, protože je to čistá funkce
/// nad textem — a právě proto se dá ověřit i to, co by se na živém kanálu
/// čekalo měsíce: poškozený XML, chybějící odkaz, rozbité datum.
/// <para>
/// Vzorek je zkrácený kanál Českého svazu jachtingu ze 23. 9. 2026, včetně
/// jeho zvyklostí — HTML v <c>description</c>, datum v RFC 1123 s posunem.
/// </para>
/// </summary>
public class KanalTests
{
    private const string Vzorek = """
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Český svaz jachtingu - články a aktuality</title>
            <link>https://www.sailing.cz</link>
            <item>
              <title>Jachtař Koláček se připravuje na Route du Rhum</title>
              <link>https://www.sailing.cz/clanky/kolacek-route-du-rhum</link>
              <pubDate>Wed, 23 Sep 2026 10:16:47 +0200</pubDate>
              <description>&lt;p&gt;Milan Koláček se jako jediný Čech postaví na start.&lt;/p&gt;</description>
            </item>
            <item>
              <title>Filip Otta se stal vicemistrem Polska!</title>
              <link>https://www.sailing.cz/clanky/otta-vicemistr-polska</link>
              <pubDate>Tue, 22 Sep 2026 13:10:47 +0200</pubDate>
              <description>&lt;p&gt;K medailovým pozicím&amp;nbsp;připsala Tereza Ottová 5. místo.&lt;/p&gt;</description>
            </item>
          </channel>
        </rss>
        """;

    [Fact]
    public void Kanal_se_rozebere_na_polozky()
    {
        var polozky = Kanal.Rozeber(Vzorek);

        Assert.Equal(2, polozky.Count);

        var prvni = polozky[0];
        Assert.Equal("Jachtař Koláček se připravuje na Route du Rhum", prvni.Titulek);
        Assert.Equal("https://www.sailing.cz/clanky/kolacek-route-du-rhum", prvni.Odkaz);
        Assert.Equal("Milan Koláček se jako jediný Čech postaví na start.", prvni.Perex);

        // Datum se čte i s posunem: kanál posílá +02:00 a do databáze pak
        // musí jít v UTC, jinak Npgsql zápis odmítne.
        Assert.Equal(
            new DateTimeOffset(2026, 9, 23, 10, 16, 47, TimeSpan.FromHours(2)),
            prvni.PublikovanoV);
    }

    [Fact]
    public void Perex_prijde_bez_znacek_a_bez_entit()
    {
        var polozka = Kanal.Rozeber(Vzorek)[1];

        // `&nbsp;` je nedělitelná mezera. Kdyby prošla jako text, stálo by
        // ve výpisu „pozicím&nbsp;připsala".
        Assert.DoesNotContain("<", polozka.Perex);
        Assert.DoesNotContain("&", polozka.Perex);
        Assert.Contains("pozicím", polozka.Perex);
        Assert.Contains("připsala", polozka.Perex);
    }

    [Fact]
    public void Polozky_jsou_od_nejnovejsi_bez_ohledu_na_poradi_v_kanalu()
    {
        // Pořadí v souboru je věc zdroje. Spoléhat se na ně by znamenalo
        // věřit cizímu serveru víc, než je potřeba — a rotace na osm
        // nejnovějších by pak vytlačila špatné.
        var prohozeny = Vzorek.Replace(
            "<pubDate>Wed, 23 Sep 2026 10:16:47 +0200</pubDate>",
            "<pubDate>Mon, 01 Jan 2024 08:00:00 +0100</pubDate>");

        var polozky = Kanal.Rozeber(prohozeny);

        Assert.Equal("https://www.sailing.cz/clanky/otta-vicemistr-polska", polozky[0].Odkaz);
    }

    [Fact]
    public void Polozka_bez_odkazu_nebo_titulku_se_preskoci()
    {
        // Bez odkazu není kam poslat čtenáře a bez titulku není co ukázat.
        // Prázdná karta ve výpisu vypadá jako chyba webu.
        var polozky = Kanal.Rozeber("""
            <rss version="2.0"><channel>
              <item><title>Bez odkazu</title><pubDate>Wed, 23 Sep 2026 10:00:00 +0200</pubDate></item>
              <item><link>https://www.sailing.cz/clanky/bez-titulku</link></item>
              <item>
                <title>V pořádku</title>
                <link>https://www.sailing.cz/clanky/v-poradku</link>
                <pubDate>Wed, 23 Sep 2026 10:00:00 +0200</pubDate>
              </item>
            </channel></rss>
            """);

        Assert.Equal(["https://www.sailing.cz/clanky/v-poradku"], polozky.Select(p => p.Odkaz));
    }

    [Fact]
    public void Nectene_datum_polozku_nezahodi_ale_posune_dozadu()
    {
        // Tiše ji posunout na „teď" by ji vystřelilo na začátek výpisu.
        var polozky = Kanal.Rozeber("""
            <rss version="2.0"><channel>
              <item>
                <title>Se špatným datem</title>
                <link>https://www.sailing.cz/clanky/spatne-datum</link>
                <pubDate>někdy v úterý</pubDate>
              </item>
              <item>
                <title>S datem</title>
                <link>https://www.sailing.cz/clanky/s-datem</link>
                <pubDate>Wed, 23 Sep 2026 10:00:00 +0200</pubDate>
              </item>
            </channel></rss>
            """);

        Assert.Equal(2, polozky.Count);
        Assert.Equal("https://www.sailing.cz/clanky/s-datem", polozky[0].Odkaz);
        Assert.Equal(DateTimeOffset.MinValue, polozky[1].PublikovanoV);
    }

    [Fact]
    public void Odpoved_ktera_neni_xml_nic_neshodi()
    {
        // Cizí server umí vrátit chybovou stránku s kódem 200. Prázdný
        // výsledek je správná odpověď: nic nového nepřišlo. Výjimka by
        // z cizího výpadku udělala náš.
        Assert.Empty(Kanal.Rozeber("<!DOCTYPE html><html><body>Chyba 500</body></html>"));
        Assert.Empty(Kanal.Rozeber(""));
    }

    [Fact]
    public void Dlouhy_perex_se_zkrati_na_hranici_slova()
    {
        // Useknuté slovo s výpustkou vypadá jako chyba webu. A hlavně:
        // do výpisu patří upoutávka, ne převzatý článek.
        var dlouhy = string.Join(" ", Enumerable.Repeat("slovo", 200));
        var polozky = Kanal.Rozeber($"""
            <rss version="2.0"><channel>
              <item>
                <title>Dlouhý</title>
                <link>https://www.sailing.cz/clanky/dlouhy</link>
                <description>{dlouhy}</description>
              </item>
            </channel></rss>
            """);

        var perex = polozky[0].Perex!;
        Assert.True(perex.Length <= Kanal.DelkaPerexu + 1, $"perex má {perex.Length} znaků");
        Assert.EndsWith("…", perex);
        Assert.DoesNotContain("slov…", perex);
    }

    [Fact]
    public void Skutecny_kanal_svazu_se_rozebere_cely()
    {
        // Snímek z 23. 9. 2026 (data/csj/clanky-2026-09-23.xml). Vzorek výš
        // je psaný rukou a trefil by se do vlastních předpokladů; tenhle
        // ne — a když svaz změní tvar kanálu, pozná se to tady, ne až tím,
        // že na webu přestanou chodit novinky.
        var xml = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "csj-clanky.xml"));
        var polozky = Kanal.Rozeber(xml);

        Assert.Equal(50, polozky.Count);
        Assert.All(polozky, p =>
        {
            Assert.StartsWith("https://www.sailing.cz/clanky/", p.Odkaz);
            Assert.False(string.IsNullOrWhiteSpace(p.Titulek));
            Assert.False(string.IsNullOrWhiteSpace(p.Perex));
            Assert.NotEqual(DateTimeOffset.MinValue, p.PublikovanoV);
            Assert.True(p.Perex!.Length <= Kanal.DelkaPerexu + 1);
        });

        // Odkaz je přirozený klíč, takže se v jednom kanálu nesmí opakovat.
        Assert.Equal(polozky.Count, polozky.Select(p => p.Odkaz).Distinct().Count());

        // Rotace bere osm nejnovějších, takže na pořadí záleží.
        Assert.Equal(
            polozky.OrderByDescending(p => p.PublikovanoV).Select(p => p.Odkaz),
            polozky.Select(p => p.Odkaz));
    }
}

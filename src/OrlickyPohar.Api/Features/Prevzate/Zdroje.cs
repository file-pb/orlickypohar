using System.Text.RegularExpressions;

namespace OrlickyPohar.Api.Features.Prevzate;

/// <summary>
/// Kanál, ze kterého se přebírá. <b>Zdroj je záznam, ne konstanta v kódu</b>
/// (Filip, 2. 10. 2026): dnes je to Český svaz jachtingu, časem přibudou
/// pořadatelské kluby, spolky i jednotlivci, se kterými se domluví rozhodčí.
/// Přidat další znamená přidat řádek do <see cref="Vsechny"/>.
/// </summary>
/// <param name="Nazev">Jméno do štítku u článku, například „Český svaz jachtingu".</param>
/// <param name="Odkaz">Rozcestník zdroje — jeho výpis článků, ne konkrétní článek.</param>
/// <param name="Rss">Adresa kanálu RSS 2.0.</param>
/// <param name="Kolik">
/// Kolik článků tohoto zdroje se drží. Je to <b>na zdroj</b>, ne dohromady:
/// jinak by jeden hodně píšící zdroj vytlačil všechny ostatní.
/// </param>
/// <param name="Souhlas">
/// S kým a kdy je přebírání domluvené. <b>Bez téhle věty se zdroj nepřidává.</b>
/// Podmínkou je vždycky uvedení zdroje s odkazem na originál — to drží web
/// štítkem a odkazem karty.
/// </param>
/// <param name="Logo">
/// Malé logo zdroje vedle štítku na kartě, jako soubor ve webu
/// (<c>web/public/zdroje/…</c>). Čtenář tak pozná odkud článek je dřív, než
/// přečte jméno — a s víc zdroji to bude potřeba (Filip, 2. 10. 2026).
/// Prázdné znamená, že se ukáže jen jméno.
/// </param>
/// <param name="NeniFotka">
/// Pozná podle adresy, že obrázek není fotka k článku, ale logo nebo ikonka.
/// Zdroj je dává do <c>og:image</c>, když k článku fotku nemá, a na kartě
/// vypadají hůř než naše náhradní fotka (Filip, 2. 10. 2026). Pouhá velikost
/// nestačí: logo svazu má v originále 711 × 800 px.
/// </param>
/// <param name="VetsiObrazek">
/// Z adresy náhledu udělá adresu větší varianty téhož obrázku, nebo
/// <c>null</c>, když to u zdroje nejde. Je to <b>zvyklost konkrétního webu</b>,
/// ne standard — proto patří ke zdroji a ne do společného kódu. Když
/// výsledná adresa neexistuje nebo není obrázek, použije se původní náhled.
/// </param>
public record ZdrojKanalu(
    string Nazev,
    string Odkaz,
    string Rss,
    int Kolik,
    string Souhlas,
    string? Logo = null,
    Func<string, string?>? VetsiObrazek = null,
    Func<string, bool>? NeniFotka = null);

public static partial class Zdroje
{
    /// <summary>
    /// sailing.cz dává do <c>og:image</c> náhled kolem 500 px. Pod toutéž
    /// cestou bez <c>_thumbs</c> leží originál (ověřeno 2. 10. 2026: 1920 px,
    /// kolem 200 kB). Na kartu ve výpisu stačí náhled, na velkou kartu
    /// úvodní stránky ne — ta má na hustém displeji přes 1300 skutečných
    /// pixelů a náhled by se roztáhl skoro třikrát.
    /// </summary>
    [GeneratedRegex("/uploads_thumbs/")]
    private static partial Regex Nahledy();

    public static string? SailingCzVetsi(string adresa)
    {
        var vetsi = Nahledy().Replace(adresa, "/uploads/", 1);
        return vetsi == adresa ? null : vetsi;
    }

    /// <summary>
    /// sailing.cz má fotky k článkům pod <c>/uploads/clanky/</c>, zatímco
    /// loga a ikonky pod <c>/uploads/ikony-loga/</c> — ověřeno 2. 10. 2026 na
    /// všech osmi článcích v kanálu. Rozhoduje tedy cesta, ne velikost.
    /// </summary>
    public static bool SailingCzNeniFotka(string adresa) => adresa.Contains("/ikony-loga/");

    /// <summary>Zdroje, ze kterých se přebírá. Dnes jeden.</summary>
    public static readonly IReadOnlyList<ZdrojKanalu> Vsechny =
    [
        new ZdrojKanalu(
            Nazev: "Český svaz jachtingu",
            Odkaz: "https://www.sailing.cz/clanky",
            Rss: "https://www.sailing.cz/rss/clanky",
            Kolik: 8,
            Souhlas: "Domluveno se svazem (Filip, 23. 9. 2026); podmínkou je uvedení "
                     + "zdroje s odkazem. Rozšířeno 2. 10. 2026 o uložení fotky u nás.",
            Logo: "/zdroje/csj.webp",
            VetsiObrazek: SailingCzVetsi,
            NeniFotka: SailingCzNeniFotka),
    ];
}

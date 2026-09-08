using System.Globalization;

namespace OrlickyPohar.Api.Features.Bodovani;

/// <summary>Loď v seriálu a body, které jí z jednotlivých zastávek přišly.</summary>
public record LodVSerii(string Lod, IReadOnlyList<int> Body);

/// <summary>
/// Průběžné pořadí jedné lodi. Dvě čísla schválně: součet všeho a součet
/// bez nejhoršího. Rozhodčí vede v sešitu obojí a rozdíl mezi nimi rozhoduje
/// o pořadí, takže zahodit jedno by znamenalo zahodit informaci.
/// </summary>
public record PoradiVSerii(
    string Lod,
    int Body,
    int Poradi,
    int BodyPoSkrtu,
    int PoradiPoSkrtu,
    int? Skrtnuto);

public static class SerieBodovani
{
    /// <summary>
    /// Co si loď ze zastávky odnese do seriálu: <b>pořadí v kategorii mínus
    /// jedna</b>, takže vítěz má nulu.
    /// <para>
    /// Jsou to dvě různé stupnice, ne jedna posunutá: v závodě má vítěz jeden
    /// bod, v seriálu nula. Obě vznikly nezávisle a obě jsou nízkobodové. Kdo
    /// to napíše jako jedno pravidlo, dostane všude posun o jedničku — a ten
    /// se projeví až u lodí se stejným součtem, tedy nejpozději.
    /// </para>
    /// <para>
    /// Lodě s kódem mají pořadí ze <b>své kategorie</b>, i když se závod
    /// vyhodnocoval jako celé pole. Sešit rozhodčího ukazuje, co dělá opak:
    /// ČERVENÉ CAFE si ze 24hodinovky odneslo dvacítku z celkového pořadí,
    /// což je v seriálu víc než součet čtyř běžných závodů.
    /// </para>
    /// </summary>
    /// <param name="koeficient">
    /// Váha závodu v seriálu, běžně 1. Žádná zastávka ročníku 2026 ji nemá
    /// jinou, takže zaokrouhlení je zatím nedoložené — až první závod
    /// s koeficientem vznikne, patří se zeptat rozhodčího dřív, než se
    /// spolehneš na tenhle řádek.
    /// </param>
    public static IReadOnlyList<(string Lod, string Kategorie, int Body)> BodyDoSerie(
        IEnumerable<VysledekZavodu> vysledkyZavodu, decimal koeficient = 1.0m) =>
        [.. vysledkyZavodu.Select(v => (
            v.Lod,
            v.Kategorie,
            Body: (int)Math.Round((v.Poradi - 1) * koeficient, MidpointRounding.AwayFromZero)))];

    /// <summary>
    /// Průběžné pořadí v jedné kategorii.
    /// <para>
    /// Do seriálu jde z každé zastávky <b>pořadí v kategorii mínus jedna</b>,
    /// takže vítěz má nulu. Tahle funkce ta čísla dostane hotová — převod
    /// z výsledku závodu dělá <see cref="Bodovani.VysledkyZavodu"/>.
    /// </para>
    /// <para>
    /// Škrtá se <paramref name="pocetSkrtu"/> nejhorších zastávek. Ověřeno
    /// proti sešitu rozhodčího: <c>data/2026-poradi-rozhodci.json</c>.
    /// </para>
    /// </summary>
    public static IReadOnlyList<PoradiVSerii> Poradi(
        IEnumerable<LodVSerii> lode, int pocetSkrtu = 1)
    {
        var spocteno = lode.Select(l =>
        {
            var body = l.Body.Sum();

            // Škrtá se jen tehdy, když je co škrtat, a nikdy poslední výsledek.
            var skrtnout = Math.Min(pocetSkrtu, Math.Max(l.Body.Count - 1, 0));
            var nejhorsi = l.Body.OrderByDescending(b => b).Take(skrtnout).ToList();

            return new PoradiVSerii(
                l.Lod, body, Poradi: 0,
                BodyPoSkrtu: body - nejhorsi.Sum(),
                PoradiPoSkrtu: 0,
                Skrtnuto: nejhorsi.Count == 1 ? nejhorsi[0] : null);
        }).ToList();

        var podleBodu = Serad(spocteno, p => p.Body, spocteno.ToDictionary(p => p.Lod, p => lode.First(l => l.Lod == p.Lod).Body));
        var podleSkrtu = Serad(spocteno, p => p.BodyPoSkrtu, spocteno.ToDictionary(p => p.Lod, p => lode.First(l => l.Lod == p.Lod).Body));

        return spocteno
            .Select(p => p with
            {
                Poradi = podleBodu[p.Lod],
                PoradiPoSkrtu = podleSkrtu[p.Lod],
            })
            .OrderBy(p => p.PoradiPoSkrtu)
            .ToList();
    }

    /// <summary>
    /// Seřadí a přidělí pořadí. Při shodě bodů rozhoduje <b>lepší sada
    /// výsledků</b>: seřadí se vzestupně a porovnávají po jednom, takže loď
    /// s lepším nejlepším umístěním je napřed. Je to obvyklé pravidlo
    /// závodních pravidel a hlavně deterministické — dvě lodě se stejným
    /// součtem se mezi dvěma výpočty neprohodí.
    /// </summary>
    private static Dictionary<string, int> Serad(
        IEnumerable<PoradiVSerii> lode,
        Func<PoradiVSerii, int> klic,
        Dictionary<string, IReadOnlyList<int>> vysledky)
    {
        return lode
            .OrderBy(klic)
            .ThenBy(p => vysledky[p.Lod].Order().ToList(), Porovnani.PoJednom)
            .ThenBy(p => p.Lod, Jmena.Cesky)
            .Select((p, i) => (p.Lod, Poradi: i + 1))
            .ToDictionary(x => x.Lod, x => x.Poradi);
    }
}

/// <summary>
/// Porovnání jmen lodí. <b>Česky, ne podle prostředí.</b>
/// <para>
/// Bylo tu <c>StringComparer.CurrentCulture</c> a to je past: v kontejneru
/// bez ICU spadne na ordinální porovnání, kde je <c>Č</c> až za <c>Z</c>.
/// Na vývojovém stroji i v CI ICU je, takže testy řadily jinak než produkce —
/// a rozdíl je vidět jen u lodí, které mají všechno ostatní stejné, tedy
/// přesně tam, kde se poslední záchrana používá.
/// </para>
/// </summary>
internal static class Jmena
{
    public static readonly StringComparer Cesky = Vyrob();

    private static StringComparer Vyrob()
    {
        // Když ICU přece jen chybí, je ordinální řazení pořád lepší než pád
        // při startu — jen není české. Program.cs to při startu ohlásí.
        try
        {
            return StringComparer.Create(CultureInfo.GetCultureInfo("cs-CZ"), ignoreCase: false);
        }
        catch (CultureNotFoundException)
        {
            return StringComparer.Ordinal;
        }
    }
}

/// <summary>Porovnání dvou seřazených sad výsledků, prvek po prvku.</summary>
internal sealed class Porovnani : IComparer<List<int>>
{
    public static readonly Porovnani PoJednom = new();

    public int Compare(List<int>? a, List<int>? b)
    {
        if (a is null || b is null) return 0;

        for (var i = 0; i < Math.Min(a.Count, b.Count); i++)
            if (a[i] != b[i]) return a[i].CompareTo(b[i]);

        return a.Count.CompareTo(b.Count);
    }
}

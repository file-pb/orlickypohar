using System.Globalization;

namespace OrlickyPohar.Api.Features.Bodovani;

/// <summary>
/// Co si loď odnesla z jedné zastávky. <c>Misto</c> je pořadí v kategorii;
/// loď bez umístění (neúčast, diskvalifikace v závodě) ho nemá a nemá ani
/// co počítat v rozstřelu. <c>Kod</c> je <c>DNC</c> nebo <c>DSQ</c>, jinak prázdný.
/// </summary>
public record BodyZeZastavky(int Body, int? Misto = null, string? Kod = null);

/// <summary>Body lodi ze zastávky i s tím, odkud se vzaly.</summary>
public record BodyDoSerieLodi(string Lod, string Kategorie, int Body, int? Misto, string? Kod)
{
    public BodyZeZastavky DoSerie => new(Body, Misto, Kod);
}

/// <summary>Loď v seriálu a co jí přišlo z každé odjeté zastávky, v pořadí zastávek.</summary>
public record LodVSerii(string Lod, IReadOnlyList<BodyZeZastavky> Zastavky);

/// <summary>
/// Průběžné pořadí jedné lodi. Dvě čísla schválně: součet všeho a součet
/// po škrtech. Rozhodčí vede v sešitu obojí a rozdíl mezi nimi rozhoduje
/// o pořadí, takže zahodit jedno by znamenalo zahodit informaci.
/// <para>
/// <c>Skrtnuto</c> je součet škrtnutých bodů, <c>Skrtnute</c> indexy
/// škrtnutých zastávek.
/// </para>
/// </summary>
public record PoradiVSerii(
    string Lod,
    int Body,
    int Poradi,
    int BodyPoSkrtu,
    int PoradiPoSkrtu,
    int? Skrtnuto,
    IReadOnlyList<int> Skrtnute);

/// <summary>
/// Pravidla seriálu podle podkladů rozhodčího Miloše Zvonaře
/// (<i>Pravidla pro výpočet pořadí po kategoriích v Orlické sérii</i>,
/// doručeno 22. 9. 2026). Jednotlivé regaty se bodují podle svých pravidel;
/// tady je jen to, co z nich jde do seriálu.
/// </summary>
public static class SerieBodovani
{
    /// <summary>Diskvalifikace v regatě. Pevné číslo, nezávislé na počtu lodí.</summary>
    public const int BodyZaDiskvalifikaci = 20;

    /// <summary>
    /// Co si lodě ze zastávky odnesou do seriálu.
    /// <list type="bullet">
    /// <item>Loď s umístěním: <b>pořadí v kategorii mínus jedna</b>, vítěz má
    /// nulu. <paramref name="posun"/> přičte bonus zastávky — u 24hodinovky
    /// −1, takže vítěz má −1, druhý 0.</item>
    /// <item>Diskvalifikace v regatě: 20 bodů.</item>
    /// <item>Loď z <paramref name="lodeRocniku"/>, která na zastávce nebyla:
    /// <b>tolik bodů, kolik lodí její kategorie na zastávce bylo</b>. Bez
    /// bonusu i bez koeficientu — sešit to tak u 24hodinovky dělá.</item>
    /// </list>
    /// <para>
    /// Jsou to dvě různé stupnice, ne jedna posunutá: v závodě má vítěz jeden
    /// bod, v seriálu nula. Pořadí je vždy uvnitř <b>kategorie</b>, i když se
    /// závod vyhodnocoval jako celé pole.
    /// </para>
    /// </summary>
    /// <param name="koeficient">
    /// Váha závodu v seriálu, běžně 1. Žádná zastávka ročníku 2026 ji nemá
    /// jinou, takže zaokrouhlení je zatím nedoložené.
    /// </param>
    public static IReadOnlyList<BodyDoSerieLodi> BodyDoSerie(
        IEnumerable<VysledekZavodu> vysledkyZavodu,
        IEnumerable<(string Lod, string Kategorie)>? lodeRocniku = null,
        decimal koeficient = 1.0m,
        int posun = 0)
    {
        var vysledky = vysledkyZavodu.ToList();

        var body = vysledky.Select(v => v.Diskvalifikovana
            ? new BodyDoSerieLodi(v.Lod, v.Kategorie, BodyZaDiskvalifikaci, null, "DSQ")
            : new BodyDoSerieLodi(v.Lod, v.Kategorie,
                (int)Math.Round((v.Poradi - 1) * koeficient, MidpointRounding.AwayFromZero) + posun,
                v.Poradi, null))
            .ToList();

        var byly = vysledky.Select(v => v.Lod).ToHashSet();
        var pocetVKategorii = vysledky.GroupBy(v => v.Kategorie).ToDictionary(g => g.Key, g => g.Count());

        foreach (var (lod, kategorie) in lodeRocniku ?? [])
            if (!byly.Contains(lod))
                body.Add(new BodyDoSerieLodi(lod, kategorie,
                    pocetVKategorii.GetValueOrDefault(kategorie), null, "DNC"));

        return body;
    }

    /// <summary>
    /// Průběžné pořadí v jedné kategorii.
    /// <para>
    /// Škrtá se <paramref name="pocetSkrtu"/> nejhorších zastávek; kolik to
    /// je, určuje série. Škrtnout se dá i dvacítka za diskvalifikaci i −1 ze
    /// 24hodinovky, jen poslední výsledek se neškrtá nikdy.
    /// </para>
    /// <para>
    /// Shodu bodů rozhoduje <see cref="Rozstrel"/>.
    /// </para>
    /// </summary>
    public static IReadOnlyList<PoradiVSerii> Poradi(
        IEnumerable<LodVSerii> lode, int pocetSkrtu = 1)
    {
        var radky = lode.Select(l =>
        {
            var skrtnout = Math.Min(pocetSkrtu, Math.Max(l.Zastavky.Count - 1, 0));

            // Při stejných bodech se škrtá dřívější zastávka — ZPJ A2.1,
            // potvrdil rozhodčí 22. 9. 2026.
            var skrtnute = l.Zastavky
                .Select((z, i) => (z, i))
                .OrderByDescending(x => x.z.Body)
                .ThenBy(x => x.i)
                .Take(skrtnout)
                .Select(x => x.i)
                .Order()
                .ToList();

            return new Radek(l, skrtnute);
        }).ToList();

        var podleBodu = Serad(radky, skrty: false);
        var podleSkrtu = Serad(radky, skrty: true);

        return radky
            .Select(r =>
            {
                var body = r.Lod.Zastavky.Sum(z => z.Body);
                var skrtnuto = r.Skrtnute.Sum(i => r.Lod.Zastavky[i].Body);
                return new PoradiVSerii(
                    r.Lod.Lod, body, podleBodu[r.Lod.Lod],
                    body - skrtnuto, podleSkrtu[r.Lod.Lod],
                    r.Skrtnute.Count > 0 ? skrtnuto : null,
                    r.Skrtnute);
            })
            .OrderBy(p => p.PoradiPoSkrtu)
            .ToList();
    }

    private sealed record Radek(LodVSerii Lod, IReadOnlyList<int> Skrtnute)
    {
        public int Body(bool skrty) =>
            Lod.Zastavky.Where((_, i) => !skrty || !Skrtnute.Contains(i)).Sum(z => z.Body);

        /// <summary>Umístění, která se počítají, vzestupně.</summary>
        public List<int> Mista(bool skrty) =>
        [
            .. Lod.Zastavky
                .Where((z, i) => z.Misto is not null && (!skrty || !Skrtnute.Contains(i)))
                .Select(z => z.Misto!.Value)
                .Order(),
        ];
    }

    private static Dictionary<string, int> Serad(List<Radek> radky, bool skrty) =>
        radky
            .OrderBy(r => r.Body(skrty))
            .ThenBy(r => r, new Rozstrel(skrty))
            .ThenBy(r => r.Lod.Lod, Jmena.Cesky)
            .Select((r, i) => (r.Lod.Lod, Poradi: i + 1))
            .ToDictionary(x => x.Lod, x => x.Poradi);

    /// <summary>
    /// Rozstřel shody bodů podle pravidel seriálu:
    /// <list type="number">
    /// <item><b>Počet 1. míst, pak 2. míst…</b> — lepší dojezdy berou lepší
    /// místo. Počítají se umístění, ne body: −1 ze 24hodinovky je první
    /// místo stejně jako nula jinde. Škrtnuté výsledky se nepočítají.</item>
    /// <item><b>Poslední regata sezóny, kterou obě lodě dokončily</b> na
    /// bodovaném místě a ani jedné z nich se neškrtá.</item>
    /// </list>
    /// Ověřeno na shodách v sešitu rozhodčího po Poháru Slunce; jediná, která
    /// nesedí (JOY a Charlotte III), je otázka na rozhodčího.
    /// </summary>
    private sealed class Rozstrel(bool skrty) : IComparer<Radek>
    {
        public int Compare(Radek? a, Radek? b)
        {
            if (a is null || b is null) return 0;

            // Seřazená umístění prvek po prvku. Kdo má na stejné pozici lepší
            // místo, má ho víc; když jednomu umístění dojdou, má jich druhý
            // víc a je napřed.
            var ma = a.Mista(skrty);
            var mb = b.Mista(skrty);
            for (var i = 0; i < Math.Min(ma.Count, mb.Count); i++)
                if (ma[i] != mb[i]) return ma[i].CompareTo(mb[i]);
            if (ma.Count != mb.Count) return mb.Count.CompareTo(ma.Count);

            for (var i = Math.Min(a.Lod.Zastavky.Count, b.Lod.Zastavky.Count) - 1; i >= 0; i--)
            {
                if (skrty && (a.Skrtnute.Contains(i) || b.Skrtnute.Contains(i))) continue;
                var (x, y) = (a.Lod.Zastavky[i].Misto, b.Lod.Zastavky[i].Misto);
                if (x is null || y is null) continue;
                if (x != y) return x.Value.CompareTo(y.Value);
            }

            return 0;
        }
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

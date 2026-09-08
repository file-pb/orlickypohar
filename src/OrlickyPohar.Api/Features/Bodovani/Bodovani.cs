using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Bodovani;

// Čisté funkce, žádná databáze. Je to jediné místo projektu, kde na
// správnosti opravdu záleží — špatně spočítané pořadí je viditelná ostuda —
// a čisté funkce jsou jediný způsob, jak to jde testovat bez ceremonie.

/// <summary>Jeden výsledek tak, jak vznikl na vodě: pořadí v cíli, nebo kód.</summary>
public record VysledekVstup(string Lod, string Kategorie, int? PoradiVCili, KodVysledku? Kod);

/// <summary>Rozjížďka jako seznam výsledků. Číslo slouží jen k hlášení chyb.</summary>
public record RozjizdkaVstup(int Cislo, IReadOnlyList<VysledekVstup> Vysledky);

/// <summary>Body lodi v jedné rozjížďce, už v rámci její kategorie.</summary>
public record BodyVRozjizdce(string Lod, int Cislo, int Body, bool Skrtnuto);

/// <summary>Výsledek lodi v závodě: součet bodů a pořadí v kategorii.</summary>
public record VysledekZavodu(
    string Lod,
    string Kategorie,
    int Body,
    int Poradi,
    IReadOnlyList<BodyVRozjizdce> Rozjizdky);

public static class Bodovani
{
    /// <summary>
    /// Pořadí kódů mezi sebou. Lodě se stejným kódem dostanou stejné body,
    /// různé kódy jdou za sebou podle závažnosti.
    /// <para>
    /// <b>Doloženo je jen `Dnf` před `Dns`</b> — z výsledkové listiny FxCK Cancer
    /// 2026, kde při dvanácti dokončivších měla loď s `Dnf` třináct bodů
    /// a loď s `Dns` čtrnáct. Zbytek pořadí je náš odhad podle logiky
    /// „kdo víc odjel, je na tom líp"; až to rozhodčí potvrdí, mění se
    /// jediné pole.
    /// </para>
    /// </summary>
    private static readonly KodVysledku[] PodleZavaznosti =
    [
        KodVysledku.Rdg,   // náprava — loď se vrací do hry
        KodVysledku.Ret,   // odstoupila, ale odjela část
        KodVysledku.Dnf,   // nedokončila
        KodVysledku.Ocs,   // předčasný start
        KodVysledku.Dsq,   // diskvalifikace
        KodVysledku.Dns,   // nestartovala
        KodVysledku.Dnc,   // nezúčastnila se
    ];

    /// <summary>
    /// Body v jedné rozjížďce, počítané <b>uvnitř kategorie</b>. Vítěz má 1.
    /// <para>
    /// Kdo nedojel, dostává místo za posledním dokončivším. Lodě se stejným
    /// kódem mají stejné body, různé kódy jdou po sobě: při dvanácti
    /// dokončivších má `Dnf` třináct a `Dns` čtrnáct, ale když `Dnf` nikdo
    /// nemá, spadnou všechny `Dns` na třináct.
    /// </para>
    /// </summary>
    public static IReadOnlyList<(string Lod, int Body)> BodyRozjizdky(
        IEnumerable<VysledekVstup> vysledkyKategorie)
    {
        var vsechny = vysledkyKategorie.ToList();

        var dokoncily = vsechny
            .Where(v => v.Kod is null && v.PoradiVCili is not null)
            .OrderBy(v => v.PoradiVCili)
            .Select((v, i) => (v.Lod, Body: i + 1))
            .ToList();

        var body = new List<(string Lod, int Body)>(dokoncily);

        // Skupiny kódů za dokončivšími, každá skupina o místo dál.
        var skupiny = vsechny
            .Where(v => v.Kod is not null)
            .GroupBy(v => v.Kod!.Value)
            .OrderBy(g => Array.IndexOf(PodleZavaznosti, g.Key));

        var misto = dokoncily.Count + 1;
        foreach (var skupina in skupiny)
        {
            foreach (var v in skupina) body.Add((v.Lod, misto));
            misto++;
        }

        return body;
    }

    /// <summary>
    /// Výsledek celého závodu po kategoriích: součet bodů z rozjížděk,
    /// se škrtem nejhorších, a pořadí.
    /// <para>
    /// <paramref name="pocetSkrtu"/> je číslo ze závodu, ne odvozené pravidlo.
    /// Konvence „okruhový se čtyřmi a více rozjížďkami škrtá jednu" určuje,
    /// jaká hodnota se do závodu zapíše, ne jak se počítá — jinak by změna
    /// konvence zpětně přepsala loňské výsledky.
    /// </para>
    /// </summary>
    public static IReadOnlyList<VysledekZavodu> VysledkyZavodu(
        IReadOnlyList<RozjizdkaVstup> rozjizdky, int pocetSkrtu = 0)
    {
        // Body po lodích: (loď → rozjížďka → body)
        var podleLodi = new Dictionary<string, (string Kategorie, List<BodyVRozjizdce> Body)>();

        foreach (var rozjizdka in rozjizdky)
        {
            foreach (var kategorie in rozjizdka.Vysledky.GroupBy(v => v.Kategorie))
            {
                foreach (var (lod, body) in BodyRozjizdky(kategorie))
                {
                    if (!podleLodi.TryGetValue(lod, out var zaznam))
                        podleLodi[lod] = zaznam = (kategorie.Key, []);

                    zaznam.Body.Add(new BodyVRozjizdce(lod, rozjizdka.Cislo, body, Skrtnuto: false));
                }
            }
        }

        var vysledky = new List<VysledekZavodu>();
        foreach (var (lod, (kategorie, body)) in podleLodi)
        {
            // Škrtají se nejhorší výsledky, ale jen když je z čeho — závod
            // se třemi rozjížďkami a dvěma škrty by jinak hodnotil jednu.
            var skrtnout = Math.Min(pocetSkrtu, Math.Max(body.Count - 1, 0));
            var kSkrtnuti = body
                .OrderByDescending(b => b.Body)
                .ThenByDescending(b => b.Cislo)
                .Take(skrtnout)
                .Select(b => b.Cislo)
                .ToHashSet();

            var oznacene = body
                .Select(b => b with { Skrtnuto = kSkrtnuti.Contains(b.Cislo) })
                .OrderBy(b => b.Cislo)
                .ToList();

            vysledky.Add(new VysledekZavodu(
                lod, kategorie,
                oznacene.Where(b => !b.Skrtnuto).Sum(b => b.Body),
                Poradi: 0,
                oznacene));
        }

        // Pořadí uvnitř kategorie. Při shodě bodů rozhoduje lepší jednotlivý
        // výsledek — obvyklé pravidlo a hlavně stabilní, takže dvě lodě se
        // stejným součtem nikdy neprohodí pořadí mezi dvěma výpočty.
        return vysledky
            .GroupBy(v => v.Kategorie)
            .SelectMany(skupina => skupina
                .OrderBy(v => v.Body)
                .ThenBy(v => v.Rozjizdky.Where(b => !b.Skrtnuto).Min(b => (int?)b.Body) ?? int.MaxValue)
                .ThenBy(v => v.Lod, StringComparer.CurrentCulture)
                .Select((v, i) => v with { Poradi = i + 1 }))
            .ToList();
    }
}

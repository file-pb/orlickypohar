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

/// <summary>
/// Výsledek lodi v závodě: součet bodů a pořadí v kategorii.
/// <para>
/// <c>Diskvalifikovana</c> znamená diskvalifikaci <b>v celém závodě</b>, tedy
/// <c>DSQ</c> ve všech rozjížďkách, které vstoupily do výpočtu. Do seriálu
/// z toho jde pevných 20 bodů, ne pořadí. Diskvalifikace v jedné rozjížďce
/// z několika je běžný kód a boduje se uvnitř závodu.
/// </para>
/// </summary>
public record VysledekZavodu(
    string Lod,
    string Kategorie,
    int Body,
    int Poradi,
    IReadOnlyList<BodyVRozjizdce> Rozjizdky,
    bool Diskvalifikovana = false);

public static class Bodovani
{
    /// <summary>
    /// Body v jedné rozjížďce, počítané <b>uvnitř kategorie</b>. Vítěz má 1.
    /// <para>
    /// Kódy podle ZPJ 2025–2028, A5.2: loď, která nestartovala, nedokončila,
    /// odstoupila nebo byla diskvalifikovaná, má <b>počet lodí přihlášených
    /// do závodu + 1</b> — všechny kódy stejně. Rozhodčí 22. 9. 2026: „počet
    /// přihlášených lodí ve třídě plus 1". Dřív se tu kódy řadily za sebe
    /// podle výsledkové listiny FxCK Cancer (DNF 13, DNS 14); ta se podle
    /// pravidel nebodovala.
    /// </para>
    /// <para>
    /// <c>RDG</c> (náprava) není trest a jeho body určuje protestní komise.
    /// Než to umí fáze 5, dostává místo hned za posledním dokončivším.
    /// </para>
    /// </summary>
    /// <param name="prihlaseno">
    /// Kolik lodí kategorie je přihlášených do závodu. Bez něj se bere počet
    /// lodí v téhle rozjížďce.
    /// </param>
    public static IReadOnlyList<(string Lod, int Body)> BodyRozjizdky(
        IEnumerable<VysledekVstup> vysledkyKategorie, int? prihlaseno = null)
    {
        var vsechny = vysledkyKategorie.ToList();

        var dokoncily = vsechny
            .Where(v => v.Kod is null && v.PoradiVCili is not null)
            .OrderBy(v => v.PoradiVCili)
            .Select((v, i) => (v.Lod, Body: i + 1))
            .ToList();

        var body = new List<(string Lod, int Body)>(dokoncily);
        var zaTrest = (prihlaseno ?? vsechny.Count) + 1;

        foreach (var v in vsechny.Where(v => v.Kod is not null))
            body.Add((v.Lod, v.Kod == KodVysledku.Rdg ? dokoncily.Count + 1 : zaTrest));

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

        // Přihlášené do závodu po kategoriích: každá loď, která má v některé
        // rozjížďce výsledek nebo kód.
        var prihlaseno = rozjizdky
            .SelectMany(r => r.Vysledky)
            .GroupBy(v => v.Kategorie)
            .ToDictionary(g => g.Key, g => g.Select(v => v.Lod).Distinct().Count());

        // Loď, která nemá v žádné rozjížďce nic jiného než DSQ. Příznak na
        // účasti by byl přesnější; doplní se, až ho rozhodčí potvrdí.
        var diskvalifikovane = rozjizdky
            .SelectMany(r => r.Vysledky)
            .GroupBy(v => v.Lod)
            .Where(g => g.All(v => v.Kod == KodVysledku.Dsq))
            .Select(g => g.Key)
            .ToHashSet();

        foreach (var rozjizdka in rozjizdky)
        {
            foreach (var kategorie in rozjizdka.Vysledky.GroupBy(v => v.Kategorie))
            {
                foreach (var (lod, body) in BodyRozjizdky(kategorie, prihlaseno[kategorie.Key]))
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
                oznacene,
                diskvalifikovane.Contains(lod)));
        }

        // Pořadí uvnitř kategorie. Při shodě bodů rozhoduje lepší jednotlivý
        // výsledek — obvyklé pravidlo a hlavně stabilní, takže dvě lodě se
        // stejným součtem nikdy neprohodí pořadí mezi dvěma výpočty.
        return vysledky
            .GroupBy(v => v.Kategorie)
            .SelectMany(skupina => skupina
                .OrderBy(v => v.Body)
                .ThenBy(v => v.Rozjizdky.Where(b => !b.Skrtnuto).Min(b => (int?)b.Body) ?? int.MaxValue)
                .ThenBy(v => v.Lod, Jmena.Cesky)
                .Select((v, i) => v with { Poradi = i + 1 }))
            .ToList();
    }
}

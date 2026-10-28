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
    /// Stavy účasti, se kterými je loď <b>přihlášená do závodu</b>: zapsaná,
    /// potvrzená, nedostavila se, vyloučená. Odhlášená předem, odmítnutá
    /// a nevyřízená přihláška ne. Z počtu přihlášených se počítají body za
    /// kódy (A5.2) i za neúčast v seriálu — rozhodčí 22. 9. 2026: „musí to
    /// být podle přihlášených lodí do závodu".
    /// </summary>
    public static readonly StavUcasti[] PrihlasenaDoZavodu =
        [StavUcasti.Prihlasena, StavUcasti.Potvrzena, StavUcasti.Nedostavila, StavUcasti.Vyloucena];

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
        IEnumerable<VysledekVstup> vysledkyKategorie, int? prihlaseno = null,
        PravidlaBodovani? pravidla = null)
    {
        pravidla ??= PravidlaBodovani.Posledni;

        var vsechny = vysledkyKategorie.ToList();

        // <b>Loď s bodovým trestem dokončila</b> (ZPJ 44.3(c), nález R14):
        // zabírá své místo v pořadí a ostatním se nic neposouvá. Trest se
        // k tomu místu připočte níž. Je to jediný kód, který tu patří —
        // ostatní znamenají, že loď v cíli není.
        var dokoncily = vsechny
            .Where(v => (v.Kod is null || v.Kod == KodVysledku.Zfp) && v.PoradiVCili is not null)
            .OrderBy(v => v.PoradiVCili)
            .Select((v, i) => (v.Lod, Body: i + 1))
            .ToList();

        var body = new List<(string Lod, int Body)>(dokoncily);
        var zaTrest = (prihlaseno ?? vsechny.Count) + pravidla.PrirazkaZaKod;

        // <b>ZFP se k pořadí přičítá, nenahrazuje ho</b> (nález R14,
        // 28. 10. 2026; ZPJ 44.3(c)). Je to jediný kód, který loď dostane
        // k dojetému pořadí — proto se počítá zvlášť a dokončivší s ním
        // zůstává v `dokoncily`, odkud má své místo.
        var podleLodi = dokoncily.ToDictionary(d => d.Lod, d => d.Body);
        for (var i = 0; i < body.Count; i++)
        {
            var kod = vsechny.FirstOrDefault(v => v.Lod == body[i].Lod)?.Kod;
            if (kod == KodVysledku.Zfp)
                body[i] = (body[i].Lod, BodySTrestem(podleLodi[body[i].Lod], zaTrest, pravidla));
        }

        foreach (var v in vsechny.Where(v => v.Kod is not null && v.Kod != KodVysledku.Zfp))
            body.Add((v.Lod, v.Kod == KodVysledku.Rdg
                ? dokoncily.Count + pravidla.PrirazkaZaNapravu
                : zaTrest));

        return body;
    }

    /// <summary>
    /// Body lodi s bodovým trestem (ZFP) — <b>ZPJ 44.3(c)</b>:
    /// *„20 % bodů za Nedokončila, zaokrouhleno na nejbližší celé číslo
    /// (0,5 se zaokrouhluje nahoru) … Jestliže by loď dostala víc bodů,
    /// než kolik by dostala za Nedokončila, musí místo toho dostat body
    /// za Nedokončila."*
    /// <para>
    /// Strop je podstatný: bez něj by trest u lodi na chvostu pole vyšel
    /// hůř než nedokončit, a to pravidlo výslovně zakazuje.
    /// </para>
    /// </summary>
    public static int BodySTrestem(int zaMisto, int zaNedokoncila, PravidlaBodovani? pravidla = null)
    {
        pravidla ??= PravidlaBodovani.Posledni;

        // Zaokrouhlení „0,5 nahoru" je `MidpointRounding.AwayFromZero`;
        // výchozí `Math.Round` zaokrouhluje k sudému a 2,5 by dalo 2.
        var trest = (int)Math.Round(
            zaNedokoncila * pravidla.TrestZfpProcent / 100.0, MidpointRounding.AwayFromZero);

        return Math.Min(zaMisto + trest, zaNedokoncila);
    }

    /// <summary>
    /// <b>Kód, který se nesmí vyškrtnout</b> — ZPJ 90.3(b). Dnes jediný:
    /// nevylučitelná diskvalifikace. Je to funkce, ne test na rovnost,
    /// protože dalších kódů s touhle vlastností může přibýt (DGM podle
    /// A10 je druhý takový) a škrt je jediné místo, které je musí znát.
    /// </summary>
    public static bool NelzeSkrtnout(KodVysledku? kod) => kod == KodVysledku.Dne;

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
    /// <param name="prihlaseno">
    /// Počet lodí přihlášených do závodu po kategoriích. Loď s výsledkem se
    /// počítá vždycky, takže bez něj je to počet lodí, které v závodě něco mají.
    /// </param>
    public static IReadOnlyList<VysledekZavodu> VysledkyZavodu(
        IReadOnlyList<RozjizdkaVstup> rozjizdky, int pocetSkrtu = 0,
        IReadOnlyDictionary<string, int>? prihlaseno = null,
        PravidlaBodovani? pravidla = null)
    {
        pravidla ??= PravidlaBodovani.Posledni;

        // Body po lodích: (loď → rozjížďka → body)
        var podleLodi = new Dictionary<string, (string Kategorie, List<BodyVRozjizdce> Body)>();

        // Kód lodi v rozjížďce. Potřebuje ho škrt: `BodyVRozjizdce` nese
        // jen číslo, a podle čísla nejde poznat nevylučitelnou
        // diskvalifikaci (ZPJ 90.3(b)).
        var kody = rozjizdky
            .SelectMany(r => r.Vysledky.Select(v => (Klic: (v.Lod, r.Cislo), v.Kod)))
            .Where(x => x.Kod is not null)
            .ToDictionary(x => x.Klic, x => x.Kod);

        // Přihlášené do závodu po kategoriích. Loď, která má v některé
        // rozjížďce výsledek nebo kód, přihlášená je, i kdyby o tom účast
        // nevěděla.
        var pocty = rozjizdky
            .SelectMany(r => r.Vysledky)
            .GroupBy(v => v.Kategorie)
            .ToDictionary(g => g.Key,
                g => Math.Max(g.Select(v => v.Lod).Distinct().Count(), prihlaseno?.GetValueOrDefault(g.Key) ?? 0));

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
                foreach (var (lod, body) in BodyRozjizdky(kategorie, pocty[kategorie.Key], pravidla))
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

            // <b>Nevylučitelná diskvalifikace se neškrtá</b> (ZPJ 90.3(b),
            // nález K1 opravený 28. 10. 2026). Škrtá se podle výše bodů a
            // diskvalifikace má podle A5.2 nejvyšší možné body, takže DNE
            // byla vždycky prvním kandidátem na škrt — rozhodčí, který ji
            // udělil, ji neměl jak zapsat tak, aby přežila.
            //
            // <b>Počet škrtů se tím nesnižuje</b>: rozjížďka s DNE se
            // z nabídky vyřadí a škrtne se místo ní další nejhorší. Loď
            // tedy nepřijde o škrt, jen ho nemůže použít na tohle.
            var kSkrtnuti = body
                .Where(b => !NelzeSkrtnout(kody.GetValueOrDefault((lod, b.Cislo))))
                .OrderByDescending(b => b.Body)
                // Při shodě se škrtá dřívější rozjížďka (ZPJ A2.1).
                .ThenBy(b => b.Cislo)
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

        // Pořadí uvnitř kategorie. Shodu bodů rozhoduje ZPJ A8, jméno až
        // úplně nakonec, aby se dvě lodě mezi dvěma výpočty neprohodily.
        return vysledky
            .GroupBy(v => v.Kategorie)
            .SelectMany(skupina => skupina
                .OrderBy(v => v.Body)
                .ThenBy(v => v, ShodaVZavode.Instance)
                .ThenBy(v => v.Lod, Jmena.Cesky)
                .Select((v, i) => v with { Poradi = i + 1 }))
            .ToList();
    }

    /// <summary>
    /// Shoda v závodě podle ZPJ A8.
    /// <list type="number">
    /// <item>A8.1: body z rozjížděk seřazené od nejlepšího, bez škrtnutých;
    /// na prvním rozdílu vyhrává lepší.</item>
    /// <item>A8.2: body v poslední rozjížďce, pak v předposlední a dál —
    /// <b>i škrtnuté</b>.</item>
    /// </list>
    /// Doloženo listinou FxCK Cancer 2026: SOCKA a FAR STAR III mají v Race
    /// obě 3 + 4; SOCKA byla ve druhé rozjížďce lepší a je třetí.
    /// </summary>
    private sealed class ShodaVZavode : IComparer<VysledekZavodu>
    {
        public static readonly ShodaVZavode Instance = new();

        public int Compare(VysledekZavodu? a, VysledekZavodu? b)
        {
            if (a is null || b is null) return 0;

            var ba = a.Rozjizdky.Where(r => !r.Skrtnuto).Select(r => r.Body).Order().ToList();
            var bb = b.Rozjizdky.Where(r => !r.Skrtnuto).Select(r => r.Body).Order().ToList();
            for (var i = 0; i < Math.Min(ba.Count, bb.Count); i++)
                if (ba[i] != bb[i]) return ba[i].CompareTo(bb[i]);

            var ra = a.Rozjizdky.ToDictionary(r => r.Cislo, r => r.Body);
            var rb = b.Rozjizdky.ToDictionary(r => r.Cislo, r => r.Body);
            foreach (var cislo in ra.Keys.Intersect(rb.Keys).OrderDescending())
                if (ra[cislo] != rb[cislo]) return ra[cislo].CompareTo(rb[cislo]);

            return 0;
        }
    }
}

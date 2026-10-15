namespace OrlickyPohar.Api.Features.Vodocet;

/// <summary>
/// Rozsahy, na které jde graf hladiny přepnout (Filip, 15. 10. 2026:
/// *„chtěl bych, aby se dal nahoře malými tlačítečky přepínat na 24h 3d 1t
/// 2t 1m 3m 1r"*).
/// <para>
/// <b>Nabízí se jen ty, pro které data opravdu jsou.</b> Filip to řekl
/// jako podmínku — *„pokud nemáme historická data, tak ho zatím
/// nenabízej"* — a je to i jediná poctivá volba: graf za rok, který
/// nakreslí tři dny a zbytek nechá prázdný, tvrdí, že se nic nedělo.
/// Dostupnost se proto počítá z nejstaršího uloženého měření, ne z toho,
/// co si obrazovka myslí.
/// </para>
/// </summary>
public static class RozsahyGrafu
{
    /// <summary>
    /// Kolik bodů nejvíc pošleme. <b>Graf má v boku stránky kolem tří set
    /// pixelů</b>, takže hustší řada přidává bajty, ne informaci —
    /// a prořeďování v databázi samo nestačí: roční graf prochází i hustými
    /// pásmy posledních dnů, takže by vyšel na 1 250 bodů.
    /// </summary>
    public const int NejvicBodu = 400;

    /// <summary>Klíč v adrese a jak dlouho dozadu sahá.</summary>
    public static readonly IReadOnlyList<(string Klic, TimeSpan Delka)> Vsechny =
    [
        ("24h", TimeSpan.FromDays(1)),
        ("3d", TimeSpan.FromDays(3)),
        ("1t", TimeSpan.FromDays(7)),
        ("2t", TimeSpan.FromDays(14)),
        ("1m", TimeSpan.FromDays(30)),
        ("3m", TimeSpan.FromDays(90)),
        ("1r", TimeSpan.FromDays(365)),
    ];

    public static TimeSpan? Delka(string? klic) =>
        Vsechny.FirstOrDefault(r => r.Klic == klic) is { Klic: not null } n ? n.Delka : null;

    /// <summary>
    /// Které rozsahy mají čím být vyplněné. <b>Musí být aspoň z půlky</b>.
    /// <para>
    /// Napřed tu stála osmina, a na ostrých datech se ukázalo, proč je to
    /// málo: při necelém týdnu historie se nabízel „1 měsíc", takže graf
    /// hlásil měsíc a ukázal pár dnů. Přesně to Filip nechtěl (15. 10.
    /// 2026: *„pokud nemáme historická data, abychom umožnili takový graf
    /// zobrazit, tak ho zatím nenabízej"*).
    /// </para>
    /// <para>
    /// Půlka je kompromis: čekat na celý rozsah by znamenalo, že týdenní
    /// graf naskočí přesně sedmý den, i když šestý už nese skoro totéž.
    /// </para>
    /// </summary>
    public static IReadOnlyList<string> Dostupne(DateTimeOffset? nejstarsi, DateTimeOffset nyni)
    {
        if (nejstarsi is null) return [];
        var mame = nyni - nejstarsi.Value;
        return [.. Vsechny.Where(r => mame >= r.Delka / 2).Select(r => r.Klic)];
    }

    /// <summary>
    /// Prořídne řadu na <see cref="NejvicBodu"/> tak, že z každých
    /// <c>n</c> bodů nechá první. <b>Poslední bod zůstává vždycky</b> —
    /// je to ta hodnota, kterou widget píše jako aktuální, a graf, který
    /// končí jinde než číslo nad ním, vypadá jako chyba.
    /// </summary>
    public static IReadOnlyList<T> NaStrop<T>(IReadOnlyList<T> body)
    {
        if (body.Count <= NejvicBodu) return body;

        var krok = (int)Math.Ceiling(body.Count / (double)NejvicBodu);
        var vybrane = new List<T>(NejvicBodu + 1);
        for (var i = 0; i < body.Count; i += krok) vybrane.Add(body[i]);
        if (!ReferenceEquals(vybrane[^1], body[^1])) vybrane.Add(body[^1]);
        return vybrane;
    }
}

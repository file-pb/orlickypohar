namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// <b>Co formuláři napovědět z toho, co už v ročníku stojí.</b>
///
/// <para>
/// <b>Zadání</b> (Filip, 21. 11. 2026, o dvou bodech vypsání, které vydává
/// pořadatel sám): *„pro každou regatu extra, ale s našeptáváním
/// z mediánu."* Hodnota se tedy nepředvyplňuje — napovídá se. Rozdíl je
/// věcný: předvyplněná hodnota se uloží i tomu, kdo si jí nevšiml, kdežto
/// nápověda zůstane prázdná, dokud ji někdo nepřepíše do pole.
/// </para>
///
/// <para>
/// <b>Medián, ne průměr.</b> Jedna regata, která výjimečně startovala
/// v deset večer, by průměr utáhla k nesmyslu; medián ji přejde. A u sudého
/// počtu se bere <b>dolní</b> prostřední hodnota, ne jejich průměr —
/// nápověda má nabídnout čas, který už někdo použil, ne vymyslet nový.
/// </para>
/// </summary>
public static class Napovedy
{
    /// <summary>
    /// Prostřední z hodnot, nebo <c>null</c>, když není z čeho. U sudého
    /// počtu dolní prostřední.
    /// </summary>
    public static TimeOnly? Median(IEnumerable<TimeOnly> hodnoty)
    {
        var serazene = hodnoty.Order().ToList();
        return serazene.Count == 0 ? null : serazene[(serazene.Count - 1) / 2];
    }

    /// <summary>
    /// Naposledy použitý text — podle data regaty, ne podle pořadí
    /// v seznamu. Prázdné a bílé znaky se přeskakují: nenapovídá se mezera.
    ///
    /// <para>
    /// <b>U textu se medián počítat nedá</b>, a nejčastější text by u čtyř
    /// různých tratí vybral náhodu. Poslední použitý je jediná volba, která
    /// o něčem vypovídá: tak se jezdilo minule.
    /// </para>
    /// </summary>
    public static string? Posledni(IEnumerable<(DateOnly Datum, string? Text)> zaznamy) =>
        zaznamy
            .Where(z => !string.IsNullOrWhiteSpace(z.Text))
            .OrderByDescending(z => z.Datum)
            .Select(z => z.Text!.Trim())
            .FirstOrDefault();
}

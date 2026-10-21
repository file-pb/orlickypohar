namespace OrlickyPohar.Api.Features.Upozorneni;

/// <summary>Platforma zařízení. Rozhoduje jen o transportu uvnitř Expa.</summary>
public enum PlatformaZarizeni
{
    Android = 0,
    Ios = 1,
}

/// <summary>
/// Telefon, který chce dostávat upozornění.
///
/// <para>
/// <b>Bez účtu</b> (plán, <i>Dvě úrovně upozornění</i>): veřejná
/// upozornění — výsledky, nový článek, termín závodu — nesmějí vyžadovat
/// přihlášení. Divák ani fanoušek nemá kvůli termínu závodu nic zakládat.
/// Účastnická upozornění přijdou později a ta účet potřebují, protože se
/// musí vědět, které zařízení patří které lodi.
/// </para>
/// <para>
/// <b>Token je identita zařízení a mění se.</b> Expo ho vydává znovu po
/// přeinstalaci i po obnově ze zálohy, takže se registrace dělá při každém
/// spuštění appky a token je unikátní klíč: tentýž telefon se nesmí
/// zapsat dvakrát a dostat všechno dvakrát.
/// </para>
/// </summary>
public class Zarizeni
{
    public int Id { get; set; }

    /// <summary>Expo push token (<c>ExponentPushToken[…]</c>). Unikátní.</summary>
    public required string Token { get; set; }

    public PlatformaZarizeni Platforma { get; set; }

    /// <summary>
    /// Co odebírá, oddělené čárkou — <c>serie:2027,zavod:jarni-vitr</c>.
    ///
    /// <para>
    /// <b>Sloupec, ne tabulka.</b> Odběrů má zařízení jednotky a mění se
    /// celé najednou (appka pošle seznam, jaký má); vlastní tabulka by
    /// přinesla joiny a mazání bez jediné otázky, na kterou by uměla
    /// odpovědět líp.
    /// </para>
    /// </summary>
    public required string Odbery { get; set; }

    public DateTimeOffset ZapsanoV { get; set; }

    /// <summary>Naposledy se ozvalo. Podle toho se uklízejí mrtvá zařízení.</summary>
    public DateTimeOffset NaposledyV { get; set; }
}

/// <summary>
/// Tvar odběrů a meze fronty. Čisté funkce — ptá se na ně zápis i odesílání,
/// takže se musí dát zkoušet bez databáze.
/// </summary>
public static class Odbery
{
    /// <summary>Po kolika marných pokusech se úkol vzdá.</summary>
    public const int NejvicPokusu = 5;

    /// <summary>Kolik úkolů vezme jedno probuzení úlohy.</summary>
    public const int DavkaOdeslani = 50;

    /// <summary>Kolik odběrů smí mít jedno zařízení.</summary>
    public const int NejvicOdberu = 50;

    public static string Serie(string slug) => $"serie:{slug}";

    public static string Zavod(string slug) => $"zavod:{slug}";

    /// <summary>
    /// Odběry do sloupce. <b>Řadí a odstraňuje duplicity</b>, aby se tentýž
    /// seznam vždycky uložil stejně a šel porovnat textem.
    /// </summary>
    public static string DoSloupce(IEnumerable<string> odbery) =>
        string.Join(",", odbery
            .Select(o => o.Trim())
            .Where(o => o.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal));

    public static IReadOnlyList<string> ZeSloupce(string? sloupec) =>
        string.IsNullOrWhiteSpace(sloupec)
            ? []
            : sloupec.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    /// <summary>
    /// Proč registrace nejde — nebo <c>null</c>.
    ///
    /// <para>
    /// <b>Token se kontroluje na tvar, ne jen na prázdnotu.</b> Je to
    /// veřejný endpoint bez přihlášení, takže se do něj dá poslat cokoliv;
    /// bez kontroly by se tabulka plnila nesmysly, na které by pak odesílací
    /// úloha marně volala Expo.
    /// </para>
    /// </summary>
    public static string? ProcNejdeZapsat(string? token, IReadOnlyList<string> odbery)
    {
        if (string.IsNullOrWhiteSpace(token)) return "Chybí token zařízení.";
        if (!token.StartsWith("ExponentPushToken[", StringComparison.Ordinal)
            || !token.EndsWith("]", StringComparison.Ordinal))
            return "Token nemá tvar, jaký Expo vydává.";
        if (odbery.Count > NejvicOdberu)
            return $"Zařízení smí odebírat nejvýš {NejvicOdberu} věcí.";
        if (odbery.Any(o => !o.StartsWith("serie:", StringComparison.Ordinal)
                            && !o.StartsWith("zavod:", StringComparison.Ordinal)))
            return "Odběr musí být „serie:…“ nebo „zavod:…“.";
        return null;
    }

    /// <summary>
    /// Za jak dlouho zkusit znovu po tolikátém marném pokusu. Roste, aby
    /// se při výpadku Expa nevolalo v těsné smyčce.
    /// </summary>
    public static TimeSpan ZkusitZa(int pokusu) =>
        TimeSpan.FromMinutes(Math.Min(Math.Pow(4, Math.Max(pokusu, 1)), 60));
}

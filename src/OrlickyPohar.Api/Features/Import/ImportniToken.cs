using System.Security.Cryptography;
using System.Text;

namespace OrlickyPohar.Api.Features.Import;

/// <summary>Jak dopadlo ověření importního tokenu.</summary>
public enum StavTokenu
{
    Sedi,
    Nesedi,

    /// <summary>Token není nakonfigurovaný. <b>Není to totéž co „projde".</b></summary>
    Nenakonfigurovan,
}

/// <summary>
/// Sdílené tajemství, kterým se chrání import ročníku — a nově i udělení
/// prvního správce, dokud žádný není.
/// <para>
/// Ověření je na jednom místě, protože je to kryptografie: druhá kopie
/// porovnání v konstantním čase by se dřív nebo později napsala obyčejným
/// <c>==</c> a nikdo by si toho nevšiml.
/// </para>
/// </summary>
public static class ImportniToken
{
    public const string Hlavicka = "X-Import-Token";

    public static StavTokenu Over(HttpContext ctx, IConfiguration config)
    {
        var ocekavany = config["Import:Token"];

        // Nenakonfigurovaný token neznamená otevřený endpoint. Bez něj se
        // neimportuje — jinak by stačilo zapomenout na soubor v /run/secrets.
        if (string.IsNullOrEmpty(ocekavany)) return StavTokenu.Nenakonfigurovan;

        var poslany = ctx.Request.Headers[Hlavicka].ToString();

        return KonstantniPorovnani(poslany, ocekavany) ? StavTokenu.Sedi : StavTokenu.Nesedi;
    }

    /// <summary>
    /// Porovnání v konstantním čase. Běžné porovnání řetězců končí na prvním
    /// rozdílu a doba odpovědi tak prozrazuje, kolik znaků tajemství sedí.
    /// </summary>
    private static bool KonstantniPorovnani(string a, string b) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(a), Encoding.UTF8.GetBytes(b));
}

namespace OrlickyPohar.Api.Features.Appka;

/// <summary>
/// Jeden nativní balíček appky, který došel do obchodu.
/// <para>
/// <b>Proč to existuje</b> (Filip, 26. 11. 2026: *„není možné tam někde pod
/// tečkami udělat info o verzi a případně check for updates, aby se to
/// nemuselo odhadovat?"*). Appka uměla hledat aktualizace po síti, jenže ty
/// hledá jen pro otisk, na kterém sama běží. Když nativní změna otisk
/// posune, pro starý balíček žádná aktualizace neexistuje — a appka řekne
/// „jsi aktuální" přesně ve chvíli, kdy v obchodě leží nová verze.
/// </para>
/// <para>
/// <b>Zapisuje to CI</b>, hned jak EAS ohlásí nahrání do obchodu — ne build
/// image. Image se nasazuje o půl hodiny dřív, než balíček projde frontou
/// Expa, a appka by mezitím posílala lidi do obchodu, kde nic není.
/// </para>
/// <para>
/// Přirozený klíč je platforma × číslo balíčku: ruční „nahrát znovu" pošle
/// totéž číslo podruhé a nic se nesmí zdvojit.
/// </para>
/// </summary>
public class VydaniAppky
{
    public const int PlatformaNejvic = 16;
    public const int OtiskNejvic = 64;
    public const int CommitNejvic = 40;

    public int Id { get; set; }

    /// <summary><c>android</c> nebo <c>ios</c>.</summary>
    public required string Platforma { get; set; }

    /// <summary>
    /// <c>versionCode</c> na Androidu. Určuje pořadí — novější balíček má
    /// vyšší číslo, čas nahrání ne vždy (ruční „nahrát znovu").
    /// </summary>
    public int CisloBalicku { get; set; }

    /// <summary>
    /// Otisk nativní části (<c>runtimeVersion</c>). Appka zná svůj a podle
    /// něj pozná, jestli tenhle balíček má.
    /// </summary>
    public required string Otisk { get; set; }

    /// <summary>Commit, ze kterého balíček je. Jen pro dohledání.</summary>
    public string? Commit { get; set; }

    /// <summary>Kdy přišel zápis, v UTC.</summary>
    public DateTimeOffset VydanoV { get; set; }
}

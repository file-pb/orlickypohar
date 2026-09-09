namespace OrlickyPohar.Api.Features.Identita;

/// <summary>
/// Na co se ptáme: role v rozsahu. <c>Zavod</c> prázdný znamená otázku na
/// celý ročník.
/// </summary>
public readonly record struct Pozadavek(Role Role, int Serie, int? Zavod = null);

/// <summary>
/// Jedno udělené právo, odtržené od databáze. Vyhodnocení oprávnění je čistá
/// funkce nad seznamem těchhle záznamů — stejně jako bodování.
/// </summary>
public readonly record struct UdeleneRole(Role Role, int Serie, int? Zavod = null);

/// <summary>
/// Vyhodnocení oprávnění. <b>Čistá funkce</b>, schválně: právo se ptá při
/// každém zápisu, takže se to musí dát zkoušet bez databáze a bez tokenu.
/// </summary>
public static class Prava
{
    /// <summary>
    /// Smí uživatel s těmihle právy to, na co se ptáme?
    /// <para>
    /// Platí dvě pravidla a nic víc:
    /// </para>
    /// <list type="number">
    /// <item>
    /// <b>Rozsah série pokrývá její zastávky, ne naopak.</b> Správce ročníku
    /// smí na každou jeho zastávku; pořadatel jedné zastávky nesmí na ročník
    /// ani na cizí zastávku. To je celý smysl rozsahů.
    /// </item>
    /// <item>
    /// <b>Vyšší role obsahuje nižší, kromě rozhodčího.</b> Správce smí, co smí
    /// editor. Rozhodčí je ale funkce v procesu, ne stupeň: schvalovat výsledky
    /// nesmí editor a naopak právo rozhodčího samo o sobě nedává právo zadávat.
    /// Správce má obojí, protože ve svém rozsahu smí všechno.
    /// </item>
    /// </list>
    /// </summary>
    public static bool Smi(IEnumerable<UdeleneRole> udelena, Pozadavek co)
    {
        // Čtenář je každý, i nepřihlášený — proto se neuděluje a odpověď na
        // něj nesmí záviset na tom, co má kdo v tabulce. Smyčka níž jde přes
        // udělené role, takže bez tohohle řádku by prázdný seznam znamenal
        // „nesmí ani číst".
        if (co.Role == Role.Ctenar) return true;

        foreach (var u in udelena)
        {
            if (u.Serie != co.Serie) continue;

            // Právo na jednu zastávku platí jen na ni. Právo na celý ročník
            // platí i na kteroukoliv jeho zastávku.
            if (u.Zavod is not null && u.Zavod != co.Zavod) continue;

            if (Pokryva(u.Role, co.Role)) return true;
        }

        return false;
    }

    /// <summary>Obsahuje udělená role tu požadovanou?</summary>
    private static bool Pokryva(Role udelena, Role pozadovana) => pozadovana switch
    {
        // Čtenáře řeší `Smi` dřív, než se sem dojde.
        Role.Ctenar => true,

        // Rozhodčí není stupeň, takže ho nedá editor, organizátor ani
        // „vyšší" role obecně.
        Role.Rozhodci => udelena is Role.Rozhodci or Role.Spravce,

        // Organizátor píše i na blog, takže obsahuje editora. Obráceně ne:
        // editor je role pro toho, kdo umí psát o závodě, ale nemá do něj
        // zasahovat.
        Role.Editor => udelena is Role.Editor or Role.Organizator or Role.Spravce,
        Role.Organizator => udelena is Role.Organizator or Role.Spravce,
        Role.Spravce => udelena is Role.Spravce,

        _ => false,
    };
}

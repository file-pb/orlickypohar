using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Sprava;

/// <summary>
/// Pravidla udělování rolí, která nepotřebují databázi.
/// <para>
/// Jsou tu zvlášť ze stejného důvodu jako <see cref="Prava"/>: ptá se na ně
/// každý zápis do oprávnění, takže se musí dát zkoušet bez databáze, bez
/// tokenu a bez Dockeru.
/// </para>
/// </summary>
public static class Udeleni
{
    /// <summary>
    /// Proč tuhle roli v tomhle rozsahu udělit nejde — nebo <c>null</c>,
    /// když jde. Vrací se text, protože jediný, kdo z toho něco má, je
    /// člověk na druhé straně obrazovky.
    /// </summary>
    public static string? ProcNejde(Role role, bool naZavod) => role switch
    {
        // Čtenář je každý, i nepřihlášený. Řádek v tabulce by nic nepřidal
        // a vypadal by, jako že se čtení uděluje — a pak by někdo čekal,
        // že se dá odebrat.
        Role.Ctenar =>
            "Čtenář se neuděluje: je to každý, i nepřihlášený.",

        // Rozhodčí vede kalendář celého seriálu a správce v něm smí všechno.
        // Ani jedno nedává smysl omezit na jednu zastávku — a kdyby to šlo,
        // vznikl by rozsah, o kterém plán mlčí a `Prava` ho tiše uznají.
        Role.Rozhodci or Role.Spravce when naZavod =>
            $"Role {role} platí pro celý ročník, ne pro jednu regatu.",

        _ => null,
    };

    /// <summary>
    /// Smí tuhle roli v tomhle rozsahu udělit (a odebrat) rozhodčí?
    /// <para>
    /// <b>Zadáno 9. 9. 2026:</b> rozhodčí přiřazuje pořadatele a editora
    /// konkrétní zastávce. Víc ne — právo na celý ročník nebo roli rozhodčího
    /// uděluje jen správce, jinak by si rozhodčí mohl rozšířit vlastní rozsah.
    /// </para>
    /// </summary>
    public static bool RozhodciSmiUdelit(Role role, bool naZavod) =>
        naZavod && role is Role.Organizator or Role.Editor;

    /// <summary>
    /// Smí tenhle zápis projít na importní token místo na roli správce?
    /// <para>
    /// Bootstrap řeší kuře a vejce: obrazovka, která uděluje oprávnění, sama
    /// roli správce vyžaduje, takže by první správce nevznikl nikdy.
    /// <b>Zavírá se sám</b> — jakmile v sérii jeden správce je, tahle cesta
    /// přestane platit a víc než jeho samotného otevřít nemůže.
    /// </para>
    /// </summary>
    public static bool BootstrapProjde(bool maSerieSpravce, Role role, bool naZavod) =>
        !maSerieSpravce && role == Role.Spravce && !naZavod;

    /// <summary>
    /// Proč tuhle roli na celém webu udělit nejde — nebo <c>null</c>.
    /// <para>
    /// Na celý web jdou jen <b>editor</b> (obecné články, Filip 22. 9. 2026)
    /// a <b>správce</b>. Rozhodčí a pořadatel jsou funkce v konkrétním
    /// ročníku nebo závodě; udělit je na celý web by z jednoho člověka
    /// udělalo rozhodčího všech sezón najednou.
    /// </para>
    /// </summary>
    public static string? ProcNejdeNaWebu(Role role) => role switch
    {
        Role.Editor or Role.Spravce => null,
        Role.Ctenar => "Čtenář se neuděluje: je to každý, i nepřihlášený.",
        _ => $"Role {role} patří k ročníku nebo zastávce, ne k celému webu.",
    };
}

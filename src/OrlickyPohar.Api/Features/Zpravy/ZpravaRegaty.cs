using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Zpravy;

/// <summary>Co zpráva říká — podle toho se na tabuli liší barvou.</summary>
public enum DruhZpravy
{
    /// <summary>Oznámení. „Rozprava bude v 9:00 u klubovny.“</summary>
    Informace = 0,

    /// <summary>Změna programu. „Start první rozjížďky se odkládá.“</summary>
    Program = 1,

    /// <summary>Výstraha. „Přechod bouřky, lodě na břeh.“</summary>
    Vystraha = 2,
}

/// <summary>
/// Zpráva vydaná k regatě — vývěska, kterou pořadatel plní během dne
/// (Filip, 26. 10. 2026: *„infopanel, kde budeme zobrazovat informace
/// vydané k regatě, jako např. že rozprava bude tehdy a tehdy tam a tam,
/// nebo že start první rozjížďky se odkládá po přechodu bouřky"*).
/// <para>
/// <b>Není to směrnice ani push.</b> Směrnice je úřední dokument, podle
/// kterého se jede, a vydává se jako PDF; upozornění letí do telefonů
/// těch, kdo je mají. Tohle je to třetí: krátká zpráva na zeď, kterou
/// v hospodě i na břehu vidí každý, kdo se podívá na tabuli.
/// </para>
/// <para>
/// <b>Zpráva se nemaže, stahuje</b> — stejně jako směrnice. Co bylo
/// vyvěšeno, má jít doložit; omyl se odvolá a historie zůstane. Z tabule
/// zmizí hned, protože tam patří jen to, co platí.
/// </para>
/// </summary>
public class ZpravaRegaty
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>Text zprávy. Jedna až dvě věty — čte se přes místnost.</summary>
    public required string Text { get; set; }

    public DruhZpravy Druh { get; set; } = DruhZpravy.Informace;

    public DateTimeOffset VydanoV { get; set; }

    public Guid VydalId { get; set; }

    /// <summary>
    /// Kdy zpráva dohoří sama. <c>null</c> znamená „dokud ji někdo
    /// nestáhne“.
    /// <para>
    /// <b>Je to pojistka proti zapomenuté vývěsce</b>: „rozprava v 9:00“
    /// nemá na tabuli viset večer, a pořadatel na vodě nemá čas uklízet.
    /// </para>
    /// </summary>
    public DateTimeOffset? PlatiDo { get; set; }

    /// <summary>Kdy ji někdo odvolal. Záznam zůstává, z tabule mizí.</summary>
    public DateTimeOffset? StazenoV { get; set; }

    /// <summary>Platí teď? Nestažená a buď bez lhůty, nebo ještě v ní.</summary>
    public bool Plati(DateTimeOffset kdy) =>
        StazenoV is null && (PlatiDo is null || PlatiDo > kdy);
}

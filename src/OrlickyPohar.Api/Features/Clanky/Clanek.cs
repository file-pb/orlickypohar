using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Clanky;

/// <summary>
/// Novinka nebo článek. Blog je <b>na dvou úrovních</b>: sérii píše organizátor
/// poháru (pozvánky na sezónu, souhrny), zastávku její pořadatel (pozvánka na
/// svůj závod, jeho příběh).
/// <para>
/// Obě úrovně jsou tatáž entita, liší se jen vazbou. <c>SerieId</c> má článek
/// vždycky, <c>ZavodId</c> jen ten, který patří zastávce. Vypadá to jako
/// duplicitní údaj — závod svou sérii zná — ale není: díky němu se novinky
/// ročníku načtou jedním dotazem bez spojení přes závody, a hlavně je to
/// jediné místo, odkud se odvodí právo psát. Pořadatel Radavské regaty smí
/// psát na stránku Radavské regaty a nikam jinam; až přijde fáze 4, ptá se
/// oprávnění přesně těchhle dvou sloupců.
/// </para>
/// <para>
/// <b>Tělo je prostý text</b>, odstavce oddělené prázdným řádkem. Markdown ani
/// HTML schválně ne: první by znamenal renderer na webu i v appce (a rozhodnutí,
/// co z něj povolit), druhý sanitizaci cizího vstupu. Až bude potřeba víc než
/// odstavce, je to aditivní sloupec s formátem — ne přepis toho, co je uložené.
/// </para>
/// </summary>
public class Clanek
{
    public int Id { get; set; }

    public int SerieId { get; set; }
    public Serie? Serie { get; set; }

    /// <summary>Prázdné znamená článek celé série, vyplněné článek zastávky.</summary>
    public int? ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>
    /// Část veřejné adresy, unikátní v rámci ročníku — i u článků zastávek.
    /// Adresa článku je proto vždycky <c>/serie/{serie}/novinky/{slug}</c>
    /// bez ohledu na to, ke komu patří: odkaz zůstane platný i tehdy, když
    /// se článek k zastávce dodatečně připne nebo od ní odpojí.
    /// </summary>
    public required string Slug { get; set; }

    public required string Titulek { get; set; }

    /// <summary>Pár vět do výpisu a na úvodní stránku. Není to začátek těla — píše se zvlášť.</summary>
    public string? Perex { get; set; }

    /// <summary>Odstavce oddělené prázdným řádkem.</summary>
    public required string Telo { get; set; }

    /// <summary>Kdo to napsal. Volný text — autor není účet v systému, stejně jako pořadatel.</summary>
    public string? Autor { get; set; }

    /// <summary>
    /// Kdy článek vyšel. Řadí se podle něj, ne podle <c>Id</c>: novinky se
    /// zapisují importem po dávkách, takže pořadí vzniku nic neříká o tom,
    /// co je čerstvé.
    /// </summary>
    public DateTimeOffset PublikovanoV { get; set; }

    public bool Publikovano { get; set; }
}

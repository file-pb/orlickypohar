using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Clanky;

/// <summary>
/// Stav článku. Zadáno Filipem 9. 9. 2026: koncept, publikováno, skryté,
/// smazané.
/// <para>
/// <b>Koncept a skryté nejsou totéž</b>, i když veřejnost nevidí ani jedno.
/// Koncept nikdy nevyšel a autor s ním pracuje; skrytý článek vyšel a někdo
/// ho stáhl. Ve výpisu pro autora je to rozdíl mezi „dopiš to" a „rozhodni,
/// jestli se to vrátí".
/// </para>
/// <para>
/// <b>Smazané je stav, ne smazání řádku.</b> Odkaz na článek už mohl někam
/// odejít a překlep v mazání je jedno kliknutí; obojí mluví pro to, aby se
/// dal článek vrátit. Navíc tím zůstává obsazený slug, takže se pod stejnou
/// adresou nemůže objevit jiný text.
/// </para>
/// </summary>
public enum StavClanku
{
    /// <summary>Rozepsané, nikdy nevyšlo.</summary>
    Draft = 0,

    /// <summary>Vidí veřejnost.</summary>
    Publikovano = 1,

    /// <summary>Vyšlo a bylo stáhnuté.</summary>
    Skryty = 2,

    /// <summary>Smazané. Nevidí ho veřejnost ani výpis pro autora.</summary>
    Smazano = 3,
}

/// <summary>
/// V jakém tvaru je uložené tělo článku.
/// <para>
/// <b>Rozšiřuje se, nepřepisuje se.</b> Dokud existoval jediný tvar, nebylo
/// co rozlišovat; teď se do těla dostane i obsah, který si pořadatel přinese
/// odjinud, a starý článek se kvůli tomu nesmí muset přepsat. Proto je
/// <see cref="Text"/> nula a výchozí hodnota: ročníky nahrané dřív i soubory,
/// které o formátu nevědí, znamenají dál totéž co doteď.
/// </para>
/// </summary>
public enum FormatClanku
{
    /// <summary>
    /// Prostý text, odstavce oddělené prázdným řádkem. Tak vypadá všechno,
    /// co vzniklo do 23. 9. 2026.
    /// </summary>
    Text = 0,

    /// <summary>
    /// <b>Jen na vstupu:</b> vložené HTML od pořadatele, jak ho vzal z Wordu
    /// nebo ze své stránky (Filip, 23. 9. 2026).
    /// <para>
    /// <b>V databázi tahle hodnota nezůstane.</b> Server ji při uložení
    /// převede na <see cref="Bloky"/> — viz <see cref="Clanky.Bloky.ZHtml"/>.
    /// Kdyby se přesto někde vyskytla (starý záznam, ruční zásah), web ji
    /// vypíše jako text, ne jako značky: nevyčištěné HTML z databáze je XSS.
    /// </para>
    /// </summary>
    Html = 1,

    /// <summary>
    /// Vyčištěná struktura těla: odstavce, nadpisy, seznamy, odkazy, obrázky.
    /// V <c>Telo</c> je uložená jako JSON.
    /// <para>
    /// <b>Není to HTML a schválně.</b> Web ji vykresluje vlastními
    /// komponentami, takže se surové značky do stránky nedostanou nikdy.
    /// Bezpečnost tím stojí na konstrukci, ne na tom, že whitelist nemá díru.
    /// </para>
    /// </summary>
    Bloky = 2,
}

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
/// <b>Tělo je prostý text</b>, odstavce oddělené prázdným řádkem — a od
/// 23. 9. 2026 to říká <see cref="Format"/>, ne předpoklad. Sloupec přibyl
/// aditivně, přesně jak tu dřív stálo, že se to jednou udělá: nic se
/// nepřepsalo a všechno uložené je dál <see cref="FormatClanku.Text"/>.
/// </para>
/// </summary>
public class Clanek : IMaFotku
{
    public int Id { get; set; }

    /// <summary>
    /// Prázdné znamená <b>obecný článek</b> mimo ročník (od 22. 9. 2026):
    /// zpráva, která s žádnou sezónou nesouvisí a nemá s ní zestárnout.
    /// Píše ho editor celého webu.
    /// </summary>
    public int? SerieId { get; set; }
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

    /// <summary>Obsah článku. Jak se čte, říká <see cref="Format"/>.</summary>
    public required string Telo { get; set; }

    /// <summary>
    /// V jakém tvaru je <see cref="Telo"/>. Výchozí <see cref="FormatClanku.Text"/>,
    /// takže článek, o kterém to nikdo neřekl, se čte jako doteď.
    /// </summary>
    public FormatClanku Format { get; set; } = FormatClanku.Text;

    /// <summary>Kdo to napsal. Volný text — autor není účet v systému, stejně jako pořadatel.</summary>
    public string? Autor { get; set; }

    /// <summary>
    /// Kdy článek vyšel. Řadí se podle něj, ne podle <c>Id</c>: novinky se
    /// zapisují importem po dávkách, takže pořadí vzniku nic neříká o tom,
    /// co je čerstvé.
    /// </summary>
    public DateTimeOffset PublikovanoV { get; set; }

    /// <summary>
    /// Viditelnost. Veřejné čtení pouští jen <see cref="StavClanku.Publikovano"/>.
    /// <para>
    /// Nahradilo příznak <c>Publikovano</c>, protože „nezveřejněno" mělo dva
    /// různé významy — rozepsané a stáhnuté — a jeden příznak je rozlišit
    /// neumí.
    /// </para>
    /// </summary>
    public StavClanku Stav { get; set; } = StavClanku.Draft;

    /// <summary>
    /// Hlavní obrázek. <b>Jeden na článek</b> — z něj náhled do výpisu
    /// i velká fotka nad textem. Galerie a obrázky v textu jsou pětkrát víc
    /// práce za zlomek užitku (plán, oddíl <i>Co ještě ukázaly cizí weby</i>).
    /// Bez obrázku ukazuje web kurátorskou fotku z Orlíku.
    /// </summary>
    public Guid? FotkaId { get; set; }
    public Fotka? Fotka { get; set; }
}

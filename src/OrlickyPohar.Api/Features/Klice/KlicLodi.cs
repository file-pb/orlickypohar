using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Features.Klice;

/// <summary>
/// Mobilní klíč k lodi — telefon, který smí posílat polohy.
/// <para>
/// <b>Není to přihlášení, je to oprávnění</b> (Filip, 21. 10. 2026):
/// *„tím se může spárovat jako mobilním klíčem ke své lodi a webu"*.
/// Identitu posádce potvrzuje kapitán tím, že jí dá QR; systém nemusí
/// ověřovat, kdo ten člověk je. Je to delegovaná důvěra, stejná jako když
/// někdo dá klíč od loděnice.
/// </para>
/// <para>
/// <b>Klíč říká kdo, okno regaty říká kdy.</b> Platí k lodi trvale, protože
/// posádka se přes sezónu nemění každý závod a párovat se před každou
/// regatou by byl přesně ten opruz, kterému se máme vyhnout.
/// </para>
/// <para>
/// <b>Přes klíč chodí i kapitán.</b> Nahrávání trasy jde vždycky touhle
/// cestou, ať telefon drží kdokoli; účet slouží ke správě, webu a
/// komunikaci. Dvě různé cesty k témuž by znamenaly dvě místa, kde se dá
/// udělat chyba v bezpečnosti — tentýž argument, jakým plán zdůvodňuje
/// společný tok přihlášení pro web i appku.
/// </para>
/// </summary>
public class KlicLodi
{
    public int Id { get; set; }

    public int LodId { get; set; }
    public Lod? Lod { get; set; }

    /// <summary>
    /// Otisk tajemství, ne tajemství samo.
    /// <para>
    /// <b>Hodnota klíče se ukládá jen jako otisk</b>, stejně jako heslo.
    /// Kdyby se databáze dostala ven, s otiskem nikdo polohy neposílá. Klíč
    /// v čitelné podobě existuje jen jednou — v okamžiku vydání, kdy odchází
    /// do telefonu.
    /// </para>
    /// </summary>
    public required string Otisk { get; set; }

    /// <summary>
    /// Jméno, jak ho zadal kapitán — <b>nanejvýš tohle</b> o členu posádky
    /// víme. *„Posádka jen QR, maximálně jméno, aby se vědělo"* (Filip).
    /// </summary>
    public string? Jmeno { get; set; }

    /// <summary>Kdo klíč vydal. Za identitu toho člověka ručí on.</summary>
    public Guid VydalUcetId { get; set; }
    public Uzivatel? Vydal { get; set; }

    public DateTimeOffset VydanV { get; set; }

    /// <summary>Kdy se klíč naposledy ozval. Podle toho se pozná nepoužitý.</summary>
    public DateTimeOffset? PosledniPouzitiV { get; set; }

    /// <summary>
    /// <b>Dočasné odepnutí z trackingu</b> (Filip, 21. 10. 2026): člen
    /// posádky zůstává, jen tuhle regatu nejede nebo odjel po prvním dni
    /// domů. Telefon přestane posílat, ale příští závod se nemusí párovat
    /// znovu — a řeší to past *„telefon, který zůstal v autě"*.
    /// </summary>
    public bool Sleduje { get; set; } = true;

    /// <summary>
    /// <b>Trvalé odebrání z posádky.</b> Klíč zaniká a nedá se oživit.
    /// Smí to kapitán, pořadatel — a sám držitel klíče, protože kdo odjíždí,
    /// vypne si to sám a není odkázaný na to, že na něj někdo nezapomene.
    /// </summary>
    public DateTimeOffset? OdebranV { get; set; }

    /// <summary>Klíč, kterým se smí posílat: existuje, není odebraný a sleduje.</summary>
    public bool Platny => OdebranV is null && Sleduje;
}

/// <summary>
/// Pozvánka, kterou nese QR.
/// <para>
/// <b>QR nenese samotný klíč.</b> Kód se dá vyfotit přes rameno nebo zůstat
/// na papíře na stole; proto nese jen jednorázovou pozvánku, kterou appka
/// vymění za klíč, a tím se spotřebuje. Kdo ji uplatní druhý, nedostane nic.
/// </para>
/// </summary>
public class PozvankaKlice
{
    public int Id { get; set; }

    public int LodId { get; set; }
    public Lod? Lod { get; set; }

    /// <summary>Otisk kódu z QR. Čitelný kód existuje jen v tom QR.</summary>
    public required string Otisk { get; set; }

    /// <summary>Jméno člena posádky, jak ho zadal kapitán.</summary>
    public string? Jmeno { get; set; }

    public Guid VydalUcetId { get; set; }
    public DateTimeOffset VydanaV { get; set; }

    /// <summary>
    /// Dokdy se dá uplatnit. Pozvánka je na rozpravu, ne na celou sezónu —
    /// nevyužitá nesmí ležet jako trvalý vstup do lodi.
    /// </summary>
    public DateTimeOffset PlatiDo { get; set; }

    /// <summary>Kdy ji někdo vyměnil za klíč. Podruhé už to nejde.</summary>
    public DateTimeOffset? UplatnenaV { get; set; }

    public bool Uplatnitelna(DateTimeOffset ted) => UplatnenaV is null && PlatiDo > ted;
}

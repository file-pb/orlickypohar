using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Klice;

/// <summary>
/// Klíč k účtu — telefon, který smí jednat za konkrétního člověka.
///
/// <para>
/// <b>Proč to existuje</b> (Filip, 26. 11. 2026): *„na zitadel uživatele
/// tahat nechci… rád bych, aby se dalo přihlásit přímo v apce."*
/// Přihlášení přes OIDC se ze své podstaty dělá v prohlížeči — appka
/// nikdy nevidí heslo a dostane jen kód k výměně —, takže formulář
/// v appce by znamenal, že si heslo necháme projít rukama. Tím by zmizely
/// passkeys, druhý faktor i důvod, proč tam OIDC je.
/// </para>
///
/// <para>
/// <b>Cesta ven je obejít to, ne předělat.</b> Člověk se přihlásí na
/// webu — u počítače, kde to nikomu nevadí —, na svém profilu uvidí QR
/// a namíří na něj appku. *„WhatsApp v podstatě takhle funguje taky."*
/// Do telefonu se tím dostane klíč, ne heslo, a poskytovatele appka
/// neukáže nikdy.
/// </para>
///
/// <para>
/// <b>Je to tatáž věc jako <see cref="KlicLodi"/>, jen míří na účet.</b>
/// Komentář u klíče k lodi platí slovo od slova i tady: není to
/// přihlášení, je to oprávnění, a za identitu ručí ten, kdo klíč vydal —
/// jenže u účtu je to ten člověk sám, protože QR vidí jen on po
/// přihlášení na webu.
/// </para>
///
/// <para>
/// <b>Klíč visí na účtu, ne na roli.</b> Oprávnění se v celém API počítají
/// z <c>UserId</c> (<see cref="Prava"/>, <see cref="Rozsahy"/>), takže klíč
/// vázaný rovnou na roli by byl druhý zdroj pravdy o tom, kdo co smí.
/// Takhle se role dál udělují na webu a mění se bez sahání na telefon.
/// </para>
/// </summary>
public class KlicUctu
{
    public int Id { get; set; }

    public Guid UzivatelId { get; set; }
    public Uzivatel? Uzivatel { get; set; }

    /// <summary>
    /// Otisk tajemství, ne tajemství samo — stejně jako u klíče k lodi
    /// a u hesla. Kdyby se databáze dostala ven, s otiskem se za nikoho
    /// nevydá. V čitelné podobě klíč existuje jen jednou, v okamžiku, kdy
    /// odchází do telefonu.
    /// </summary>
    public required string Otisk { get; set; }

    /// <summary>
    /// Jak si ten telefon pojmenoval, ať se v seznamu pozná — *„iPhone
    /// u vody"*. Je to vizitka od klienta, ne doklad: nic se podle ní
    /// nerozhoduje.
    /// </summary>
    public string? Zarizeni { get; set; }

    public DateTimeOffset VydanV { get; set; }

    /// <summary>
    /// Kdy se ten telefon naposledy ozval. Jediné, k čemu to je: poznat
    /// v seznamu, který klíč je mrtvý a dá se odebrat bez přemýšlení.
    /// </summary>
    public DateTimeOffset? OzvalSeV { get; set; }

    /// <summary>
    /// Kdy ho majitel odebral. <b>Maže se příznakem, ne řádkem</b>: smazaný
    /// řádek by o odebrání nic neřekl, a to je přesně ta věc, kterou chce
    /// člověk po ztrátě telefonu vidět černé na bílém.
    /// </summary>
    public DateTimeOffset? OdebranV { get; set; }

    /// <summary>Platí ten klíč teď?</summary>
    public bool Platny => OdebranV is null;
}

/// <summary>
/// Jednorázový kód, kterým se telefon napojí na účet.
///
/// <para>
/// <b>Krátce a jednou.</b> Kód svítí na obrazovce počítače, takže si ho
/// kdokoliv kolem vyfotí přes rameno; proti tomu stojí minuty platnosti
/// a to, že druhé uplatnění neprojde. Filip, 26. 11. 2026: *„pokud to
/// budeme moct dělat jenom jednou, tak je to legitimní."*
/// </para>
///
/// <para>
/// <b>Proti pozvánce k lodi je to přísnější.</b> Ta platí 48 hodin a smí
/// ji uplatnit víc lidí, protože posádka se připojuje po jednom
/// z jednoho papíru. Tady je na druhé straně celý účet i s rolemi, takže
/// se nic takového nepovoluje.
/// </para>
/// </summary>
public class NapojeniUctu
{
    public int Id { get; set; }

    public Guid UzivatelId { get; set; }
    public Uzivatel? Uzivatel { get; set; }

    /// <summary>Otisk kódu. Samotný kód odchází jen do odpovědi, která ho vyrobila.</summary>
    public required string Otisk { get; set; }

    public DateTimeOffset VydanV { get; set; }
    public DateTimeOffset PlatiDo { get; set; }
    public DateTimeOffset? UplatnenV { get; set; }

    /// <summary>Dá se tenhle kód ještě uplatnit?</summary>
    public bool Uplatnitelny(DateTimeOffset ted) => UplatnenV is null && ted < PlatiDo;
}

/// <summary>
/// Kód pro web. <b>Jen řetězec a platnost</b> — adresu do QR si poskládá
/// web, který svou adresu zná; API ji vědět nepotřebuje. Stejné rozhodnutí
/// jako u <see cref="KodDto"/> pro lodě.
/// </summary>
public record NapojeniKodDto(string Kod, DateTimeOffset PlatiDo);

/// <summary>Co telefon dostane výměnou za kód.</summary>
/// <param name="Klic">Tajemství do hlavičky. Vrací se jedinkrát.</param>
/// <param name="Zobrazovane">Jméno účtu, ať appka hned ví, kým je.</param>
public record NapojeniDto(string Klic, string Zobrazovane);

/// <summary>Napojený telefon v seznamu na profilu.</summary>
public record KlicUctuDto(
    int Id,
    string? Zarizeni,
    DateTimeOffset VydanV,
    DateTimeOffset? OzvalSeV);

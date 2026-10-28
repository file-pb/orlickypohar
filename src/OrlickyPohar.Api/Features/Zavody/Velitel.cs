namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// <b>Kdo je hlavní startér regaty</b> — a kdy jím být přestal.
///
/// <para>
/// <b>Proč to existuje</b> (nález R19 oponentury rozhodčího, body 2 až 4;
/// rozhodnuto Filipem 28. 10. 2026). Filip, 27. 10. 2026: *„Startér může
/// být jeden hlavní a druhý slave u druhého bodu startovní čáry…
/// Velitelský čas je ale jeden, je v rukách hlavního startéra a nesmí být
/// závislý."* Mechanismus pro rozpor dvou zapisovatelů projekt měl
/// (porovnání dvou snímků, scénář C7), jenže ten řeší **dva rovnocenné**
/// zápisy — tady je jeden nadřízený. To je jiné pravidlo: ne „ukaž rozdíl
/// a nech vybrat", ale „platí čas hlavního".
/// </para>
///
/// <para>
/// <b>Řada záznamů, ne jeden přepisovaný sloupec.</b> Po převzetí velení
/// musí zůstat doklad, kdo a kdy ho převzal — start je spornější než
/// viditelnost poloh, u které projekt doklad vyžaduje už dnes (důvod
/// u změny nastavení trackeru: *„je to doklad pro spor"*). Přepsat jméno
/// v jednom sloupci by ten doklad smazalo přesně tehdy, kdy je potřeba.
/// </para>
///
/// <para>
/// <b>Chová se jako okno závodního dne</b> (odsouhlaseno Filipem
/// 27. 10. 2026): stáhne se u mola, platí celý den, výpadek s ním nehne.
/// Rozhodovat o veliteli až v okamžiku startu by znamenalo, že výpadek
/// sebere startéru právo odstartovat — a to je horší než dnešní stav,
/// kdy se ztratí jen zápis.
/// </para>
/// </summary>
public class Velitel
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>Kdo velí. Je to účet, ne loď: velitelský čas drží člověk.</summary>
    public Guid UzivatelId { get; set; }

    /// <summary>Odkdy velí.</summary>
    public DateTimeOffset OdV { get; set; }

    /// <summary>
    /// Kdy velet přestal. <c>null</c> znamená, že velí teď.
    /// <para>
    /// Ukončuje se zápisem, ne mazáním — řada velitelů je doklad o tom,
    /// kdo kdy držel čas.
    /// </para>
    /// </summary>
    public DateTimeOffset? DoV { get; set; }

    /// <summary>
    /// Kdo velení převzal od tohohle velitele. <c>null</c> u toho, kdo
    /// velí teď, i u prvního, který ho nikomu nebral.
    /// </summary>
    public Guid? PrevzalId { get; set; }
}

/// <summary>
/// Pravidla velitelského času. Čisté funkce, bez databáze.
/// </summary>
public static class Veleni
{
    public const string NeniVelitel =
        "Velitelský čas drží hlavní startér. Chceš-li startovat, převezmi velení.";

    /// <summary>
    /// Proč start od tohohle člověka nesmí přepsat ten, který už je
    /// zapsaný — nebo <c>null</c>.
    ///
    /// <para>
    /// <b>Tohle je celý smysl velitelského času</b> (R19): jeden
    /// autoritativní čas, který drží hlavní startér. Slave u druhého bodu
    /// čáry smí zapisovat dojezdy a všechno ostatní; co nesmí, je
    /// <b>přepsat start</b>, který už velitel zapsal.
    /// </para>
    /// <para>
    /// <b>Opačně to jde:</b> velitel smí přepsat start zapsaný kýmkoliv.
    /// Právě proto je velitelský, a je to i cesta ven z krize — Filip,
    /// 27. 10. 2026: *„jakmile se připojí, dojde k nastavení nového
    /// velitele, převzetí času a jedeme standard."*
    /// </para>
    /// <para>
    /// <b>Regata bez velitele se chová jako dřív</b>, tedy start smí
    /// zapsat každý, kdo smí zapisovat. Velení je nástroj pro den, kdy
    /// jsou startéři dva; vynucovat ho i tam, kde je startér jeden, by
    /// znamenalo přidat klepnutí navíc bez užitku.
    /// </para>
    /// </summary>
    /// <param name="velitel">Kdo velí teď; <c>null</c>, když nikdo.</param>
    /// <param name="kdo">Kdo start zapisuje.</param>
    /// <param name="startUzJe">Je na rozjížďce zapsaný start od velitele?</param>
    public static string? ProcNesmiPrepsatStart(Guid? velitel, Guid kdo, bool startUzJe) =>
        velitel is { } v && v != kdo && startUzJe ? NeniVelitel : null;

    /// <summary>
    /// Smí tenhle člověk převzít velení? <b>Kdykoliv, i uprostřed
    /// odpočtu</b> — jen ne sám sobě.
    /// <para>
    /// Rozhodnuto 28. 10. 2026: *„Když hlavní spadne do vody tři minuty
    /// před startem, je to přesně ta chvíle, kdy to musí jít — zakázat
    /// převzetí během procedury by znamenalo zakázat záchranu tam, kde je
    /// potřeba nejvíc."*
    /// </para>
    /// </summary>
    public static string? ProcNejdePrevzit(Guid? velitel, Guid kdo) =>
        velitel == kdo ? "Velení už máš." : null;
}

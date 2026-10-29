using OrlickyPohar.Api.Features.Boje;
using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Co komise za jízdy vyhlásila. Každý druh má svou vlajku.</summary>
public enum DruhUkonu
{
    /// <summary>
    /// <b>Změna následujícího úseku dráhy</b> (ZPJ 33) — směr, délka, nebo
    /// obojí. Nese se vlajkou <c>C</c>, u změny směru i s novým kurzem.
    /// </summary>
    ZmenaUseku = 0,

    /// <summary>
    /// <b>Chybějící nebo posunutá značka</b> (ZPJ 34). Nahradí ji objekt
    /// s vlajkou <c>M</c> — u nás typicky doprovodné plavidlo.
    /// </summary>
    ChybejiciZnacka = 1,
}

/// <summary>Co se s délkou úseku stalo (ZPJ 33: znamení <c>+</c> a <c>−</c>).</summary>
public enum ZmenaDelky
{
    /// <summary>Délka se nemění, mění se jen směr.</summary>
    Beze = 0,
    Prodlouzeno = 1,
    Zkraceno = 2,
}

/// <summary>
/// <b>Úkon komise za jízdy</b> — změna úseku (ZPJ 33) a chybějící značka
/// (ZPJ 34).
///
/// <para>
/// <b>Vede se stranou, trať zůstane</b> (Filip, 28. 10. 2026: *„veď to
/// stranou: trať zůstane, jak byla přijatá, a změny za jízdy se zapisují
/// k rozjížďce"*). Je to totéž rozhodnutí jako u zkrácení dráhy, jen
/// o krok dál: zkrácení se nedotýká poloh vůbec, kdežto tyhle dva úkony
/// mění, kde značka doopravdy je. Zapsat tu novou polohu rovnou do trati
/// by bylo pohodlnější pro mapu, ale přijatá trať by se tím rozešla
/// s tím, co rozhodčí vyvěsil — a zámek, který má bránit tichým změnám
/// předpisu, bychom obešli podruhé.
/// </para>
///
/// <para>
/// <b>Trať se nepřestavuje, ani když se zkracuje.</b> Filip, 28. 10. 2026:
/// *„pokud se jede na cíl a přijde zkrácení, nebo odpískáme lodě na vodě,
/// protože nefouká, není potřeba měnit trať, byly by to zbytečné
/// komplikace. Prostě tu loď pípneme, že je v cíli, a hotovo."* Cíl je
/// zápis dojezdu, ne přestavba předpisu — a tahle tabulka je z téhož
/// důvodu doklad o tom, co komise vyhlásila, ne nová verze trati.
/// </para>
///
/// <para>
/// <b>Patří k rozjížďce, ne k závodu.</b> Co platilo v druhé rozjížďce,
/// nemusí platit ve třetí: komise vyhlašuje změnu na tu, která se zrovna
/// jede, a další startuje podle původní trati, dokud nevyhlásí znovu.
/// </para>
///
/// <para>
/// <b>Smaže se, nepřepisuje.</b> Úkon je vyhlášení, a to buď platí, nebo
/// se odvolá — upravovat zpětně „co vlastně viselo na stěžni" by z dokladu
/// udělalo dohad. Odvolání je smazání i s tím, kdo ho udělal, protože
/// cokoliv jiného by znamenalo řadu stavů nad něčím, co na vodě trvá
/// minuty.
/// </para>
/// </summary>
public class UkonZaJizdy
{
    public int Id { get; set; }

    public int RozjizdkaId { get; set; }
    public Rozjizdka? Rozjizdka { get; set; }

    public DruhUkonu Druh { get; set; }

    /// <summary>
    /// Prvek trati, kterého se úkon týká: u <see cref="DruhUkonu.ZmenaUseku"/>
    /// značka, ke které měněný úsek vede, u
    /// <see cref="DruhUkonu.ChybejiciZnacka"/> ta chybějící.
    /// <para>
    /// <b>Povinný</b>, a ne jen kvůli srozumitelnosti. Filip, 28. 10. 2026:
    /// *„důležité je, aby to bylo možné dotáhnout, až budeme dělat nějakou
    /// formu malého hendikepu — zkrácení k nějakému prvku trati bude zdroj
    /// pro výpočet."* <b>Hendikep zatím není</b> a tenhle kód se o něj
    /// nepokouší; jde jen o to, aby se k němu dalo dojít později. Úkon bez
    /// prvku by se do takového výpočtu nedal zapojit, i kdyby se všechno
    /// ostatní dochovalo.
    /// </para>
    /// </summary>
    public int PrvekId { get; set; }
    public PrvekTrati? Prvek { get; set; }

    /// <summary>
    /// Nový kurz ve stupních (ZPJ 33, vlajka <c>C</c> s kurzem).
    /// <c>null</c>, když se mění jen délka.
    /// </summary>
    public int? Kurz { get; set; }

    /// <summary>Jestli se úsek prodloužil, zkrátil, nebo zůstal (ZPJ 33).</summary>
    public ZmenaDelky Delka { get; set; } = ZmenaDelky.Beze;

    /// <summary>
    /// Kde stojí náhradní objekt s vlajkou <c>M</c>
    /// (<see cref="DruhUkonu.ChybejiciZnacka"/>). <c>null</c> u změny úseku.
    /// <para>
    /// <b>Volitelná i u náhrady.</b> Rozhodčí vyhlašuje z člunu a polohu
    /// nemusí mít po ruce; že značka chybí, je samo o sobě informace, kterou
    /// posádky potřebují hned. Doplnit se dá později.
    /// </para>
    /// </summary>
    public double? NahradniSirka { get; set; }
    public double? NahradniDelka { get; set; }

    /// <summary>
    /// Co k tomu komise říká — třeba čím je značka nahrazená. Nejvýš dvě stě
    /// znaků: je to poznámka do zápisu, ne vyhláška.
    /// </summary>
    public string? Poznamka { get; set; }

    /// <summary>
    /// Kdy to komise vyhlásila. <b>Čas z telefonu</b>, když ho appka
    /// poslala a prošel oknem v <see cref="Spolecne.CasKlienta"/>; jinak
    /// čas zápisu. Na vodě se úkon vyhlásí hned, ale odeslat se dá až
    /// v signálu — a na trati rozhoduje, kdy platil.
    /// </summary>
    public DateTimeOffset VyhlasenoV { get; set; }

    /// <summary>
    /// Kdy úkon došel na server. Liší se od <see cref="VyhlasenoV"/> jen
    /// u úkonu podrženého bez signálu; rozdíl zůstane doložený, ne
    /// přepsaný. <c>null</c> u záznamů z doby, kdy se zapisoval jen jeden čas.
    /// </summary>
    public DateTimeOffset? ZapsanoV { get; set; }

    /// <summary>
    /// Co se stalo s časem z telefonu — viz <see cref="Spolecne.CasKlienta.Posun"/>.
    /// </summary>
    public Spolecne.CasKlienta.Posun PosunCasu { get; set; }

    public Guid VyhlasilId { get; set; }
    public Uzivatel? Vyhlasil { get; set; }

    /// <summary>
    /// Vlajka, kterou se to na vodě nese. Plyne z druhu, ale vydává se ven,
    /// aby ji tabule ani appka nemusely odvozovat podruhé — a aby se
    /// nerozešly, kdyby přibyl další úkon.
    /// </summary>
    public string Vlajka => Druh switch
    {
        DruhUkonu.ChybejiciZnacka => "M",
        _ => "C",
    };
}

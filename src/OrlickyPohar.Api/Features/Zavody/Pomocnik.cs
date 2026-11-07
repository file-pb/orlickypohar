namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// <b>Kdo z pořadatelů dneska pomáhá u startu a u cíle</b> — a kdo ho k tomu
/// pustil.
///
/// <para>
/// <b>Proč to existuje</b> (nález K8 oponentury rozhodčího; rozhodnuto
/// Filipem 28. 10. 2026). Filip, 28. 10. 2026: *„Mnohdy např. u cíle
/// a startu nestojí pouze rozhodčí."* Doteď takový člověk musel dostat roli
/// <c>Organizator</c> na tu regatu — a s ní vypsání závodu, nahlášení
/// odjeto, přihlášky, vyloučení lodi, směrnice a stavbu trati. Mezistupeň
/// mezi editorem a pořadatelem neexistoval. Od chvíle, kdy Miloš řekl
/// *„zásah do startovní listiny smí provést pouze rozhodčí"*, to přestala
/// být vědomá hrana a stal se z toho rozpor: kdo má v cíli jen zapisovat
/// průjezdy, dostal přístup ke startovní listině.
/// </para>
///
/// <para>
/// <b>Není to nová role</b> (a to je na tom to hlavní). Filip: *„Chci, aby
/// to měl Miloš co nejjednodušší … asi v klubovně u zápisu bude na webu moct
/// zaškrtnout, kdo z pořadatelů bude moci pomáhat i u startu a cíle."* Ti
/// lidé pořadateli v ročníku <b>už jsou</b> — pohár má osm zastávek a každou
/// pořádá někdo jiný, takže u cíle Radavské regaty stojí pořadatel Zahájení
/// sezóny. Dnes na cizí zastávce nesmí nic, a aby tam mohl zapisovat, musel
/// by dostat <c>Organizator</c> i na ni. Příznak mu místo toho otevře jen
/// start a cíl. Výčet <see cref="Identita.Role"/> proto zůstává pětičlenný
/// a <c>Udeleni.RozhodciSmiUdelit</c> se nerozšiřuje — neudílí se role.
/// </para>
///
/// <para>
/// <b>Váže se na jednu regatu, ne na ročník.</b> Jinak by platil i tam, kde
/// ten člověk vůbec není. Je to vlastnost závodního dne, ne vlastnost účtu.
/// </para>
///
/// <para>
/// <b>Řada záznamů, ne přepisovaný sloupec</b> — stejný vzorec jako
/// u <see cref="Velitel"/>. Po regatě musí zůstat doklad, kdo byl toho dne
/// zaškrtnutý a kdo ho zaškrtl: když se o start nebo o dojezd strhne spor,
/// je první otázka, kdo ho zapisoval. Odškrtnutí proto zapisuje
/// <see cref="DoV"/>, nemaže řádek.
/// </para>
/// </summary>
public class Pomocnik
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>Kdo pomáhá. Je to účet, ne loď.</summary>
    public Guid UzivatelId { get; set; }

    /// <summary>Odkdy pomáhá.</summary>
    public DateTimeOffset OdV { get; set; }

    /// <summary>
    /// Kdy pomáhat přestal. <c>null</c> znamená, že pomáhá teď.
    /// </summary>
    public DateTimeOffset? DoV { get; set; }

    /// <summary>
    /// Který rozhodčí ho zaškrtl. Druhá polovina dokladu: samo „byl
    /// zaškrtnutý" neodpovídá na otázku, kdo o tom rozhodl.
    /// </summary>
    public Guid ZaskrtlId { get; set; }

    /// <summary>
    /// Kdo ho odškrtl. <c>null</c> u toho, kdo pomáhá teď.
    /// </summary>
    public Guid? OdskrtlId { get; set; }
}

/// <summary>
/// Pravidla pomoci u startu a u cíle. Čisté funkce, bez databáze.
/// </summary>
public static class Pomocnici
{
    public const string NeniPoradatel =
        "Pomáhat u startu a cíle smí jen pořadatel z tohohle ročníku.";

    public const string JizPomaha = "Tenhle už dneska pomáhá.";

    public const string NepomahaOdkdy = "Tenhle dneska nepomáhá, není co odškrtnout.";

    /// <summary>
    /// <b>Smí tenhle člověk to, co se dělá u vody</b> — převzít velení,
    /// pustit proceduru, zapsat start a dojezdy?
    ///
    /// <para>
    /// Jedno místo pro celé K8. Pořadatel téhle zastávky smí, protože směl
    /// vždycky; zaškrtnutý pomocník odjinud smí navíc, a <b>jen tohle</b>.
    /// Nic dalšího se tím neotevírá —
    /// <b>startovní listinu příznak nepouští</b>, a to je celý důvod, proč
    /// vznikl. Milošova věta *„do startovní listiny a do výsledků smí jen
    /// rozhodčí"* tím zůstává v platnosti.
    /// </para>
    /// <para>
    /// Rozpor zapsaný 28. 10. a znovu 7. 11.: Miloš na nahrávce nabídl
    /// i opačné čtení — *„nebo můžeme využít roli Pomocník a ten by pak
    /// mohl měnit i startovní listinu"*. Neprošlo: 7. 11. 2026 padlo
    /// rozhodnutí, že listinu po rozpravě vede <b>jen</b> rozhodčí
    /// (<see cref="Prihlasky.PoRozprave"/>), a příznak ji neotvírá.
    /// </para>
    /// <para>
    /// <b>Rozhodčí ročníku taky</b> (druhá polovina R38, 7. 11. 2026) — a je
    /// to oprava nesrovnalosti, ne rozvolnění. Celý K8 vznikl z Filipovy
    /// věty *„mnohdy např. u cíle a startu nestojí pouze rozhodčí"*, tedy
    /// z toho, že tam <b>stojí</b>; a přitom rozhodčí, který není zároveň
    /// pořadatel, nemohl u cíle klepnout jedinou loď. Hlavní rozhodčí
    /// přitom smí zápis vrátit k revizi, rozjížďku zrušit i publikovat —
    /// nepustit ho k zápisu dojezdů bylo jediné místo, kde se mu nevěřilo.
    /// <c>Rozhodci</c> totiž <b>nepokrývá</b> <c>Organizator</c>
    /// (<c>Prava.Pokryva</c>: *„rozhodčí není stupeň"*), takže se k té
    /// bráně nedostal ani omylem.
    /// </para>
    /// <para>
    /// <b>Dvojice očí se tím neztrácí</b>, protože se dělí dvě různé věci.
    /// <b>Zapsat</b> dojezdy z vody je pořízení čísel, která ještě nikdo
    /// nepodepsal; <b>změnit</b> podepsaná čísla je to, u čeho by rozhodčí
    /// ověřoval sám sebe — a tam zůstává cesta jediná: vrátit k revizi,
    /// nechat opravit, podepsat znovu. Proto je rozhodčí tady, a <b>ne</b>
    /// v <c>SmiZapisovatAsync</c>, za kterým leží startovní listina,
    /// zakládání rozjížděk, posun výsledků, pohár a publikace.
    /// </para>
    /// <para>
    /// Milošova věta *„úpravu výsledků smí provést pouze rozhodčí"* tím
    /// <b>není</b> splněná celá: zapisovat smí dál i pořadatel, a jestli
    /// mu to má zůstat, je rozhodnutí, které nikdo neudělal. Tohle řeší
    /// opačnou polovinu — že rozhodčí nemohl vůbec nic.
    /// </para>
    /// </summary>
    public static bool SmiUVody(bool poradatel, bool pomocnik, bool rozhodci = false) =>
        poradatel || pomocnik || rozhodci;

    /// <summary>
    /// Proč tohohle člověka nejde zaškrtnout — nebo <c>null</c>.
    ///
    /// <para>
    /// <b>Pořadatelem ročníku musí být předem.</b> Příznak roli nepřidává,
    /// jen přenáší na jednu zastávku to, co někdo v ročníku už má;
    /// zaškrtnout kolemjdoucího by z něj udělalo startéra bez toho, aby mu
    /// to kdo udělil. Stačí přitom pořadatelství <b>kterékoliv</b> zastávky
    /// ročníku — o tom to celé je.
    /// </para>
    /// <para>
    /// <b>Rozprava se tu nevynucuje</b>, i když se v praxi zaškrtává
    /// v klubovně před ní (časový program: zápis 9–10, rozprava 10:30,
    /// start 11:00). Zavřít to rozpravou by rozhodčímu u vody sebralo
    /// jedinou cestu, jak nahradit pomocníka, který se rozstonal — a na
    /// rozdíl od přihlášek tady nikdo takový zámek nevyslovil. U listiny
    /// rozprava zavírá <b>pořadateli</b>, ne rozhodčímu; zaškrtává přitom
    /// právě rozhodčí.
    /// </para>
    /// </summary>
    public static string? ProcNejdeZaskrtnout(bool jePoradatel, bool jizPomaha) =>
        !jePoradatel ? NeniPoradatel
        : jizPomaha ? JizPomaha
        : null;

    /// <summary>
    /// Proč nejde odškrtnout — nebo <c>null</c>. Odškrtnout jde jen toho,
    /// kdo pomáhá; jinak by v dokladu vznikl záznam o ukončení něčeho, co
    /// nezačalo.
    /// </summary>
    public static string? ProcNejdeOdskrtnout(bool jizPomaha) =>
        jizPomaha ? null : NepomahaOdkdy;
}

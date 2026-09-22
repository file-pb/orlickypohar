using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Workflow výsledků: kdo smí rozjížďku posunout kam a co u toho musí říct.
/// <para>
/// Čisté funkce ze stejného důvodu jako <c>Prava</c>, <c>Udeleni</c>,
/// <c>Psani</c> a <c>Kalendar</c>: ptá se na ně každý zápis, takže se to
/// musí dát zkoušet bez databáze, bez tokenu a bez Dockeru. Plán to říká
/// rovnou — <b>přechody hlídá jedna funkce s testy, ne rozeseté podmínky
/// po endpointech</b>.
/// </para>
/// </summary>
public static class Workflow
{
    /// <summary>Stavy tak, jak jdou po sobě. Vracení a eliminace stojí mimo řadu.</summary>
    public static readonly StavVysledku[] Rada =
    [
        StavVysledku.Navrzeno, StavVysledku.Overeno, StavVysledku.Schvaleno, StavVysledku.Potvrzeno,
    ];

    /// <summary>
    /// Kdo dostane výsledky do tohohle stavu.
    /// <para>
    /// <b>Zapsat a schválit nesmí dělat tentýž člověk</b>, jinak je schválení
    /// jen druhé kliknutí téhož. Proto zapisuje pořadatel závodu, ověřuje
    /// a schvaluje rozhodčí a poslední slovo i publikaci má správce.
    /// </para>
    /// <para>
    /// Tabulka workflow v plánu má u <c>Navrzeno</c> napsáno „editor“ —
    /// je to starší zápis téhož. Podle novějšího zadání rolí píše editor
    /// <b>jen na blog</b> a výsledky spravuje organizátor, takže platí ten.
    /// </para>
    /// </summary>
    /// <summary>
    /// Kdo smí rozjížďku zařadit do poháru, nebo ji z něj vyndat.
    /// <para>
    /// <b>Dokud jsou čísla rozepsaná, rozhoduje pořadatel</b> — na vodě se
    /// podle podmínek pozná, jestli se rozjížďka počítá, a zakládá ji taky
    /// on. Jakmile je někdo podepsal, je to zásah do poháru a patří
    /// rozhodčímu; ten do zápisu nesahá, ale o seriálu rozhoduje.
    /// </para>
    /// </summary>
    public static Role KdoSmiDoSerie(StavVysledku stav) =>
        Zapis.Otevreny(stav) ? Role.Organizator : Role.Rozhodci;

    public static Role KdoSmi(StavVysledku na) => na switch
    {
        StavVysledku.Navrzeno => Role.Organizator,
        StavVysledku.Overeno or StavVysledku.Schvaleno or StavVysledku.KRevizi => Role.Rozhodci,
        _ => Role.Spravce,
    };

    /// <summary>
    /// Proč výsledky takhle posunout nejde — nebo <c>null</c>, když to jde.
    /// <para>
    /// Platí čtyři pravidla:
    /// </para>
    /// <list type="number">
    /// <item>
    /// <b>Řadou po jednom kroku dopředu</b>, protože každý stupeň je něčí
    /// podpis. <b>Správce smí přeskočit</b> — to v plánu bylo od začátku
    /// a platí dál: ve svém rozsahu smí všechno, včetně toho říct „tenhle
    /// závod jsem si prošel celý sám“.
    /// </item>
    /// <item>
    /// <b>Zpátky se chodí přes revizi</b>, ne krokem vedle. Vrácení má
    /// důvod a ten je k ničemu, když se dá potichu obejít couvnutím
    /// o stupeň.
    /// </item>
    /// <item>
    /// <b>Z revize se vrací jako návrh.</b> Opravený zápis musí projít
    /// ověřením znovu — jinak by revize znamenala jen zdržení.
    /// </item>
    /// <item>
    /// <b>Eliminovat jde odkudkoliv a zpátky taky jako návrh.</b> Neplatná
    /// rozjížďka se pozná i po potvrzení; a když se ukáže, že platná byla,
    /// začíná se znovu od zápisu.
    /// </item>
    /// </list>
    /// </summary>
    public static string? ProcNejde(StavVysledku ze, StavVysledku na, bool spravce)
    {
        if (ze == na) return null;

        if (na is StavVysledku.Eliminovano) return null;

        if (na is StavVysledku.KRevizi)
            return ze == StavVysledku.Navrzeno
                ? "Návrh se nemá k čemu vracet — nikdo ho ještě nekontroloval."
                : null;

        if (ze is StavVysledku.KRevizi or StavVysledku.Eliminovano)
            return na == StavVysledku.Navrzeno
                ? null
                : $"Odsud se vrací jako návrh, ne rovnou na „{Nazev(na)}“. "
                  + "Opravený zápis musí projít ověřením znovu.";

        var zIndex = Array.IndexOf(Rada, ze);
        var naIndex = Array.IndexOf(Rada, na);

        if (naIndex < zIndex)
            return $"Zpátky na „{Nazev(na)}“ se nechodí. Vrať výsledky k revizi s důvodem.";

        // Správce smí přeskočit dopředu; ostatním je každý stupeň něčí podpis.
        return naIndex - zIndex == 1 || spravce
            ? null
            : $"Ze stavu „{Nazev(ze)}“ na „{Nazev(na)}“ se přeskočit nedá. "
              + "Každý stupeň je něčí podpis: " + string.Join(" → ", Rada.Select(Nazev)) + ".";
    }

    /// <summary>
    /// Stavy, do kterých se rozjížďka může hnout. Posílá se na obrazovku,
    /// aby nabídla jen to, co zápis pustí — dvě různá pravidla na dvou
    /// stranách drátu se rozejdou při první změně.
    /// </summary>
    public static IEnumerable<StavVysledku> MozneZ(StavVysledku ze, bool spravce) =>
        Enum.GetValues<StavVysledku>().Where(na => na != ze && ProcNejde(ze, na, spravce) is null);

    /// <summary>
    /// Důvod je povinný jen u vrácení k revizi. Jinde by byl formulářové
    /// pole navíc u úkonu, který se dělá jedním kliknutím.
    /// </summary>
    public static string? ProcNejdeBezDuvodu(StavVysledku na, string? duvod) =>
        na == StavVysledku.KRevizi && string.IsNullOrWhiteSpace(duvod)
            ? "Napiš, co je špatně. Bez důvodu začne ten, kdo to má opravit, hledáním."
            : null;

    /// <summary>
    /// Počítá se rozjížďka do výsledku závodu a do poháru?
    /// <para>
    /// Eliminovaná neplatí nikde — to je celý rozdíl proti
    /// <see cref="Rozjizdka.DoSerie"/>, která bere body jen poháru.
    /// </para>
    /// </summary>
    public static bool Plati(StavVysledku stav) => stav != StavVysledku.Eliminovano;

    /// <summary>České jméno stavu do hlášky. Obrazovka má vlastní, tohle je pro API.</summary>
    public static string Nazev(StavVysledku stav) => stav switch
    {
        StavVysledku.Navrzeno => "Navrženo",
        StavVysledku.Overeno => "Ověřeno",
        StavVysledku.Schvaleno => "Schváleno",
        StavVysledku.Potvrzeno => "Potvrzeno",
        StavVysledku.KRevizi => "K revizi",
        StavVysledku.Eliminovano => "Eliminováno",
        _ => stav.ToString(),
    };
}

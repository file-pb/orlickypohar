namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Co prvek na trati je. <b>Start a cíl jsou dvě různé funkce</b>, ne jedna
/// „čára": tytéž dvě polohy můžou být ráno start a odpoledne cíl.
///
/// <para>
/// <b>Čísla se nemění, jména ano</b> (Filip, 9. 10. 2026). Výčet se ukládá
/// jako celé číslo, takže přejmenování nepotřebuje migraci — ale jde ven
/// v JSON jako jméno, takže je to změna kontraktu a klient se musí
/// přegenerovat.
/// </para>
/// </summary>
public enum TypPrvku
{
    /// <summary>
    /// Bóje, kterou se otáčí. Ponechává se stranou, kterou říká
    /// <see cref="StranaPrvku"/>. Dřív se jmenovala „značka".
    /// </summary>
    OtocnaBoje = 0,

    /// <summary>
    /// Dvě bóje, projíždí se mezi nimi; stranu si volí loď.
    /// <b>Může být i otočná</b> (Filip: <i>„brána je dobrá a může být
    /// i otočná"</i>).
    /// </summary>
    Brana = 1,

    /// <summary>
    /// Otočná a hned za ní malá odskoková bóje. Obě se ponechávají touž
    /// stranou a v řadě je to <b>jedno místo</b>, proto jeden prvek se
    /// dvěma konci. Odskok je tam proto, aby se u otočné lodě netlačily
    /// při ostrém obratu.
    /// </summary>
    Odskok = 2,

    /// <summary>
    /// Start: levobok, pravobok a směr. Nemusí to být pevná linie, viz
    /// <see cref="DruhStartu"/>. Dřív „startovní čára".
    /// </summary>
    Start = 3,

    /// <summary>Cíl: levá a pravá. Opačný průjezd se nepočítá.</summary>
    Cil = 4,

    /// <summary>
    /// Bóje, kterou se projíždí, ne otáčí. <b>Nemusí to být jen plavební
    /// dráha</b> (Filip): i bóje, kterou jsme postavili sami. Jakou
    /// stranou, závisí na směru průjezdu — táž bóje proto může být ve
    /// dvou prvcích s různou stranou, což <c>Poradi</c> schválně připouští.
    /// </summary>
    PrujezdniBoje = 5,

    /// <summary>
    /// Otočná zóna nebo linie mezi dvěma objekty — molo, značka, objekt
    /// na břehu, <b>i dráty vysokého napětí nad vodou</b> (Filip). Bóje
    /// to být nemusí ani na jednom konci.
    /// </summary>
    OtocnaZona = 6,
}

/// <summary>
/// Kterým bokem lodi se prvek ponechává.
/// <para>
/// <b>Levobok a pravobok</b> (Filip, 9. 10. 2026). Dřív to byl opis
/// „ponechat po levé", který měl zabránit tomu, aby si někdo „objíždí se
/// levou" přečetl jako „točit doleva" — řešil to za cenu toho, že to
/// nebylo námořnicky. Čísla zůstala, mění se jen jména.
/// </para>
/// </summary>
public enum StranaPrvku
{
    /// <summary>Ponechat po levoboku.</summary>
    PoLeve = 0,

    /// <summary>Ponechat po pravoboku.</summary>
    PoPrave = 1,
}

/// <summary>
/// Čím je start vytyčený (Filip, 9. 10. 2026: <i>„start může být pevná
/// linie, ale také otevírající se brána za jedoucí startovací lodí jedoucí
/// po linii startu"</i>).
/// </summary>
public enum DruhStartu
{
    /// <summary>Pevná linie mezi dvěma konci.</summary>
    PevnaLinie = 0,

    /// <summary>
    /// Otevírající se brána: startuje se za startovací lodí, která jede po
    /// linii startu. Konce pak popisují, kudy ta linie vede, ne kde stojí
    /// branka — loď se po ní pohybuje.
    /// </summary>
    OtevirajiciSeBrana = 1,
}

/// <summary>
/// Světová strana. <b>Osm směrů, ne stupně</b> (Filip, 9. 10. 2026):
/// na vodě se člověk řídí rozhledem, a do poznámky stejně napíše
/// „startujeme na zámek".
/// </summary>
public enum SvetovaStrana
{
    S = 0,
    SV = 1,
    V = 2,
    JV = 3,
    J = 4,
    JZ = 5,
    Z = 6,
    SZ = 7,
}

/// <summary>
/// Jeden prvek trati: start, cíl, otočná či průjezdní bóje, brána,
/// odskok nebo otočná zóna.
///
/// <para>
/// <b>Prvek nese rozhodnutí, bóje zůstane měřením.</b> To je celé pravidlo
/// a plyne z něj zbytek: typ, pořadí, strana a směr jsou rozhodnutí
/// rozhodčího, a na nepřepisovaném záznamu měření by se daly změnit jedině
/// vyrobením pípnutí, které se nestalo.
/// </para>
///
/// <para>
/// <b>Prvek patří trati</b>, a tím se rozplétá, co plán říkal dvojím
/// způsobem. Text o tom, že celý řetěz přenastavení má dostat jedno
/// <c>PrvekId</c>, je starší než entita <see cref="Trat"/>. Dnes platí:
/// prvek ukazuje na <b>konkrétní záznamy bójí</b> a nemění je; historie
/// „téhož prvku v čase" je řetěz tratí, ne řetěz uvnitř prvku. Přestavba
/// zakládá novou trať a její prvky ukazují na bóje, které v tu chvíli stojí.
/// </para>
///
/// <para>
/// <b>Konec čáry nemusí být bóje.</b> Start i cíl se běžně vytyčí mezi bójí
/// a plavidlem komise nebo bodem na břehu. Druhý konec proto smí být jen
/// souřadnice — bez toho by pořadatel pípal neexistující bóji na pozici
/// lodi, tedy přesně to kódování do jména, které prvky ruší.
/// </para>
/// </summary>
public class PrvekTrati
{
    public int Id { get; set; }

    public int TratId { get; set; }
    public Trat? Trat { get; set; }

    public TypPrvku Typ { get; set; }

    /// <summary>
    /// Pořadí v trati. <b>Opakování je v pořádku</b> — trať
    /// <c>start → A → brána → A → brána → cíl</c> potřebuje tutéž značku
    /// dvakrát, a právě to pole <c>Poradi</c> na bóji neuneslo.
    /// </summary>
    public int Poradi { get; set; }

    /// <summary>Kterou stranou se ponechává. <c>null</c> znamená „neuvedeno".</summary>
    public StranaPrvku? Strana { get; set; }

    /// <summary>První konec. Vždycky bóje — prvek bez měření nedává smysl.</summary>
    public int BojeAId { get; set; }
    public Boje? BojeA { get; set; }

    /// <summary>Druhý konec, když je to bóje. U značky <c>null</c>.</summary>
    public int? BojeBId { get; set; }
    public Boje? BojeB { get; set; }

    /// <summary>Druhý konec, když to bóje není — plavidlo komise, bod na břehu.</summary>
    public double? KonecBSirka { get; set; }
    public double? KonecBDelka { get; set; }

    /// <summary>Čím ten druhý konec je, když to není bóje. „plavidlo komise".</summary>
    public string? KonecBPopis { get; set; }

    /// <summary>
    /// Jak se tenhle prvek má jet, řečeno slovy. <b>Vidí ji pořadatel
    /// i závodník</b> (Filip, 9. 10. 2026).
    /// <para>
    /// Je to <b>doplněk, ne náhrada</b> za stranu a směr. Vzniklo to
    /// z otázky, kam dát „po proudu / proti proudu": proud pravidlo není,
    /// rozhoduje strana a směr — ale věta <i>„první brána se projíždí po
    /// proudu"</i> se vymodelovat nedá a napsat musí jít. Co jde vyjádřit
    /// polem, do poznámky nepatří; obrazovka by pak ukazovala dvě pravdy.
    /// </para>
    /// </summary>
    public string? Poznamka { get; set; }

    /// <summary>
    /// Kterým směrem se startuje — světová strana. <b>Jen u startu.</b>
    /// Teprve s ním umí mapka nakreslit šipku průjezdu; bez něj by si ho
    /// musela vymyslet, a to je přesně ta lež, kvůli které prvky vznikly.
    /// </summary>
    public SvetovaStrana? Smer { get; set; }

    /// <summary>
    /// Čím je start vytyčený. <b>Jen u startu</b>, jinde <c>null</c>.
    /// </summary>
    public DruhStartu? DruhStartu { get; set; }

    /// <summary>Má prvek druhý konec, ať už bóji, nebo souřadnice?</summary>
    public bool MaDruhyKonec =>
        BojeBId is not null || (KonecBSirka is not null && KonecBDelka is not null);
}

/// <summary>
/// Pravidla prvku. Čisté funkce — kolik konců který typ potřebuje a co se
/// nesmí pustit do přijaté trati.
/// </summary>
public static class Prvky
{
    public const int PopisNejvic = 60;

    /// <summary>
    /// Poznámka, jak prvek jet. Krátká schválně — čte se na vodě z telefonu
    /// a dlouhý odstavec tam nikdo nepřečte. Na delší vysvětlení je
    /// plachetní směrnice.
    /// </summary>
    public const int PoznamkaNejvic = 200;

    /// <summary>
    /// Potřebuje tenhle typ druhý konec? Jediné <b>jednokoncové</b> jsou
    /// otočná a průjezdní bóje — jeden kus plastu ve vodě. Odskok má dva
    /// konce schválně: je to otočná a hned za ní odskoková, dohromady
    /// jedno místo v řadě.
    /// </summary>
    public static bool Dvoukonec(TypPrvku typ) =>
        typ is not (TypPrvku.OtocnaBoje or TypPrvku.PrujezdniBoje);

    /// <summary>
    /// Uvádí se u tohohle typu strana? U otočné bóje, průjezdní bóje
    /// a odskoku ano — tam ji určuje rozhodčí. U brány si ji volí loď
    /// a u startu, cíle i otočné zóny rozhoduje směr průjezdu.
    /// <para>
    /// U průjezdní bóje závisí strana na směru, kterým se kolem pluje
    /// (Filip): táž bóje proto může být ve dvou prvcích s různou stranou.
    /// </para>
    /// </summary>
    public static bool StranaPatri(TypPrvku typ) =>
        typ is TypPrvku.OtocnaBoje or TypPrvku.Odskok or TypPrvku.PrujezdniBoje;

    /// <summary>
    /// Proč prvek nejde uložit — nebo <c>null</c>.
    /// <para>
    /// <b>Neúplný prvek je horší než žádný:</b> půlka brány nakreslí na mapě
    /// bod tam, kde je průjezd, a loď k němu popluje.
    /// </para>
    /// </summary>
    public static string? ProcNejde(
        TypPrvku typ, int? bojeBId, double? sirka, double? delka, string? popis,
        StranaPrvku? strana, string? poznamka = null,
        SvetovaStrana? smer = null, DruhStartu? druhStartu = null)
    {
        // Směr a druh dávají smysl jen u startu. Jinde by to bylo pole,
        // které obrazovka ukáže a nikdo neví, co znamená.
        if (typ != TypPrvku.Start && (smer is not null || druhStartu is not null))
            return "Směr a druh startu se uvádějí jen u startu.";

        if (poznamka?.Trim().Length > PoznamkaNejvic)
            return $"Poznámka má nejvýš {PoznamkaNejvic} znaků. Na delší vysvětlení "
                   + "je plachetní směrnice.";

        var maBoji = bojeBId is not null;
        var maBod = sirka is not null && delka is not null;

        if (maBoji && maBod)
            return "Druhý konec je buď bóje, nebo bod — ne obojí.";

        if (Dvoukonec(typ))
        {
            if (!maBoji && !maBod)
                return "Tenhle prvek má dva konce. Vyber druhou bóji, nebo zadej bod "
                       + "(třeba plavidlo komise).";
            if (maBod && string.IsNullOrWhiteSpace(popis))
                return "Napiš, čím ten druhý konec je — „plavidlo komise“, „bod na břehu“. "
                       + "Bez toho se na vodě nepozná, kam se pluje.";
        }
        else if (maBoji || maBod)
        {
            return "Tenhle prvek je jedna bóje. Dva konce má start, cíl, brána, "
                   + "odskok a otočná zóna.";
        }

        if (popis?.Trim().Length > PopisNejvic)
            return $"Popis konce má nejvýš {PopisNejvic} znaků.";

        if (strana is not null && !StranaPatri(typ))
            return "Strana se uvádí u otočné bóje, průjezdní bóje a odskoku. "
                   + "U brány si ji volí loď, u startu a cíle rozhoduje směr průjezdu.";

        return null;
    }
}

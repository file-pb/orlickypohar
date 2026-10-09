namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Co prvek na trati je. <b>Start a cíl jsou dvě různé funkce</b>, ne jedna
/// „čára": tytéž dvě polohy můžou být ráno start a odpoledne cíl.
/// </summary>
public enum TypPrvku
{
    /// <summary>Jedna bóje, ponechává se jednou stranou.</summary>
    Znacka = 0,

    /// <summary>Dvě bóje, projíždí se mezi nimi; stranu si volí loď, směr je daný.</summary>
    Brana = 1,

    /// <summary>Dvě bóje, obě se ponechávají touž pevnou stranou; jedno místo v řadě.</summary>
    Odskok = 2,

    /// <summary>Startovní čára: překonává se jedním směrem.</summary>
    CaraStart = 3,

    /// <summary>Cílová čára: totéž, a opačný průjezd se nepočítá.</summary>
    CaraCil = 4,
}

/// <summary>
/// Kterou stranou se značka nebo odskok ponechává.
/// <para>
/// <b>Jmenuje se to „ponechat po levé / po pravé"</b> schválně. „Objíždí se
/// levou" si půlka lidí přečte jako „ponechat po levé" a druhá jako „točit
/// doleva", a to jsou protikladné věci.
/// </para>
/// </summary>
public enum StranaPrvku
{
    PoLeve = 0,
    PoPrave = 1,
}

/// <summary>
/// Jeden prvek trati: značka, brána, odskok nebo čára.
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

    /// <summary>Potřebuje tenhle typ druhý konec?</summary>
    public static bool Dvoukonec(TypPrvku typ) => typ != TypPrvku.Znacka;

    /// <summary>
    /// Smí si loď u tohohle typu volit stranu? U brány ano, u značky
    /// a odskoku ne — a u čáry se strana neuvádí vůbec, rozhoduje směr.
    /// </summary>
    public static bool StranaPatri(TypPrvku typ) =>
        typ is TypPrvku.Znacka or TypPrvku.Odskok;

    /// <summary>
    /// Proč prvek nejde uložit — nebo <c>null</c>.
    /// <para>
    /// <b>Neúplný prvek je horší než žádný:</b> půlka brány nakreslí na mapě
    /// bod tam, kde je průjezd, a loď k němu popluje.
    /// </para>
    /// </summary>
    public static string? ProcNejde(
        TypPrvku typ, int? bojeBId, double? sirka, double? delka, string? popis,
        StranaPrvku? strana)
    {
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
            return "Značka má jeden konec. Dva konce má brána, odskok nebo čára.";
        }

        if (popis?.Trim().Length > PopisNejvic)
            return $"Popis konce má nejvýš {PopisNejvic} znaků.";

        if (strana is not null && !StranaPatri(typ))
            return "Strana se uvádí u značky a odskoku. U brány si ji volí loď, "
                   + "u čáry rozhoduje směr průjezdu.";

        return null;
    }
}

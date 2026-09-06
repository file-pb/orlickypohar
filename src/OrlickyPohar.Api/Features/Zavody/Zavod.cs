using OrlickyPohar.Api.Features.Serial;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Jak se z rozjížděk sečte výsledek závodu.</summary>
public enum Vyhodnoceni
{
    /// <summary>Jedno pořadí přes všechny lodě. Typicky 24hodinovka.</summary>
    CelePole = 0,

    /// <summary>Samostatné pořadí uvnitř každé kategorie.</summary>
    PoKategoriich = 1,
}

public enum StavRozjizdky
{
    Planovana = 0,
    Probiha = 1,
    Dokoncena = 2,
    Zrusena = 3,
}

/// <summary>
/// Kódy závodních pravidel. Bez nich se výsledky nedají zadat — loď, která
/// nedokončila, není loď bez výsledku.
/// </summary>
public enum KodVysledku
{
    /// <summary>Nedokončil.</summary>
    Dnf = 1,

    /// <summary>Nestartoval.</summary>
    Dns = 2,

    /// <summary>Nezúčastnil se.</summary>
    Dnc = 3,

    /// <summary>Předčasný start.</summary>
    Ocs = 4,

    /// <summary>Diskvalifikace.</summary>
    Dsq = 5,

    /// <summary>Odstoupil.</summary>
    Ret = 6,

    /// <summary>Náprava.</summary>
    Rdg = 7,
}

/// <summary>
/// Jedno z přibližně dvanácti zastavení ročníku. Závody nejsou stejné —
/// vytrvalostní, okruhové, na 4,5 hodiny — a liší se v tom, jak se z nich
/// počítá výsledek a co z něj jde do poháru.
/// <para>
/// Rozdíly jsou <b>čísla na závodě</b>, ne pravidlový engine. Engine by se psal
/// dřív, než je známo, co má počítat.
/// </para>
/// </summary>
public class Zavod
{
    public int Id { get; set; }

    public int SerieId { get; set; }
    public Serie? Serie { get; set; }

    public required string Nazev { get; set; }

    /// <summary>Část veřejné adresy, unikátní v rámci série.</summary>
    public required string Slug { get; set; }

    /// <summary>Pořádající klub nebo osoba. Volný text — pořadatel není účet v systému.</summary>
    public string? Poradatel { get; set; }

    public DateOnly Datum { get; set; }

    /// <summary>Konec u vícedenních závodů. Prázdné znamená jednodenní.</summary>
    public DateOnly? DatumKonce { get; set; }

    /// <summary>
    /// Vytrvalostní, okruhový, Izolepa. Volný text schválně: seznam typů je
    /// <b>data, ne model</b>, a další ročník přinese typ, který dneska neznáme.
    /// </summary>
    public string? Typ { get; set; }

    /// <summary>Pořadí zastávky v ročníku.</summary>
    public int Poradi { get; set; }

    // --- Rozjížďky → výsledek závodu ---

    /// <summary>Kolik nejhorších rozjížděk se škrtá. Okruhový závod typicky 1, vytrvalostní 0.</summary>
    public int PocetSkrtu { get; set; }

    public Vyhodnoceni Vyhodnoceni { get; set; } = Vyhodnoceni.PoKategoriich;

    // --- Výsledek závodu → body do seriálu ---

    /// <summary>
    /// Kolik rozjížděk se z tohohle závodu počítá do poháru. Prázdné znamená všechny;
    /// Izolepa má 1.
    /// </summary>
    public int? PocetRozjizdekDoSerie { get; set; }

    /// <summary>Váha závodu v seriálu, běžně 1.0.</summary>
    public decimal KoeficientDoSerie { get; set; } = 1.0m;

    public bool Publikovano { get; set; }

    public List<Rozjizdka> Rozjizdky { get; set; } = [];
}

/// <summary>
/// Která loď na tenhle závod skutečně přijela a kdo ji vezl. Loď nejede všech
/// dvanáct zastavení a kormidelník se mezi závody mění — kategorii ale účast
/// <b>nenese</b>, ta patří celoroční přihlášce.
/// </summary>
public class Ucast
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>Odkaz na celoroční přihlášku, ne přímo na loď — přes ni se dědí kategorie.</summary>
    public int PrihlaskaId { get; set; }
    public Prihlaska? Prihlaska { get; set; }

    public int? KormidelnikId { get; set; }
    public Lode.Osoba? Kormidelnik { get; set; }

    /// <summary>
    /// Posádka jako text. Vazební tabulka na osoby přibude, teprve až bude
    /// potřeba se posádky ptát — dneska se jen vypisuje.
    /// </summary>
    public string? Posadka { get; set; }
}

/// <summary>Jedna rozjížďka závodu. Vytrvalostní závod má jednu, okruhový několik.</summary>
public class Rozjizdka
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    public int Cislo { get; set; }

    public DateTimeOffset? StartV { get; set; }

    public StavRozjizdky Stav { get; set; } = StavRozjizdky.Planovana;
}

/// <summary>
/// Účast v jedné rozjížďce. Ukládá se jen to, co se skutečně stalo:
/// <b>pořadí v cíli, časy a kód</b>.
/// <para>
/// <b>Body se tu záměrně neukládají</b> — počítají se. Pravidla se mezi ročníky
/// mění a přepočet celého seriálu musí jít kdykoliv spustit znovu. Kdyby byly
/// body uložené jako fakt, znamenala by každá změna pravidla datovou migraci
/// místo přepočtu.
/// </para>
/// </summary>
public class Vysledek
{
    public int Id { get; set; }

    public int RozjizdkaId { get; set; }
    public Rozjizdka? Rozjizdka { get; set; }

    public int UcastId { get; set; }
    public Ucast? Ucast { get; set; }

    /// <summary>Pořadí v cíli. Prázdné, když loď nedojela — pak platí kód.</summary>
    public int? PoradiVCili { get; set; }

    public DateTimeOffset? DojezdV { get; set; }

    /// <summary>
    /// Naměřený čas. Drží se vedle času dojezdu, protože starší výsledky
    /// bývají zapsané jen jako čas a start rozjížďky k nim nikdo nedohledá.
    /// </summary>
    public TimeSpan? NamerenyCas { get; set; }

    /// <summary>Prázdné znamená regulérní dojezd.</summary>
    public KodVysledku? Kod { get; set; }
}

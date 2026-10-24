using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Okna;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Trasy;

/// <summary>Odkud body přišly.</summary>
public enum ZdrojTrasy
{
    /// <summary>Skutečný záznam z GPS telefonu.</summary>
    Gps = 0,

    /// <summary>
    /// Simulovaná plavba z appky. Ukládá se schválně — slouží k ladění
    /// celé cesty dat a <b>nesmí se dát zaměnit</b> se skutečnou trasou.
    /// </summary>
    Simulace = 1,
}

/// <summary>
/// Trasa lodi zaznamenaná telefonem na palubě.
/// <para>
/// <b>Nahrává se po dojezdu, ne za jízdy.</b> Pilot podle plánu nemá
/// veřejnou živou mapu; hodnota je v tom, že trasy vůbec vzniknou a dá se
/// na nich zjistit, co z téhle kapitoly stojí za dodělání.
/// </para>
/// <para>
/// <b>Identifikátor z telefonu, ne náš.</b> <see cref="LokalniId"/> si
/// vyrábí appka a server ho jen přebírá. Dvě věci z toho plynou: nahrání
/// jde zopakovat, aniž by vznikla druhá trasa (přejímací podmínka č. 3),
/// a telefon trasu pojmenuje dřív, než se vůbec dostane na síť. Ročník se
/// navíc před sezónou maže a importuje znovu, takže serverová ID se mění —
/// trasa zapsaná v telefonu to musí přežít.
/// </para>
/// </summary>
public class Trasa
{
    public int Id { get; set; }

    /// <summary>
    /// Identifikátor, který trase dal telefon. Spolu s <see cref="KlicId"/>
    /// je jedinečný — podle toho se pozná opakované nahrání téže trasy.
    /// </summary>
    public required string LokalniId { get; set; }

    /// <summary>
    /// Mobilní klíč, kterým telefon trasu nahrál.
    /// <para>
    /// <b>Trasa patří lodi, ne člověku.</b> Nahrávání jde vždycky přes klíč,
    /// ať telefon drží kapitán nebo posádka — dvě různé cesty k témuž by
    /// znamenaly dvě místa, kde se dá udělat chyba v bezpečnosti.
    /// </para>
    /// </summary>
    public int KlicId { get; set; }
    public KlicLodi? Klic { get; set; }

    /// <summary>Loď, ke které trasa patří. Bere se z klíče, nehádá se.</summary>
    public int LodId { get; set; }
    public Lod? Lod { get; set; }

    /// <summary>
    /// Jméno lodi tak, jak ho posádka potvrdila při startu záznamu.
    /// <para>
    /// Drží se vedle odkazu na loď schválně: přejímací podmínka č. 6 je
    /// *„telefon přiřazený ke špatné lodi"*, a když se obojí rozejde, je to
    /// vidět.
    /// </para>
    /// </summary>
    public required string LodNazev { get; set; }

    /// <summary>
    /// Regata, ke které záznam patří.
    /// <para>
    /// <b>Vyplňuje ho server z klíče a z běžícího okna</b>, ne telefon:
    /// jméno regaty níž je volný text, který posádka napsala, a podle něj
    /// se nedá nic řadit ani ukázat. Bez vazby by trasa k závodu nevedla
    /// vůbec — a pořadatelský přehled musí vědět, u které regaty ji ukázat.
    /// </para>
    /// <para>
    /// <b>Drží se na trase, ne jen na úseku rozjížďky.</b> Záznam, který do
    /// žádné rozjížďky nespadne — celý padl do čekání na vodě, rozjížďka se
    /// zrušila, posádka vyplula a nevyjela —, pořád patří té regatě. Kdyby
    /// viselo všechno na rozjížďce, zmizel by z přehledu zrovna ve dnech,
    /// kdy se něco nepovedlo.
    /// </para>
    /// </summary>
    public int? ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>
    /// Okno závodního dne, ve kterém záznam začal. Říká, <b>kdy to smělo
    /// vzniknout</b> — a jeho tvrdý konec je mez, za kterou se trasa
    /// neuchovává.
    /// </summary>
    public int? OknoId { get; set; }
    public OknoRegaty? Okno { get; set; }

    /// <summary>Jméno regaty, jak ho posádka zadala. Nepovinné.</summary>
    public string? RegataNazev { get; set; }

    public ZdrojTrasy Zdroj { get; set; }

    /// <summary>Kdy posádka záznam spustila, podle hodin telefonu.</summary>
    public DateTimeOffset Zacatek { get; set; }

    /// <summary>Kdy ho ukončila. Dokud nahrává, je prázdné.</summary>
    public DateTimeOffset? Konec { get; set; }

    /// <summary>
    /// O kolik se rozešly hodiny telefonu se serverem, změřeno při prvním
    /// nahrání.
    /// <para>
    /// <b>Posun se ukládá, nezahlazuje</b> (Filip, 20. 10. 2026: *„když se
    /// rozchází čas serveru a mobilu, tak ten posun je potřeba s tím časem
    /// držet"*). Příznak „čas opraven" by řekl jen, že se něco stalo, ne
    /// o kolik. Díky uloženému posunu se trasa dá kdykoli vrátit na původní
    /// měření a je poznat, co je měření a co korekce — bez toho by se
    /// chybná korekce tiše šířila dál do historie trati.
    /// </para>
    /// </summary>
    public long? PosunMs { get; set; }

    /// <summary>Kdy dorazila první dávka.</summary>
    public DateTimeOffset NahranoV { get; set; }

    /// <summary>Kdy dorazila poslední dávka. Podle toho se pozná rozdělané nahrávání.</summary>
    public DateTimeOffset PosledniDavkaV { get; set; }

    /// <summary>
    /// Posádka označila nahrávání za dokončené. Do té doby je trasa
    /// rozdělaná a smí se do ní doposílat — přejímací podmínka č. 4 je
    /// „přerušené nahrání se dá dokončit".
    /// </summary>
    public bool Dokoncena { get; set; }

    public List<TrasaBod> Body { get; set; } = [];
}

/// <summary>
/// Jeden bod trasy.
/// <para>
/// <b>Dva časy, ne jeden.</b> <see cref="CasGps"/> přišel s polohou,
/// <see cref="CasZarizeni"/> jsou hodiny telefonu v okamžiku zápisu.
/// Hodiny se dají přestavit, čas z polohy ne, takže jejich rozdíl je
/// jediná měřitelná stopa, kterou po sobě skok hodin nechá. Žádný bod se
/// kvůli času nezahazuje — ani ten s časem v budoucnosti.
/// </para>
/// </summary>
public class TrasaBod
{
    public long Id { get; set; }

    public int TrasaId { get; set; }
    public Trasa? Trasa { get; set; }

    /// <summary>
    /// Pořadové číslo bodu v telefonu. Spolu s <see cref="TrasaId"/> je
    /// jedinečné, a díky tomu <b>přijetí téže dávky podruhé nic nezdvojí</b>.
    /// Na tom stojí přejímací podmínka č. 3: po výpadku se prostě pošle
    /// znovu.
    /// </summary>
    public long LokalniId { get; set; }

    public double Sirka { get; set; }
    public double Delka { get; set; }

    /// <summary>Přesnost v metrech, jak ji hlásí GPS. Může chybět.</summary>
    public double? PresnostM { get; set; }

    public double? RychlostMS { get; set; }
    public double? Kurz { get; set; }
    public double? VyskaM { get; set; }

    public DateTimeOffset CasGps { get; set; }
    public DateTimeOffset CasZarizeni { get; set; }

    /// <summary>
    /// Android označil polohu za podvrženou, nebo bod pochází ze simulace.
    /// Drží se, aby se simulovaná trasa nedala zaměnit se skutečnou.
    /// </summary>
    public bool Podvrzeny { get; set; }
}

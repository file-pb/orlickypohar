using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Odkud se poloha bóje vzala.
/// <para>
/// <b>Měří jediný z nich.</b> Telefon u bóje hlásí i přesnost a ta se
/// ukládá; bod odečtený z mapy žádnou přesnost nemá a tvářit se, že má,
/// by byl výmysl. Dokud tohle pole nebylo, slil se „telefon přesnost
/// nehlásí" a „opsáno z mapy" do jednoho prázdného čísla.
/// </para>
/// <para>
/// Proč se poloha vůbec zadává jinak než pípnutím (Filip, 9. 10. 2026):
/// někdo u počítače ji zapíše za stavitele, který pípat neumí, nebo si
/// rozhodčí po posunu zavolá s člověkem úplně mimo proces — *„ukotvi mi
/// to tam a pošli mi odkaz v mapě"*. V obou případech zapisuje někdo
/// jiný, než kdo tu bóji viděl, a záznam to má říct.
/// </para>
/// </summary>
public enum ZdrojPolohy
{
    /// <summary>Změřeno telefonem u bóje. Jediný zdroj, který měří.</summary>
    Telefon = 0,

    /// <summary>Odečteno z mapy — opsané souřadnice nebo odkaz do mapy.</summary>
    Mapa = 1,

    /// <summary>Z QR kódu, který nesl odkaz do mapy. Taky odečtené, jen jinudy.</summary>
    Qr = 2,
}

/// <summary>
/// Bóje postavená na trati (Filip, 4. 10. 2026: *„musíme udělat verzi
/// v appce pro pořadatele, který staví bójky, aby pípnul GPS, když postaví
/// bójku, nebo přenastaví"*).
/// <para>
/// <b>Přesnější polohu než ten, kdo bóji staví, nemá nikdo.</b> Trať je
/// zároveň podmínka pro tři věci z plánu: okna pro zhuštění záznamu trasy,
/// pořadí na vodě a čitelnou mapu.
/// </para>
/// <para>
/// <b>Přenastavení je nový záznam, ne přepis</b> — stejné pravidlo jako
/// u plachetní směrnice. Trať se během dne mění a trasa musí jít porovnat
/// se stavem, který zrovna platil. Proto se poloha nikdy nepřepisuje
/// a místo mazání se bóje označí za sebranou.
/// </para>
/// </summary>
public class Boje
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>
    /// Fotky bóje z okamžiku postavení (Filip, 9. 10. 2026). Jsou to doklady
    /// k poloze, ne obrázky na web: ze souřadnic se nepozná, jestli je ta
    /// bóje nafouklá, jakou má barvu a co je za ní na břehu.
    /// <para>
    /// <b>Od 15. 10. 2026 jdou ven i veřejně</b>, u značek na trati regaty
    /// (Filip: *„náhledy bójí a fotky v trati na regatě"*). Původně se
    /// nevydávaly „stejně jako celá trať" — jenže trať je veřejná od chvíle,
    /// kdy ji rozhodčí přijme, takže ten důvod padl. Co ven nejde dál, jsou
    /// údaje o měření: kdo pípal a s jakou přesností.
    /// </para>
    /// <para>
    /// <b>Víc než jedna</b> (Filip, 9. 10. 2026): jeden snímek zblízka
    /// neukáže zároveň bóji i břeh za ní, a teprve obojí dohromady říká,
    /// kde to je.
    /// </para>
    /// <para>
    /// <b>Patří k záznamu, ne k bóji jako věci.</b> Přenastavení zakládá
    /// nový záznam, takže i fotky jsou nové; ty staré zůstanou u staré
    /// polohy a je z nich vidět, jak trať vypadala tehdy. Sebrání na nich
    /// nemění nic — záznam o poloze zůstává a fotka je jeho doklad.
    /// </para>
    /// </summary>
    public ICollection<Fotky.Fotka> Fotky { get; set; } = [];

    /// <summary>
    /// Čím bóje na trati je: „start levý", „bóje 1", „cíl". Volný text —
    /// trati se liší regatu od regaty a číselník by jen překážel.
    /// </summary>
    public required string Nazev { get; set; }

    /// <summary>Pořadí na trati. Podle něj se skládá trať a kola.</summary>
    public int Poradi { get; set; }

    public double Sirka { get; set; }
    public double Delka { get; set; }

    /// <summary>
    /// Přesnost hlášená telefonem v metrech. <b>Ukládá se schválně</b>:
    /// iPhone s vypnutou přesnou polohou hlásí klidně 65 m a bez tohohle
    /// čísla by se taková poloha tvářila stejně jako přesná.
    /// <para>U polohy z mapy je prázdná — mapa přesnost neměří.</para>
    /// </summary>
    public double? PresnostM { get; set; }

    /// <summary>
    /// Odkud se poloha vzala. Starší záznamy jsou všechny z telefonu,
    /// protože jinudy to tehdy nešlo — nula je tedy pravda, ne doplněk.
    /// </summary>
    public ZdrojPolohy Zdroj { get; set; }

    public DateTimeOffset PostavenaV { get; set; }

    public Guid PostavilId { get; set; }
    public Uzivatel? Postavil { get; set; }

    /// <summary>
    /// Záznam, který tenhle nahradil. Řetěz přenastavení tak jde projít
    /// zpátky — kde bóje stála, když kolem ní loď proplouvala.
    /// </summary>
    public int? NahrazujeId { get; set; }
    public Boje? Nahrazuje { get; set; }

    /// <summary>Jakou barvu ta bóje má. <c>null</c> znamená „neuvedeno".</summary>
    public BarvaBoje? Barva { get; set; }

    /// <summary>
    /// Jaký má tvar. <c>null</c> znamená „neuvedeno" — na vodě se pípá
    /// jednou rukou a barva sama nese nejvíc.
    /// </summary>
    public TvarBoje? Tvar { get; set; }

    /// <summary>
    /// Čím je značka značená. <c>null</c> znamená „neuvedeno“ — viz
    /// <see cref="DruhZnaceni"/>, proč se starým záznamům nic nedoplňuje.
    /// </summary>
    public DruhZnaceni? Znaceni { get; set; }

    /// <summary>
    /// Poznámka ke značce (Filip, 10. 10. 2026: <i>„občas tam potřebuju
    /// napsat poznámku“</i>). Jméno je krátký štítek do seznamu a na mapku;
    /// sem patří to, co se do jména nevejde — „kotva se trhá“, „molo
    /// u klubovny, druhý pacholík“.
    /// </summary>
    public string? Popis { get; set; }

    /// <summary>
    /// Kdy ji někdo sebral z vody. Sebraná bóje zmizí z trati, ale zůstane
    /// v historii — trasa z té doby se bez ní nedá přečíst.
    /// </summary>
    public DateTimeOffset? SebranaV { get; set; }

    /// <summary>
    /// Kdy ji nahradilo novější pípnutí. Nastavuje se na <b>starém</b>
    /// záznamu, takže platná bóje se pozná bez dotazu na ostatní.
    /// </summary>
    public DateTimeOffset? NahrazenaV { get; set; }

    /// <summary>Platná bóje: nenahrazená novějším pípnutím a nesebraná.</summary>
    public bool Platna => NahrazenaV is null && SebranaV is null;
}

/// <summary>Bóje, jak ji vidí klient.</summary>
/// <summary>
/// Barva bóje (Filip, 9. 10. 2026). <b>Patří bóji, ne prvku:</b> je to
/// vlastnost toho kusu plastu ve vodě, ne rozhodnutí o trati — a pak se
/// ukáže všude, v seznamu bójí i na mapce.
/// <para>
/// Není to výčet znaků z vyhlášky. Ty jsou kombinace barvy a tvaru
/// (červená válcová je pravá strana plavební dráhy, zelená kuželová
/// levá), a bóje, které stavíme my, mají barvu, jakou zrovna máme.
/// </para>
/// </summary>
public enum BarvaBoje
{
    Cervena = 0,
    Zelena = 1,
    Zluta = 2,
    Oranzova = 3,
    Bila = 4,
    Modra = 5,

    /// <summary>
    /// Růžová. Fórek pro Izolepu (Filip, 11. 10. 2026) — ve výčtu je
    /// proto, že ta bóje ve vodě opravdu plave.
    /// </summary>
    Ruzova = 6,
}

/// <summary>
/// Tvar bóje. <b>Nepovinný schválně:</b> na vodě se pípá jednou rukou
/// a barva sama nese nejvíc. Tvar se kreslí, jen když je vyplněný.
/// </summary>
public enum TvarBoje
{
    /// <summary>Válcová. S červenou je to pravá strana plavební dráhy.</summary>
    Valcova = 0,

    /// <summary>Kuželová. Se zelenou je to levá strana plavební dráhy.</summary>
    Kuzelova = 1,

    Kulova = 2,

    /// <summary>Válec se sférickým vrškem — sportovní bóje, kterou stavíme my.</summary>
    SferickyVrsek = 3,

    /// <summary>Plovatka: tyč nad hladinou, ne těleso.</summary>
    Plovatka = 4,

    Jiny = 5,

    /// <summary>
    /// Nafukovací plameňák, specialita Izolepy (Filip, 11. 10. 2026).
    /// <b>Vyhláška ho nezná</b>, takže se za její znak nikdy nevydává —
    /// jinak je to tvar jako každý jiný.
    /// </summary>
    Plamenak = 6,
}

/// <summary>
/// Čím je ta značka na vodě značená (Filip, 10. 10. 2026). <b>Jeden dotyk
/// nese význam, barvu i tvar</b> — dřív se barva klikala zvlášť, tvar
/// nezadával vůbec a význam se dohadoval z jejich kombinace.
///
/// <para>
/// <b>Nepovinné schválně.</b> Starší záznamy žádné značení nevybíraly
/// a doplnit jim „naše bóje“ by byl výmysl: rozhodčí mohl stejně dobře
/// pípnout znak plavební dráhy, protože průjezdní bóje je pokrývá
/// schválně obojí. Prázdno znamená „neuvedeno“, stejně jako u barvy
/// a tvaru. Tím se tohle pole liší od <see cref="ZdrojPolohy"/>, kde nula
/// byla pravda — jinudy než pípnutím to tehdy nešlo.
/// </para>
///
/// <para>
/// <b>Plavidlo a objekt na břehu tu jsou proto, aby bod prvku nemusel být
/// bóje</b> (Filip: <i>„cíl mezi lodí a molem je dost pravděpodobný“</i>,
/// a totéž u startu). Měření polohy to je pořád, takže patří do téhle
/// tabulky — a molo i loď komise tím dostanou fotku i historii. Fotka
/// mola je zrovna ten doklad, kde linie končila.
/// </para>
/// </summary>
public enum DruhZnaceni
{
    /// <summary>Pravá strana plavební dráhy: červený válec, nebo červená plovatka.</summary>
    DrahaPrava = 0,

    /// <summary>Levá strana plavební dráhy: zelený kužel, nebo zelená plovatka.</summary>
    DrahaLeva = 1,

    /// <summary>Sportovní znak dráhy: žlutý válec se sférickým vrškem.</summary>
    DrahaSport = 2,

    /// <summary>Zákaz vplutí: žlutý kužel.</summary>
    DrahaZakaz = 3,

    /// <summary>
    /// Bóje, kterou stavíme my. Barvu i tvar má, jaké zrovna máme —
    /// obrazovka nabízí žlutou se sférickým vrškem, ale to je její
    /// výchozí stav, ne pravidlo.
    /// </summary>
    NaseBoje = 4,

    /// <summary>Plavidlo: startovací loď, plavidlo komise. Hýbe se, takže přepípnutí je u něj běžné.</summary>
    Plavidlo = 5,

    /// <summary>Objekt na břehu: molo, dráty nad vodou, značka na skále.</summary>
    ObjektNaBrehu = 6,
}

public record BojeDto(
    int Id,
    string Nazev,
    int Poradi,
    double Sirka,
    double Delka,
    double? PresnostM,
    DateTimeOffset PostavenaV,
    string? Postavil,
    bool Sebrana,
    IReadOnlyList<Fotky.ObrazekDto> Fotky,
    ZdrojPolohy Zdroj = ZdrojPolohy.Telefon,
    BarvaBoje? Barva = null,
    TvarBoje? Tvar = null,
    DruhZnaceni? Znaceni = null,
    string? Popis = null);

/// <summary>Pípnutí polohy: co posílá web i appka.</summary>
/// <param name="Nazev">Čím bóje je — „bóje 1", „start levý".</param>
/// <param name="Poradi">Pořadí na trati; nula znamená „za poslední".</param>
/// <param name="Sirka">Zeměpisná šířka ve stupních.</param>
/// <param name="Delka">Zeměpisná délka ve stupních.</param>
/// <param name="PresnostM">Přesnost z telefonu v metrech, když ji hlásí.</param>
/// <param name="NahrazujeId">Při přenastavení id bóje, která tam stála dosud.</param>
/// <param name="Zdroj">
/// Odkud poloha je. Chybějící znamená <c>Telefon</c>, aby klient, který
/// o poli neví, posílal dál pravdu — dokud tohle pole nebylo, jiná cesta
/// než pípnutí z telefonu neexistovala.
/// </param>
/// <param name="Znaceni">
/// Čím je značka značená. Chybějící znamená „neuvedeno“ — klient, který
/// o poli neví, tím nic nevymýšlí.
/// </param>
/// <param name="Popis">
/// Poznámka ke značce. <b>Nepatří na hlavní cestu průvodce</b> (Filip,
/// 10. 10. 2026: <i>„přednost má ergonomie klikacího zadávání“</i>) —
/// píše se jen občas, takže obrazovka ji má mít schovanou.
/// </param>
public record PipnutiVstup(
    string? Nazev,
    int Poradi,
    double Sirka,
    double Delka,
    double? PresnostM,
    int? NahrazujeId,
    ZdrojPolohy? Zdroj = null,
    BarvaBoje? Barva = null,
    TvarBoje? Tvar = null,
    DruhZnaceni? Znaceni = null,
    string? Popis = null);

/// <summary>Pravidla pípnutí. Čisté funkce, bez databáze.</summary>
public static class Pipnuti
{
    public const int NazevNejvic = 60;

    /// <summary>
    /// Poznámka ke značce. Krátká schválně — je to doplněk ke jménu, ne
    /// místo na popis trati; na ten je plachetní směrnice.
    /// </summary>
    public const int PopisNejvic = 200;

    /// <summary>
    /// Je ta značka bóje? <b>Plavidlo a objekt na břehu nejsou</b>, a tím
    /// se řídí, co u nich smí být vyplněné.
    /// </summary>
    public static bool JeBoje(DruhZnaceni druh) =>
        druh is not (DruhZnaceni.Plavidlo or DruhZnaceni.ObjektNaBrehu);

    /// <summary>
    /// Nad tuhle přesnost se poloha nebere. Telefon u vody hlásí běžně 3 až
    /// 10 m; sto metrů znamená, že se chytá sítě, ne družic — a taková bóje
    /// by posunula celou trať.
    /// </summary>
    public const double NejhorsiPresnostM = 100;

    /// <summary>
    /// Orlík i s rezervou. Překlep v souřadnicích (prohozená šířka a délka)
    /// by jinak postavil bóji v Africe a nikdo by si toho nevšiml.
    /// </summary>
    public const double SirkaOd = 49.2;
    public const double SirkaDo = 49.8;
    public const double DelkaOd = 14.0;
    public const double DelkaDo = 14.5;

    /// <summary>Proč pípnutí nejde — nebo <c>null</c>, když jde.</summary>
    public static string? ProcNejde(PipnutiVstup vstup)
    {
        if (string.IsNullOrWhiteSpace(vstup.Nazev)) return "Napiš, čím ta bóje je — třeba „bóje 1\".";
        if (vstup.Nazev.Trim().Length > NazevNejvic)
            return $"Jméno bóje má nejvýš {NazevNejvic} znaků.";

        if (vstup.Popis?.Trim().Length > PopisNejvic)
            return $"Poznámka má nejvýš {PopisNejvic} znaků. Na delší vysvětlení "
                   + "je plachetní směrnice.";

        // Plavidlo ani molo nejsou kus plastu, takže barva a tvar u nich nic
        // neznamenají. Kdyby je směly nést, nakreslila by mapka u lodi komise
        // červený válec — a závodník by hledal bóji, která tam není.
        if (vstup.Znaceni is { } druh && !JeBoje(druh)
            && (vstup.Barva is not null || vstup.Tvar is not null))
            return "Plavidlo ani objekt na břehu nemají barvu a tvar bóje.";

        var zdroj = vstup.Zdroj ?? ZdrojPolohy.Telefon;

        // Přesnost umí říct jen měření. Kdyby ji směl poslat i bod z mapy,
        // stálo by v záznamu číslo, které nikdo nezměřil — a právě kvůli
        // tomu se zdroj zavedl.
        if (zdroj != ZdrojPolohy.Telefon && vstup.PresnostM is not null)
            return "Přesnost hlásí jen telefon. U polohy z mapy ji neposílej.";

        if (vstup.PresnostM is { } presnost && presnost > NejhorsiPresnostM)
            return $"Poloha je přesná jen na {presnost:0} m. Počkej na lepší signál a pípni znovu.";

        // Platí pro obojí, a u mapy o to víc: odkaz může vést kamkoliv na
        // světě a prohozená šířka s délkou jsou v mapách běžná past.
        if (vstup.Sirka is < SirkaOd or > SirkaDo || vstup.Delka is < DelkaOd or > DelkaDo)
            return zdroj == ZdrojPolohy.Telefon
                ? "Tahle poloha není na Orlíku. Zkontroluj, že telefon má signál z družic."
                : "Tahle poloha není na Orlíku. Zkontroluj, že se v odkazu neprohodila šířka s délkou.";

        return null;
    }
}

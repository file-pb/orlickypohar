using OrlickyPohar.Api.Features.Serial;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Jak se z rozjížděk sečte výsledek závodu.</summary>
public enum Vyhodnoceni
{
    /// <summary>Jedno pořadí přes všechny lodě. Typicky 24hodinovka.</summary>
    CelePole = 0,

    /// <summary>Samostatné pořadí uvnitř každé kategorie.</summary>
    PoKategoriich = 1,

    /// <summary>
    /// Obojí: celé pole i kategorie. Některé dlouhé regaty vyhlašují
    /// celkového vítěze napříč kategoriemi a k tomu pořadí v kategoriích
    /// (Filip, 22. 9. 2026).
    /// </summary>
    Oboje = 2,
}

/// <summary>
/// Životní cyklus zastávky. Ročník začíná předběžným kalendářem, teprve pak
/// pořadatel závod vypíše, a nakonec se odjede — nebo zruší.
/// <para>
/// Bez tohohle by se nedalo rozlišit „zastávka, která teprve bude" od
/// „zastávky, která se nekonala" — a v tabulce vypadají obě jako prázdný
/// sloupec. V sešitu rozhodčího je ten rozdíl vidět: nadcházející zastávky
/// jsou prázdné, kdežto Radavská a Vánoční regata mají u všech lodí nuly.
/// </para>
/// </summary>
public enum StavZavodu
{
    /// <summary>Jen termín v předběžném kalendáři ročníku.</summary>
    Planovany = 0,

    /// <summary>
    /// Termín je jistý, ale pořadatel závod ještě nevypsal.
    /// <para>
    /// Číslo je 4, tedy mimo řadu, a musí tak zůstat: stavy jsou v databázi
    /// u každé zastávky a přečíslování by z odjetých závodů udělalo zrušené.
    /// Pořadí stavů v čase nese tenhle výčet svým zápisem, ne svými čísly.
    /// </para>
    /// <para>
    /// Je to rozdíl, který závodník potřebuje a kalendář ho dosud neumel
    /// říct: „počítáme s tímhle termínem, ale ještě si neberte dovolenou"
    /// versus „termín platí". Bez něj by se muselo čekat s celým kalendářem
    /// na vypsání prvního závodu, nebo tvrdit o nejistém termínu, že je
    /// vypsaný.
    /// </para>
    /// </summary>
    Potvrzeny = 4,

    /// <summary>Pořadatel vydal vypsání závodu a plachetní směrnice.</summary>
    Vypsany = 1,

    /// <summary>Odjeto. Teprve tenhle stav znamená, že výsledky dávají smysl.</summary>
    Odjety = 2,

    /// <summary>Nekonal se. Do poháru se nepočítá vůbec.</summary>
    Zruseny = 3,
}

/// <summary>
/// Co je zastávka zač: kolo poháru, nebo komunitní akce mimo něj.
/// <para>
/// <b>Zadáno 14. 9. 2026:</b> do kalendáře se mají dát i komunitní
/// setkání, s vlastním tabem, články a upoutávkami. Akce je zastávka
/// jiného druhu, ne vlastní tabulka — kalendář, stavy, publikace
/// i blog přes <c>Clanek.ZavodId</c> tak platí beze změny.
/// </para>
/// <para>
/// Cenou je, že <b>každé místo, které počítá pohár, se musí ptát na
/// druh</b>, ne jen na stav: odjetá akce by jinak skončila jako sloupec
/// v průběžném pořadí.
/// </para>
/// </summary>
public enum DruhZastavky
{
    /// <summary>Kolo poháru: rozjížďky, výsledky, body do seriálu.</summary>
    Pohar = 0,

    /// <summary>Komunitní akce. Kalendář, stav a články — nic, co se boduje.</summary>
    Akce = 1,
}

public enum StavRozjizdky
{
    Planovana = 0,
    Probiha = 1,
    Dokoncena = 2,
    Zrusena = 3,
}

/// <summary>
/// Stav lodi na zastávce. <b>Ze zadání</b>: pořadatel loď na vypsaný závod
/// zapisuje, potvrzuje, nebo ruší.
/// <para>
/// <b>Stav se vede na účasti, ne na celoroční přihlášce.</b> Loď, která na
/// jednu zastávku nepojede, dál patří do ročníku a do jeho pořadí.
/// </para>
/// <para>
/// <b>Veřejné přihlášky (Filip, 17. 9. 2026)</b> přidaly stavy od
/// požadavku po vyloučení. Původní tři hodnoty zůstaly pod svými jmény —
/// appka na telefonech je zná a změna API smí být jen aditivní. Na webu se
/// jmenují „zapsaná", „potvrzená" a „odhlášená". Stav říká, jestli loď na
/// závodě je; kódy výsledků (DNS, DSQ…) zůstávají na rozjížďkách.
/// </para>
/// </summary>
public enum StavUcasti
{
    /// <summary>Zapsaná: pořadatel přihlášku přijal, prezence ještě nebyla.</summary>
    Prihlasena = 0,

    /// <summary>Potvrzená: loď na místě, startuje — nebo už jela.</summary>
    Potvrzena = 1,

    /// <summary>Odhlášená: loď předem odřekla. Veřejně není vidět, záznam zůstává.</summary>
    Zrusena = 2,

    /// <summary>Přihláška od veřejnosti, pořadatel ji ještě neviděl.</summary>
    Pozadavek = 3,

    /// <summary>Vrácená kapitánovi k doplnění nebo opravě.</summary>
    KDoplneni = 4,

    /// <summary>Pořadatel přihlášku nepřijal. Nesmysl se místo toho smaže.</summary>
    Odmitnuta = 5,

    /// <summary>Byla zapsaná, ale na start nepřijela.</summary>
    Nedostavila = 6,

    /// <summary>Vyloučená z celého závodu. Rozhoduje rozhodčí.</summary>
    Vyloucena = 7,
}

/// <summary>
/// Kam až došel zápis výsledků rozjížďky. <b>Ze zadání</b>: výsledek se dá
/// navrhnout, ověřit, schválit, potvrdit, vrátit k revizi nebo eliminovat.
/// <para>
/// <b>Stav se vede na rozjížďce, ne na jednotlivém výsledku.</b> Rozhodčí
/// schvaluje sadu výsledků jako celek — pořadí dává smysl jen dohromady.
/// Stav na řádku by znamenal, že rozjížďka může být zpola schválená, což
/// neodpovídá ničemu ve skutečnosti.
/// </para>
/// <para>
/// <b>Publikace tu není</b>, je to vlastní příznak. Potvrzený výsledek smí
/// zůstat neveřejný a publikovaný se smí vrátit k revizi, aniž by se
/// publikace ztratila; jeden sloupec by jedno přepisoval druhým.
/// </para>
/// </summary>
public enum StavVysledku
{
    /// <summary>Zapsáno, nikdo to ještě nekontroloval.</summary>
    Navrzeno = 0,

    /// <summary>Čísla sedí s papírem z vody.</summary>
    Overeno = 1,

    /// <summary>
    /// Pořadí v cíli sedí, rozhodčí ho podepsal.
    /// <para>
    /// <b>O protestech aplikace nic neví</b> (nález K2 oponentury
    /// rozhodčího, 28. 10. 2026). Stávalo tu *„Protesty vyřízené, pořadí
    /// platí"* — tvrzení, které si aplikace nemá čím ověřit: nezná
    /// protestní časový limit (ZPJ 60.3(b)), projednávání ani kam zapsat,
    /// že nějaký protest visí. Tentýž text je u <c>Schvaleno</c>
    /// v <c>web/lib/vysledky.ts</c>, ať se nerozejdou.
    /// </para>
    /// </summary>
    Schvaleno = 2,

    /// <summary>Konečné. Dál se needituje.</summary>
    Potvrzeno = 3,

    /// <summary>Vráceno zpátky s důvodem.</summary>
    KRevizi = 4,

    /// <summary>
    /// Rozjížďka se nepočítá vůbec — zrušená nebo neplatná.
    /// <para>
    /// Není to totéž co <see cref="Rozjizdka.DoSerie"/>: ta říká, že se
    /// rozjížďka nepočítá <b>do poháru</b>, ale ve výsledku závodu platí.
    /// Eliminovaná neplatí nikde.
    /// </para>
    /// </summary>
    Eliminovano = 5,
}

/// <summary>
/// Kódy závodních pravidel. Bez nich se výsledky nedají zadat — loď, která
/// nedokončila, není loď bez výsledku.
/// <para>
/// <b>Čtyři kódy přibyly 28. 10. 2026</b> z nálezů K1 a R14 oponentury
/// rozhodčího. Dodatek A10 ZPJ jich předepisuje čtrnáct a aplikace znala
/// sedm; z těch chybějících jsou tyhle čtyři ty, na které se v diskusi
/// přišlo: startovní tresty podle pravidla 30 (ZFP, UFD, BFD) a
/// nevylučitelná diskvalifikace (DNE).
/// </para>
/// <para>
/// <b>Mez, kterou si u startovních trestů musí každý přečíst</b>
/// (nález R16): každý z nich je podle pravidel podmíněný <b>vyvěšenou
/// vlajkou</b>, a na poháru se vlajky nevyvěšují — Filip 27. 10. 2026:
/// *„U Miloše jsem nikdy vlajky neviděl"*, signalizuje se megafonem.
/// Křik vizuální znamení podle ZPJ 25.2 není, takže *„minutové pravidlo"*
/// je na poháru <b>vlastní pravidlo z dohody</b>, ne ZPJ 30 — a jako
/// každé vlastní pravidlo patří do vypsání závodu nebo směrnic (R8).
/// Kódy tu jsou proto, aby se výsledek té dohody dal zapsat; co znamenají
/// a kdy se dávají, rozhoduje vypsání, ne tenhle výčet.
/// </para>
/// <para>
/// <b>Nové hodnoty jdou na konec</b> a stávající čísla se nemění: appka
/// na telefonech kódy zná jako čísla a změna API smí být jen aditivní.
/// </para>
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

    /// <summary>
    /// <b>Bodový trest za porušení v poslední minutě</b> — vlajka Z,
    /// ZPJ 30.2. Jediný ze startovních trestů, který <b>není
    /// diskvalifikace</b>: loď jede dál a dostane podle ZPJ 44.3(c)
    /// přirážku 20 % bodů za nedokončila, nejvýš však body za nedokončila.
    /// <para>
    /// <b>Jako jediný kód se píše spolu s pořadím v cíli</b>, protože se
    /// k dosaženému pořadí <b>přičítá</b>. Ostatní kódy pořadí nahrazují.
    /// Loď, která dostala Z a pak nedokončila, má DNF — ne ZFP.
    /// </para>
    /// <para>
    /// Opakovaná identifikace téže lodi v téže rozjížďce znamená <b>další
    /// 20 %</b> (ZPJ 30.2); to aplikace zatím neumí, protože vede jeden
    /// kód na výsledek. Trest navíc přežije nový start téže rozjížďky,
    /// kdežto U a černá se chovají jinak — k tomu aplikace potřebuje
    /// vědět, která vlajka visela, a to zatím nevede (R14, fáze 3.1).
    /// </para>
    /// </summary>
    Zfp = 8,

    /// <summary>
    /// Diskvalifikace bez projednávání podle vlajky U — ZPJ 30.3. Padá
    /// s odložením i zrušením startu a <b>nepřežije</b> nový start téže
    /// rozjížďky.
    /// </summary>
    Ufd = 9,

    /// <summary>
    /// Diskvalifikace bez projednávání podle černé vlajky — ZPJ 30.4.
    /// Na rozdíl od U <b>přežije nový start</b> a loď se ho nesmí
    /// zúčastnit; komise navíc musí její číslo plachty oznámit před dalším
    /// vyzývacím znamením (to je úkon pro vývěsku, R14).
    /// </summary>
    Bfd = 10,

    /// <summary>
    /// <b>Diskvalifikace, kterou nelze vyškrtnout</b> — ZPJ 90.3(b):
    /// *„všechna bodování za diskvalifikaci, která je nevylučitelná (DNE),
    /// musí být zahrnuta do bodování lodě v závodu"*. Dává ji rozhodčí
    /// podle pravidla 2 (čestné plachtění) nebo 69 (nepřípustné jednání).
    /// <para>
    /// <b>Tohle byl jediný nález celé oponentury, kde se špatně počítaly
    /// body</b> (K1, opraveno 28. 10. 2026). Škrtá se podle výše bodů, a
    /// diskvalifikace má podle A5.2 nejvyšší možné body — takže byla
    /// vždycky prvním kandidátem na škrt. Rozhodčí, který ji udělil,
    /// ji neměl jak zapsat tak, aby přežila: zapsal DSQ a nejbližší škrt
    /// ji smazal. Na okruhové regatě se škrtá jedna rozjížďka, takže by
    /// to nastalo hned při prvním použití.
    /// </para>
    /// </summary>
    Dne = 11,
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

    /// <summary>
    /// Jméno pořadatele. Od 15. 9. 2026 je to <b>kopie jména záznamu</b>
    /// <see cref="PoradatelZaznam"/>, ne samostatný údaj: zůstává kvůli
    /// appce na telefonech a importu, které znají jen text.
    /// </summary>
    public string? Poradatel { get; set; }

    /// <summary>Kdo zastávku pořádá — i s webem a medailonkem. Není to účet v systému.</summary>
    public int? PoradatelId { get; set; }
    public Poradatele.Poradatel? PoradatelZaznam { get; set; }

    public DateOnly Datum { get; set; }

    /// <summary>Konec u vícedenních závodů. Prázdné znamená jednodenní.</summary>
    public DateOnly? DatumKonce { get; set; }

    /// <summary>
    /// Vytrvalostní, okruhový, Izolepa. Volný text schválně: seznam typů je
    /// <b>data, ne model</b>, a další ročník přinese typ, který dneska neznáme.
    /// </summary>
    public string? Typ { get; set; }

    /// <summary>
    /// Pohár, nebo komunitní akce. <b>Určuje se při založení a v kalendáři
    /// se nemění</b>: pohárová zastávka může mít výsledky a přehodit ji na
    /// akci by je tiše vyřadilo z poháru.
    /// </summary>
    public DruhZastavky Druh { get; set; } = DruhZastavky.Pohar;

    /// <summary>Pořadí zastávky v ročníku — v rámci svého druhu.</summary>
    public int Poradi { get; set; }

    public StavZavodu Stav { get; set; } = StavZavodu.Planovany;

    /// <summary>
    /// Původní termín, když se závod přesunul. Přesun není vlastní stav —
    /// přesunutá zastávka je pořád plánovaná, jen jindy — ale datum, na které
    /// se lidé chystali, je informace, kterou nemá smysl zahodit.
    /// </summary>
    public DateOnly? PuvodniDatum { get; set; }

    // --- Vypsání závodu (Dodatek J1) ---------------------------------------
    // Tři kolonky, které Dodatek J1 žádá do vypsání závodu a aplikace je
    // neměla (nález R8 oponentury rozhodčího, 28. 10. 2026). Osm z jedenácti
    // řádků té osnovy už v datech leží; tyhle tři chyběly, takže se vypsání
    // nedalo vygenerovat celé.
    //
    // <b>Všechny jsou nepovinné</b>, a prázdná kolonka se ve vypsání
    // <b>přizná jako chybějící</b>, nedosadí se pravděpodobná hodnota:
    // dokument, který si domyslí startovné, je horší než dokument, který
    // řekne, že ho nezná.

    /// <summary>
    /// Termín uzávěrky přihlášek — J1.1(5). <c>null</c> znamená, že se
    /// uzávěrka nevyhlašuje; přihlášky pak končí s vypsáním regaty, jako
    /// dnes. <b>Nic neblokuje</b>: je to údaj do vypsání, ne mez
    /// v přihlašování (loď se podle Filipa, 17. 9. 2026, běžně domluví
    /// telefonem až na startu).
    /// </summary>
    public DateOnly? UzaverkaPrihlasek { get; set; }

    /// <summary>
    /// Výše startovného a za co se platí — J1.1(5).
    /// <para>
    /// <b>Text, ne číslo</b>, a schválně: startovné bývá předpis
    /// (*„300 Kč loď, 100 Kč každý člen posádky"*), ne jedna částka, a
    /// aplikace z něj nic nepočítá — <see cref="Ucast.Zaplaceno"/> je
    /// evidence platby, ne její výpočet. Číslo by tedy předstíralo
    /// přesnost, kterou nikde nevyužije. Stejná úvaha jako u
    /// <see cref="Typ"/>: seznam je data, ne model.
    /// </para>
    /// </summary>
    public string? Startovne { get; set; }

    /// <summary>
    /// Čas vyzývacího znamení první rozjížďky — J1.1(6).
    /// <para>
    /// <b>Není to čas startu</b>: J1 chce vyzývací znamení, tedy T−5
    /// (ZPJ 26). Plánovaný start jednotlivé rozjížďky je
    /// <see cref="Rozjizdka.StartV"/> a vzniká až na rozpravě v den závodu
    /// (nález K6); tohle je údaj, který se vyhlašuje dopředu a podle
    /// kterého se lidi chystají.
    /// </para>
    /// </summary>
    public DateTimeOffset? PrvniVyzyvaciZnameni { get; set; }

    /// <summary>
    /// Jak dlouho trvá startovní procedura, v minutách — od vyzývacího
    /// znamení do startu.
    /// <para>
    /// <b>Pět minut má v pravidle 26 hvězdičku</b> (*„nebo tak, jak je
    /// stanoveno ve vypsání závodu nebo v plachetních směrnicích"*), takže
    /// je to parametr regaty, ne konstanta — a jako vlastní pravidlo patří
    /// do vypsání, kam se taky tiskne (nálezy R12 a R8, 28. 10. 2026).
    /// Do té doby byla zadrátovaná na dvou místech naráz
    /// (<c>PolohySprava.Procedura</c> a <c>PROCEDURA_S</c> na tabuli), což
    /// je přesně ten druh čísla, které se jednou rozejde.
    /// </para>
    /// </summary>
    public int DelkaProceduryMin { get; set; } = Procedura.DelkaVychozi;

    // --- Rozjížďky → výsledek závodu ---

    /// <summary>Kolik nejhorších rozjížděk se škrtá. Okruhový závod typicky 1, vytrvalostní 0.</summary>
    public int PocetSkrtu { get; set; }

    public Vyhodnoceni Vyhodnoceni { get; set; } = Vyhodnoceni.PoKategoriich;

    /// <summary>
    /// Ukazovat venku i čísla, která ještě nikdo nepodepsal — každé se
    /// svým stavem.
    /// <para>
    /// <b>Je to přepínač u regaty, ne pravidlo</b> (Filip, 9. 10. 2026:
    /// *„co já vím, jakou budou mít rozhodčí, organizátoři a lidi nálada —
    /// prostě se to musí nechat nastavit"*). Spor o nepotvrzená čísla se
    /// tím neřeší zamlčením, ale tím, že číslo nese svůj stav: hospoda
    /// chce vidět dojezdy hned, kdežto zápis schválně čeká na rozhodčího.
    /// </para>
    /// <para>
    /// <b>Výchozí je ten konzervativní</b>, tedy jen publikované. Kdo chce
    /// procesní děj, zapne si ho — rozhodnutí tím nepadá na nás ani
    /// napevno do kódu.
    /// </para>
    /// </summary>
    public bool ProcesniDej { get; set; }

    // --- Výsledek závodu → body do seriálu ---

    /// <summary>Váha závodu v seriálu, běžně 1.0.</summary>
    public decimal KoeficientDoSerie { get; set; } = 1.0m;

    /// <summary>
    /// Kolik se přičte lodím s umístěním, typicky bonus −1 u 24hodinovky:
    /// vítěz má −1, druhý 0, třetí 1. Není to koeficient — bonus posouvá,
    /// nenásobí. Neúčasti se netýká.
    /// </summary>
    public int PosunDoSerie { get; set; }

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

    /// <summary>
    /// Přihlášená, potvrzená, nebo zrušená.
    /// <para>
    /// <b>Výchozí je potvrzená</b>, protože účast dřív vznikala jen tak, že
    /// loď přijela: import ji přináší ze sešitu rozhodčího a zápis výsledků
    /// ji zakládá lodi, která výsledek dostala. Jen přihláška od pořadatele
    /// začíná jako přihlášená a říká to výslovně.
    /// </para>
    /// </summary>
    public StavUcasti Stav { get; set; } = StavUcasti.Potvrzena;

    /// <summary>Kdy přišla přihláška. Prázdné u účastí z importu a zápisu výsledků.</summary>
    public DateTimeOffset? PodanoV { get; set; }

    /// <summary>
    /// Kdy kapitán potvrdil souhlas s pravidly a vlastním nebezpečím.
    /// <c>null</c> znamená, že u téhle lodi souhlas <b>není</b> — ani
    /// starý, ani domnělý.
    /// <para>
    /// <b>Proč to musí být záznam, a ne branka ve formuláři</b> (nález R9
    /// oponentury rozhodčího, 28. 10. 2026). Pohár pořadatelsky ofiko není,
    /// takže závodníka neváže členství ani licence — váže ho jen to, co
    /// odklikl při přihlášení (ZPJ 4.1(a), J1.2(12)). Do 28. 10. 2026 se
    /// souhlas ve <c>VerejnaPrihlaska.ProcNejde</c> zkontroloval a zahodil:
    /// žádný sloupec, žádná migrace, nikde <c>Souhlas =</c>. Projekt to
    /// přitom jinde dělá dobře — směrnice se nemažou, jen stahují, bóje se
    /// sbírá z vody a záznam zůstává.
    /// </para>
    /// </summary>
    public DateTimeOffset? SouhlasV { get; set; }

    /// <summary>
    /// Verze znění, se kterým kapitán souhlasil — <see cref="Souhlas.Verze"/>.
    /// <para>
    /// <b>Bez verze je doklad k ničemu.</b> Znění se bude upřesňovat a
    /// *„souhlasil"* bez toho, s čím souhlasil, nedokládá nic. Ukládá se
    /// číslo verze, ne celý text: text té verze drží kód a nemění se
    /// (stejné pravidlo jako u <c>PravidlaBodovani</c>).
    /// </para>
    /// </summary>
    public int? SouhlasVerze { get; set; }

    /// <summary>
    /// Kontakt, jak ho kapitán zadal do této přihlášky. <b>Kopie</b>, ne
    /// odkaz: pořadatel má vidět, na co se loď přihlásila, i když kapitán
    /// kontakt později změní. Platný kontakt osoby je v <see cref="Lode.KontaktOsoby"/>.
    /// </summary>
    public string? KontaktEmail { get; set; }
    public string? KontaktTelefon { get; set; }

    /// <summary>Poznámka od přihlašujícího.</summary>
    public string? Poznamka { get; set; }

    /// <summary>
    /// Poznávací znak lodi na vodě — „modrý spinakr", „bez čísla na plachtě".
    /// Domluví se na něm zapisovatelé u cíle a stojí na tlačítku lodi
    /// v cílové obrazovce (22. 9. 2026). Platí pro celou regatu, ne pro
    /// jednu rozjížďku. Veřejně se nevydává.
    /// </summary>
    public string? PoznavaciZnak { get; set; }

    /// <summary>
    /// Startovné. Součást přihlášky, ale <b>nic neblokuje</b> — kdo přijede
    /// na poslední chvíli, zaplatí později (Filip, 17. 9. 2026).
    /// </summary>
    public bool Zaplaceno { get; set; }
    public string? StartovnePoznamka { get; set; }

    public List<ZmenaUcasti> Zmeny { get; set; } = [];
}

/// <summary>
/// Jedna změna stavu přihlášky: kdo, kdy, odkud kam a proč. Historie se
/// nemaže ani nepřepisuje — je to jediné místo, kde se dá dohledat, proč
/// loď na startu chybí.
/// </summary>
public class ZmenaUcasti
{
    public int Id { get; set; }

    public int UcastId { get; set; }
    public Ucast? Ucast { get; set; }

    /// <summary>Prázdné u vzniku přihlášky.</summary>
    public StavUcasti? Ze { get; set; }
    public StavUcasti Na { get; set; }

    public DateTimeOffset Kdy { get; set; }

    /// <summary>Kdo změnu udělal. Prázdné znamená veřejnost — přihlášku bez účtu.</summary>
    public Guid? UzivatelId { get; set; }

    public string? Duvod { get; set; }
}

/// <summary>
/// Jedna rozjížďka závodu. Vytrvalostní závod má jednu, okruhový několik.
/// <para>
/// <b>Nemusí se jet na vodě.</b> Izolepa má mezi rozjížďkami běh pro míčky
/// z kopce — schválně, aby zamíchal pořadím a vnesl do závodu prvek nezávislý
/// na výkonnosti lodi. Pro model je to pořadí jako každé jiné.
/// </para>
/// </summary>
public class Rozjizdka : Fotky.IMaFotku
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    public int Cislo { get; set; }

    public DateTimeOffset? StartV { get; set; }

    /// <summary>
    /// Kolikrát se start téhle rozjížďky opakoval po <b>všeobecném
    /// odvolání</b> (ZPJ 29.2). Nula znamená, že se startovalo napoprvé.
    /// <para>
    /// <b>Dřív po předchozím pokusu nezbylo nic</b> (nález R5,
    /// 28. 10. 2026): nový start jen přepsal <see cref="StartV"/>, takže
    /// „rozjížďka znovu startovaná" podle ZPJ 36 nebyla nikde vidět —
    /// ani v zápisu, ani na tabuli. A na tom přitom visí, co se stane
    /// s uloženými starty a s tresty, které nový start přežívají jinak
    /// podle toho, která vlajka visela (R14).
    /// </para>
    /// <para>
    /// Odložení (27.3) se sem nepočítá: odložená rozjížďka se
    /// nestartovala, takže se ani neopakuje.
    /// </para>
    /// </summary>
    public int OpakovanychStartu { get; set; }

    /// <summary>
    /// Kdy pořadatel zastavil časomíru. <c>null</c>, dokud běží.
    ///
    /// <para>
    /// <b>Konec rozjížďky je rozhodnutí, ne dopočet</b> (Filip, 20. 10.
    /// 2026: *„hodilo by se mít možnost zastavit časomíru a říci, že
    /// rozjížďka je odjetá, teď je to závislé pouze na zápisu všech lodí…
    /// lodě bez cíle dopíšeme, ale čas už zastav"*). Dokud se stav počítal
    /// jen z toho, že každá loď má dojezd nebo kód, nešlo rozjížďku uzavřít
    /// dřív, než se dopsal papír — a na vodě je to naopak: nejdřív se
    /// zastaví čas, teprve pak se dopisuje.
    /// </para>
    /// <para>
    /// <b>Není to totéž co stav.</b> Stav říká, co se s rozjížďkou děje;
    /// tohle je okamžik, od kterého už nikdo nedojede. Zápis zůstává
    /// otevřený a lodě se dopisují dál.
    /// </para>
    /// </summary>
    public DateTimeOffset? KonecV { get; set; }

    public StavRozjizdky Stav { get; set; } = StavRozjizdky.Planovana;

    /// <summary>
    /// Počítá se tahle rozjížďka do seriálu?
    /// <para>
    /// Příznak je na rozjížďce, ne počet na závodě, protože se rozhoduje,
    /// <b>které</b> se počítají — a posuzuje se to na vodě podle podmínek.
    /// Číslo „jedna" by neřeklo, jestli je to první, poslední, nebo nejlepší,
    /// a u zábavných rozjížděk mimo vodu by neřeklo nic.
    /// </para>
    /// </summary>
    public bool DoSerie { get; set; } = true;

    /// <summary>
    /// Fotka papírového zápisu z cíle — doklad k číslům (PLAN.md, Zápis
    /// z vody, krok 3).
    /// <para>
    /// <b>Veřejně se nevydává.</b> Je to pracovní papír se škrty, ne fotka
    /// na web: vidí ji pořadatel regaty a rozhodčí, který čísla ověřuje.
    /// </para>
    /// </summary>
    public Guid? FotkaId { get; set; }
    public Fotky.Fotka? Fotka { get; set; }

    /// <summary>Kam došel zápis výsledků. Nová rozjížďka je vždycky návrh.</summary>
    public StavVysledku StavVysledku { get; set; } = StavVysledku.Navrzeno;

    /// <summary>
    /// Vidí výsledky téhle rozjížďky veřejnost?
    /// <para>
    /// Vlastní příznak vedle stavu, ne poslední stupeň v řadě. Zastávka má
    /// svůj <c>Publikovano</c> a platí obojí: nepublikovaná zastávka schová
    /// i publikovanou rozjížďku, protože veřejně neexistuje.
    /// </para>
    /// </summary>
    public bool Publikovano { get; set; }

    /// <summary>
    /// Proč se výsledky vrátily k revizi. Bez důvodu je vrácení jen
    /// „něco je špatně" a ten, kdo to má opravit, začíná hledáním.
    /// </summary>
    public string? DuvodRevize { get; set; }

    /// <summary>
    /// Kolikátá podoba sady výsledků to je. Roste s každým uložením.
    /// <para>
    /// <b>Je to ochrana proti přepsání novější opravy starými daty</b>
    /// (oponentura, 5. 10. 2026). Uložení přijde jako celá sada a maže, co
    /// v ní není — takže telefon bez signálu, který drží sadu A–B, po
    /// připojení odstraní C doplněné mezitím na webu. Server ten konflikt
    /// sám nepozná: obě sady jsou platná data.
    /// </para>
    /// <para>
    /// Klient proto posílá revizi, ze které vycházel, a při nesouladu
    /// uložení neprojde. Číslo stačí: nejde o to vědět, co se změnilo, ale
    /// že se změnilo.
    /// </para>
    /// </summary>
    public int Revize { get; set; }
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

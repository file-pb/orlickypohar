using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Kam došla stavba trati.
/// <para>
/// <b>Zveřejnění není samostatný knoflík</b> (plán, <i>Trať je veřejná,
/// jakmile ji rozhodčí přijme</i>): veřejně se vydává jedině
/// <see cref="Prijato"/>.
/// </para>
/// </summary>
public enum StavTrati
{
    /// <summary>Staví se. Veřejně není co ukázat — nikdo nic nepotvrdil.</summary>
    Rozestaveno = 0,

    /// <summary>Stavitelé hlásí hotovo a trať čeká na rozhodčího.</summary>
    Hotovo = 1,

    /// <summary>Rozhodčí přijal: trať je zamčená a veřejná.</summary>
    Prijato = 2,

    /// <summary>
    /// Přijatá trať se přestavuje.
    /// <para>
    /// <b>Veřejně to znamená „počkej", ne nic.</b> Někdo už má GPX
    /// v plotteru a popluje k bóji, která se mezitím posunula; tiché
    /// zmizení vypadá jako chyba a starý obrázek lže.
    /// </para>
    /// </summary>
    Prestavba = 3,
}

/// <summary>
/// Jedna stavba trati v čase: od rozestavění po přijetí rozhodčím.
///
/// <para>
/// <b>Normální stav je jedna zamčená trať.</b> Přestavba trati, kterou už
/// rozhodčí přijal, je <b>výjimka, ne režim</b> (Filip, 9. 10. 2026:
/// <i>„systémově to nechci, ale může se to stát"</i>) — vítr odfoukne bójku
/// nebo ji někdo ukradne, a to se stane i v průběhu rozjížďky. Zapsat to
/// model umět musí; nabízet to jako běžnou cestu ne.
/// </para>
///
/// <para>
/// Proto je tu <see cref="NahrazujeId"/> a ne seznam tratí u rozjížďky:
/// když k výjimce dojde, vznikne nová trať navázaná na starou a historie
/// je řetěz, který jde projít zpátky. Model, ve kterém má rozjížďka trať
/// jedinou a přepisuje se, by si musel vybrat, která z nich je ta pravá —
/// a každá odpověď by byla lež.
/// </para>
///
/// <para>
/// <b><c>RozjizdkaId</c> je nullable.</b> Trať se staví dřív, než rozjížďka
/// vznikne, a u jednorozjížďkové regaty se k ní nemusí přiřadit nikdy.
/// </para>
///
/// <para>
/// <b>Které bóje k trati patří, tenhle krok neřeší.</b> Dokud se trať
/// nevybírá a neklonuje, je to „co zrovna stojí u téhle regaty" — a to už
/// vrací <c>BojeEndpoints</c>. Výslovné členství přijde s výběrem
/// a klonováním a nahradí ho pak prvky trati.
/// </para>
/// </summary>
public class Trat
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    public int? RozjizdkaId { get; set; }
    public Rozjizdka? Rozjizdka { get; set; }

    public StavTrati Stav { get; set; } = StavTrati.Rozestaveno;

    public DateTimeOffset ZalozenaV { get; set; }

    /// <summary>
    /// Trať, kterou tahle nahradila. Řetěz přestaveb tak jde projít zpátky,
    /// stejně jako u bóje — a u krizové přestavby je to jediný záznam
    /// o tom, že se trať během závodu měnila.
    /// </summary>
    public int? NahrazujeId { get; set; }
    public Trat? Nahrazuje { get; set; }

    /// <summary>Kdy a kdo ji přijal. Od té chvíle je zamčená a veřejná.</summary>
    public DateTimeOffset? PrijatoV { get; set; }
    public Guid? PrijalId { get; set; }
    public Uzivatel? Prijal { get; set; }

    /// <summary>
    /// Proč ji rozhodčí vrátil stavitelům. <b>Bez důvodu je vrácení jen
    /// „ne"</b> — stejně jako u revize výsledků: kdo ji má dodělat, musí
    /// vědět co.
    /// </summary>
    public string? DuvodVraceni { get; set; }

    /// <summary>
    /// Prvek, u kterého se zkrátilo — od té chvíle je tam cíl.
    /// <para>
    /// <b>Zkrácení není přestavba.</b> Ve vodě se nic nemění, prvky
    /// zůstávají; jen se část z nich přestane plout. Proto jde i na
    /// přijaté trati: zámek brání tichým změnám předpisu, ne rozhodnutí
    /// rozhodčího, které se zapisuje i s časem a jménem.
    /// </para>
    /// <para>
    /// <b>Pořadí se počítá normálně</b> (Filip, 15. 10. 2026: *„zkrácení
    /// počítá normální pořadí, jen cíl je u té bóje"*), takže na bodování
    /// tohle pole nesahá. Je to údaj o tom, kudy se jelo.
    /// </para>
    /// </summary>
    public int? ZkracenoUPrvkuId { get; set; }
    public PrvekTrati? ZkracenoUPrvku { get; set; }

    /// <summary>Kdy a kdo zkrácení vyhlásil.</summary>
    public DateTimeOffset? ZkracenoV { get; set; }
    public Guid? ZkratilId { get; set; }
    public Uzivatel? Zkratil { get; set; }

    /// <summary>Jede se zkrácená trať?</summary>
    public bool Zkracena => ZkracenoUPrvkuId is not null;

    /// <summary>Zamčená trať se nedá přestavovat, jen nahradit novou.</summary>
    public bool Zamcena => Stav == StavTrati.Prijato;
}

/// <summary>Stav trati, jak ho vidí správa.</summary>
public record TratDto(
    int Id,
    StavTrati Stav,
    DateTimeOffset ZalozenaV,
    DateTimeOffset? PrijatoV,
    string? Prijal,
    string? DuvodVraceni,
    int? RozjizdkaId,
    /// <summary>
    /// Číslo rozjížďky, které trať patří. Id samo o sobě obrazovce nestačí
    /// a dohledávat ho zvlášť by byl druhý dotaz na totéž.
    /// </summary>
    int? CisloRozjizdky,
    /// <summary>
    /// Trať, kterou tahle nahradila. Jediná viditelná stopa po krizové
    /// přestavbě — bez ní by obrazovka tvrdila, že trať vznikla z ničeho.
    /// </summary>
    int? NahrazujeId,
    /// <summary>Odjela podle ní nějaká rozjížďka? Pak se už nepřestavuje.</summary>
    bool Odjeta,
    bool SmiHlasitHotovo,
    bool SmiPrijmout,
    bool SmiPrestavet,
    /// <summary>
    /// Prvek, u kterého se zkrátilo — od té chvíle je tam cíl. `null`,
    /// když se jede celá trať. <b>Id prvku, ne příznak</b>: bez něj by
    /// se hendikep nedal dopočítat a odjeté regaty se už nedoplní.
    /// </summary>
    int? ZkracenoUPrvkuId = null,
    DateTimeOffset? ZkracenoV = null,
    string? Zkratil = null,
    /// <summary>Smí přihlášený zkrátit? Jen rozhodčí, a jen když se jede.</summary>
    bool SmiZkratit = false);

/// <summary>
/// Bóje, jak ji vidí divák: <b>jen kam se pluje</b>.
/// <para>
/// Chybí tu schválně jméno stavitele, přesnost měření, čas postavení
/// i fotky. Nic z toho závodníkovi k navigaci nepomůže a jméno s přesností
/// jsou údaje o tom, kdo a jak měřil — to patří do správy.
/// </para>
/// </summary>
public record VerejnaBojeDto(
    string Nazev, int Poradi, double Sirka, double Delka,
    /// <summary>
    /// Barva a tvar jdou ven schválně: podle nich závodník bóji pozná na
    /// vodě a mapka ji umí nakreslit tak, jak vypadá. Na rozdíl od jména
    /// stavitele a přesnosti měření to není údaj o tom, kdo a jak měřil.
    /// </summary>
    BarvaBoje? Barva = null,
    TvarBoje? Tvar = null,
    /// <summary>
    /// Značení jde ven týmž důvodem jako barva: <b>závodník podle něj
    /// značku pozná</b>. „Pravá strana dráhy“ navíc říká víc než červená
    /// a válec dohromady — a u plavidla nebo mola je to jediné, co ji
    /// popisuje, protože barvu ani tvar nemají.
    /// </summary>
    DruhZnaceni? Znaceni = null);

/// <summary>Konec prvku pro diváka: jméno, kam se pluje, a jak to vypadá.</summary>
public record VerejnyKonecDto(
    string Nazev, double Sirka, double Delka,
    BarvaBoje? Barva = null,
    TvarBoje? Tvar = null,
    DruhZnaceni? Znaceni = null,
    /// <summary>
    /// Fotky značky (Filip, 15. 10. 2026: *„náhledy bójí a fotky v trati
    /// na regatě"*).
    /// <para>
    /// <b>Dřív se veřejně nevydávaly</b>, protože se nevydávala celá
    /// trať. Od chvíle, kdy je trať veřejná, ten důvod padl a fotka je
    /// to nejužitečnější, co o značce jde říct: ze souřadnic se nepozná,
    /// jestli je bóje nafouklá, jakou má barvu a co je za ní na břehu.
    /// </para>
    /// <para>
    /// Jde ven i autor, jako u každé fotky na webu — popisek „Foto …" je
    /// zvyk celého webu, ne výjimka. Co ven nejde dál, jsou údaje
    /// o měření: kdo pípal a s jakou přesností.
    /// </para>
    /// </summary>
    IReadOnlyList<Fotky.ObrazekDto>? Fotky = null);

/// <summary>
/// Prvek trati pro diváka.
/// <para>
/// <b>Veřejně se vydává prvek, ne bóje.</b> Divák i závodník potřebují
/// vědět, co je čára a co značka — jinak si z dvojice bójí složí nohu
/// trati, což je přesně ta chyba, kvůli které prvky vznikly.
/// </para>
/// <para>
/// Chybí tu jméno stavitele, přesnost měření i fotky, stejně jako
/// u <see cref="VerejnaBojeDto"/>: jsou to údaje o tom, kdo a jak měřil.
/// Poznámka „jak to jet" naopak patří ven — je psaná pro závodníky.
/// </para>
/// </summary>
public record VerejnyPrvekDto(
    /// <summary>
    /// Id prvku. <b>Bez něj nejde spárovat zkrácení</b> (testovací session,
    /// 16. 10. 2026): veřejná trať vydává `ZkracenoUPrvkuId`, ale klient
    /// dostal čtyři prvky bez id a neměl to k čemu přiřadit. Přes pořadí to
    /// nejde — pořadí a id jsou dvě různé věci.
    /// </summary>
    int Id,
    TypPrvku Typ,
    int Poradi,
    StranaPrvku? Strana,
    string? Poznamka,
    VerejnyKonecDto A,
    VerejnyKonecDto? B,
    /// <summary>
    /// Jen u startu: světová strana. Ven patří — teprve podle ní umí
    /// mapka nakreslit šipku průjezdu, a závodník to potřebuje nejvíc.
    /// </summary>
    SvetovaStrana? Smer = null,
    /// <summary>Jen u startu: pevná linie, nebo otevírající se brána.</summary>
    DruhStartu? DruhStartu = null);

/// <summary>
/// Trať pro veřejnost. Vydává se jedině přijatá; u přestavby se vrací
/// <see cref="Prestavba"/> a bóje se zamlčí, protože starý obrázek lže
/// a tiché zmizení vypadá jako chyba.
/// </summary>
public record VerejnaTratDto(
    bool Prestavba,
    DateTimeOffset? PrijatoV,
    /// <summary>
    /// Rozjížďka, ke které trať patří, nebo <c>null</c> u regaty s jednou
    /// tratí. <b>Bez toho si lidi stáhnou GPX od včerejší rozjížďky</b>
    /// (plán, <i>Trať je veřejná, jakmile ji rozhodčí přijme</i>, past 2).
    /// </summary>
    int? CisloRozjizdky,
    IReadOnlyList<VerejnaBojeDto> Boje,
    /// <summary>
    /// Trať jako řada prvků — to, podle čeho se pluje. <c>Boje</c> vedle
    /// toho zůstávají: starší klient o prvcích neví a bez nich by mu trať
    /// zmizela úplně.
    /// </summary>
    IReadOnlyList<VerejnyPrvekDto> Prvky,
    /// <summary>
    /// Prvek, u kterého rozhodčí zkrátil — od té chvíle je tam cíl.
    /// <c>null</c>, když se jede celá trať.
    /// <para>
    /// <b>Jde ven i vynechaným prvkům navzdory.</b> Závodník má vidět, co
    /// se mělo plout a kde to skončilo; smazat zbytek by z trati udělalo
    /// něco, co nikdy nestálo ve vodě.
    /// </para>
    /// </summary>
    int? ZkracenoUPrvkuId = null,
    DateTimeOffset? ZkracenoV = null,
    /// <summary>
    /// Čísla rozjížděk, které mají veřejnou trať — vzestupně. Podle nich
    /// se dá přepnout na kteroukoliv z nich (<c>?rozjizdka=</c>).
    /// <para>
    /// <b>Proč to je</b> (Filip, 20. 10. 2026): *„tady se zobrazuje pouze
    /// jedna trať, i když je veřejná trať i ke druhé rozjížďce. Tam bych
    /// dal tab, aby se dalo přepínat mezi veřejnými tratěmi."* Endpoint
    /// vydával jen tu na řadě a o ostatních divák neměl jak zjistit, že
    /// vůbec jsou.
    /// </para>
    /// <para>
    /// <b>Jen tratě s rozjížďkou.</b> Přijatá trať bez rozjížďky se nedá
    /// pojmenovat ani adresovat; vydává se dál jako ta na řadě, jen na ni
    /// nevede záložka.
    /// </para>
    /// </summary>
    IReadOnlyList<int>? Rozjizdky = null);

/// <summary>
/// Trať v nabídce „jede se tahle". <b>Počet prvků je tu schválně</b>:
/// trať bez prvků se dá naklonovat taky, ale naklonuje se prázdno, a to má
/// být vidět dřív než potom.
/// </summary>
public record TratNaVyberDto(
    int Id,
    StavTrati Stav,
    int? CisloRozjizdky,
    DateTimeOffset? PrijatoV,
    int PocetPrvku,
    /// <summary>Jelo se podle ní? Pak je to ta, kterou chce člověk zopakovat.</summary>
    bool Odjeta,
    /// <summary>
    /// Volná trať se přiřadí, obsazená naklonuje (plán, <i>Výběr
    /// a klonování trati</i>). Obrazovka tím pojmenuje knoflík správně
    /// dřív, než na něj někdo sáhne.
    /// </summary>
    bool JdePriradit,
    /// <summary>
    /// Otisk předpisu trati: shodný řetězec znamená, že se jede totéž.
    /// U trati bez prvků <c>null</c> — prázdno není předpis a sdružovat
    /// dvě prázdné tratě by tvrdilo víc, než co o nich víme.
    /// <para>
    /// <b>K čemu je.</b> Klon je kopie, ne vazba (Filip, 12. 10. 2026:
    /// <i>„datově by klon měl být jen kopie a jinak by měl prostě
    /// samostatnou instanci… jen uživatel to chápe, že některé rozjížďky
    /// se jedou na stejné trati, to bych mu tento pohled rád
    /// simuloval"</i>). Obrazovka ten pohled skládá ze shody otisků, ne
    /// z toho, odkud klon vznikl — jinak by po změně cíle u čtvrté
    /// rozjížďky dál tvrdila, že se jede stejně jako ve třetí.
    /// </para>
    /// <para>
    /// Počítá se ze všeho, co je na trati předpisem: pořadí, typ, obě
    /// značky, strana, směr, druh startu a poznámka „jak to jet“.
    /// Poznámka v tom je proto, že ji čte závodník — dvě tratě, které se
    /// liší jen jí, nejedou totéž.
    /// </para>
    /// </summary>
    string? Otisk,
    /// <summary>
    /// Smí přihlášený trať přijmout, případně vrátit stavitelům? Jen
    /// rozhodčí a jen z hotové.
    /// <para>
    /// <b>Je to v seznamu schválně</b>: od 15. 10. 2026 se trať schvaluje
    /// i od rozjížďky ve výsledcích (Filip: *„je-li vybrána a připojena,
    /// tak musí umožnit její schválení nebo zadání k přepracování"*),
    /// a ta obrazovka jiný zdroj o právech nemá.
    /// </para>
    /// </summary>
    bool SmiPrijmout = false);

/// <summary>
/// Rozjížďka regaty v nabídce „na které trati se jede“.
/// <para>
/// <b>Nabídka, ne psané číslo</b> (Filip, 11. 10. 2026: <i>„tratě regaty
/// s nějakým číslem je taky věc, co to znepřehledňuje“</i>). Vypsat smí
/// jen server: obrazovka vidí tratě, ne rozjížďky, takže by neuměla
/// rozlišit nezaloženou rozjížďku od volné.
/// </para>
/// </summary>
/// <param name="TratId">Trať, která téhle rozjížďce patří, nebo <c>null</c>.</param>
/// <param name="Odstartovana">
/// Už se podle ní jelo. Trať se jí pak nebere — ani odškrtnutím.
/// </param>
public record RozjizdkaNaVyberDto(int Cislo, int? TratId, bool Odstartovana);

/// <summary>Co se má s vybranou tratí stát a pro kterou rozjížďku.</summary>
/// <param name="Rozjizdka">
/// <b>Číslo</b> rozjížďky, které trať připadne — tak se rozjížďka adresuje
/// i jinde v API (<c>rozjizdky/{cislo}/start</c>) a tak ji označují lidi.
/// <c>null</c> znamená klon „na stůl": kopie, ke které se rozjížďka přiřadí
/// později.
/// </param>
/// <param name="Stav">
/// Stav, ve kterém klon začíná. Výchozí je <see cref="StavTrati.Hotovo"/>:
/// klon je tvrzení stavitele („stojí to, co minule"), ne rozhodnutí
/// rozhodčího (Filip, 9. 10. 2026).
/// </param>
public record KlonTratiVstup(int? Rozjizdka, StavTrati? Stav);

/// <summary>Číslo rozjížďky, které trať připadne.</summary>
public record PriradTratVstup(int Rozjizdka);

/// <summary>
/// Pravidla stavu trati. Čisté funkce, aby se na ně dalo odpovědět bez
/// databáze — role a „odjelo se podle ní" řeší volající.
/// </summary>
public static class Stavba
{
    public const int DuvodNejvic = 300;

    /// <summary>Proč nejde hlásit hotovo — nebo <c>null</c>.</summary>
    public static string? ProcNejdeHotovo(StavTrati stav) => stav switch
    {
        StavTrati.Rozestaveno or StavTrati.Prestavba => null,
        StavTrati.Hotovo => "Hotovo už je nahlášené, trať čeká na rozhodčího.",
        _ => "Trať je přijatá a zamčená. Na úpravu ji nejdřív odemkni přestavbou.",
    };

    /// <summary>
    /// <b>Hotovo nejde nahlásit, dokud některý prvek stojí na značce, která
    /// už ve vodě není.</b> Vrací hlášku, nebo <c>null</c>.
    ///
    /// <para>
    /// Objeveno 15. 10. 2026 při průchodu scénáři Izolepy: sebral jsem bóji,
    /// kterou používal prvek trati. Hláška řekla „z trati zmizela", jenže
    /// prvek zůstal — hotovo šlo nahlásit, rozhodčí trať přijal a závodník
    /// pak na veřejné trati pořád viděl „2. otočná bóje", ke které měl plout.
    /// <see cref="Prvky"/> brání takový prvek <b>založit</b>, ale bóje se dá
    /// sebrat až potom, takže kontrola musí být i na konci stavby.
    /// </para>
    ///
    /// <para>
    /// Sbírat se tím nebrání — sbírá se při přestavbě a to je celý smysl.
    /// Brání se jen tomu, odejít od rozestavěné trati jako od hotové.
    /// </para>
    /// </summary>
    public static string? ProcNejdeHotovoKvuliZnackam(IReadOnlyList<(int Poradi, string Znacka)> chybejici)
    {
        if (chybejici.Count == 0) return null;

        var vypis = string.Join(", ", chybejici.Select(ch => $"{ch.Poradi}. ({ch.Znacka})"));
        return chybejici.Count == 1
            ? $"Prvek {vypis} stojí na značce, která je sebraná z vody. "
              + "Pípni ji znovu, nebo prvek smaž — jinak by trať vedla k bóji, která tam není."
            : $"Tyhle prvky stojí na značkách sebraných z vody: {vypis}. "
              + "Pípni je znovu, nebo prvky smaž — jinak by trať vedla k bójím, které tam nejsou.";
    }

    /// <summary>Proč nejde přijmout — nebo <c>null</c>. Smí jen rozhodčí.</summary>
    public static string? ProcNejdePrijmout(StavTrati stav) => stav switch
    {
        StavTrati.Hotovo => null,
        StavTrati.Prijato => "Tahle trať je už přijatá.",
        _ => "Stavitelé zatím nehlásili hotovo. Přijmout jde trať, o které někdo řekl, že stojí.",
    };

    /// <summary>
    /// Proč nejde vrátit stavitelům — nebo <c>null</c>. Smí jen rozhodčí
    /// a důvod je povinný.
    /// </summary>
    public static string? ProcNejdeVratit(StavTrati stav, string? duvod)
    {
        if (stav != StavTrati.Hotovo)
            return "Vrátit jde jen trať, která čeká na přijetí.";

        var oriznuty = duvod?.Trim();
        if (string.IsNullOrEmpty(oriznuty))
            return "Napiš, co na trati chybí. Vrácení bez důvodu je jen „ne“ a stavitelé "
                   + "nevědí, co mají dodělat.";

        return oriznuty.Length > DuvodNejvic
            ? $"Důvod má nejvýš {DuvodNejvic} znaků."
            : null;
    }

    /// <summary>
    /// Proč nejde odemknout na přestavbu — nebo <c>null</c>.
    /// <para>
    /// <b>Odjetá trať se nepřestavuje, nahrazuje se novou</b> (Filip,
    /// 9. 10. 2026): podle té se už jelo, počítalo se z ní pořadí a jednou
    /// podle ní možná hendikep. Volající v tom případě založí novou trať —
    /// není to chyba, je to jiná cesta.
    /// </para>
    /// </summary>
    public static string? ProcNejdePrestavba(StavTrati stav) => stav switch
    {
        StavTrati.Prijato => null,
        StavTrati.Prestavba => "Trať se už přestavuje.",
        _ => "Přestavět jde jen přijatá trať. Rozestavěnou prostě dostav.",
    };

    /// <summary>
    /// Veřejně se vydává přijatá trať; u přestavby se místo ní říká, že se
    /// přestavuje. Rozestavěná trať veřejně neexistuje.
    /// </summary>
    public static bool JeVerejna(StavTrati stav) =>
        stav is StavTrati.Prijato or StavTrati.Prestavba;

    /// <summary>
    /// Proč klon nesmí začít v tomhle stavu — nebo <c>null</c>.
    /// <para>
    /// <b>Výchozí je <see cref="StavTrati.Hotovo"/></b>, protože klon je
    /// tvrzení stavitele („stojí to, co minule"), ne rozhodnutí rozhodčího
    /// (Filip, 9. 10. 2026). <b><see cref="StavTrati.Prijato"/> proto smí
    /// zvolit jen rozhodčí</b> — jinak by se zámek dal obejít knoflíkem na
    /// stavitelské obrazovce.
    /// </para>
    /// <para>
    /// <see cref="StavTrati.Prestavba"/> znamená „tahle trať se právě
    /// mění". Začít v něm nedává smysl: nic se nemění, nic tu předtím
    /// nebylo.
    /// </para>
    /// </summary>
    public static string? ProcNejdeKlon(StavTrati stav, bool jeRozhodci) => stav switch
    {
        StavTrati.Rozestaveno or StavTrati.Hotovo => null,
        StavTrati.Prijato when jeRozhodci => null,
        StavTrati.Prijato =>
            "Přijmout trať smí jen rozhodčí. Naklonuj ji jako hotovou a nech ji přijmout.",
        _ => "Klon nemůže začít v přestavbě — přestavuje se trať, která už stojí.",
    };
}

import Link from "next/link";
import { Boky } from "@/app/boky";

export const metadata = {
  title: "Nápověda",
  description:
    "Jak přihlásit loď, jak se dostat ke své lodi a jak se vypisuje regata, zapisují výsledky a pouští ven — podle toho, kdo co smí.",
};

/**
 * Nápověda: jak co založit.
 *
 * <b>Zadání od Filipa (8. 10. 2026):</b> *„budeme tam muset udělat help
 * s návody jak co založit a ty informační věty (např. o založení lodi)
 * udělat s proklikem, ať je to user friendly."*
 *
 * <b>Píše se podle kódu, ne podle představy.</b> Kdo co smí, je opsané
 * z `Kalendar.KdoSmi`, `Workflow.KdoSmi` a `Prava.Smi`; kde se tvrzení
 * rozešlo s kódem, platí kód a věta na obrazovce se opravila (tak padla
 * věta „první, kdo se k lodi připojí, je kapitán" — kód dělá posádku
 * vždycky).
 *
 * <b>Sem vedou prokliky z informačních vět.</b> Každý oddíl má proto
 * `id`, které se nesmí měnit bez projití odkazů — jsou roztroušené po
 * celé správě i po veřejném webu.
 *
 * <b>Co aplikace neumí, je tu taky</b>, a schválně. Nejdražší je hledání
 * funkce, která není; krátký seznam na konci ušetří víc času než
 * kterýkoliv návod výš.
 *
 * <b>Nápověda se měří, ne odhaduje</b> (Filip, 26. 10. 2026: *„mohli
 * bychom udělat nápovědu tak, aby byla strukturovaná?"*). Struktura tu byla
 * — rozcestník, oddíly, stabilní `id` — jenže **text končil 8. října**.
 * Změřeno: slova *klíč*, *tracking*, *polohy*, *sledování*, *okno*,
 * *rozprava*, *upozornění*, *tabule*, *prvek trati* a *úvodník* se v celém
 * souboru nevyskytovala ani jednou, *trať* dvakrát a *appka* jednou. Šest
 * oddílů proto přibylo (trať, sledování, klíče, tabule, upozornění, appka)
 * a mají pevný tvar: co to je → kdo smí → v jakém pořadí → když to nejde.
 *
 * <b>Opsané odkud:</b> stavy trati z `StavTrati` a `TypPrvku`, pořadí
 * závodního dne z `OknaEndpoints` a `NastaveniSprava`, kdo smí na klíče
 * z `KliceSprava.SmiVydavatAsync` a `SmiSpravovatAsync` a z cesty regaty
 * v `KliceEndpoints`, co vidí posádky z `CoVidiPosadky`, podmínka vysílání
 * ven ze `SpoctiVenAsync`. Kde se tvrzení rozešlo s kódem, platí kód.
 */
export default function Napoveda() {
  return (
    <Boky>
      <h1>Nápověda</h1>
      <p className="podtitulek">
        Co se kde zakládá, v jakém pořadí to jde a kdo na to má právo.
        Když něco nejde, bývá to stavem regaty nebo rolí — obojí je níž.
      </p>

      <nav aria-label="Obsah nápovědy">
        <ul className="seznam">
          <li>
            <b>Pro závodníky:</b> <a href="#prihlasit-lod">přihlásit loď</a> ·{" "}
            <a href="#moje-lod">dostat se ke své lodi</a> ·{" "}
            <a href="#posadka">připojit posádku</a>
          </li>
          <li>
            <b>Pro pořadatele:</b> <a href="#kde-to-je">kde se co najde</a> ·{" "}
            <a href="#po-sobe">v jakém pořadí</a> ·{" "}
            <a href="#vypsat-regatu">vypsat regatu</a> ·{" "}
            <a href="#prihlasky">přihlášky</a> · <a href="#smernice">směrnice</a> ·{" "}
            <a href="#boje">bóje</a> · <a href="#vysledky">výsledky</a> ·{" "}
            <a href="#role">kdo co smí</a>
          </li>
          <li>
            <b>Na vodě a v telefonu:</b> <a href="#trat">trať z bójí</a> ·{" "}
            <a href="#tracking">sledování lodí</a> · <a href="#klice">klíč k lodi</a> ·{" "}
            <a href="#tabule">tabule</a> · <a href="#upozorneni">upozornění</a> ·{" "}
            <a href="#appka">co umí appka</a>
          </li>
          <li>
            <b>Když něco nejde:</b> <a href="#proc-neni-venku">proč to není venku</a> ·{" "}
            <a href="#co-neumime">co aplikace neumí</a>
          </li>
        </ul>
      </nav>

      <h2 id="prihlasit-lod">Jak přihlásit loď na regatu</h2>
      <p>
        <b>Z webu, bez účtu a bez hesla.</b> Na stránce regaty je formulář
        přihlášky — vyplní se loď, kategorie a kontakt na kormidelníka.
        Přihlásit se dá <b>až od chvíle, kdy je regata vypsaná</b>; do té doby
        formulář není z čeho otevřít.
      </p>
      <p>
        Odeslaná přihláška <b>není hned ve startovní listině</b>. Čeká ve frontě
        u pořadatele, a až ji zapíše, objeví se loď veřejně. Když něco chybí,
        vrátí ji k doplnění.
      </p>
      <p className="poznamka">
        Loď nemusí v ročníku existovat předem — zakládá se právě touhle
        přihláškou. Druhá cesta je pořadatel u registrace (<i>Nová loď, která
        v ročníku ještě není</i>), třetí je import loňských dat.
      </p>
      <p className="poznamka">
        <b>E-mail na přihlášce není jen kontakt.</b> Až se jeho majitel poprvé
        přihlásí na web, aplikace ho podle něj sama spáruje s lodí — proto tam
        patří adresa toho, kdo má loď spravovat, ne sdílená schránka klubu.
      </p>

      <h2 id="moje-lod">Jak se dostat ke své lodi</h2>
      <p>Vedou tam tři cesty a liší se tím, kdo je otevírá:</p>
      <ol className="seznam">
        <li>
          <b>E-mail z přihlášky.</b> Jde sama: když e-mail na přihlášce vede
          právě k jedné osobě, spáruje se účet s lodí při přihlášení.
        </li>
        <li>
          <b>Připojovací kód.</b> Šest znaků s platností čtvrt hodiny, také jako
          QR. Vystaví ho kapitán nebo majitel lodi v{" "}
          <Link href="/moje-lode">Mých lodích</Link>, u registrace i pořadatel
          regaty. Zadává se na <Link href="/pripojeni">Připojení k lodi</Link>.
        </li>
        <li>
          <b>Nárok s potvrzením.</b> Kdo kód nemá, požádá o loď a{" "}
          <b>kapitán žádost potvrdí</b>. Zamítnutí je natrvalo — znovu o tutéž
          loď požádat nejde.
        </li>
      </ol>
      <p className="poznamka">
        Všechny tři dělají <b>posádku</b>. <b>Kapitána lodi určuje správce
        ročníku</b>, protože vazba platí celý rok a napříč zastávkami; pověření
        k jedné regatě na ni nedosáhne.
      </p>

      <h2 id="posadka">Jak připojit posádku</h2>
      <p>
        Kapitán nebo majitel lodi si v <Link href="/moje-lode">Mých lodích</Link>{" "}
        nechá vystavit kód a ukáže ho posádce — na displeji nebo jako QR. Kód
        platí čtvrt hodiny a <b>může ho použít víc lidí</b>, takže se jím
        připojí celá posádka naráz.
      </p>
      <p className="poznamka">
        Role posádky se z webu nemění. Kdo má být kapitán, řekne{" "}
        <a href="#role">správci ročníku</a>.
      </p>

      <h2 id="kde-to-je">Kde se co ve správě najde</h2>
      <p>
        <b>Jedny dveře:</b> ikonka účtu vpravo nahoře a v ní <i>Správa</i>.
        Kdo má roli v jediném ročníku, jde rovnou do něj.
      </p>
      <p>
        <b>Rozcestník ročníku je hlavní místo.</b> Nahoře stojí <i>Co teď</i>
        — co čeká zrovna dneska. Pod tím je <b>karta každé regaty</b> a na ní
        pohromadě všechno, co se k jedné regatě dělá: výsledky, přihlášky,
        plachetní směrnice a bóje na trati. Teprve pod regatami jsou věci
        celého ročníku: kalendář a termíny, lodě a kapitáni, novinky,
        oprávnění.
      </p>
      <p>
        <b>Jde to i z veřejné stránky regaty.</b> Komu na ni role stačí, uvidí
        tam rámeček s odkazy do správy té regaty — nemusí se vracet přes
        nabídku účtu. Odkazy na práci u regaty jsou i v kalendáři, u jejího
        řádku.
      </p>
      <p className="poznamka">
        <b>Cesta nahoře ukazuje, kde jsi:</b> Domů » Správa » Ročník »
        {" "}<i>regata</i> » obrazovka. Klepnutím na jméno regaty se vrátíš na
        její kartu na rozcestníku, ne na kalendář — kalendář je o termínech
        a stavech.
      </p>

      <h2 id="po-sobe">V jakém pořadí to jde</h2>
      <p>
        Většina „tohle nejde" je ve skutečnosti „ještě na to nedošla řada".
        Řetěz je tenhle a každý článek odemyká ten další:
      </p>
      <ol className="seznam">
        <li>
          <b>Ročník existuje</b> — nahraje se importem. Z webu se ročník založit
          nedá (<a href="#co-neumime">co aplikace neumí</a>).
        </li>
        <li>
          <b>Role jsou rozdané</b> — bez role není ve správě vidět nic.
        </li>
        <li>
          <b>Regata je v kalendáři</b> a má potvrzený termín.
        </li>
        <li>
          <b>Regata je vypsaná</b> — teprve tím se otevřou přihlášky.
        </li>
        <li>
          <b>Lodě jsou přihlášené</b>, směrnice vyvěšená, trať postavená.
        </li>
        <li>
          <b>Rozjížďky se zapíšou</b>, rozhodčí je ověří, správce pustí ven.
        </li>
      </ol>

      <h2 id="vypsat-regatu">Jak vypsat regatu</h2>
      <p>
        Regata se posouvá <b>po jednom kroku</b> a u každého kroku rozhoduje{" "}
        <b>cílový stav</b>, ne směr:
      </p>
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th>Krok</th>
              <th>Kdo</th>
              <th>Co se tím odemkne</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Založit → Plánovaná</td>
              <td>rozhodčí ročníku</td>
              <td>termín je v rozpisu, veřejně zatím není</td>
            </tr>
            <tr>
              <td>Plánovaná → Potvrzená</td>
              <td>rozhodčí ročníku</td>
              <td>termín platí</td>
            </tr>
            <tr>
              <td>Potvrzená → <b>Vypsaná</b></td>
              <td><b>pořadatel té regaty</b></td>
              <td>přihlášky lodí, startovné, prezence</td>
            </tr>
            <tr>
              <td>Vypsaná → Odjetá</td>
              <td>pořadatel té regaty</td>
              <td>výsledky se počítají do poháru</td>
            </tr>
            <tr>
              <td>Zveřejnit</td>
              <td>správce ročníku</td>
              <td>regata je vidět na veřejném webu</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="poznamka">
        <b>Zrušit</b> smí rozhodčí, a <b>odjetou regatu už ne</b> — jsou v ní
        výsledky, které se počítají do poháru. Zrušená se vrací jako plánovaná
        a termín se pak potvrzuje znovu.
      </p>
      <p className="poznamka">
        Komunitní akce se zakládá týmž formulářem na druhé záložce. Do poháru
        se nepočítá a <b>nemá výsledky ani přihlášky lodí</b> — psát se k ní
        dá jako k regatě.
      </p>

      <h2 id="prihlasky">Přihlášky lodí</h2>
      <p>
        Přihlášky vede <b>pořadatel regaty</b>. Zapisuje je z fronty z webu,
        přihlašuje lodě od stolu registrace, potvrzuje prezenci, vrací
        k doplnění a značí nedostavení. <b>Vyloučit loď ze závodu smí jen
        rozhodčí</b> — je to rozhodnutí o výsledku, ne o evidenci.
      </p>
      <p className="poznamka">
        Přihlášením do ročníku se loď stává jeho účastníkem v kategorii, kterou
        vybereš. Za regaty, na kterých nebyla, dostane body za neúčast — jak se
        to počítá, je v <Link href="/pravidla">pravidlech bodování</Link>.
      </p>

      <h2 id="smernice">Plachetní směrnice</h2>
      <p>
        Vyvěšuje ji <b>pořadatel regaty nebo rozhodčí ročníku</b> jako PDF.
        Oprava je <b>nová verze</b>, původní zůstává k nahlédnutí — appka
        i web ukazují jako platnou tu nejnovější.
      </p>
      <p className="poznamka">
        Když je v souboru něco, co venku být nemá, <b>stáhni tu verzi
        z vývěsky</b>: soubor zmizí z úložiště i z veřejného čtení, záznam
        o vyvěšení a důvod zůstanou. Důvod je povinný.
      </p>

      <h2 id="boje">Bóje na trati</h2>
      <p>
        Trať staví <b>pořadatel regaty nebo rozhodčí</b> přímo u vody:
        u každé bóje klepne <i>Pípnout</i> a telefon pošle polohu. Přesnost je
        po celou dobu vidět a tlačítko se odemkne, až poloha za něco stojí —
        polohu horší než sto metrů aplikace nevezme.
      </p>
      <p className="poznamka">
        <b>Přenastavení je nový záznam</b>, ne přepis: původní poloha zůstane
        v historii, protože trasa lodi se k trati vztahuje tak, jak stála
        tehdy. Sebrání je razítko, ne smazání. <b>Bez signálu to nejde</b> —
        podržené pípnutí by se uložilo s časem nahrání, ne s časem postavení.
      </p>
      <p>
        <b>Když u bóje nikdo s telefonem není</b>, dá se poloha zadat i z mapy:
        pod pípnutím je <i>Nejde pípnout? Zadej polohu z mapy</i>. Bere
        souřadnice, odkaz z Mapy.com i Google Maps a přečte i QR kód z fotky.
        Zapíše se to jako <b>odečtená poloha, bez přesnosti</b> — mapa nic
        neměří, a v seznamu je pak u bóje vidět, že se neměřila.
      </p>
      <p className="poznamka">
        <b>Fotky k bóji</b> můžeš přidat kolikrát chceš a je to doklad
        k poloze, ne obrázek na web: ze souřadnic se nepozná barva bóje ani
        co je za ní na břehu. Ukládají se zmenšené, originál z telefonu nikam.
        Sebráním bóje fotky nemizí — záznam o poloze zůstává a ony jsou jeho
        doklad.
      </p>

      <h2 id="trat">Trať: z bójí se skládají prvky</h2>
      <p>
        <b>Bóje je věc ve vodě, prvek je úkol pro loď.</b> Z jedné bóje je
        otočná bóje nebo průjezdní, ze dvou brána, start nebo cíl. Prvky se
        řadí za sebou a jejich pořadí je trať. Tatáž bóje může být ve dvou
        prvcích — dvakrát objetý trojúhelník je dvakrát tentýž prvek nad
        týmiž bójemi, ne jedna bóje se dvěma průjezdy.
      </p>
      <p>
        Trať prochází čtyřmi stavy a <b>veřejně je vidět až od třetího</b>:
      </p>
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th>Stav</th>
              <th>Kdo ho nastaví</th>
              <th>Co znamená</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Rozestaveno</td>
              <td>pořadatel regaty</td>
              <td>Staví se, bóje se ještě hýbou.</td>
            </tr>
            <tr>
              <td>Hotovo</td>
              <td>pořadatel regaty</td>
              <td>Postaveno, čeká na rozhodčího.</td>
            </tr>
            <tr>
              <td>Přijato</td>
              <td><b>rozhodčí</b></td>
              <td>Platí a je venku. Od téhle chvíle s ní nikdo nehýbe.</td>
            </tr>
            <tr>
              <td>Přestavba</td>
              <td>rozhodčí</td>
              <td>Mění se. Venku se místo trati píše „počkej".</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="poznamka">
        <b>Při přestavbě se stará trať schválně neukazuje.</b> Kdo by podle ní
        vyrazil, pluje k bóji, která už stojí jinde — a to je horší než
        prázdná stránka. Jedna regata může mít tratí víc a každá rozjížďka si
        jednu vezme; dvě rozjížďky nad toutéž tratí to u sebe píšou.
      </p>

      <h2 id="tracking">Sledování lodí na vodě</h2>
      <p>
        Telefon na palubě zaznamenává trasu a pořadatel vidí pole na mapě.
        Všechno se ovládá na jedné obrazovce — ve správě regaty{" "}
        <i>Živé polohy lodí</i> — a dělá ji <b>pořadatel té regaty nebo
        rozhodčí ročníku</b>. Má tři sekce, protože je to jeden den a tři
        otázky téhož člověka: <i>jede se?</i>, <i>kdo to uvidí?</i>,{" "}
        <i>hlásí se všichni?</i>
      </p>
      <p>
        <b>Pořadí je závazné</b> — každý krok odemyká ten další:
      </p>
      <ol className="seznam">
        <li>
          <b>Zapnout, co je vidět.</b> Jestli smí polohy ven na tabuli a co
          z nich uvidí posádky. Dokud se tohle nenastaví, ven nejde nic.
        </li>
        <li>
          <b>Rozprava otevře závodní den.</b> Teprve tím začne server brát
          trasy z telefonů. Dá se u ní rovnou říct, na kolik hodin.
        </li>
        <li>
          <b>Odstartovat rozjížďku.</b> Na tabuli jdou polohy jen tehdy, když
          se zrovna jede.
        </li>
        <li>
          <b>Uzavřít den.</b> Okno se zavře a vysílání ven s ním přestane.
        </li>
      </ol>
      <p className="poznamka">
        <b>Po rozpravě se nastavení zamyká</b> a od té chvíle do něj smí jen
        rozhodčí, jen směrem k přísnějšímu a jen s důvodem — ten se ukládá
        jako doklad ke sporu „vy jste nás viděli a my vás ne". Pořadatel už
        na ně nesmí vůbec. <b>Mimo otevřené okno trasa nevznikne</b>; telefon
        si body nechá a pošle je, až se den otevře.
      </p>
      <p className="poznamka">
        <b>Uzavřít den je potřeba i tehdy, když se zapomnělo ukončit
        rozjížďku.</b> Konec rozjížďky je rozhodnutí rozhodčího, ne dopočet,
        takže bez uzavření dne by tabule vysílala i večer, kdy se pole vrací
        k molu.
      </p>
      <p>
        Co uvidí posádky, jsou tři možnosti: <b>nic</b>, <b>jen sebe</b> nebo{" "}
        <b>i ostatní</b>. Když se nenastaví nic, platí <i>jen sebe</i>.
        Mimo otevřené okno posádka nevidí ani sebe.
      </p>
      <p className="poznamka">
        <b>Appka to zatím neukazuje</b> — server už podle toho odpovídá, ale
        obrazovka v telefonu na to čeká. Dokud nebude, je to nastavení pro
        tabuli a pro pořadatele.
      </p>

      <h2 id="klice">Telefon jako klíč k lodi</h2>
      <p>
        Aby telefon směl posílat polohy, musí být spárovaný s lodí. Dělá se to{" "}
        <b>mobilním klíčem</b>, a je to oprávnění, ne přihlášení: kdo klíč má,
        smí za tu loď nahrávat trasu. Za to, kdo ten člověk je, ručí ten, kdo
        mu klíč dal — stejně jako když někdo půjčí klíč od loděnice.{" "}
        <b>O posádce se nic nevede</b>, nanejvýš jméno, aby se vědělo, kdo je
        kdo.
      </p>
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th>Co</th>
              <th>Kdo smí</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>vydat pozvánku ke klíči</td>
              <td>majitel, kapitán, <b>i posádka</b> — ale jen ta s účtem</td>
            </tr>
            <tr>
              <td>vidět spárované telefony</td>
              <td>majitel, kapitán; u své regaty i pořadatel a rozhodčí</td>
            </tr>
            <tr>
              <td>vypnout sledování cizímu telefonu</td>
              <td>majitel, kapitán; u své regaty i pořadatel a rozhodčí</td>
            </tr>
            <tr>
              <td>vypnout a zase zapnout sledování <b>svému</b> telefonu</td>
              <td>sám držitel klíče, i bez účtu</td>
            </tr>
            <tr>
              <td>odebrat klíč</td>
              <td>majitel, kapitán; u své regaty i pořadatel a rozhodčí</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="poznamka">
        <b>Vydat klíč smí víc lidí než ho vzít</b>, protože odebrání je zásah
        do cizího telefonu a za posádku odpovídá kapitán. <b>Pořadatel na něj
        dosáhne u své regaty</b> kvůli pasti „telefon zůstal v autě" — tu
        vidí z vody právě on a kapitán o ní neví. Sáhne jen na klíče lodí,
        které tu regatu jedou.
      </p>
      <p className="poznamka">
        <b>Odepnout sledování není totéž co zapomenout klíč.</b> Zapomenutí
        maže tajemství z telefonu a nikdo jiný se to nedozví; odepnutí je
        stav na serveru, který uvidí i kapitán. Kdo odjíždí po prvním dni
        domů, odepne se — a druhý den se zase připne. <b>Odebrání je
        nevratné</b> a telefonu zavře cestu i k vlastní rozdělané trase, takže
        co nestihl poslat, už nepošle.
      </p>

      <h2 id="vysledky">Výsledky: od zápisu po web</h2>
      <p>
        Nejdřív musí mít regata <b>rozjížďku</b>; zakládá ji pořadatel. Pak se
        zapisují dojezdy — na cílové obrazovce klepáním, nebo doma z papíru.
        Dál to jde takhle:
      </p>
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th>Stav</th>
              <th>Kdo ho nastaví</th>
              <th>Co znamená</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Navrženo</td>
              <td>pořadatel regaty</td>
              <td>zapsáno, dá se opravovat</td>
            </tr>
            <tr>
              <td>Ověřeno · Schváleno</td>
              <td>rozhodčí ročníku</td>
              <td>čísla platí</td>
            </tr>
            <tr>
              <td>K revizi</td>
              <td>rozhodčí ročníku</td>
              <td>vráceno pořadateli, zápis je zase otevřený</td>
            </tr>
            <tr>
              <td>Potvrzeno</td>
              <td>správce ročníku</td>
              <td>uzavřeno</td>
            </tr>
            <tr>
              <td>Pustit ven</td>
              <td>správce ročníku</td>
              <td>veřejnost vidí výsledky</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="poznamka">
        <b>Zapisovat a schvalovat nemá dělat tentýž člověk.</b> Proto rozhodčí
        do zápisu nesahá a pořadatel si ho neodsouhlasí sám.
      </p>
      <p className="poznamka">
        <b>Zapisovali dva?</b> Druhé uložení skončí konfliktem a nabídne
        porovnání obou zápisů. Nic se nepřepíše samo — společný výsledek
        sestavíš ručně a uložíš jako jeden.
      </p>

      <h2 id="tabule">Tabule na telku</h2>
      <p>
        Tabule je obrazovka pro hospodu a klubovnu: střídá pořadí, dojezdy a
        mapu s loděmi. <b>Nic se na ni nepřihlašuje</b> a má vlastní adresu
        u každé regaty; v nabídce je pod <i>Tabule na telku</i> rozcestník,
        který vede na tu, co se zrovna jede.
      </p>
      <p className="poznamka">
        <b>Lodě na mapě se objeví, jen když regata vysílá</b> — tedy když je
        to zapnuté v nastavení, běží závodní den a jede se rozjížďka (viz{" "}
        <a href="#tracking">sledování lodí</a>). Dokud žádná regata nevysílá,
        ukazuje tabule <b>ukázkovou rozjížďku a píše to u sebe</b>: vymyšlené
        lodě na skutečné trati, aby se dalo posoudit, jak to bude vypadat.
      </p>

      <h2 id="upozorneni">Upozornění do telefonu</h2>
      <p>
        V appce se dá na obrazovce ročníku zapnout <i>Upozornění</i>. Telefon
        se tím přihlásí k odběru a <b>účet k tomu není potřeba</b> — divák
        nemá kvůli termínu závodu nic zakládat.
      </p>
      <p>
        <b>Dnes chodí jediná zpráva: výsledky rozjížďky, jakmile je pořadatel
        pustí ven.</b> Ne při zápisu a ne při ověření — teprve když jdou na
        web. Opakované puštění téže rozjížďky zprávu podruhé nepošle.
      </p>
      <p className="poznamka">
        <b>Upozornění pro účastníky zatím nejsou</b> — odložený start ani
        změna trati nikam nechodí. Vědět, komu je poslat, už aplikace umí
        (telefon je k lodi spárovaný <a href="#klice">klíčem</a>), ale zprávy
        samy ještě ne.
      </p>

      <h2 id="appka">Co umí appka</h2>
      <p>
        Appka je nástroj na vodu, ne druhý web. Umí čtyři věci:{" "}
        <b>nahrát trasu lodi</b> (živě i po dojezdu),{" "}
        <b>spárovat se s lodí klíčem</b>, <b>odebírat upozornění</b> a{" "}
        <b>přihlásit se účtem</b>, když ho člověk má.
      </p>
      <p className="poznamka">
        <b>Výpadek signálu na vodě je normál, ne porucha.</b> Body se hromadí
        v telefonu a odesílají se, až je sít. Když se neodesílá, appka řekne
        proč: <i>bez klíče</i> je věc pro kapitána, <i>bez sítě</i> je stav
        vody a <i>čeká na rozpravu</i> znamená, že pořadatel ještě neotevřel
        závodní den.
      </p>

      <h2 id="role">Kdo co smí</h2>
      <p>
        Role se udělují na <b>celý ročník</b>, nebo jen na <b>jednu regatu</b>.
        Vyšší role nižší pokrývá, <b>rozhodčí ale není stupeň</b> — je to
        samostatná role a dává ji správce.
      </p>
      <div className="tabulka-obal">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Na co stačí</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pořadatel regaty</td>
              <td>vypsat a odjet regatu, přihlášky, směrnice, bóje, zápis výsledků</td>
            </tr>
            <tr>
              <td>Rozhodčí ročníku</td>
              <td>
                kalendář a termíny, ověřit a schválit výsledky, vrátit k revizi,
                vyloučit loď, udělit pořadatele a editora jedné regatě
              </td>
            </tr>
            <tr>
              <td>Editor</td>
              <td>psát novinky</td>
            </tr>
            <tr>
              <td>Správce ročníku</td>
              <td>
                všechno výše, k tomu kapitáni lodí, zveřejnění ročníku
                a regat, potvrzení výsledků a jejich vypuštění ven
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="poznamka">
        <b>Roli dostane jen ten, kdo se už aspoň jednou přihlásil</b> — účet
        vzniká přihlášením a pozvat člověka rolí nejde. Pošli mu odkaz na web,
        ať se přihlásí, a pak mu roli udělíš.
      </p>

      <h2 id="proc-neni-venku">Proč regata není venku nebo v pořadí poháru</h2>
      <p>Projdi to odshora, zasekne se to skoro vždycky na prvních dvou:</p>
      <ol className="seznam">
        <li>
          <b>Je ročník puštěný ven?</b> Skrytý ročník neukáže veřejný web vůbec
          — ani regaty a výsledky, které jsou samy publikované. Pouští správce.
        </li>
        <li>
          <b>Je regata zveřejněná?</b> Zveřejňuje správce, ne rozhodčí.
        </li>
        <li>
          <b>Je regata odjetá?</b> Do průběžného pořadí jdou jen odjeté.
        </li>
        <li>
          <b>Jsou výsledky puštěné ven?</b> Zapsané ještě neznamená veřejné.
        </li>
        <li>
          <b>Je to vůbec kolo poháru?</b> Komunitní akce se do pořadí nepočítá.
        </li>
      </ol>

      <h2 id="co-neumime">Co aplikace neumí</h2>
      <p>
        Krátký seznam, ať se to nehledá. Není to seznam chyb — u většiny je to
        rozhodnutí.
      </p>
      <ul className="seznam">
        <li>
          <b>Založit ročník z webu.</b> Ročník se nahraje importem; je to jediná
          cesta a je za tajemstvím na serveru.
        </li>
        <li>
          <b>Udělat prvního správce ročníku.</b> Taky import. Z obrazovky to
          nejde a po prvním použití se ta cesta sama zavře.
        </li>
        <li>
          <b>Zapsat posádku nebo kormidelníka ve správě.</b> Pořadatel je jen
          vidí. Zapisuje je veřejná přihláška, nebo import.
        </li>
        <li>
          <b>Změnit kategorii nebo majitele lodi.</b> Zapisují se při založení
          lodi a dál je mění jen import.
        </li>
        <li>
          <b>Pozvat člověka rolí.</b> Role jde dát jen účtu, který už existuje
          — tedy tomu, kdo se aspoň jednou přihlásil.
        </li>
        <li>
          <b>Smazat vyvěšenou směrnici nebo bóji.</b> Směrnice se stahuje, bóje
          sbírá; záznam v obou případech zůstává.
        </li>
      </ul>

      <p className="poznamka">
        Něco tu chybí nebo nesedí? Je to chyba nápovědy, ne tvoje — napiš
        pořadateli a doplní se to.
      </p>
    </Boky>
  );
}

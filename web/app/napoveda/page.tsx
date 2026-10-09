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

import Link from "next/link";
import { Boky } from "@/app/boky";
import { KONTAKT_UDAJE } from "@/lib/kontakt";

export const metadata = {
  title: "Osobní údaje",
  description:
    "Co o lidech Orlický pohár sbírá, proč, jak dlouho to drží a kam napsat, když to má zmizet. Včetně polohy lodi, kterou zaznamenává appka.",
};

/**
 * Stránka o zpracování osobních údajů.
 *
 * <b>Vznikla, protože formulář přihlášky sbíral kontakty a neměl kam
 * odkázat</b> (audit 8. 10. 2026). U zaškrtávátka stálo, že se pořadatel
 * může ozvat — a tím to končilo.
 *
 * <b>Popisuje, co kód doopravdy dělá, ne co by se hodilo slíbit.</b> Každé
 * tvrzení o lhůtě nebo o tom, kam se údaje dostanou, má v kódu svoje místo:
 * retenci <c>Kontakty.SmazatStarsiNez</c> a <c>UklidKontaktu</c>, úložiště
 * fotek <c>Fotky__Bucket</c> v compose, účty <c>Identita__Authority</c>.
 * Kdo tu něco změní, musí se podívat tam — jinak stránka začne lhát.
 *
 * Dva správci, protože tak to opravdu je (Filip, 9. 10. 2026): web
 * a databázi provozuje Filip, s přihláškami na svou zastávku pracuje
 * pořadatel.
 *
 * <b>Oddíl o poloze přibyl 10. 11. 2026</b>, protože Google Play u appky
 * s polohou na pozadí žádá zásady na veřejné adrese a prominentní
 * disclosure, který se na ně odvolává — a stránka o poloze dosud neměla ani
 * slovo, přestože appka trasu nahrává na server. Tvrzení o viditelnosti se
 * ověřují v <c>Features/Polohy/PolohyEndpoints.cs</c>, kde má každý ze tří
 * diváků vlastní cestu i vlastní přepínač, prořídnutí v <c>PolohySprava</c>,
 * přenos z telefonu v <c>app/src/lib/tracker/nahravani.ts</c> a to, že trasa
 * patří lodi a ne účtu, v <c>Features/Trasy/Trasa.cs</c>.
 */
export default function OsobniUdaje() {
  return (
    <Boky>
      <h1>Osobní údaje</h1>
      <p className="podtitulek">
        Co o tobě web ví, odkud to má a jak dlouho mu to zůstane. Je to popis toho,
        co se doopravdy děje, ne formulář pro právníka.
      </p>

      <h2>Kdo za to odpovídá</h2>
      <p>Dva, každý za svůj kus:</p>
      <ul>
        <li>
          <b>Filip Burda</b> provozuje tenhle web, databázi i server, na kterém běží.
          Odpovídá za to, že se údaje nedostanou tam, kam nemají.
        </li>
        <li>
          <b>Pořadatel regaty</b> vidí přihlášky na svou zastávku a pracuje s nimi —
          zve, volá, zapisuje do startovní listiny. Za to, co s nimi udělá dál,
          odpovídá on.
        </li>
      </ul>

      <h2>Co se sbírá a proč</h2>
      <div className="tabulka-obal">
        <table>
        <thead>
          <tr>
            <th>Co</th>
            <th>Odkud</th>
            <th>Proč</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>E-mail a telefon</td>
            <td>přihláška lodi</td>
            <td>aby se pořadatel mohl ozvat — odložený start, změna programu</td>
          </tr>
          <tr>
            <td>Jméno a příjmení kapitána</td>
            <td>přihláška lodi</td>
            <td>aby bylo jasné, kdo loď přihlásil</td>
          </tr>
          <tr>
            <td>Posádka volným textem</td>
            <td>přihláška lodi, nepovinné</td>
            <td>co tam napíšeš, to tam je — pořadatel to vidí</td>
          </tr>
          <tr>
            <td>Číslo člena ČSJ</td>
            <td>přihláška lodi, nepovinné</td>
            <td>pro Orlický pohár se nevyžaduje</td>
          </tr>
          <tr>
            <td>Jméno lodi, kategorie, kormidelník</td>
            <td>startovní listina a výsledky</td>
            <td>sportovní výsledek — je veřejný</td>
          </tr>
          <tr>
            <td>Jméno a e-mail u účtu</td>
            <td>poskytovatel identity při přihlášení</td>
            <td>aby se vědělo, kdo co smí spravovat</td>
          </tr>
          <tr>
            <td>Poloha lodi při závodě</td>
            <td>appka, když posádka spustí záznam</td>
            <td>trasa pro rozhodčího, podklad k protestu, přenos pro diváka</td>
          </tr>
          <tr>
            <td>Fotky</td>
            <td>nahrává pořadatel k článkům a lodím</td>
            <td>aby web nebyl jen tabulka čísel</td>
          </tr>
          </tbody>
        </table>
      </div>

      <h2>Co je veřejné a co ne</h2>
      <p>
        Veřejně se vydává <b>jméno lodi, kategorie a kormidelník</b> — to jsou sportovní
        výsledky a ty se neschovávají. <b>Jméno majitele lodi veřejné není</b> a kontakty
        nejsou veřejné nikdy: e-mail ani telefon se z webu bez přihlášení vytáhnout nedá.
      </p>

      <h2>Poloha lodi při závodě</h2>
      <p>
        Jediné místo v celém poháru, kde se sbírá poloha, je <b>mobilní appka</b>. Na webu
        se poloha nesbírá vůbec a appka má na ni vlastní pravidla.
      </p>
      <p>
        <b>Záznam si pouští posádka sama</b> a sama ho taky ukončí. Dokud ho nespustí,
        appka o polohu nepožádá a nečte ji — nainstalovaná appka sama od sebe
        nezaznamenává nic.
      </p>
      <p>
        <b>Běží dál, i když telefon zhasne,</b> a proto si appka řekne o oprávnění „Vždy".
        Závod trvá hodiny a telefon leží v kapse nebo pod plachtou; s mírnějším oprávněním
        by záznam skončil, jak zhasne displej, a chybějící prostředek trasy se pozná
        teprve po dojezdu, kdy už se nedá nic opravit.
      </p>
      <p>
        <b>Záznam smí běžet jen při závodě.</b> Musí platit všechno z toho: loď je
        přihlášená do té regaty, telefon patří někomu z posádky nebo kapitánovi a běží
        okno té regaty.
      </p>
      <p>
        <b>Telefon se prokazuje klíčem k lodi, ne tvým účtem</b> — trasa patří lodi.
        K záznamu appka žádný účet posádky nepotřebuje a server u trasy žádný nevede.
      </p>

      <h2>Kdo trasu vidí</h2>
      <div className="tabulka-obal">
        <table>
        <thead>
          <tr>
            <th>Kdo</th>
            <th>Co vidí</th>
            <th>Za jakých podmínek</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Divák na webu</td>
            <td>živé polohy, po dojetí přehrávku rozjížďky</td>
            <td>
              jen když to rozhodčí povolil a zrovna běží rozjížďka; mimo rozjížďku se
              nevydá nic, u nezveřejněné regaty ani ročníku vůbec nic
            </td>
          </tr>
          <tr>
            <td>Posádka na palubě</td>
            <td>podle rozhodnutí rozhodčího: nic, jen sebe, nebo i ostatní</td>
            <td>
              výchozí je <b>jen sebe</b>; mimo běžící okno regaty nic
            </td>
          </tr>
          <tr>
            <td>Pořadatel a rozhodčí</td>
            <td>i běžící rozjížďku</td>
            <td>vždy — je to jejich podklad pro rozhodnutí a pro protest</td>
          </tr>
          </tbody>
        </table>
      </div>
      <p>
        Co jde ven k divákovi a na tabuli, je navíc <b>prořídlé na jeden bod za patnáct
        sekund</b> a nejvýš čtyři sta bodů na loď. Jemnější stopu než tuhle nedostane
        mimo závodní výbor nikdo.
      </p>

      <h2>Jak záznam vypnout</h2>
      <p>
        Oprávnění k poloze se odebírá v nastavení telefonu u appky; appka to respektuje
        a záznam dál nepojede. Jednotlivý záznam smažeš v appce. <b>Co už je nahrané na
        server, smažeme na požádání</b> — tlačítko na to není.
      </p>

      <h2>Jak dlouho to u nás zůstane</h2>
      <ul>
        <li>
          <b>Kontakty se mažou samy</b> a drží se do konce následující sezóny: co jsi
          napsal v roce 2026, zmizí 1. ledna 2028. Dělá to úloha, která běží jednou denně.
          Maže i kopii kontaktu u přihlášky, a tam rozhoduje <b>termín závodu</b>, ne kdy
          jsi přihlášku poslal — pozdní přihláška se tedy drží stejně dlouho jako ostatní.
        </li>
        <li>
          <b>Výsledky zůstávají.</b> Seriál má smysl jen tehdy, když je vidět i po letech,
          kdo kdy vyhrál.
        </li>
        <li>
          <b>Účet trvá, dokud ho máš.</b> Zrušit se dá u poskytovatele identity.
        </li>
        <li>
          <b>Trasy se nemažou samy.</b> Nahraná trasa na serveru zůstane, dokud o smazání
          nepožádáš — automatický úklid, jaký mají kontakty, na ni zatím není.
        </li>
        <li>
          <b>Fotky zůstávají, dokud je někdo nesmaže.</b> Když na nějaké jsi a nechceš
          tam být, ozvi se.
        </li>
      </ul>

      <h2>Kam se to dostane</h2>
      <ul>
        <li>Server i databáze běží v Německu, u Hetzneru.</li>
        <li>Fotky leží v objektovém úložišti Cloudflare R2.</li>
        <li>
          Účty vede poskytovatel identity na <code>ucty.klihovka.cz</code>, který
          provozujeme taky my.
        </li>
        <li>
          <b>Nikomu dalšímu se to nedává.</b> Web nemá reklamu ani měření návštěvnosti —
          žádná analytika, žádné sledovací skripty. Proto se taky neptá na cookies.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Čtyři, všechny funkční: <code>op_token</code> a <code>op_tok…</code> drží
        přihlášení (token se ukládá po kusech, když se nevejde do jedné cookie),{" "}
        <code>op_rezim</code> si pamatuje světlý nebo tmavý vzhled a{" "}
        <code>op_kalendar</code> ten pohled kalendáře, který sis vybral. Nic z toho
        nesleduje, kam chodíš.
      </p>

      <h2>Co si můžeš vyžádat</h2>
      <p>
        Výpis toho, co o tobě víme, opravu, nebo výmaz.{" "}
        {KONTAKT_UDAJE ? (
          <>
            Piš na <a href={`mailto:${KONTAKT_UDAJE}`}>{KONTAKT_UDAJE}</a>, nebo přímo
            pořadateli regaty, u které ses přihlašoval — kontakt je na jeho stránce.
          </>
        ) : (
          <>
            Piš pořadateli regaty, u které ses přihlašoval — kontakt je na jeho stránce.
          </>
        )}
      </p>
      <p className="poznamka">
        Tlačítko na to zatím není, vyřizuje se to ručně. Kontakty se navíc mažou samy
        (viz výš), takže nejčastější žádost vyřídí čas. <Link href="/">Zpátky na ročníky</Link>.
      </p>
    </Boky>
  );
}

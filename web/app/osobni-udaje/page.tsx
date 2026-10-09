import Link from "next/link";
import { Boky } from "@/app/boky";
import { KONTAKT_UDAJE } from "@/lib/kontakt";

export const metadata = {
  title: "Osobní údaje",
  description:
    "Co o lidech Orlický pohár sbírá, proč, jak dlouho to drží a kam napsat, když to má zmizet.",
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

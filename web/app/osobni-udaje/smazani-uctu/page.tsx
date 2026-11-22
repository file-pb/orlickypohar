import Link from "next/link";
import { Boky } from "@/app/boky";
import { KONTAKT_UDAJE } from "@/lib/kontakt";

export const metadata = {
  title: "Smazání účtu",
  description:
    "Jak požádat o smazání účtu a dat aplikace Orlická série — co zmizí hned, co zůstane a proč.",
};

/**
 * Stránka o smazání účtu.
 *
 * <b>Vznikla kvůli Google Play</b> (22. 11. 2026). Deklarace *Zabezpečení
 * údajů* se ptá, jestli aplikace umožňuje vytvoření účtu; u nás ano —
 * přihlášení vede na `ucty.klihovka.cz`, kde se dá i registrovat. Jakmile
 * to přiznáš, Play žádá **adresu, kde se dá o smazání účtu požádat i bez
 * nainstalované aplikace**, a ta adresa musí podle formuláře splnit troje:
 * odkazovat na název aplikace nebo vývojáře z obchodu, popsat postup,
 * a vyjmenovat, co se smaže a co se uchová a jak dlouho.
 *
 * Proto je to samostatná stránka a ne odstavec v zásadách: do obchodu se
 * vkládá jedna adresa a ta má vést přímo sem.
 *
 * <b>Postup je ruční a stránka to říká nahlas.</b> Tlačítko „smazat účet"
 * v appce není a úloha, která by trasy uklízela, taky ne — úklid existuje
 * pro kontakty, fotky, upozornění, přejaté a vodočet, pro trasy ne.
 * Slibovat automat, který neexistuje, by bylo horší než přiznat e-mail.
 */
export default function SmazaniUctu() {
  return (
    <Boky>
      <h1>Smazání účtu</h1>
      <p className="podtitulek">
        Týká se účtu v aplikaci <b>Orlická série</b> a na webu Orlického poháru.
        Je to jeden účet pro obojí.
      </p>

      <h2>Jak o smazání požádat</h2>
      {KONTAKT_UDAJE ? (
        <p>
          Napiš na <a href={`mailto:${KONTAKT_UDAJE}`}>{KONTAKT_UDAJE}</a> z adresy,
          kterou máš u účtu, a napiš, že chceš účet smazat. Odpovíme a vyřídíme to
          do třiceti dnů. Jestli chceš smazat jen část údajů — třeba zaznamenané
          trasy — a účet nechat, napiš to tam; jde to.
        </p>
      ) : (
        <p>
          Napiš pořadateli regaty, u které ses přihlašoval — kontakt je na jeho
          stránce. Vyřídíme to do třiceti dnů.
        </p>
      )}
      <p className="poznamka">
        Tlačítko v aplikaci na to zatím není, vyřizuje se to ručně. Je nás na
        tenhle web pár a žádost o výmaz přijde jednou za čas.
      </p>

      <h2>Co se smaže</h2>
      <ul>
        <li>
          <b>Účet a přihlášení.</b> Ruší se u poskytovatele identity na{" "}
          <code>ucty.klihovka.cz</code>, kde vznikl. S ním zmizí i vazba na tvoje
          oprávnění ve správě ročníku.
        </li>
        <li>
          <b>Jméno a e-mail</b>, které jsme od poskytovatele identity dostali při
          přihlášení.
        </li>
        <li>
          <b>Kontakty z přihlášek</b> — e-mail a telefon, které jsi napsal, když
          jsi hlásil loď na regatu.
        </li>
        <li>
          <b>Zaznamenané trasy</b> tvé lodi, pokud o to požádáš. Nemažou se samy
          a tlačítko na ně není, ale na požádání je smažeme.
        </li>
      </ul>

      <h2>Co zůstane a proč</h2>
      <ul>
        <li>
          <b>Sportovní výsledky.</b> Jméno lodi, kategorie, kormidelník a umístění
          v závodě zůstávají zveřejněné i po smazání účtu. Seriál má smysl jen
          tehdy, když je po letech vidět, kdo kdy vyhrál — a výsledek regaty není
          údaj, který by někomu patřil.
        </li>
        <li>
          <b>Fotky,</b> které k článkům a lodím nahrál pořadatel. Když na nějaké
          jsi a nechceš tam být, napiš a odebereme ji.
        </li>
      </ul>
      <p>
        Kontakty u přihlášek se navíc <b>mažou samy</b> do konce následující
        sezóny — co jsi napsal v roce 2026, zmizí 1. ledna 2028, i kdybys o nic
        nežádal. Podrobnosti jsou v{" "}
        <Link href="/osobni-udaje">zásadách o osobních údajích</Link>.
      </p>
    </Boky>
  );
}

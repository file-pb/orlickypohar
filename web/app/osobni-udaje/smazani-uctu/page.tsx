import Link from "next/link";
import { Boky } from "@/app/boky";
import { KONTAKT_UDAJE } from "@/lib/kontakt";
import { nactiJa } from "@/lib/ja";
import { SLOVO } from "@/lib/ucet";
import { smazUcetAkce } from "./akce";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Smazání účtu",
  description:
    "Jak si smazat účet a data aplikace Orlická série — co zmizí hned, co zůstane a proč.",
};

type Parametry = { searchParams: Promise<{ chyba?: string }> };

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
 * <b>Jedna adresa, dvě podoby.</b> Nepřihlášenému vysvětlí, co se stane,
 * a pošle ho se přihlásit; přihlášenému nabídne tlačítko. Rozdělit to na
 * dvě stránky nejde: v obchodě je vložená jedna adresa a ta musí vést
 * i tomu, kdo appku nemá a přihlášený není.
 *
 * <b>Postup byl do 22. 11. 2026 ruční</b> — stránka posílala člověka napsat
 * e-mail a slibovala vyřízení do třiceti dnů. Slib, který drží jeden člověk
 * a jedna poštovní adresa, poruší první žádost, která přijde v době, kdy se
 * nikdo nedívá do pošty. E-mail tu zůstal jen pro toho, kdo se **nemůže
 * přihlásit** — tam samoobsluha z principu nejde.
 */
export default async function SmazaniUctu({ searchParams }: Parametry) {
  const { chyba } = await searchParams;
  const { ja } = await nactiJa();

  return (
    <Boky>
      <h1>Smazání účtu</h1>
      <p className="podtitulek">
        Týká se účtu v aplikaci <b>Orlická série</b> a na webu Orlického poháru.
        Je to jeden účet pro obojí.
      </p>

      <h2>Jak účet smazat</h2>
      {ja ? (
        <>
          <p>
            Jsi přihlášený jako <b>{ja.zobrazovane}</b>
            {ja.email && <> ({ja.email})</>}. Tlačítko níž smaže účet{" "}
            <b>hned a nevratně</b> — žádná žádost, žádné čekání na odpověď.
          </p>
          {/* Formulář, ne odkaz. Nevratná věc se nesmí dát vyvolat pouhou
              návštěvou adresy — přednačtením, náhledem odkazu nebo firemní
              kontrolou, která si stránky prochází sama. Tentýž důvod, kvůli
              kterému je POST i odhlášení. */}
          <form action={smazUcetAkce} className="smazani">
            <label htmlFor="potvrzeni">
              Opiš slovo <b>{SLOVO}</b> a potvrď:
            </label>
            <input
              id="potvrzeni"
              name="potvrzeni"
              type="text"
              autoComplete="off"
              spellCheck={false}
              required
              aria-describedby={chyba ? "chyba-potvrzeni" : undefined}
            />
            <button type="submit">Smazat účet</button>
          </form>
          {chyba && (
            <p className="chyba" id="chyba-potvrzeni" role="alert">
              {chyba}
            </p>
          )}
        </>
      ) : (
        <>
          <p>
            Účet si smažeš sám — <Link href="/prihlaseni?kam=/osobni-udaje/smazani-uctu">
            přihlas se
            </Link>{" "}
            a tlačítko bude na téhle stránce. Nic se neposílá e-mailem a na nic
            se nečeká.
          </p>
          <p className="poznamka">
            {KONTAKT_UDAJE ? (
              <>
                Když se přihlásit nemůžeš — ztracený přístup k účtu na{" "}
                <code>ucty.klihovka.cz</code> —, napiš na{" "}
                <a href={`mailto:${KONTAKT_UDAJE}`}>{KONTAKT_UDAJE}</a> z adresy,
                kterou máš u účtu. Tahle jedna cesta zůstává ruční a vyřídíme ji
                do třiceti dnů.
              </>
            ) : (
              <>
                Když se přihlásit nemůžeš, napiš pořadateli regaty, u které ses
                přihlašoval — kontakt je na jeho stránce. Tahle jedna cesta
                zůstává ruční a vyřídíme ji do třiceti dnů.
              </>
            )}
          </p>
        </>
      )}

      <h2>Co se smaže</h2>
      <ul>
        <li>
          <b>Účet a přihlášení.</b> Ruší se i u poskytovatele identity na{" "}
          <code>ucty.klihovka.cz</code>, kde vznikl — tlačítko to udělá za tebe,
          nemusíš nikam dál. Přihlášení přestane platit okamžitě: sezení i
          vydané tokeny padnou.
        </li>
        <li>
          <b>Jméno a e-mail</b>, které jsme od poskytovatele identity dostali
          při přihlášení.
        </li>
        <li>
          <b>Oprávnění ve správě</b> ročníku nebo zastávky, pokud jsi je měl.
        </li>
        <li>
          <b>Vazby k lodím</b> — že jsi majitel, kapitán, posádka nebo fanoušek
          — i žádosti o připojení, které jsi podal.
        </li>
        <li>
          <b>Kontakty z přihlášek</b> — e-mail a telefon, které jsi napsal, když
          jsi hlásil loď na regatu.
        </li>
      </ul>
      <p>
        Co přesně ubylo, vypíšeme hned po smazání. Je to účtenka, ne jen
        „hotovo“: u nevratné věci má být vidět, co se stalo.
      </p>

      <h2>Co zůstane a proč</h2>
      <ul>
        <li>
          <b>Sportovní výsledky.</b> Jméno lodi, kategorie, kormidelník a
          umístění v závodě zůstávají zveřejněné i po smazání účtu. Seriál má
          smysl jen tehdy, když je po letech vidět, kdo kdy vyhrál — a výsledek
          regaty není údaj, který by někomu patřil.
        </li>
        <li>
          <b>Bezejmenný záznam v závodní historii.</b> U věcí, které někdo
          udělal — postavená trať, vyvěšená plachetní směrnice, zápis dojezdů,
          vyhlášené pořadí — zůstane po tvém účtu řádek s označením „smazaný
          účet“. <b>Nenese jméno ani e-mail</b>, takže z něj není co vyčíst;
          je tam proto, aby se závodní historie nerozpadla. Smazat ho by
          znamenalo smazat tu trať a ten zápis s ním.
        </li>
        <li>
          <b>Zaznamenané trasy</b> lodi, na které jsi jezdil. <b>Patří lodi,
          ne člověku</b> — nahrávají se mobilním klíčem, který dal kapitán
          posádce, a jsou podkladem k protestu a k zápisu dojezdu pro celou
          posádku. Nemažou se tedy s účtem, ale <b>samy do konce následující
          sezóny</b>: záznam z roku 2026 zmizí 1. ledna 2028.
        </li>
        <li>
          <b>Fotky,</b> které k článkům a lodím nahrál pořadatel. Když na nějaké
          jsi a nechceš tam být, napiš a odebereme ji.
        </li>
      </ul>
      <p>
        Kontakty u přihlášek se <b>mažou samy</b> do konce následující sezóny,
        i kdyby sis účet nemazal — co jsi napsal v roce 2026, zmizí 1. ledna
        2028. Podrobnosti jsou v{" "}
        <Link href="/osobni-udaje">zásadách o osobních údajích</Link>.
      </p>
    </Boky>
  );
}

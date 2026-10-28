import Link from "@/app/sprava/odkaz";
import { Drobecky, drobeckySpravy } from "@/app/drobecky";
import { Vypadek } from "@/app/vypadek";
import { okamzik } from "@/app/datum";
import { NAZVY_STAVU, nactiSady, type SadaShrnuti } from "@/lib/oponentura";

// Odpověď závisí na tom, kdo se ptá. Statická být nesmí ani omylem.
export const dynamic = "force-dynamic";

export const metadata = { title: "Otázky k aplikaci — správa" };

type Parametry = { params: Promise<{ serie: string }> };

/**
 * Seznam sad otázek pro oponenturu.
 *
 * <b>Proč to vzniklo.</b> Oponentura s hlavním rozhodčím jede přes
 * WhatsApp: on posílá hlasové nahrávky, Filip je přepisuje do dokumentů.
 * Nikdo přitom nevidí, na co se ještě neodpovědělo — a právě to je na téhle
 * obrazovce: u každé sady stav, kolik z kolika otázek má odpověď a kdy
 * přišla ta poslední. Podle toho se pozná, co poslat znovu.
 *
 * Celé serverové a bez javascriptu, jako zbytek administrace. Javascript
 * má jen nahrávání hlasu v detailu sady, protože mikrofon jinak nejde.
 */
export default async function SadyOtazek({ params }: Parametry) {
  const { serie } = await params;
  const { stav, data: sady } = await nactiSady(serie);

  return (
    <>
      <Drobecky cesta={drobeckySpravy(serie, [{ text: "Otázky k aplikaci" }])} />
      <h1>Otázky k aplikaci</h1>
      <p className="podtitulek">
        Sady otázek z oponentury. Odpovídá rozhodčí, čte i pořadatel.
      </p>

      {stav === "neprihlasen" || stav === "odmitnut" ? (
        <p className="prazdno">
          Na otázky se musíš <Link href="/prihlaseni">přihlásit</Link>.
        </p>
      ) : stav === "nesmi" ? (
        <p className="prazdno">
          Otázky k aplikaci vidí rozhodčí nebo pořadatel ročníku —{" "}
          <Link href="/napoveda#role">co která role smí</Link>.
        </p>
      ) : stav === "neni" ? (
        <p className="prazdno">Tenhle ročník neexistuje.</p>
      ) : sady === undefined ? (
        <Vypadek />
      ) : sady.length === 0 ? (
        <p className="prazdno">
          V tomhle ročníku žádná sada otázek není. Zakládají se přes API
          (<code>POST /sprava/serie/…/oponentura</code>) — jsou to data, takže
          další sada nepotřebuje nasazení.
        </p>
      ) : (
        <ul className="seznam sady-otazek">
          {sady.map((s) => (
            <li key={s.slug}>
              <Radek serie={serie} sada={s} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Jedna sada v seznamu.
 *
 * <b>Stav je napsaný slovy, ne jen barvou.</b> Je to první věc, kterou
 * Filip na obrazovce hledá, a barva sama o sobě neřekne „tři z devíti".
 */
function Radek({ serie, sada }: { serie: string; sada: SadaShrnuti }) {
  const kam = `/sprava/${encodeURIComponent(serie)}/oponentura/${encodeURIComponent(sada.slug)}`;

  return (
    <div className="karta sada-otazek-karta">
      <h2>
        <Link href={kam}>{sada.nazev}</Link>
      </h2>
      <p className="poznamka">{sada.uvod}</p>

      <p className={`sada-stav sada-stav-${sada.stav.toLowerCase()}`}>
        <strong>{NAZVY_STAVU[sada.stav]}</strong>
        {sada.stav === "Odpovezeno" && sada.dokonceneV
          ? ` — ${okamzik(sada.dokonceneV)}`
          : sada.stav === "Rozpracovano"
            ? ` — ${sada.odpovezeno} z ${sada.pocetOtazek}`
            : ""}
      </p>

      <p className="poznamka">
        {sada.pocetOtazek} {otazek(sada.pocetOtazek)}
        {sada.pocetNahravek > 0
          ? `, ${sada.pocetNahravek} ${nahravek(sada.pocetNahravek)}`
          : ""}
        {sada.zmenenoV ? `. Poslední odpověď ${okamzik(sada.zmenenoV)}` : ""}
      </p>
    </div>
  );
}

const otazek = (kolik: number) =>
  kolik === 1 ? "otázka" : kolik < 5 ? "otázky" : "otázek";

const nahravek = (kolik: number) =>
  kolik === 1 ? "nahrávka" : kolik < 5 ? "nahrávky" : "nahrávek";

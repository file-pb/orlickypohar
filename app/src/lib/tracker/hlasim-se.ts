/**
 * Režim „hlásím se" — slepý tracking od klubovny (nález R3).
 *
 * <b>Posádka klepne naposledy na břehu.</b> Filip, 28. 10. 2026: *„my
 * potřebujeme ale aby to nemuseli posádky zapínat manuálně na vodě. Zápis
 * v klubovně, pak se mu nastaví a zkontroluje tracking (klidně slepý, ale tak
 * abychom věděli že běží a stav baterie a hlavně pak už na to nemusí posádky
 * sahat). Rozprava udá čas startu a pak už se samo začne trekovat až bude ta
 * chvíle."*
 *
 * Den tedy vypadá takhle:
 *
 * | Kdy | Kdo | Co |
 * |---|---|---|
 * | zápis v klubovně | pořadatel s posádkou | zapne hlášení a vidí, že běží |
 * | rozprava | rozhodčí | udá čas startu |
 * | **T−20** | nikdo | telefon **sám** přepne na nahrávání |
 *
 * <b>Přepnutí není povel ze serveru, nýbrž stažený čas.</b> Na vodě signál
 * padá, a kdyby přepnutí chodilo jako povel, loď bez signálu by nezačala
 * nahrávat vůbec — tedy právě ta, u které je stopa nejpotřebnější. Server
 * proto posílá `nahravatOd` a telefon se jím řídí sám; změna od rozhodčího se
 * projeví, až signál chytí. Tentýž vzorec mají okna závodních dnů.
 *
 * <b>Proč se slepě drží odběr polohy.</b> Jinak by se telefon neprobouzel a
 * v T−20 by nebylo co by si čas přečetlo. Souřadnice se v tomhle režimu
 * zahazují: na server nejde ani jedna, dokud čas nenadejde (viz `uloha.ts`).
 * Je to tedy opravdu „slepý" tracking v Filipově smyslu — běží, aby se vědělo,
 * že běží, a aby se vědělo o baterii.
 *
 * <b>Stav je na disku, ne v paměti</b>, ze stejného důvodu jako celý
 * `tracker/`: úloha na pozadí se probouzí v novém JS kontextu, kde paměť
 * předchozího běhu neexistuje.
 */
import { ozviSe } from '../api';
import { baterieProcent, obnovBaterii } from './baterie';
import { databaze } from './db';
import { zalozZaznam } from './zaznam';

/**
 * Jak často telefon tluče na server.
 *
 * Pět minut, ne minuta: hlášení nenese polohu, takže nemá komu posloužit
 * častěji — pořadatel se dívá, *jestli* se telefon ozval a kolik má procent,
 * a to se za pět minut nezmění. Rádio je zároveň to, co žere baterku
 * (`nahravani.ts`), a tohle má běžet celé dopoledne před startem.
 *
 * Má to i druhou funkci: je to <b>mez, jak pozdě se telefon dozví o čase
 * startu</b>, který rozhodčí zapsal po rozpravě. Pět minut proti dvaceti,
 * které režim má na přepnutí, je dost rezervy.
 */
export const JAK_CASTO_MS = 5 * 60_000;

export type Hlasim = {
  /** Zapnuto v klubovně. Dokud ne, tenhle režim neexistuje. */
  zapnuto: boolean;
  /** Pro jakou loď se v T−20 založí záznam. */
  lod: string | null;
  regata: string | null;
  /** Stažený čas T−20 v ms, nebo `null`, dokud rozprava nedala čas startu. */
  nahravatOd: number | null;
  /** Kdy se telefon naposledy ozval. 0 znamená „ještě nikdy". */
  posledniHlaseni: number;
};

const PRAZDNO: Hlasim = {
  zapnuto: false, lod: null, regata: null, nahravatOd: null, posledniHlaseni: 0,
};

export function hlasim(): Hlasim {
  const r = databaze().getFirstSync<{
    zapnuto: number;
    lod: string | null;
    regata: string | null;
    nahravat_od: number | null;
    posledni_hlaseni: number;
  }>('SELECT * FROM hlaseni WHERE id = 1');

  if (!r) return PRAZDNO;
  return {
    zapnuto: r.zapnuto === 1,
    lod: r.lod,
    regata: r.regata,
    nahravatOd: r.nahravat_od,
    posledniHlaseni: r.posledni_hlaseni,
  };
}

/**
 * Zapne hlášení. <b>Stažený čas se přitom zahodí</b>: je to jiná regata nebo
 * jiný den, a starý čas by znamenal telefon, který se rozjede sám podle
 * včerejška.
 */
export function zapniHlaseni(vstup: { lod: string; regata: string | null }) {
  databaze().runSync(
    `INSERT INTO hlaseni (id, zapnuto, lod, regata, nahravat_od, posledni_hlaseni)
     VALUES (1, 1, $lod, $regata, NULL, 0)
     ON CONFLICT(id) DO UPDATE SET
       zapnuto = 1, lod = $lod, regata = $regata, nahravat_od = NULL, posledni_hlaseni = 0`,
    { $lod: vstup.lod, $regata: vstup.regata },
  );
}

/**
 * Vypne hlášení. <b>Záznam, který už běží, to neukončí</b> — ten patří
 * posádce a ukončuje se v cíli; tohle jen zruší slepé čekání na T−20.
 */
export function vypniHlaseni() {
  databaze().runSync(
    `INSERT INTO hlaseni (id, zapnuto, lod, regata, nahravat_od, posledni_hlaseni)
     VALUES (1, 0, NULL, NULL, NULL, 0)
     ON CONFLICT(id) DO UPDATE SET zapnuto = 0, nahravat_od = NULL`,
  );
}

/** Zapíše, co server odpověděl, a kdy se to ptalo. */
export function zapisStazeny(nahravatOd: number | null, kdy: number) {
  databaze().runSync(
    'UPDATE hlaseni SET nahravat_od = $od, posledni_hlaseni = $kdy WHERE id = 1',
    { $od: nahravatOd, $kdy: kdy },
  );
}

/**
 * <b>Nadešel čas nahrávat?</b> Čistá funkce, aby se dala vyzkoušet bez
 * telefonu i bez serveru (`app/testy/hlasim-se.test.ts`).
 *
 * Bez stáhnutého času se nenahrává: rozprava ještě nedala čas startu, takže
 * není proti čemu měřit. Horní mez tu není — stejně jako na serveru
 * (`Klice.Hlaseni`): rozjížďka, která se vleče, je přesně ta, u které je
 * stopa nejpotřebnější.
 */
export function maSeNahravat(h: Hlasim, ted: number): boolean {
  return h.zapnuto && h.nahravatOd !== null && ted >= h.nahravatOd;
}

/**
 * <b>Je čas se ozvat?</b> Taky čistě, ze stejného důvodu.
 *
 * Nulové `posledniHlaseni` znamená „ještě nikdy" — a to je `true`, protože
 * první hlášení musí odejít hned, jak pořadatel režim zapne. Na tom stojí
 * celá kontrola v klubovně: *„zapnul jsem to, vidíš to?"*
 */
export function jeCasSeOzvat(h: Hlasim, ted: number): boolean {
  return h.zapnuto && ted - h.posledniHlaseni >= JAK_CASTO_MS;
}

/**
 * Ozve se serveru a zapíše, co přišlo zpátky.
 *
 * <b>Chyba se spolkne.</b> Hlášení je doplněk, ne důvod, proč by měla úloha
 * na pozadí skončit — a výjimka v jejím handleru znamená, že systém úlohu
 * odregistruje a telefon přestane dělat i to ostatní. Co se nedoneslo, se
 * zkusí za pět minut; stažený čas z minula zůstává platný, protože celý
 * smysl režimu je, že funguje i bez signálu.
 *
 * Vrací, co po tomhle hlášení platí — volající podle toho hned pozná, jestli
 * se má začít nahrávat, bez druhého čtení z disku.
 */
export async function ozviSeAsync(ted: number = Date.now()): Promise<Hlasim> {
  const pred = hlasim();
  if (!jeCasSeOzvat(pred, ted)) return pred;

  try {
    const odpoved = await ozviSe(baterieProcent());
    // `null` je „nemám klíč" nebo chyba sítě; čas pokusu se zapisuje tak jako
    // tak, jinak by telefon tloukl na server každé probuzení.
    const od = odpoved?.nahravatOd ? Date.parse(odpoved.nahravatOd) : null;
    zapisStazeny(Number.isFinite(od) ? od : null, ted);
  } catch {
    zapisStazeny(pred.nahravatOd, ted);
  }

  // Až za hlášením, aby čtení baterie neposunulo zápis za `await`. Viz
  // `baterie.ts`.
  obnovBaterii();
  return hlasim();
}

/**
 * <b>Překlopení z „hlásím se" na „nahrávám"</b>, synchronně.
 *
 * Synchronně schválně: volá to handler úlohy na pozadí, který musí mít
 * hotový zápis před prvním `await` — zabitý proces `await` nedokončí (viz
 * `uloha.ts` a `db.ts`). Založení záznamu je ten zápis.
 *
 * <b>Režim se tím vypne.</b> Jinak by čas platil dál, a kdyby posádka záznam
 * po dojezdu ukončila, telefon by si do pěti sekund založil nový — tedy by
 * nahrával místo rozjížďky zpáteční cestu k molu.
 *
 * Vrací id nového záznamu, nebo `null`, když čas ještě nenadešel.
 */
export function zacniKdyzJeCas(ted: number = Date.now()): string | null {
  const h = hlasim();
  if (!maSeNahravat(h, ted) || !h.lod) return null;

  const id = zalozZaznam({ lod: h.lod, regata: h.regata, zdroj: 'gps' });
  vypniHlaseni();
  return id;
}

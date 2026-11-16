/**
 * Přečtení polohy z toho, co člověk má po ruce.
 *
 * <b>Proč to je</b> (Filip, 9. 10. 2026): bóji zapíše někdo u počítače za
 * stavitele, který pípat neumí, nebo ji rozhodčí dostane po telefonu od
 * člověka mimo proces — *„ukotvi mi to tam a pošli mi odkaz v mapě"*.
 * Z mobilu se pípá dál polohou z GPS; tohle je cesta pro nestandardní
 * případ.
 *
 * <b>Jedno pole na všechno.</b> Kdo odkaz dostal, neví, jestli má
 * „souřadnice" nebo „adresu z Mapy.com" — a ptát se ho na to je práce
 * navíc, kterou umí udělat kód.
 *
 * <b>Co se nedá splést:</b> v Česku je šířka 48,5–51,1 a délka
 * 12,0–18,9, a ty dva intervaly se nepřekrývají — dvojice čísel se proto
 * přiřadí jednoznačně i tam, kde zdroj pořadí neříká. Mapy.com dávají
 * v `id` **délku první**, Google ve `/maps/search/` **šířku** — bez téhle
 * kontroly by se prohození nepoznalo. Proč zrovna Česko, a ne přehrada,
 * stojí v `hranice.ts`.
 */

export { SIRKA_OD, SIRKA_DO, DELKA_OD, DELKA_DO, vCesku } from "./hranice.ts";
import { vCesku } from "./hranice.ts";

export type Poloha = { sirka: number; delka: number };

/** Tatáž věta jako v API u polohy z mapy (`Pipnuti.ProcNejde`). */
export const MIMO_CESKO =
  "Tahle poloha není v Česku. Zkontroluj, že se v odkazu neprohodila šířka s délkou.";

/** Co se z textu povedlo přečíst, nebo proč ne. */
export type Cteni =
  | { stav: "poloha"; poloha: Poloha; jak: string }
  | { stav: "zkratka"; adresa: string }
  | { stav: "nic"; duvod: string };

/**
 * Dvojice čísel bez udaného pořadí. Vrací tu kombinaci, která leží
 * v Česku — a když ani jedna, nevrací nic: bod odjinud je skoro jistě
 * překlep a API by ho stejně odmítlo.
 *
 * <b>Stojí to na tom, že se rozsah šířky a délky nepřekrývá</b>, takže
 * nanejvýš jedna z obou kombinací projde. Viz `hranice.ts`.
 */
function podleCeska(a: number, b: number): Poloha | null {
  if (vCesku(a, b)) return { sirka: a, delka: b };
  if (vCesku(b, a)) return { sirka: b, delka: a };
  return null;
}

/** `49°29'44.6"N` → 49.49572. Vrací `null`, když to není stupňový zápis. */
function zeStupnu(text: string): { hodnota: number; smer: string } | null {
  const m = /^\s*(\d+)\s*°\s*(?:(\d+(?:[.,]\d+)?)\s*['′]\s*)?(?:(\d+(?:[.,]\d+)?)\s*["″]\s*)?([NSEWnsew])?\s*$/
    .exec(text);
  if (!m) return null;

  const [, stupne, minuty, vteriny, smer] = m;
  const cislo = (s?: string) => (s ? Number(s.replace(",", ".")) : 0);
  const hodnota = Number(stupne) + cislo(minuty) / 60 + cislo(vteriny) / 3600;

  return Number.isFinite(hodnota) ? { hodnota, smer: (smer ?? "").toUpperCase() } : null;
}

/** `49.4957253N` nebo `49,4957253` → číslo a případná světová strana. */
function cisloSeSmerem(text: string): { hodnota: number; smer: string } | null {
  const vStupnich = zeStupnu(text);
  if (vStupnich) return vStupnich;

  const m = /^\s*([NSEWnsew])?\s*(-?\d+(?:[.,]\d+)?)\s*°?\s*([NSEWnsew])?\s*$/.exec(text);
  if (!m) return null;

  const hodnota = Number(m[2].replace(",", "."));
  if (!Number.isFinite(hodnota)) return null;

  return { hodnota, smer: (m[1] ?? m[3] ?? "").toUpperCase() };
}

/**
 * Holá dvojice souřadnic z textu — s N/E i bez nich, desetinně i ve
 * stupních. Oddělovač je čárka nebo mezera.
 */
function zDvojice(text: string): Poloha | "mimoCesko" | null {
  const kusy = text.includes(",") && !/^\s*-?\d+[.,]\d+\s+-?\d+[.,]\d+\s*$/.test(text)
    ? text.split(",")
    : text.trim().split(/\s+/);

  // Dvojice „49,4957 14,1841" s desetinnou čárkou se rozpadne na čtyři kusy.
  const spojene = kusy.length === 4 && kusy.every((k) => /^\s*-?\d+\s*$/.test(k) === false)
    ? [`${kusy[0]}.${kusy[1]}`, `${kusy[2]}.${kusy[3]}`]
    : kusy;
  if (spojene.length !== 2) return null;

  const prvni = cisloSeSmerem(spojene[0]);
  const druhy = cisloSeSmerem(spojene[1]);
  if (!prvni || !druhy) return null;

  // Odsud dál jsou to dvě čísla. Když neleží v Česku, není to nečitelný
  // vstup, ale špatné místo — a to se musí říct jinak, jinak člověk hledá
  // překlep v zápisu, který je v pořádku.

  // Když světové strany přišly, platí ony; jinak rozhodne poloha v Česku.
  const sirka = [prvni, druhy].find((c) => c.smer === "N" || c.smer === "S");
  const delka = [prvni, druhy].find((c) => c.smer === "E" || c.smer === "W");
  if (sirka && delka && sirka !== delka) {
    const s = sirka.smer === "S" ? -sirka.hodnota : sirka.hodnota;
    const d = delka.smer === "W" ? -delka.hodnota : delka.hodnota;
    return vCesku(s, d) ? { sirka: s, delka: d } : "mimoCesko";
  }

  return podleCeska(prvni.hodnota, druhy.hodnota) ?? "mimoCesko";
}

/** Hostitelé, jejichž zkratku umíme rozbalit. Nic jiného se nestahuje. */
const ZKRATKY = ["mapy.com", "mapy.cz", "maps.app.goo.gl", "goo.gl"];

export function jeZkratka(adresa: URL): boolean {
  const host = adresa.hostname.replace(/^www\./, "");
  if (!ZKRATKY.includes(host)) return false;

  // U Mapy.com je zkratka jen `/s/…`; plná adresa souřadnice nese sama.
  if (host === "mapy.com" || host === "mapy.cz") return adresa.pathname.startsWith("/s/");
  return true;
}

/** Souřadnice z adresy mapy, nebo `null`. */
function zAdresy(adresa: URL): { poloha: Poloha; jak: string } | null {
  const host = adresa.hostname.replace(/^www\./, "");
  const dotaz = adresa.searchParams;

  // Mapy.com: `id` je ten bod a má DÉLKU PRVNÍ. `x`/`y` je jen střed mapy,
  // takže se bere, až když `id` není — jinak by se bóje postavila o kus vedle.
  if (host === "mapy.com" || host === "mapy.cz") {
    const id = dotaz.get("id");
    if (id) {
      const [delka, sirka] = id.split(",").map((c) => Number(c));
      if (Number.isFinite(sirka) && Number.isFinite(delka) && vCesku(sirka, delka))
        return { poloha: { sirka, delka }, jak: "bod z Mapy.com" };
    }

    const x = Number(dotaz.get("x"));
    const y = Number(dotaz.get("y"));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const poloha = podleCeska(y, x);
      if (poloha) return { poloha, jak: "střed mapy z Mapy.com — ne bod, zkontroluj ho" };
    }
  }

  // Google: `/maps/search/49.49,+14.18`, `@49.49,14.18,17z`, `?q=…`, `!3d…!4d…`
  // Shoda s tečkou, ne `endsWith("google.com")`: tomu odpovídá i
  // `evilgoogle.com`, a čísla z cizí adresy by se pak četla jako od
  // Googlu. Ostatní testy v souboru porovnávají hostitele přesně.
  // (CodeQL `js/incomplete-url-substring-sanitization`, 14. 11. 2026.)
  if (host === "google.com" || host.endsWith(".google.com") || host === "maps.app.goo.gl") {
    const cely = adresa.href;
    const vzory: [RegExp, string][] = [
      [/\/maps\/search\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/, "bod z Google Maps"],
      [/[@](-?\d+\.\d+),(-?\d+\.\d+)/, "střed mapy z Google Maps — ne bod, zkontroluj ho"],
      [/[?&](?:q|ll|daddr)=(-?\d+\.\d+),\+?(-?\d+\.\d+)/, "bod z Google Maps"],
      [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, "bod z Google Maps"],
    ];
    for (const [vzor, jak] of vzory) {
      const m = vzor.exec(cely);
      if (!m) continue;
      const poloha = podleCeska(Number(m[1]), Number(m[2]));
      if (poloha) return { poloha, jak };
    }
  }

  // Zbytek: jakákoliv adresa může nést dvojici v parametru.
  for (const klic of ["q", "ll", "coords", "point"]) {
    const hodnota = dotaz.get(klic);
    const poloha = hodnota ? zDvojice(hodnota) : null;
    if (poloha && poloha !== "mimoCesko") return { poloha, jak: "souřadnice z adresy" };
  }

  return null;
}

/**
 * Hlavní čtení. <b>Nestahuje nic</b> — zkratku jen pozná a pojmenuje;
 * rozbalit ji musí server (`rozbalZkratku` v akci obrazovky), protože
 * prohlížeč na cizí doménu nedosáhne a stahovat cizí adresu z klienta
 * by znamenalo prozradit mu, co člověk zrovna dělá.
 */
export function precti(vstup: string): Cteni {
  // Lidi kopírují i s obalem: „(49.49, 14.18)", „GPS: …", uvozovky.
  // Odmítnout to kvůli závorce by byla buzerace.
  const text = vstup
    .trim()
    .replace(/^(?:gps|poloha|souřadnice|loc|location)\s*[:=]\s*/i, "")
    .replace(/^[([{"\u201e'<]+/, "")
    .replace(/[)\]}"\u201c'>.,;]+$/, "")
    .trim();
  if (!text) return { stav: "nic", duvod: "Vlož souřadnice nebo odkaz z mapy." };

  const adresa = jakoAdresa(text);
  if (adresa) {
    if (jeZkratka(adresa)) return { stav: "zkratka", adresa: adresa.href };

    const nalezeno = zAdresy(adresa);
    if (nalezeno) return { stav: "poloha", poloha: nalezeno.poloha, jak: nalezeno.jak };

    return {
      stav: "nic",
      duvod:
        "Z tohohle odkazu se poloha vyčíst nedá. Zkus v mapě „sdílet“ a poslat " +
        "odkaz na bod, nebo sem vlož rovnou souřadnice.",
    };
  }

  const poloha = zDvojice(text);
  if (poloha === "mimoCesko") return { stav: "nic", duvod: MIMO_CESKO };
  if (poloha) return { stav: "poloha", poloha, jak: "zadané souřadnice" };

  return {
    stav: "nic",
    duvod:
      "Tohle nevypadá na souřadnice ani na odkaz z mapy. Čekám třeba " +
      "„49.4957N, 14.1841E“ nebo adresu z Mapy.com či Google Maps.",
  };
}

/** Text jako adresa, i když mu chybí `https://`. Jiná schémata ne. */
function jakoAdresa(text: string): URL | null {
  const sSchematem = /^[a-z]+:\/\//i.test(text) ? text : `https://${text}`;
  if (!/^https?:\/\/\S+\.\S+/i.test(sSchematem)) return null;

  try {
    const adresa = new URL(sSchematem);
    return adresa.protocol === "http:" || adresa.protocol === "https:" ? adresa : null;
  } catch {
    return null;
  }
}

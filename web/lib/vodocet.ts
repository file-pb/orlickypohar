import type { components } from "./schema";

/**
 * Stav nádrže Orlík z API. Data sbírá API každých deset minut z portálu
 * Povodí Vltavy a z nich počítá přítok a odtok za posledních 24 h
 * (`Features/Vodocet`). Web dřív četl stránku Povodí sám; přítok za den
 * ale z jedné stránky zjistit nejde, potřebuje vlastní řadu.
 */

const API = process.env.API_URL ?? "http://localhost:8080";

export type Vodocet = components["schemas"]["VodocetDto"];
export type BodHladiny = components["schemas"]["BodHladinyDto"];

/** Nový sběr je po deseti minutách, častěji se nemá smysl ptát. */
export async function nactiOrlik(): Promise<Vodocet | null> {
  try {
    const odpoved = await fetch(`${API}/vodocet/orlik`, {
      next: { revalidate: 300 },
      headers: { accept: "application/json" },
    });
    return odpoved.ok ? ((await odpoved.json()) as Vodocet) : null;
  } catch {
    // Vodočet je doplněk. Kvůli němu nesmí spadnout stránka.
    return null;
  }
}

const minuty = (cas: string) => Date.parse(cas) / 60_000;

/**
 * Změna hladiny v centimetrech za `hodin` hodin: proti měření, které je
 * časem nejblíž okamžiku před `hodin` hodinami.
 */
export function zmenaCm(historie: BodHladiny[], hodin = 6) {
  if (historie.length < 2) return 0;
  const posledni = historie[historie.length - 1];
  const cil = minuty(posledni.cas) - hodin * 60;
  const drive = historie.reduce((nejbliz, m) =>
    Math.abs(minuty(m.cas) - cil) < Math.abs(minuty(nejbliz.cas) - cil) ? m : nejbliz,
  );
  return Math.round((posledni.hladina - drive.hladina) * 100);
}

export { minuty };

/** Čas měření, jak ho zná člověk u Orlíku: „16. 9. 23:10". */
export const casPraha = (cas: string) =>
  new Date(cas).toLocaleString("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

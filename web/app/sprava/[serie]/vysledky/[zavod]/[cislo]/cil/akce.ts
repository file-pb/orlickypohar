"use server";

import { odstartuj, ulozCil, type ZapisRadek } from "@/lib/vysledky";

/**
 * Serverové akce cílové obrazovky. Na rozdíl od zbytku správy je volá
 * javascript, ne formulář — ale token zůstává stejně na serveru: akce ho
 * vezme ze sezení a do prohlížeče se nedostane.
 *
 * Vracejí jen „povedlo se, nebo proč ne". Obrazovka drží svůj stav sama
 * a odpověď API by ho při rychlém klepání přepisovala starší verzí.
 */

const platne = (cislo: number) => Number.isInteger(cislo) && cislo > 0;

export async function ulozCilAkce(
  serie: string,
  zavod: string,
  cislo: number,
  radky: ZapisRadek[],
): Promise<{ chyba: string | null }> {
  if (!platne(cislo)) return { chyba: "Neplatné číslo rozjížďky." };

  const vysledek = await ulozCil(serie, zavod, cislo, radky);
  return { chyba: "chyba" in vysledek ? vysledek.chyba : null };
}

export async function odstartujAkce(
  serie: string,
  zavod: string,
  cislo: number,
  startV: string,
): Promise<{ chyba: string | null }> {
  if (!platne(cislo)) return { chyba: "Neplatné číslo rozjížďky." };
  if (Number.isNaN(Date.parse(startV))) return { chyba: "Neplatný čas startu." };

  const vysledek = await odstartuj(serie, zavod, cislo, startV);
  return { chyba: "chyba" in vysledek ? vysledek.chyba : null };
}

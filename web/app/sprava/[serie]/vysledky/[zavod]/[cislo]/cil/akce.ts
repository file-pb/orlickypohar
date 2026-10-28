"use server";

import { prihlas } from "@/lib/prihlasky";
import {
  konecRozjizdky,
  nastavZnak,
  odstartuj,
  procedura,
  ulozCil,
  type DruhProcedury,
  type ZapisLod,
  type ZapisRadek,
} from "@/lib/vysledky";

/**
 * Serverové akce cílové obrazovky. Na rozdíl od zbytku správy je volá
 * javascript, ne formulář — ale token zůstává stejně na serveru: akce ho
 * vezme ze sezení a do prohlížeče se nedostane.
 *
 * Vracejí jen „povedlo se, nebo proč ne". Obrazovka drží svůj stav sama
 * a odpověď API by ho při rychlém klepání přepisovala starší verzí.
 */

const platne = (cislo: number) => Number.isInteger(cislo) && cislo > 0;

/**
 * Uloží sadu i s revizí, ze které obrazovka vyšla, a vrátí novou revizi.
 *
 * <b>Konflikt se vrací zvlášť.</b> Znamená, že rozjížďku mezitím uložil
 * někdo jiný; opakovat tutéž sadu nemá smysl, dokud to člověk nerozhodne.
 */
export async function ulozCilAkce(
  serie: string,
  zavod: string,
  cislo: number,
  radky: ZapisRadek[],
  revize: number,
): Promise<{ chyba: string | null; konflikt?: boolean; revize?: number }> {
  if (!platne(cislo)) return { chyba: "Neplatné číslo rozjížďky." };

  const vysledek = await ulozCil(serie, zavod, cislo, radky, revize);

  if ("chyba" in vysledek)
    return { chyba: vysledek.chyba, konflikt: vysledek.konflikt };

  return { chyba: null, revize: vysledek.zapis.revize };
}

/**
 * Zastaví časomíru, nebo ji pustí znovu.
 *
 * <b>Proč vlastní akce a ne součást uložení:</b> zastavení času se na vodě
 * dělá dřív, než je papír dopsaný — kdyby viselo na uložení zápisu,
 * znamenalo by „zastav čas" totéž co „mám všechny lodě", a to je přesně to,
 * co Filip 20. 10. 2026 reklamoval.
 */
export async function konecAkce(
  serie: string,
  zavod: string,
  cislo: number,
  zastavit: boolean,
): Promise<{ chyba: string | null }> {
  if (!platne(cislo)) return { chyba: "Neplatné číslo rozjížďky." };

  const vysledek = await konecRozjizdky(serie, zavod, cislo, zastavit);
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

/**
 * Startovní procedura: spustit odpočet, odložit start (ZPJ 27.3), nebo
 * všeobecně odvolat (ZPJ 29.2). Nálezy R5 a R12, 28. 10. 2026.
 *
 * <b>Čas se neposílá</b> — počítá si ho server z pravidel a z délky
 * procedury regaty.
 */
export async function proceduraAkce(
  serie: string,
  zavod: string,
  cislo: number,
  druh: DruhProcedury,
): Promise<{ chyba: string | null }> {
  if (!platne(cislo)) return { chyba: "Neplatné číslo rozjížďky." };

  const vysledek = await procedura(serie, zavod, cislo, druh);
  return { chyba: "chyba" in vysledek ? vysledek.chyba : null };
}

export async function znakAkce(
  serie: string,
  zavod: string,
  prihlaskaId: number,
  znak: string,
): Promise<{ chyba: string | null }> {
  if (!Number.isInteger(prihlaskaId)) return { chyba: "Neplatná loď." };
  return { chyba: await nastavZnak(serie, zavod, prihlaskaId, znak) };
}

/**
 * Pozdní loď, která v ročníku ještě není. Přihlásí ji stávající přihláška
 * od pořadatele, takže vznikne i s majitelem jako z obrazovky přihlášek.
 * Vrací ji ve tvaru řádku zápisu, ať ji obrazovka přidá bez načtení.
 */
export async function pridejLodAkce(
  serie: string,
  zavod: string,
  lod: {
    nazev: string;
    kategorie: string;
    majitelJmeno: string;
    majitelPrijmeni: string;
    cisloPlachty: string | null;
  },
): Promise<{ chyba: string } | { lod: ZapisLod }> {
  if (!lod.nazev || !lod.kategorie) return { chyba: "Vyplň název lodi a kategorii." };

  const vysledek = await prihlas(serie, zavod, { novaLod: lod });
  if ("chyba" in vysledek) return vysledek;

  const l = vysledek.lod;
  return {
    lod: {
      prihlaskaId: l.prihlaskaId,
      lod: l.lod,
      cisloPlachty: l.cisloPlachty,
      kategorie: l.kategorie,
      poradiVCili: null,
      kod: null,
      casSekundy: null,
      dojezdV: null,
      naRegate: true,
      poznavaciZnak: null,
    },
  };
}

/**
 * Co přihlášený smí — jednou za minutu, ne jednou za obrazovku.
 *
 * <b>Proč to existuje.</b> Nabídka pod kebabem je na každé obrazovce
 * a potřebuje vědět, jestli ten člověk někde staví trať. `useData` nic
 * nedrží (`hooks/use-data.ts`), takže bez tohohle by `/ja` létalo při
 * každém přechodu — a to na vodě, kde signál není, znamená tři vteřiny
 * čekání u každého klepnutí.
 *
 * <b>Proč minuta, a ne napořád.</b> Pomocníka zaškrtává rozhodčí
 * v klubovně těsně před stavbou (časový program: zápis 9–10, rozprava
 * 10:30). Kdo měl appku otevřenou už předtím, by s trvalou pamětí
 * nabídku neuviděl, dokud ji nerestartuje — a to je přesně ten člověk,
 * kvůli kterému příznak vznikl.
 */
import { nactiJa, type Ja } from './api';

const PLATNOST_MS = 60_000;

let drzene: { kdy: number; co: Promise<Ja | null> } | null = null;

/**
 * Oprávnění přihlášeného, nejvýš minutu stará. Selhání se nedrží: bez
 * signálu by se zapamatovalo „nic nesmí" a nabídka by zůstala prázdná
 * i poté, co se připojení vrátí.
 */
export function mojeOpravneni(kdy: number = Date.now()): Promise<Ja | null> {
  if (drzene && kdy - drzene.kdy < PLATNOST_MS) return drzene.co;

  const co = nactiJa().catch((e: unknown) => {
    drzene = null;
    throw e;
  });

  drzene = { kdy, co };
  return co;
}

/** Přihlásil se nebo odhlásil někdo jiný — příště se ptej znovu. */
export function zapomenOpravneni() {
  drzene = null;
}

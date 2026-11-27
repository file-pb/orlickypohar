/**
 * Kdy smí appka sama použít novou verzi — tedy restartovat JavaScript.
 *
 * <b>Proč to existuje</b> (Filip, 27. 11. 2026: *„musí se aktualizovat
 * sama a to 100% spolehlivě"*). Nová verze se dřív použila jen při
 * studeném startu, a appka na Androidu leží v paměti klidně dny. Jenže
 * restart (`Updates.reloadAsync`, i okamžitá aktualizace z Play) znovu
 * spustí celý JavaScript a zahodí všechno, co je jen v paměti: časovače
 * startovní procedury, klakson, neuložená klepnutí v cíli, rozestavěnou
 * trať. Restart ve špatnou chvíli je na vodě horší než stará verze.
 *
 * <b>Princip: restart smí přerušit jen to, co přežije samo.</b> Zámek
 * drží ten, kdo drží křehký stav v paměti, a zámek mizí spolu s tím
 * stavem. Trvalá data (soubory, SQLite) restart nebrzdí.
 *
 * Čísla níž jsou volby, ne měření — a jako volby jsou tak i pojmenovaná.
 */
import { useEffect, useSyncExternalStore } from 'react';

import { kolikDoStartu, PO_STARTU_NERUSIT_S, PREDEHRA_KLIDU_S, type StavStartu } from './start';

/** Co může restart držet. Každý zámek drží konkrétní obrazovka nebo úloha. */
export type Zamek =
  | 'start'
  | 'cekajici-ukon'
  | 'cil'
  | 'stavba'
  | 'simulace'
  | 'prihlaseni'
  | 'zaznam';

/** Překážka restartu: zámek, nebo okolnost, kterou appka zjistí sama. */
export type Prekazka = Zamek | 'ukazka' | 'zapis-v-letu' | 'bez-site';

/** Rezerva před oknem klidu procedury, ve které se už neaktualizuje. Volba. */
export const PRED_OKNEM_S = 10 * 60;
/** Návrat z pozadí, který už není odskočení do dialogu nebo galerie. Volba. */
export const DLOUHA_PAUZA_MS = 10 * 60_000;
/** Jak čerstvé musí být ověření spojení těsně před restartem. Volba. */
export const CERSTVA_SIT_MS = 5_000;

/* ---------- čistá část ---------- */

/**
 * Drží velitel u startu něco, co restart přeruší?
 *
 * Opakovač může svěsit každou chvíli a odstartovanou rozjížďku ohlašuje
 * jen otevřená obrazovka, dokud ji server nepotvrdí — obojí drží vždy.
 * Jinak drží okno od deseti minut před procedurou do pěti minut po startu.
 */
export function startDrzi(stav: StavStartu | null, ted: number, delkaS: number): boolean {
  if (!stav) return false;
  if (stav.druh === 'opakovac' || stav.druh === 'odstartovano') return true;
  const doStartu = kolikDoStartu(stav, ted);
  return (
    doStartu !== null &&
    doStartu >= -PO_STARTU_NERUSIT_S &&
    doStartu <= delkaS + PREDEHRA_KLIDU_S + PRED_OKNEM_S
  );
}

export type Okolnosti = {
  ted: number;
  zamky: readonly Zamek[];
  ukazka: boolean;
  zapisuVLetu: number;
  sit: { doletelo: boolean; kdy: number } | null;
};

/**
 * Co právě brání restartu. Prázdný seznam znamená, že restart nic nevezme.
 *
 * <b>Bez čerstvě ověřeného spojení se nerestartuje.</b> Obrazovky nemají
 * mezipaměť, takže restart bez signálu by nechal velitele bez odpočtu
 * a cílovku prázdnou.
 */
export function prekazkyRestartu(o: Okolnosti): Prekazka[] {
  const p = new Set<Prekazka>(o.zamky);
  if (o.ukazka) p.add('ukazka');
  if (o.zapisuVLetu > 0) p.add('zapis-v-letu');
  if (!o.sit?.doletelo || o.ted - o.sit.kdy > CERSTVA_SIT_MS) p.add('bez-site');
  return [...p];
}

export function jeBezpecneRestartovat(o: Okolnosti): boolean {
  return prekazkyRestartu(o).length === 0;
}

/** Při jaké příležitosti se o restartu rozhoduje. */
export type Prilezitost =
  | { druh: 'navrat'; vPozadiMs: number }
  | { druh: 'domov' }
  | { druh: 'tlacitko' };

/**
 * Restartovat teď do připravené verze?
 *
 * - Bez připravené verze nikdy.
 * - Na tlačítko vždycky: rozhodl člověk a překážky mu obrazovka ukáže předem.
 * - Verzi, se kterou se už jednou automaticky restartovalo a nevzala se
 *   (appka se po pádu vrátila na starší), sama znovu nezkouší — jinak by
 *   se točila ve smyčce restartů.
 * - Krátký návrat z pozadí (dialog, galerie, přihlášení) není příležitost:
 *   člověk je uprostřed něčeho.
 */
export function restartovatTed(
  kdy: Prilezitost,
  pripravena: { id: string } | null,
  zkousena: string | null,
  prekazky: readonly Prekazka[],
): boolean {
  if (!pripravena) return false;
  if (kdy.druh === 'tlacitko') return true;
  if (pripravena.id === zkousena) return false;
  if (kdy.druh === 'navrat' && kdy.vPozadiMs < DLOUHA_PAUZA_MS) return false;
  return prekazky.length === 0;
}

/** Překážka lidsky, pro sekci Verze appky a pro potvrzení u tlačítka. */
export function popisPrekazky(p: Prekazka): string {
  switch (p) {
    case 'start':
      return 'běží startovní procedura';
    case 'cekajici-ukon':
      return 'čeká neodeslaný úkon startu';
    case 'cil':
      return 'je otevřený zápis v cíli';
    case 'stavba':
      return 'staví se trať';
    case 'simulace':
      return 'běží simulace záznamu';
    case 'prihlaseni':
      return 'probíhá přihlášení';
    case 'zaznam':
      return 'běží záznam trasy';
    case 'ukazka':
      return 'běží ukázkový režim';
    case 'zapis-v-letu':
      return 'odesílá se zápis na server';
    case 'bez-site':
      return 'není ověřené spojení se serverem';
  }
}

/* ---------- registr zámků ---------- */

const drzene = new Map<Zamek, number>();

/**
 * Kdo chce vědět, že se zámky změnily — třeba pruh o nové verzi, který
 * během startu nebo zápisu v cíli zmizí, ať nic nepřekrývá.
 */
const posluchaci = new Set<() => void>();
/** Neměnný snímek pro useSyncExternalStore: nové pole jen při změně. */
let snimek: Zamek[] = [];

function ohlas() {
  snimek = [...drzene.keys()];
  for (const f of posluchaci) f();
}

export function naZmenuZamku(f: () => void): () => void {
  posluchaci.add(f);
  return () => {
    posluchaci.delete(f);
  };
}

/**
 * Vezme zámek a vrátí funkci, která ho pustí. Zámky se počítají: tentýž
 * může držet víc míst najednou a pustí ho až poslední. Druhé puštění téže
 * funkce nic neudělá, takže omylem dvojí úklid zámek neukradne jinému.
 */
export function zamkni(z: Zamek): () => void {
  drzene.set(z, (drzene.get(z) ?? 0) + 1);
  ohlas();
  let puzteno = false;
  return () => {
    if (puzteno) return;
    puzteno = true;
    const n = (drzene.get(z) ?? 1) - 1;
    if (n <= 0) drzene.delete(z);
    else drzene.set(z, n);
    ohlas();
  };
}

/** Které zámky jsou právě držené. */
export function zamkyTed(): Zamek[] {
  return [...drzene.keys()];
}

/** Zámky pro obrazovku: překreslí se, když se změní. */
export function useZamky(): Zamek[] {
  return useSyncExternalStore(naZmenuZamku, () => snimek);
}

/**
 * Zámek pro obrazovku: drží ho, dokud je `aktivni`, a pustí v úklidu —
 * i když obrazovka zmizí, takže zapomenutý zámek nevznikne odchodem.
 */
export function useZamekRestartu(z: Zamek, aktivni: boolean): void {
  useEffect(() => (aktivni ? zamkni(z) : undefined), [z, aktivni]);
}

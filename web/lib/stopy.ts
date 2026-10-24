"use client";

import { useEffect, useState } from "react";
import type { Bod, Lod } from "@/app/nacrt/mapa/plavba";
import type { PolohaLodi } from "@/lib/polohy";

/**
 * Dráhy lodí poskládané z došlých snímků.
 *
 * <b>Server posílá poslední polohu, ne stopu.</b> Je to nejlevnější
 * možný přenos — snímek čtyřiceti poloh je po gzipu kolem kilobajtu —
 * a dráha z něj vznikne tím, že si ji prohlížeč skládá sám. Po obnovení
 * stránky začíná znovu; celá trasa je v záznamu, ne tady.
 */

/**
 * Kolik bodů se pamatuje. Asi hodina provozu při dávce po minutě — to,
 * na co se rozhodčí dívá, ne celý závodní den.
 */
export const STOPA_BODU = 240;

/** Kategorie, které mapa zná. Ročník je má přesně takhle pojmenované. */
const TRIDY: Lod["kategorie"][] = ["Race", "Nad7m", "Pod7m"];

export function trida(nazev: string | null | undefined): Lod["kategorie"] {
  return TRIDY.find((t) => t === nazev) ?? "Race";
}

/**
 * Z došlých poloh udělá lodě pro mapu. `od` je okamžik, od kterého mapa
 * počítá čas v sekundách — mění se jen při prvním snímku.
 */
export function useStopy(
  polohy: PolohaLodi[] | null,
  od: number | null,
): Lod[] {
  const [stopy, setStopy] = useState<Map<number, Bod[]>>(new Map());

  useEffect(() => {
    if (!polohy || od === null) return;
    setStopy((puvodni) => {
      const nove = new Map(puvodni);
      let zmena = false;
      for (const l of polohy) {
        if (l.sirka === null || l.delka === null || l.casGps === null) continue;
        const cas = Math.round((Date.parse(l.casGps) - od) / 1000);
        const stopa = nove.get(l.lodId) ?? [];
        if (stopa.at(-1)?.cas === cas) continue;
        nove.set(l.lodId, [...stopa, { sirka: l.sirka, delka: l.delka, cas }].slice(-STOPA_BODU));
        zmena = true;
      }
      return zmena ? nove : puvodni;
    });
  }, [polohy, od]);

  if (!polohy) return [];

  return polohy
    .map((l) => {
      const body = stopy.get(l.lodId) ?? [];
      return {
        id: l.lodId,
        nazev: l.lod,
        kategorie: trida(l.kategorie),
        body,
        dosloDo: body.length,
      };
    })
    // Loď bez jediné polohy do mapy nepatří — kreslila by se na nule
    // stupňů. V seznamu pod mapou zůstává, tam o ni právě jde.
    .filter((l) => l.body.length > 0);
}

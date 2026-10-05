"use server";

import { redirect } from "next/navigation";
import { odeberVazbu, urciKapitana, zmenRoli, type RoleKLodi } from "@/lib/lode-sprava";

/**
 * Akce obrazovky lodí ročníku. Každá se vrací na tutéž loď, ať dopadla jak
 * chce — správce u ní obvykle řeší víc věcí za sebou a vyhozením na seznam
 * by o rozdělanou loď přišel.
 */

const kam = (serie: string, lod: number, dotaz: string) =>
  `/sprava/${encodeURIComponent(serie)}/lode?lod=${lod}&${dotaz}`;

const zpet = (serie: string, lod: number, chyba: string | null, stav: string) =>
  redirect(
    kam(serie, lod, chyba ? `chyba=${encodeURIComponent(chyba)}` : `stav=${stav}`),
  );

function cisla(formular: FormData) {
  return {
    serie: String(formular.get("serie") ?? ""),
    lod: Number(formular.get("lod") ?? 0),
    vazba: Number(formular.get("vazba") ?? 0),
  };
}

/**
 * Určí kapitána lodi. Povýšení nového a snížení dosavadního je jeden úkon
 * na straně API — tady se jen pošle, kdo to má být.
 */
export async function urciKapitanaAkce(formular: FormData) {
  const { serie, lod } = cisla(formular);
  const uzivatel = String(formular.get("uzivatel") ?? "");

  if (!uzivatel) zpet(serie, lod, "Vyber, kdo má být kapitán.", "");

  zpet(serie, lod, await urciKapitana(serie, lod, uzivatel), "kapitan");
}

/**
 * Potvrdí roli, kterou vazba už má. Mění se jedna věc: od téhle chvíle za
 * ni stojí správce, takže ji párování podle e-mailu nepřepíše.
 */
export async function potvrdRoliAkce(formular: FormData) {
  const { serie, lod, vazba } = cisla(formular);
  const role = String(formular.get("role") ?? "") as RoleKLodi;

  zpet(serie, lod, await zmenRoli(serie, lod, vazba, role), "potvrzeno");
}

/** Změní roli jedné vazby. Posledního kapitána API snížit nenechá. */
export async function zmenRoliAkce(formular: FormData) {
  const { serie, lod, vazba } = cisla(formular);
  const role = String(formular.get("role") ?? "") as RoleKLodi;

  zpet(serie, lod, await zmenRoli(serie, lod, vazba, role), "role");
}

/** Odebere vazbu k lodi. Posledního kapitána API odebrat nenechá. */
export async function odeberVazbuAkce(formular: FormData) {
  const { serie, lod, vazba } = cisla(formular);

  zpet(serie, lod, await odeberVazbu(serie, lod, vazba), "odebrano");
}

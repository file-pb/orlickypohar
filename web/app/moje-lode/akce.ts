"use server";

import { redirect } from "next/navigation";
import { odeberPripojeni, rozhodniNarok, vystavKod } from "@/lib/pripojeni";

/** Vystaví kód a vrátí se s ním v adrese — stránka ho pak ukáže i jako QR. */
export async function vystavKodAkce(formular: FormData) {
  const lod = Number(formular.get("lod") ?? 0);
  const { stav, data } = await vystavKod(lod);

  if (stav === "neprihlasen" || stav === "odmitnut") redirect("/prihlaseni");
  if (stav !== "ok" || !data)
    redirect(`/moje-lode?lod=${lod}&chyba=${encodeURIComponent("Kód se nepovedlo vystavit.")}`);

  redirect(`/moje-lode?lod=${lod}&kod=${data.kod}&doKdy=${encodeURIComponent(data.platiDo)}`);
}

/** Odebere připojení k lodi. Posledního kapitána API odebrat nenechá. */
export async function odeberAkce(formular: FormData) {
  const lod = Number(formular.get("lod") ?? 0);
  const vazba = Number(formular.get("vazba") ?? 0);

  const chyba = await odeberPripojeni(lod, vazba);
  redirect(
    chyba
      ? `/moje-lode?lod=${lod}&chyba=${encodeURIComponent(chyba)}`
      : `/moje-lode?lod=${lod}&stav=odebrano`,
  );
}

/**
 * Kapitán rozhodne o žádosti. Přijetí dělá z žadatele posádku — kapitánem
 * je ten, kdo loď převzal jako první, ne ten, koho někdo potvrdí.
 */
export async function rozhodniNarokAkce(formular: FormData) {
  const lod = Number(formular.get("lod") ?? 0);
  const narok = Number(formular.get("narok") ?? 0);
  const prijmout = formular.get("prijmout") === "ano";

  const chyba = await rozhodniNarok(lod, narok, prijmout);
  redirect(
    chyba
      ? `/moje-lode?lod=${lod}&chyba=${encodeURIComponent(chyba)}`
      : `/moje-lode?lod=${lod}&stav=${prijmout ? "prijato" : "zamitnuto"}`,
  );
}

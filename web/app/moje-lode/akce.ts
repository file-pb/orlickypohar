"use server";

import { redirect } from "next/navigation";
import { odeberPripojeni, rozhodniNarok, vystavKod } from "@/lib/pripojeni";
import { odeberKlic, pozviKlicem, prepniSledovani, procNejde } from "@/lib/klice";

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
 * Kapitán rozhodne o žádosti. Přijetí dělá z žadatele posádku — kapitána
 * uděluje správce ročníku, žádná z cest párování.
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

/**
 * Vystaví pozvánku k mobilnímu klíči a vrátí se s kódem v adrese.
 *
 * <b>Kód se vrací jen jednou</b>, takže ho stránka musí ukázat hned; server
 * si ho neukládá, drží jen otisk. Vydat smí kdokoli z lodi, ne jen kapitán
 * (Filip, 23. 10. 2026).
 */
export async function pozviKlicemAkce(formular: FormData) {
  const lod = Number(formular.get("lod") ?? 0);
  const jmeno = String(formular.get("jmeno") ?? "").trim() || null;
  const { stav, data } = await pozviKlicem(lod, jmeno);

  if (stav === "neprihlasen" || stav === "odmitnut") redirect("/prihlaseni");
  if (stav !== "ok" || !data)
    redirect(`/moje-lode?lod=${lod}&chyba=${encodeURIComponent(procNejde(stav))}`);

  redirect(
    `/moje-lode?lod=${lod}&klic=${encodeURIComponent(data.kod)}` +
      `&klicDoKdy=${encodeURIComponent(data.platiDo)}`,
  );
}

/** Zapne nebo vypne sledování u jednoho telefonu. Vratné. */
export async function prepniSledovaniAkce(formular: FormData) {
  const lod = Number(formular.get("lod") ?? 0);
  const klic = Number(formular.get("klic") ?? 0);
  const sleduje = formular.get("sleduje") === "ano";
  const { stav } = await prepniSledovani(lod, klic, sleduje);

  if (stav === "neprihlasen" || stav === "odmitnut") redirect("/prihlaseni");
  redirect(
    stav === "ok"
      ? `/moje-lode?lod=${lod}&stav=${sleduje ? "sledujeme" : "nesledujeme"}`
      : `/moje-lode?lod=${lod}&chyba=${encodeURIComponent(procNejde(stav))}`,
  );
}

/** Odebere klíč natrvalo — telefon se bude muset spárovat znovu. */
export async function odeberKlicAkce(formular: FormData) {
  const lod = Number(formular.get("lod") ?? 0);
  const klic = Number(formular.get("klic") ?? 0);
  const { stav } = await odeberKlic(lod, klic);

  if (stav === "neprihlasen" || stav === "odmitnut") redirect("/prihlaseni");
  redirect(
    stav === "ok"
      ? `/moje-lode?lod=${lod}&stav=klic-odebran`
      : `/moje-lode?lod=${lod}&chyba=${encodeURIComponent(procNejde(stav))}`,
  );
}

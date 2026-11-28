"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_TOK, zahodToken } from "@/lib/oidc";
import { POLOZKY, smazUcet } from "@/lib/ucet";

/**
 * Smaže účet přihlášeného a pošle ho na účtenku.
 *
 * <b>Stav jde adresou, ne sezením</b> — tentýž tvar jako u kódu na
 * `/moje-lode`. Jiná cesta tu ani není: po smazání účtu se nemá kam uložit,
 * protože sezení v tu chvíli přestává existovat.
 *
 * Nuly se do adresy nepíšou. Účtenka má říct, co se stalo, a „0 velitelských
 * časů" neříká nic — jen přebíjí řádky, na kterých něco opravdu je.
 */
export async function smazUcetAkce(formular: FormData) {
  const potvrzeni = String(formular.get("potvrzeni") ?? "");
  const vysledek = await smazUcet(potvrzeni);

  if ("chyba" in vysledek)
    redirect(`/osobni-udaje/smazani-uctu?chyba=${encodeURIComponent(vysledek.chyba)}`);

  const uctenka = vysledek.uctenka;
  const parametry = new URLSearchParams();

  for (const { klic } of POLOZKY) {
    const kolik = uctenka[klic];
    if (typeof kolik === "number" && kolik > 0) parametry.set(klic, String(kolik));
  }

  if (uctenka.poskytovatelZrusen) parametry.set("poskytovatel", "ano");
  else if (uctenka.poskytovatelDuvod) parametry.set("duvod", uctenka.poskytovatelDuvod);

  // Sezení se zahazuje teprve tady. Do téhle chvíle byl token potřeba —
  // posílal se s ním i požadavek na zrušení účtu u poskytovatele. Nechat ho
  // dál by znamenalo hlavičku, která ukazuje přihlášeného k účtu, jenž
  // neexistuje.
  const ks = await cookies();
  zahodToken(ks);
  ks.delete({ name: COOKIE_TOK, path: "/" });

  redirect(`/osobni-udaje/smazani-uctu/hotovo?${parametry}`);
}

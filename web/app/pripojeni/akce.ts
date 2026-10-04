"use server";

import { redirect } from "next/navigation";
import { pozadejOLod, pripoj } from "@/lib/pripojeni";

/**
 * Uplatnění kódu. Přihlášení se řeší přesměrováním, ne hláškou: kdo přišel
 * z QR a není přihlášený, má se nejdřív přihlásit a vrátit se sem s kódem.
 */
export async function pripojAkce(formular: FormData) {
  const kod = String(formular.get("kod") ?? "").trim();
  const kam = (zprava: Record<string, string>) =>
    `/pripojeni?${new URLSearchParams({ kod, ...zprava })}`;

  if (!kod) redirect(kam({ chyba: "Zadej kód, který jsi dostal." }));

  const { pripojeni, chyba, neprihlasen } = await pripoj(kod);
  if (neprihlasen)
    redirect(`/prihlaseni?kam=${encodeURIComponent(`/pripojeni?kod=${kod}`)}`);
  if (chyba) redirect(kam({ chyba }));

  redirect(`/moje-lode?lod=${pripojeni!.lodId}&stav=${pripojeni!.jizBylo ? "uz" : "nove"}`);
}

/**
 * Žádost o loď, když člověk kód nemá. Kapitán ji potvrdí — do té doby
 * žádost nedává žádné právo.
 */
export async function pozadejAkce(formular: FormData) {
  const lodId = Number(formular.get("lod") ?? 0);
  const poznamka = String(formular.get("poznamka") ?? "").trim() || undefined;
  const kam = (zprava: Record<string, string>) => `/pripojeni?${new URLSearchParams(zprava)}`;

  if (!lodId) redirect(kam({ chyba: "Vyber loď, ke které patříš." }));

  const chyba = await pozadejOLod(lodId, poznamka);
  redirect(chyba ? kam({ chyba }) : kam({ zadost: "podana" }));
}

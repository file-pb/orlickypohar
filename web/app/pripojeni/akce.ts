"use server";

import { redirect } from "next/navigation";
import { pripoj } from "@/lib/pripojeni";

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

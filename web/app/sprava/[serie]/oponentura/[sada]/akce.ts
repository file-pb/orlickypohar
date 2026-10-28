"use server";

import { redirect } from "next/navigation";
import { dokonci, odpovez, smazHlas } from "@/lib/oponentura";

/**
 * Zápis odpovědi, smazání nahrávky a „mám to“.
 *
 * <b>Serverové akce, ne vlastní koncový bod</b> — na rozdíl od nahrávání
 * hlasu. Pravidlo Cloudflare, které nahrávání rozbilo, se chytá na
 * kombinaci „soubor v požadavku s hlavičkou serverové akce"
 * (`…/smernice/[zavod]/nahrat/route.ts`); tyhle tři soubor neposílají,
 * takže na co reagovat není.
 *
 * <b>Ročník a sadu si akce skládá sama</b> z polí formuláře, ze kterých
 * se pak skládá i adresa, kam se vrací — podvržené pole tedy nedosáhne
 * dál než na cizí sadu, kterou stejně chrání oprávnění v API.
 */

const kam = (serie: string, sada: string, zprava: Record<string, string>) =>
  `/sprava/${encodeURIComponent(serie)}/oponentura/${encodeURIComponent(sada)}` +
  `?${new URLSearchParams(zprava)}`;

/**
 * Zapíše zaškrtnuté volby a text u jedné otázky.
 *
 * <b>Kotva v adrese vede zpátky k té otázce.</b> Sada má devět otázek a bez
 * ní by se stránka po uložení vrátila nahoru — na telefonu to znamená
 * hledat, kde člověk skončil.
 */
export async function odpovedAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const sada = String(formular.get("sada") ?? "");
  const kod = String(formular.get("kod") ?? "");

  // `getAll` kvůli otázkám, kde se dá zaškrtnout víc voleb.
  const volby = formular.getAll("volba").map(String).filter(Boolean);
  const text = String(formular.get("text") ?? "").trim();

  const chyba = await odpovez(serie, sada, kod, { volby, text: text || undefined });
  redirect(
    kam(serie, sada, chyba ? { chyba } : { stav: "ulozeno", kde: kod }) + `#otazka-${kod}`,
  );
}

/** Smaže nahrávku — zmáčknutý mikrofon omylem se musí dát vzít zpět. */
export async function smazHlasAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const sada = String(formular.get("sada") ?? "");
  const kod = String(formular.get("kod") ?? "");
  const id = String(formular.get("id") ?? "");

  const chyba = await smazHlas(serie, sada, id);
  redirect(
    kam(serie, sada, chyba ? { chyba } : { stav: "smazano", kde: kod }) + `#otazka-${kod}`,
  );
}

/**
 * Zaškrtne „mám to“, nebo to vezme zpátky.
 *
 * Spočítat to nejde: nic v sadě není povinné, takže hotovou sadu od
 * rozpracované odliší jen ten, kdo odpovídá.
 */
export async function dokonciAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const sada = String(formular.get("sada") ?? "");
  const hotovo = String(formular.get("hotovo") ?? "") === "ano";

  const chyba = await dokonci(serie, sada, hotovo);
  redirect(kam(serie, sada, chyba ? { chyba } : { stav: hotovo ? "hotovo" : "otevreno" }));
}

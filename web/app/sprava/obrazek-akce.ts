"use server";

import { redirect } from "next/navigation";
import { NEJVIC_MB, nahrajObrazek, odeberObrazek, type DruhObrazku } from "@/lib/fotky";

/**
 * Nahrání a odebrání obrázku. Jedna dvojice akcí pro článek i pořadatele,
 * protože API i formulář jsou u obou stejné.
 *
 * <b>Kam se vrací, skládá akce sama z druhu a klíče</b> — ne z pole
 * formuláře. Adresa z formuláře by šla podvrhnout a přesměrovat kamkoliv.
 */

const DRUHY: DruhObrazku[] = ["clanky", "poradatele"];

function cil(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const klic = String(formular.get("klic") ?? "");
  const druh = String(formular.get("druh") ?? "") as DruhObrazku;
  if (!DRUHY.includes(druh)) throw new Error(`Neznámý druh obrázku: ${druh}`);

  const kam = (zprava: Record<string, string>) =>
    `/sprava/${encodeURIComponent(serie)}/${druh}/${encodeURIComponent(klic)}?${new URLSearchParams(zprava)}`;

  return { serie, klic, druh, kam };
}

export async function nahrajObrazekAkce(formular: FormData) {
  const { serie, klic, druh, kam } = cil(formular);

  const soubor = formular.get("soubor");
  const autor = String(formular.get("autor") ?? "").trim();
  const popis = String(formular.get("popis") ?? "").trim() || undefined;
  // Zaškrtávátko posílá prohlížeč jen zaškrtnuté, s hodnotou „on".
  const souhlas = formular.get("souhlas") === "on";

  if (!(soubor instanceof File) || soubor.size === 0)
    redirect(kam({ chyba: "Vyber soubor s fotkou." }));
  if (soubor.size > NEJVIC_MB * 1024 * 1024)
    redirect(kam({ chyba: `Fotka může mít nejvýš ${NEJVIC_MB} MB.` }));
  if (!autor) redirect(kam({ chyba: "Napiš, kdo fotku fotil." }));
  if (!souhlas) redirect(kam({ chyba: "Potvrď, že autor souhlasí se zveřejněním." }));

  const chyba = await nahrajObrazek(serie, druh, klic, { soubor, autor, popis, souhlas });
  redirect(kam(chyba ? { chyba } : { stav: "obrazek" }));
}

export async function odeberObrazekAkce(formular: FormData) {
  const { serie, klic, druh, kam } = cil(formular);

  const chyba = await odeberObrazek(serie, druh, klic);
  redirect(kam(chyba ? { chyba } : { stav: "obrazek-odebran" }));
}

"use server";

import { redirect } from "next/navigation";
import { prihlas } from "@/lib/verejna-prihlaska";

/**
 * Odeslání veřejné přihlášky. Serverová akce, „POST, pak přesměruj":
 * obnovení stránky nesmí přihlásit loď podruhé.
 */

const kam = (serie: string, zavod: string, zprava: Record<string, string>) =>
  `/serie/${encodeURIComponent(serie)}/zavody/${encodeURIComponent(zavod)}/prihlaska?${new URLSearchParams(zprava)}`;

const text = (formular: FormData, klic: string) =>
  String(formular.get(klic) ?? "").trim() || undefined;

export async function prihlasAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const lod = text(formular, "lod") ?? "";

  const chyba = await prihlas(serie, zavod, {
    lod,
    cisloPlachty: text(formular, "cisloPlachty"),
    typ: text(formular, "typ"),
    kategorie: text(formular, "kategorie"),
    kapitan: {
      jmeno: text(formular, "jmeno") ?? "",
      prijmeni: text(formular, "prijmeni") ?? "",
      email: text(formular, "email"),
      telefon: text(formular, "telefon"),
      cisloCsj: text(formular, "cisloCsj"),
    },
    posadka: text(formular, "posadka"),
    poznamka: text(formular, "poznamka"),
    souhlas: formular.get("souhlas") === "on",
    // Past na roboty: pole je schované, člověk ho nevyplní.
    past: text(formular, "web"),
    zobrazenoV: text(formular, "zobrazenoV"),
  });

  // Při chybě zpátky na vyplněný formulář — přepisovat všechno znovu
  // kvůli jednomu překlepu je nejrychlejší cesta, jak člověka odradit.
  redirect(chyba ? kam(serie, zavod, { chyba, lod }) : kam(serie, zavod, { stav: "prijato", lod }));
}

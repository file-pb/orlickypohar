"use server";

import { redirect } from "next/navigation";
import {
  NOVA,
  prepniLod,
  prihlas,
  smazPrihlasku,
  zapisStartovne,
  type StavUcasti,
} from "@/lib/prihlasky";
import { vystavKodPoradatel } from "@/lib/pripojeni";

/**
 * Zápisy z obrazovky přihlášek. Serverové akce, ne javascript v prohlížeči
 * — stejně jako zbytek administrace.
 *
 * <b>Rozepsaná nová loď se při chybě vrací v adrese</b>, stejně jako zápis
 * výsledků: opisovat šest polí kvůli překlepu v kategorii nikoho nebaví.
 */

const kam = (serie: string, zavod: string, zprava: Record<string, string | undefined>) => {
  const dotaz = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(zprava)) if (hodnota) dotaz.set(klic, hodnota);
  const konec = dotaz.size ? `?${dotaz}` : "";

  return `/sprava/${encodeURIComponent(serie)}/prihlasky/${encodeURIComponent(zavod)}${konec}`;
};

const text = (formular: FormData, pole: string) => String(formular.get(pole) ?? "").trim();


export async function prihlasAkce(formular: FormData) {
  const serie = text(formular, "serie");
  const zavod = text(formular, "zavod");
  const prihlaskaId = Number(text(formular, "prihlaskaId"));

  if (!prihlaskaId) redirect(kam(serie, zavod, { chyba: "Vyber loď, kterou chceš přihlásit." }));

  // Potvrzení pozdní přihlášky u vyhlášené regaty: server se ptá 409
  // a obrazovka nabídne tlačítko, které se zeptá podruhé s `potvrzeno`.
  const potvrzeno = text(formular, "potvrzeno") === "ano";
  // Souhlas s pravidly, který kapitán dal pořadateli mimo web (nález R9).
  const souhlas = text(formular, "souhlas") === "ano";
  const vysledek = await prihlas(serie, zavod, { prihlaskaId }, potvrzeno, souhlas);

  redirect(
    kam(
      serie,
      zavod,
      "chyba" in vysledek
        ? vysledek.potvrdit
          ? // <b>Souhlas se nese do otázky s sebou</b> (nález R9,
            // 28. 10. 2026). Bez toho by zaškrtnutý souhlas padl pod
            // stůl pokaždé, když se server zeptá na pozdní přihlášku —
            // a pořadatel by o něm nevěděl, protože druhé klepnutí je
            // „Přihlásit i tak", ne nový formulář.
            { chyba: vysledek.chyba, potvrdit: String(prihlaskaId), souhlas: souhlas ? "ano" : undefined }
          : { chyba: vysledek.chyba }
        : { stav: vysledek.nova ? "prihlasena" : "jiz", lod: vysledek.lod.lod },
    ),
  );
}

export async function novaLodAkce(formular: FormData) {
  const serie = text(formular, "serie");
  const zavod = text(formular, "zavod");

  const novaLod = {
    nazev: text(formular, "nazev"),
    kategorie: text(formular, "kategorie"),
    majitelJmeno: text(formular, "jmeno"),
    majitelPrijmeni: text(formular, "prijmeni"),
    cisloPlachty: text(formular, "cisloPlachty") || null,
    typ: text(formular, "typ") || null,
  };

  // Totéž potvrzení jako u lodi z ročníku. <b>Nová loď je ten případ, kvůli
  // kterému otázka vznikla</b> — domluví se telefonem na startu a v ročníku
  // ještě není. Bez tohohle ji do vyhlášené regaty nešlo přidat vůbec:
  // otázka přišla, odpovědět na ni nebylo kde (16. 10. 2026).
  const potvrzeno = text(formular, "potvrzeno") === "ano";
  const souhlas = text(formular, "souhlas") === "ano";
  const vysledek = await prihlas(serie, zavod, { novaLod }, potvrzeno, souhlas);

  if ("chyba" in vysledek)
    redirect(
      kam(serie, zavod, {
        chyba: vysledek.chyba,
        potvrdit: vysledek.potvrdit ? NOVA : undefined,
        // Souhlas se nese do otázky stejně jako zbytek zadání — viz výš.
        souhlas: souhlas ? "ano" : undefined,
        nova: "1",
        nazev: novaLod.nazev,
        kategorie: novaLod.kategorie,
        jmeno: novaLod.majitelJmeno,
        prijmeni: novaLod.majitelPrijmeni,
        cisloPlachty: novaLod.cisloPlachty ?? undefined,
        typ: novaLod.typ ?? undefined,
      }),
    );

  redirect(kam(serie, zavod, { stav: vysledek.nova ? "prihlasena" : "jiz", lod: vysledek.lod.lod }));
}

export async function stavLodiAkce(formular: FormData) {
  const serie = text(formular, "serie");
  const zavod = text(formular, "zavod");
  const prihlaskaId = Number(text(formular, "prihlaskaId"));
  const stav = text(formular, "stav") as StavUcasti;
  const lod = text(formular, "lod");
  const duvod = text(formular, "duvod") || undefined;

  const chyba = await prepniLod(serie, zavod, prihlaskaId, stav, duvod);

  redirect(kam(serie, zavod, chyba ? { chyba } : { stav: "prepnuto", lod, nastav: stav }));
}

export async function startovneAkce(formular: FormData) {
  const serie = text(formular, "serie");
  const zavod = text(formular, "zavod");
  const lod = text(formular, "lod");

  const chyba = await zapisStartovne(
    serie,
    zavod,
    Number(text(formular, "prihlaskaId")),
    formular.get("zaplaceno") === "on",
    text(formular, "poznamka") || undefined,
  );

  redirect(kam(serie, zavod, chyba ? { chyba } : { stav: "startovne", lod }));
}

export async function smazAkce(formular: FormData) {
  const serie = text(formular, "serie");
  const zavod = text(formular, "zavod");
  const lod = text(formular, "lod");

  const chyba = await smazPrihlasku(serie, zavod, Number(text(formular, "prihlaskaId")));

  redirect(kam(serie, zavod, chyba ? { chyba } : { stav: "smazano", lod }));
}

/**
 * Vystaví připojovací kód k lodi rovnou od stolu registrace.
 *
 * Kód se vrací v adrese, ne v session: stránka ho pak ukáže velkým písmem
 * i jako QR, dokud pořadatel neklikne jinam. Je to jednorázový údaj, který
 * stejně za čtvrt hodiny propadne.
 */
export async function vystavKodAkce(formular: FormData) {
  const serie = text(formular, "serie");
  const zavod = text(formular, "zavod");
  const lod = Number(formular.get("lod") ?? 0);

  const { stav, data } = await vystavKodPoradatel(serie, lod);
  if (stav !== "ok" || !data)
    redirect(kam(serie, zavod, {
      chyba: stav === "nesmi"
        ? "Kód smí vystavit pořadatel regaty nebo rozhodčí ročníku."
        : "Kód se nepovedlo vystavit.",
    }));

  redirect(kam(serie, zavod, { kod: data.kod, kodLod: String(lod), doKdy: data.platiDo }));
}

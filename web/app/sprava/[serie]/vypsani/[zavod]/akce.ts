"use server";

import { redirect } from "next/navigation";
import { okamzikZMistniho } from "@/lib/cas-praha";
import { ulozVypsani } from "@/lib/kalendar";

/**
 * Uloží kolonky vypsání závodu.
 *
 * <b>Prázdné pole maže.</b> Jinde ve správě znamená prázdno „neměnit",
 * protože ty formuláře slouží k něčemu jinému a nesmějí cestou shodit, co
 * do ročníku přišlo importem. Tenhle je jediné místo, kde se vypsání
 * vyplňuje, posílá všechny kolonky najednou — a bez mazání by se překlep
 * nedal vzít zpět. Totéž pravidlo drží API (`VypsaniKolonkyVstup`).
 */
export async function vypsaniAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");

  const text = (klic: string) => {
    const hodnota = String(formular.get(klic) ?? "").trim();
    return hodnota === "" ? null : hodnota;
  };

  const cislo = (klic: string) => {
    const hodnota = text(klic);
    return hodnota === null ? null : Number(hodnota);
  };

  const cas = (hodnota: string | null) =>
    hodnota === null ? null : /^\d{2}:\d{2}$/.test(hodnota) ? `${hodnota}:00` : hodnota;

  const chyba = await ulozVypsani(serie, zavod, {
    mistoKonani: text("mistoKonani"),
    draha: text("draha"),
    // `input[type=time]` posílá „16:00"; TimeOnly v API čeká sekundy.
    // Doplňují se tady, aby se o tom nemusela dohadovat obě strany.
    posledniStartV: cas(text("posledniStartV")),
    uzaverkaPrihlasek: text("uzaverkaPrihlasek"),
    startovne: text("startovne"),
    // `datetime-local` je bez pásma: co „10:55" znamená za okamžik,
    // rozhoduje čas Orlíku. Převod má vlastní modul i testy.
    prvniVyzyvaciZnameni: okamzikZMistniho(text("prvniVyzyvaciZnameni")),
    delkaProceduryMin: cislo("delkaProceduryMin"),
  });

  const kam = `/sprava/${encodeURIComponent(serie)}/vypsani/${encodeURIComponent(zavod)}`;
  redirect(`${kam}?${new URLSearchParams(chyba ? { chyba } : { stav: "ulozeno" })}`);
}

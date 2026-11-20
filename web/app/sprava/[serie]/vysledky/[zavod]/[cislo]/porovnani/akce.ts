"use server";

import { redirect } from "next/navigation";
import { nactiNavrhy, nactiZapis, pouzijNavrh, ulozZapis } from "@/lib/vysledky";

/**
 * Výběr verze zápisu, na které se zapisovatelé shodli. Serverová akce, ne
 * javascript — porovnává se na břehu, po dojezdu.
 */
export async function pouzijNavrhAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const cislo = Number(formular.get("cislo") ?? 0);
  const autor = String(formular.get("autor") ?? "");
  const kdo = String(formular.get("kdo") ?? "");

  const zaklad = `/sprava/${encodeURIComponent(serie)}/vysledky/${encodeURIComponent(zavod)}/${cislo}/porovnani`;
  const chyba = await pouzijNavrh(serie, zavod, cislo, autor);

  redirect(
    chyba
      ? `${zaklad}?${new URLSearchParams({ chyba })}`
      : `${zaklad}?${new URLSearchParams({ stav: "pouzito", kdo })}`,
  );
}

/**
 * Převezme do výsledků jen zaškrtnuté řádky snímku.
 *
 * <b>Proč ne jedním tlačítkem</b> (oponentura rozhodčího, a Filip
 * 18. 11. 2026). U snímku z papíru četl čísla stroj, ne člověk: kdyby se
 * rozpoznaný zápis dal odklepnout najednou, rozhodčí ho odklepne a
 * nezkontroluje — a chyba OCR se stane výsledkem. Potvrzuje se proto po
 * řádcích, proti fotce, která je na téže obrazovce.
 *
 * <b>Co se nezaškrtne, zůstává, jak bylo.</b> Není to import celé sady,
 * ale oprava jednotlivých míst: zbytek výsledků se nepřepisuje, protože
 * ty řádky nikdo neposoudil.
 */
export async function prevezmiRadkyAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const cislo = Number(formular.get("cislo") ?? 0);
  const autor = String(formular.get("autor") ?? "");

  const zaklad =
    `/sprava/${encodeURIComponent(serie)}/vysledky/${encodeURIComponent(zavod)}/${cislo}/porovnani`;
  const chybne = (chyba: string) => `${zaklad}?${new URLSearchParams({ chyba })}`;

  const vybrane = new Set(
    formular.getAll("radek").map((x) => Number(String(x))).filter(Number.isInteger),
  );
  if (vybrane.size === 0) redirect(chybne("Nezaškrtl jsi ani jeden řádek."));

  const [{ data: navrhy }, { data: zapis }] = await Promise.all([
    nactiNavrhy(serie, zavod, cislo),
    nactiZapis(serie, zavod, cislo),
  ]);

  if (!navrhy || !zapis) redirect(chybne("Zápis se teď nedaří načíst, zkus to znovu."));

  const snimek = navrhy.navrhy.find((n) => n.uzivatelId === autor && n.zPapiru);
  if (!snimek) redirect(chybne("Snímek z papíru už u téhle rozjížďky není."));

  // Celá sada znovu: API ukládá rozjížďku najednou, takže se posílá
  // i to, co se nemění. Zaškrtnuté řádky přebijí, zbytek zůstává.
  const zPapiru = new Map(snimek.radky.map((r) => [r.prihlaskaId, r]));
  const radky = zapis.lode.map((l) => {
    const prevzit = vybrane.has(l.prihlaskaId) ? zPapiru.get(l.prihlaskaId) : undefined;
    return prevzit
      ? { prihlaskaId: l.prihlaskaId, poradiVCili: prevzit.poradiVCili, kod: prevzit.kod }
      : { prihlaskaId: l.prihlaskaId, poradiVCili: l.poradiVCili, kod: l.kod };
  });

  const chyba = await ulozZapis(serie, zavod, cislo, radky, zapis.revize);

  redirect(
    chyba
      ? chybne(chyba)
      : `${zaklad}?${new URLSearchParams({ stav: "prevzato", kolik: String(vybrane.size) })}`,
  );
}

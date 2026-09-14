"use server";

import { redirect } from "next/navigation";
import { ulozZapis, type KodVysledku, type ZapisRadek } from "@/lib/vysledky";

/**
 * Uložení zápisu rozjížďky. Serverová akce, ne javascript v prohlížeči —
 * stejně jako zbytek administrace.
 *
 * <b>Při chybě se zapsaná čísla vracejí v adrese.</b> Vzor „POST, pak
 * přesměruj" by jinak formulář vyprázdnil a pořadatel by po jednom
 * překlepu opisoval z papíru třicet lodí znovu. Třicet řádků po pár
 * znacích se do adresy vejde bez potíží.
 */

const kam = (
  serie: string,
  zavod: string,
  cislo: number,
  zprava: Record<string, string | undefined>,
) => {
  const dotaz = new URLSearchParams();
  for (const [klic, hodnota] of Object.entries(zprava)) if (hodnota) dotaz.set(klic, hodnota);
  const konec = dotaz.size ? `?${dotaz}` : "";

  return `/sprava/${encodeURIComponent(serie)}/vysledky/${encodeURIComponent(zavod)}/${cislo}${konec}`;
};

/**
 * `id~pořadí~kód` po řádcích, oddělené tečkou. Kromě vlnovky jen číslice
 * a písmena, takže se adresa nenafoukne escapováním.
 */
const zakoduj = (radky: ZapisRadek[]) =>
  radky
    .filter((r) => r.poradiVCili != null || r.kod != null)
    .map((r) => `${r.prihlaskaId}~${r.poradiVCili ?? ""}~${r.kod ?? ""}`)
    .join(".");

export async function zapisAkce(formular: FormData) {
  const serie = String(formular.get("serie") ?? "");
  const zavod = String(formular.get("zavod") ?? "");
  const cislo = Number(formular.get("cislo") ?? 0);

  const ids = String(formular.get("lode") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);

  const radky: ZapisRadek[] = ids.map((id) => {
    const poradi = String(formular.get(`poradi-${id}`) ?? "").trim();
    const kod = String(formular.get(`kod-${id}`) ?? "");

    return {
      prihlaskaId: id,
      poradiVCili: poradi ? Number(poradi) : null,
      kod: kod ? (kod as KodVysledku) : null,
    };
  });

  // Prohlížeč číslo v poli hlídá sám, ale formulář jde odeslat i jinak —
  // a NaN by API dostalo jako null, tedy tiše jako „bez výsledku".
  if (radky.some((r) => r.poradiVCili != null && !Number.isInteger(r.poradiVCili)))
    redirect(
      kam(serie, zavod, cislo, {
        chyba: "Pořadí v cíli musí být celé číslo.",
        navrh: zakoduj(radky.map((r) => (Number.isInteger(r.poradiVCili) ? r : { ...r, poradiVCili: null }))),
      }),
    );

  const chyba = await ulozZapis(serie, zavod, cislo, radky);

  redirect(
    kam(serie, zavod, cislo, chyba ? { chyba, navrh: zakoduj(radky) } : { stav: "ulozeno" }),
  );
}

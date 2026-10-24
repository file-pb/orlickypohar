import type { Znacka } from "@/app/nacrt/mapa/plavba";
import type { VerejnaTrat } from "@/lib/api";

/**
 * Trať z API na značky, jak je kreslí mapa.
 *
 * <b>Uzel je bóje sama, nebo střed mezi konci</b> u čáry — to je ten bod,
 * kterým podle mapy vede dráha. Veřejná trať nese u každého konce i barvu,
 * tvar a druh značení, takže se nic nedohledává.
 */
export function znackyZTrati(trat: VerejnaTrat | null | undefined): Znacka[] {
  if (!trat) return [];

  return trat.prvky.map((p) => {
    const konce = [p.a, ...(p.b ? [p.b] : [])].map((k) => ({
      sirka: k.sirka,
      delka: k.delka,
      barva: k.barva ?? "Zluta",
      tvar: k.tvar ?? "Kulova",
      // Bez druhu značení kreslí mapa plavidlo jako červenou bóji; „naše
      // bóje" je ta výchozí, protože takových je na trati většina.
      znaceni: k.znaceni ?? "NaseBoje",
    }));

    return {
      poradi: p.poradi,
      nazev: p.a.nazev,
      typ: p.typ,
      strana: p.strana ?? undefined,
      konce,
      sirka: konce.reduce((s, k) => s + k.sirka, 0) / konce.length,
      delka: konce.reduce((s, k) => s + k.delka, 0) / konce.length,
    };
  });
}

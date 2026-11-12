import type { ReactNode } from "react";
import { nactiJa } from "@/lib/ja";
import { polozkyWebu, prava, rocniky, type Polozka } from "@/lib/co-smim";
import { DlazdiceSekci } from "@/app/prepinac-sekci";

/**
 * Klíč tabu z adresy. Adresy patra webu nejdou po jednom vzorci — ročníky
 * bydlí na `/sprava`, články na `/sprava/web/clanky`, zbytek přímo pod
 * `/sprava` — takže se klíč nedá vyříznout jedním indexem jako u ročníku.
 */
export const tabWebu = (kam: string) =>
  kam === "/sprava" ? "rocniky" : kam.split("/").pop() || "rocniky";

/**
 * Položky patra webu i s <b>Ročníky</b> na prvním místě.
 *
 * `polozkyWebu` je nemá, a je to tak správně: používá se i v patě okna
 * ročníku, kde „Ročníky" mezi odkazy mimo ročník nepatří. Tady se přidají,
 * protože v pruhu jsou tím hlavním — ročník je to, kvůli čemu se do správy
 * chodí.
 */
function tabyWebu(udelena: ReturnType<typeof prava>, maRocniky: boolean): Polozka[] {
  const web = polozkyWebu(udelena);
  if (!maRocniky) return web;

  return [
    {
      nazev: "Ročníky",
      popis: "Kalendář, regaty, výsledky, lodě.",
      kam: "/sprava",
      // Role se u téhle položky neptá na nic — ročníky vidí ten, kdo v nějakém
      // roli má, a to už je zodpovězené seznamem. Ze čtyř rolí je `Ctenar`
      // ta jediná, která nic neslibuje.
      role: "Ctenar",
    },
    ...web,
  ];
}

/**
 * <b>Pruh tabů správy webu</b> — totéž ovládání jako o patro níž u ročníku
 * (konzilium, 12. 11. 2026: *„ušetřili bychom jeden krok"*).
 *
 * Do 12. 11. 2026 byl `/sprava` rozcestník z karet: klepnutím na kartu se
 * šlo na stránku a zpátky drobečkem. Teď je karta tabem a obsah se vykreslí
 * pod ním, takže mezikrok zmizel.
 *
 * <b>Zbude-li jediná dlaždice, pruh se nekreslí</b> — stejně jako u ročníku.
 */
export async function PruhWebu({
  aktivni,
  maRocniky = true,
}: {
  /** Klíč otevřeného tabu: `rocniky`, `clanky`, `opravneni-webu`, `naklady`. */
  aktivni?: string;
  /** Má přihlášený roli aspoň v jednom ročníku? Bez toho tab Ročníky nedává smysl. */
  maRocniky?: boolean;
}) {
  const { ja } = await nactiJa();
  if (!ja) return null;

  const taby = tabyWebu(prava(ja), maRocniky);
  if (taby.length < 2) return null;

  return (
    <DlazdiceSekci
      popisek="Co spravuju na celém webu"
      aktivni={aktivni}
      polozky={taby.map((t) => ({
        klic: tabWebu(t.kam),
        nazev: t.nazev,
        nazevKratky: t.uzky,
        kam: t.kam,
        popis: t.popis,
      }))}
    />
  );
}

/**
 * Nadpis okna správy webu: <b>Správa — {agenda}</b>.
 *
 * Táž apozice jako o patro níž, jen první díl není jméno ročníku, ale patro
 * samo. Váhu nese agenda, protože ta se mezi taby mění.
 */
export async function NadpisWebu({
  tab,
  podtitulek,
  children,
}: {
  tab: string;
  podtitulek?: ReactNode;
  children?: ReactNode;
}) {
  const { ja } = await nactiJa();
  const nazev = ja ? tabyWebu(prava(ja), true).find((t) => tabWebu(t.kam) === tab)?.nazev : undefined;

  return (
    <div className="radek-nadpisu vybrany-ukon" data-ukon={tab}>
      <h1>
        <span className="nadpis-ukonu">
          <span className="ctvrt">Správa&nbsp;—</span>{" "}
          {nazev && <strong className="agenda">{nazev}</strong>}
        </span>
        {children}
      </h1>
      {podtitulek && <p className="podtitulek">{podtitulek}</p>}
    </div>
  );
}

export { rocniky };

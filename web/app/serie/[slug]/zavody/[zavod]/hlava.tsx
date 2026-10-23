import Link from "next/link";
import type { VerejnaTrat, ZavodDetail } from "@/lib/api";
import { Drobecky } from "@/app/drobecky";
import { ZnackaPuvodni } from "@/app/logo-puvodni";
import { VlajkaIkona, type Vlajka } from "@/app/vlajky";
import { nactiJa } from "@/lib/ja";
import { polozkyZastavky, prava, roleVRocniku } from "@/lib/co-smim";
import { nactiBlesky } from "@/lib/blesky";
import { DoSpravy, Hlavicka } from "./hlavicka";
import { jedeSeDnes, Upozorneni, upozorneniZastavky } from "./upozorneni";

/**
 * Hlava stránky regaty: cesta, název, co je nového a taby sekcí.
 *
 * <b>Proč sekce místo jednoho svitku</b> (Filip, 11. 10. 2026: *„Člověk se
 * potřebuje pohybovat ve struktuře… Ne vše najednou"*). Dřív byla regata
 * jedna stránka s osmi nadpisy za sebou, mezi nimi podmínky podle stavu —
 * čtenář nikdy neviděl celek a nepoznal, co ještě přijde. Taby ten celek
 * ukážou i tehdy, když je otevřená jen jedna část.
 *
 * <b>Každá sekce má vlastní adresu</b>, ne přepínač na jedné stránce (plán,
 * oddíl *Úvodník a taby*): posílají se na ně odkazy a mikrocache před webem
 * drží každou adresu zvlášť, takže telefon u vody stáhne jen svůj kus.
 * Z toho plyne i to hlavní: otevřená sekce si načte jen svoje data.
 *
 * <b>Taby nejsou nabídka odkazů, ale obsah stránky.</b> Proto tu sekce
 * stojí i prázdná (lodě u regaty, kam se ještě nikdo nehlásil) — že je
 * prázdná, je taky odpověď. Chybí jen to, co u téhle regaty nedává smysl:
 * směrnice, která není vyvěšená, trať, která není přijatá, a u komunitní
 * akce výsledky a lodě, které nikdy nebudou.
 */

 export type Sekce = "uvod" | "smernice" | "trat" | "lode" | "vysledky";

const NAZVY: Record<Sekce, string> = {
  uvod: "Úvod",
  smernice: "Směrnice",
  trat: "Trať",
  lode: "Lodě",
  vysledky: "Výsledky",
};

/**
 * Signální vlajka u každé sekce (Filip, 11. 10. 2026: *„ať je to živější"*).
 * Vybraná podle toho, co vlajka doopravdy znamená v Závodních signálech —
 * proč a která, viz `app/vlajky.tsx`. Úvod vlajku nemá: žádný signál
 * neznamená „tady je řeč o celé regatě", a tak nese značku poháru, stejně
 * jako ji v tabech tříd nese pořadí celého pole.
 */
const VLAJKY: Record<Sekce, Vlajka | null> = {
  uvod: null,
  smernice: "L",
  trat: "M",
  lode: "P",
  vysledky: "modra",
};

/** Které sekce ta která regata má. Pořadí je pořadí tabů. */
function sekce(zavod: ZavodDetail, trat: VerejnaTrat | null, akce: boolean): Sekce[] {
  if (akce) return ["uvod"];

  return [
    "uvod",
    ...((zavod.smernice?.length ?? 0) > 0 ? (["smernice"] as const) : []),
    ...(trat ? (["trat"] as const) : []),
    "lode",
    // Výsledky i u ročníku, který je nevydává. Sekce tam není proto, že by
    // v ní byla tabulka, ale proto, aby se nemlčelo: „vznikaly ručně, platí
    // pořadí seriálu" je odpověď, a bez tabu by na ni nevedla cesta —
    // přesně ta vada, kterou Filip našel u tabule (10. 10. 2026).
    "vysledky",
  ];
}

export function adresaSekce(serie: string, zavod: string, s: Sekce) {
  const zaklad = `/serie/${serie}/zavody/${zavod}`;
  return s === "uvod" ? zaklad : `${zaklad}/${s}`;
}

export async function HlavaZastavky({
  serie,
  zavod,
  detail,
  trat,
  aktivni,
}: {
  serie: string;
  zavod: string;
  detail: ZavodDetail;
  trat: VerejnaTrat | null;
  aktivni: Sekce;
}) {
  const akce = detail.druh === "Akce";

  // Cesta do správy rovnou odsud, když na to člověk má práva. Na cache to
  // vliv nemá, viz `DoSpravy`.
  const { ja } = await nactiJa();
  const udelena = prava(ja);
  const maRoli = roleVRocniku(udelena, serie).length > 0;
  // Komunitní akce výsledky ani přihlášky nemá; vede z ní jen rozcestník.
  const prace = akce ? [] : polozkyZastavky(udelena, serie, zavod);

  const moje = sekce(detail, trat, akce);

  // Blesky se tahají jen v den regaty. Mimo něj je to zbytečné volání ven
  // u každé stránky, kterou si někdo otevře kvůli loňským výsledkům —
  // a informace, kterou nikdo nepotřebuje. Výpadek zdroje řeší `nactiBlesky`
  // sám tím, že vrátí null, a upozornění pak chybí.
  const blesky = jedeSeDnes(detail) ? await nactiBlesky() : null;

  const upozorneni = upozorneniZastavky(
    detail,
    trat,
    {
      trat: adresaSekce(serie, zavod, "trat"),
      tabule: `/serie/${serie}/zavody/${zavod}/tabule`,
      prihlaska: `/serie/${serie}/zavody/${zavod}/prihlaska`,
      smernice: adresaSekce(serie, zavod, "smernice"),
    },
    blesky,
  );

  return (
    <>
      <Drobecky
        cesta={[
          { text: "Domů", kam: "/" },
          { text: "Ročník", kam: `/serie/${serie}` },
          // Název regaty je odkaz na její úvod — kromě úvodu samotného,
          // kde by vedl sám na sebe. Poslední drobeček odkaz nikdy není.
          aktivni === "uvod"
            ? { text: detail.nazev }
            : { text: detail.nazev, kam: adresaSekce(serie, zavod, "uvod") },
          ...(aktivni === "uvod" ? [] : [{ text: NAZVY[aktivni] }]),
        ]}
      />
      <Hlavicka zavod={detail} akce={akce} />

      {maRoli && <DoSpravy serie={serie} zavod={zavod} prace={prace} />}

      <Upozorneni upozorneni={upozorneni} />

      {moje.length > 1 && (
        <nav className="taby taby-sekci" aria-label="Části regaty">
          {moje.map((s) => (
            <Link
              key={s}
              href={adresaSekce(serie, zavod, s)}
              aria-current={s === aktivni ? "page" : undefined}
            >
              {VLAJKY[s] ? <VlajkaIkona vlajka={VLAJKY[s]} /> : <ZnackaPuvodni />}
              {NAZVY[s]}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

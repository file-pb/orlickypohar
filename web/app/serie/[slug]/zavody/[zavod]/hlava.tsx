import Link from "next/link";
import type { VerejnaTrat, ZavodDetail } from "@/lib/api";
import { Drobecky } from "@/app/drobecky";
import { nactiJa } from "@/lib/ja";
import { polozkyZastavky, prava, roleVRocniku } from "@/lib/co-smim";
import { DoSpravy, Hlavicka } from "./hlavicka";
import { Upozorneni, upozorneniZastavky } from "./upozorneni";

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

/** Které sekce ta která regata má. Pořadí je pořadí tabů. */
function sekce(zavod: ZavodDetail, trat: VerejnaTrat | null, akce: boolean): Sekce[] {
  if (akce) return ["uvod"];

  return [
    "uvod",
    ...((zavod.smernice?.length ?? 0) > 0 ? (["smernice"] as const) : []),
    ...(trat ? (["trat"] as const) : []),
    "lode",
    // Ročník se skrytými výsledky je ten, kde vznikaly ručně a nesouhlasí
    // (viz stránka pořadí). Prázdný tab „Výsledky" by sliboval, že se
    // objeví.
    ...(zavod.vysledkySkryte ? [] : (["vysledky"] as const)),
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
  const upozorneni = upozorneniZastavky(detail, trat, {
    trat: adresaSekce(serie, zavod, "trat"),
    tabule: `/serie/${serie}/zavody/${zavod}/tabule`,
    prihlaska: `/serie/${serie}/zavody/${zavod}/prihlaska`,
    smernice: adresaSekce(serie, zavod, "smernice"),
  });

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
              {NAZVY[s]}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { DLAZDICE, Z_NEJMENE, Z_NEJVIC, doPixelu, metruNaPixel, zPixelu } from "@/lib/mapa";

/**
 * Výběr bodu z mapy.
 *
 * <b>Zadání (Filip, 10. 10. 2026):</b> *„U startu, když je mezi molem na
 * břehu a bójí plavební dráhy, je vybrání z mapy rychlejší než pípnutí.
 * (…) Ale teď musím jít jinam na web a vzít si souřadnice a kopírovat to
 * do textu."* Pípnutí a výběr z mapy jsou dva nástroje na dvě různé
 * situace a mají mít stejně blízko.
 *
 * <b>Křížek stojí uprostřed a hýbe se mapou</b>, ne prstem po mapě. Na
 * houpající se palubě se do bodu netrefíš; posunout podklad pod pevným
 * křížkem jde i jednou rukou.
 *
 * <b>Přibližuje se tlačítky, ne štípnutím.</b> Dvěma prsty v rukavicích
 * nikdo nic nezvětší, a tlačítko se dá zmáčknout i palcem.
 *
 * <b>Bez mapové knihovny.</b> Leaflet by pro „táhni podklad a přečti
 * střed" znamenal sto čtyřicet kilobajtů, vlastní CSS a tanec kolem
 * vykreslování na serveru. Projekce je v `lib/mapa.ts`, dlaždice jdou
 * přes náš server jako všude jinde.
 */
export function MapkaVyber({
  stred,
  sirkaObrazu = 320,
  vyskaObrazu = 240,
  vyber,
  zrus,
}: {
  stred: { sirka: number; delka: number };
  sirkaObrazu?: number;
  vyskaObrazu?: number;
  vyber: (bod: { sirka: number; delka: number }) => void;
  zrus: () => void;
}) {
  const [z, setZ] = useState(15);
  const [kde, setKde] = useState(stred);
  /**
   * Kotva tahu je v `ref`, ne ve stavu. Stav se projeví až po
   * překreslení, takže při svižném tahu dorazí `pointermove` dřív, než
   * se `pointerdown` stihne zapsat — a mapa přeskočí nebo se nehne.
   */
  const tah = useRef<{ x: number; y: number } | null>(null);

  const strediste = doPixelu(kde.sirka, kde.delka, z);
  const levo = strediste.x - sirkaObrazu / 2;
  const nahore = strediste.y - vyskaObrazu / 2;

  const dlazdice: { klic: string; cesta: string; x: number; y: number }[] = [];
  const naSvete = 2 ** z;
  for (let tx = Math.floor(levo / DLAZDICE); tx <= Math.floor((levo + sirkaObrazu) / DLAZDICE); tx++)
    for (let ty = Math.floor(nahore / DLAZDICE); ty <= Math.floor((nahore + vyskaObrazu) / DLAZDICE); ty++) {
      if (tx < 0 || ty < 0 || tx >= naSvete || ty >= naSvete) continue;
      dlazdice.push({
        klic: `${z}-${tx}-${ty}`,
        cesta: `/dlazdice/${z}/${tx}/${ty}`,
        x: tx * DLAZDICE - levo,
        y: ty * DLAZDICE - nahore,
      });
    }

  const posun = (dx: number, dy: number) => {
    const novy = zPixelu(strediste.x - dx, strediste.y - dy, z);
    setKde(novy);
  };

  const priblizeni = (o: number) => {
    setZ((p) => Math.min(Z_NEJVIC, Math.max(Z_NEJMENE, p + o)));
  };

  const naMetr = metruNaPixel(kde.sirka, z);

  return (
    <div className="vyber-mapy">
      <div
        className="plocha"
        style={{ width: sirkaObrazu, height: vyskaObrazu }}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          tah.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!tah.current) return;
          posun(e.clientX - tah.current.x, e.clientY - tah.current.y);
          tah.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (tah.current = null)}
        onPointerCancel={() => (tah.current = null)}
      >
        {dlazdice.map((d) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={d.klic} src={d.cesta} alt="" draggable={false} style={{ left: d.x, top: d.y }} />
        ))}
        <svg className="krizek" viewBox={`0 0 ${sirkaObrazu} ${vyskaObrazu}`} aria-hidden="true">
          <line x1={sirkaObrazu / 2 - 14} y1={vyskaObrazu / 2} x2={sirkaObrazu / 2 + 14} y2={vyskaObrazu / 2} />
          <line x1={sirkaObrazu / 2} y1={vyskaObrazu / 2 - 14} x2={sirkaObrazu / 2} y2={vyskaObrazu / 2 + 14} />
          <circle cx={sirkaObrazu / 2} cy={vyskaObrazu / 2} r={7} fill="none" />
        </svg>
      </div>

      <p className="poznamka">
        Křížek je bod, který vezmeš. Posouvej mapou pod ním.{" "}
        {kde.sirka.toFixed(5)}, {kde.delka.toFixed(5)} · {Math.round(naMetr)} m na pixel
      </p>

      <div className="chipy">
        <button type="button" className="chip" onClick={() => priblizeni(1)} disabled={z >= Z_NEJVIC}>
          Přiblížit
        </button>
        <button type="button" className="chip" onClick={() => priblizeni(-1)} disabled={z <= Z_NEJMENE}>
          Oddálit
        </button>
      </div>

      <button type="button" className="velke" onClick={() => vyber(kde)}>
        Vzít tenhle bod
      </button>
      <button type="button" className="zrusit" onClick={zrus}>
        Zpět
      </button>

      <p className="poznamka">
        Podklad{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © přispěvatelé OpenStreetMap
        </a>
        .
      </p>
    </div>
  );
}

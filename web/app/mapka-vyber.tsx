"use client";

import { useEffect, useRef, useState } from "react";
import { DLAZDICE, Z_NEJMENE, Z_NEJVIC, doPixelu, metruNaPixel, zPixelu } from "@/lib/mapa";
import { naOrliku } from "@/lib/souradnice";

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
/**
 * Výška podle šířky. Na telefonu je mapa přes celou šířku a čtverec by
 * sežral obrazovku i s tlačítky pod ní; u stolu by zase pruh přes celé
 * okno byl na výběr bodu k ničemu, proto strop.
 */
function vyskaProSirku(sirka: number) {
  return Math.round(Math.min(Math.max(sirka * 0.75, 200), 360));
}

export function MapkaVyber({
  stred,
  sirkaObrazu = 320,
  vyskaObrazu = 240,
  vyber,
  zrus,
  cekam = false,
}: {
  stred: { sirka: number; delka: number };
  /**
   * Rozměr, než se mapa změří. <b>Skutečný se bere z DOM</b>, protože
   * mapa je přes celou šířku — na telefonu jí pevných 320 px nechávalo
   * pruh vedle (Filip, 11. 10. 2026).
   */
  sirkaObrazu?: number;
  vyskaObrazu?: number;
  vyber: (bod: { sirka: number; delka: number }) => void;
  zrus: () => void;
  /**
   * Běží zápis vybraného bodu. Dokud běží, tlačítko nepustí druhé
   * klepnutí — to by založilo druhou bóji na témže místě.
   */
  cekam?: boolean;
}) {
  const [z, setZ] = useState(15);
  const [kde, setKde] = useState(stred);
  /**
   * Podklad. <b>Satelit u bójí pomáhá</b> (Filip, 11. 10. 2026): mola,
   * ostrůvky a břehy jsou na snímku vidět tak, jak je člověk uvidí
   * z lodi, kdežto v mapě je to jen obrys.
   */
  const [satelit, setSatelit] = useState(false);
  /**
   * Kotva tahu je v `ref`, ne ve stavu. Stav se projeví až po
   * překreslení, takže při svižném tahu dorazí `pointermove` dřív, než
   * se `pointerdown` stihne zapsat — a mapa přeskočí nebo se nehne.
   */
  const tah = useRef<{ x: number; y: number } | null>(null);

  /**
   * Skutečný rozměr plochy. <b>Mřížka dlaždic se z něj počítá</b>, takže
   * se nesmí hádat: kdyby se vzal odhad, zbyl by u kraje prázdný pruh
   * nebo by se tahaly dlaždice, které nejsou vidět.
   */
  const plocha = useRef<HTMLDivElement>(null);
  const [rozmer, setRozmer] = useState({ sirka: sirkaObrazu, vyska: vyskaObrazu });

  useEffect(() => {
    // <b>Měří se při připojení, ne přes `ResizeObserver`.</b> Ten se při
    // připojení nespustil spolehlivě a mapa zůstávala na náhradním
    // rozměru. `getBoundingClientRect` hned po připojení je jisté;
    // posluchač na okno pak pokryje otočení telefonu.
    const zmer = () => {
      const sirka = Math.round(plocha.current?.getBoundingClientRect().width ?? 0);
      if (sirka > 0) setRozmer((p) => (p.sirka === sirka ? p : { sirka, vyska: vyskaProSirku(sirka) }));
    };
    zmer();
    window.addEventListener("resize", zmer);
    window.addEventListener("orientationchange", zmer);
    return () => {
      window.removeEventListener("resize", zmer);
      window.removeEventListener("orientationchange", zmer);
    };
  }, []);

  const strediste = doPixelu(kde.sirka, kde.delka, z);
  const levo = strediste.x - rozmer.sirka / 2;
  const nahore = strediste.y - rozmer.vyska / 2;

  const dlazdice: { klic: string; cesta: string; x: number; y: number }[] = [];
  const naSvete = 2 ** z;
  for (let tx = Math.floor(levo / DLAZDICE); tx <= Math.floor((levo + rozmer.sirka) / DLAZDICE); tx++)
    for (let ty = Math.floor(nahore / DLAZDICE); ty <= Math.floor((nahore + rozmer.vyska) / DLAZDICE); ty++) {
      if (tx < 0 || ty < 0 || tx >= naSvete || ty >= naSvete) continue;
      dlazdice.push({
        klic: `${z}-${tx}-${ty}`,
        cesta: `/dlazdice/${z}/${tx}/${ty}${satelit ? "?podklad=satelit" : ""}`,
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

  /**
   * <b>Mimo Orlík řekne tlačítko, ne až API.</b> Mez hlídá i server, ale
   * jeho věta mluví o prohozené šířce a délce — u křížku na mapě je to
   * nesmysl, protože prohodit se tam nedá nic.
   */
  const jeNaOrliku = naOrliku(kde.sirka, kde.delka);

  return (
    <div className="vyber-mapy">
      <div
        ref={plocha}
        className="plocha"
        style={{ height: rozmer.vyska }}
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
        <svg className="krizek" viewBox={`0 0 ${rozmer.sirka} ${rozmer.vyska}`} aria-hidden="true">
          <line x1={rozmer.sirka / 2 - 14} y1={rozmer.vyska / 2} x2={rozmer.sirka / 2 + 14} y2={rozmer.vyska / 2} />
          <line x1={rozmer.sirka / 2} y1={rozmer.vyska / 2 - 14} x2={rozmer.sirka / 2} y2={rozmer.vyska / 2 + 14} />
          <circle cx={rozmer.sirka / 2} cy={rozmer.vyska / 2} r={7} fill="none" />
        </svg>

        {/* Ovládání leží na mapě, ne pod ní (Filip, 11. 10. 2026).
            Pod mapou je člověk hledá a mezitím ztratí, kam koukal.
            `pointerdown` se zastaví, aby stisk tlačítka netáhl
            podkladem. */}
        <div className="ovladani" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Přiblížit"
            title="Přiblížit"
            onClick={() => priblizeni(1)}
            disabled={z >= Z_NEJVIC}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Oddálit"
            title="Oddálit"
            onClick={() => priblizeni(-1)}
            disabled={z <= Z_NEJMENE}
          >
            −
          </button>
          <button
            type="button"
            className="podklad"
            aria-pressed={satelit}
            onClick={() => setSatelit(!satelit)}
          >
            {satelit ? "Mapa" : "Satelit"}
          </button>
        </div>
      </div>

      <p className="poznamka">
        Křížek je bod, který vezmeš. Posouvej mapou pod ním.{" "}
        {kde.sirka.toFixed(5)}, {kde.delka.toFixed(5)} · {Math.round(naMetr)} m na pixel
      </p>

      <button
        type="button"
        className="velke"
        onClick={() => vyber(kde)}
        disabled={cekam || !jeNaOrliku}
      >
        {cekam ? "Zapisuji…" : jeNaOrliku ? "Vzít tenhle bod" : "Mimo Orlík — posuň mapu"}
      </button>
      <button type="button" className="zrusit" onClick={zrus} disabled={cekam}>
        Zpět
      </button>

      <p className="poznamka">
        Podklad{" "}
        {satelit ? (
          <a
            href="https://www.esri.com/en-us/legal/terms/full-master-agreement"
            target="_blank"
            rel="noopener noreferrer"
          >
            © Esri World Imagery
          </a>
        ) : (
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            © přispěvatelé OpenStreetMap
          </a>
        )}
        .
      </p>
    </div>
  );
}

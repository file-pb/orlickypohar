import type { Boje } from "@/lib/boje";

/**
 * Mapka trati: bóje nad mapovým podkladem.
 *
 * <b>Zadání od Filipa (9. 10. 2026):</b> *„ja bych chtel videt mapku trati
 * s bojemi"* — a na dotaz, jestli to může být podklad z Mapy.cz nebo
 * Googlu, padla OpenStreetMap: nechce klíč ani účet s fakturací.
 *
 * <b>Dlaždice jdou přes náš server</b> (`/dlazdice/{z}/{x}/{y}`), stejně
 * jako radar ČHMÚ. Kdyby si je tahal prohlížeč, odešla by IP každého, kdo
 * obrazovku otevře, na cizí server. Zdroj se tím dá vyměnit na jednom
 * místě — přepnutí na Mapy.com je adresa a klíč, ne přepis téhle
 * komponenty.
 *
 * <b>Celé serverové, bez javascriptu.</b> Mapa se neposouvá ani
 * nepřibližuje, protože by to znamenalo mapovou knihovnu v prohlížeči a
 * zbytek správy javascript nemá. Výřez se spočítá z bójí: ukáže právě
 * trať a kus vody kolem.
 *
 * <b>Projekce je Web Mercator</b> (EPSG:3857), tedy tatáž, ve které jsou
 * dlaždice — bez toho by bóje nad podkladem seděly jen náhodou.
 */

/** Hrana dlaždice v pixelech, jak je vydává OSM. */
const DLAZDICE = 256;

/** Rozsah přiblížení, který pouští i obslužná cesta dlaždic. */
const Z_NEJMENE = 10;
const Z_NEJVIC = 17;

/** Jak velký výřez se kreslí; výška se dopočítá podle tvaru trati. */
const SIRKA = 640;
const NEJVYSSI = 640;

/** Nejmenší plocha kolem trati, aby jedna bóje nebo těsný trojúhelník
 *  nevyšly na maximální přiblížení, kde není vidět nic než voda. */
const NEJMENSI_ROZPETI_M = 250;

const METRU_NA_STUPEN = 111_320;

/** Souřadnice → pixely světa při daném přiblížení (slippy map). */
function doPixelu(sirka: number, delka: number, z: number) {
  const n = DLAZDICE * 2 ** z;
  const x = ((delka + 180) / 360) * n;
  const radiany = (sirka * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(radiany) + 1 / Math.cos(radiany)) / Math.PI) / 2) * n;
  return { x, y };
}

/** Hezké číslo pro měřítko: 10, 20, 50, 100, 200, 500 m… */
function kulateMetry(hrube: number) {
  const rad = 10 ** Math.floor(Math.log10(Math.max(hrube, 1)));
  const podil = hrube / rad;
  return (podil >= 5 ? 5 : podil >= 2 ? 2 : 1) * rad;
}

export function MapkaTrati({ boje }: { boje: Boje[] }) {
  if (boje.length === 0) return null;

  const sirky = boje.map((b) => b.sirka);
  const delky = boje.map((b) => b.delka);
  const stredSirka = (Math.min(...sirky) + Math.max(...sirky)) / 2;
  const stredDelka = (Math.min(...delky) + Math.max(...delky)) / 2;
  const kosinus = Math.cos((stredSirka * Math.PI) / 180);

  // Rozpětí trati v metrech, s rezervou na popisky a kus vody kolem.
  const rozpetiM = Math.max(
    (Math.max(...sirky) - Math.min(...sirky)) * METRU_NA_STUPEN,
    (Math.max(...delky) - Math.min(...delky)) * METRU_NA_STUPEN * kosinus,
    NEJMENSI_ROZPETI_M,
  ) * 1.4;

  // Přiblížení, při kterém se rozpětí vejde do šířky výřezu. Metrů na pixel
  // je na rovníku 156543 a s šířkou se zmenšuje o kosinus.
  const naPixelPriZ0 = 156_543.03 * kosinus;
  const idealni = Math.log2((naPixelPriZ0 * SIRKA) / rozpetiM);
  const z = Math.max(Z_NEJMENE, Math.min(Z_NEJVIC, Math.floor(idealni)));

  const stred = doPixelu(stredSirka, stredDelka, z);
  const body = boje.map((b) => {
    const p = doPixelu(b.sirka, b.delka, z);
    return { boje: b, x: p.x - stred.x + SIRKA / 2, y: p.y - stred.y };
  });

  // Výška podle toho, jak je trať vysoká — ať se nekreslí pás vody navíc.
  const rozpetiY = Math.max(...body.map((b) => Math.abs(b.y))) * 2 + 120;
  const vyska = Math.round(Math.min(NEJVYSSI, Math.max(320, rozpetiY)));
  const posunute = body.map((b) => ({ ...b, y: b.y + vyska / 2 }));

  // Dlaždice, které výřez překrývají. Levý horní roh výřezu ve světě:
  const levo = stred.x - SIRKA / 2;
  const nahore = stred.y - vyska / 2;
  const naSvete = 2 ** z;
  const odX = Math.floor(levo / DLAZDICE);
  const doX = Math.floor((levo + SIRKA) / DLAZDICE);
  const odY = Math.floor(nahore / DLAZDICE);
  const doY = Math.floor((nahore + vyska) / DLAZDICE);

  const dlazdice: { klic: string; cesta: string; x: number; y: number }[] = [];
  for (let tx = odX; tx <= doX; tx++) {
    for (let ty = odY; ty <= doY; ty++) {
      if (tx < 0 || ty < 0 || tx >= naSvete || ty >= naSvete) continue;
      dlazdice.push({
        klic: `${z}-${tx}-${ty}`,
        cesta: `/dlazdice/${z}/${tx}/${ty}`,
        x: tx * DLAZDICE - levo,
        y: ty * DLAZDICE - nahore,
      });
    }
  }

  const vPoradi = [...posunute].sort((a, b) => a.boje.poradi - b.boje.poradi);
  const cara = vPoradi.map((b) => `${b.x.toFixed(1)},${b.y.toFixed(1)}`).join(" ");

  const metruNaPixel = naPixelPriZ0 / 2 ** z;
  const meritkoM = kulateMetry((SIRKA / 4) * metruNaPixel);
  const meritkoPx = meritkoM / metruNaPixel;

  const popis = vPoradi.map((b) => `${b.boje.poradi}. ${b.boje.nazev}`).join(", ");

  return (
    <figure className="mapka-trati">
      <svg
        viewBox={`0 0 ${SIRKA} ${vyska}`}
        role="img"
        aria-labelledby="mapka-nazev mapka-popis"
        className="mapka"
      >
        <title id="mapka-nazev">Mapka trati</title>
        <desc id="mapka-popis">
          {`Bóje v pořadí: ${popis}. Sever je nahoře, měřítko ${meritkoM} m.`}
        </desc>

        {dlazdice.map((d) => (
          <image
            key={d.klic}
            href={d.cesta}
            x={d.x}
            y={d.y}
            width={DLAZDICE}
            height={DLAZDICE}
          />
        ))}

        {/* Spojnice v pořadí objíždění. Čárkovaná schválně: je to pořadí,
            ne vytyčená dráha — kudy loď pluje, rozhoduje směr obeplutí. */}
        {posunute.length > 1 && (
          <polyline
            points={cara}
            fill="none"
            stroke="#c1121f"
            strokeWidth="3"
            strokeDasharray="8 6"
          />
        )}

        {posunute.map((b) => (
          <g key={b.boje.id}>
            {/* Bílý lem, ať je bóje vidět nad vodou i nad lesem. */}
            <circle cx={b.x} cy={b.y} r="8" fill="#c1121f" stroke="#fff" strokeWidth="3" />
            <text
              x={b.x}
              y={b.y - 15}
              textAnchor="middle"
              fontSize="14"
              fill="#1a1a1a"
              stroke="#fff"
              strokeWidth="3.5"
              paintOrder="stroke"
            >
              {b.boje.poradi}. {b.boje.nazev}
            </text>
          </g>
        ))}

        {/* Měřítko. Bez něj je mapka bez rozměru jen obrázek. */}
        <g stroke="#1a1a1a" strokeWidth="2" fill="#1a1a1a">
          <line x1={16} y1={vyska - 16} x2={16 + meritkoPx} y2={vyska - 16} />
          <line x1={16} y1={vyska - 21} x2={16} y2={vyska - 11} />
          <line x1={16 + meritkoPx} y1={vyska - 21} x2={16 + meritkoPx} y2={vyska - 11} />
          <text
            x={16 + meritkoPx / 2}
            y={vyska - 23}
            textAnchor="middle"
            fontSize="12"
            stroke="#fff"
            strokeWidth="3"
            paintOrder="stroke"
          >
            {meritkoM} m
          </text>
        </g>
      </svg>

      {/* Uvedení zdroje chtějí pravidla OSM a je to i slušnost. */}
      <figcaption className="detail">
        Podklad{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          © přispěvatelé OpenStreetMap
        </a>
        . Sever nahoře. Mapka se neposouvá — ukazuje právě trať a kus vody
        kolem; kde přesně bóje leží, otevře odkaz na mapu u každé z nich.
      </figcaption>
    </figure>
  );
}

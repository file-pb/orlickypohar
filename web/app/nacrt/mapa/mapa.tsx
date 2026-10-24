"use client";

/**
 * Náčrt živé mapy — klikatelná, s falešnou rozjížďkou.
 *
 * <b>K čemu to je</b> (PLAN.md, *Jak se trackování zobrazuje*): rozprava
 * 24. 10. 2026 rozhodla, jak se tracking ukazuje, ale několik těch
 * rozhodnutí se na papíře ověřit nedá — jak vypadá čtyřicet stop, které se
 * potkají u bóje, jestli je šedá tenká stopa ještě vidět, a jestli se
 * v pomyslném pořadí vede mění dost na to, aby to bavilo. Náčrt je levnější
 * odpověď než wireframe a pravdivější.
 *
 * <b>Co je tu doopravdy</b>: projekce z `lib/mapa.ts` a dlaždice přes
 * `/dlazdice`, tedy totéž, co kreslí mapku trati. <b>Co je nanečisto</b>:
 * data (`plavba.ts`), spojnice mezi značkami (přímá, ne po vodě) a pořadí
 * počítané v prohlížeči místo na serveru.
 */

import { useMemo, useRef, useState } from "react";
import { DLAZDICE, Z_NEJMENE, Z_NEJVIC, doPixelu } from "@/lib/mapa";
import type { Poloha } from "@/lib/voda";
import type { Lod, Znacka } from "./plavba";

/** Jak staré smí být hlášení, než loď přestane být čerstvá. */
const STARNE_PO_S = 60;
/** A kdy propadne nakonec. */
const NEDOSTUPNA_PO_S = 300;
/**
 * Barva lodi. <b>Pevně podle pořadí v poli</b>, ne podle pozice v seznamu
 * — jinak by loď při každém prohození změnila barvu a oko by ji ztratilo.
 * Zlatý úhel rozhází odstíny tak, aby sousední lodě nebyly podobné.
 */
function barva(id: number) {
  return `hsl(${(id * 137.508) % 360} 72% 45%)`;
}

/**
 * Jak silně kreslit stopu lodi, o které byla řeč před `kolikDavno` focusy.
 * Nula je ta právě vybraná a kreslí se jinde, plně.
 */
const DOZNIVANI = [1, 0.45, 0.22];

type Stav = "cerstva" | "starnouci" | "nedostupna";

function stav(stariS: number | null): Stav {
  if (stariS === null || stariS > NEDOSTUPNA_PO_S) return "nedostupna";
  return stariS > STARNE_PO_S ? "starnouci" : "cerstva";
}

/**
 * Postup po trase: kolmý průmět na lomenou čáru značek, v metrech od
 * startu. <b>Monotónní</b> — bere se průmět nejblíž tomu předchozímu, aby
 * pořadí u bóje neskákalo mezi příchozí a odchozí nohou (PLAN.md, *Co je
 * post*).
 */
function postupPoTrase(
  uzly: { x: number; y: number }[],
  delkyNoh: number[],
  bod: { x: number; y: number },
  predchozi: number,
): number {
  let nej = predchozi;
  let nejVzdalenost = Infinity;
  let zaSebou = 0;

  for (let i = 0; i < uzly.length - 1; i++) {
    const a = uzly[i];
    const b = uzly[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const delka2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((bod.x - a.x) * dx + (bod.y - a.y) * dy) / delka2));
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const vzdalenost = Math.hypot(bod.x - px, bod.y - py);
    const postup = zaSebou + t * delkyNoh[i];

    // Trest za couvání: průmět dozadu musí být zřetelně bližší, aby vyhrál.
    const trest = postup < predchozi ? 60 : 0;
    if (vzdalenost + trest < nejVzdalenost) {
      nejVzdalenost = vzdalenost + trest;
      nej = postup;
    }
    zaSebou += delkyNoh[i];
  }
  return nej;
}

const SIRKA = 880;
const VYSKA = 560;

/** Přiblížení, při kterém se celá trať vejde do výřezu i s rezervou. */
function vychoziZ(znacky: Znacka[]) {
  const sirky = znacky.map((m) => m.sirka);
  const delky = znacky.map((m) => m.delka);
  const stredSirka = (Math.min(...sirky) + Math.max(...sirky)) / 2;
  const kosinus = Math.cos((stredSirka * Math.PI) / 180);
  const METRU_NA_STUPEN = 111_320;
  const rozpetiX = (Math.max(...delky) - Math.min(...delky)) * METRU_NA_STUPEN * kosinus;
  const rozpetiY = (Math.max(...sirky) - Math.min(...sirky)) * METRU_NA_STUPEN;
  const naPixelPriZ0 = 156_543.03 * kosinus;
  const podleX = Math.log2((naPixelPriZ0 * SIRKA) / (rozpetiX * 1.6));
  const podleY = Math.log2((naPixelPriZ0 * VYSKA) / (rozpetiY * 1.6));
  return Math.max(Z_NEJMENE, Math.min(Z_NEJVIC, Math.floor(Math.min(podleX, podleY))));
}

export function NacrtMapy({
  znacky,
  lode,
  trasa,
  spojnice,
}: {
  znacky: Znacka[];
  lode: Lod[];
  /** Měřicí trasa po vodě, ze serveru. Divák ji nevidí. */
  trasa: Poloha[];
  /** Spojnice trati z návrháře, pro každé přiblížení. Tahle se ukazovat smí. */
  spojnice: Record<number, Poloha[][]>;
}) {
  const [z, setZ] = useState(() => vychoziZ(znacky));
  const [stred, setStred] = useState({
    sirka: znacky.reduce((s, m) => s + m.sirka, 0) / znacky.length,
    delka: znacky.reduce((s, m) => s + m.delka, 0) / znacky.length,
  });
  const [vybrana, setVybrana] = useState<number | null>(null);
  /**
   * Lodě, o kterých byla řeč, od nejnovější. <b>Stopa nemizí hned</b>
   * (Filip, 24. 10. 2026): když se focus přesune jinam, předchozí loď
   * ještě chvíli slábne, takže je vidět souboj, ne jen jeho vítěz.
   */
  const [historie, setHistorie] = useState<number[]>([]);
  const [jenPosledni, setJenPosledni] = useState(false);
  const [cas, setCas] = useState(600);
  const [jenTuhle, setJenTuhle] = useState(false);

  function vyber(id: number | null) {
    setVybrana(id);
    if (id !== null) setHistorie((h) => [id, ...h.filter((x) => x !== id)].slice(0, 3));
  }
  const [trasaVidet, setTrasaVidet] = useState(false);
  const [tratVidet, setTratVidet] = useState(true);
  const [pruhlednost, setPruhlednost] = useState(0.25);
  const tahne = useRef<{ x: number; y: number } | null>(null);

  const konec = useMemo(
    () => Math.max(...lode.map((l) => l.body.at(-1)?.cas ?? 0)),
    [lode],
  );

  const stredPx = doPixelu(stred.sirka, stred.delka, z);

  /**
   * Souřadnice se <b>zaokrouhlují na desetinu pixelu</b>, a ne kvůli
   * velikosti DOM: `doPixelu` počítá přes `Math.log` a `Math.atan`, a Node
   * se s prohlížečem rozchází v posledním bitu. React to hlásí jako
   * neshodu při hydrataci. Desetina pixelu je pod rozlišením obrazovky,
   * takže se tím nic neztratí.
   */
  const naPlatno = (sirka: number, delka: number) => {
    const p = doPixelu(sirka, delka, z);
    return {
      x: Math.round((p.x - stredPx.x + SIRKA / 2) * 10) / 10,
      y: Math.round((p.y - stredPx.y + VYSKA / 2) * 10) / 10,
    };
  };

  // <b>Postup se měří po trase, ne po přímkách mezi značkami.</b> Přímka
  // mezi bójemi vede v zatopeném údolí přes kopec a loď, která ho objíždí,
  // by měla v pořadí propadnout za někoho, kdo ji nepředjel.
  const uzly = trasa.map((p) => naPlatno(p.sirka, p.delka));
  const delkyNoh = uzly.slice(0, -1).map((a, i) => Math.hypot(uzly[i + 1].x - a.x, uzly[i + 1].y - a.y));

  /** Stav každé lodi k zvolenému času: poloha, stáří, postup, stopa. */
  const vStavu = useMemo(() => {
    return lode.map((lod) => {
      const doIndexu = lod.body.findIndex((b) => b.cas > cas);
      const konecIndex = (doIndexu === -1 ? lod.body.length : doIndexu) - 1;
      // Server zná jen to, co došlo: min(čas, hranice doručení).
      const videnoDo = Math.min(konecIndex, lod.dosloDo - 1);
      const posledni = videnoDo >= 0 ? lod.body[videnoDo] : null;
      const stariS = posledni ? cas - posledni.cas : null;

      const stopa = videnoDo >= 0 ? lod.body.slice(0, videnoDo + 1) : [];
      let postup = 0;
      const vPixelech = stopa.map((b) => naPlatno(b.sirka, b.delka));
      for (const p of vPixelech) postup = postupPoTrase(uzly, delkyNoh, p, postup);

      // Rychlost a kurz z posledních dvou hlášení. Z jednoho bodu se
      // spočítat nedají a vymýšlet se nebudou — karta pak řekne „neznámá".
      const predtim = videnoDo >= 1 ? lod.body[videnoDo - 1] : null;
      let rychlostUzlu: number | null = null;
      let kurz: number | null = null;
      if (posledni && predtim) {
        const kosinus = Math.cos((posledni.sirka * Math.PI) / 180);
        const dx = (posledni.delka - predtim.delka) * 111_320 * kosinus;
        const dy = (posledni.sirka - predtim.sirka) * 111_320;
        const dt = posledni.cas - predtim.cas || 1;
        rychlostUzlu = Math.hypot(dx, dy) / dt / 0.5144;
        kurz = (Math.round((Math.atan2(dx, dy) * 180) / Math.PI) + 360) % 360;
      }

      return {
        lod,
        poloha: posledni ? naPlatno(posledni.sirka, posledni.delka) : null,
        stariS,
        stav: stav(stariS),
        postup,
        stopa: vPixelech,
        rychlostUzlu,
        kurz,
      };
    });
  }, [lode, cas, z, stred.sirka, stred.delka]);

  /**
   * Pomyslné pořadí. <b>Nedostupné propadnou nakonec</b>, stárnoucí si
   * pozici drží (PLAN.md, *Loď, která nehlásí*).
   */
  const poradi = [...vStavu].sort((a, b) => {
    const dolu = (x: typeof a) => (x.stav === "nedostupna" ? 1 : 0);
    if (dolu(a) !== dolu(b)) return dolu(a) - dolu(b);
    return b.postup - a.postup;
  });

  // Dlaždice překrývající výřez.
  const levo = stredPx.x - SIRKA / 2;
  const nahore = stredPx.y - VYSKA / 2;
  const naSvete = 2 ** z;
  const dlazdice = [];
  for (let tx = Math.floor(levo / DLAZDICE); tx <= Math.floor((levo + SIRKA) / DLAZDICE); tx++) {
    for (let ty = Math.floor(nahore / DLAZDICE); ty <= Math.floor((nahore + VYSKA) / DLAZDICE); ty++) {
      if (tx < 0 || ty < 0 || tx >= naSvete || ty >= naSvete) continue;
      dlazdice.push({
        klic: `${z}-${tx}-${ty}`,
        cesta: `/dlazdice/${z}/${tx}/${ty}`,
        x: tx * DLAZDICE - levo,
        y: ty * DLAZDICE - nahore,
      });
    }
  }

  function posunMapu(dx: number, dy: number) {
    const n = DLAZDICE * 2 ** z;
    setStred((s) => {
      const p = doPixelu(s.sirka, s.delka, z);
      const x = p.x - dx;
      const y = p.y - dy;
      const delka = (x / n) * 360 - 180;
      const radiany = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
      return { sirka: (radiany * 180) / Math.PI, delka };
    });
  }

  const vybranaLod = vStavu.find((v) => v.lod.id === vybrana) ?? null;

  return (
    <div className="nacrt">
      <div className="nacrt-mapa">
        <div className="nacrt-platno-obal">
        <svg
          viewBox={`0 0 ${SIRKA} ${VYSKA}`}
          className="nacrt-platno"
          onPointerDown={(e) => {
            tahne.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!tahne.current) return;
            const merítko = SIRKA / e.currentTarget.getBoundingClientRect().width;
            posunMapu(
              (e.clientX - tahne.current.x) * merítko,
              (e.clientY - tahne.current.y) * merítko,
            );
            tahne.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={() => (tahne.current = null)}
          onPointerLeave={() => (tahne.current = null)}
        >
          {dlazdice.map((d) => (
            <image key={d.klic} href={d.cesta} x={d.x} y={d.y} width={DLAZDICE} height={DLAZDICE} />
          ))}

          {/*
            Spojnice trati z návrháře — <b>vyladěná a ukazovat se smí</b>:
            vede po vodě, naznačuje obeplutí značky a říká, kudy se jede.
            Je to něco jiného než měřicí trasa pod ní.
          */}
          {tratVidet &&
            (spojnice[z] ?? []).map((tah, i) => (
              <polyline
                key={i}
                points={tah
                  .map((p) => {
                    const q = naPlatno(p.sirka, p.delka);
                    return `${q.x},${q.y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#fff"
                strokeWidth={2.5}
                strokeDasharray="9 7"
                strokeLinecap="round"
                opacity={0.9}
                style={{ filter: "drop-shadow(0 0 2px rgb(0 0 0 / 55%))" }}
              />
            ))}

          {/*
            Trasa, podle které se počítá pořadí. <b>Divák ji nevidí</b>
            (Filip, 24. 10. 2026) — je to podklad výpočtu, ne část trati,
            a nakreslená by tvrdila, že se po ní jede. V náčrtu jde zapnout,
            protože bez ní se nedá posoudit, jestli měří rozumně.
          */}
          {trasaVidet && (
          <polyline
            points={uzly.map((u) => `${u.x},${u.y}`).join(" ")}
            fill="none"
            stroke="#fff"
            strokeWidth={3}
            strokeDasharray="10 7"
            opacity={0.9}
            style={{ filter: "drop-shadow(0 0 2px rgb(0 0 0 / 60%))" }}
          />
          )}

          {/* Ostatní lodě: celá dráha, barevně a hodně průhledně. */}
          {vStavu
            .filter((v) => v.lod.id !== vybrana && !(jenTuhle && vybrana !== null))
            .map((v) => {
              if (!v.poloha) return null;
              const davno = historie.indexOf(v.lod.id);
              // V režimu „jen poslední" dostane stopu jen loď z historie;
              // ostatní zůstanou tečkou, ať je vidět, že tam pořád jsou.
              const silaStopy = jenPosledni
                ? davno > 0
                  ? DOZNIVANI[davno]
                  : 0
                : pruhlednost;
              return (
                <g
                  key={v.lod.id}
                  onClick={() => vyber(v.lod.id)}
                  style={{ cursor: "pointer" }}
                >
                  {v.stopa.length > 1 && silaStopy > 0 && (
                    <polyline
                      points={v.stopa.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={barva(v.lod.id)}
                      strokeWidth={davno > 0 ? 2.5 : 2}
                      opacity={silaStopy}
                      strokeLinejoin="round"
                    />
                  )}
                  <circle
                    cx={v.poloha.x}
                    cy={v.poloha.y}
                    r={5}
                    fill={barva(v.lod.id)}
                    stroke="#fff"
                    strokeWidth={1.5}
                    opacity={v.stav === "nedostupna" ? 0.45 : jenPosledni && davno < 0 ? 0.55 : 1}
                  />
                </g>
              );
            })}

          {vybranaLod?.poloha && (
            <g>
              <polyline
                points={vybranaLod.stopa.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={barva(vybranaLod.lod.id)}
                strokeWidth={3.5}
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 3px rgb(255 255 255 / 85%))" }}
              />
              <circle
                cx={vybranaLod.poloha.x}
                cy={vybranaLod.poloha.y}
                r={8}
                fill={barva(vybranaLod.lod.id)}
                stroke="#fff"
                strokeWidth={2.5}
              />
            </g>
          )}

          {/* Značky až navrch, ať je přes ně nic nekreslí. */}
          {znacky.map((m) => {
            const p = naPlatno(m.sirka, m.delka);
            return (
              <g key={m.poradi}>
                <circle cx={p.x} cy={p.y} r={7} fill="#f08c00" stroke="#fff" strokeWidth={2} />
                <text x={p.x + 11} y={p.y + 4} className="nacrt-znacka">
                  {m.poradi}. {m.nazev}
                </text>
              </g>
            );
          })}
        </svg>

        {vybranaLod && (
          <div className="nacrt-karta">
            <div className="nacrt-karta-hlava">
              <strong>{vybranaLod.lod.nazev}</strong>
              <span className="nacrt-kategorie">{vybranaLod.lod.kategorie}</span>
              <button type="button" onClick={() => setVybrana(null)} aria-label="zavřít">
                ×
              </button>
            </div>
            <dl>
              <div>
                <dt>poloha</dt>
                <dd className={`nacrt-${vybranaLod.stav}`}>
                  {vybranaLod.stariS === null
                    ? "nehlásí se"
                    : vybranaLod.stariS < 60
                      ? `před ${vybranaLod.stariS} s`
                      : `před ${Math.round(vybranaLod.stariS / 60)} min`}
                </dd>
              </div>
              <div>
                <dt>rychlost</dt>
                <dd>
                  {vybranaLod.rychlostUzlu === null
                    ? "neznámá"
                    : `${vybranaLod.rychlostUzlu.toFixed(1)} kt`}
                </dd>
              </div>
              <div>
                <dt>kurz</dt>
                <dd>{vybranaLod.kurz === null ? "neznámý" : `${vybranaLod.kurz}°`}</dd>
              </div>
            </dl>
          </div>
        )}
        </div>

        <div className="nacrt-ovladani">
          <button type="button" onClick={() => setZ((v) => Math.min(Z_NEJVIC, v + 1))}>
            přiblížit
          </button>
          <button type="button" onClick={() => setZ((v) => Math.max(Z_NEJMENE, v - 1))}>
            oddálit
          </button>
          <label>
            čas {Math.floor(cas / 60)}:{String(cas % 60).padStart(2, "0")}
            <input
              type="range"
              min={0}
              max={konec}
              step={10}
              value={cas}
              onChange={(e) => setCas(Number(e.target.value))}
            />
          </label>
          <label className="nacrt-prepinac">
            <input
              type="checkbox"
              checked={jenPosledni}
              onChange={(e) => setJenPosledni(e.target.checked)}
            />
            jen poslední tři, ostatní tečkou
          </label>
          <label hidden={jenPosledni}>
            průhlednost {pruhlednost.toFixed(2)}
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={pruhlednost}
              onChange={(e) => setPruhlednost(Number(e.target.value))}
            />
          </label>
          <label className="nacrt-prepinac">
            <input
              type="checkbox"
              checked={tratVidet}
              onChange={(e) => setTratVidet(e.target.checked)}
            />
            trať z návrháře
          </label>
          <label className="nacrt-prepinac">
            <input
              type="checkbox"
              checked={trasaVidet}
              onChange={(e) => setTrasaVidet(e.target.checked)}
            />
            měřicí trasa (na ostro neviditelná)
          </label>
          {vybrana !== null && (
            <label className="nacrt-prepinac">
              <input
                type="checkbox"
                checked={jenTuhle}
                onChange={(e) => setJenTuhle(e.target.checked)}
              />
              jen tuhle stopu
            </label>
          )}
        </div>
      </div>

      <aside className="nacrt-poradi">
        <h2>Pomyslné pořadí</h2>
        <p className="nacrt-vysvetlivka">
          Pořadí mezi loděmi, které hlásí polohu — ne pořadí závodu. O výsledku
          rozhoduje cíl.
        </p>
        <ol>
          {poradi.map((v, i) => (
            <li key={v.lod.id}>
              <button
                type="button"
                className={v.lod.id === vybrana ? "vybrana" : undefined}
                onClick={() => vyber(v.lod.id)}
              >
                <span className="nacrt-cislo">{v.stav === "nedostupna" ? "—" : i + 1}</span>
                <span className="nacrt-nazev">{v.lod.nazev}</span>
                <span className="nacrt-kategorie">{v.lod.kategorie}</span>
                <span className={`nacrt-stav nacrt-${v.stav}`}>
                  {v.stariS === null
                    ? "nehlásí se"
                    : v.stav === "cerstva"
                      ? `před ${v.stariS} s`
                      : `před ${Math.round(v.stariS / 60)} min`}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

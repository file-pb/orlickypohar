import { ZnakBoje } from "@/app/znak-boje";
import type { BarvaBoje, DruhZnaceni, TvarBoje } from "@/lib/boje";
import { NAZVY_SMERU, type SvetovaStrana } from "@/lib/trat";
import type { Stopa, TypStavby } from "@/lib/stavba-prvku";

/** Značka v náhledu. `cekajici` je ta, kterou stavitel teprve pípne. */
export type ZnackaNahledu = {
  barva?: BarvaBoje;
  tvar?: TvarBoje;
  znaceni?: DruhZnaceni;
  /** Jak se té značce říká — do popisku a tím i do `aria-label`. */
  jmeno: string;
  cekajici?: boolean;
};

const STUPNE: Record<NonNullable<SvetovaStrana>, number> = {
  S: 0,
  SV: 45,
  V: 90,
  JV: 135,
  J: 180,
  JZ: 225,
  Z: 270,
  SZ: 315,
};

/** Kde v náhledu značky stojí. Schematicky, ne podle souřadnic. */
function mista(typ: TypStavby): { x: number; y: number; r: number }[] {
  if (typ.body.length === 1) return [{ x: 170, y: 100, r: 13 }];
  if (typ.id === "Odskok")
    return [
      { x: 150, y: 96, r: 12 },
      { x: 196, y: 118, r: 9 },
    ];
  return [
    { x: 96, y: 100, r: 12 },
    { x: 244, y: 100, r: 12 },
  ];
}

/** Stopa lodi a hrot šipky pro daný předpis. */
function stopaPodle(stopa: Stopa): {
  d: string;
  hrot: string;
  vetve?: [string, string];
  hroty?: [string, string];
} | null {
  switch (stopa) {
    case "otoc":
      return {
        d: "M 300 176 Q 228 146 222 100 Q 216 56 150 56",
        hrot: "translate(150,56) rotate(-90)",
      };
    case "mine":
      return {
        d: "M 300 176 Q 222 140 222 100 Q 222 62 300 26",
        hrot: "translate(300,26) rotate(40)",
      };
    case "mezi":
      return { d: "M 170 180 L 170 32", hrot: "translate(170,32) rotate(0)" };
    case "branaOtocna":
      return {
        d: "M 170 180 L 170 118",
        hrot: "",
        vetve: [
          "M 170 118 Q 162 94 134 90 Q 100 86 96 48",
          "M 170 118 Q 178 94 206 90 Q 240 86 244 48",
        ],
        hroty: ["translate(96,48) rotate(0)", "translate(244,48) rotate(0)"],
      };
    case "dotek":
      return {
        d: "M 106 180 Q 170 132 170 104 Q 170 132 234 180",
        hrot: "translate(234,180) rotate(135)",
      };
    case "startSipka":
      // Šipka vede z poloviny linie ven: start je místo, odkud se vyráží.
      return { d: "M 170 100 L 170 36", hrot: "translate(170,32) rotate(0)" };
    case "cilSipka":
      // Hrotem do poloviny linie: cíl je místo, kam se doplouvá.
      return { d: "M 170 180 L 170 112", hrot: "translate(170,108) rotate(0)" };
    default:
      return null;
  }
}

/**
 * Náhled prvku, který se zrovna zadává (Filip, 10. 10. 2026: *„u toho
 * wizzardu by mohl být takový malý cartoon náhled toho prvku, co
 * zadávám"*).
 *
 * <b>Je to kontrola, ne ozdoba.</b> Ukazuje, co zadání znamená: kterou
 * stranou se to jede a kudy loď projede. Slovy se to plete — hlavně
 * u startu a cíle, kde šipka jednou vede z linie ven a podruhé do ní.
 *
 * <para>
 * <b>Kreslí se schematicky, ne podle souřadnic.</b> Skutečnou polohu
 * ukazuje mapa; tenhle obrázek má ukázat tvar pravidla, a ten je stejný,
 * ať je brána široká deset metrů nebo sto.
 * </para>
 *
 * <para>
 * <b>U otočné brány se nekreslí jedna správná stopa, ale dvě
 * přerušované.</b> Stranu, okolo které se loď otočí, si volí posádka
 * (Filip, 10. 10. 2026) — jedna plná čára by tvrdila něco, co rozhodčí
 * neurčil.
 * </para>
 */
export function NahledPrvku({
  typ,
  stopa,
  znacky,
  smer,
  popisek,
}: {
  typ: TypStavby;
  /** Jak se to jede. `null`, dokud předpis není zvolený. */
  stopa: Stopa | null;
  /** Značky v pořadí, v jakém se pípají. Kratší pole = ještě se staví. */
  znacky: ZnackaNahledu[];
  smer: SvetovaStrana;
  popisek: string;
}) {
  const kde = mista(typ);
  const dvoubodovy = kde.length === 2;
  const kresba = stopa ? stopaPodle(stopa) : null;
  const otoceni =
    smer && (stopa === "startSipka" || stopa === "cilSipka")
      ? `rotate(${STUPNE[smer]} 170 100)`
      : undefined;

  return (
    <figure className="nahled-prvku">
      <svg viewBox="0 0 340 200" role="img" aria-label={popisek}>
        <rect x="0" y="0" width="340" height="200" className="hladina" />

        {/* Čára mezi značkami. Čárkovaně, protože to není nic ve vodě —
            je to jen spojnice, kterou si loď domyslí. */}
        {dvoubodovy && znacky.length === 2 && (
          <line
            x1={kde[0].x}
            y1={kde[0].y}
            x2={kde[1].x}
            y2={kde[1].y}
            className="linie"
          />
        )}

        {kresba && (
          <g transform={otoceni}>
            <path d={kresba.d} className="stopa" />
            {kresba.hrot && (
              <g transform={kresba.hrot}>
                <path d="M 0 -10 L 7 6 L -7 6 Z" className="hrot" />
              </g>
            )}
            {kresba.vetve?.map((d, i) => (
              <path key={i} d={d} className="stopa vetev" />
            ))}
            {kresba.hroty?.map((t, i) => (
              <g key={i} transform={t}>
                <path d="M 0 -8 L 6 5 L -6 5 Z" className="hrot vetev" />
              </g>
            ))}
          </g>
        )}

        {kde.map((m, i) => {
          const z = znacky[i];
          if (!z) return null;
          return (
            <g key={i} opacity={z.cekajici ? 0.45 : 1}>
              <ZnakBoje x={m.x} y={m.y} r={m.r} barva={z.barva} tvar={z.tvar} znaceni={z.znaceni} />
            </g>
          );
        })}
      </svg>
      <figcaption>
        {popisek}
        {smer && (stopa === "startSipka" || stopa === "cilSipka") && (
          <> · {NAZVY_SMERU[smer]}</>
        )}
      </figcaption>
    </figure>
  );
}

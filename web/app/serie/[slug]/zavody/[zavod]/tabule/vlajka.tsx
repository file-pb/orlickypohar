import { useId } from "react";

type Stav = "ceka" | "jede" | "dojeto" | "zruseno";

/** Kolik svislých výseků vlajku tvoří. Víc = plynulejší vlna, víc uzlů. */
const VYSEKU = 14;

/**
 * Signální vlajka podle stavu rozjížďky (Filip, 24. 10. 2026: *„udělej
 * tam zase nějaký hezký stavový semaforek nebo signální vlajky"*, *„neuměl
 * bys nějakou stylovou, třeba vlající?"*).
 *
 * <b>Vlajky, ne semafor, a skutečné</b>: jachtaři je znají z vody, takže
 * na tabuli nesou význam samy o sobě — ne barevné obdélníky, které by
 * vypadaly jako signál, ale žádný by nebyly:
 *
 * - **P** (modrá s bílým středem) — přípravný signál, čeká se na start;
 * - **S** (bílá s modrým středem) — zkrácená dráha; tady „dojeto",
 *   protože je to ta, kterou rozhodčí ukazuje, když je po závodě;
 * - **N** (modro-bílá šachovnice) — rozjížďka zrušena;
 * - **zelená** pro běžící rozjížďku: vlajka „právě se jede" neexistuje,
 *   protože na vodě to nikdo signalizovat nepotřebuje.
 *
 * <b>Vlaje po svislých výsecích.</b> Celá kresba je v `<symbol>` a vykreslí
 * se čtrnáctkrát, pokaždé oříznutá na jeden svislý pruh, který se houpe
 * s fázovým posunem — výsledek je vlna, která běží od žerdi k cípu. Je to
 * trik, ne fyzika, ale na televizi vypadá líp než statický obdélník
 * a nestojí nic: čtrnáct CSS animací bez javascriptu.
 */
export function VlajkaStavu({ stav }: { stav: Stav }) {
  const id = useId().replace(/:/g, "");
  const kresba = `vlajka-${id}`;

  return (
    <svg className={`vlajka vlajka-${stav}`} viewBox="0 0 34 22" aria-hidden="true">
      <defs>
        <symbol id={kresba} viewBox="0 0 30 20">
          {stav === "ceka" && (
            <>
              <rect width="30" height="20" fill="#1757a8" />
              <rect x="9" y="5" width="12" height="10" fill="#fff" />
            </>
          )}
          {stav === "jede" && <rect width="30" height="20" fill="#2f9e5e" />}
          {stav === "dojeto" && (
            <>
              <rect width="30" height="20" fill="#fff" />
              <rect x="9" y="5" width="12" height="10" fill="#1757a8" />
            </>
          )}
          {stav === "zruseno" && (
            <>
              <rect width="30" height="20" fill="#fff" />
              {[0, 1, 2, 3].map((x) =>
                [0, 1, 2].map((y) =>
                  (x + y) % 2 === 0 ? (
                    <rect
                      key={`${x}-${y}`}
                      x={x * 7.5}
                      y={y * 6.67}
                      width="7.5"
                      height="6.67"
                      fill="#1757a8"
                    />
                  ) : null,
                ),
              )}
            </>
          )}
        </symbol>
      </defs>

      {/* Žerď: bez ní vlajka vlaje ve vzduchoprázdnu. */}
      <rect x="0" y="0" width="1.2" height="22" rx="0.6" fill="currentColor" opacity="0.7" />

      {Array.from({ length: VYSEKU }, (_, i) => {
        const sirka = 30 / VYSEKU;
        return (
          <g
            key={i}
            className="vlajka-vysek"
            style={{ animationDelay: `${(i / VYSEKU) * -1.6}s` }}
          >
            <svg x={1.6 + i * sirka} y="1" width={sirka + 0.05} height="20" overflow="hidden">
              <use href={`#${kresba}`} x={-i * sirka} y="0" width="30" height="20" />
            </svg>
          </g>
        );
      })}
    </svg>
  );
}

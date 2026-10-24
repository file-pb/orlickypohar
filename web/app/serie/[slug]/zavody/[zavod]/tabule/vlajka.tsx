/**
 * Signální vlajka podle stavu rozjížďky (Filip, 24. 10. 2026: *„udělej
 * tam zase nějaký hezký stavový semaforek nebo signální vlajky"*).
 *
 * <b>Vlajky, ne semafor, a skutečné</b>: jachtaři je znají z vody, takže
 * na tabuli nesou význam samy o sobě. Použité jsou ty, které opravdu
 * něco takového znamenají — ne barevné obdélníky, které by vypadaly jako
 * signál, ale žádný by nebyly:
 *
 * - **P** (modrá s bílým středem) — přípravný signál, čeká se na start;
 * - **S** (bílá s modrým středem) — zkrácená dráha; tady „dojeto",
 *   protože je to ta, kterou rozhodčí ukazuje, když je po závodě;
 * - **N** (modro-bílá šachovnice) — rozjížďka zrušena;
 * - **zelená** pro běžící rozjížďku: žádná signální vlajka „právě se
 *   jede" neexistuje, protože na vodě to nikdo signalizovat nepotřebuje.
 *   Je proto schválně prostá, aby se nepletla s těmi ostatními.
 */
export function VlajkaStavu({ stav }: { stav: "ceka" | "jede" | "dojeto" | "zruseno" }) {
  return (
    <svg className={`vlajka vlajka-${stav}`} viewBox="0 0 30 20" aria-hidden="true">
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
      {/* Lem, aby bílá vlajka nesplynula s podkladem. */}
      <rect width="30" height="20" fill="none" stroke="rgb(0 0 0 / 35%)" strokeWidth="1" />
    </svg>
  );
}

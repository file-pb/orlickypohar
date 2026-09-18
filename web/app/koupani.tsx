import { nactiKoupani, STRANKA_KOUPANI, STUPNE } from "@/lib/koupani";

/**
 * Kvalita vody ke koupání od hygieniků. Do 18. 9. 2026 byla pod teplotou
 * vody, pak samostatný widget (Filip). Jen v sezóně, jinak se schová.
 *
 * Místa po stupních, nejhorší první — to má zajímat. Po stupních, ne po
 * místech: šest řádků „vhodná ke koupání" bylo nejvyšší kus boku a neříkalo
 * nic navíc.
 */

const datumKratce = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", timeZone: "Europe/Prague" });

export async function BokKoupani() {
  const koupani = await nactiKoupani();
  if (koupani.length === 0) return null;

  return (
    <section className="koupani">
      <h2 className="bok-nadpis">Kvalita ke koupání</h2>
      <ul>
        {[...new Set(koupani.map((k) => k.stupen))]
          .sort((a, b) => b - a)
          .map((stupen) => (
            <li key={stupen}>
              <span className={`koupani-tecka stupen-${stupen}`} aria-hidden="true" />
              <span>
                <span className="koupani-stupen">{STUPNE[stupen]}</span>
                <span className="koupani-misto">
                  {koupani
                    .filter((k) => k.stupen === stupen)
                    .map((k) => k.misto)
                    .join(", ")}
                </span>
              </span>
            </li>
          ))}
      </ul>
      <p className="bok-dal">
        <a href={STRANKA_KOUPANI} target="_blank" rel="noopener noreferrer">
          Hygiena · odběr {datumKratce(koupani.map((k) => k.datum).sort().at(-1)!)}
        </a>
      </p>
    </section>
  );
}

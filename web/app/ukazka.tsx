/**
 * Pruh, který nahlas říká, že data nejsou skutečná.
 *
 * Ročník nanečisto má **skutečná jména lodí a vymyšlené výsledky**. Jediné,
 * co to dnes prozrazuje, je „(nanečisto)" v názvu — a to je málo ve chvíli,
 * kdy se odkaz pošle pořadatelům. První vlna připomínek by jinak byla o tom,
 * že něčí loď má blbé pořadí, což je zpětná vazba, kterou nikdo nechce.
 *
 * Které ročníky to jsou, říká proměnná prostředí `UKAZKOVE_SERIE` (slugy
 * oddělené čárkou). Až se ukazovat přestanou, stačí ji smazat z compose —
 * není kvůli tomu potřeba sahat do kódu ani do databáze.
 */
const UKAZKOVE = (process.env.UKAZKOVE_SERIE ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function jeUkazka(slug: string) {
  return UKAZKOVE.includes(slug);
}

export function PruhUkazky({ slug }: { slug: string }) {
  if (!jeUkazka(slug)) return null;

  return (
    <p className="ukazka">
      <b>Data nejsou skutečná.</b> Jména lodí a zastávek sedí, ale výsledky
      jsou vygenerované — ročník slouží ke zkoušení webu, než dorazí výsledky
      od rozhodčího.
    </p>
  );
}

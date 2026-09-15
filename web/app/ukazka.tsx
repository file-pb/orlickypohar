/**
 * Proužek nad hlavičkou, který nahlas říká, že data nejsou skutečná.
 *
 * Ročník nanečisto má **skutečná jména lodí a vymyšlené výsledky**. Jediné,
 * co to jinak prozrazuje, je „(nanečisto)" v názvu — a to je málo ve chvíli,
 * kdy se odkaz pošle pořadatelům. První vlna připomínek by jinak byla o tom,
 * že něčí loď má blbé pořadí, což je zpětná vazba, kterou nikdo nechce.
 *
 * <b>Jeden proužek pro celý web, nahoře nad menu</b> (Filip, 15. 9. 2026).
 * Dřív byl pruh na každé stránce ročníku zvlášť a rozbíjel design; takhle
 * se řekne jednou a pod ním je čistá stránka.
 *
 * Ukáže se, jakmile proměnná prostředí `UKAZKOVE_SERIE` obsahuje aspoň
 * jeden slug. Až se ukázková data přestanou ukazovat, stačí ji smazat
 * z compose — není kvůli tomu potřeba sahat do kódu ani do databáze.
 */
const UKAZKOVE = (process.env.UKAZKOVE_SERIE ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function PruhUkazky() {
  if (UKAZKOVE.length === 0) return null;

  return (
    <p className="ukazka">
      <b>Data nejsou skutečná.</b> Jména lodí a zastávek sedí, ale výsledky jsou vygenerované
    </p>
  );
}

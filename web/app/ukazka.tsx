"use client";

import { usePathname } from "next/navigation";

/**
 * Proužek nad hlavičkou, který nahlas říká, že data nejsou skutečná.
 *
 * Ročník nanečisto má **skutečná jména lodí a pořadí v kategoriích ze sešitu
 * rozhodčího** (od 22. 9. 2026), ale vymyšlené rozjížďky. Jediné,
 * co to jinak prozrazuje, je „(nanečisto)" v názvu — a to je málo ve chvíli,
 * kdy se odkaz pošle pořadatelům. První vlna připomínek by jinak byla o tom,
 * že něčí loď má blbé pořadí, což je zpětná vazba, kterou nikdo nechce.
 *
 * <b>Jeden proužek pro celý web, nahoře nad menu</b> (Filip, 15. 9. 2026).
 * Dřív byl pruh na každé stránce ročníku zvlášť a rozbíjel design; takhle
 * se řekne jednou a pod ním je čistá stránka.
 *
 * <b>Od 9. 10. 2026 se váže na ročník, o kterém stránka je.</b> Dřív stačilo,
 * že `UKAZKOVE_SERIE` není prázdná, a pruh visel nad celým webem — a protože
 * je ročník 2027 publikovaný od 8. 10. 2026 a `nactiSerie` ho vrací první,
 * tvrdil pruh už tehdy o termínové listině od rozhodčího, že je vymyšlená.
 * Vypnout to šlo jedině tak, že o varování přijde i ročník nanečisto.
 *
 * Klientský kvůli jedinému údaji — aktuální cestě, ze stejného důvodu jako
 * `OdkazJinam`: layout se renderuje na serveru a o cestě nic neví, a hlavička
 * vykreslovaná na každé stránce zvlášť by byly kopie navigace, které se
 * rozejdou.
 */
export function PruhUkazky({
  ukazkove,
  ukazkovyNekde,
}: {
  ukazkove: string[];
  ukazkovyNekde: boolean;
}) {
  if (!patriPruh(usePathname(), ukazkove, ukazkovyNekde)) return null;

  return (
    <p className="ukazka">
      <b>Ukázková data.</b> Pořadí v seriálu je podle sešitu rozhodčího, jednotlivé rozjížďky
      jsou vygenerované
    </p>
  );
}

/**
 * Patří nad tuhle cestu pruh? Čistá funkce, aby se na to dalo odpovědět bez
 * spuštěného webu.
 *
 * - `/serie/{slug}` a `/sprava/{slug}` jsou stránky jednoho ročníku, takže
 *   rozhoduje jeho slug. Správa taky: kdo píše článek do ročníku nanečisto,
 *   má to vědět.
 * - **Úvod je smíšený.** Ukazuje nejnovější ročník, ale pořadí a novinky bere
 *   z předchozího, dokud je nejnovější nemá (`poradiZ` a `novinkyZ`
 *   v `app/page.tsx`) — ukázková data se tam tedy objeví i tehdy, když
 *   nejnovější ročník ukázkový není. Proto na úvodu stačí, že je ukázkový
 *   **některý** publikovaný ročník. Je to varování navíc, ne chybějící, a mizí
 *   vyndáním slugu z `UKAZKOVE_SERIE`.
 * - **Nikde jinde pruh není.** `/historie` vypisuje ročníky jmény, která
 *   „(nanečisto)" nesou sama; obecný článek ani `/moje-lode` k ročníku
 *   nepatří, takže by pruh nad dvěma ročníky nevěděl, o kterém mluví.
 */
export function patriPruh(cesta: string, ukazkove: string[], ukazkovyNekde: boolean): boolean {
  if (ukazkove.length === 0) return false;

  // Pozor na `/sprava/naklady` a `/sprava/opravneni-webu` — ty ročník nemají
  // a do seznamu se nikdy netrefí, takže je vyřadí sám.
  const rocnik = /^\/(?:serie|sprava)\/([^/]+)/.exec(cesta)?.[1];
  if (rocnik) return ukazkove.includes(decodeURIComponent(rocnik));

  return cesta === "/" && ukazkovyNekde;
}

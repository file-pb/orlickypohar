/**
 * Odběr polohy po dobu, co je obrazovka stavitele otevřená.
 *
 * <b>Proč odběr a ne dotaz při doteku.</b> `getCurrentPositionAsync`
 * odpoví podle toho, jestli má telefon družice — někdy za dvě vteřiny,
 * někdy za třicet (měří to `tracker/uloha.ts` přes `propichni`). Stavitel
 * by tak buď čekal s prstem nad tlačítkem, nebo by dostal uloženou polohu
 * z minulé chvíle. Odběr běží na pozadí obrazovky, takže v okamžiku
 * doteku je čerstvý fix po ruce — a jestli doopravdy čerstvý je, rozhodne
 * `lib/stavba/poloha.ts`, ne tenhle soubor.
 *
 * <para>
 * <b>Jen na popředí.</b> Sledování na pozadí má appka kvůli trase a stojí
 * na vlastním oprávnění i sdělení posádce; stavba trati ho nepotřebuje,
 * protože stavitel se na obrazovku dívá.
 * </para>
 */
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import type { Fix } from '@/lib/stavba/poloha';
import { zadejPopredi } from '@/lib/tracker/uloha';

export type StavPolohy = {
  fix: Fix | null;
  /** `ceka` dokud se systém nezeptal, pak `ano` nebo `ne`. */
  opravneni: 'ceka' | 'ano' | 'ne';
};

export function usePoloha(bezi: boolean): StavPolohy {
  const [fix, setFix] = useState<Fix | null>(null);
  const [opravneni, setOpravneni] = useState<'ceka' | 'ano' | 'ne'>('ceka');
  // Odběr se drží v ref, ne ve stavu: odhlašuje se při úklidu efektu
  // a překreslení s ním nemá co dělat.
  const odber = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!bezi) return;
    let zivy = true;

    (async () => {
      // <b>Přes `zadejPopredi`, ne přímo na Expo.</b> Tahle cesta byla do
      // 22. 11. 2026 jediná, kudy si appka řekla o polohu bez jediného
      // slova vysvětlení — systémový dotaz vyskočil uprostřed stavby
      // trati a nebylo z něj poznat, k čemu.
      const stav = await zadejPopredi();
      if (!zivy) return;
      if (stav !== 'ok') {
        setOpravneni('ne');
        return;
      }
      setOpravneni('ano');

      odber.current = await Location.watchPositionAsync(
        // `timeInterval` na iOSu nic neznamená (dokumentace `expo-location`,
        // SDK 57) — tam se nová poloha hlásí, když ji systém má. Na Androidu
        // vteřina stačí: stavitel klepne jednou za desítky vteřin.
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
        (p) => {
          setFix({
            sirka: p.coords.latitude,
            delka: p.coords.longitude,
            presnostM: p.coords.accuracy,
            kdy: p.timestamp,
          });
        },
      );
    })();

    return () => {
      zivy = false;
      odber.current?.remove();
      odber.current = null;
    };
  }, [bezi]);

  return { fix, opravneni };
}

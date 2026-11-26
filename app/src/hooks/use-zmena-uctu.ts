import { useEffect } from 'react';

import { naZmenuUctu } from '@/lib/klic-uctu';

/**
 * Zavolá `obnov`, kdykoliv se telefon napojí, odpojí nebo odhlásí.
 *
 * Pro místa, která stav účtu drží v `useData` a sama by se o změně
 * nedozvěděla: kebab v kořenovém rozvržení se připojí jednou za běh
 * appky a rozcestník zůstává v zásobníku pod obrazovkou *Mám kód*, takže
 * se po napojení znovu nenačte.
 */
export function useZmenaUctu(obnov: () => unknown) {
  useEffect(() => naZmenuUctu(() => void obnov()), [obnov]);
}

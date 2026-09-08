import { useCallback, useEffect, useState } from 'react';

/**
 * Načtení z API se třemi stavy, které obrazovka musí umět: načítá se,
 * spadlo to, jsou data. Bez knihovny schválně — appka má čtyři obrazovky
 * a každá dělá jeden dotaz.
 */
export function useData<T>(nacti: () => Promise<T | null>, klice: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacita, setNacita] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spust = useCallback(nacti, klice);

  const obnov = useCallback(async () => {
    setChyba(null);
    try {
      setData(await spust());
    } catch (e) {
      // Na vodě signál není. Zpráva musí říct, co se stalo, ne "Error".
      setChyba(e instanceof Error ? e.message : 'Data se nepodařilo načíst.');
    } finally {
      setNacita(false);
    }
  }, [spust]);

  useEffect(() => {
    setNacita(true);
    obnov();
  }, [obnov]);

  return { data, chyba, nacita, obnov };
}

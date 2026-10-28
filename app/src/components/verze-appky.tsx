import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useUpdates } from 'expo-updates';

import { Karta, Sekce } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import {
  aktualizaceJdou, kratkyOtisk, popisHledani, popisPuvodu, pouzijHned, puvod,
  zkusAktualizaci,
} from '@/lib/verze';

/**
 * Na čem appka jede — a čím si to ověřit.
 *
 * <b>Proč to tu je</b> (Filip, 28. 10. 2026: *„Jak Milos pozná ze se mu to
 * samo aktualizovalo?"*). Banner ohlásí změnu ve chvíli, kdy nastane;
 * tahle sekce odpoví tomu, kdo se ptá později — typicky když mu něco
 * nefunguje a je potřeba vědět, jestli má vůbec tu verzi, ve které je to
 * opravené. Bez toho je každý nález od rozhodčího podmíněný.
 *
 * <b>Je vidět i nepřihlášenému.</b> Otázka „na čem jedu" s účtem nesouvisí
 * a schovat ji za přihlášení by znamenalo, že si ji nepřečte ten, komu
 * přihlášení zrovna nejde.
 */
export function VerzeAppky() {
  const t = useTheme();
  const p = puvod();
  const otisk = kratkyOtisk(p.otisk);

  return (
    <>
      <Sekce>Verze appky</Sekce>
      <Karta>
        <Text style={{ color: t.text }}>{popisPuvodu(p)}</Text>
        {otisk ? (
          // Otisk je tu pro případ, že se bude dohledávat, ze kterého
          // buildu appka je. Laikovi neříká nic, proto tlumeně a dole.
          <Text selectable style={{ color: t.tlumeny, fontSize: 12, marginTop: 6 }}>
            Otisk {otisk}
          </Text>
        ) : null}
      </Karta>
      {aktualizaceJdou ? <Hledani /> : <BezAktualizaci />}
    </>
  );
}

/** Stav hledání novinek a dvě tlačítka k němu. */
function Hledani() {
  const t = useTheme();
  const stav = useUpdates();
  const [pracuje, setPracuje] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  const popis = popisHledani({
    hleda: stav.isChecking,
    stahuje: stav.isDownloading,
    cekaRestart: stav.isUpdatePending,
    jeNovinka: stav.isUpdateAvailable,
  });

  // Chyba z hooku je z automatického hledání při startu; `chyba` je z toho,
  // co si člověk vyžádal klepnutím. Obě jsou stejně platné, tak se ukáže ta
  // novější — tedy vyžádaná, pokud nějaká je.
  const problem = chyba ?? stav.checkError?.message ?? stav.downloadError?.message ?? null;

  const podivejSe = async () => {
    setPracuje(true);
    setChyba(null);
    try {
      setChyba(await zkusAktualizaci());
    } finally {
      setPracuje(false);
    }
  };

  return (
    <Karta>
      <Text style={{ color: t.text }}>{popis}</Text>

      {stav.isUpdatePending ? (
        <Pressable onPress={() => void pouzijHned()} style={{ marginTop: 12 }}>
          <Text style={{ color: t.voda, fontWeight: '600' }}>Použít novou verzi teď</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => void podivejSe()}
          disabled={pracuje || stav.isChecking || stav.isDownloading}
          style={{ marginTop: 12 }}>
          <Text
            style={{
              color: pracuje || stav.isChecking || stav.isDownloading ? t.tlumeny : t.voda,
              fontWeight: '600',
            }}>
            {pracuje ? 'Koukám…' : 'Podívat se, jestli je něco nového'}
          </Text>
        </Pressable>
      )}

      {problem ? (
        <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 8 }}>{problem}</Text>
      ) : null}
    </Karta>
  );
}

/**
 * Co říct tam, kde aktualizace po síti nejdou — v Expo Go a ve vývojovém
 * buildu. Mlčet by vypadalo stejně jako „appka je aktuální", a to je rozdíl,
 * na kterém se dá při ladění ztratit půl večera.
 */
function BezAktualizaci() {
  const t = useTheme();
  return (
    <Karta>
      <Text style={{ color: t.tlumeny }}>
        Aktualizace po síti v téhle verzi nejdou — appka běží z Expo Go nebo
        z vývojového buildu. V APK k rozdávání fungují.
      </Text>
    </Karta>
  );
}

import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { naposledyPrihlaseno, odhlasOdbery, prihlasKOdberu } from '@/lib/upozorneni';

/**
 * Přepínač upozornění na ročník.
 *
 * <b>Oprávnění se vyžaduje až odsud, ne při startu appky.</b> Systémový
 * dotaz položený dřív, než člověk ví proč, se odmítá — a podruhé ho už
 * appka položit nesmí. Proto je u tlačítka napsané, co bude chodit.
 *
 * <b>Stav se čte z toho, co jsme naposledy nahlásili serveru</b>, ne ze
 * systémového oprávnění: povolené notifikace ještě neznamenají odběr
 * tohohle ročníku, a ptát se systému by u vypnutého odběru ukazovalo
 * „zapnuto".
 */
export function OdberUpozorneni({ slug }: { slug: string }) {
  const t = useTheme();
  const odber = `serie:${slug}`;
  const [zapnuto, setZapnuto] = useState<boolean | null>(null);
  const [pracuje, setPracuje] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    let platne = true;
    void naposledyPrihlaseno().then((odbery) => {
      if (platne) setZapnuto(odbery?.includes(odber) ?? false);
    });
    return () => {
      platne = false;
    };
  }, [odber]);

  const prepni = async () => {
    setPracuje(true);
    setChyba(null);
    try {
      const vysledek = zapnuto ? await odhlasOdbery() : await prihlasKOdberu([odber]);
      if (vysledek.stav === 'prihlaseno') setZapnuto(vysledek.odbery.includes(odber));
      else if (vysledek.stav === 'odmitnuto')
        setChyba('Upozornění máš v systému vypnutá. Zapni je appce v nastavení telefonu.');
      else setChyba(vysledek.duvod);
    } finally {
      setPracuje(false);
    }
  };

  // Dokud se stav nenačte, nic — blikající „vypnuto" by svádělo klepnout.
  if (zapnuto === null) return null;

  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable
        onPress={() => void prepni()}
        disabled={pracuje}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: zapnuto ? t.voda : t.linka,
          opacity: pracuje ? 0.6 : 1,
        }}>
        <Text style={{ color: zapnuto ? t.voda : t.text, fontWeight: '600' }}>
          {zapnuto ? 'Upozornění zapnutá' : 'Zapnout upozornění'}
        </Text>
        <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 2 }}>
          {zapnuto
            ? 'Dáme vědět, až budou venku výsledky rozjížďky.'
            : 'Výsledky rozjížděk, jakmile je pořadatel pustí ven.'}
        </Text>
      </Pressable>
      {chyba ? (
        <Text style={{ color: t.stavZruseny, fontSize: 13, marginTop: 6 }}>{chyba}</Text>
      ) : null}
    </View>
  );
}

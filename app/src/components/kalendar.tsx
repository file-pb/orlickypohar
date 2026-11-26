import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Karta, Stav } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { ZavodShrnuti } from '@/lib/api';
import { rozsah } from '@/lib/datum';

/**
 * Kalendář ročníku — jedna řádka na regatu.
 *
 * <b>Společné dvěma obrazovkám</b>: sledování (`app/rocniky.tsx`) a detailu
 * ročníku (`app/serie/[slug]/index.tsx`). Druhá kopie by se rozešla v první
 * drobnosti — škrtnutí zrušené regaty, přesunutý termín — a poznalo by se
 * to podle toho, že si dva lidé u vody ukazují dvě různé obrazovky.
 *
 * Pravidlo „sdílet až po třetí kopii" (`AGENTS.md`) tu neplatí doslova:
 * tohle není abstrakce postavená ze dvou vzorků, je to tentýž kus
 * přesunutý na jedno místo.
 */
export function Kalendar({ slug, zavody }: { slug: string; zavody: ZavodShrnuti[] }) {
  const t = useTheme();
  const router = useRouter();

  return (
    <>
      {zavody.map((z) => (
        <Karta key={z.slug} onPress={() => router.push(`/serie/${slug}/zavody/${z.slug}`)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text
              style={{
                color: t.text,
                fontWeight: '600',
                fontSize: 16,
                textDecorationLine: z.stav === 'Zruseny' ? 'line-through' : 'none',
              }}>
              {z.nazev}
            </Text>
            <Stav stav={z.stav} />
          </View>
          <Text style={{ color: t.tlumeny, marginTop: 3 }}>
            {rozsah(z.datum, z.datumKonce)}
            {z.poradatel ? ` · ${z.poradatel}` : ''}
          </Text>
          {z.puvodniDatum ? (
            <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 2 }}>
              přesunuto z {rozsah(z.puvodniDatum)}
            </Text>
          ) : null}
        </Karta>
      ))}
    </>
  );
}

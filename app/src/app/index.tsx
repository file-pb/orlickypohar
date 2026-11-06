import { useWindowDimensions, View } from 'react-native';

import { Kebab } from '@/components/kebab';
import { Znacka } from '@/components/znacka';
import { useTheme } from '@/hooks/use-theme';

/**
 * Domovská obrazovka: zatím jen značka.
 *
 * <b>Co se stalo 7. 11. 2026.</b> Ráno tu byl rozcestník, odpoledne landing
 * s vodočtem a kartami *Velíš* a *Sledování*, a večer Filip řekl: *„tohle
 * z landingu vyndej, dej tam veliké logo poháru, co máme na webu, přes
 * celou obrazovku (landing budem měnit, a tak jen teď dočasně jen
 * s logem)."* Takže je to <b>dočasný stav</b>, ne výsledek — a je tak
 * napsaný i tenhle komentář, aby ho příště nikdo nečetl jako záměr.
 *
 * <b>Kebab zůstal.</b> Hlavička se nekreslí a karty jsou pryč, takže ty
 * tři tečky jsou jediná cesta odsud kamkoliv — bez nich by se z appky
 * nedalo dostat na start, na trasu ani do ukázky.
 *
 * Značka se kreslí vektorem (`components/znacka.tsx`), ne obrázkem:
 * `assets/images` vstupuje do otisku appky a velké logo mezi ikonami by
 * odřízlo vydané APK od aktualizací.
 */
export default function Domu() {
  const t = useTheme();
  const { width: sirka, height: vyska } = useWindowDimensions();

  // Přes celou obrazovku, ale ať se vejde i na výšku: značka je skoro
  // čtvercová, takže ji omezuje ta menší strana.
  const velikost = Math.min(sirka - 48, vyska * 0.55);

  return (
    <View style={{ flex: 1, backgroundColor: t.pozadi }}>
      {/* Nad značkou, aby se na ni dalo klepnout i tam, kde se překrývají. */}
      <View style={{ position: 'absolute', top: 4, right: 12, zIndex: 1 }}>
        <Kebab />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Znacka velikost={velikost} />
      </View>
    </View>
  );
}

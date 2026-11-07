import { Image, Text, useWindowDimensions, View } from 'react-native';

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
 * <b>Řádek se značkou nahoře zůstal</b> (Filip, 7. 11. 2026: *„to nahoře
 * s tou lodičkou jsi klidně mohl nechat, po klepnutí se rozbalí kebab"*).
 * Nese ikonu, jméno a tři tečky — a ty jsou jediná cesta odsud kamkoliv,
 * protože systémová hlavička se nekreslí a karty jsou pryč. Bez nich by
 * se z appky nedalo dostat na start, na trasu ani do ukázky.
 *
 * Značka se kreslí vektorem (`components/znacka.tsx`), ne obrázkem:
 * `assets/images` vstupuje do otisku appky a velké logo mezi ikonami by
 * odřízlo vydané APK od aktualizací.
 */
export default function Domu() {
  const t = useTheme();
  const { width: sirka, height: vyska } = useWindowDimensions();

  // Přes celou obrazovku, ale ať se vejde i na výšku: značka je skoro
  // čtvercová, takže ji omezuje ta menší strana. Řádek nahoře si svoje
  // místo bere, proto je podíl menší, než kdyby byla plocha celá.
  const velikost = Math.min(sirka - 48, vyska * 0.5);

  return (
    <View style={{ flex: 1, backgroundColor: t.pozadi, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={{ width: 44, height: 44, borderRadius: 10 }}
          accessibilityIgnoresInvertColors
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>
            Orlický pohár
          </Text>
          <Text style={{ color: t.tlumeny, fontSize: 13 }}>Plachetnice na Orlické přehradě</Text>
        </View>
        <Kebab />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Znacka velikost={velikost} />
      </View>
    </View>
  );
}

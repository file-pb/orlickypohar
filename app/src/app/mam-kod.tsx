import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Text, TextInput, View } from 'react-native';

import { Akce, Karta, Nadpis } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { jmenoUctu, kodZeVstupu, napoj, zapomenKlic } from '@/lib/klic-uctu';
import { zapomenOpravneni } from '@/lib/opravneni';

const WEB = 'https://orlickypohar.klihovka.cz';

/**
 * Mám kód — napojení telefonu na účet místo přihlašování.
 *
 * <b>Proč tohle místo přihlášení</b> (Filip, 26. 11. 2026): *„na zitadel
 * uživatele tahat nechci… rád bych, aby se dalo přihlásit přímo v apce."*
 * Člověk se přihlásí na webu u počítače, na svém profilu si vystaví kód
 * a tady ho zadá. Poskytovatele appka neukáže.
 *
 * <b>Zatím bez čtečky QR.</b> Foťák by znamenal `expo-camera`, tedy
 * nativní závislost — a ta mění otisk běhového prostředí, takže by
 * aktualizace kanálem nedošla nikomu, dokud si nenainstaluje nový
 * balíček. Opsání osmi znaků funguje hned a všude; čtečka přijde s příštím
 * nativním vydáním.
 */
export default function MamKod() {
  const t = useTheme();
  const router = useRouter();

  const [kod, setKod] = useState('');
  const [pracuje, setPracuje] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [kdo, setKdo] = useState<string | null>(null);

  useEffect(() => {
    void jmenoUctu().then(setKdo);
  }, []);

  const napojSe = async () => {
    const cisty = kodZeVstupu(kod);
    if (cisty.length === 0) {
      setChyba('Zadej kód ze svého účtu na webu.');
      return;
    }

    setPracuje(true);
    setChyba(null);
    try {
      // Vizitka do seznamu na webu, ať se pozná, který telefon odebrat.
      // <b>Jen systém, ne jméno zařízení</b>: na to je potřeba nativní
      // `expo-device`, a ta by změnila otisk běhového prostředí — nová
      // závislost znamená nový balíček, ne aktualizaci kanálem. Nic se
      // podle téhle vizitky nerozhoduje.
      const jmeno = await napoj(cisty, Platform.OS === 'ios' ? 'iPhone' : 'Android');
      if (!jmeno) {
        // Vymyšlený, propadlý i už uplatněný kód dopadnou stejně — tak
        // to odpovídá server a rada je ve všech třech případech táž.
        setChyba('Kód neplatí. Vystav si na webu nový — platí jen pár minut a jednou.');
        return;
      }

      // Držená odpověď `/ja` je z doby, kdy appka nikoho neznala.
      zapomenOpravneni();
      setKdo(jmeno);
      setKod('');
      router.navigate('/');
    } finally {
      setPracuje(false);
    }
  };

  const odpoj = async () => {
    await zapomenKlic();
    zapomenOpravneni();
    setKdo(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.pozadi, padding: 16 }}>
      <Nadpis
        tlumene="Appka se nepřihlašuje heslem. Kód si vystav na webu, ve svém účtu."
        naZpet={() => router.back()}
        zpetKam="Zpátky">
        Mám kód
      </Nadpis>

      {kdo ? (
        <Karta>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{kdo}</Text>
          <Text style={{ color: t.tlumeny, marginTop: 2 }}>
            Telefon je napojený na tenhle účet.
          </Text>
          {/* <b>Odpojit platí jen tady.</b> Aby klíč přestal platit i na
              serveru, musí ho majitel odebrat na webu — tohle je pro
              telefon, který mám v ruce, odebrání na webu pro ten, co jsem
              ztratil. */}
          <Akce text="Odpojit tenhle telefon" onPress={odpoj} />
        </Karta>
      ) : null}

      <Karta>
        <Text style={{ color: t.tlumeny, marginBottom: 8 }}>
          {kdo ? 'Napojit na jiný účet' : 'Kód z webu'}
        </Text>
        <TextInput
          value={kod}
          onChangeText={setKod}
          placeholder="NAPŘ. JJJ6226Q"
          placeholderTextColor={t.tlumeny}
          autoCapitalize="characters"
          autoCorrect={false}
          // Celou adresu z QR to taky vezme, `kodZeVstupu` si kód vybere.
          style={{
            color: t.text,
            borderColor: t.linka,
            borderWidth: 1,
            borderRadius: 10,
            padding: 12,
            fontSize: 20,
            letterSpacing: 2,
          }}
        />
        {chyba ? (
          <Text style={{ color: t.stavZruseny, marginTop: 8 }}>{chyba}</Text>
        ) : null}
        <Akce text={pracuje ? 'Napojuji…' : 'Napojit'} onPress={napojSe} pracuje={pracuje} />
      </Karta>

      <Text style={{ color: t.tlumeny, marginTop: 16, fontSize: 13 }}>
        Kód najdeš na webu v nabídce pod svým jménem, v Mém účtu.
      </Text>
      <Text
        style={{ color: t.voda, marginTop: 6, fontSize: 13 }}
        onPress={() => void Linking.openURL(`${WEB}/muj-ucet`)}>
        {WEB.replace('https://', '')}/muj-ucet
      </Text>
    </View>
  );
}

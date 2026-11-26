import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Akce, Karta, Nadpis } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import {
  DELKA,
  jmenoUctu,
  kodZeSkenu,
  kodZeVstupu,
  napoj,
  zapomenKlic,
} from '@/lib/klic-uctu';
import { pismoNaVyplni } from '@/lib/kontrast';
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
 * <b>Tři cesty dovnitř, jeden konec</b> (Filip, 26. 11. 2026: *„no tak to
 * chce ještě možnost zadani qr kodu a nevo vyber z galerie"*). Foťák na
 * obrazovku, obrázek z galerie, nebo opsání z ruky — všechny tři vedou do
 * `napojKodem`, takže se chybové stavy ani držený klíč nevětví podle toho,
 * odkud kód přišel.
 *
 * Pořadí na obrazovce je pořadí podle četnosti: u počítače je nejblíž
 * namířit foťák, snímek obrazovky ve zprávě je druhý nejčastější a opsání
 * z ruky je ta cesta, která funguje i bez přístupu k foťáku.
 */
export default function MamKod() {
  const t = useTheme();
  const router = useRouter();
  const okraje = useSafeAreaInsets();

  const [kod, setKod] = useState('');
  const [pracuje, setPracuje] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const [kdo, setKdo] = useState<string | null>(null);
  const [hledacek, setHledacek] = useState(false);
  const [doNastaveni, setDoNastaveni] = useState(false);
  const [opravneni, zadejOpravneni] = useCameraPermissions();

  // Hledáček hlásí nález mnohokrát za sekundu, dokud QR vidí. Bez zámku
  // by se napojení poslalo několikrát a druhý pokus by dopadl na „kód už
  // je uplatněný" — tedy na chybu nad kódem, který právě prošel.
  const zamek = useRef(false);

  useEffect(() => {
    void jmenoUctu().then(setKdo);
  }, []);

  /**
   * Jediný konec všech tří cest. Co se sem dostane, je už srovnaný kód;
   * jestli platí, rozhoduje server.
   */
  const napojKodem = useCallback(
    async (cisty: string) => {
      if (cisty.length === 0) {
        setChyba('Zadej kód ze svého účtu na webu.');
        return;
      }

      setPracuje(true);
      setChyba(null);
      try {
        // Vizitka do seznamu na webu, ať se pozná, který telefon odebrat.
        // <b>Jen systém, ne jméno zařízení</b>: na to je potřeba nativní
        // `expo-device` a nic se podle téhle vizitky nerozhoduje.
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
    },
    [router],
  );

  /**
   * Nález z hledáčku. <b>Cizí QR se mlčky přeskočí</b>, hledáček běží dál:
   * foťák namířený na monitor chytne i QR z vedlejší stránky a zavřít kvůli
   * tomu hledáček s chybou by znamenalo hlásit „neplatný kód" nad obrazovkou,
   * na které ten platný je. Co je náš kód, rozhoduje `kodZeSkenu`.
   */
  const naNalez = ({ data }: { data: string }) => {
    if (zamek.current) return;
    const nas = kodZeSkenu([{ data }]);
    if (!nas) return;

    zamek.current = true;
    setHledacek(false);
    void napojKodem(nas).finally(() => {
      zamek.current = false;
    });
  };

  const otevriHledacek = async () => {
    setChyba(null);
    setDoNastaveni(false);

    if (!opravneni?.granted) {
      const odpoved = await zadejOpravneni();
      if (!odpoved.granted) {
        // <b>Dvě různé situace, dvě různé rady.</b> Odmítnutí v dialogu
        // se dá vzít zpět dalším klepnutím; odepření „natrvalo" se dá
        // zrušit jedině v nastavení telefonu, a tam je potřeba poslat.
        setDoNastaveni(!odpoved.canAskAgain);
        setChyba(
          odpoved.canAskAgain
            ? 'Bez přístupu k foťáku skenovat nejde. Kód se dá opsat z ruky dole.'
            : 'Přístup k foťáku je odepřený v nastavení telefonu.',
        );
        return;
      }
    }

    zamek.current = false;
    setHledacek(true);
  };

  /**
   * QR z obrázku. Tahle cesta je tu kvůli snímku obrazovky: kód přijde ve
   * zprávě jako obrázek a namířit foťák není na co.
   */
  const zGalerie = async () => {
    setChyba(null);
    setDoNastaveni(false);
    try {
      // Na fotky systémový výběr oprávnění nepotřebuje — vybírá uživatel
      // v systémovém okně a appka dostane jen ten jeden soubor.
      const vybrane = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      if (vybrane.canceled) return;

      const nalezy = await scanFromURLAsync(vybrane.assets[0].uri, ['qr']);
      const nas = kodZeSkenu(nalezy);
      if (!nas) {
        setChyba(
          'Na tom obrázku kód k účtu není. Musí na něm být celý QR kód z Mého účtu, ne jen jeho část.',
        );
        return;
      }
      await napojKodem(nas);
    } catch {
      // Obrázek se nemusí dát přečíst (formát, oprávnění, prázdný výběr).
      // Opsání z ruky zůstává, takže se tím nic nekončí.
      setChyba('Ten obrázek přečíst nešlo. Zkus jiný, nebo kód opiš.');
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
        tlumene="Appka se nepřihlašuje heslem. Kód nebo QR si vystav na webu, ve svém účtu."
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
          {kdo ? 'Napojit na jiný účet' : 'QR kód z webu'}
        </Text>
        <Akce text="Naskenovat QR" onPress={otevriHledacek} vypnuto={pracuje} />
        <Akce text="Vybrat obrázek z galerie" onPress={zGalerie} vypnuto={pracuje} />
      </Karta>

      <Karta>
        <Text style={{ color: t.tlumeny, marginBottom: 8 }}>…nebo kód opiš</Text>
        <TextInput
          value={kod}
          onChangeText={setKod}
          placeholder={`${DELKA} znaků, např. JKM6 2Q7P`}
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
        <Akce
          text={pracuje ? 'Napojuji…' : 'Napojit'}
          onPress={() => void napojKodem(kodZeVstupu(kod))}
          pracuje={pracuje}
        />
      </Karta>

      {chyba ? (
        <Text style={{ color: t.stavZruseny, marginTop: 8 }}>{chyba}</Text>
      ) : null}
      {doNastaveni ? (
        <Akce text="Otevřít nastavení telefonu" onPress={() => void Linking.openSettings()} />
      ) : null}

      <Text style={{ color: t.tlumeny, marginTop: 16, fontSize: 13 }}>
        Kód i QR najdeš na webu v nabídce pod svým jménem, v Mém účtu.
      </Text>
      <Text
        style={{ color: t.voda, marginTop: 6, fontSize: 13 }}
        onPress={() => void Linking.openURL(`${WEB}/muj-ucet`)}>
        {WEB.replace('https://', '')}/muj-ucet
      </Text>

      {/* <b>Hledáček je modal, ne vlastní obrazovka.</b> Výsledek se tím
          nemusí předávat parametrem cesty zpátky a zavření nemá co udělat
          se zásobníkem obrazovek. Foťák běží jen dokud je modal otevřený. */}
      <Modal
        visible={hledacek}
        animationType="slide"
        onRequestClose={() => setHledacek(false)}>
        <View style={s.hledacek}>
          <CameraView
            style={s.obraz}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={naNalez}
          />
          <View style={[s.rada, { paddingTop: okraje.top + 8 }]}>
            <Text style={s.vysvetleni}>Namiř na QR kód v Mém účtu na webu.</Text>
          </View>
          <Pressable
            onPress={() => setHledacek(false)}
            accessibilityRole="button"
            accessibilityLabel="Zrušit skenování"
            style={({ pressed }) => [
              s.zrusit,
              { bottom: okraje.bottom + 24, backgroundColor: t.papir },
              pressed && { opacity: 0.6 },
            ]}>
            <Text style={[s.zrusitText, { color: pismoNaVyplni(t, t.papir) }]}>Zrušit</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  hledacek: { flex: 1, backgroundColor: '#000' },
  obraz: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  rada: { paddingHorizontal: 16, paddingBottom: 8 },
  // Na obraz z foťáku se nedá spoléhat jako na podklad, proto vlastní.
  vysvetleni: {
    color: '#FCFCFB',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  // Terč 44 pt jako všude jinde (`tools/kontrola-dotyku.py`).
  zrusit: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 44,
    minWidth: 140,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zrusitText: { fontSize: 16, fontWeight: '700' },
});

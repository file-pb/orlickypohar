import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Karta, Nacitani, Nadpis, Sekce } from '@/components/ui';
import { VerzeAppky } from '@/components/verze-appky';
import { useTheme } from '@/hooks/use-theme';
import { nactiJa, type Ja } from '@/lib/api';
import { navratovaAdresa, odhlas, prihlas, prihlasovaniJde } from '@/lib/identita';

/**
 * Účet: přihlášení a co z něj plyne.
 *
 * <b>Proč je tu seznam oprávnění:</b> přihlášení samo o sobě nic neříká —
 * nový účet u poskytovatele nemá v poháru jediné právo a role se udělují
 * ručně. Kdyby obrazovka řekla jen „přihlášen", člověk by hledal chybu
 * v appce, přestože mu jen nikdo nic nepřidělil.
 *
 * <b>Profil se čte z našeho API (`/ja`), ne z tokenu.</b> Tím se zároveň
 * ověří to podstatné: že token neplatí jen u poskytovatele, ale že ho
 * bere i naše API. To jsou dvě různé věci a dá se mezi nimi ztratit
 * půl večera.
 */
export default function Ucet() {
  const t = useTheme();
  const [ja, setJa] = useState<Ja | null>(null);
  const [nacita, setNacita] = useState(true);
  const [chyba, setChyba] = useState<string | null>(null);
  const [delam, setDelam] = useState(false);

  const nacti = useCallback(async () => {
    setNacita(true);
    try {
      setJa(await nactiJa());
      setChyba(null);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : 'Nedaří se spojit s API.');
    } finally {
      setNacita(false);
    }
  }, []);

  useEffect(() => {
    void nacti();
  }, [nacti]);

  const naPrihlaseni = async () => {
    setDelam(true);
    try {
      const potiz = await prihlas();
      setChyba(potiz);
      if (!potiz) await nacti();
    } finally {
      setDelam(false);
    }
  };

  const naOdhlaseni = async () => {
    await odhlas();
    setJa(null);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Nadpis tlumene="Přihlášení je potřeba jen k zadávání, čtení funguje bez něj">
        Účet
      </Nadpis>

      {nacita ? <Nacitani /> : null}

      {!nacita && !prihlasovaniJde ? (
        <Karta>
          <Text style={{ color: t.text }}>
            Přihlašování není v téhle verzi appky nastavené.
          </Text>
          <Text style={{ color: t.tlumeny, marginTop: 8 }}>
            Chybí adresa poskytovatele nebo identifikátor klienta. U poskytovatele
            se zakládá aplikace typu Native s touhle návratovou adresou:
          </Text>
          <Text selectable style={{ color: t.voda, marginTop: 8 }}>
            {navratovaAdresa}
          </Text>
        </Karta>
      ) : null}

      {!nacita && prihlasovaniJde && !ja ? (
        <>
          <Karta>
            <Text style={{ color: t.text }}>Nikdo není přihlášený.</Text>
            <Pressable onPress={naPrihlaseni} disabled={delam} style={{ marginTop: 12 }}>
              <Text style={{ color: delam ? t.tlumeny : t.voda, fontWeight: '600' }}>
                {delam ? 'Přihlašuji…' : 'Přihlásit se'}
              </Text>
            </Pressable>
          </Karta>

          {/* Adresa je vidět i tady: v Expo Go ji poskytovatel nezná, protože
              obsahuje adresu notebooku v síti — viz `identita.ts`. */}
          <Text style={{ color: t.tlumeny, marginTop: 16, fontSize: 12 }}>
            Návratová adresa: {navratovaAdresa}
          </Text>
        </>
      ) : null}

      {ja ? (
        <>
          <Karta>
            <Text style={{ color: t.text, fontWeight: '600', fontSize: 16 }}>
              {ja.zobrazovane}
            </Text>
            {ja.email ? (
              <Text style={{ color: t.tlumeny, marginTop: 2 }}>{ja.email}</Text>
            ) : null}
          </Karta>

          <Sekce>Co smíš</Sekce>
          {ja.opravneni.length === 0 ? (
            <Karta>
              <Text style={{ color: t.tlumeny }}>
                Zatím nic. Účet existuje, ale role se udělují ručně — do té doby
                vidíš totéž co nepřihlášený.
              </Text>
            </Karta>
          ) : (
            ja.opravneni.map((o, i) => (
              <Karta key={i}>
                <Text style={{ color: t.text }}>{popisOpravneni(o)}</Text>
              </Karta>
            ))
          )}

          <Pressable onPress={naOdhlaseni} style={{ marginTop: 24 }}>
            <Text style={{ color: t.voda }}>Odhlásit se</Text>
          </Pressable>
        </>
      ) : null}

      {chyba ? (
        <Text style={{ color: t.text, marginTop: 16 }}>{chyba}</Text>
      ) : null}

      {/* Cesty, které odešly z rozcestníku (29. 10. 2026). Tam se v nich
          hledal start i sledování; sem za nimi jde ten, kdo je potřebuje —
          a klíč potřebuje i člověk bez účtu, proto stojí mimo `ja`. */}
      <View style={{ marginTop: 24 }}>
        <Link href="/lode" style={{ color: t.voda }}>
          Moje lodě
        </Link>
      </View>

      <View style={{ marginTop: 12 }}>
        <Link href="/klic" style={{ color: t.voda }}>
          Klíč k lodi
        </Link>
      </View>

      <View style={{ marginTop: 12 }}>
        <Link href="/tracker" style={{ color: t.voda }}>
          Záznam trasy (zkouška)
        </Link>
      </View>

      <View style={{ marginTop: 16 }}>
        <Link href="https://orlickypohar.klihovka.cz" style={{ color: t.voda }}>
          orlickypohar.klihovka.cz
        </Link>
      </View>

      {/* Mimo `ja`: na čem appka jede, je otázka nezávislá na přihlášení. */}
      <VerzeAppky />
    </ScrollView>
  );
}

/** Oprávnění lidsky. Syrový tvar z API by na obrazovce nikomu nic neřekl. */
function popisOpravneni(o: Ja['opravneni'][number]) {
  const casti = [o.role as string];
  if (o.serie) casti.push(`ročník ${o.serie}`);
  if (o.zavod) casti.push(o.zavod);
  return casti.join(' · ');
}

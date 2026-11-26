import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Akce, Karta, Nacitani, Nadpis, Radek, Sekce } from '@/components/ui';
import { VerzeAppky } from '@/components/verze-appky';
import { ZvukNastaveni } from '@/components/zvuk-nastaveni';
import { useTheme } from '@/hooks/use-theme';
import { useZmenaUctu } from '@/hooks/use-zmena-uctu';
import { nactiJa, type Ja } from '@/lib/api';
import { odhlas } from '@/lib/identita';
import { zapomenKlic } from '@/lib/klic-uctu';
import { zapomenOpravneni } from '@/lib/opravneni';

/**
 * Účet: přihlášení a co z něj plyne.
 *
 * <b>Přihlašuje se kódem z webu, ne heslem</b> (26. 11. 2026,
 * `docs/ROZCESTNIK.md`, *Přihlášení bez cesty na Zitadel*, bod 4). Do té
 * doby tu stálo tlačítko, které otevřelo stránku poskytovatele s heslem —
 * a to pořadatel, který appku zapne dvakrát za sezónu, nemá. Kdo je
 * přihlášený tokenem z dřívějška, o nic nepřichází: `api.ts` token dál
 * posílá, jen se nový nikde nezakládá.
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
  const router = useRouter();

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
  // Z *Mám kód* se člověk vrací sem gestem zpět, a tahle obrazovka
  // v zásobníku zůstala — bez ohlášení by dál psala „nikdo".
  useZmenaUctu(nacti);

  /**
   * Odhlášení zapomene <b>klíč i token</b>. Telefon mohl mít obojí — token
   * z doby, kdy se appka přihlašovala heslem — a kdyby zůstal jeden,
   * `api.ts` by za účet jednal dál a tlačítko by lhalo.
   */
  const naOdhlaseni = async () => {
    zapomenOpravneni();
    await zapomenKlic();
    await odhlas();
    setJa(null);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Nadpis tlumene="Přihlášení je potřeba jen k zadávání, čtení funguje bez něj">
        Účet
      </Nadpis>

      {nacita ? <Nacitani /> : null}

      {/* <b>Bez hesla a bez poskytovatele.</b> Cesta vede přes web, kde se
          role stejně udělují: u počítače se člověk přihlásí, v *Můj účet*
          mu svítí QR a kód, a telefon ho přečte. Neplatí na to
          `prihlasovaniJde` — kód na adrese poskytovatele nezávisí. */}
      {!nacita && !ja ? (
        <Karta>
          <Text style={{ color: t.text }}>Nikdo není přihlášený.</Text>
          <Text style={{ color: t.tlumeny, marginTop: 6 }}>
            Na webu se přihlas a v Můj účet ti svítí QR a kód. Telefon ho
            naskenuje, vezme ze snímku obrazovky, nebo ho opíšeš.
          </Text>
          <Akce text="Přihlásit se kódem z webu" onPress={() => router.push('/mam-kod')} />
        </Karta>
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

          <View style={{ marginTop: 12 }}>
            <Akce text="Odhlásit se" onPress={naOdhlaseni} />
            {/* Klíč se zapomene jen tady. Ztracený telefon se odpojuje na
                webu — tahle věta je pro toho, kdo hledá, kde to udělat. */}
            <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 6 }}>
              Telefon tím zapomene, za koho jedná. Ztracený telefon odpojíš
              na webu v Můj účet.
            </Text>
          </View>
        </>
      ) : null}

      {chyba ? (
        <Text style={{ color: t.text, marginTop: 16 }}>{chyba}</Text>
      ) : null}

      {/* Cesty, které odešly z rozcestníku (29. 10. 2026). Tam se v nich
          hledal start i sledování; sem za nimi jde ten, kdo je potřebuje —
          a klíč potřebuje i člověk bez účtu, proto stojí mimo `ja`. */}
      <Sekce>Telefon</Sekce>
      <Radek text="Moje lodě" href="/lode" />
      <Radek text="Klíč k lodi" href="/klic" />
      <Radek text="Záznam trasy" popis="zkouška" href="/tracker" />
      <Radek text="orlickypohar.klihovka.cz" href="https://orlickypohar.klihovka.cz" hodnota="web" />

      {/* <b>Zvuk se nastavuje tady, ne na panelu startu</b> (Filip,
          8. 11. 2026). Mimo `ja` schválně: troubí telefon, ne účet. */}
      <ZvukNastaveni />

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

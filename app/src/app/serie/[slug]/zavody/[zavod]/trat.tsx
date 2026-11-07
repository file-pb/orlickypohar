import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Barvy } from '@/constants/theme';
import { Chyba, Nacitani, Nadpis, Prazdno, Sekce } from '@/components/ui';
import { useData } from '@/hooks/use-data';
import { useTheme } from '@/hooks/use-theme';
import {
  nactiTrat,
  nactiUkony,
  nactiZavod,
  odvolejUkon,
  OdmitnutoServerem,
  vyhlasUkon,
  type PrvekTrati,
  type UkonZaJizdy,
} from '@/lib/api';
import { pismoNaVyplni } from '@/lib/kontrast';
import { stavStartu } from '@/lib/start';

/**
 * Úkony komise za jízdy z telefonu — změna úseku (ZPJ 33) a chybějící
 * značka (34).
 *
 * <b>Trať se tím nemění</b> (Filip, 28. 10. 2026). Je to rozhodnutí nad
 * přijatou tratí, které platí pro rozjížďku, co se zrovna jede — proto se
 * tu nic nestaví a nic nemaže; vyhlašuje se a odvolává.
 *
 * <b>Rozjížďka se nevybírá</b>, stejně jako v cíli: obrazovka si najde tu,
 * která je na vodě. Jiná trať než ta, po které zrovna pluje pole, u vody
 * k ničemu není.
 *
 * <b>Trať se čte veřejnou cestou</b>, touž jako web a tabule. Zvláštní
 * endpoint pro telefon by znamenal, že rozhodčí může vidět jinou trať než
 * ta, podle které se pluje.
 *
 * Do 7. 11. 2026 tohle šlo jedině z webu — tedy od počítače, zatímco
 * značka chybí tady a teď.
 */

/** Jak se o úkonu mluví. Táž slova jako na webu. */
const NAZVY_UKONU: Record<string, string> = {
  ZmenaUseku: 'změna úseku',
  ChybejiciZnacka: 'chybějící značka',
};

const NAZVY_DELKY: Record<string, string> = {
  Prodlouzeno: 'delší',
  Zkraceno: 'kratší',
};

/** Jak se prvku říká na vodě: pořadí a čím to je. */
function popisPrvku(p: PrvekTrati): string {
  const typ = {
    OtocnaBoje: 'otočná bóje',
    Brana: 'brána',
    Odskok: 'otočná s odskokem',
    Start: 'start',
    Cil: 'cíl',
    PrujezdniBoje: 'průjezdní bóje',
    OtocnaZona: 'otočná zóna',
    OtocnaBrana: 'otočná brána',
  }[p.typ] ?? p.typ;

  const strana = p.strana === 'PoLeve' ? 'po levé' : p.strana === 'PoPrave' ? 'po pravé' : null;
  const jmena = p.b ? `${p.a.nazev} – ${p.b.nazev}` : p.a.nazev;
  return [typ, jmena, strana].filter(Boolean).join(' · ');
}

type Zadani =
  | { druh: 'ZmenaUseku'; prvek: number; popis: string }
  | { druh: 'ChybejiciZnacka'; prvek: number; popis: string };

export default function TratZaJizdy() {
  const { slug, zavod } = useLocalSearchParams<{ slug: string; zavod: string }>();
  const t = useTheme();

  const { data, chyba: chybaZavodu, nacita, obnov } = useData(
    useCallback(() => nactiZavod(slug, zavod), [slug, zavod]),
  );

  // Rozjížďka na vodě. Panel startu ji počítá týmž pravidlem, takže se
  // obrazovky nemohou rozejít v tom, co se zrovna jede.
  const rozjizdky = data?.rozjizdky ?? [];
  const naVode = stavStartu(rozjizdky, Date.now(), data?.delkaProceduryMin
    ? data.delkaProceduryMin * 60
    : undefined);
  const cislo = naVode && naVode.druh === 'jede' ? naVode.cislo : null;

  const [prvky, setPrvky] = useState<PrvekTrati[] | null>(null);
  const [ukony, setUkony] = useState<UkonZaJizdy[] | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [zadani, setZadani] = useState<Zadani | null>(null);
  const [posila, setPosila] = useState(false);
  const [odvolava, setOdvolava] = useState<number | null>(null);

  const nactiObojí = useCallback(async () => {
    if (cislo === null) return;
    const [trat, vyhlasene] = await Promise.all([
      nactiTrat(slug, zavod, cislo),
      nactiUkony(slug, zavod, cislo),
    ]);
    setPrvky(trat?.prvky ?? null);
    setUkony(vyhlasene ?? []);
  }, [slug, zavod, cislo]);

  useEffect(() => {
    void nactiObojí();
  }, [nactiObojí]);

  async function vyhlas(vstup: {
    druh: 'ZmenaUseku' | 'ChybejiciZnacka';
    prvek: number;
    kurz?: number | null;
    delka?: 'Beze' | 'Prodlouzeno' | 'Zkraceno';
    poznamka?: string | null;
  }) {
    if (cislo === null) return;
    setPosila(true);
    setChyba(null);
    try {
      await vyhlasUkon(slug, zavod, cislo, vstup);
      setZadani(null);
      await nactiObojí();
    } catch (e) {
      setChyba(
        e instanceof OdmitnutoServerem
          ? (e.duvod ?? 'Server úkon odmítl.')
          : 'Nepovedlo se vyhlásit — zkus to znovu.',
      );
    } finally {
      setPosila(false);
    }
  }

  async function odvolej(ukon: number) {
    if (cislo === null) return;
    setOdvolava(ukon);
    setChyba(null);
    try {
      await odvolejUkon(slug, zavod, cislo, ukon);
      await nactiObojí();
    } catch (e) {
      setChyba(
        e instanceof OdmitnutoServerem
          ? (e.duvod ?? 'Server odvolání odmítl.')
          : 'Nepovedlo se odvolat — zkus to znovu.',
      );
    } finally {
      setOdvolava(null);
    }
  }

  if (nacita && !data) return <Nacitani />;
  if (!data) {
    return <Chyba text={chybaZavodu ?? 'Regatu se nepovedlo načíst.'} onZkusZnovu={obnov} />;
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={obnov} tintColor={t.voda} />}>
      <Nadpis tlumene={data.nazev}>Trať za jízdy</Nadpis>

      {cislo === null ? (
        // Před startem se staví rovnou jiná trať, po dojetí se už nemění,
        // kudy se jelo — táž mez, jakou drží server.
        <Prazdno text="Žádná rozjížďka zrovna nejede. Úkony za jízdy platí jen pro rozjížďku na vodě." />
      ) : prvky === null ? (
        <Prazdno text="Rozjížďka nemá přijatou trať, nebo se zrovna přestavuje." />
      ) : (
        <>
          {chyba ? (
            <Text style={{ color: t.stavZruseny, marginBottom: 12 }}>{chyba}</Text>
          ) : null}

          {ukony && ukony.length > 0 ? (
            <>
              <Sekce>Vyhlášeno</Sekce>
              {ukony.map((u) => (
                <View
                  key={u.id}
                  style={[s.vyhlaseny, { borderColor: t.linka, backgroundColor: t.papir }]}>
                  <Text style={[s.vlajka, { color: t.text }]}>{u.vlajka}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.text, fontWeight: '600' }}>
                      {u.prvekPoradi}. {NAZVY_UKONU[u.druh] ?? u.druh}
                    </Text>
                    <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 2 }}>
                      {[
                        u.kurz != null ? `kurz ${u.kurz}°` : null,
                        u.delka !== 'Beze' ? (NAZVY_DELKY[u.delka] ?? u.delka) : null,
                        u.poznamka,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'beze změny směru i délky'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void odvolej(u.id)}
                    disabled={odvolava === u.id}
                    style={({ pressed }) => [
                      s.odvolat,
                      { borderColor: t.linka, opacity: pressed || odvolava === u.id ? 0.5 : 1 },
                    ]}>
                    {odvolava === u.id ? (
                      <ActivityIndicator color={t.tlumeny} />
                    ) : (
                      <Text style={{ color: t.tlumeny, fontWeight: '600' }}>Odvolat</Text>
                    )}
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}

          <Sekce>Rozjížďka {cislo} · prvky trati</Sekce>
          {prvky.length === 0 ? <Prazdno text="Trať nemá žádný prvek." /> : null}
          {prvky.map((p) => (
            <View key={p.id} style={[s.prvek, { borderColor: t.linka, backgroundColor: t.papir }]}>
              <Text style={{ color: t.text, fontWeight: '700' }}>
                {p.poradi}. {popisPrvku(p)}
              </Text>
              {p.poznamka ? (
                <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 2 }}>{p.poznamka}</Text>
              ) : null}

              {/* Dvě dlaždice, ne jedna s přepínačem: každý úkon se
                  vyhlašuje jiným znamením a chce jiné údaje, a na vodě se
                  klepe jednou. */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable
                  onPress={() =>
                    setZadani({ druh: 'ZmenaUseku', prvek: p.id, popis: popisPrvku(p) })
                  }
                  style={({ pressed }) => [
                    s.dlazdice,
                    { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <Text style={[s.dlazdiceNadpis, { color: t.text }]}>Změna úseku</Text>
                  <Text style={[s.dlazdicePopis, { color: t.tlumeny }]}>vlajka C · ZPJ 33</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setZadani({ druh: 'ChybejiciZnacka', prvek: p.id, popis: popisPrvku(p) })
                  }
                  style={({ pressed }) => [
                    s.dlazdice,
                    { borderColor: t.linka, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <Text style={[s.dlazdiceNadpis, { color: t.text }]}>Značka chybí</Text>
                  <Text style={[s.dlazdicePopis, { color: t.tlumeny }]}>vlajka M · ZPJ 34</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}

      {zadani ? (
        <Okno
          zadani={zadani}
          t={t}
          posila={posila}
          onZrus={() => setZadani(null)}
          onVyhlas={vyhlas}
        />
      ) : null}
    </ScrollView>
  );
}

/**
 * Zadání jednoho úkonu.
 *
 * <b>Změna úseku beze změny směru i délky se nevyhlašuje</b> — vlajka C
 * bez údaje nenese informaci a posádky by hledaly, co se změnilo. Server
 * to odmítá a tlačítko to proto nenabídne.
 */
function Okno({
  zadani,
  t,
  posila,
  onZrus,
  onVyhlas,
}: {
  zadani: Zadani;
  t: Barvy;
  posila: boolean;
  onZrus: () => void;
  onVyhlas: (vstup: {
    druh: 'ZmenaUseku' | 'ChybejiciZnacka';
    prvek: number;
    kurz?: number | null;
    delka?: 'Beze' | 'Prodlouzeno' | 'Zkraceno';
    poznamka?: string | null;
  }) => Promise<void>;
}) {
  const [kurz, setKurz] = useState('');
  const [delka, setDelka] = useState<'Beze' | 'Prodlouzeno' | 'Zkraceno'>('Beze');
  const [poznamka, setPoznamka] = useState('');

  const cisloKurzu = /^\d{1,3}$/.test(kurz.trim()) ? Number(kurz.trim()) : null;
  const kurzPlati = kurz.trim() === '' || (cisloKurzu !== null && cisloKurzu <= 359);
  const jdeVyhlasit =
    zadani.druh === 'ChybejiciZnacka'
      ? true
      : kurzPlati && (cisloKurzu !== null || delka !== 'Beze');

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onZrus}>
      <View style={s.zastena}>
        <View style={[s.okno, { backgroundColor: t.papir, borderColor: t.linka }]}>
          <Text style={{ color: t.text, fontSize: 19, fontWeight: '700' }}>
            {zadani.druh === 'ZmenaUseku' ? 'Změna úseku (C)' : 'Značka chybí (M)'}
          </Text>
          <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 4 }}>{zadani.popis}</Text>

          {zadani.druh === 'ZmenaUseku' ? (
            <>
              <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 14 }}>Kurz (°)</Text>
              <TextInput
                value={kurz}
                onChangeText={setKurz}
                placeholder="např. 240"
                placeholderTextColor={t.tlumeny}
                keyboardType="number-pad"
                maxLength={3}
                style={[
                  s.pole,
                  { color: t.text, borderColor: t.linka, backgroundColor: t.zvyrazneni },
                ]}
              />
              {!kurzPlati ? (
                <Text style={{ color: t.stavZruseny, fontSize: 12, marginTop: 6 }}>
                  Kurz je 0 až 359.
                </Text>
              ) : null}

              <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 14 }}>Délka</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {(
                  [
                    ['Beze', 'beze změny'],
                    ['Prodlouzeno', 'delší'],
                    ['Zkraceno', 'kratší'],
                  ] as const
                ).map(([hodnota, text]) => (
                  <Pressable
                    key={hodnota}
                    onPress={() => setDelka(hodnota)}
                    style={({ pressed }) => [
                      s.volba,
                      {
                        borderColor: delka === hodnota ? t.voda : t.linka,
                        backgroundColor: delka === hodnota ? t.zvyrazneni : 'transparent',
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}>
                    <Text style={{ color: delka === hodnota ? t.text : t.tlumeny }}>{text}</Text>
                  </Pressable>
                ))}
              </View>

              {!jdeVyhlasit && kurzPlati ? (
                <Text style={{ color: t.tlumeny, fontSize: 12, marginTop: 10 }}>
                  Vyplň kurz, nebo změň délku — vlajka C bez údaje posádkám nic neřekne.
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={{ color: t.tlumeny, fontSize: 13, marginTop: 14 }}>
                Čím se značka nahrazuje (nepovinné)
              </Text>
              <TextInput
                value={poznamka}
                onChangeText={setPoznamka}
                placeholder="doprovodný člun"
                placeholderTextColor={t.tlumeny}
                maxLength={200}
                style={[
                  s.pole,
                  { color: t.text, borderColor: t.linka, backgroundColor: t.zvyrazneni },
                ]}
              />
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable
              onPress={onZrus}
              style={({ pressed }) => [
                s.oknoTlacitko,
                { borderColor: t.linka, borderWidth: 1, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Text style={{ color: t.tlumeny, fontSize: 17, fontWeight: '700' }}>Zrušit</Text>
            </Pressable>

            <Pressable
              disabled={!jdeVyhlasit || posila}
              onPress={() =>
                void onVyhlas(
                  zadani.druh === 'ZmenaUseku'
                    ? { druh: 'ZmenaUseku', prvek: zadani.prvek, kurz: cisloKurzu, delka }
                    : {
                        druh: 'ChybejiciZnacka',
                        prvek: zadani.prvek,
                        poznamka: poznamka.trim() || null,
                      },
                )
              }
              style={({ pressed }) => [
                s.oknoTlacitko,
                {
                  backgroundColor: t.voda,
                  opacity: pressed || posila ? 0.6 : jdeVyhlasit ? 1 : 0.45,
                },
              ]}>
              {posila ? (
                <ActivityIndicator color={pismoNaVyplni(t, t.voda)} />
              ) : (
                <Text
                  style={{ color: pismoNaVyplni(t, t.voda), fontSize: 17, fontWeight: '700' }}>
                  Vyhlásit
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  prvek: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  // `minHeight` kvůli meznímu rozměru klepacího místa (44 pt) — hlídá to
  // `tools/kontrola-dotyku.py`. Na houpající se lodi je to ta mez, která
  // rozhoduje, jestli se klepne na úkon, nebo vedle.
  dlazdice: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, padding: 10 },
  dlazdiceNadpis: { fontSize: 15, fontWeight: '700' },
  dlazdicePopis: { fontSize: 12, marginTop: 2 },

  vyhlaseny: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  // Písmeno vlajky velké: na vodě se o úkonu mluví jím.
  vlajka: { fontSize: 24, fontWeight: '700', width: 28, textAlign: 'center' },
  odvolat: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },

  zastena: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  okno: { borderRadius: 14, borderWidth: 1, padding: 18 },
  pole: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 20,
  },
  volba: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oknoTlacitko: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

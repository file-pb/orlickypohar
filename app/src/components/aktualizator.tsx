import { usePathname, useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useUpdates } from 'expo-updates';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import {
  DOMOV_KLID_MS, KONTROLA_PO_NAVRATU_MS, KONTROLA_V_POPREDI_MS, maSeKontrolovat, nactiPamet,
  poStartu, pouzijVerzi, ulozPamet, zkontrolujTed,
} from '@/lib/aktualizace';
import {
  prekazkyRestartu, restartovatTed, zamkyTed, type Prekazka, type Prilezitost, type Zamek,
} from '@/lib/restart';
import { spustAktualizaci, zeptejSePlay } from '@/lib/play';
import { overSpojeni, stavSite, zapisuVLetu } from '@/lib/sit';
import { NEJDELSI_JIZDA_S } from '@/lib/start';
import { bezicZaznam } from '@/lib/tracker/zaznam';
import { ukazkaBezi } from '@/lib/ukazka';
import { obnovRegistraci } from '@/lib/upozorneni';
import { nastavCekajici } from '@/lib/verze-hlavicka';

/** Kolik času dostane ověření spojení těsně před restartem. Volba. */
const OVERENI_SITE_MS = 1_500;

/**
 * Záznam trasy a simulace se čtou z databáze, ne ze zámku obrazovky:
 * běží i tehdy, když člověk z obrazovky trasy odešel. Záznam starší než
 * nejdelší možná jízda je zapomenutý, ne běžící — aktualizaci neblokuje.
 *
 * Záznam GPS by restart podle kódu přežil (stav v SQLite, nativní služba),
 * jenže na telefonu to ověřené není (testy/README.md). Do té doby drží.
 */
function zamkyZaznamu(ted: number): Zamek[] {
  try {
    const z = bezicZaznam();
    if (!z || ted - z.zacatek > NEJDELSI_JIZDA_S * 1000) return [];
    return [z.zdroj === 'simulace' ? 'simulace' : 'zaznam'];
  } catch {
    return [];
  }
}

/** Co právě brání restartu — totéž pro samoaktualizaci i pro tlačítko. */
export function prekazkyTed(): Prekazka[] {
  const ted = Date.now();
  return prekazkyRestartu({
    ted,
    zamky: [...zamkyTed(), ...zamkyZaznamu(ted)],
    ukazka: ukazkaBezi(),
    zapisuVLetu: zapisuVLetu(),
    sit: stavSite(),
  });
}

/**
 * Rozběhnutou aktualizaci z Play obnoví po návratu do popředí — jak radí
 * Google (DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS): Play ji jinak dotahuje
 * na pozadí a appku pak restartuje bez ohledu na to, co se zrovna děje.
 * Sama jen tehdy, když nic nedrží zámek; jinak ji nabídne pruh. Na balíčku
 * bez modulu (18) Play odpoví `nejde` a nestane se nic.
 */
async function obnovPrerusenou(): Promise<void> {
  if ((await zeptejSePlay()).druh !== 'probiha') return;
  if (prekazkyTed().some((p) => p !== 'bez-site')) return;
  await spustAktualizaci();
}

/**
 * Samoaktualizace JavaScriptu — nic nevykresluje, jen hlídá.
 *
 * <b>Proč to existuje</b> (Filip, 27. 11. 2026: *„aby se ta apka
 * aktualizovala sama tu říkáme už několik dní a furt si to musím
 * vydupávat"*). expo-updates se ptá jen při studeném startu a staženou
 * verzi použije až při dalším. Appka na Androidu leží v paměti klidně
 * dny, takže oprava vydaná ráno se k posádce dostala za několik dní —
 * nebo vůbec. Tahle komponenta se ptá i za běhu a staženou verzi použije
 * sama, v chvíli, kdy restart nic nevezme.
 *
 * Kdy se ptá: po startu, po návratu z pozadí a v popředí s rozestupem
 * (`aktualizace.ts`). Kdy použije: po delším návratu z pozadí a na
 * domovské obrazovce — a jen když nic nedrží zámek (`restart.ts`).
 * Stažení dokončené v popředí se nikdy nepoužije hned: člověk pracuje.
 *
 * <b>Na pozadí se nerestartuje nikdy.</b> Na Androidu je pozadí i dialog
 * oprávnění, galerie a přihlášení, a časovače tam stojí, takže restart
 * odložený do pozadí nejde spolehlivě naplánovat.
 */
export function Aktualizator() {
  const stav = useUpdates();
  const pathname = usePathname();
  const router = useRouter();
  const tmave = useColorScheme() === 'dark';
  const pozadi = (tmave ? Colors.dark : Colors.light).pozadi;

  const vPozadiOd = useRef<number | null>(null);
  const pracuje = useRef(false);
  const zaneprazdneno = useRef(false);
  zaneprazdneno.current = stav.isChecking || stav.isDownloading || stav.isRestarting;

  const pripravena = stav.isUpdatePending ? (stav.downloadedUpdate?.updateId ?? null) : null;

  // Stažená a nepoužitá verze jde do hlavičky: server tak pozná telefon,
  // který novou verzi má, ale ještě neměl kdy ji použít.
  useEffect(() => nastavCekajici(pripravena), [pripravena]);

  // Po startu: vzala se verze, do které se appka minule sama restartovala?
  // A server se o nové verzi dozví i u zařízení k upozorněním.
  useEffect(() => {
    if (!Updates.isEnabled) return;
    ulozPamet(poStartu(nactiPamet(), Updates.updateId ?? null, Updates.isEmergencyLaunch));
    const registrace = setTimeout(() => {
      if (!ukazkaBezi()) void obnovRegistraci();
    }, 20_000);
    return () => clearTimeout(registrace);
  }, []);

  const zkontroluj = useCallback(async (rozestupMs: number) => {
    if (!Updates.isEnabled || ukazkaBezi() || pracuje.current || zaneprazdneno.current) return;
    if (!maSeKontrolovat(Date.now(), nactiPamet().kontrola?.kdy ?? null, rozestupMs)) return;
    pracuje.current = true;
    try {
      await zkontrolujTed();
    } finally {
      pracuje.current = false;
    }
  }, []);

  const zkusPouzit = useCallback(
    async (kdy: Prilezitost) => {
      if (!Updates.isEnabled || !pripravena || pracuje.current) return;
      const odmitnuta = nactiPamet().odmitnuta;
      // Rychlé síto bez sítě: verze, která se nevzala, nebo krátký návrat.
      if (!restartovatTed(kdy, { id: pripravena }, odmitnuta, [])) return;
      pracuje.current = true;
      try {
        // Spojení se ověří těsně před restartem; nestihne-li se, příležitost propadá.
        await Promise.race([overSpojeni(), new Promise((h) => setTimeout(h, OVERENI_SITE_MS))]);
        if (!restartovatTed(kdy, { id: pripravena }, odmitnuta, prekazkyTed())) return;
        await pouzijVerzi(pripravena, pozadi);
      } finally {
        pracuje.current = false;
      }
    },
    [pripravena, pozadi],
  );

  // Návrat z pozadí: hlavní příležitost, člověk ještě nic nedělá.
  useEffect(() => {
    const odber = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        const pauza = vPozadiOd.current === null ? 0 : Date.now() - vPozadiOd.current;
        vPozadiOd.current = null;
        void (async () => {
          await zkusPouzit({ druh: 'navrat', vPozadiMs: pauza });
          await zkontroluj(KONTROLA_PO_NAVRATU_MS);
          await obnovPrerusenou();
        })();
      } else if (vPozadiOd.current === null) {
        vPozadiOd.current = Date.now();
      }
    });
    return () => odber.remove();
  }, [zkusPouzit, zkontroluj]);

  // Po startu a pak v popředí s rozestupem. Rozestup se počítá od uložené
  // kontroly, takže opakované studené starty server nebombardují.
  useEffect(() => {
    if (!Updates.isEnabled) return;
    const prvni = setTimeout(() => void zkontroluj(KONTROLA_PO_NAVRATU_MS), 10_000);
    const tik = setInterval(() => {
      if (AppState.currentState === 'active') void zkontroluj(KONTROLA_V_POPREDI_MS);
    }, 60_000);
    return () => {
      clearTimeout(prvni);
      clearInterval(tik);
    };
  }, [zkontroluj]);

  // Domovská obrazovka: restart tu nic nebere. Chvíle klidu kvůli Redirectu.
  useEffect(() => {
    if (pathname !== '/' || !pripravena) return;
    const casovac = setTimeout(() => {
      if (!router.canGoBack()) void zkusPouzit({ druh: 'domov' });
    }, DOMOV_KLID_MS);
    return () => clearTimeout(casovac);
  }, [pathname, pripravena, router, zkusPouzit]);

  return null;
}

/**
 * Sdělení o poloze, které musí přijít **před** systémovým dotazem.
 *
 * <b>Není to ohleduplnost, je to podmínka vydání do Google Play.</b>
 * *Understanding location in the background permissions*
 * (support.google.com/googleplay/android-developer/answer/9799150, čteno
 * 10. 11. 2026): „An app must display a prominent disclosure in a dialog
 * that pops up before the app's location runtime permission." Zásady na
 * webu to nenahradí — *User Data* (…/answer/10144311) žádá, aby sdělení
 * bylo v appce samotné, bylo vidět při běžném používání bez chození do
 * nastavení, a výslovně zakazuje mít ho jen v zásadách nebo podmínkách.
 *
 * <b>Text má tři povinné části</b> (…/9799150, *Disclosure statement
 * requirements*): slovo **poloha**, zmínku, že se sbírá **i když je appka
 * zavřená nebo se nepoužívá**, a **výčet všech funkcí**, které polohu na
 * pozadí používají. Reklamní věta, kterou tatáž stránka žádá navíc, se
 * nepřidává — appka reklamu nemá. Hlídá to `testy/sdeleni.test.ts`:
 * přepsat text se smí, zahodit kteroukoliv z těch částí ne.
 *
 * <b>Souhlas se tady nesbírá.</b> Google k témuž dialogu: „Doesn't need
 * explicit user consent such as an 'accept' or 'I understand.' This is
 * done in the runtime prompt that immediately follows." Tlačítko *Rozumím*
 * tedy není právní úkon, jen cesta dál. Opačným směrem je ale pravidlo
 * tvrdé: zavření zpět ani klepnutí mimo se nesmí brát jako souhlas
 * (…/10144311, „Must not interpret navigation away from the disclosure …
 * as consent"), takže každá jiná cesta z dialogu než to tlačítko vrací
 * nesouhlas a systémový dotaz nepřijde.
 *
 * <b>Proč je tenhle soubor bez Reactu i bez Expa.</b> Kreslí to
 * `components/sdeleni-o-poloze.tsx`, rozhoduje tohle — stejné dělení jako
 * u proužku spojení. Díky němu projde text i stav testy na Node, kde
 * nativní moduly není čím nahradit.
 */

/**
 * Co se posádce řekne. Jako data, ne jako jeden odstavec: dialog z toho
 * udělá odrážky a systémová náhrada (`uloha.ts`) jeden text.
 */
export const SDELENI = {
  nadpis: 'Appka bude sbírat polohu',

  /** Tady je to podstatné: co se sbírá a že i při zavřené appce. */
  uvod:
    'Orlický pohár sbírá polohu telefonu, i když je appka zavřená nebo ji '
    + 'nepoužíváš, a to k těmhle věcem:',

  /**
   * Všechny funkce, které polohu na pozadí používají — výčet je povinný
   * a musí být úplný. Když přibude čtvrtá, patří sem, ne jen do zásad.
   */
  ucely: [
    'záznam trasy lodi — podklad pro rozhodčího a k protestu',
    'živý přenos polohy na web a na tabuli, když ho rozhodčí povolí',
    'hlášení, že telefon žije, a stav baterie — v čase startu si záznam spustí sám',
  ],

  zaver:
    'Poloha se čte jen tehdy, když záznam nebo hlášení spustíš, a jen do chvíle, '
    + 'než ho ukončíš.',

  odkaz: 'https://orlickypohar.klihovka.cz/osobni-udaje',
  odkazPopis: 'Co se s trasou děje a kdo ji vidí',

  dal: 'Rozumím, pokračovat',
  zrusit: 'Zrušit',
} as const;

/** Totéž jedním textem — pro systémový dialog, který odrážky neumí. */
export function textSdeleni(): string {
  return [
    SDELENI.uvod,
    ...SDELENI.ucely.map((u) => `• ${u}`),
    SDELENI.zaver,
    SDELENI.odkaz,
  ].join('\n\n');
}

type Odpoved = (souhlas: boolean) => void;

/**
 * Kdo dialog kreslí. Jeden, přihlášený z `_layout.tsx` — tedy z korzene
 * zásobníku, aby byl na místě na každé obrazovce, odkud se dá záznam
 * spustit.
 */
let host: ((odpoved: Odpoved) => void) | null = null;

export function prihlasHosta(ukaz: (odpoved: Odpoved) => void): () => void {
  host = ukaz;
  return () => {
    // Jen svoje: kdyby se mezitím přihlásil jiný, tenhle úklid mu ho
    // nesmí odpojit.
    if (host === ukaz) host = null;
  };
}

/** Je komu dialog zadat? Když ne, `uloha.ts` sáhne po systémovém. */
export function hostJeNaMiste(): boolean {
  return host !== null;
}

/**
 * Ukáže sdělení a čeká, jak posádka rozhodne. `false` znamená „dál ne" —
 * ať to bylo tlačítkem *Zrušit*, nebo zavřením dialogu.
 */
export function cekejNaSdeleni(): Promise<boolean> {
  const ukaz = host;
  if (!ukaz) return Promise.resolve(false);
  return new Promise<boolean>((hotovo) => {
    let odpovezeno = false;
    ukaz((souhlas) => {
      // Dialog může odpovědět dvakrát — tlačítkem a pak ještě zavřením.
      // Druhá odpověď by přepsala první a `Promise` to stejně ignoruje,
      // takže se zahazuje tady, aby se o tom nemuselo myslet nahoře.
      if (odpovezeno) return;
      odpovezeno = true;
      hotovo(souhlas);
    });
  });
}

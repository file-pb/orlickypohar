/**
 * Co appka ukáže tomu, kdo přišel jenom koukat.
 *
 * <b>Sledování je podlaha appky</b> (Filip, 26. 11. 2026: *„vždycky aspoň
 * to sledování zůstane"*), takže je to u spousty lidí jediná obrazovka,
 * kterou kdy uvidí: nepřihlášenému appka otevře rovnou ji
 * (`lib/rozcestnik.ts`). Až do 26. 11. to byl seznam let, který o sobě
 * v komentáři říkal, že je to *„cesta k regatě pro zkoušení"* — na to, aby
 * si cizí člověk appku nechal v telefonu, je to málo.
 *
 * <b>Pravidla zvlášť od vykreslování</b>, aby se dala ověřit bez telefonu
 * (`app/testy/sledovani.test.ts`). Jsou tu dvě otázky a obě mají jednu
 * správnou odpověď: <b>který ročník</b> a <b>která regata z něj</b>.
 */
import type { SerieShrnuti, ZavodShrnuti } from './api';

/** Den v místním čase, bez hodin — datumy regat jsou kalendářní, ne okamžiky. */
function den(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** `2026-05-17` jako týž druh čísla, s jakým počítá `den`. */
function denZIso(iso: string): number {
  const [r, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(r, m - 1, d);
}

/**
 * Který ročník appka ukáže sama od sebe.
 *
 * <b>Ten letošní, jinak nejnovější.</b> Příští ročník bývá v kalendáři
 * dřív, než ten letošní skončí — v listopadu 2026 jsou v API 2026 i 2027 —
 * a kdo přijde kouknout na výsledky, chce ten, který se jede, ne ten, který
 * se teprve plánuje. Jakmile rok přeskočí, přeskočí s ním i tahle volba.
 *
 * Starší ročníky se tím neztrácejí: obrazovka je vypíše pod kalendářem.
 */
export function kterySledovat(serie: SerieShrnuti[], dnes: Date): SerieShrnuti | null {
  if (serie.length === 0) return null;
  const letos = serie.filter((s) => s.rok === dnes.getFullYear());
  const zCeho = letos.length > 0 ? letos : serie;
  return zCeho.reduce((a, b) => (b.rok > a.rok ? b : a));
}

/** Co se o vybrané regatě řekne nahoře. */
export type Kdy = 'dnes' | 'blizi' | 'odjeto';

export type NaRade = { zavod: ZavodShrnuti; kdy: Kdy };

/**
 * Regata, kvůli které má smysl obrazovku otevřít — a čím je zajímavá.
 *
 * Pořadí otázek je pořadí, v jakém se na to ptá člověk: <b>jede se dnes?
 * ne — kdy se jede příště? už nic — jak to dopadlo naposled?</b>
 *
 * <b>Zrušená regata se nenabízí v žádné z těch tří rolí.</b> Dnešní zrušená
 * není „dnes se jede", nejbližší zrušená není, kam se chystat, a odjetá
 * zrušená nemá výsledky (`procNejsouVysledky`). Ukázat ji nahoře by byla
 * jediná věta, která by na té obrazovce lhala.
 *
 * <b>Vícedenní regata se počítá celá.</b> `datumKonce` je u 24hodinovky
 * jiný den než `datum`, takže bez něj by druhý den vypadalo, že se nejede
 * nic.
 */
export function kteraRegata(zavody: ZavodShrnuti[], dnes: Date): NaRade | null {
  const dnesek = den(dnes);
  const zive = zavody.filter((z) => z.stav !== 'Zruseny');
  if (zive.length === 0) return null;

  const probiha = zive.find((z) => {
    const od = denZIso(z.datum);
    const doKdy = z.datumKonce ? denZIso(z.datumKonce) : od;
    return od <= dnesek && dnesek <= doKdy;
  });
  if (probiha) return { zavod: probiha, kdy: 'dnes' };

  const budouci = zive
    .filter((z) => denZIso(z.datum) > dnesek)
    .sort((a, b) => denZIso(a.datum) - denZIso(b.datum));
  if (budouci.length > 0) return { zavod: budouci[0], kdy: 'blizi' };

  // Nic dalšího se nejede. Pak je nejzajímavější poslední odjetá —
  // kvůli výsledkům, ne kvůli termínu.
  const minule = zive
    .filter((z) => denZIso(z.datum) < dnesek)
    .sort((a, b) => denZIso(b.datum) - denZIso(a.datum));
  return minule.length > 0 ? { zavod: minule[0], kdy: 'odjeto' } : null;
}

/**
 * Jedna věta nad regatou. <b>Říká, co se děje, ne jak se ta regata
 * jmenuje</b> — jméno je hned pod tím a dvakrát ho nikdo číst nechce.
 */
export function vetaNaRade(kdy: Kdy): string {
  if (kdy === 'dnes') return 'Dnes se jede';
  if (kdy === 'blizi') return 'Nejbližší regata';
  return 'Naposledy se jelo';
}

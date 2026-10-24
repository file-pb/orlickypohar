import { OBRYS_ORLIKU } from "./orlik-obrys.ts";

/**
 * Cesta po vodě mezi prvky trati.
 *
 * <b>Zadání od Filipa (11. 10. 2026):</b> *„ta rovná spojnice je hloupá,
 * naznak trati působí přirozeněji… pokud by to byl problém, tak raději bez
 * čáry"* — a *„pokud by to šlo, tak by mohla naznačovat obeplouvání
 * prvku"*.
 *
 * <b>Proč to vůbec je:</b> Orlík je zatopené údolí, takže přímka mezi
 * dvěma bójemi vede přes kopec častěji, než by člověk řekl. Změřeno na
 * obrysu nádrže, na náhodných párech vodních bodů do 2,5 km od sebe:
 * noha 200–600 m přetíná suchou zem ve 24 % případů, 600–1 200 m v 65 %,
 * 1,2–2,5 km v 89 %. Náhodné páry nadsazují (opravdová trať leží v jednom
 * úseku zátopy, ne ve dvou ramenech), ale na dlouhé trati je přímka
 * prostě lež.
 *
 * <b>Co to není:</b> vytyčená dráha. Loď křižuje a u břehu nejede, takže
 * spojnice zůstává čárkovaná — je to pořadí a hrubá cesta, ne stopa.
 * Nejkratší cesta po vodě je ale menší lež než čára přes les.
 *
 * <b>Kde to běží:</b> celé na serveru, v renderu mapky. Obrys nádrže se
 * tím do prohlížeče nikdy nedostane a na mobilu to nestojí nic.
 */

/** Poloha ve stupních, jako všude jinde. */
export type Poloha = { sirka: number; delka: number };

/** Na kterém boku loď prvek míjí. Tytéž hodnoty jako `StranaPrvku`. */
export type Bok = "PoLeve" | "PoPrave";

/** Uzel trati: kudy vede dráha, a jestli se u toho ví, kterým bokem. */
export type UzelTrati = {
  poloha: Poloha;
  /** Chybí tam, kde to data neříkají — u brány si bok volí posádka. */
  bok?: Bok | null;
  /**
   * Točí se u prvku loď? <b>Bez téhle informace to nejde spočítat.</b>
   * Oblouk okolo značky je jednoznačně daný tím, kde se do něj vjíždí a
   * kde vyjíždí — jenže u průjezdu, kde se směr skoro nemění, z toho
   * vyjde obkroužení o 353° místo nuly. Obojí je geometricky v pořádku;
   * co z toho je pravda, říká teprve typ prvku.
   */
  otaci?: boolean;
};

const METRU_NA_STUPEN = 111_320;

/** Hustota mřížky, na které se hledá cesta. Jemnější mřížka cestu nezkrátí,
 *  jen zdraží render: obrys je sám zjednodušený na 20 m. */
const KROK_M = 25;

/** Kolik vody okolo trati se do mřížky vejde. <b>Není to kosmetika:</b>
 *  při lemu 400 m se jedné z osmi zkoušených nohou cesta nenašla, protože
 *  zajížďka za ostroh potřebovala víc místa, než mřížka měla. */
const NEJMENSI_LEM_M = 600;
const LEM_PODIL = 0.5;

/** Strop na velikost mřížky, ať dlouhá trať neujede do stovek MB. */
const NEJVIC_BUNEK = 400_000;

/** O kolik se cesta drží dál od břehu. <b>Není to jen slušnost k lodi:</b>
 *  napnutá cesta se opírá přímo o výběžek, takže zaoblit roh by znamenalo
 *  uhnout do kopce. S odstupem je kam. Kde se kvůli odstupu cesta nenajde
 *  (úzká zátoka), hledá se znovu bez něj. */
const ODSTUP_OD_BREHU_M = 30;

/** Jak daleko od bóje se smí hledat voda, když bóje na obrysu neleží.
 *  Obrys je z plného nadržení a zjednodušený na 20 m, takže bóje u břehu
 *  může vyjít „na suchu" — to je nepřesnost mapy, ne chyba zápisu. */
const DOSAH_PRICHYCENI_M = 80;

export type Mrizka = {
  delkaOd: number;
  sirkaOd: number;
  krokDelky: number;
  krokSirky: number;
  sloupcu: number;
  radku: number;
  /** 1 = voda. Index `x * radku + y`. */
  voda: Uint8Array;
  /** Voda zmenšená o odstup od břehu — po téhle se hledá cesta. */
  plavna: Uint8Array;
  /** Hrana buňky v metrech. Potřeba, když se maska zmenšuje o metry. */
  krokM: number;
  /** Metry na stupeň délky na téhle šířce — pro počty vzdáleností. */
  mx: number;
  my: number;
};

function metryNaStupenDelky(sirka: number) {
  return METRU_NA_STUPEN * Math.cos((sirka * Math.PI) / 180);
}

/**
 * Mřížka vody nad tratí. <b>Rastruje se po řádcích</b> (scanline), ne bod
 * po bodu: test „leží bod v mnohoúhelníku" by na 1 365 hranách a desítkách
 * tisíc buněk znamenal desítky milionů operací, zatímco řádků je pár
 * stovek. Pro každý řádek se spočítají průsečíky s obrysem, setřídí a
 * vyplní se mezi páry.
 */
export function mrizkaVody(body: Poloha[]): Mrizka {
  const sirky = body.map((b) => b.sirka);
  const delky = body.map((b) => b.delka);
  const stredSirka = (Math.min(...sirky) + Math.max(...sirky)) / 2;
  const my = METRU_NA_STUPEN;
  const mx = metryNaStupenDelky(stredSirka);

  const sirkaM = (Math.max(...delky) - Math.min(...delky)) * mx;
  const vyskaM = (Math.max(...sirky) - Math.min(...sirky)) * my;
  const lem = Math.max(NEJMENSI_LEM_M, Math.hypot(sirkaM, vyskaM) * LEM_PODIL);

  // Krok se zvětší, kdyby trať byla tak dlouhá, že by se mřížka nevešla.
  const hrubeSloupcu = (sirkaM + 2 * lem) / KROK_M;
  const hrubeRadku = (vyskaM + 2 * lem) / KROK_M;
  const zhrubnuti = Math.max(1, Math.sqrt((hrubeSloupcu * hrubeRadku) / NEJVIC_BUNEK));
  const krokM = KROK_M * zhrubnuti;

  const krokDelky = krokM / mx;
  const krokSirky = krokM / my;
  const delkaOd = Math.min(...delky) - lem / mx;
  const sirkaOd = Math.min(...sirky) - lem / my;
  const sloupcu = Math.ceil((sirkaM + 2 * lem) / krokM) + 1;
  const radku = Math.ceil((vyskaM + 2 * lem) / krokM) + 1;

  const voda = new Uint8Array(sloupcu * radku);

  // Hrany obrysu předpočítané, ať se v cyklu nesahá do vnořených polí.
  const hrany: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const kruh of OBRYS_ORLIKU) {
    for (let i = 0; i + 1 < kruh.length; i++) {
      hrany.push({ x1: kruh[i][0], y1: kruh[i][1], x2: kruh[i + 1][0], y2: kruh[i + 1][1] });
    }
  }

  const prusecikyX: number[] = [];
  for (let y = 0; y < radku; y++) {
    const sirkaRadku = sirkaOd + y * krokSirky;
    prusecikyX.length = 0;
    for (const h of hrany) {
      if (h.y1 > sirkaRadku !== h.y2 > sirkaRadku) {
        prusecikyX.push(h.x1 + ((sirkaRadku - h.y1) * (h.x2 - h.x1)) / (h.y2 - h.y1));
      }
    }
    if (prusecikyX.length < 2) continue;
    prusecikyX.sort((a, b) => a - b);
    for (let p = 0; p + 1 < prusecikyX.length; p += 2) {
      const od = Math.max(0, Math.ceil((prusecikyX[p] - delkaOd) / krokDelky));
      const do_ = Math.min(sloupcu - 1, Math.floor((prusecikyX[p + 1] - delkaOd) / krokDelky));
      for (let x = od; x <= do_; x++) voda[x * radku + y] = 1;
    }
  }

  return {
    delkaOd,
    sirkaOd,
    krokDelky,
    krokSirky,
    sloupcu,
    radku,
    voda,
    plavna: zmensi(voda, sloupcu, radku, Math.round(ODSTUP_OD_BREHU_M / krokM)),
    krokM,
    mx,
    my,
  };
}

/**
 * Eroze masky o `kolik` buněk, odděleně po osách — vodorovně a pak svisle.
 * Dvě lineární průchody místo okna `k×k`.
 */
function zmensi(maska: Uint8Array, sloupcu: number, radku: number, kolik: number) {
  if (kolik < 1) return maska;
  const mezi = new Uint8Array(maska.length);
  for (let x = 0; x < sloupcu; x++) {
    for (let y = 0; y < radku; y++) {
      let vse = 1;
      for (let d = -kolik; d <= kolik && vse; d++) {
        const q = y + d;
        if (q < 0 || q >= radku || maska[x * radku + q] === 0) vse = 0;
      }
      mezi[x * radku + y] = vse;
    }
  }
  const ven = new Uint8Array(maska.length);
  for (let x = 0; x < sloupcu; x++) {
    for (let y = 0; y < radku; y++) {
      let vse = 1;
      for (let d = -kolik; d <= kolik && vse; d++) {
        const q = x + d;
        if (q < 0 || q >= sloupcu || mezi[q * radku + y] === 0) vse = 0;
      }
      ven[x * radku + y] = vse;
    }
  }
  return ven;
}

function bunka(m: Mrizka, p: Poloha) {
  return {
    x: Math.round((p.delka - m.delkaOd) / m.krokDelky),
    y: Math.round((p.sirka - m.sirkaOd) / m.krokSirky),
  };
}

function naPolohu(m: Mrizka, x: number, y: number): Poloha {
  return { delka: m.delkaOd + x * m.krokDelky, sirka: m.sirkaOd + y * m.krokSirky };
}

function jeVoda(m: Mrizka, maska: Uint8Array, x: number, y: number) {
  if (x < 0 || y < 0 || x >= m.sloupcu || y >= m.radku) return false;
  return maska[x * m.radku + y] === 1;
}

/** Leží poloha na vodě? Exportované kvůli ověřování. */
export function lezNaVode(m: Mrizka, p: Poloha, maska: Uint8Array = m.voda) {
  const b = bunka(m, p);
  return jeVoda(m, maska, b.x, b.y);
}

/** Nejbližší vodní buňka k bóji, která na obrysu neleží. `null`, když je
 *  od vody dál než `DOSAH_PRICHYCENI_M` — pak o ní mapa vody nic neví. */
function prichytNaVodu(m: Mrizka, maska: Uint8Array, p: Poloha) {
  const b = bunka(m, p);
  if (jeVoda(m, maska, b.x, b.y)) return b;
  const krokM = m.krokDelky * m.mx;
  const dosah = Math.ceil(DOSAH_PRICHYCENI_M / krokM);
  for (let r = 1; r <= dosah; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (jeVoda(m, maska, b.x + dx, b.y + dy)) return { x: b.x + dx, y: b.y + dy };
      }
    }
  }
  return null;
}

/** Binární halda. Pole s `sort` by na desítkách tisíc buněk bylo kvadratické. */
class Halda {
  private klice: number[] = [];
  private data: number[] = [];

  get prazdna() {
    return this.data.length === 0;
  }

  vloz(klic: number, hodnota: number) {
    this.klice.push(klic);
    this.data.push(hodnota);
    let i = this.data.length - 1;
    while (i > 0) {
      const o = (i - 1) >> 1;
      if (this.klice[o] <= this.klice[i]) break;
      [this.klice[o], this.klice[i]] = [this.klice[i], this.klice[o]];
      [this.data[o], this.data[i]] = [this.data[i], this.data[o]];
      i = o;
    }
  }

  vyber() {
    const vrchol = this.data[0];
    const k = this.klice.pop()!;
    const d = this.data.pop()!;
    if (this.data.length > 0) {
      this.klice[0] = k;
      this.data[0] = d;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let nej = i;
        if (l < this.data.length && this.klice[l] < this.klice[nej]) nej = l;
        if (r < this.data.length && this.klice[r] < this.klice[nej]) nej = r;
        if (nej === i) break;
        [this.klice[nej], this.klice[i]] = [this.klice[i], this.klice[nej]];
        [this.data[nej], this.data[i]] = [this.data[i], this.data[nej]];
        i = nej;
      }
    }
    return vrchol;
  }
}

const SOUSEDI = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Nejkratší cesta po vodě, A* po mřížce. `null`, když cesta není — třeba
 * když jeden konec leží mimo vodu nebo za hrází.
 *
 * <b>Úhlopříčka se nesmí prosmýknout mezi dvěma kusy země</b>, proto se u
 * ní obě pravoúhlé buňky musí taky kontrolovat. Bez toho cesta občas
 * prošla ostrohem v jednom bodě.
 */
export function cestaPoVode(m: Mrizka, od: Poloha, kam: Poloha): Poloha[] | null {
  // Nejdřív s odstupem od břehu, a teprve když to nejde, i těsně kolem.
  return hledej(m, m.plavna, od, kam) ?? hledej(m, m.voda, od, kam);
}

/**
 * Cesta, která se drží <b>dál od břehu než kreslená spojnice</b>.
 *
 * <b>K čemu</b> (Filip, 24. 10. 2026): *„měřicí trasa fakt pouze na vodě
 * a mimo mělká místa"*. Podle téhle trasy se počítá pomyslné pořadí, takže
 * nesmí vést tam, kam loď nemůže. Kreslená spojnice si vystačí s 30 m,
 * protože jenom naznačuje směr; měřená musí mít pod kýlem vodu.
 *
 * <b>Mělčinu přitom neumíme změřit</b> — batymetrii nádrže nemáme a
 * z obrysu se nevyčte. Vzdálenost od břehu je **náhražka**, ne hloubka:
 * u strmého zatopeného svahu nadsazuje, v ploché zátoce podceňuje. Je to
 * ale jediné, co z obrysu jde, a chybuje na správnou stranu — dál od
 * břehu je hlouběji skoro vždycky.
 *
 * Kde se s plným odstupem cesta nenajde, povolí se postupně menší, až
 * nakonec i voda těsně u břehu. Trasa je lepší než žádná.
 */
export function cestaProMereni(
  m: Mrizka,
  od: Poloha,
  kam: Poloha,
  odstupM: number,
): Poloha[] | null {
  for (const podil of [1, 0.6, 0.3]) {
    const bunek = Math.round((odstupM * podil) / m.krokM);
    if (bunek < 1) break;
    const maska = zmensi(m.voda, m.sloupcu, m.radku, bunek);
    const cesta = hledej(m, maska, od, kam);
    if (cesta) return cesta;
  }
  return cestaPoVode(m, od, kam);
}

function hledej(m: Mrizka, maska: Uint8Array, od: Poloha, kam: Poloha): Poloha[] | null {
  const a = prichytNaVodu(m, maska, od);
  const b = prichytNaVodu(m, maska, kam);
  if (!a || !b) return null;

  const krokM = m.krokDelky * m.mx;
  const pocet = m.sloupcu * m.radku;
  const start = a.x * m.radku + a.y;
  const cil = b.x * m.radku + b.y;
  if (start === cil) return [od, kam];

  const cena = new Float64Array(pocet).fill(Infinity);
  const odkud = new Int32Array(pocet).fill(-1);
  const hotovo = new Uint8Array(pocet);
  cena[start] = 0;

  const dohad = (i: number) => {
    const dx = Math.abs(Math.floor(i / m.radku) - b.x);
    const dy = Math.abs((i % m.radku) - b.y);
    return (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)) * krokM;
  };

  const halda = new Halda();
  halda.vloz(dohad(start), start);

  while (!halda.prazdna) {
    const u = halda.vyber();
    if (hotovo[u]) continue;
    hotovo[u] = 1;
    if (u === cil) break;
    const ux = Math.floor(u / m.radku);
    const uy = u % m.radku;
    for (const [dx, dy] of SOUSEDI) {
      const vx = ux + dx;
      const vy = uy + dy;
      if (!jeVoda(m, maska, vx, vy)) continue;
      // Úhlopříčka jen tam, kde je voda i vedle — ať cesta neprojde rohem.
      if (
        dx !== 0 &&
        dy !== 0 &&
        (!jeVoda(m, maska, ux + dx, uy) || !jeVoda(m, maska, ux, uy + dy))
      ) {
        continue;
      }
      const v = vx * m.radku + vy;
      if (hotovo[v]) continue;
      const nova = cena[u] + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1) * krokM;
      if (nova < cena[v]) {
        cena[v] = nova;
        odkud[v] = u;
        halda.vloz(nova + dohad(v), v);
      }
    }
  }

  if (!hotovo[cil]) return null;

  const zpet: number[] = [cil];
  while (zpet[zpet.length - 1] !== start) zpet.push(odkud[zpet[zpet.length - 1]]);
  const hruba = zpet.reverse().map((i) => naPolohu(m, Math.floor(i / m.radku), i % m.radku));

  // Konce vrátit na skutečnou polohu bóje, ne na střed buňky.
  hruba[0] = od;
  hruba[hruba.length - 1] = kam;
  return zaobli(m, napni(m, maska, hruba));
}

/** Vidí jeden bod na druhý po vodě? Vzorkuje se po půlce kroku. */
function vidiPoVode(m: Mrizka, maska: Uint8Array, a: Poloha, b: Poloha) {
  const krokM = m.krokDelky * m.mx;
  const dx = (b.delka - a.delka) * m.mx;
  const dy = (b.sirka - a.sirka) * m.my;
  const kroku = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (krokM / 2)));
  for (let i = 0; i <= kroku; i++) {
    const t = i / kroku;
    const p = {
      delka: a.delka + (b.delka - a.delka) * t,
      sirka: a.sirka + (b.sirka - a.sirka) * t,
    };
    if (!lezNaVode(m, p, maska)) return false;
  }
  return true;
}

/**
 * Napnutí provázku: z cesty po mřížce, která jde po schodech, nechá jen
 * body, kde se musí zalomit. Výsledek obtáhne ostrohy a jinde je přímý —
 * tedy to, co člověk nakreslí od ruky.
 */
function napni(m: Mrizka, maska: Uint8Array, cesta: Poloha[]): Poloha[] {
  if (cesta.length <= 2) return cesta;
  const vysledek = [cesta[0]];
  let kotva = 0;
  for (let i = 2; i < cesta.length; i++) {
    if (!vidiPoVode(m, maska, cesta[kotva], cesta[i])) {
      vysledek.push(cesta[i - 1]);
      kotva = i - 1;
    }
  }
  vysledek.push(cesta[cesta.length - 1]);
  return vysledek;
}

/**
 * Zaoblení rohů napnuté cesty. <b>Bez něj to není křivka, ale lomená
 * čára</b> — a Filip chtěl křivku (11. 10. 2026). Roh se nahradí
 * kvadratickou Bézierovou křivkou mezi body ve vzdálenosti `r` od vrcholu.
 *
 * Zaoblení uhýbá dovnitř zatáčky, tedy u výběžku ke břehu. Proto se cesta
 * hledá s odstupem — a každý vzniklý bod se stejně ověří, protože odstup
 * je jen pravděpodobnost, ne záruka.
 */
function zaobli(m: Mrizka, cesta: Poloha[]): Poloha[] {
  if (cesta.length <= 2) return cesta;
  const r = ODSTUP_OD_BREHU_M;
  const vysledek: Poloha[] = [cesta[0]];
  for (let i = 1; i + 1 < cesta.length; i++) {
    const a = cesta[i - 1];
    const b = cesta[i];
    const c = cesta[i + 1];
    const dA = Math.hypot((a.delka - b.delka) * m.mx, (a.sirka - b.sirka) * m.my);
    const dC = Math.hypot((c.delka - b.delka) * m.mx, (c.sirka - b.sirka) * m.my);
    const polomer = Math.min(r, dA * 0.4, dC * 0.4);
    if (polomer < 5) {
      vysledek.push(b);
      continue;
    }
    const kam = (p: Poloha) => ({
      delka: b.delka + ((p.delka - b.delka) / Math.hypot((p.delka - b.delka) * m.mx, (p.sirka - b.sirka) * m.my)) * polomer,
      sirka: b.sirka + ((p.sirka - b.sirka) / Math.hypot((p.delka - b.delka) * m.mx, (p.sirka - b.sirka) * m.my)) * polomer,
    });
    const od = kam(a);
    const doB = kam(c);
    const oblouk: Poloha[] = [];
    const kroku = 6;
    for (let k = 0; k <= kroku; k++) {
      const t = k / kroku;
      const u = (1 - t) * (1 - t);
      const v = 2 * (1 - t) * t;
      const w = t * t;
      oblouk.push({
        delka: u * od.delka + v * b.delka + w * doB.delka,
        sirka: u * od.sirka + v * b.sirka + w * doB.sirka,
      });
    }
    // Když se oblouk nevejde na vodu, roh zůstane rohem.
    if (oblouk.every((p) => lezNaVode(m, p))) vysledek.push(...oblouk);
    else vysledek.push(b);
  }
  vysledek.push(cesta[cesta.length - 1]);
  return vysledek;
}

function posun(p: Poloha, m: Mrizka, dx: number, dy: number): Poloha {
  return { delka: p.delka + dx / m.mx, sirka: p.sirka + dy / m.my };
}

function smer(m: Mrizka, od: Poloha, kam: Poloha) {
  const dx = (kam.delka - od.delka) * m.mx;
  const dy = (kam.sirka - od.sirka) * m.my;
  const d = Math.hypot(dx, dy);
  return d === 0 ? null : { x: dx / d, y: dy / d };
}

/**
 * Oblouček okolo značky: body, po kterých loď prvek obeplouvá.
 *
 * <b>Který bok je kde:</b> `PoLeve` znamená značku po levoboku, tedy loď
 * jde po její pravé ruce vzhledem ke směru jízdy — stopa se odsadí na
 * pravobok (směr otočený o 90° po směru hodin) a okolo značky jde proti
 * směru hodin. `PoPrave` je zrcadlově. U průjezdu, kde se směr nemění,
 * z toho vyjde oblouk nulový a zbyde odsazení na správnou stranu, což je
 * přesně to, co průjezdní bóje znamená.
 */
function oblouček(
  m: Mrizka,
  znacka: Poloha,
  prichod: { x: number; y: number },
  odchod: { x: number; y: number },
  bok: Bok,
  otaci: boolean,
  r: number,
): { vstup: Poloha; body: Poloha[]; vystup: Poloha } {
  // Odsazení: po levoboku -> na pravobok lodi, tedy (dy, -dx).
  const naStranu = (d: { x: number; y: number }) =>
    bok === "PoLeve" ? { x: d.y, y: -d.x } : { x: -d.y, y: d.x };

  const o1 = naStranu(prichod);
  const o2 = naStranu(odchod);
  const vstup = posun(znacka, m, o1.x * r, o1.y * r);
  const vystup = posun(znacka, m, o2.x * r, o2.y * r);

  const uhel1 = Math.atan2(o1.y, o1.x);
  const uhel2 = Math.atan2(o2.y, o2.x);
  const protiHodinam = bok === "PoLeve";
  let rozdil = protiHodinam ? uhel2 - uhel1 : uhel1 - uhel2;
  rozdil = ((rozdil % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // U průjezdu žádný oblouk — jen odsazení na tu stranu, kterou se míjí.
  // A i u otočné: skoro celé kolo znamená, že se směr nezměnil a cesta se
  // jen o kousek zavrtěla, ne že loď kroužila.
  if (!otaci || rozdil > (5 / 3) * Math.PI) rozdil = 0;

  const kroku = Math.max(0, Math.ceil((rozdil / Math.PI) * 10));
  const body: Poloha[] = [];
  for (let i = 1; i < kroku; i++) {
    const u = uhel1 + (protiHodinam ? 1 : -1) * rozdil * (i / kroku);
    body.push(posun(znacka, m, Math.cos(u) * r, Math.sin(u) * r));
  }
  return { vstup, body, vystup };
}

/** Poslední bod nohy, který leží dál než `polomer` od uzlu. `null`, když
 *  je celá noha kratší — pak oblouk nemá na čem začít. */
function posledniZa(m: Mrizka, noha: Poloha[], uzel: Poloha, polomer: number) {
  for (let i = noha.length - 1; i >= 0; i--) {
    const d = Math.hypot((noha[i].delka - uzel.delka) * m.mx, (noha[i].sirka - uzel.sirka) * m.my);
    if (d > polomer) return i;
  }
  return null;
}

/** Totéž od začátku nohy. */
function prvniZa(m: Mrizka, noha: Poloha[], uzel: Poloha, polomer: number) {
  for (let i = 0; i < noha.length; i++) {
    const d = Math.hypot((noha[i].delka - uzel.delka) * m.mx, (noha[i].sirka - uzel.sirka) * m.my);
    if (d > polomer) return i;
  }
  return null;
}

/** Jak velký oblouček se u značky kreslí. Měřítko mapy rozhoduje: na
 *  dlouhé trati by 25 m byly dva pixely. */
function velikostObloucku(metruNaPixel: number) {
  return Math.min(120, Math.max(20, metruNaPixel * 12));
}

/**
 * Spojnice trati: tahy po vodě mezi uzly, s obloučky u značek, kde se ví,
 * kterým bokem se míjí.
 *
 * <b>Vrací víc tahů, ne jeden.</b> Kde cesta po vodě není, čára chybí —
 * Filip, 11. 10. 2026: *„pokud by to byl problém, tak raději bez čáry"*.
 * Rovná čára přes kopec je to, co se tím ruší, takže ji nemá smysl vracet
 * jako záložní řešení.
 */
/** Jak daleko od sebe se rozestoupí tahy, které jedou týmž korytem.
 *  Osm pixelů: čára je 1,75 px a čárkovaná, při menším rozestupu se dvě
 *  vedle sebe čtou jako jedna silnější. */
function velikostRozestupu(metruNaPixel: number) {
  return Math.max(10, metruNaPixel * 8);
}

type Vzorek = { bod: { x: number; y: number }; smer: { x: number; y: number } };

/**
 * Rovnoměrné navzorkování cesty po `krok` metrech i se směrem. Rozestup
 * se počítá po bodech, takže body musí být rozprostřené — napnutá cesta
 * má mezi rohy klidně kilometr.
 */
function navzorkuj(m: Mrizka, cesta: Poloha[], krok: number): Vzorek[] {
  const xy = cesta.map((p) => ({
    x: (p.delka - m.delkaOd) * m.mx,
    y: (p.sirka - m.sirkaOd) * m.my,
  }));
  const body: { x: number; y: number }[] = [xy[0]];
  let zbytek = 0;
  for (let i = 0; i + 1 < xy.length; i++) {
    const dx = xy[i + 1].x - xy[i].x;
    const dy = xy[i + 1].y - xy[i].y;
    const d = Math.hypot(dx, dy);
    if (d === 0) continue;
    let ujito = krok - zbytek;
    while (ujito <= d) {
      body.push({ x: xy[i].x + (dx * ujito) / d, y: xy[i].y + (dy * ujito) / d });
      ujito += krok;
    }
    zbytek = d - (ujito - krok);
  }
  const posledni = xy[xy.length - 1];
  if (Math.hypot(posledni.x - body[body.length - 1].x, posledni.y - body[body.length - 1].y) > 1) {
    body.push(posledni);
  } else {
    body[body.length - 1] = posledni;
  }

  return body.map((bod, i) => {
    const a = body[Math.max(0, i - 1)];
    const b = body[Math.min(body.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    return { bod, smer: { x: dx / d, y: dy / d } };
  });
}

/**
 * Rozestup soubežných tahů.
 *
 * <b>Zadání od Filipa (11. 10. 2026):</b> *„pokud dráha vede stejnou
 * cestou tam i zpět, hrozí překrývání a nepřehlednost… u maratonů se
 * jezdí kola, kde jedno je veliké a uvnitř je např. menší okruh"*.
 *
 * Nohy, které jedou týmž korytem, dostanou každá svůj <b>pruh</b> a
 * rozestoupí se kolmo na směr koryta. Pořadí pruhů je pořadí jetí, takže
 * dřívější kolo leží pořád na téže straně a dá se očima sledovat.
 *
 * <b>Proč ne prostě „každý doprava"</b>: to rozdělí cestu tam a zpět, ale
 * dvě kola stejným směrem — tedy přesně ten maraton — by zůstala přes
 * sebe. Pruh se proto bere ze seznamu noh v okolí, ne ze směru.
 *
 * <b>U konců se rozestup vytrácí</b>, aby se tahy u bóje sešly v ní a ne
 * vedle ní, a aby nerozhodily oblouček obeplutí, který se vkládá potom.
 * A každý posunutý bod se ověří: rozestup nikdy nevytlačí čáru na břeh.
 */
function rozestupNoh(m: Mrizka, nohy: (Poloha[] | null)[], rozestup: number): void {
  const krok = Math.max(8, rozestup);
  const dosah = rozestup * 3;
  const vzorky = nohy.map((n) => (n && n.length > 1 ? navzorkuj(m, n, krok) : null));

  // Prostorový rozškatulkování, ať se nehledá každý s každým.
  const prihradky = new Map<string, { noha: number; i: number }[]>();
  const klic = (x: number, y: number) => `${Math.floor(x / dosah)},${Math.floor(y / dosah)}`;
  vzorky.forEach((v, noha) => {
    v?.forEach((vz, i) => {
      const k = klic(vz.bod.x, vz.bod.y);
      const seznam = prihradky.get(k);
      if (seznam) seznam.push({ noha, i });
      else prihradky.set(k, [{ noha, i }]);
    });
  });

  for (let noha = 0; noha < vzorky.length; noha++) {
    const v = vzorky[noha];
    if (!v) continue;

    // Posun v metrech pro každý vzorek, zatím bez vyhlazení.
    const posuny = v.map((vz) => {
      const okoli: { noha: number; smer: { x: number; y: number } }[] = [];
      const cx = Math.floor(vz.bod.x / dosah);
      const cy = Math.floor(vz.bod.y / dosah);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const c of prihradky.get(`${cx + dx},${cy + dy}`) ?? []) {
            if (c.noha === noha) continue;
            const jiny = vzorky[c.noha]![c.i];
            if (Math.hypot(jiny.bod.x - vz.bod.x, jiny.bod.y - vz.bod.y) > dosah) continue;
            if (!okoli.some((o) => o.noha === c.noha)) okoli.push({ noha: c.noha, smer: jiny.smer });
          }
        }
      }
      if (okoli.length === 0) return { x: 0, y: 0 };

      const nohy = [...okoli.map((o) => o.noha), noha].sort((a, b) => a - b);
      const pruh = nohy.indexOf(noha);
      // Kolmice se bere od nejnižší nohy v hloučku, ať všichni měří od
      // téhož — jinak by si cesta tam a zpět spočítala stranu opačně a
      // skončily by na sobě.
      const vedouci = okoli.find((o) => o.noha === nohy[0])?.smer ?? vz.smer;
      const souhlas = vedouci.x * vz.smer.x + vedouci.y * vz.smer.y >= 0 ? 1 : -1;
      const kolmice = { x: vz.smer.y * souhlas, y: -vz.smer.x * souhlas };
      const o = (pruh - (nohy.length - 1) / 2) * rozestup;
      return { x: kolmice.x * o, y: kolmice.y * o };
    });

    // Vyhlazení: hloučky vznikají a končí skokem, bez tohohle by čára cukala.
    const okno = Math.max(1, Math.round(rozestup / krok) * 2 + 1);
    const hladke = posuny.map((_, i) => {
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (let k = i - okno; k <= i + okno; k++) {
        if (k < 0 || k >= posuny.length) continue;
        sx += posuny[k].x;
        sy += posuny[k].y;
        n++;
      }
      return { x: sx / n, y: sy / n };
    });

    const utlum = Math.max(4 * rozestup, 40);
    const hotovo: Poloha[] = v.map((vz, i) => {
      // Čím blíž ke konci nohy, tím menší posun — u bóje nulový.
      const odKraje = Math.min(i, v.length - 1 - i) * krok;
      const miraKraje = Math.min(1, odKraje / utlum);
      for (const podil of [1, 0.6, 0.3, 0]) {
        const f = miraKraje * podil;
        const p = {
          delka: m.delkaOd + (vz.bod.x + hladke[i].x * f) / m.mx,
          sirka: m.sirkaOd + (vz.bod.y + hladke[i].y * f) / m.my,
        };
        if (f === 0 || lezNaVode(m, p)) return p;
      }
      // Nedosažitelné: podíl 0 vrací bod bez posunu.
      return { delka: m.delkaOd + vz.bod.x / m.mx, sirka: m.sirkaOd + vz.bod.y / m.my };
    });

    // Konce zůstávají přesně na bóji, ať na ně navazuje oblouček.
    const puvodni = nohy[noha]!;
    hotovo[0] = puvodni[0];
    hotovo[hotovo.length - 1] = puvodni[puvodni.length - 1];
    nohy[noha] = hotovo;
  }
}

export function spojniceTrati(uzly: UzelTrati[], metruNaPixel: number): Poloha[][] {
  if (uzly.length < 2) return [];
  const m = mrizkaVody(uzly.map((u) => u.poloha));
  const r = velikostObloucku(metruNaPixel);

  const nohy = uzly
    .slice(0, -1)
    .map((u, i) => cestaPoVode(m, u.poloha, uzly[i + 1].poloha));

  // Nejdřív rozestup, teprve pak obloučky: oblouček se počítá ze směru,
  // kterým noha do uzlu přichází, a ten se rozestupem mění.
  rozestupNoh(m, nohy, velikostRozestupu(metruNaPixel));

  // Obloučky u vnitřních uzlů: na krajních je jen jeden směr, není co obeplout.
  for (let i = 1; i < uzly.length - 1; i++) {
    const bok = uzly[i].bok;
    const pred = nohy[i - 1];
    const po = nohy[i];
    if (!bok || !pred || !po || pred.length < 2 || po.length < 2) continue;
    const uzel = uzly[i].poloha;

    // <b>Oblouk smí jen po vodě, a tak se zmenšuje, dokud se nevejde.</b>
    // Bóje padesát metrů od břehu je běžná a zahodit u ní obeplutí celé
    // by znamenalo, že ten detail chybí zrovna tam, kde na něm záleží.
    // Když se nevejde ani ten nejmenší, uzel zůstane bodem: lež o
    // obeplutí je horší než chybějící detail.
    let hotovo: { a: number; b: number; o: ReturnType<typeof oblouček> } | null = null;
    for (const podil of [1, 0.6, 0.35]) {
      const polomer = r * podil;
      if (polomer < 15) break;
      // <b>Konec nohy se musí uříznout, a to pořádně daleko.</b> Oblouk
      // začíná na té straně značky, kterou se míjí — jenže cesta k uzlu
      // vede doprostřed, takže poslední kus původní čáry leží na opačné
      // straně a mezi ním a obloukem by čára přeskočila přes bóji.
      // Useknuté dál se místo skoku nakloní. Dokud byly nohy jen pár
      // bodů, bylo to schované; po navzorkování kvůli rozestupu ne.
      let a: number | null = null;
      let b: number | null = null;
      for (const nasobek of [3, 2, 1.2]) {
        a = posledniZa(m, pred, uzel, polomer * nasobek);
        b = prvniZa(m, po, uzel, polomer * nasobek);
        if (a !== null && b !== null) break;
      }
      if (a === null || b === null) continue;
      const prichod = smer(m, pred[a], uzel);
      const odchod = smer(m, uzel, po[b]);
      if (!prichod || !odchod) continue;
      const o = oblouček(m, uzel, prichod, odchod, bok, uzly[i].otaci ?? false, polomer);
      if (![o.vstup, ...o.body, o.vystup].every((p) => lezNaVode(m, p))) continue;
      hotovo = { a, b, o };
      break;
    }
    if (!hotovo) continue;
    nohy[i - 1] = [...pred.slice(0, hotovo.a + 1), hotovo.o.vstup, ...hotovo.o.body];
    nohy[i] = [hotovo.o.vystup, ...po.slice(hotovo.b)];
  }

  // Sousední povedené nohy se spojí do jednoho tahu, díra tah ukončí.
  const tahy: Poloha[][] = [];
  let tah: Poloha[] = [];
  for (const noha of nohy) {
    if (!noha) {
      if (tah.length > 1) tahy.push(tah);
      tah = [];
      continue;
    }
    tah = tah.length === 0 ? [...noha] : [...tah, ...noha.slice(1)];
  }
  if (tah.length > 1) tahy.push(tah);
  return tahy;
}

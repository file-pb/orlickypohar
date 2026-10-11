/**
 * Zkouška hledání cesty po vodě. <b>Spouští se ručně</b>, v CI ne —
 * minuty Actions jsou v tomhle repu nejbližší zeď:
 *
 *     node web/lib/voda.zkouska.ts
 *
 * Běží na čistém `node` bez balíčků (Node 24 si typy odstraní sám), a
 * proto si `voda.ts` tahá obrys relativně a s příponou. Jinak by sem
 * musel alias `@/`, který `node` neumí.
 *
 * <b>Co se hlídá:</b> že cesta leží na vodě, že není kratší než přímka, a
 * hlavně <b>na kterém boku zůstane značka</b> — tam se dá splést znaménko
 * tak, že obrázek vypadá hezky a říká opak.
 */
import { mrizkaVody, cestaPoVode, lezNaVode, spojniceTrati, type Poloha } from "./voda.ts";

const MY = 111_320;
const MX = MY * Math.cos((49.5 * Math.PI) / 180);
const vzdal = (a: Poloha, b: Poloha) =>
  Math.hypot((b.delka - a.delka) * MX, (b.sirka - a.sirka) * MY);
const delkaCesty = (c: Poloha[]) => c.slice(1).reduce((s, p, i) => s + vzdal(c[i], p), 0);

let chyb = 0;
function tvrd(co: string, podminka: boolean) {
  console.log(`${podminka ? "ok   " : "CHYBA"} ${co}`);
  if (!podminka) chyb++;
}

// Bóje z mocku (`tools/fake-api.py`), tedy skutečná místa na Orlíku.
const boje: Poloha[] = [
  { sirka: 49.5163, delka: 14.1651 }, // start levý
  { sirka: 49.5208, delka: 14.1711 }, // bóje 1
  { sirka: 49.4957254, delka: 14.1841419 }, // cíl
];

const m = mrizkaVody(boje);
let vodnich = 0;
for (let i = 0; i < m.voda.length; i++) vodnich += m.voda[i];
console.log(
  `mřížka ${m.sloupcu}×${m.radku} = ${m.voda.length} buněk po ${(m.krokDelky * m.mx).toFixed(0)} m, ` +
    `voda ${((100 * vodnich) / m.voda.length).toFixed(0)} %`,
);

tvrd("hráz Orlíku je voda", lezNaVode(m, { sirka: 49.518, delka: 14.168 }));
tvrd("vnitřek poloostrova není voda", !lezNaVode(m, { sirka: 49.512, delka: 14.176 }));
boje.forEach((b, i) => tvrd(`bóje ${i + 1} z mocku je na vodě`, lezNaVode(m, b)));

const naSucho = (a: Poloha, b: Poloha) => {
  const n = Math.ceil(vzdal(a, b) / 20);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const p = {
      sirka: a.sirka + (b.sirka - a.sirka) * t,
      delka: a.delka + (b.delka - a.delka) * t,
    };
    if (!lezNaVode(m, p)) return true;
  }
  return false;
};
tvrd("přímka z bóje 1 do cíle vede přes zem", naSucho(boje[1], boje[2]));

for (const [i, j] of [
  [0, 1],
  [1, 2],
] as const) {
  const t0 = performance.now();
  const c = cestaPoVode(m, boje[i], boje[j]);
  const dt = performance.now() - t0;
  tvrd(`noha ${i + 1}→${j + 1} má cestu`, c !== null);
  if (!c) continue;
  const prima = vzdal(boje[i], boje[j]);
  const po = delkaCesty(c);
  console.log(
    `      přímo ${prima.toFixed(0)} m, po vodě ${po.toFixed(0)} m ` +
      `(${(po / prima).toFixed(2)}×), ${c.length} bodů, ${dt.toFixed(0)} ms`,
  );
  tvrd(`noha ${i + 1}→${j + 1} leží celá na vodě`, c.every((p) => lezNaVode(m, p)));
  tvrd(`noha ${i + 1}→${j + 1} není kratší než přímka`, po >= prima - 1);
}

// Otevřená voda pro zkoušku obeplutí: bod, okolo kterého je do 250 m voda.
let stred: Poloha | null = null;
for (let x = 0; x < m.sloupcu && !stred; x += 2) {
  for (let y = 0; y < m.radku && !stred; y += 2) {
    const p = { delka: m.delkaOd + x * m.krokDelky, sirka: m.sirkaOd + y * m.krokSirky };
    let volno = true;
    for (let a = 0; a < 16 && volno; a++) {
      const u = (a / 16) * 2 * Math.PI;
      for (const r of [120, 250]) {
        const q = { delka: p.delka + (Math.cos(u) * r) / MX, sirka: p.sirka + (Math.sin(u) * r) / MY };
        if (!lezNaVode(m, q)) volno = false;
      }
    }
    if (volno) stred = p;
  }
}
tvrd("našla se otevřená voda pro zkoušku obeplutí", stred !== null);

if (stred) {
  const pos = (dx: number, dy: number): Poloha => ({
    delka: stred.delka + dx / MX,
    sirka: stred.sirka + dy / MY,
  });

  // Přijede ze severu, u značky se otočí a jede zpět na severovýchod.
  for (const bok of ["PoLeve", "PoPrave"] as const) {
    const znacka = pos(0, 0);
    const tahy = spojniceTrati(
      [
        { poloha: pos(0, 220), bok: null },
        { poloha: znacka, bok, otaci: true },
        { poloha: pos(60, 220), bok: null },
      ],
      2,
    );
    tvrd(`${bok}: jeden tah`, tahy.length === 1);
    if (tahy.length !== 1) continue;
    const t = tahy[0];

    let uZnacky = 0;
    let spatne = 0;
    for (let i = 0; i + 1 < t.length; i++) {
      if (vzdal(t[i], znacka) > 60) continue;
      uZnacky++;
      const dx = (t[i + 1].delka - t[i].delka) * MX;
      const dy = (t[i + 1].sirka - t[i].sirka) * MY;
      const kx = (znacka.delka - t[i].delka) * MX;
      const ky = (znacka.sirka - t[i].sirka) * MY;
      // Kladný křížový součin = značka po levoboku lodi.
      const kriz = dx * ky - dy * kx;
      if (bok === "PoLeve" ? kriz <= 0 : kriz >= 0) spatne++;
    }
    tvrd(`${bok}: oblouček má u značky body (${uZnacky})`, uZnacky >= 3);
    tvrd(`${bok}: značka zůstane na správném boku (výjimek ${spatne})`, spatne === 0);
    tvrd(`${bok}: stopa značku netrefí`, t.every((p) => vzdal(p, znacka) > 5));
  }

  // <b>Otočná, u které se směr skoro nemění.</b> Geometricky z toho vyjde
  // obkroužení o 353°, a přesně to se jednou nakreslilo. Má zbýt odsazení.
  const temerRovne = spojniceTrati(
    [
      { poloha: pos(0, -250), bok: null },
      { poloha: pos(0, 0), bok: "PoLeve", otaci: true },
      { poloha: pos(30, 250), bok: null },
    ],
    2,
  );
  tvrd("otočná s nepatrným ohybem: tah existuje", temerRovne.length === 1);
  if (temerRovne.length === 1) {
    const d = delkaCesty(temerRovne[0]);
    tvrd(`otočná s nepatrným ohybem: neudělá kolo (${d.toFixed(0)} m na 502 m)`, d < 580);
  }

  // Průjezd bez otočky: má zbýt odsazení na správnou stranu, ne kruh.
  const prujezd = spojniceTrati(
    [
      { poloha: pos(0, -250), bok: null },
      { poloha: pos(0, 0), bok: "PoPrave", otaci: false },
      { poloha: pos(0, 250), bok: null },
    ],
    2,
  );
  tvrd("průjezd: tah existuje", prujezd.length === 1);
  if (prujezd.length === 1) {
    const d = delkaCesty(prujezd[0]);
    tvrd(`průjezd: žádný kruh (${d.toFixed(0)} m na 500 m přímky)`, d < 560);
  }
}

// <b>Cesta tam i zpět týmž korytem.</b> Bez rozestupu se obě nohy kreslí
// přes sebe a trať s koly je nečitelná (Filip, 11. 10. 2026).
const rozpeti = (tah: Poloha[], od: Poloha, kam: Poloha) => {
  const stred = { sirka: (od.sirka + kam.sirka) / 2, delka: (od.delka + kam.delka) / 2 };
  const dx = (kam.delka - od.delka) * MX;
  const dy = (kam.sirka - od.sirka) * MY;
  const d = Math.hypot(dx, dy);
  const nx = -dy / d;
  const ny = dx / d;
  const stranou = tah
    .filter((p) => vzdal(p, stred) < 80)
    .map((p) => ((p.delka - stred.delka) * MX * nx + (p.sirka - stred.sirka) * MY * ny));
  return stranou.length < 2 ? 0 : Math.max(...stranou) - Math.min(...stranou);
};

for (const [kolik, nejmene] of [
  [2, 12],
  [3, 24],
] as const) {
  const uzly = [];
  for (let i = 0; i <= kolik; i++) uzly.push({ poloha: i % 2 ? boje[1] : boje[0], bok: null });
  const tahy = spojniceTrati(uzly, 2);
  tvrd(`${kolik} průjezdy týmž korytem: jeden tah`, tahy.length === 1);
  if (tahy.length !== 1) continue;
  const r = rozpeti(tahy[0], boje[0], boje[1]);
  tvrd(`${kolik} průjezdy: tahy se uprostřed rozestoupí (${r.toFixed(0)} m)`, r >= nejmene);
  tvrd(`${kolik} průjezdy: rozestup nevytlačil čáru na břeh`, tahy[0].every((p) => lezNaVode(m, p)));
  tvrd(`${kolik} průjezdy: u bójí se tahy sejdou`, vzdal(tahy[0][0], boje[0]) < 1);
}

// Jediný průjezd se nemá o co rozestupovat — čára vede přesně po cestě.
{
  const samotna = spojniceTrati([{ poloha: boje[0], bok: null }, { poloha: boje[1], bok: null }], 2);
  const r = rozpeti(samotna[0], boje[0], boje[1]);
  tvrd(`jediná noha: žádný rozestup (${r.toFixed(1)} m)`, r < 2);
}

// Bod 188 m od vody: mapa vody o něm nic neví, čára se nekreslí.
tvrd(
  "uzel mimo vodu nedostane čáru",
  spojniceTrati(
    [
      { poloha: boje[0], bok: null },
      { poloha: { sirka: 49.5086, delka: 14.1735 }, bok: null },
    ],
    2,
  ).length === 0,
);

console.log(chyb === 0 ? "\nvšechno prošlo" : `\n${chyb} CHYB`);
process.exit(chyb === 0 ? 0 : 1);

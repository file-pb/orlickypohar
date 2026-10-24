"use client";

/**
 * Náčrt živé mapy — klikatelná, s falešnou rozjížďkou.
 *
 * <b>K čemu to je</b> (PLAN.md, *Jak se trackování zobrazuje*): rozprava
 * 24. 10. 2026 rozhodla, jak se tracking ukazuje, ale několik těch
 * rozhodnutí se na papíře ověřit nedá — jak vypadá čtyřicet stop, které se
 * potkají u bóje, jestli je šedá tenká stopa ještě vidět, a jestli se
 * v pomyslném pořadí vede mění dost na to, aby to bavilo. Náčrt je levnější
 * odpověď než wireframe a pravdivější.
 *
 * <b>Co je tu doopravdy</b>: projekce z `lib/mapa.ts` a dlaždice přes
 * `/dlazdice`, tedy totéž, co kreslí mapku trati. <b>Co je nanečisto</b>:
 * data (`plavba.ts`), spojnice mezi značkami (přímá, ne po vodě) a pořadí
 * počítané v prohlížeči místo na serveru.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DLAZDICE, Z_NEJMENE, Z_NEJVIC, doPixelu } from "@/lib/mapa";
import { ZnakBoje } from "@/app/znak-boje";
import type { Poloha } from "@/lib/voda";
import type { Lod, Znacka } from "./plavba";

/** Jak staré smí být hlášení, než loď přestane být čerstvá. */
const STARNE_PO_S = 60;
/** A kdy propadne nakonec. */
const NEDOSTUPNA_PO_S = 300;
/**
 * Barva lodi. <b>Pevně podle pořadí v poli</b>, ne podle pozice v seznamu
 * — jinak by loď při každém prohození změnila barvu a oko by ji ztratilo.
 * Zlatý úhel rozhází odstíny tak, aby sousední lodě nebyly podobné.
 */
function barva(id: number) {
  return `hsl(${(id * 137.508) % 360} 72% 45%)`;
}

/**
 * Jak silně kreslit stopu lodi, o které byla řeč před `kolikDavno` focusy.
 * Nula je ta právě vybraná a kreslí se jinde, plně.
 */
const DOZNIVANI = [1, 0.45, 0.22];

/** Jak dlouho musí prohození vydržet, aby se uznalo. */
const PRAH_PROHOZENI_S = 60;
/**
 * A o kolik musí nový vedoucí vést, v pixelech postupu po trase.
 *
 * <b>Čas sám nestačí.</b> Dvě lodě, které jedou bok po boku, se v pořadí
 * přehazují o délku lodi a vydrží to klidně minutu — to není souboj, to je
 * šum. Odstup je proti tomu robustní: filtruje podle toho, jestli se
 * doopravdy něco stalo, ne jak dlouho se to nedělo.
 */
const ODSTUP_PROHOZENI_PX = 12;
/** Jak dlouho pak dráhy obou lodí hoří, než vyhasnou. */
const HORENI_S = 180;
/**
 * Do kolikáté pozice je prohození pro tabuli událost.
 *
 * <b>Změřeno na náčrtu:</b> bez tohohle filtru vyšlo za jednu rozjížďku
 * 33 prohození a tabule hořela 93 % času — tedy pořád, takže nic.
 * Filip to ostatně pojmenoval sám: *swapping for the **lead***. Souboj
 * o devatenácté místo není souboj o nic.
 */
const SOUBOJ_DO_POZICE = 6;
/** Jak dlouho drží focus dvojice, která se právě prohodila. */
const FOCUS_SOUBOJE_S = 90;
/**
 * A jak dlouho se prohození hraje v žebříčku.
 *
 * <b>Mnohem kratší než focus</b>: šipky a předjetí doprovázejí okamžik,
 * ne celý záběr. Po minutě a půl už jsou obě lodě v seznamu kdovíkde,
 * takže ustupující šipka ukazuje někam, kam se divák nedívá — a při
 * zkoušce na náčrtu nebyla vidět vůbec.
 */
const ANIMACE_PROHOZENI_S = 20;
/**
 * Jedno přehození v žebříčku má tři takty (Filip, 24. 10. 2026): *„to, co
 * jde dolů, má červenou šipku místo čísla, a to, co jde nahoru, zelenou
 * místo čísla; odjedou swap a zhasnou šipky a zobrazí čísla, a pak jede
 * další pár, pokud je potřeba."*
 *
 * <b>Další pár tedy čeká</b>, než ten předchozí dohraje celý. Dřív se
 * krok spouštěl po pevném intervalu bez ohledu na to, kde jsou animace
 * šipek, takže se takty překrývaly a v seznamu se to motalo.
 */
/** Jak dlouho se dvojice míjí. */
const VYMENA_MS = 1100;
/** Kdy je po zhasnutí šipek a návratu čísel hotovo a smí jet další pár. */
const TAKT_MS = 1900;
/** Jak dlouho u řádku svítí šipka, než zhasne a odhalí číslo. */
const SIPKA_MS = 2000;
/** Hláška o souboji svítí dlouho, když za ní nic nejede, a krátce, když ano. */
const HLASKA_DLOUHO_MS = 8000;
const HLASKA_KRATCE_MS = 2000;
/** Jak dlouho se na tabuli drží jedna loď, když se nic neděje. */
const KOLOTOC_S = 60;

type Stav = "cerstva" | "starnouci" | "nedostupna";

function stav(stariS: number | null): Stav {
  if (stariS === null || stariS > NEDOSTUPNA_PO_S) return "nedostupna";
  return stariS > STARNE_PO_S ? "starnouci" : "cerstva";
}

/**
 * Postup po trase: kolmý průmět na lomenou čáru značek, v metrech od
 * startu. <b>Monotónní</b> — bere se průmět nejblíž tomu předchozímu, aby
 * pořadí u bóje neskákalo mezi příchozí a odchozí nohou (PLAN.md, *Co je
 * post*).
 */
function postupPoTrase(
  uzly: { x: number; y: number }[],
  delkyNoh: number[],
  bod: { x: number; y: number },
  predchozi: number,
): number {
  let nej = predchozi;
  let nejVzdalenost = Infinity;
  let zaSebou = 0;

  for (let i = 0; i < uzly.length - 1; i++) {
    const a = uzly[i];
    const b = uzly[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const delka2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((bod.x - a.x) * dx + (bod.y - a.y) * dy) / delka2));
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const vzdalenost = Math.hypot(bod.x - px, bod.y - py);
    const postup = zaSebou + t * delkyNoh[i];

    // Trest za couvání: průmět dozadu musí být zřetelně bližší, aby vyhrál.
    const trest = postup < predchozi ? 60 : 0;
    if (vzdalenost + trest < nejVzdalenost) {
      nejVzdalenost = vzdalenost + trest;
      nej = postup;
    }
    zaSebou += delkyNoh[i];
  }
  return nej;
}

const SIRKA = 880;
const VYSKA = 560;

/** Přiblížení, při kterém se celá trať vejde do výřezu i s rezervou. */
function vychoziZ(znacky: Znacka[]) {
  const sirky = znacky.map((m) => m.sirka);
  const delky = znacky.map((m) => m.delka);
  const stredSirka = (Math.min(...sirky) + Math.max(...sirky)) / 2;
  const kosinus = Math.cos((stredSirka * Math.PI) / 180);
  const METRU_NA_STUPEN = 111_320;
  const rozpetiX = (Math.max(...delky) - Math.min(...delky)) * METRU_NA_STUPEN * kosinus;
  const rozpetiY = (Math.max(...sirky) - Math.min(...sirky)) * METRU_NA_STUPEN;
  const naPixelPriZ0 = 156_543.03 * kosinus;
  const podleX = Math.log2((naPixelPriZ0 * SIRKA) / (rozpetiX * 1.6));
  const podleY = Math.log2((naPixelPriZ0 * VYSKA) / (rozpetiY * 1.6));
  return Math.max(Z_NEJMENE, Math.min(Z_NEJVIC, Math.floor(Math.min(podleX, podleY))));
}

export function NacrtMapy({
  znacky,
  lode,
  trasa,
  spojnice,
}: {
  znacky: Znacka[];
  lode: Lod[];
  /**
   * Měřicí trasa po vodě, ze serveru. <b>Nikdy se nekreslí</b> (Filip,
   * 24. 10. 2026: *„měřicí trasu bych vůbec neumožnil zobrazit, ta je jen
   * pro výpočet"*) — ani v náčrtu, aby se na ni nedalo zvyknout. Slouží
   * jen k počítání postupu po trati.
   */
  trasa: Poloha[];
  /** Spojnice trati z návrháře, pro každé přiblížení. Tahle se ukazovat smí. */
  spojnice: Record<number, Poloha[][]>;
}) {
  const [z, setZ] = useState(() => vychoziZ(znacky));
  const [stred, setStred] = useState({
    sirka: znacky.reduce((s, m) => s + m.sirka, 0) / znacky.length,
    delka: znacky.reduce((s, m) => s + m.delka, 0) / znacky.length,
  });
  const [vybrana, setVybrana] = useState<number | null>(null);
  /**
   * Lodě, o kterých byla řeč, od nejnovější. <b>Stopa nemizí hned</b>
   * (Filip, 24. 10. 2026): když se focus přesune jinam, předchozí loď
   * ještě chvíli slábne, takže je vidět souboj, ne jen jeho vítěz.
   */
  const [historie, setHistorie] = useState<number[]>([]);
  /**
   * Co se kreslí, když si divák nic nezaškrtl. <b>Výchozí je „nic"</b>
   * (Filip, 24. 10. 2026: *„když nebudu mít nic zaškrtnuto, tak nezobrazuj
   * dráhy všech"*) — náčrt předtím ukázal, že čtyřicet drah je koberec, ať
   * se kreslí jakkoli průhledně. Mapa tedy začíná tečkami a dráhu dostane
   * až to, co si někdo vybral, nebo na co ukázala režie.
   */
  const [rezim, setRezim] = useState<"nic" | "posledni" | "tabule">("nic");
  /**
   * Lodě, které si divák zaškrtl v žebříčku (Filip, 24. 10. 2026: *„co to
   * udělat jako zaškrtávací body v ranku, tím si tam každý dá, co ho
   * zajímá"*). <b>Je to volba, ne automatika</b> — a jakmile je někdo
   * zaškrtnutý, přebíjí režim doznívání: ten je pro tabuli, kde zaškrtávat
   * nemá kdo.
   */
  const [zaskrtnute, setZaskrtnute] = useState<Set<number>>(new Set());
  const [cas, setCas] = useState(600);
  const [jenTuhle, setJenTuhle] = useState(false);

  function vyber(id: number | null) {
    setVybrana(id);
    if (id !== null) setHistorie((h) => [id, ...h.filter((x) => x !== id)].slice(0, 3));
  }
  const [tratVidet, setTratVidet] = useState(true);
  const tahne = useRef<{ x: number; y: number } | null>(null);

  const konec = useMemo(
    () => Math.max(...lode.map((l) => l.body.at(-1)?.cas ?? 0)),
    [lode],
  );

  const stredPx = doPixelu(stred.sirka, stred.delka, z);

  /**
   * Souřadnice se <b>zaokrouhlují na desetinu pixelu</b>, a ne kvůli
   * velikosti DOM: `doPixelu` počítá přes `Math.log` a `Math.atan`, a Node
   * se s prohlížečem rozchází v posledním bitu. React to hlásí jako
   * neshodu při hydrataci. Desetina pixelu je pod rozlišením obrazovky,
   * takže se tím nic neztratí.
   */
  const naPlatno = (sirka: number, delka: number) => {
    const p = doPixelu(sirka, delka, z);
    return {
      x: Math.round((p.x - stredPx.x + SIRKA / 2) * 10) / 10,
      y: Math.round((p.y - stredPx.y + VYSKA / 2) * 10) / 10,
    };
  };

  // <b>Postup se měří po trase, ne po přímkách mezi značkami.</b> Přímka
  // mezi bójemi vede v zatopeném údolí přes kopec a loď, která ho objíždí,
  // by měla v pořadí propadnout za někoho, kdo ji nepředjel.
  const uzly = trasa.map((p) => naPlatno(p.sirka, p.delka));
  const delkyNoh = uzly.slice(0, -1).map((a, i) => Math.hypot(uzly[i + 1].x - a.x, uzly[i + 1].y - a.y));

  /** Stav každé lodi k zvolenému času: poloha, stáří, postup, stopa. */
  /**
   * Postup každé lodi ke každému jejímu hlášení. <b>Jeden průchod stopou</b>
   * místo přepočtu při každém posunu času — a hlavně je z něj vidět, jak
   * se pořadí vyvíjelo, což potřebuje režie tabule.
   */
  const postupy = useMemo(() => {
    return lode.map((lod) => {
      let postup = 0;
      return lod.body.map((b) => {
        postup = postupPoTrase(uzly, delkyNoh, naPlatno(b.sirka, b.delka), postup);
        return postup;
      });
    });
  }, [lode, z, stred.sirka, stred.delka]);

  /**
   * Prohození dvojic v pomyslném pořadí, jak po sobě šla.
   *
   * <b>K čemu</b> (Filip, 24. 10. 2026): *„na tabuli, když bude swap lodí
   * v pořadí, tak se takhle zobrazí jejich dráhy a pomalu budou
   * vyhasínat."* Tabule se neovládá, takže si režii musí udělat sama —
   * a prohození je ta událost, kterou má ukázat.
   *
   * <b>Jen prohození, která vydrží</b>: při křižování se pořadí mění
   * každou chvíli a kdyby se zapalovalo každé zablikání, hořelo by pořád
   * všechno. Dvojice se proto musí držet v novém pořadí po celé okno,
   * než se prohození uzná (PLAN.md, *Pro režii potřebuje práh*).
   */
  const prohozeni = useMemo(() => {
    const kroky: number[] = [];
    for (let t = 0; t <= konec; t += 10) kroky.push(t);

    /** Postup lodi v čase t, nebo null, dokud nemá hlášení. */
    const postupV = (i: number, t: number) => {
      const lod = lode[i];
      let idx = -1;
      for (let j = 0; j < lod.body.length; j++) {
        if (lod.body[j].cas > t) break;
        idx = j;
      }
      const vid = Math.min(idx, lod.dosloDo - 1);
      return vid >= 0 ? postupy[i][vid] : null;
    };

    const vede = new Map<string, boolean>();
    const ven: { cas: number; nahoru: number; dolu: number; pozice: number }[] = [];
    const cekani = new Map<string, { od: number; stav: boolean }>();

    for (const t of kroky) {
      for (let i = 0; i < lode.length; i++) {
        for (let j = i + 1; j < lode.length; j++) {
          const pa = postupV(i, t);
          const pb = postupV(j, t);
          if (pa === null || pb === null) continue;
          const klic = `${i}-${j}`;
          const teď = pa > pb;
          const rozdil = Math.abs(pa - pb);
          const drive = vede.get(klic);
          if (drive === undefined) {
            vede.set(klic, teď);
            continue;
          }
          if (teď === drive) {
            cekani.delete(klic);
            continue;
          }
          // Pořadí se obrátilo — čeká se, jestli to vydrží a jestli se
          // lodě opravdu rozjedou, ne jen míjejí o délku trupu.
          const ceka = cekani.get(klic);
          if (!ceka || ceka.stav !== teď) {
            cekani.set(klic, { od: t, stav: teď });
          } else if (t - ceka.od >= PRAH_PROHOZENI_S && rozdil >= ODSTUP_PROHOZENI_PX) {
            // Na kolikáté pozici se to stalo — kolik lodí je před tou lepší
            // z dvojice. Podle toho se pozná souboj o čelo od šumu vzadu.
            const lepsi = Math.max(pa, pb);
            let pred = 0;
            for (let k = 0; k < lode.length; k++) {
              const pk = postupV(k, t);
              if (pk !== null && pk > lepsi) pred++;
            }
            // Kdo šel dopředu a kdo dozadu — hláška to má říct, ne nechat
            // diváka hádat z pořadí jmen.
            ven.push({ cas: t, nahoru: teď ? i : j, dolu: teď ? j : i, pozice: pred + 1 });
            vede.set(klic, teď);
            cekani.delete(klic);
          }
        }
      }
    }
    return ven;
  }, [lode, postupy, konec]);

  const vStavu = useMemo(() => {
    return lode.map((lod, i) => {
      const doIndexu = lod.body.findIndex((b) => b.cas > cas);
      const konecIndex = (doIndexu === -1 ? lod.body.length : doIndexu) - 1;
      // Server zná jen to, co došlo: min(čas, hranice doručení).
      const videnoDo = Math.min(konecIndex, lod.dosloDo - 1);
      const posledni = videnoDo >= 0 ? lod.body[videnoDo] : null;
      const stariS = posledni ? cas - posledni.cas : null;

      const stopa = videnoDo >= 0 ? lod.body.slice(0, videnoDo + 1) : [];
      const vPixelech = stopa.map((b) => naPlatno(b.sirka, b.delka));
      const postup = videnoDo >= 0 ? postupy[i][videnoDo] : 0;

      // Rychlost a kurz z posledních dvou hlášení. Z jednoho bodu se
      // spočítat nedají a vymýšlet se nebudou — karta pak řekne „neznámá".
      const predtim = videnoDo >= 1 ? lod.body[videnoDo - 1] : null;
      let rychlostUzlu: number | null = null;
      let kurz: number | null = null;
      if (posledni && predtim) {
        const kosinus = Math.cos((posledni.sirka * Math.PI) / 180);
        const dx = (posledni.delka - predtim.delka) * 111_320 * kosinus;
        const dy = (posledni.sirka - predtim.sirka) * 111_320;
        const dt = posledni.cas - predtim.cas || 1;
        rychlostUzlu = Math.hypot(dx, dy) / dt / 0.5144;
        kurz = (Math.round((Math.atan2(dx, dy) * 180) / Math.PI) + 360) % 360;
      }

      return {
        lod,
        poloha: posledni ? naPlatno(posledni.sirka, posledni.delka) : null,
        stariS,
        stav: stav(stariS),
        postup,
        stopa: vPixelech,
        rychlostUzlu,
        kurz,
      };
    });
  }, [lode, cas, z, stred.sirka, stred.delka, postupy]);

  /**
   * Pomyslné pořadí. <b>Nedostupné propadnou nakonec</b>, stárnoucí si
   * pozici drží (PLAN.md, *Loď, která nehlásí*).
   */
  const poradi = [...vStavu].sort((a, b) => {
    const dolu = (x: typeof a) => (x.stav === "nedostupna" ? 1 : 0);
    if (dolu(a) !== dolu(b)) return dolu(a) - dolu(b);
    return b.postup - a.postup;
  });

  // Dlaždice překrývající výřez.
  const levo = stredPx.x - SIRKA / 2;
  const nahore = stredPx.y - VYSKA / 2;
  const naSvete = 2 ** z;
  const dlazdice = [];
  for (let tx = Math.floor(levo / DLAZDICE); tx <= Math.floor((levo + SIRKA) / DLAZDICE); tx++) {
    for (let ty = Math.floor(nahore / DLAZDICE); ty <= Math.floor((nahore + VYSKA) / DLAZDICE); ty++) {
      if (tx < 0 || ty < 0 || tx >= naSvete || ty >= naSvete) continue;
      dlazdice.push({
        klic: `${z}-${tx}-${ty}`,
        cesta: `/dlazdice/${z}/${tx}/${ty}`,
        x: tx * DLAZDICE - levo,
        y: ty * DLAZDICE - nahore,
      });
    }
  }

  function posunMapu(dx: number, dy: number) {
    const n = DLAZDICE * 2 ** z;
    setStred((s) => {
      const p = doPixelu(s.sirka, s.delka, z);
      const x = p.x - dx;
      const y = p.y - dy;
      const delka = (x / n) * 360 - 180;
      const radiany = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
      return { sirka: (radiany * 180) / Math.PI, delka };
    });
  }

  /**
   * Režie tabule (Filip, 24. 10. 2026): *„pokud se nic nebude dít na
   * tabuli, tak budeme postupně přepínat focus pořadím, aby byly vidět
   * dráhy a nebyl to guláš. Jakmile se někde změní pořadí, tak dostanou
   * chvilku focus ty dvě lodě a pak to zase naváže na ten kolotoč."*
   *
   * <b>Počítá se dopředu pro celou rozjížďku</b>, ne krok po kroku —
   * jednak je to deterministické (týž čas dá týž záběr), jednak kolotoč
   * musí umět navázat tam, kde ho souboj přerušil. K tomu se počítá čas
   * strávený mimo souboje, ne čas od startu.
   */
  const rezie = useMemo(() => {
    const plan = new Map<number, { lode: number[]; duvod: "souboj" | "kolotoc" }>();
    let mimoSouboje = 0;

    const postupV = (i: number, t: number) => {
      const lod = lode[i];
      let idx = -1;
      for (let j = 0; j < lod.body.length; j++) {
        if (lod.body[j].cas > t) break;
        idx = j;
      }
      const vid = Math.min(idx, lod.dosloDo - 1);
      return vid >= 0 ? postupy[i][vid] : null;
    };

    for (let t = 0; t <= konec; t += 10) {
      const souboj = [...prohozeni]
        .reverse()
        .find(
          (p) => p.pozice <= SOUBOJ_DO_POZICE && t - p.cas >= 0 && t - p.cas < FOCUS_SOUBOJE_S,
        );
      if (souboj) {
        plan.set(t, {
          lode: [lode[souboj.nahoru].id, lode[souboj.dolu].id],
          duvod: "souboj",
        });
        continue;
      }

      // Kolotoč: po pořadí shora, každá loď chvíli.
      const vPoradi = lode
        .map((l, i) => ({ id: l.id, postup: postupV(i, t) }))
        .filter((x) => x.postup !== null)
        .sort((a, b) => (b.postup as number) - (a.postup as number));
      if (vPoradi.length === 0) continue;
      const kolikata = Math.floor(mimoSouboje / KOLOTOC_S) % vPoradi.length;
      plan.set(t, { lode: [vPoradi[kolikata].id], duvod: "kolotoc" });
      mimoSouboje += 10;
    }
    return plan;
  }, [lode, postupy, prohozeni, konec]);

  /** Co tabule ukazuje v zvoleném čase. */
  const zabery = rezie.get(Math.floor(cas / 10) * 10) ?? null;

  /**
   * Jak silně svítí dráha toho, na co režie právě ukazuje.
   *
   * <b>Dohasíná v rámci záběru, ne napříč závodem.</b> První pokus nechával
   * hořet každé prohození po dobu `HORENI_S`, jenže těch je za pár minut
   * tolik, že v režimu tabule svítilo 23 drah z 24 — přesně ten koberec,
   * kterému se vyhýbáme. Hoří proto jen to, co je zrovna na obrazovce, a ke
   * konci záběru slábne, aby přechod na další nebyl střih přes černou.
   */
  const silaZaberu = useMemo(() => {
    if (!zabery) return 0;
    const delka = zabery.duvod === "souboj" ? FOCUS_SOUBOJE_S : KOLOTOC_S;
    const doKonce = delka - ((cas % delka) || 0);
    return doKonce < 20 ? 0.3 + (0.65 * doKonce) / 20 : 0.95;
  }, [zabery, cas]);

  /** Poslední prohození, které ještě hoří — tabule o něm řekne slovy. */
  const posledniSwap = [...prohozeni]
    .reverse()
    .find(
      (p) => p.pozice <= SOUBOJ_DO_POZICE && cas - p.cas >= 0 && cas - p.cas <= HORENI_S,
    );

  /**
   * Při prohození odroluje seznam na tu dvojici. Bez toho se předjetí
   * odehraje mimo výřez — žebříček má čtyřiadvacet řádků a vidět je jich
   * tak devět.
   */
  const seznam = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!posledniSwap || cas - posledniSwap.cas > ANIMACE_PROHOZENI_S) return;
    const ol = seznam.current;
    const a = ol?.querySelector(".nacrt-radek-nahoru");
    const b = ol?.querySelector(".nacrt-radek-dolu");
    if (!ol || !a || !b) return;
    // Doprostřed mezi oba, ne na vítěze — ten, kdo o místo přišel, je ta
    // půlka zprávy, kterou by jinak nikdo neviděl.
    const r = ol.getBoundingClientRect();
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const stred = (ra.top + rb.bottom) / 2 - r.top + ol.scrollTop;
    ol.scrollTo({ top: stred - r.height / 2, behavior: "smooth" });
  }, [posledniSwap, cas]);

  /**
   * Pořadí, jak se zrovna ukazuje. <b>Není to rovnou to spočítané</b>
   * (Filip, 24. 10. 2026: *„pokud padá o více lodí, tak to jeď dál, zase
   * dvě vedle sebe, dokud není pořadí správné"*) — loď, která klesá
   * o několik míst, to odehraje jako řadu výměn se sousedem, aby šlo
   * očima sledovat, co se stalo. Skokové přeskládání by vypadalo jako
   * porucha.
   */
  const cilove = poradi.map((v) => v.lod.id);
  const [zobrazene, setZobrazene] = useState<number[]>(cilove);
  const [prehazuje, setPrehazuje] = useState<{ nahoru: number; dolu: number } | null>(null);
  /**
   * Kolikátá výměna to je. <b>Nese ho `key` šipky</b>, takže se zhasínací
   * animace spustí znovu u každého kroku kaskády — bez toho šipka u lodi,
   * která stoupá přes pět míst, zhasla po dvou vteřinách a zbytek cesty
   * urazila potmě.
   */
  const [krok, setKrok] = useState(0);

  useEffect(() => {
    // Nová loď v poli nebo první vykreslení: srovnat bez animace.
    if (zobrazene.length !== cilove.length || cilove.some((id) => !zobrazene.includes(id))) {
      setZobrazene(cilove);
      setPrehazuje(null);
      return;
    }
    const kam = new Map(cilove.map((id, i) => [id, i]));
    const i = zobrazene.findIndex((id, j) => j + 1 < zobrazene.length && kam.get(id)! > kam.get(zobrazene[j + 1])!);
    if (i === -1) {
      if (prehazuje) setPrehazuje(null);
      return;
    }
    // Dokud běží takt předchozí dvojice, další nezačíná.
    if (prehazuje) return;

    // Ten, co stoupá, je ten pod ním; ten, co klesá, je ten nad ním.
    setPrehazuje({ nahoru: zobrazene[i + 1], dolu: zobrazene[i] });
    setZobrazene((p) => {
      const dal = [...p];
      [dal[i], dal[i + 1]] = [dal[i + 1], dal[i]];
      return dal;
    });
    setKrok((k) => k + 1);
  }, [cilove.join(","), zobrazene.join(","), prehazuje]);

  /**
   * Konec taktu má <b>vlastní efekt</b>. Když stál v tom hořejším, jeho
   * cleanup ho zrušil hned při dalším průchodu (a ten přišel okamžitě,
   * protože se změnilo `zobrazene`) — takže se `prehazuje` nikdy
   * nevynulovalo a kaskáda se zastavila po první výměně.
   */
  useEffect(() => {
    if (!prehazuje) return;
    const casovac = setTimeout(() => setPrehazuje(null), TAKT_MS);
    return () => clearTimeout(casovac);
  }, [prehazuje]);

  /**
   * Výměna míst, ne poskočení (Filip, 24. 10. 2026: *„nedá se to animovat
   * tak, že to bude vypadat, jakoby se ty dva řádky vždy pozičně
   * vyměnily?"*).
   *
   * <b>Technika je FLIP:</b> před překreslením se zapamatují polohy
   * řádků, po něm se spočítá rozdíl, řádek se transformem vrátí na staré
   * místo a odtud se nechá dojet na nové. Rozdíl proti předchozí podobě je
   * podstatný — CSS animace hrála dekoraci *po* skoku, takže řádek
   * poskočil a teprve pak se zavlnil. Takhle se dvojice míjí.
   *
   * Ustupující se při tom odkloní stranou a ztlumí, takže je vidět, kdo
   * komu uhýbá.
   */
  const pozice = useRef(new Map<number, number>());
  useLayoutEffect(() => {
    const ol = seznam.current;
    if (!ol) return;
    const nove = new Map<number, number>();
    ol.querySelectorAll<HTMLLIElement>("li[data-lod]").forEach((li) => {
      const id = Number(li.dataset.lod);
      const top = li.offsetTop;
      nove.set(id, top);
      const stare = pozice.current.get(id);
      if (stare === undefined || stare === top) return;
      const delta = stare - top;
      const klesa = delta < 0;
      li.animate(
        klesa
          ? [
              { transform: `translateY(${delta}px)`, opacity: 1 },
              { transform: `translate(14px, ${delta / 2}px)`, opacity: 0.5, offset: 0.5 },
              { transform: "none", opacity: 1 },
            ]
          : [{ transform: `translateY(${delta}px)` }, { transform: "none" }],
        { duration: VYMENA_MS, easing: "cubic-bezier(.4, 0, .2, 1)" },
      );
    });
    pozice.current = nove;

    // Šipka a číslo si mají předat buňku znovu při každém kroku kaskády.
    // Restart bez remountu: vypnout animaci, vynutit přepočet, zapnout.
    for (const sel of [".nacrt-radek-nahoru", ".nacrt-radek-dolu"]) {
      ol.querySelectorAll<HTMLElement>(`${sel} .nacrt-sipka-radku, ${sel} .nacrt-cislo-pod`)
        .forEach((el) => {
          el.style.animation = "none";
          void el.offsetWidth;
          el.style.animation = "";
        });
    }
  }, [zobrazene.join(","), krok]);

  const poradiKZobrazeni = zobrazene
    .map((id) => poradi.find((v) => v.lod.id === id))
    .filter((v): v is (typeof poradi)[number] => Boolean(v));

  /**
   * Jak dlouho svítí hláška o souboji (Filip, 24. 10. 2026): *„ponechej to
   * zobrazené 2 sekundy, pokud za tím jede další swap, jinak to nechej
   * svítit třeba 8 sekund."* Když se souboje řetězí, nemá cenu držet
   * starý — a když je klid, ať si ho divák stihne přečíst.
   */
  const [hlaskaVidet, setHlaskaVidet] = useState(false);
  useEffect(() => {
    if (!posledniSwap) {
      setHlaskaVidet(false);
      return;
    }
    const jedeDalsi = prohozeni.some(
      (p) =>
        p.pozice <= SOUBOJ_DO_POZICE &&
        p.cas > posledniSwap.cas &&
        p.cas - posledniSwap.cas <= FOCUS_SOUBOJE_S,
    );
    setHlaskaVidet(true);
    const casovac = setTimeout(
      () => setHlaskaVidet(false),
      jedeDalsi ? HLASKA_KRATCE_MS : HLASKA_DLOUHO_MS,
    );
    return () => clearTimeout(casovac);
  }, [posledniSwap?.cas, prohozeni]);

  const vybranaLod = vStavu.find((v) => v.lod.id === vybrana) ?? null;

  return (
    <div className="nacrt">
      <div className="nacrt-mapa">
        <div className="nacrt-platno-obal">
        <svg
          viewBox={`0 0 ${SIRKA} ${VYSKA}`}
          className="nacrt-platno"
          onPointerDown={(e) => {
            tahne.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!tahne.current) return;
            const merítko = SIRKA / e.currentTarget.getBoundingClientRect().width;
            posunMapu(
              (e.clientX - tahne.current.x) * merítko,
              (e.clientY - tahne.current.y) * merítko,
            );
            tahne.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={() => (tahne.current = null)}
          onPointerLeave={() => (tahne.current = null)}
        >
          {dlazdice.map((d) => (
            <image key={d.klic} href={d.cesta} x={d.x} y={d.y} width={DLAZDICE} height={DLAZDICE} />
          ))}

          {/*
            Spojnice trati z návrháře — <b>vyladěná a ukazovat se smí</b>:
            vede po vodě, naznačuje obeplutí značky a říká, kudy se jede.
            Je to něco jiného než měřicí trasa pod ní.
          */}
          {tratVidet &&
            (spojnice[z] ?? []).map((tah, i) => (
              <polyline
                key={i}
                points={tah
                  .map((p) => {
                    const q = naPlatno(p.sirka, p.delka);
                    return `${q.x},${q.y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#fff"
                strokeWidth={2.5}
                strokeDasharray="9 7"
                strokeLinecap="round"
                opacity={0.9}
                style={{ filter: "drop-shadow(0 0 2px rgb(0 0 0 / 55%))" }}
              />
            ))}


          {/* Ostatní lodě: celá dráha, barevně a hodně průhledně. */}
          {vStavu
            .filter((v) => v.lod.id !== vybrana && !(jenTuhle && vybrana !== null))
            .map((v) => {
              if (!v.poloha) return null;
              const davno = historie.indexOf(v.lod.id);
              // Zaškrtnuté lodě vyhrávají nad vším ostatním: když si divák
              // vybral, koho sleduje, nemá mu to nic přebíjet.
              const silaStopy = zaskrtnute.size
                ? zaskrtnute.has(v.lod.id)
                  ? 0.9
                  : 0
                : rezim === "tabule"
                  ? zabery?.lode.includes(v.lod.id)
                    ? silaZaberu
                    : 0
                  : rezim === "posledni" && davno > 0
                    ? DOZNIVANI[davno]
                    : 0;
              return (
                <g
                  key={v.lod.id}
                  onClick={() => vyber(v.lod.id)}
                  style={{ cursor: "pointer" }}
                >
                  {v.stopa.length > 1 && silaStopy > 0 && (
                    <polyline
                      points={v.stopa.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={barva(v.lod.id)}
                      strokeWidth={silaStopy > 0.5 ? 3 : 2}
                      opacity={silaStopy}
                      strokeLinejoin="round"
                    />
                  )}
                  <circle
                    cx={v.poloha.x}
                    cy={v.poloha.y}
                    r={zaskrtnute.has(v.lod.id) ? 6.5 : 5}
                    fill={barva(v.lod.id)}
                    stroke="#fff"
                    strokeWidth={1.5}
                    opacity={
                      v.stav === "nedostupna"
                        ? 0.45
                        : silaStopy === 0
                          ? 0.6
                          : 1
                    }
                  />
                </g>
              );
            })}

          {vybranaLod?.poloha && (
            <g>
              <polyline
                points={vybranaLod.stopa.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={barva(vybranaLod.lod.id)}
                strokeWidth={3.5}
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 3px rgb(255 255 255 / 85%))" }}
              />
              <circle
                cx={vybranaLod.poloha.x}
                cy={vybranaLod.poloha.y}
                r={8}
                fill={barva(vybranaLod.lod.id)}
                stroke="#fff"
                strokeWidth={2.5}
              />
            </g>
          )}

          {/*
            Značky až navrch, ať je přes ně nic nekreslí — a <b>tak, jak je
            kreslí návrhář</b> (Filip, 24. 10. 2026: *„i prvky z návrháře"*),
            tedy znakem bóje s barvou a tvarem, ne kolečkem. Startovní a
            cílová čára se kreslí jako čára mezi svými konci.
          */}
          {tratVidet &&
            znacky.map((m) => {
              const konce = m.konce.map((k) => ({ ...k, ...naPlatno(k.sirka, k.delka) }));
              const uzel = naPlatno(m.sirka, m.delka);
              return (
                <g key={m.poradi}>
                  {konce.length === 2 && (
                    <line
                      x1={konce[0].x}
                      y1={konce[0].y}
                      x2={konce[1].x}
                      y2={konce[1].y}
                      stroke="#fff"
                      strokeWidth={2}
                      opacity={0.85}
                    />
                  )}
                  {konce.map((k, i) => (
                    <ZnakBoje
                      key={i}
                      x={k.x}
                      y={k.y}
                      r={7}
                      barva={k.barva}
                      tvar={k.tvar}
                      znaceni={k.znaceni}
                    />
                  ))}
                  <text x={uzel.x + 12} y={uzel.y + 4} className="nacrt-znacka">
                    {m.poradi}. {m.nazev}
                  </text>
                </g>
              );
            })}
        </svg>

          <div className="nacrt-zoom">
            <button
              type="button"
              onClick={() => setZ((v) => Math.min(Z_NEJVIC, v + 1))}
              disabled={z >= Z_NEJVIC}
              aria-label="přiblížit"
              title="přiblížit"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZ((v) => Math.max(Z_NEJMENE, v - 1))}
              disabled={z <= Z_NEJMENE}
              aria-label="oddálit"
              title="oddálit"
            >
              −
            </button>
          </div>

        {rezim === "tabule" && zabery && (zabery.duvod !== "souboj" || hlaskaVidet) && (
          <div className="nacrt-swap">
            {zabery.duvod === "souboj" && posledniSwap && hlaskaVidet ? (
              <div className="nacrt-souboj" key={posledniSwap.cas}>
                <div className="nacrt-souboj-pozice">{posledniSwap.pozice}. pozice</div>
                <div className="nacrt-souboj-lod nacrt-nahoru">
                  <span aria-hidden>▲</span>
                  <strong>{lode[posledniSwap.nahoru].nazev}</strong>
                </div>
                <div className="nacrt-souboj-lod nacrt-dolu">
                  <span aria-hidden>▼</span>
                  <strong>{lode[posledniSwap.dolu].nazev}</strong>
                </div>
              </div>
            ) : (
              <>
                {"na vodě: "}
                {zabery.lode.map((id) => (
                  <strong key={id} style={{ color: barva(id) }}>
                    {lode.find((l) => l.id === id)?.nazev}
                  </strong>
                ))}
              </>
            )}
          </div>
        )}

        {vybranaLod && (
          <div className="nacrt-karta">
            <div className="nacrt-karta-hlava">
              <strong>{vybranaLod.lod.nazev}</strong>
              <span className="nacrt-kategorie">{vybranaLod.lod.kategorie}</span>
              <button type="button" onClick={() => setVybrana(null)} aria-label="zavřít">
                ×
              </button>
            </div>
            <dl>
              <div>
                <dt>poloha</dt>
                <dd className={`nacrt-${vybranaLod.stav}`}>
                  {vybranaLod.stariS === null
                    ? "nehlásí se"
                    : vybranaLod.stariS < 60
                      ? `před ${vybranaLod.stariS} s`
                      : `před ${Math.round(vybranaLod.stariS / 60)} min`}
                </dd>
              </div>
              <div>
                <dt>rychlost</dt>
                <dd>
                  {vybranaLod.rychlostUzlu === null
                    ? "neznámá"
                    : `${vybranaLod.rychlostUzlu.toFixed(1)} kt`}
                </dd>
              </div>
              <div>
                <dt>kurz</dt>
                <dd>{vybranaLod.kurz === null ? "neznámý" : `${vybranaLod.kurz}°`}</dd>
              </div>
            </dl>
          </div>
        )}
        </div>

        <div className="nacrt-ovladani">
          <label>
            čas {Math.floor(cas / 60)}:{String(cas % 60).padStart(2, "0")}
            <input
              type="range"
              min={0}
              max={konec}
              step={10}
              value={cas}
              onChange={(e) => setCas(Number(e.target.value))}
            />
          </label>
          <label>
            stopy
            <select value={rezim} onChange={(e) => setRezim(e.target.value as typeof rezim)}>
              <option value="nic">jen zaškrtnuté</option>
              <option value="posledni">poslední tři focusy</option>
              <option value="tabule">tabule: kolotoč a souboje</option>
            </select>
          </label>
          <label className="nacrt-prepinac">
            <input
              type="checkbox"
              checked={tratVidet}
              onChange={(e) => setTratVidet(e.target.checked)}
            />
            trať z návrháře
          </label>
          {vybrana !== null && (
            <label className="nacrt-prepinac">
              <input
                type="checkbox"
                checked={jenTuhle}
                onChange={(e) => setJenTuhle(e.target.checked)}
              />
              jen tuhle stopu
            </label>
          )}
        </div>
      </div>

      <aside className="nacrt-poradi">
        <h2>Pomyslné pořadí</h2>
        <p className="nacrt-vysvetlivka">
          Pořadí mezi loděmi, které hlásí polohu — ne pořadí závodu. O výsledku
          rozhoduje cíl.
        </p>
        {zaskrtnute.size > 0 && (
          <button
            type="button"
            className="nacrt-zrusit"
            onClick={() => setZaskrtnute(new Set())}
          >
            zrušit výběr ({zaskrtnute.size})
          </button>
        )}
        <ol ref={seznam}>
          {poradiKZobrazeni.map((v, i) => {
            // Animuje se vždycky jen dvojice, která se právě vyměňuje —
            // ne celý souboj po dobu focusu (Filip, 24. 10. 2026).
            const jdeNahoru = prehazuje?.nahoru === v.lod.id;
            const jdeDolu = prehazuje?.dolu === v.lod.id;
            const vSouboji = jdeNahoru || jdeDolu;
            return (
            <li
              key={v.lod.id}
              data-lod={v.lod.id}
              className={
                jdeNahoru ? "nacrt-radek-nahoru" : jdeDolu ? "nacrt-radek-dolu" : undefined
              }
            >
              <input
                type="checkbox"
                aria-label={`sledovat ${v.lod.nazev}`}
                checked={zaskrtnute.has(v.lod.id)}
                style={{ accentColor: barva(v.lod.id) }}
                onChange={(e) =>
                  setZaskrtnute((p) => {
                    const dal = new Set(p);
                    if (e.target.checked) dal.add(v.lod.id);
                    else dal.delete(v.lod.id);
                    return dal;
                  })
                }
              />
              <button
                type="button"
                className={v.lod.id === vybrana ? "vybrana" : undefined}
                onClick={() => vyber(v.lod.id)}
              >
                <span className="nacrt-cislo">
                  {/*
                    Šipka svítí pár vteřin a zhasne, číslo se pod ní
                    rozsvítí (Filip, 24. 10. 2026). Oba leží ve stejné
                    buňce mřížky, takže se nic neposouvá.

                    <b>Oba prvky tu jsou vždycky</b> a mění se jim jen
                    třída. Restart animace přes `key` se neosvědčil: React
                    staré spany nechával v DOM, takže se v jedné buňce
                    sešly tři šipky z předchozích kroků a pod nimi číslo.
                    Animace se proto restartuje ručně, v `useLayoutEffect`
                    u přehození.
                  */}
                  <span
                    className={`nacrt-sipka-radku ${
                      vSouboji ? (jdeNahoru ? "nacrt-nahoru" : "nacrt-dolu") : "nacrt-bez-sipky"
                    }`}
                  >
                    {jdeNahoru ? "▲" : jdeDolu ? "▼" : ""}
                  </span>
                  <span className={vSouboji ? "nacrt-cislo-pod" : undefined}>
                    {v.stav === "nedostupna" ? "—" : i + 1}
                  </span>
                </span>
                <span className="nacrt-nazev">{v.lod.nazev}</span>
                <span className="nacrt-kategorie">{v.lod.kategorie}</span>
                <span className={`nacrt-stav nacrt-${v.stav}`}>
                  {v.stariS === null
                    ? "nehlásí se"
                    : v.stav === "cerstva"
                      ? `před ${v.stariS} s`
                      : `před ${Math.round(v.stariS / 60)} min`}
                </span>
              </button>
            </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}

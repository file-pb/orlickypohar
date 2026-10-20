/**
 * Simulovaná plavba.
 *
 * Proč to v pilotu je: na skutečnou trasu se čeká do května, ale odladit se
 * musí zápis, přehled, ostříhání a export už teď. Simulace krmí **týž**
 * zápis jako GPS, takže se zkouší skutečná cesta dat, ne její napodobenina.
 *
 * Co simulace prokázat **nemůže**: záznam běžící po zabití procesu
 * a spotřebu baterky při zamčeném telefonu. Běží v kontextu obrazovky,
 * takže se zabitím appky skončí; prokáže jen to, že **zapsaná část
 * přežila**. Zbytek přejímací podmínky č. 2 umí jedině úloha na pozadí
 * v APK na skutečném telefonu.
 *
 * Každý bod ze simulace je v databázi označený jako podvržený a celý
 * záznam má `zdroj = 'simulace'` — nemá jak se vydávat za skutečnou trasu.
 */
import { zapisBody, type NovyBod } from './zaznam';

/** Trať z ukázkových dat: start, bóje 1, cíl. Trojúhelník na Orlíku. */
const TRAT = [
  { sirka: 49.5163, delka: 14.1651 },
  { sirka: 49.5201, delka: 14.1702 },
  { sirka: 49.4957254, delka: 14.1841419 },
] as const;

/** Plachetnice na přehradě: dvě až tři desetiny uzlu sem tam, ne auto. */
const RYCHLOST_MS = 2.5;

export type Nastaveni = {
  /** Jak často se zapisuje bod — stejně jako úloha na pozadí. */
  krokMs: number;
  /**
   * Kolikrát rychleji než ve skutečnosti. 1 je reálný čas, 240 udělá
   * z dvacetičtyřhodinovky šest minut — tím se dá změřit, co s databází
   * a přehledem dělá dlouhý záznam.
   */
  zhusteni: number;
};

export const VYCHOZI: Nastaveni = { krokMs: 5000, zhusteni: 60 };

type Beh = { stop: () => void };

/**
 * Spustí simulaci nad existujícím záznamem. Vrací funkci, kterou se zastaví.
 */
export function spustSimulaci(zaznamId: string, n: Nastaveni = VYCHOZI): Beh {
  let ujeto = 0;
  let casGps = Date.now();
  const delkaTrati = obvodTrati();

  const timer = setInterval(() => {
    // Zrychlený běh neposílá body častěji, posílá je víc za jedno tiknutí:
    // dvacet čtyři hodin v reálném tempu by se neodladilo nikdy.
    const davka: NovyBod[] = [];
    for (let i = 0; i < Math.max(1, n.zhusteni); i += 1) {
      ujeto = (ujeto + (RYCHLOST_MS * n.krokMs) / 1000) % delkaTrati;
      casGps += n.krokMs;
      const p = polohaNaTrati(ujeto);
      davka.push({
        ...p,
        // Pár metrů šumu: bez něj by trasa byla hladká čára a nepoznalo by
        // se, že přehled počítá i s nejistotou polohy.
        sirka: p.sirka + (Math.random() - 0.5) * 0.00004,
        delka: p.delka + (Math.random() - 0.5) * 0.00006,
        presnost: 4 + Math.random() * 6,
        rychlost: RYCHLOST_MS + (Math.random() - 0.5),
        casGps,
        podvrzeny: true,
      });
    }
    zapisBody(zaznamId, davka);
  }, n.krokMs);

  return { stop: () => clearInterval(timer) };
}

const R = 6371000;

function metry(a: { sirka: number; delka: number }, b: { sirka: number; delka: number }) {
  const f1 = (a.sirka * Math.PI) / 180;
  const f2 = (b.sirka * Math.PI) / 180;
  const df = f2 - f1;
  const dl = ((b.delka - a.delka) * Math.PI) / 180;
  const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function obvodTrati() {
  let m = 0;
  for (let i = 0; i < TRAT.length; i += 1) m += metry(TRAT[i], TRAT[(i + 1) % TRAT.length]);
  return m;
}

/** Lineární interpolace po okruhu — na deseti kilometrech je rovina dost. */
function polohaNaTrati(ujeto: number): { sirka: number; delka: number } {
  let zbyva = ujeto;
  for (let i = 0; i < TRAT.length; i += 1) {
    const a = TRAT[i];
    const b = TRAT[(i + 1) % TRAT.length];
    const usek = metry(a, b);
    if (zbyva <= usek) {
      const t = usek === 0 ? 0 : zbyva / usek;
      return { sirka: a.sirka + (b.sirka - a.sirka) * t, delka: a.delka + (b.delka - a.delka) * t };
    }
    zbyva -= usek;
  }
  return { sirka: TRAT[0].sirka, delka: TRAT[0].delka };
}

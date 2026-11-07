/**
 * Ukázkový režim: nesmí sáhnout ven a musí ukázat něco živého.
 *
 * <b>Proč na to je test.</b> Celý ten režim stojí na jediném slibu —
 * *„nechci mu to pouštět na serveru po telefonu"*. Slib, u kterého není
 * vidět, čím se pozná, že je porušený, je komentář. Test proto jede přes
 * čtení i zápis a nakonec se podívá, že v appce nezůstalo místo, které
 * sahá na síť mimo jediný šev.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DO_STARTU_MIN,
  ukazkaBezi,
  ukazkaOdpovez,
  vypniUkazku,
  zapniUkazku,
} from '../src/lib/ukazka.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void | Promise<void>) {
  try {
    const v = f();
    if (v instanceof Promise) throw new Error('test musí být synchronní');
    prosly += 1;
    console.log('  ok   ' + nazev);
  } catch (e) {
    console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
    process.exitCode = 1;
  }
}

async function odpoved(cesta: string, init?: { method?: string; body?: string }) {
  const o = await ukazkaOdpovez(cesta, init);
  return { stav: o.status, telo: (await o.json()) as any };
}

// --- přepínač ----------------------------------------------------------

zkus('vypnutá ukázka neběží', () => {
  vypniUkazku();
  assert.equal(ukazkaBezi(), false);
});

zkus('zapnutá běží a vypnutá zase ne', () => {
  zapniUkazku();
  assert.equal(ukazkaBezi(), true);
  vypniUkazku();
  assert.equal(ukazkaBezi(), false);
});

// --- čtení -------------------------------------------------------------

const testyAsync: [string, () => Promise<void>][] = [
  ['ročníky se čtou ze snímku', async () => {
    zapniUkazku();
    const { stav, telo } = await odpoved('/serie');
    assert.equal(stav, 200);
    assert.ok(Array.isArray(telo) && telo.length > 0, 'žádný ročník');
  }],

  ['v ukázce je někdo, kdo velí', async () => {
    zapniUkazku();
    const { telo } = await odpoved('/ja');
    const veli = (telo.opravneni ?? []).filter((o: any) => o.zavod);
    assert.ok(veli.length > 0, 'nikdo nikde nevelí — ukázka by neukázala start');
  }],

  ['neznámá cesta vrací 404, ne vymyšlenou odpověď', async () => {
    zapniUkazku();
    assert.equal((await odpoved('/takova-cesta-neni')).stav, 404);
  }],

  ['klíč k lodi se v ukázce tváří jako nevydaný', async () => {
    zapniUkazku();
    assert.equal((await odpoved('/klice/sledovani', { method: 'POST', body: '{}' })).stav, 401);
    assert.equal((await odpoved('/zarizeni', { method: 'POST', body: '{}' })).stav, 401);
  }],

  ['vypnutá ukázka neodpovídá', async () => {
    vypniUkazku();
    assert.equal((await odpoved('/serie')).stav, 503);
  }],

  // --- zápis mění snímek v paměti -------------------------------------

  ['ohlášení rozjížďky přibude a dostane další číslo', async () => {
    zapniUkazku();
    const cesta = '/sprava/serie/2026-nanecisto/vysledky/izolepa/rozjizdky';
    const pred = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo.rozjizdky.length;
    const { telo } = await odpoved(cesta, { method: 'POST', body: '{}' });
    const po = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo.rozjizdky;
    assert.equal(po.length, pred + 1);
    assert.equal(po[po.length - 1].cislo, telo.cislo);
  }],

  ['spuštěná procedura nastaví čas startu podle délky procedury', async () => {
    zapniUkazku();
    const z = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo;
    const cislo = z.rozjizdky[0].cislo;
    const zapsanoV = '2027-05-15T09:00:00.000Z';
    await odpoved(
      `/sprava/serie/2026-nanecisto/vysledky/izolepa/rozjizdky/${cislo}/procedura`,
      { method: 'POST', body: JSON.stringify({ druh: 'Spustit', zapsanoV }) },
    );
    const po = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo;
    const r = po.rozjizdky.find((x: any) => x.cislo === cislo);
    const cekany = Date.parse(zapsanoV) + (z.delkaProceduryMin ?? 5) * 60_000;
    assert.equal(Date.parse(r.startV), cekany);
  }],

  ['odvolání čas startu zahodí', async () => {
    zapniUkazku();
    const cislo = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo.rozjizdky[0].cislo;
    await odpoved(`/sprava/serie/2026-nanecisto/vysledky/izolepa/rozjizdky/${cislo}/procedura`,
      { method: 'POST', body: JSON.stringify({ druh: 'Odvolat' }) });
    const r = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo
      .rozjizdky.find((x: any) => x.cislo === cislo);
    assert.equal(r.startV, null);
  }],

  ['nová ukázka začíná znovu, ne tam, kde skončila ta minulá', async () => {
    zapniUkazku();
    const cesta = '/sprava/serie/2026-nanecisto/vysledky/izolepa/rozjizdky';
    const pred = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo.rozjizdky.length;
    await odpoved(cesta, { method: 'POST', body: '{}' });
    zapniUkazku();
    const po = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo.rozjizdky.length;
    assert.equal(po, pred);
  }],

  ['cílová obrazovka dostane zápis složený z detailu', async () => {
    zapniUkazku();
    const cislo = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo.rozjizdky[0].cislo;
    const { stav, telo } = await odpoved(
      `/sprava/serie/2026-nanecisto/vysledky/izolepa/rozjizdky/${cislo}`,
    );
    assert.equal(stav, 200);
    assert.ok(telo.lode.length > 0, 'zápis bez lodí');
    assert.ok(telo.lode.every((l: any) => typeof l.prihlaskaId === 'number'));
  }],
];

// --- ukázka začíná uprostřed odpočtu ----------------------------------

testyAsync.push(['po zapnutí čeká rozjížďka, která startuje za deset minut', async () => {
  zapniUkazku();
  const z = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo;
  const cerstva = z.rozjizdky[z.rozjizdky.length - 1];
  const doStartu = (Date.parse(cerstva.startV) - Date.now()) / 60_000;
  assert.ok(
    Math.abs(doStartu - DO_STARTU_MIN) < 0.2,
    `do startu vyšlo ${doStartu.toFixed(2)} min místo ${DO_STARTU_MIN}`,
  );
  assert.equal(cerstva.stav, 'Planovana');
}]);

testyAsync.push(['procedura v tu chvíli ještě neběží — dá se spustit celá', async () => {
  // Deset minut do startu a procedura dlouhá pět: panel tedy nabízí
  // „Spustit startovní proceduru". Kdyby byl náskok kratší než procedura,
  // otevřela by se ukázka uprostřed odpočtu a o půlku věci by přišla.
  zapniUkazku();
  const z = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo;
  assert.ok(
    DO_STARTU_MIN > (z.delkaProceduryMin ?? 5),
    `náskok ${DO_STARTU_MIN} min není delší než procedura ${z.delkaProceduryMin} min`,
  );
}]);

testyAsync.push(['odjeté rozjížďky v ukázce zůstávají — jsou to ty různé stavy', async () => {
  // Kdyby se nachystaná rozjížďka napsala přes existující, zmizela by
  // z ukázky dokončená s výsledky a zůstala by jen ta jedna.
  zapniUkazku();
  const z = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo;
  assert.ok(z.rozjizdky.length > 1, 'v ukázce zbyla jediná rozjížďka');
  assert.ok(
    z.rozjizdky.some((r: any) => r.stav !== 'Planovana'),
    'žádná odjetá rozjížďka — ukázka ukáže jen prázdný začátek',
  );
}]);

testyAsync.push(['druhé zapnutí nachystá start znovu, ne další navíc', async () => {
  zapniUkazku();
  const prvni = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo.rozjizdky.length;
  zapniUkazku();
  const druha = (await odpoved('/serie/2026-nanecisto/zavody/izolepa')).telo.rozjizdky.length;
  assert.equal(druha, prvni);
}]);

// --- a hlavně: nejde to ven doopravdy? --------------------------------

testyAsync.push(['v ukázce se `fetch` nezavolá ani jednou', async () => {
  // Statická kontrola níž hlídá, <b>kde</b> `fetch` v kódu je. Tahle
  // hlídá to podstatnější: že se za běhu nezavolá. Jsou to dvě různé
  // věci — nové volání přes `sit()` by prošlo obojí jen tehdy, když
  // ukázku respektuje.
  const puvodni = globalThis.fetch;
  let volani = 0;
  globalThis.fetch = (() => {
    volani += 1;
    return Promise.reject(new Error('v ukázce se nesmí volat fetch'));
  }) as typeof fetch;

  try {
    zapniUkazku();
    const api = await import('../src/lib/api.ts');
    const sit = await import('../src/lib/sit.ts');

    await api.nactiSerie();
    await api.nactiZavod('2026-nanecisto', 'izolepa');
    await api.nacti('/takova-cesta-neni');
    await sit.overSpojeni();
    await api.provedProceduru('2026-nanecisto', 'izolepa', 1, 'Odvolat').catch(() => {});

    assert.equal(volani, 0, `ukázka sáhla na síť ${volani}×`);
  } finally {
    globalThis.fetch = puvodni;
    vypniUkazku();
  }
}]);

testyAsync.push(['mimo ukázku se `fetch` naopak zavolá', async () => {
  // Bez tohohle by test výš prošel i tehdy, kdyby se ta volání nedělala
  // vůbec — měřil by ticho, ne odpojení.
  const puvodni = globalThis.fetch;
  let volani = 0;
  globalThis.fetch = (() => {
    volani += 1;
    return Promise.reject(new Error('v testu se nikam nechodí'));
  }) as typeof fetch;

  try {
    vypniUkazku();
    const api = await import('../src/lib/api.ts');
    await api.nactiSerie().catch(() => {});
    assert.ok(volani > 0, 'mimo ukázku se nevolalo nic — test výš nic nedokazuje');
  } finally {
    globalThis.fetch = puvodni;
  }
}]);

// --- a nakonec: nesahá appka na síť mimo šev? --------------------------

function soubory(korenr: string): string[] {
  return readdirSync(korenr).flatMap((j) => {
    const c = join(korenr, j);
    if (statSync(c).isDirectory()) return soubory(c);
    return c.endsWith('.ts') || c.endsWith('.tsx') ? [c] : [];
  });
}

zkus('fetch je jen v `lib/sit.ts` a v přihlašování', () => {
  // Ukázka slibuje, že se na server nejde vůbec. Ten slib drží jediný šev;
  // nový `fetch` jinde by ho tiše prorazil, a nepoznalo by se to, dokud by
  // někomu na vodě neodešla data z ukázky.
  const povolene = ['src/lib/sit.ts', 'src/lib/identita.ts'];
  // Cesta od souboru s testem, ne od adresáře, ze kterého se spustil.
  const koren = fileURLToPath(new URL('../src', import.meta.url));
  const hrisnici = soubory(koren)
    .filter((c) => /\bfetch\s*\(/.test(readFileSync(c, 'utf8')))
    .map((c) => c.replace(/\\/g, '/'))
    .filter((c) => !povolene.some((p) => c.endsWith(p)));
  assert.deepEqual(hrisnici, [], `fetch mimo šev: ${hrisnici.join(', ')}`);
});

void (async () => {
  for (const [nazev, f] of testyAsync) {
    try {
      await f();
      prosly += 1;
      console.log('  ok   ' + nazev);
    } catch (e) {
      console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
      process.exitCode = 1;
    }
  }
  console.log(`  ${prosly} prošlo`);
})();

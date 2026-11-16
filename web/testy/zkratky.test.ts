/**
 * Hranice odchozího požadavku při rozbalování zkratky.
 *
 * Z obrazovky se to neověří: vstupní pole vypadá stejně, ať se za ním
 * server zeptá Seznamu, nebo sám sebe na `127.0.0.1`. A právě to byl
 * nález — smyčka přeskoků ověřovala jen protokol, ne hostitele, takže
 * zkratka vyrobená na `goo.gl` dokázala našeho serveru poručit, kam má
 * sáhnout (CodeQL `js/request-forgery`, 14. 11. 2026).
 *
 * Překlad jmen se podvrhuje, aby kontrola nezávisela na tom, co zrovna
 * vrací cizí DNS. U adres zapsaných rovnou číselně se ale pouští ta
 * pravá cesta — tam se síť nepotřebuje a je lepší měřit skutečnost.
 */
import assert from 'node:assert/strict';
import { isIP } from 'node:net';

import { kamSeNesmi, neverejnaV4, neverejnaV6, rozbalZkratku, type Preklad } from '../lib/zkratky.ts';

let prosly = 0;
function zkus(nazev: string, f: () => Promise<void> | void) {
  return Promise.resolve()
    .then(f)
    .then(() => { prosly += 1; console.log('  ok   ' + nazev); })
    .catch((e) => { console.log('  CHYBA ' + nazev + ': ' + (e as Error).message); process.exitCode = 1; });
}

// ---- rozsahy -------------------------------------------------------------

await zkus('vnitřní a nesměrovatelné IPv4 jsou neveřejné', () => {
  for (const ip of [
    '127.0.0.1', '127.1.2.3', '0.0.0.0', '10.0.0.5', '172.16.0.1', '172.31.255.254',
    '192.168.1.1', '169.254.169.254', '100.64.0.1', '192.0.0.1', '192.0.2.5',
    '198.18.0.1', '198.51.100.7', '203.0.113.9', '224.0.0.1', '255.255.255.255',
    'nesmysl', '1.2.3', '1.2.3.4.5', '999.1.1.1',
  ])
    assert.equal(neverejnaV4(ip), true, ip + ' má být odmítnuta');
});

await zkus('veřejné IPv4 projdou', () => {
  for (const ip of ['93.184.216.34', '8.8.8.8', '172.15.0.1', '172.32.0.1', '1.1.1.1', '192.0.1.1'])
    assert.equal(neverejnaV4(ip), false, ip + ' má projít');
});

await zkus('smyčka, ULA a link-local v IPv6 jsou neveřejné', () => {
  for (const ip of [
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'fe80::1%eth0', 'ff02::1',
    '2001:db8::1', '64:ff9b::7f00:1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', 'ne:smysl',
  ])
    assert.equal(neverejnaV6(ip), true, ip + ' má být odmítnuta');
});

await zkus('veřejné IPv6 projdou', () => {
  for (const ip of ['2606:4700:4700::1111', '2a00:1450:4001:82f::200e', '::ffff:93.184.216.34'])
    assert.equal(neverejnaV6(ip), false, ip + ' má projít');
});

// ---- kontrola adresy -----------------------------------------------------

// Skutečný `dns.lookup` vrací číselně zapsanou adresu beze změny, takže
// tohle jsou případy, kde se pouští pravá cesta včetně překladu.
await zkus('adresa na vlastní stroj je odmítnutá i bez podvrženého DNS', async () => {
  assert.ok(await kamSeNesmi(new URL('http://127.0.0.1:8080/tajne')));
  assert.ok(await kamSeNesmi(new URL('http://[::1]/tajne')));
  assert.ok(await kamSeNesmi(new URL('http://169.254.169.254/latest/meta-data/')));
});

// `URL` i `dns.lookup` tyhle zápisy samy převedou na tečkový tvar, takže
// kontrola nad *přeloženou* adresou je chytí; kontrola nad `hostname`
// zapsaným v odkazu by je nechytila.
await zkus('číselný zápis vlastního stroje se odmítne', async () => {
  for (const u of ['http://2130706433/', 'http://0x7f000001/', 'http://127.1/'])
    assert.ok(await kamSeNesmi(new URL(u)), u + ' má být odmítnuta');
});

await zkus('neobvyklý port a jiné schéma se odmítnou', async () => {
  assert.ok(await kamSeNesmi(new URL('http://93.184.216.34:9200/_search')));
  assert.ok(await kamSeNesmi(new URL('file:///etc/passwd')));
  assert.equal(await kamSeNesmi(new URL('https://93.184.216.34:443/x')), null);
});

/**
 * Podvržený překlad: co není v tabulce, se nepřeloží. <b>Adresu zapsanou
 * číselně vrací beze změny</b>, stejně jako skutečný `dns.lookup` —
 * jinak by zkouška vnitřní adresy padala na „nedaří se přeložit" a
 * o hranici, kterou měří, by neřekla nic.
 */
const tabulka = (zaznamy: Record<string, string[]>): Preklad => async (host) => {
  const jakoIp = isIP(host);
  if (jakoIp) return [{ address: host, family: jakoIp }];

  const adresy = zaznamy[host];
  if (!adresy) throw new Error('neznámý host ' + host);
  return adresy.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
};

await zkus('jméno, které míří dovnitř, se odmítne', async () => {
  const dns = tabulka({ 'vnitrni.priklad': ['10.1.2.3'], 'venku.priklad': ['93.184.216.34'] });
  assert.ok(await kamSeNesmi(new URL('https://vnitrni.priklad/x'), dns));
  assert.equal(await kamSeNesmi(new URL('https://venku.priklad/x'), dns), null);
});

await zkus('stačí jedna neveřejná adresa ze záznamu', async () => {
  const dns = tabulka({ 'obojaky.priklad': ['93.184.216.34', '127.0.0.1'] });
  assert.ok(await kamSeNesmi(new URL('https://obojaky.priklad/x'), dns));
});

// ---- celá smyčka ---------------------------------------------------------

/** Nahradí `fetch` tabulkou přesměrování a počítá, na co se kdo ptal. */
function podvrhniFetch(kam: Record<string, { status: number; location?: string }>) {
  const puvodni = globalThis.fetch;
  const dotazy: string[] = [];
  globalThis.fetch = (async (vstup: URL | RequestInfo) => {
    const adresa = String(vstup instanceof URL ? vstup.href : vstup);
    dotazy.push(adresa);
    const odpoved = kam[adresa];
    if (!odpoved) throw new Error('nečekaný požadavek na ' + adresa);
    return new Response(null, {
      status: odpoved.status,
      headers: odpoved.location ? { location: odpoved.location } : {},
    });
  }) as typeof fetch;
  return { dotazy, vrat: () => { globalThis.fetch = puvodni; } };
}

const DNS = tabulka({
  'mapy.com': ['93.184.216.34'],
  'goo.gl': ['142.250.102.100'],
  'maps.google.com': ['142.250.102.101'],
});

// Obvyklý port schválně: jinak by odmítnutí obstarala kontrola portu a
// o hranici na adrese by tenhle test neřekl nic.
await zkus('zkratka mířící na vlastní stroj se odmítne a nezavolá', async () => {
  for (const cil of ['http://127.0.0.1/tajne', 'http://[::1]/tajne', 'https://10.0.0.5/tajne']) {
    const site = podvrhniFetch({
      'https://mapy.com/s/zluty': { status: 302, location: cil },
    });
    try {
      const vysledek = await rozbalZkratku('https://mapy.com/s/zluty', DNS);
      assert.ok('chyba' in vysledek, cil + ' má vrátit chybu, vrátilo ' + JSON.stringify(vysledek));
      assert.equal(
        'chyba' in vysledek ? vysledek.chyba : '',
        'Ten odkaz vede na adresu, kam náš server nechodí.',
        cil + ' má odmítnout kontrola adresy, ne portu',
      );
      assert.deepEqual(site.dotazy, ['https://mapy.com/s/zluty'], 'na vnitřní adresu se nesmí sáhnout');
    } finally {
      site.vrat();
    }
  }
});

await zkus('zkratka na neobvyklý port vnitřní sítě se odmítne', async () => {
  const site = podvrhniFetch({
    'https://mapy.com/s/zluty': { status: 302, location: 'http://127.0.0.1:8080/tajne' },
  });
  try {
    assert.ok('chyba' in (await rozbalZkratku('https://mapy.com/s/zluty', DNS)));
    assert.deepEqual(site.dotazy, ['https://mapy.com/s/zluty']);
  } finally {
    site.vrat();
  }
});

await zkus('zkratka na metadata cloudu se odmítne', async () => {
  const site = podvrhniFetch({
    'https://goo.gl/abc': { status: 301, location: 'http://169.254.169.254/latest/meta-data/' },
  });
  try {
    assert.ok('chyba' in (await rozbalZkratku('https://goo.gl/abc', DNS)));
    assert.equal(site.dotazy.length, 1);
  } finally {
    site.vrat();
  }
});

await zkus('zkratka přes dva skoky na veřejnou mapu projde', async () => {
  const cil = 'https://maps.google.com/maps?q=49.4957,14.1841';
  const site = podvrhniFetch({
    'https://goo.gl/abc': { status: 301, location: 'https://maps.app.goo.gl/xyz' },
    'https://maps.app.goo.gl/xyz': { status: 302, location: cil },
    [cil]: { status: 200 },
  });
  try {
    assert.deepEqual(await rozbalZkratku('https://goo.gl/abc', tabulka({
      'goo.gl': ['142.250.102.100'],
      'maps.app.goo.gl': ['142.250.102.102'],
      'maps.google.com': ['142.250.102.101'],
    })), { adresa: cil });
  } finally {
    site.vrat();
  }
});

await zkus('zkratka z Mapy.com na vlastní bod projde', async () => {
  const cil = 'https://mapy.com/turisticka?id=14.1841,49.4957&x=14.18&y=49.49';
  const site = podvrhniFetch({
    'https://mapy.com/s/zluty': { status: 302, location: cil },
    [cil]: { status: 200 },
  });
  try {
    assert.deepEqual(await rozbalZkratku('https://mapy.com/s/zluty', DNS), { adresa: cil });
  } finally {
    site.vrat();
  }
});

await zkus('hostitel mimo seznam se nerozbaluje vůbec', async () => {
  const site = podvrhniFetch({});
  try {
    assert.ok('chyba' in (await rozbalZkratku('https://evil.priklad/s/x', DNS)));
    assert.deepEqual(site.dotazy, []);
  } finally {
    site.vrat();
  }
});

console.log('\n' + prosly + ' prošlo');

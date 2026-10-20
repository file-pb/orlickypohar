// První fáze: zapsat body a skončit, jako když systém appku zabije.
import { zalozZaznam, zapisBody, bezicZaznam } from '../../src/lib/tracker/zaznam.ts';

const id = zalozZaznam({ lod: 'LUNA', regata: 'Radavská regata', zdroj: 'gps' });
const t0 = Date.parse('2027-06-26T08:00:00Z');
zapisBody(
  id,
  Array.from({ length: 120 }, (_, i) => ({
    sirka: 49.5163 + i * 0.0001,
    delka: 14.1651 + i * 0.0001,
    presnost: 5,
    rychlost: 2.5,
    casGps: t0 + i * 5000,
  })),
);
console.log(JSON.stringify({ id, bezi: bezicZaznam()?.stav }));

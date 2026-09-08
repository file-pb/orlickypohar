// Datum se formátuje ručně, ne přes `toLocaleDateString`. Hermes nemusí mít
// plnou podporu Intl a chování by se lišilo mezi zařízeními — přesně ta past,
// na kterou jsme šlápli na serveru bez ICU (platform/docs/POUCENI.md, bod 30).
// Deset názvů měsíců je levnější než závislost na tom, co má telefon v sobě.

const MESICE = [
  'ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
];

/** „25. dubna 2026". Vstup je ISO datum z API. */
export function datum(iso: string): string {
  const [rok, mesic, den] = iso.slice(0, 10).split('-').map(Number);
  return `${den}. ${MESICE[mesic - 1]} ${rok}`;
}

/** Vícedenní závod uvnitř jednoho měsíce zkrátí na „23.–24. května 2026". */
export function rozsah(od: string, do_?: string | null): string {
  if (!do_) return datum(od);
  if (od.slice(0, 7) === do_.slice(0, 7)) return `${Number(od.slice(8, 10))}.–${datum(do_)}`;
  return `${datum(od)} – ${datum(do_)}`;
}

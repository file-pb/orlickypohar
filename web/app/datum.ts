/**
 * Data česky na jednom místě.
 *
 * Vzniklo to podle pravidla z CLAUDE.md: sdílet se začíná až u **třetí**
 * kopie. `datum` byl doslova týž ve stránce ročníku i zastávky a novinky
 * by ho okopírovaly potřetí — teď je to jeden slovník, ne abstrakce.
 * Obě funkce se sem přestěhovaly beze změny chování; sjednocovat je do
 * jedné je práce navíc, která by při stěhování mohla něco tiše posunout.
 */

const CESKY = "cs-CZ";

/** „26. dubna 2026“, u vícedenního závodu „23.–24. května 2026“. */
export function datum(od: string, do_?: string | null) {
  const f = (d: string) =>
    new Date(d).toLocaleDateString(CESKY, { day: "numeric", month: "long", year: "numeric" });
  if (!do_) return f(od);

  // Vícedenní závod uvnitř jednoho měsíce: „23.–24. května 2026". Dvakrát
  // vypsaný měsíc a rok se na telefonu zalomí přes dva řádky pro nic.
  const [a, b] = [new Date(od), new Date(do_)];
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${a.getDate()}.–${f(do_)}`
    : `${f(od)} – ${f(do_)}`;
}

const MESICE = [
  "ledna", "února", "března", "dubna", "května", "června",
  "července", "srpna", "září", "října", "listopadu", "prosince",
];

/** „19. září" — rok v téhle větě nikoho nezajímá. */
export function denAMesic(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}. ${MESICE[m - 1]}`;
}

/**
 * Kdy článek vyšel: „9. května 2026".
 *
 * Datum se schválně počítá v pražském pásmu, ne v UTC ani v pásmu čtenáře.
 * API vydává okamžik v UTC, takže večerní novinka z 20:30 letního času leží
 * v 18:30 UTC — a u té z půl jedné po půlnoci by prostý řez řetězce ukázal
 * včerejšek. Zastávky se jedou na Orlíku, takže pražský den je ten správný.
 */
export function datumClanku(iso: string) {
  return new Date(iso).toLocaleDateString(CESKY, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Prague",
  });
}

/**
 * Okamžik i s časem: „15. září 2026 v 14:30". Pro poslední přihlášení,
 * kde „dnes ráno" a „dnes večer" je rozdíl. Pražské pásmo ze stejného
 * důvodu jako u článku.
 */
export function okamzik(iso: string) {
  return new Date(iso).toLocaleString(CESKY, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Prague",
  });
}
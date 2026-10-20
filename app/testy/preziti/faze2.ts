// Druhá fáze: nový proces, nová databázová spojení. Musí najít zapsanou
// část i to, že záznam pořád běží.
import { bezicZaznam, prehled } from '../../src/lib/tracker/zaznam.ts';

const z = bezicZaznam();
const p = z ? prehled(z.id) : null;
console.log(JSON.stringify({ stav: z?.stav, lod: z?.lod, pocet: p?.pocetBodu, delka: Math.round(p?.delkaM ?? 0) }));

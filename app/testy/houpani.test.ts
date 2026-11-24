import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { DOBA_MS, ROZKYV_NAKLON, ROZKYV_SVISLE, VZORKY, faze, prubeh } from '../src/lib/houpani.ts';

test('vstup roste, jinak by interpolace spadla', () => {
  const { vstup } = prubeh(0, 1);
  for (let i = 1; i < vstup.length; i += 1) assert.ok(vstup[i] > vstup[i - 1]);
  assert.equal(vstup.length, VZORKY + 1);
});

test('smyčka se nezacuká: konec sedí na začátek', () => {
  for (const f of [0, 0.17, 0.5, 0.83]) {
    const { vystup } = prubeh(f, ROZKYV_SVISLE);
    assert.ok(Math.abs(vystup[0] - vystup[vystup.length - 1]) < 1e-9);
  }
});

test('rozkyv nepřeteče zadanou mez', () => {
  const { vystup } = prubeh(0.3, ROZKYV_NAKLON);
  for (const v of vystup) assert.ok(Math.abs(v) <= ROZKYV_NAKLON + 1e-9);
});

test('sousední značky se nehoupou zároveň', () => {
  for (let i = 0; i < 20; i += 1) {
    const a = faze(i);
    const b = faze(i + 1);
    assert.ok(Math.min(Math.abs(a - b), 1 - Math.abs(a - b)) > 0.1, `${i}: ${a} vs ${b}`);
  }
});

test('doba je klidná, ne nervózní', () => {
  assert.ok(DOBA_MS >= 2500);
});

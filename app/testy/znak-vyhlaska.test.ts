/**
 * Výklad plavebního značení v appce.
 *
 * Měří se ta jedna věc, kterou by nepozorné opsání z webu pokazilo:
 * **plameňák se testuje dřív než žlutá.** Vyhláška nafukovacího ptáka
 * nezná, takže žlutý plameňák nesmí hlásit zakázanou vodní plochu.
 */
import assert from 'node:assert/strict';

import { znakPodleVyhlasky } from '../src/lib/znak-vyhlaska.ts';

let prosly = 0;
function zkus(nazev: string, f: () => void) {
  try {
    f();
    prosly += 1;
    console.log('  ok   ' + nazev);
  } catch (e) {
    console.log('  CHYBA ' + nazev + ': ' + (e as Error).message);
    process.exitCode = 1;
  }
}

zkus('červená válcová je pravá strana dráhy', () => {
  assert.equal(znakPodleVyhlasky('Cervena', 'Valcova'), 'pravá strana plavební dráhy');
});

zkus('zelená kuželová je levá strana dráhy', () => {
  assert.equal(znakPodleVyhlasky('Zelena', 'Kuzelova'), 'levá strana plavební dráhy');
});

zkus('žlutá s poklopem je sportovní bóje', () => {
  assert.equal(znakPodleVyhlasky('Zluta', 'SferickyVrsek'), 'sportovní bóje');
});

zkus('žlutá jinak značí zakázanou plochu', () => {
  assert.equal(znakPodleVyhlasky('Zluta', 'Kulova'), 'zakázaná nebo vyhrazená vodní plocha');
  assert.equal(znakPodleVyhlasky('Zluta', undefined), 'zakázaná nebo vyhrazená vodní plocha');
});

zkus('žlutý plameňák nehlásí nic', () => {
  // Kdyby se podmínka na plameňáka dostala za žlutou, vyjde odsud
  // „zakázaná nebo vyhrazená vodní plocha" — a to je tvrzení o vodě,
  // které tam nikdo nevyhlásil.
  assert.equal(znakPodleVyhlasky('Zluta', 'Plamenak'), null);
  assert.equal(znakPodleVyhlasky('Ruzova', 'Plamenak'), null);
});

zkus('co vyhláška nezná, mlčí', () => {
  assert.equal(znakPodleVyhlasky('Cervena', 'Kuzelova'), null);
  assert.equal(znakPodleVyhlasky('Modra', 'Valcova'), null);
  assert.equal(znakPodleVyhlasky(undefined, undefined), null);
});

console.log('\n' + prosly + ' prošlo');

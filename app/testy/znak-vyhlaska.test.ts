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

zkus('plovatka je rovnocenná varianta znaku dráhy', () => {
  // Filip, 26. 11. 2026: „obě můžou mít varianty jako plovatka, akorát
  // má tu barvu". Do té doby u nich výklad mlčel, přestože to pořadatel
  // u bóje vybral.
  assert.equal(znakPodleVyhlasky('Cervena', 'Plovatka'), 'pravá strana plavební dráhy');
  assert.equal(znakPodleVyhlasky('Zelena', 'Plovatka'), 'levá strana plavební dráhy');
});

zkus('zákaz vplutí je žlutá kuželová, a jen ta', () => {
  // Filip, 26. 11. 2026: „žlutá kuželová bojka vypadá moc hezky, ale je
  // to zákaz vplutí. Vždycky."
  assert.equal(znakPodleVyhlasky('Zluta', 'Kuzelova'), 'zakázaná nebo vyhrazená vodní plocha');
});

zkus('žlutý mimoň není zákaz ani sport', () => {
  // Válec se sférickým vrškem je otočná bójka a bývá i červená nebo
  // zelená. Sportovní zóna má týž tvar a pozná se nápisem SPORT, který
  // se z barvy a tvaru vyčíst nedá — dokud ho tedy někdo nevybere jako
  // znak dráhy, vyhláška o té bóji neříká nic.
  assert.equal(znakPodleVyhlasky('Zluta', 'SferickyVrsek'), null);
  assert.equal(znakPodleVyhlasky('Cervena', 'SferickyVrsek'), null);
  assert.equal(znakPodleVyhlasky('Zelena', 'SferickyVrsek'), null);
  assert.equal(znakPodleVyhlasky('Zluta', 'SferickyVrsek', 'NaseBoje'), null);
});

zkus('sport se pozná podle nápisu, tedy podle značení', () => {
  assert.equal(znakPodleVyhlasky('Zluta', 'SferickyVrsek', 'DrahaSport'), 'sportovní bóje');
  // A platí i tehdy, když si pořadatel vybral jinou barvu.
  assert.equal(znakPodleVyhlasky('Cervena', 'SferickyVrsek', 'DrahaSport'), 'sportovní bóje');
});

zkus('žlutá jinam než do kuželu nic nehlásí', () => {
  // Dřív odsud vycházel zákaz pro cokoliv žlutého — i pro naši otočnou.
  assert.equal(znakPodleVyhlasky('Zluta', 'Kulova'), null);
  assert.equal(znakPodleVyhlasky('Zluta', undefined), null);
});

zkus('žlutý plameňák nehlásí nic', () => {
  // Kdyby se podmínka na plameňáka dostala za barvy, vyjde odsud
  // tvrzení o vodě, které tam nikdo nevyhlásil.
  assert.equal(znakPodleVyhlasky('Zluta', 'Plamenak'), null);
  assert.equal(znakPodleVyhlasky('Ruzova', 'Plamenak'), null);
});

zkus('co není bóje, nemá výklad', () => {
  assert.equal(znakPodleVyhlasky('Cervena', 'Valcova', 'Plavidlo'), null);
  assert.equal(znakPodleVyhlasky('Zelena', 'Kuzelova', 'ObjektNaBrehu'), null);
});

zkus('co vyhláška nezná, mlčí', () => {
  assert.equal(znakPodleVyhlasky('Cervena', 'Kuzelova'), null);
  assert.equal(znakPodleVyhlasky('Modra', 'Valcova'), null);
  assert.equal(znakPodleVyhlasky(undefined, undefined), null);
});

console.log('\n' + prosly + ' prošlo');

/**
 * Vývoz trasy do GPX a sdílení.
 *
 * „Trasy vůbec vzniknou" je hodnota jen tehdy, když se dá někdo podívat
 * a říct „vzorkování je moc hrubé". Dokud pilot nemá nahrávání na server,
 * je tohle ta jediná cesta, jak se záznam dostane z telefonu — a GPX proto,
 * že ho otevře každá mapa i Garmin, takže k posouzení netřeba náš web.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { body, zaznam } from './zaznam';

/** V GPX je čas vždy UTC s `Z`; místní pásmo si přečte ten, kdo trasu otevře. */
function cas(ms: number) {
  return new Date(ms).toISOString();
}

function xml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function slozGpx(zaznamId: string): string {
  const z = zaznam(zaznamId);
  if (!z) throw new Error('Záznam neexistuje.');
  const b = body(zaznamId);

  const nazev = [z.lod, z.regata].filter(Boolean).join(' — ');
  const body_ = b
    .map((p) => {
      const casti = [
        `        <trkpt lat="${p.sirka.toFixed(7)}" lon="${p.delka.toFixed(7)}">`,
        `          <time>${cas(p.cas_gps)}</time>`,
      ];
      // Nepravdivý údaj je horší než chybějící: co GPS nedala, do souboru
      // nepatří, a dopočítat se to nedá.
      if (p.rychlost != null) casti.push(`          <speed>${p.rychlost.toFixed(2)}</speed>`);
      if (p.presnost != null) casti.push(`          <hdop>${p.presnost.toFixed(1)}</hdop>`);
      casti.push('        </trkpt>');
      return casti.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Orlický pohár" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${xml(nazev)}</name>
    <time>${cas(z.zacatek)}</time>
  </metadata>
  <trk>
    <name>${xml(nazev)}</name>
${z.zdroj === 'simulace' ? '    <desc>Simulovaná trasa — není to skutečný záznam.</desc>\n' : ''}    <trkseg>
${body_}
    </trkseg>
  </trk>
</gpx>
`;
}

/** Uloží GPX do dočasné složky a nabídne ho k odeslání. */
export async function posliGpx(zaznamId: string) {
  const z = zaznam(zaznamId);
  if (!z) throw new Error('Záznam neexistuje.');

  const jmeno = `trasa-${z.lod.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${new Date(
    z.zacatek,
  )
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, '')}.gpx`;

  const f = new File(Paths.cache, jmeno);
  if (f.exists) f.delete();
  f.create();
  f.write(slozGpx(zaznamId));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(`Sdílení tu není. Soubor leží v ${f.uri}`);
  }
  await Sharing.shareAsync(f.uri, { mimeType: 'application/gpx+xml', UTI: 'com.topografix.gpx' });
}

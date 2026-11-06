// Nahradí nativní moduly Expa náhradami a doplní `.ts` u relativních
// importů — Metro je domýšlí, Node ne.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KOREN = new URL('nahrady/', import.meta.url);
const NAHRADY = new Set([
  'expo-sqlite', 'expo-file-system', 'expo-sharing',
  'expo-auth-session', 'expo-secure-store', 'expo-battery',
  'expo-updates',
]);

export function resolve(spec, ctx, next) {
  if (NAHRADY.has(spec)) {
    return { url: new URL(`${spec}.mjs`, KOREN).href, shortCircuit: true };
  }
  // Metro importuje JSON prostým `import x from './x.json'`; Node na to
  // chce atribut. Doplní se tady, aby ho appka nemusela mít v kódu —
  // s atributem by si zase neporadil Metro.
  if (spec.endsWith('.json') && ctx.parentURL) {
    return {
      url: new URL(spec, ctx.parentURL).href,
      importAttributes: { type: 'json' },
      shortCircuit: true,
    };
  }
  if (spec.startsWith('.') && !/\.[cm]?[jt]s$/.test(spec) && ctx.parentURL) {
    const kandidat = new URL(`${spec}.ts`, ctx.parentURL);
    if (existsSync(fileURLToPath(kandidat))) {
      return { url: kandidat.href, format: 'module-typescript', shortCircuit: true };
    }
  }
  return next(spec, ctx);
}

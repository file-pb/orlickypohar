/**
 * Co posouvá nativní otisk (runtimeVersion: fingerprint v app.json).
 *
 * Otisk rozhoduje, které telefony dostanou JavaScript po síti: posunutý
 * otisk znamená nový balíček přes Obchod Play a do té doby žádné novinky.
 * Proto ho nesmí posouvat nic, co nativní není (Filip, 27. 11. 2026:
 * appka se musí aktualizovat sama — a to stojí na tom, že nativní vydání
 * jsou vzácná).
 *
 * - GitIgnore: řádek v .gitignore nemění, co je v balíčku.
 * - PackageJsonScriptsAll: skripty v package.json do balíčku nejdou.
 * - eas.json: profily buildu; kanál se mění vědomě a vzácně.
 * - Monochromatická ikona je zároveň ikona upozornění a jinak ji otisk
 *   nevidí, ačkoliv do balíčku jde.
 *
 * Zavedení tohohle souboru otisk jednou posune — proto jede spolu
 * s nativním vydáním (balíček 19), ne samo.
 */
/** @type {import('expo/fingerprint').Config} */
const config = {
  sourceSkips: ['GitIgnore', 'PackageJsonScriptsAll'],
  ignorePaths: ['eas.json'],
  extraSources: [
    {
      type: 'file',
      filePath: 'assets/images/android-icon-monochrome.png',
      reasons: ['ikona upozornění (android.adaptiveIcon.monochromeImage)'],
    },
  ],
};

module.exports = config;

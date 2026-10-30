# Příručka: jak si Miloš přeinstaluje appku

**Platí pro APK vydané 30. 10. 2026** (build `cd907b77`, versionCode 8,
otisk `afbd9b0c…`, zapsané v `app/vydane-apk.json`; produkce na `/appka`
ho rozdává, ověřeno 30. 10.). Až vyjde další, projdi text znovu — a zkontroluj
hlavně to, co appce slibuje.

**Čtyři instalace za tři dny**, a za každou stojí posunutý nativní otisk — ne
novinka v appce:

| Vydáno | Build | Otisk | Co ho posunulo |
|---|---|---|---|
| 28. 10. ráno | `d343c6d2` | `3995edc5…` | — |
| 28. 10. odpoledne | `4b579f9b` | `c4d54801…` | `expo-battery`, přišla pár minut po předchozím buildu |
| 29. 10. | `1e869aa0` | `9dfabf3c…` | `expo` `~57.0.30` → `~57.0.31` a nové `overrides` (`expo-modules-core` → `react-native-worklets`) |
| 30. 10. | `cd907b77` | `afbd9b0c…` | nativní dávka: hlas, klakson a modul *Nerušit* (`app/modules/nerusit/`) |

Dávka ve čtvrtém řádku se schválně přidávala **najednou** právě proto, aby
instalací nebylo pět (`APPKA-PORADI-PRACI.md`). Slib „většinu novinek už
stahovat nebudeš" platí pro novinky v appce, ne pro nativní závislosti,
a ten rozdíl laik neudělá — **než se pošle znovu, přečti si, co se mu
slibuje.** Miloš si první z těch buildů podle tohohle návodu stáhl sám.

Text níž je **pro rozhodčího, ne pro vývojáře** — píše se tak, aby šel
poslat do WhatsAppu beze změny. Vzniknul proto, že od 28. 10. 2026 se
appka umí aktualizovat sama, ale ruční instalace se vrací s každou nativní
změnou, takže je potřeba text, který se dá poslat kdykoliv.

Proč to nejde říct jen „stáhni si novou verzi": instalace mimo obchod
Androidu je pro laika past na třech místech — prohlížeč se zeptá, jestli
soubor opravdu chce, systém se zeptá, jestli věří zdroji, a Samsung to
rovnou zakáže hláškou, která zní jako virová výstraha. Kdo to nečeká,
skončí u druhého kroku.

---

## Text k poslání

> Ahoj Miloši, mám pro tebe novou verzi appky. Je v ní všechno, co jsme
> spolu minulý týden probírali.
>
> Vím, že je to krátce po sobě. Tahle verze veze i věci, které se musí do
> telefonu doinstalovat, takže po síti by k tobě nedošly — od ní už by
> většina novinek měla chodit sama.
>
> Appka se umí aktualizovat sama — většinu novinek jen otevřeš a bude
> nová, stahovat je nebudeš. Co se takhle přenést nedá, je to, co sahá
> hlouběji do telefonu; pak ti napíšu, že je potřeba stáhnout novou verzi
> jako teď. Ozvu se sám, ty to hlídat nemusíš.
>
> **Poznáš to.** Když se appka sama aktualizuje, při otevření se dole krátce
> ukáže oznámení, že jedeš na nové verzi, a samo zhasne. A kdykoliv se chceš
> podívat, na čem jedeš, je to v **Účtu** dole pod *Verze appky* — je tam
> i tlačítko, kterým se dá hledání novinek vyvolat ručně.
>
> Co udělat:
>
> 1. V telefonu otevři **orlickypohar.klihovka.cz/appka**
> 2. Klepni na tlačítko ke stažení. Telefon se zeptá, jestli soubor chceš
>    — dej **Stáhnout**.
> 3. Až se stáhne, klepni na něj (nebo na oznámení o stažení).
> 4. Telefon se zeptá, jestli chceš nahradit stávající aplikaci —
>    dej **ano**. Nic nepřijdeš: tvoje lodě i rozepsané věci zůstanou.
>
> **Jestli to telefon zablokuje:** napíše něco jako „Neznámá aplikace je
> blokována" nebo se zeptá, jestli tomuhle zdroji věříš. To je normální,
> protože appka není z obchodu Google Play. Stačí v té hlášce klepnout na
> **Nastavení** a povolení zapnout; telefon tě tam sám navede. Na
> Samsungu to bývá v *Nastavení → Zabezpečení a soukromí → Automatické
> blokování*. Po instalaci se to dá vrátit zpátky.
>
> Jestli to někde zaseknu, zavolej mi a projdeme to spolu.

---

## Co k tomu vědět (pro Filipa, neposílat)

- **První verze tohohle textu slibovala „tohle je naposled, co ji musíš
  instalovat ručně" a to nebyla pravda.** Miloš ji podle ní instaloval
  28. 10. 2026 a ještě týž den se do appky dostala `expo-battery` —
  nativní změna, po které bude instalovat znovu. Slib platil jen pro
  aktualizace, které vezou samotnou appku, a ten rozdíl laik neudělá.
  Opraveno týž den.

- **Aktualizace se stahují při startu appky** a projeví se při dalším
  otevření — ne okamžitě uprostřed používání.
- **Oznámení o aktualizaci a sekce *Verze appky*** přišly 28. 10. 2026
  večer (Filip: *„Jak Milos pozná ze se mu to samo aktualizovalo?"*).
  Dostanou se k němu **samy**, přes síť: otisk zůstal `c4d54801…`, takže
  build `4b579f9b` je přijme bez instalace. Do APK zabalené nejsou —
  v hlavičce proto zůstává ten build, ne nový.
- **Oznámení se pro tutéž aktualizaci ukáže jen jednou.** Appka si pamatuje
  poslední ohlášené ID v souboru; kdo appku zavře během těch osmi sekund,
  se o té aktualizaci nedozví. Je to vědomé: dvakrát ukázané oznámení
  vypadá jako další novinka.
- **Samy se přenesou jen změny v appce**, ne nová oprávnění nebo
  knihovny. Když přijde taková změna, bude potřeba nové APK znovu —
  appka si o něj ale neřekne sama, takže to pozná jen ten, kdo to staví.
- **Miloš přeinstaloval 28. 10. 2026** a podle návodu to zvládl sám
  (potvrdil Filipovi). Dostal ale build `d343c6d2`, kterému chyběla
  `expo-battery` — přišla do appky v 09:37, pět minut po jeho dokončení.
  Proto ho Filip musel požádat ještě jednou, o build `4b579f9b`.
  **Od něj už by měly stačit aktualizace přes síť**, dokud se zase
  nezmění nativní část; to ohlásí CI.

- **Že bude potřeba nová ruční instalace, hlásí CI** (úloha `appka`,
  od 28. 10. 2026). Nikdo si na to nemusí vzpomenout — ale taky to nikomu
  nepřijde do telefonu, je to zpráva v souhrnu běhu.

- **Aktualizace musí někdo publikovat; samo se to nestane.** Do 28. 10. 2026
  leželo v kanálu `preview` **nula** aktualizací: appka je umí přijmout, jen
  jí je nikdo neposílal. Od té doby to dělá úloha `aktualizace-appky` po
  nasazení, ale **jen když se `app/` změnilo** — jinak by se banner
  rozsvítil po každém commitu do mainu a lidé by si ho vypnuli.

- **`EXPO_TOKEN` v secrets repozitáře je** od 29. 10. 2026 10:44, vedle
  `DEPLOY_TOKEN` a `SIXLABORS_LICENSE_KEY`, takže publikace běží. Kdyby
  vypršel nebo zmizel, úloha nespadne — jen napíše varování do souhrnu
  běhu a novinky zůstanou v gitu. Nový se vyrábí na
  <https://expo.dev/settings/access-tokens> a vkládá příkazem
  `gh secret set EXPO_TOKEN -R file-pb/orlickypohar`, který hodnotu
  nevypíše.

- **Každý build s novým otiskem zneplatní aktualizace pro ten starý**, takže
  tohle platí při každém vydání, ne jen u toho jednoho z 29. 10.
  Změřeno 29. 10. 2026 dotazem na `u.expo.dev` s hlavičkami, které posílá
  telefon (`expo-channel-name: preview`, `expo-runtime-version: <otisk>`,
  `expo-platform: android`): otisk `c4d54801` (build 4) → HTTP 200 a
  aktualizace `01a182a6`, otisk `9dfabf3c` (build 5) → HTTP 204, prázdno.
  Telefon, který zůstane na starém APK, tedy dostane jen to, co se
  publikovalo do změny otisku, a **nic dalšího už nepřijde** — a nijak se
  to na něm nepozná, protože pro svůj otisk doopravdy nic nového nemá.
  Tohle je ten důvod, proč se o novém APK musí ozvat Filip. Pro otisk buildu 8
  (`afbd9b0c…`) už v kanálu aktualizace leží, z 30. 10. 02:31 — ověřeno týmž
  dotazem.

- **Otisk se počítá nástrojem z `node_modules`, ne `@latest`.**
  `npx expo-updates fingerprint:generate --platform android` dá
  `9dfabf3c…` ze 128 zdrojů a souhlasí s EAS i s CI krokem *Žádá appka
  ruční instalaci?*. `npx @expo/fingerprint@latest` dal 29. 10. 2026
  `955436b2…` z 59 zdrojů, a v sousední session ještě třetí číslo — jiná
  verze počítá jinak a jinak hluboko. V projektu je `@expo/fingerprint`
  0.20.14, zveřejněná je 0.21.7. Číslo z `@latest` neodpovídá ničemu,
  proti čemu se srovnává, takže ani nedokazuje, že se otisk změnil.

- **`EXPO_PUBLIC_*` se zapékají do bundle, a `eas update` je ze shellu
  nepřevezme** — bere je z EAS environmentu, který je prázdný. Proto se
  bundle staví zvlášť (`expo export`) a publikuje přes `--input-dir`.
  Stalo se to doopravdy: první publikovaná aktualizace 28. 10. 2026 tím
  **vypnula přihlašování** (`prihlasovaniJde` vyšlo `false`) a musela se
  přebít druhou. Hodnoty se v CI čtou z `eas.json`, aby nebyly dvakrát.
- Stránka `/appka` rozdává to APK, které stojí v `APK_URL`
  (`deploy/docker-compose.yml`), a zapisuje se tam pořád ručně. **Tiché to
  už ale není:** krok *Žádá appka ruční instalaci?* porovnává tu adresu
  proti `app/vydane-apk.json` a při rozdílu napíše varování do souhrnu
  běhu. Dokud ta kontrola nebyla, nabízela stránka starý build od 8. 9. do
  28. 10. 2026, a nikdo o tom nevěděl. Ověřeno 29. 10. 2026: produkce
  rozdává `kqe5AoMTEs….apk`, tedy build 5.

- **Zvýrazněný slib „od téhle verze se appka umí aktualizovat sama" z textu
  zmizel schválně.** V téhle podobě zazněl dvakrát a dvakrát nevyšel —
  28. 10. kvůli `expo-battery`, 29. 10. kvůli bumpu `expo` a novým
  `overrides`. Potřetí by to pro Miloše byl slib, který se neplní, takže
  v textu zůstala jen věcná informace bez zvýraznění a bez „od téhle
  verze". Až nastane vydání, po kterém se opravdu nebude instalovat ručně,
  pozná se to tím, že se nativní otisk nezmění — ne tím, že to tak bylo
  myšleno.

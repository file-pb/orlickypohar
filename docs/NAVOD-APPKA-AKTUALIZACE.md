# Příručka: jak si Miloš přeinstaluje appku

**Platí pro APK vydané 29. 10. 2026** (build `1e869aa0`, versionCode 5,
otisk `9dfabf3c…`, zapsané v `app/vydane-apk.json`). Až vyjde další, projdi
text znovu — a zkontroluj hlavně to, co appce slibuje.

Předchozí vydání (`d343c6d2`, otisk `3995edc5…`) umělo aktualizace taky,
jenže mu chyběla `expo-battery`, která do appky přišla pár minut po něm.
Miloš si ho podle tohohle návodu stáhl — a tohle je ta jedna verze navíc,
o kterou ho pak musel Filip požádat.

A build po něm (`4b579f9b`, otisk `c4d54801…`) vydržel jediný den: 29. 10.
šlo `expo` z `~57.0.30` na `~57.0.31` a přibyly `overrides` v
`app/package.json` (`expo-modules-core` → `react-native-worklets`), čímž se
otisk posunul na `9dfabf3c…`. **Miloš tak instaluje potřetí během dvou dnů**
— přesně to, o čem text níž slibuje, že se dít nebude. Slib platí pro
novinky v appce, ne pro bumpy nativních závislostí, a ten rozdíl laik
neudělá; než se pošle znovu, stojí za to si přečíst, co se mu slibuje.

Text níž je **pro rozhodčího, ne pro vývojáře** — píše se tak, aby šel
poslat do WhatsAppu beze změny. Vzniknul proto, že od 28. 10. 2026 se
appka umí aktualizovat sama, ale **jednou se musí přeinstalovat ručně**:
stará verze v telefonu tu schopnost v sobě nemá.

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
> **Od téhle verze se appka umí aktualizovat sama** — většinu novinek už
> stahovat nebudeš, jen ji otevřeš a bude nová. Občas se stane, že přibude
> něco, co sahá hlouběji do telefonu; pak ti napíšu, že je potřeba stáhnout
> novou verzi jako teď. Ozvu se sám, ty to hlídat nemusíš.
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

- **Úloha potřebuje `EXPO_TOKEN` v secrets repozitáře** a ten tam
  k 28. 10. 2026 **není** (jsou jen `DEPLOY_TOKEN` a `SIXLABORS_LICENSE_KEY`).
  Dokud nebude, úloha jen napíše varování do souhrnu a novinky zůstanou
  v gitu. Token se vyrábí na <https://expo.dev/settings/access-tokens>.

- **Build se změněným otiskem zneplatní aktualizace pro ten starý.**
  Změřeno 29. 10. 2026 dotazem na `u.expo.dev` s hlavičkami, které posílá
  telefon (`expo-channel-name: preview`, `expo-runtime-version: <otisk>`,
  `expo-platform: android`): otisk `c4d54801` (build 4) → HTTP 200 a
  aktualizace `01a182a6`, otisk `9dfabf3c` (build 5) → HTTP 204, prázdno.
  Telefon, který zůstane na starém APK, tedy dostane jen to, co se
  publikovalo do změny otisku, a **nic dalšího už nepřijde** — a nijak se
  to na něm nepozná, protože pro svůj otisk doopravdy nic nového nemá.
  Tohle je ten důvod, proč se o novém APK musí ozvat Filip.

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
- Stránka `/appka` nabízí vždycky poslední postavené APK; adresa se do ní
  zapisuje ručně (`deploy/docker-compose.yml`, `APK_URL`), takže když se
  na to zapomene, nabízí tiše starý build. Stalo se to mezi 8. 9. a
  28. 10. 2026.

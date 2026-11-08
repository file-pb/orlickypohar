# Příručka: jak si Miloš přeinstaluje appku

**Platí pro APK vydané 8. 11. 2026** (build `17d1b684`, versionCode 10,
otisk `0759d5bd…`, zapsané v `app/vydane-apk.json`; produkce na `/appka`
ho rozdává, ověřeno 8. 11.). Až vyjde další, projdi text znovu — a zkontroluj
hlavně to, co appce slibuje.

**Pět instalací**, a za každou stojí posunutý nativní otisk — ne novinka
v appce:

| Vydáno | Build | Otisk | Co ho posunulo |
|---|---|---|---|
| 28. 10. ráno | `d343c6d2` | `3995edc5…` | — |
| 28. 10. odpoledne | `4b579f9b` | `c4d54801…` | `expo-battery`, přišla pár minut po předchozím buildu |
| 29. 10. | `1e869aa0` | `9dfabf3c…` | `expo` `~57.0.30` → `~57.0.31` a nové `overrides` (`expo-modules-core` → `react-native-worklets`) |
| 30. 10. | `cd907b77` | `afbd9b0c…` | nativní dávka: hlas, klakson a modul *Nerušit* (`app/modules/nerusit/`) |
| 8. 11. | `17d1b684` | `0759d5bd…` | kolečko pro výběr času (`@react-native-community/datetimepicker`) a nová ikona appky |

Dávka ve čtvrtém řádku se schválně přidávala **najednou** právě proto, aby
instalací nebylo pět (`APPKA-PORADI-PRACI.md`). Slib „většinu novinek už
stahovat nebudeš" platí pro novinky v appce, ne pro nativní závislosti,
a ten rozdíl laik neudělá — **než se pošle znovu, přečti si, co se mu
slibuje.** Miloš si první z těch buildů podle tohohle návodu stáhl sám.

**Devítka se nikdy nevydala.** Číslo buildu zvedá EAS při každém běhu
(`autoIncrement`), takže díra v řadě neznamená ztracené vydání.

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

> Ahoj Miloši, mám pro tebe novou verzi appky. Hlavní věc v ní je
> **všeobecné odvolání** — a je v něm změna, o které potřebuješ vědět
> dřív, než ji použiješ u vody. Popíšu ji níž.
>
> Tahle verze veze i věci, které se musí do telefonu doinstalovat, takže
> po síti by k tobě nedošly. Jinak se appka aktualizuje sama — většinu
> novinek jen otevřeš a bude nová. Co se takhle přenést nedá, je to, co
> sahá hlouběji do telefonu; pak ti napíšu jako teď. Ozvu se sám, ty to
> hlídat nemusíš.
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
> 5. **Appku pak otevři, zavři a otevři znovu.** Napoprvé si stáhne to
>    nejčerstvější, co ještě nebylo v souboru, a podruhé to teprve uvidíš.
>
> **Jestli to telefon zablokuje:** napíše něco jako „Neznámá aplikace je
> blokována" nebo se zeptá, jestli tomuhle zdroji věříš. To je normální,
> protože appka není z obchodu Google Play. Stačí v té hlášce klepnout na
> **Nastavení** a povolení zapnout; telefon tě tam sám navede. Na
> Samsungu to bývá v *Nastavení → Zabezpečení a soukromí → Automatické
> blokování*. Po instalaci se to dá vrátit zpátky.
>
> ---
>
> **Co se změnilo u všeobecného odvolání**
>
> Předtím appka po odvolání rovnou spočítala nový start: minuta a pak
> celá procedura. To bylo špatně. Pravidlo 29.2 říká, že vyzývací znamení
> nového startu padne minutu poté, co je **první opakovač svěšen** — a jak
> dlouho visí, neurčuje vůbec. To je na tobě, podle toho, kdy se pole
> vrátí za čáru. Appka ti tedy ukazovala čas, který neplatil.
>
> Teď to jde na dva kroky:
>
> 1. **Všeobecné odvolání** — vyvěsí opakovač. Žádný čas z toho zatím
>    nevyjde. Appka ukáže *Visí první opakovač* a počítá, jak dlouho už
>    je nahoře.
> 2. **Opakovač dolů** — zmáčkneš ve chvíli, kdy ho doopravdy spustíš.
>    Od té vteřiny běží ta minuta a po ní celá procedura. Teprve tady
>    appka řekne, kdy je nový start.
>
> Dokud opakovač visí, nejde zmáčknout nic jiného — schválně, aby se ta
> minuta nedala obejít.
>
> **Vyzkoušej si to nanečisto**, ať to u vody nevidíš poprvé. Nic se
> nikam neodešle:
>
> 1. V appce vpravo nahoře **tři tečky → Ukázkový režim**
> 2. Nahoře naskočí modrý pruh *UKÁZKA — nic se neodesílá* a pod ním
>    panel regaty Izolepa.
> 3. Dej **Spustit startovní proceduru**. Občas vyskočí nabídka
>    *Přeskočit čekání?* — dej **Ano, přeskoč**, ať nečekáš pět minut.
> 4. Jakmile start padne, rozsvítí se dlaždice **Všeobecné odvolání**.
>    Zmáčkni ji a potvrď.
> 5. Objeví se okno *Visí první opakovač*. Můžeš ho zavřít (*Zatím visí*)
>    a panel ti stav podrží — zkus si obojí.
> 6. Dej **Opakovač dolů** a koukni, na kdy ti vyšel nový start.
>
> Řekni mi prosím, jestli ti to takhle sedí s tím, co děláš na vodě —
> tohle je přesně věc, kde se dá splést zadání a já to z kódu nepoznám.
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

- **Build 10 sám o sobě odvolání na dva kroky nemá** (8. 11. 2026). APK
  se stavělo ráno, kdežto oprava podle ZPJ 29.2 šla do mainu večer —
  a protože je to čistě JavaScript, otisk neposunula a jde po síti. Proto
  je v textu pátý krok *otevři, zavři, otevři znovu*: aktualizace se
  stahuje při startu a projeví se až při dalším otevření, takže kdo appku
  po instalaci jen jednou otevře, uvidí pořád tu ranní verzi — a z ničeho
  to nepozná.

- **Ruční instalaci si tentokrát vynutil otisk, ne velikost změny.**
  Ověřeno 8. 11. 2026 dotazem na `u.expo.dev` (hlavičky `expo-channel-name:
  preview`, `expo-runtime-version: <otisk>`, `expo-platform: android`):
  pro otisk buildu 8 (`afbd9b0c…`), na kterém Miloš jel, je poslední
  aktualizace ze **7. 11. 20:17** — dnešní práce se k němu nedostane
  nikdy. Pro otisk buildu 10 (`0759d5bd…`) leží aktualizace z **8. 11.
  18:16**, kterou po nasazení vydala úloha `aktualizace-appky`. Bez nového
  APK tedy Miloš odvolání neuvidí, ať appku otevírá, jak chce.

- **Ověření v ukázkovém režimu je v textu schválně.** Odvolání se dá
  u vody zkusit jedině tak, že se odvolá doopravdy — a změna na dva kroky
  mění, co rozhodčí fyzicky dělá. Ukázka běží bez serveru a nic
  neodesílá (`app/src/lib/ukazka.ts`), takže je to jediné místo, kde si
  to jde projít nanečisto. Postup v textu je ten, kterým se ta změna
  8. 11. 2026 ověřovala v simulátoru, krok za krokem.

- **Zvýrazněný slib „od téhle verze se appka umí aktualizovat sama" z textu
  zmizel schválně.** V téhle podobě zazněl dvakrát a dvakrát nevyšel —
  28. 10. kvůli `expo-battery`, 29. 10. kvůli bumpu `expo` a novým
  `overrides`. Potřetí by to pro Miloše byl slib, který se neplní, takže
  v textu zůstala jen věcná informace bez zvýraznění a bez „od téhle
  verze". Až nastane vydání, po kterém se opravdu nebude instalovat ručně,
  pozná se to tím, že se nativní otisk nezmění — ne tím, že to tak bylo
  myšleno.

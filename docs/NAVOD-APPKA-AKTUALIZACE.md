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

**Krátký schválně** (Filip, 8. 11. 2026: *„Miloše zajímá jednoduchost,
jak nejjednodušeji nainstaluje apku… prostě člověk, kterému potřebuju
velmi jednoduše a co nejkratší cestou napsat, jak si tu apku má
nainstalovat."*). Předchozí podoba vysvětlovala, jak se appka
aktualizuje sama a co se změnilo v pravidlech — informace správné, ale
ne pro někoho, kdo chce mít appku v telefonu a jít od toho pryč. Co se
nevejde do instalace, patří do oddílu níž, a posílá se zvlášť, nebo
vůbec.

> Ahoj Miloši, mám pro tebe novou verzi appky.
>
> 1. V telefonu otevři **orlickypohar.klihovka.cz/appka**
> 2. Klepni na tlačítko ke stažení a dej **Stáhnout**.
> 3. Až se stáhne, klepni na něj a potvrď, že má nahradit tu starou.
>    Nic nepřijdeš.
> 4. Pak ji **otevři, zavři a otevři znovu** — podruhé už je úplně
>    nová.
>
> Kdyby telefon hlásil, že blokuje neznámou aplikaci: klepni v té hlášce
> na **Nastavení** a povolení zapni, telefon tě navede. Na Samsungu to
> bývá v *Nastavení → Zabezpečení a soukromí → Automatické blokování*.
> Po instalaci se to dá vrátit zpátky.
>
> Kdyby to někde drhlo, zavolej mi.

---

## Co poslat zvlášť, až bude čas (ne spolu s instalací)

Tohle **není součást instalace** a nemá se posílat v jedné zprávě s ní.
Je to ale změna, která mění, co rozhodčí u vody fyzicky dělá, takže se
o ní dozvědět musí — jen ne ve chvíli, kdy chce mít appku v telefonu
a jít od toho pryč.

> Miloši, jedna věc k **všeobecnému odvolání** — teď je na dva kroky.
>
> Appka dřív po odvolání rovnou řekla nový čas startu. To bylo špatně:
> pravidlo počítá tu minutu od chvíle, kdy **svěsíš první opakovač**, a jak
> dlouho visí, je na tobě. Takže:
>
> 1. **Všeobecné odvolání** — vyvěsí opakovač, žádný čas zatím není.
> 2. **Opakovač dolů** — zmáčkneš, až ho doopravdy spustíš. Od té vteřiny
>    běží minuta a po ní procedura, a teprve tady ti appka řekne nový start.
>
> Zkusit se to dá nanečisto, nic se neodešle: **tři tečky → Ukázkový
> režim**, dej *Spustit startovní proceduru* (nabídku *Přeskočit čekání?*
> odklikni, ať nečekáš), a po startu zmáčkni *Všeobecné odvolání*.
>
> Řekni mi, jestli ti to sedí s tím, co děláš na vodě.

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

- **Ověření v ukázkovém režimu je odsunuté do druhé zprávy, ne
  vyhozené.** Odvolání se dá u vody zkusit jedině tak, že se odvolá
  doopravdy, a změna na dva kroky mění, co rozhodčí fyzicky dělá — vědět
  o ní tedy musí. Ukázka běží bez serveru a nic neodesílá
  (`app/src/lib/ukazka.ts`), takže je to jediné místo, kde si to jde
  projít nanečisto; postup je ten, kterým se ta změna 8. 11. 2026
  ověřovala v simulátoru. Do instalační zprávy to ale nepatří: kdo řeší,
  jak dostat appku do telefonu, nečte výklad pravidel, a dlouhá zpráva se
  přestane číst celá — i ty čtyři kroky, kvůli kterým se psala.

- **Zvýrazněný slib „od téhle verze se appka umí aktualizovat sama" z textu
  zmizel schválně.** V téhle podobě zazněl dvakrát a dvakrát nevyšel —
  28. 10. kvůli `expo-battery`, 29. 10. kvůli bumpu `expo` a novým
  `overrides`. Potřetí by to pro Miloše byl slib, který se neplní, takže
  v textu zůstala jen věcná informace bez zvýraznění a bez „od téhle
  verze". Až nastane vydání, po kterém se opravdu nebude instalovat ručně,
  pozná se to tím, že se nativní otisk nezmění — ne tím, že to tak bylo
  myšleno.

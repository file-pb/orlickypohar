# Dotazníky v Play Console

Odpovědi na *Dokončete nastavení aplikace*. Každá se dá ověřit v kódu —
odkaz je u ní, protože špatně vyplněná deklarace je důvod ke stažení
aplikace, ne k poznámce. Ověřeno 22. 11. 2026 proti mainu.

## Krátké

| Úkol | Odpověď |
|---|---|
| Zásady ochrany soukromí | `https://orlickypohar.klihovka.cz/osobni-udaje` |
| Reklamy | **Ne**, aplikace reklamu neobsahuje |
| Cílové publikum | **18 a více** — nižší věk zapne pravidla pro rodiny a s nimi přísnější požadavky na data |
| Státní aplikace | Ne |
| Finanční funkce | Žádná z možností |
| Zdraví | Ne |
| Kategorie | Sport |
| Kontaktní e-mail | tvoje volba, bude veřejný |
| Web | `https://orlickypohar.klihovka.cz` |

## Přihlašovací údaje

**Část aplikace je za přihlášením** — kontrolor Googlu by se jinak
k podstatné funkci nedostal a appku odmítne jako nefunkční.

Co je veřejné bez čehokoliv: ročníky, kalendář, výsledky, průběžné pořadí,
lodě. Co je za přihlášením: správa závodu a cíl (účet s oprávněním),
a záznam trasy (klíč k lodi, `src/lib/klic.ts`).

**V appce je ale ukázkový režim** (`src/lib/ukazka.ts`, v nabídce *Ukázka
pro závodníka*), který ukáže pohled posádky na vodě bez účtu i bez klíče.
V konzoli vyber **„Některé nebo všechny funkce jsou omezené"**, uživatelské
jméno a heslo nech prázdné a do pokynů dej tohle. **Anglicky schválně:**
konzole je česky, ale appku kontroluje kdokoliv ve světě.

Název pokynů: `Crew view and track recording`

Jméno i heslo nech prázdné. Formulář chce **aspoň jeden typ pokynu** —
buď přihlašovací údaje, nebo vysvětlení — a klíč k lodi se do kolonky pro
heslo napsat nedá. Pole s vysvětlením má **limit 500 znaků**, text je na
433:

```
Results, calendar and standings are public — no sign-in needed.

Crew screen without an account: open the menu (three dots, top right) and choose "Ukázka pro závodníka" (racer demo). It shows what the crew sees during a race, with sample data.

Track recording needs a boat key issued by the boat's captain, not a username and password. We can send a test key on request.

Race management needs an account with organiser permissions.
```

**Tenhle úkol je první v řadě** — dokud není hotový, konzole nepustí ani
dotazník na cílové publikum a obsah.

## Zabezpečení údajů (Data safety)

Aplikace sbírá tohle a nic víc. Posílá se jen na náš server
(`orlickypohar-api.klihovka.cz`), **nikomu třetímu**, a všechno jde přes
HTTPS — tedy *šifrováno při přenosu: ano*.

| Typ dat | Sbírá se | Kdy a kde v kódu | Účel | Povinné? |
|---|---|---|---|---|
| **Poloha — přesná** | ano | jen při spuštěném záznamu; `tracker/nahravani.ts` posílá `sirka`, `delka`, `presnostM` | funkce aplikace | nepovinné |
| **Osobní údaje — jméno, e-mail** | ano | při přihlášení přes poskytovatele identity, `lib/identita.ts` | správa účtu, funkce aplikace | nepovinné |
| **Identifikátory zařízení** | ano | token pro upozornění, `lib/upozorneni.ts` posílá `{token, platforma, odbery}` na `/zarizeni` | funkce aplikace (upozornění na start) | nepovinné |
| **Diagnostika** | ano | stav baterie u každého bodu trasy a v hlášení, `ozviSe({baterieProcent})` | funkce aplikace (pořadatel vidí, že telefon na lodi žije) | nepovinné |

**Nic z toho se nesdílí s nikým dalším** a appka nemá žádnou analytiku ani
sledovací skripty. Kód to potvrzuje: jediná čtyři místa, kam appka zapisuje
ven, jsou `/klice/uplatnit`, `/klice/sledovani`, `/klice/hlaseni`
a `/zarizeni`, plus dávka trasy.

**Mazání dat: odpověz „ano, uživatel může požádat o smazání"** a jako cestu
uveď kontakt ze zásad. Pozor ale na dvě věci, které z toho plynou a nejsou
dořešené:

1. **Trasy se nemažou samy a tlačítko na to v appce není.** Zásady to
   přiznávají; Play to snese, dokud existuje cesta požádat.
2. **Appka umožňuje přihlášení, takže Google chce i cestu ke smazání
   účtu** — u takových aplikací se vyžaduje adresa, kde o to jde požádat
   i bez instalace. Zásady dnes říkají „zrušit se dá u poskytovatele
   identity" a nabízejí e-mail. Jestli to Play uzná, se pozná až
   z formuláře; kdyby chtěl samostatnou adresu, je to další oddíl na
   `/osobni-udaje`, ne práce v appce.

## Hodnocení obsahu

Kategorie se vybírá ze tří možností a správná je **Všechny ostatní typy
aplikací** — není to hra a není to appka na komunikaci, chat v ní není.
E-mail do formuláře dej tentýž veřejný kontakt; Google ho sdílí
s hodnotícími institucemi IARC. Všechny otázky
na násilí, sex, drogy, hazard a nevhodný jazyk jsou **ne**. Appka
neobsahuje uživatelsky tvořený obsah ani chat — novinky a výsledky píše
pořadatel, ne uživatelé.

Jedna otázka si zaslouží pozornost: **sdílí aplikace polohu uživatele
s jinými uživateli?** Odpověď je **ano** — trasa lodi se za určitých
podmínek ukáže divákům a ostatním posádkám. Podrobnosti jsou v zásadách
v oddílu *Kdo trasu vidí*; rozhoduje o tom rozhodčí dvěma přepínači
(`Features/Polohy/PolohyEndpoints.cs`).

## Oprávnění v manifestu

Ověřeno 22. 11. 2026 přímo v hotovém AABu (`unzip -p … base/manifest/AndroidManifest.xml`),
ne z konfigurace — to je rozdíl, protože do manifestu přispívají i knihovny.

**`AD_ID` tam není**, takže deklarace *Aplikace nepoužívá inzertní ID* je
ověřeně správná a Play ji nemá čím vyvrátit.

**`SYSTEM_ALERT_WINDOW` tam ale byl** — tedy *zobrazovat přes jiné aplikace*.
Appka ho nikde nechce; jediný zdroj v závislostech je **ladicí** manifest
React Native (`react-native/ReactAndroid/src/debug/AndroidManifest.xml`),
kde slouží překryvu vývojářského menu. Do ostré verze se svezl sloučením
manifestů.

Proč to není kosmetika: je to jedno z oprávnění, na která se kontrola dívá,
protože ho zneužívají podvodné appky k překrývání cizích obrazovek. Mít ho
a nepotřebovat je horší než ho nemít, a vysvětlovat se nedá ničím lepším než
„svezlo se nám to".

Řeší to `blockedPermissions` v `app.json`: plugin zapíše do manifestu
`<uses-permission … tools:node="remove">` a slučovač oprávnění ho vyhodí,
i když ho knihovna deklaruje
(`@expo/config-plugins/build/android/Permissions.js`, `ensureBlockedPermission`).
Zkontrolovat to jde bez buildu:

```bash
npx expo config --type introspect | grep -A1 SYSTEM_ALERT_WINDOW
```

### Služby na popředí

V manifestu jsou **dvě**, a Play se na typ služby na popředí ptá u každé zvlášť:

| Služba | Odkud | Zdůvodnění do konzole |
|---|---|---|
| `FOREGROUND_SERVICE_LOCATION` | `expo-location`, `isAndroidForegroundServiceEnabled` | záznam trasy lodi běží celý závod se zhasnutým displejem |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | `expo-audio`, `enableBackgroundPlayback: true` v `app.json` | odpočet startu troubí i se zamčeným telefonem |

Druhá je tedy rozhodnutí, ne omyl. Kdyby odpočet nemusel být slyšet se
zhasnutým displejem, vypne se to v `app.json` a jedna deklarace odpadne.

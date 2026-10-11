# Orlický pohár — mobilní appka

Čtecí appka k veřejnému API: ročníky, kalendář zastávek, výsledky závodu
a průběžné pořadí seriálu. **Nepotřebuje přihlášení** — proto vzniká dřív
než identita.

```bash
npm install
npm run telefon           # QR pro Expo Go, i s přihlášením a správnou adresou
npx expo start --web      # totéž v prohlížeči, k rychlé kontrole
```

**Proč vlastní skript a ne `npx expo start`.** Dvě věci se pokaždé zvrtnou:

1. **Expo Go na iOSu vyžaduje od SDK 57 přihlášení na obou stranách** —
   v terminálu i v appce, ke stejnému účtu. Anonymně projekt neotevře ani
   ručně zadanou adresou. Skript bere token z klíčenky:

   ```bash
   security add-generic-password -a "$USER" -s expo-token -U -w "$(pbpaste)"
   ```

   Token se vyrábí na <https://expo.dev/settings/access-tokens>; do repozitáře
   ani do `.env` nepatří.

2. **Mac má víc síťových rozhraní** a Expo si umí vybrat to, na kterém telefon
   není — QR pak vede na adresu, kam se telefon nedovolá. Skript vezme adresu
   z Wi-Fi.

Adresa API se bere z `EXPO_PUBLIC_API_URL`; výchozí je produkce
(`https://orlickypohar-api.klihovka.cz`). Proti falešnému API z repozitáře:

```bash
tools/fake-api.py &                                    # ze složky repozitáře
EXPO_PUBLIC_API_URL=http://localhost:8080 npx expo start
```

## Struktura

```
src/app/          obrazovky, cesty podle souborů (expo-router)
src/components/   sdílené kousky UI
src/lib/          klient API a formátování
src/hooks/        načítání dat a barvy
```

Typy v `src/lib/schema.d.ts` **negeneruj ručně** — vyrábí je
`packages/api-client/generuj.sh` z OpenAPI dokumentu API, stejný soubor
dostane i web. `src/lib/api.ts` je jen pojmenuje a přidá načítání.

Barvy jsou stejné jako na webu (`web/app/globals.css`) — je to jeden
produkt, jen dvěma dveřmi. Datum se formátuje ručně, protože Intl na
telefonu nemusí být úplné; podrobněji v `src/lib/datum.ts`.

## Vydání pro Android

```bash
npm run apk        # postaví APK v cloudu přes EAS a vypíše odkaz
```

APK se staví profilem `preview` — soubor k rozdávání, ne balík do obchodu.
Build běží na serverech Expa pod účtem `@file75`; token si skript bere
z klíčenky jako `npm run telefon`.

**Na bezplatném tarifu se čeká ve frontě.** Samotný build trvá pár minut,
fronta večer klidně půl hodiny — čas nejde na kompilaci, ale na volný stroj.

**Po doběhnutí přepiš adresu v `deploy/docker-compose.yml`** u služby `web`
(`APK_URL`), jinak stránka `/appka` nabízí předchozí build. Nic přitom
neselže, takže si toho nikdo nevšimne — skript to proto připomíná sám.

Dvě věci, které se zapisují natrvalo a mění se draho:

- `android.package` je `cz.klihovka.orlickypohar`. Jiný balíček je pro
  systém jiná aplikace, takže po vydání se nemění.
- **Podepisovací klíč drží EAS.** Rozhoduje o tom, jestli půjde vydat
  aktualizaci téže aplikace — když se ztratí, další verze není update, ale
  nová appka a lidé musí odinstalovat starou. Až bude appka mít uživatele,
  stáhni ho (`eas credentials`) a zálohuj vedle ostatních tajemství.

## Co tady zatím není

- **Vydání pro iPhone.** Účet u Applu stojí 99 $ ročně a platí se, až bude
  o co stát. Do té doby Expo Go na vlastním telefonu a APK pro ostatní.
- **Push upozornění** (fáze 7) — potřebují development build, na iOS
  i placený účet u Applu. V Expo Go se vyzkoušet nedají.
- ~~**Ikona a splash** jsou zatím ze šablony.~~ **hotovo 8. 9. 2026** —
  ikonu, splash, favicon i tři vrstvy androidí ikony kreslí kódem
  `scripts/ikona.py` (Pillow; `ikona.py:564` a `ikona.py:568`) a `app.json`
  je bere z `assets/images/` (`app.json:7`, `app.json:11`, `app.json:22`,
  `app.json:30`). Kreslí se kódem schválně: v diffu je vidět, co se na
  značce změnilo.

## Přihlášení

Appka se přihlašuje tímtéž tokem jako web — Authorization Code s PKCE,
veřejný klient bez tajemství. Bere dvě proměnné:

```
EXPO_PUBLIC_IDENTITA_AUTHORITY=https://ucty.klihovka.cz
EXPO_PUBLIC_IDENTITA_CLIENT_ID=<client id z Zitadelu>
```

Bez nich se přihlašování nikde nenabízí a obrazovka *Účet* to řekne —
stejné pravidlo jako `prihlasovaniJde` na webu.

**U poskytovatele se zakládá aplikace typu Native** s návratovou adresou
`orlickypohar://prihlaseni` a *Auth Token Type* přepnutým na `JWT`.
Výchozí `Bearer` je neprůhledný řetězec, který naše API odmítne a v
odpovědi pošle `error="invalid_token"` **bez popisu** — právě ta chybějící
věta je ta stopa (runbook `platform/runbooks/ZITADEL.md`).

**V Expo Go přihlášení nefunguje a je to tak správně.**
`AuthSession.makeRedirectUri` vrací vlastní schéma jen ve standalone nebo
bare buildu; jinde spadne na `exp://<adresa-notebooku>:8081/--/prihlaseni`,
a ta se mění s Wi-Fi. Zkouší se proto v APK (`npm run apk`). Kdo to přesto
chce v Expo Go, najde tu adresu vypsanou na obrazovce *Účet* a musí si ji
u poskytovatele přidat.

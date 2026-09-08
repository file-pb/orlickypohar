# Orlický pohár — mobilní appka

Čtecí appka k veřejnému API: ročníky, kalendář zastávek, výsledky závodu
a průběžné pořadí seriálu. **Nepotřebuje přihlášení** — proto vzniká dřív
než identita.

```bash
npm install
npx expo start            # QR kód, appka se otevře v Expo Go
npx expo start --web      # totéž v prohlížeči, k rychlé kontrole
```

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

Barvy jsou stejné jako na webu (`web/app/globals.css`) — je to jeden
produkt, jen dvěma dveřmi. Datum se formátuje ručně, protože Intl na
telefonu nemusí být úplné; podrobněji v `src/lib/datum.ts`.

## Co tady zatím není

- **Klient API je opsaný z webu.** Plán chce generovaný z OpenAPI a sdílený;
  napřed ale musí dokument nést tvary odpovědí, viz `src/lib/api.ts`.
- **Push upozornění** (fáze 7) — potřebují development build, na iOS
  i placený účet u Applu. V Expo Go se vyzkoušet nedají.
- **Ikona a splash** jsou zatím ze šablony.

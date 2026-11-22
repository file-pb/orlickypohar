#!/usr/bin/env bash
# Postaví AAB do Google Play na serverech Expa.
#
# <b>Proč vedle `apk.sh`.</b> Do obchodu se nahrává App Bundle, ne APK:
# Google si z něj pro každý telefon vyrobí vlastní balík. APK zůstává pro
# rozdávání z webu (`/appka`), protože AAB si nikdo do telefonu
# nenainstaluje. Jsou to tedy dva výstupy pro dva různé účely, ne jeden
# lepší a jeden horší — proto dva profily v `eas.json` a dva skripty.
#
# <b>Podepisuje Google.</b> Při zakládání aplikace se odklepl Play App
# Signing: tenhle build podepíše bundle nahrávacím klíčem od EAS a Google
# z něj vyrobí a podepíše výsledné APK svým. Klíč si EAS drží sám, proto
# tu po něm nic nechceme.
#
# Token se bere z `EXPO_TOKEN`, a když není, z macOS klíčenky — stejně
# jako v `apk.sh`, `telefon.sh` a `stav-buildu.sh`. Je to čtvrtá kopie
# těch pár řádků a zaslouží si vytáhnout stranou; teď uprostřed vydávání
# do obchodu na to není chvíle.
#
# Na bezplatném tarifu se čeká ve frontě, takže `--no-wait`: skript vrátí
# odkaz a stav se pak čte přes `scripts/stav-buildu.sh <id> --cekej`.
set -euo pipefail

token="${EXPO_TOKEN:-}"
if [[ -z "$token" ]] && command -v security >/dev/null 2>&1; then
  token=$(security find-generic-password -a "$USER" -s expo-token -w 2>/dev/null || true)
fi
if [[ -z "$token" ]]; then
  echo "Chybí token. Buď ho dej do EXPO_TOKEN, nebo na Macu do klíčenky:" >&2
  echo "  security add-generic-password -a \"\$USER\" -s expo-token -U -w \"\$(pbpaste)\"" >&2
  echo "Vyrobí se na https://expo.dev/settings/access-tokens" >&2
  exit 1
fi

EXPO_TOKEN="$token" npx -y eas-cli@latest build \
  --platform android --profile production --non-interactive --no-wait "$@"

cat <<'POTOM'

Až build doběhne (`scripts/stav-buildu.sh <id> --cekej`), stáhni AAB
a nahraj ho v Play Console do **interního testování**. Teprve po nahrání
se v konzoli objeví deklarace polohy na pozadí s tím videem — Play ji
váže na manifest, ne na formulář.

APK na webu tím nezastará: `/appka` rozdává build z profilu `preview`
a mění se vlastní cestou (`scripts/apk.sh` a `APK_URL` v compose).
POTOM

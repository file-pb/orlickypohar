#!/usr/bin/env bash
# Postaví APK k rozdávání na serverech Expa.
#
# Token se bere z `EXPO_TOKEN`, a když není, z macOS klíčenky — v repozitáři
# ani v `.env` nemá co dělat:
#
#     security add-generic-password -a "$USER" -s expo-token -U -w "$(pbpaste)"
#
# To pořadí je kvůli vývojovému stroji na Linuxu, kde `security` neexistuje.
# Čtení z klíčenky bylo dřív jediná cesta, takže skript šel pustit jen z Macu.
#
# Na bezplatném tarifu se čeká ve frontě; samotný build trvá pár minut,
# čekání na volný stroj klidně půl hodiny. `--no-wait` proto pustí build
# a vrátí odkaz, na kterém se stav sleduje.
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
  --platform android --profile preview --non-interactive --no-wait "$@"

cat <<'POTOM'

Až build doběhne, vezmi adresu APK z výpisu výše a přepiš ji v
deploy/docker-compose.yml u služby `web`:

    APK_URL: "https://expo.dev/artifacts/eas/....apk"

Bez toho ukazuje stránka /appka pořád ten předchozí build — a nikdo si
toho nevšimne, protože stahovat půjde dál.
POTOM

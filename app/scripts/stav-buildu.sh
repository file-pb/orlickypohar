#!/usr/bin/env bash
# Co je s buildem na Expu — stav a adresa APK.
#
# `apk.sh` pouští build s `--no-wait`, takže vrátí odkaz a skončí. Tohle je
# druhá polovina: dojde se jím k adrese APK, která se pak píše do
# `deploy/docker-compose.yml` (`APK_URL` u služby `web`).
#
# Token se bere stejně jako v `apk.sh` a `telefon.sh` — z `EXPO_TOKEN`, jinak
# z macOS klíčenky. **Nikam se nevypisuje**; proto je to skript a ne příkaz
# do terminálu, odkud by hodnota zůstala v historii:
#
#     security add-generic-password -a "$USER" -s expo-token -U -w "$(pbpaste)"
#
# Použití:
#
#     scripts/stav-buildu.sh                 # poslední androidí build
#     scripts/stav-buildu.sh <id-buildu>     # konkrétní
#     scripts/stav-buildu.sh <id> --cekej    # čeká, dokud nedoběhne
set -uo pipefail
cd "$(dirname "$0")/.."

ID=""
CEKEJ=0
for a in "$@"; do
  case "$a" in
    --cekej) CEKEJ=1 ;;
    *) ID="$a" ;;
  esac
done

token="${EXPO_TOKEN:-}"
if [[ -z "$token" ]] && command -v security >/dev/null 2>&1; then
  token=$(security find-generic-password -a "$USER" -s expo-token -w 2>/dev/null || true)
fi
if [[ -z "$token" ]]; then
  echo "Chybí token. Buď ho dej do EXPO_TOKEN, nebo na Macu do klíčenky:" >&2
  echo "  security add-generic-password -a \"\$USER\" -s expo-token -U -w \"\$(pbpaste)\"" >&2
  exit 1
fi

# Jedno čtení z Expa. Vypíše `STAV=…`, a u dokončeného i adresu APK.
precti() {
  local json
  if [[ -n "$ID" ]]; then
    json=$(EXPO_TOKEN="$token" npx -y eas-cli@latest build:view "$ID" --json 2>/dev/null)
  else
    json=$(EXPO_TOKEN="$token" npx -y eas-cli@latest build:list \
      --platform android --limit 1 --json --non-interactive 2>/dev/null)
  fi
  printf '%s' "$json" | python3 -c '
import json, sys
t = sys.stdin.read().strip()
if not t:
    print("STAV=NEDOSTUPNY"); raise SystemExit
d = json.loads(t)
# `build:list` vrací pole, `build:view` jeden záznam.
if isinstance(d, list):
    if not d:
        print("STAV=ZADNY-BUILD"); raise SystemExit
    d = d[0]
a = d.get("artifacts") or {}
print("STAV=" + str(d.get("status")))
print("ID=" + str(d.get("id")))
print("VERZE=" + str(d.get("appVersion")) + " (kód " + str(d.get("appBuildVersion")) + ")")
print("PROFIL=" + str(d.get("buildProfile")))
print("ZDROJ=" + str((d.get("gitCommitHash") or "")[:7]))
print("APK=" + str(a.get("buildUrl") or a.get("applicationArchiveUrl") or "-"))
chyba = d.get("error") or {}
if chyba:
    print("CHYBA=" + str(chyba.get("message")))
'
}

# Hodina je strop, ne očekávání: na bezplatném tarifu bývá čekání ve frontě
# delší než samotné stavění.
for i in $(seq 1 60); do
  vystup=$(precti)
  stav=$(printf '%s\n' "$vystup" | sed -n 's/^STAV=//p')
  case "$stav" in
    FINISHED|ERRORED|CANCELED|ZADNY-BUILD)
      printf '%s\n' "$vystup"
      [[ "$stav" == FINISHED ]] && exit 0 || exit 1 ;;
  esac
  if [[ "$CEKEJ" -eq 0 ]]; then
    printf '%s\n' "$vystup"
    exit 0
  fi
  echo "… ${i}. kontrola: ${stav:-neznámý stav}" >&2
  sleep 60
done

echo "STAV=PRILIS-DLOUHO"
exit 1

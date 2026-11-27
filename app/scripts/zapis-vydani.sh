#!/usr/bin/env bash
# Zapíše do API, který nativní balíček právě došel do obchodu.
#
# <b>Proč to existuje</b> (Filip, 26. 11. 2026: *„aby se to nemuselo
# odhadovat"*). Appka hledá aktualizace po síti jen pro otisk, na kterém
# sama běží. Když nativní změna otisk posune, pro starý balíček žádná
# aktualizace neexistuje — a appka řekne „jsi aktuální" přesně ve chvíli,
# kdy v Play leží nová verze. Tenhle zápis jí dá s čím porovnat
# (`GET /appka/vydani/android`).
#
# <b>Ptá se EAS, ne checkoutu.</b> Stejný důvod jako `stav-play.sh`: EAS
# ví, co se doopravdy postavilo a nahrálo. Otisk spočítaný z checkoutu by
# patřil jinému commitu, kdyby se ručním „nahrát znovu" posílal starší
# balíček.
#
# <b>Chyba je chyba.</b> Když se balíček nepodaří zjistit nebo zapsat,
# končí nenulovým kódem. Tichá zelená by vrátila přesně ten stav, kvůli
# kterému to vzniklo: appka by dál nevěděla, že je venku novější verze.
#
# Potřebuje EXPO_TOKEN, APPKA_TOKEN a API_URL.
set -euo pipefail

# Táž připnutá verze jako `stav-play.sh` — tvar `--json` se mezi verzemi
# může změnit a tenhle skript se o pole v něm opírá. Pole `appBuildVersion`
# a `gitCommitHash` ověřena 26. 11. 2026 ve zdroji eas-cli 27.11.0
# (`build/graphql/types/Build.js`).
EAS_VERZE="27.11.0"

profil="${1:-production}"

: "${EXPO_TOKEN:?Chybí EXPO_TOKEN}"
: "${APPKA_TOKEN:?Chybí APPKA_TOKEN — tajemství pro zápis vydání do API}"
: "${API_URL:?Chybí API_URL}"

# Chybový výstup se sem neslévá: varování na stderr by rozbilo JSON
# (poučení z `stav-play.sh`, ověřené prvním během v CI).
if ! seznam=$(npx -y "eas-cli@${EAS_VERZE}" build:list \
  --platform android --profile "$profil" --status finished \
  --limit 1 --json --non-interactive); then
  echo "Dotaz na EAS selhal; příčina je výš v logu." >&2
  exit 1
fi

if ! telo=$(printf '%s' "$seznam" | python3 -c '
import json, sys
b = json.load(sys.stdin)
if not isinstance(b, list) or not b:
    sys.exit("EAS nevrátil žádný hotový balíček")
x = b[0]
otisk = (x.get("fingerprint") or {}).get("hash") or (x.get("runtime") or {}).get("version")
cislo = x.get("appBuildVersion")
if not otisk:
    sys.exit("balíček nemá otisk ani ve fingerprint.hash, ani v runtime.version")
if cislo is None or not str(cislo).isdigit():
    sys.exit(f"balíček nemá číselné appBuildVersion, je tam {cislo!r}")
print(json.dumps({
    "platforma": "android",
    "cisloBalicku": int(cislo),
    "otisk": otisk,
    "commit": x.get("gitCommitHash") or None,
}))
' 2>&1); then
  echo "Odpověď EAS má jiný tvar, než na jaký se tenhle skript spoléhá:" >&2
  printf '%s\n' "$telo" >&2
  exit 1
fi

echo "Zapisuji: $telo"

odpoved=$(mktemp)
trap 'rm -f "$odpoved"' EXIT

# <b>Víc pokusů, jen když to má smysl.</b> Síť (000) a chyba serveru (5xx)
# se zkusí znovu; 400 a 401 ne — tam by další pokus dopadl stejně. Jediný
# pokus byl nález kontroly 27. 11. 2026: zápis, který selže, osmnáctky
# o devatenáctce nedozví nikdy, protože jiný zdroj nemají.
for pokus in 1 2 3 4; do
  kod=$(curl -sS --max-time 30 -o "$odpoved" -w '%{http_code}' -X POST "$API_URL/appka/vydani" \
    -H 'content-type: application/json' \
    -H "X-Vydani-Token: $APPKA_TOKEN" \
    --data "$telo") || kod="000"
  case "$kod" in
    000|5??) [ "$pokus" -lt 4 ] && { echo "Pokus $pokus: $kod, zkusím znovu."; sleep 5; continue; } ;;
  esac
  break
done

echo "API odpovědělo $kod: $(cat "$odpoved")"
if [[ "$kod" != "200" ]]; then
  # 503 = na serveru chybí `/run/secrets/Appka__Token`; 401 = nesedí
  # tajemství v GitHubu se souborem na serveru.
  echo "Zápis vydání se nepovedl." >&2
  exit 1
fi

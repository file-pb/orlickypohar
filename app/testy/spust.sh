#!/usr/bin/env bash
# Testy záznamu trasy. Co prokazují a co ne, stojí v testy/README.md.
#
# `--experimental-sqlite` je tu kvůli Node 22 v CI, kde `node:sqlite` ještě
# flag potřebuje; na Node 24 je neškodné.
set -euo pipefail
cd "$(dirname "$0")"

export NODE_NO_WARNINGS=1
NODE=(node --experimental-sqlite --import ./register.mjs)

echo "== Logika záznamu =="
TEST_DB=":memory:" "${NODE[@]}" ./zaznam.test.ts

echo
echo "== Klíč k lodi =="
TEST_DB=":memory:" "${NODE[@]}" ./klic.test.ts

echo
echo "== Odesílání na server =="
TEST_DB=":memory:" "${NODE[@]}" ./nahravani.test.ts

echo
echo "== Kdo zapíná aplikaci =="
"${NODE[@]}" ./role.test.ts

echo
echo "== Hlášení a troubení =="
"${NODE[@]}" ./hlaseni.test.ts

# `TZ` je tu schválně i u startu: odpočet říká pražský čas, ne telefonův,
# a v UTC by test prošel i s implementací, která zónu ignoruje.
echo
echo "== Startovní procedura =="
TZ="Europe/Prague" "${NODE[@]}" ./start.test.ts

echo
echo "== Cíl =="
"${NODE[@]}" ./cil.test.ts

echo
echo "== Nedoručený start =="
"${NODE[@]}" ./cekajici-start.test.ts

# `TZ` je tu schválně: čas aktualizace se skládá z místních složek a
# v UTC by test prošel i s chybnou implementací.
echo
echo "== Verze appky =="
TZ="Europe/Prague" "${NODE[@]}" ./verze.test.ts

# Zapsaná část musí přežít konec procesu — přejímací podmínka č. 2. Proto
# dva samostatné procesy nad jedním souborem, ne jeden se dvěma spojeními.
echo
echo "== Přežití konce procesu =="
# Vlastní adresář, ne `mktemp` se šablonou: SQLite si k souboru přidá
# `-wal` a `-shm`, a `mktemp -t` chce na GNU šablonu s XXXXXX, na BSD ne.
SLOZKA="$(mktemp -d)"
DB="$SLOZKA/trasa.db"
trap 'rm -rf "$SLOZKA"' EXIT

TEST_DB="$DB" "${NODE[@]}" ./preziti/faze1.ts >/dev/null
VYSLEDEK="$(TEST_DB="$DB" "${NODE[@]}" ./preziti/faze2.ts)"
echo "  $VYSLEDEK"

python3 - "$VYSLEDEK" <<'PY'
import json, sys
v = json.loads(sys.argv[1])
chyby = []
if v.get('stav') != 'bezi':
    chyby.append(f"záznam měl po restartu pořád běžet, je {v.get('stav')!r}")
if v.get('pocet') != 120:
    chyby.append(f"zapsaných bodů mělo přežít 120, přežilo {v.get('pocet')}")
if v.get('lod') != 'LUNA':
    chyby.append(f"jméno lodi se nedochovalo: {v.get('lod')!r}")
if chyby:
    print('  CHYBA ' + '; '.join(chyby))
    sys.exit(1)
print('  ok   zapsaná část i stav „běží" přežily konec procesu')
PY

#!/usr/bin/env bash
# Řekne, jestli je potřeba postavit nový balíček pro Google Play.
#
# <b>Proč to nejde poznat z repozitáře.</b> Aktualizace po síti nese jen
# JavaScript a doručí se jedině do appky se **stejným nativním otiskem**
# (`runtimeVersion: fingerprint` v `app.json`). Jakmile se otisk posune —
# nové oprávnění, nová nativní závislost, jiné SDK — musí do telefonu
# nový balíček, jinak se appka tiše přestane aktualizovat.
#
# <b>Stav se nedrží v souboru, ptá se EAS.</b> Soubor by znamenal zápis
# z CI zpátky do mainu a tím riziko smyčky; EAS navíc ví, co se doopravdy
# postavilo, kdežto soubor jen to, co si někdo zapamatoval zapsat — právě
# na tom rozchodu stál sedm týdnů starý odkaz na `/appka`.
#
# <b>Chyba není „je potřeba".</b> Tohle je nejdůležitější vlastnost celého
# skriptu. První podoba brala `$(python …)` uvnitř here-dokumentu, takže
# zahodila návratový kód: rozbitý JSON nebo prázdná odpověď daly prázdný
# otisk, ten se nerovnal ničemu a vyšlo z toho `POTREBA=ano` — tedy build
# a nahrání do obchodu **po každém pushi, zeleně**. Proto se každý krok
# kontroluje zvlášť a nejistota má vlastní hodnotu `nevim` s nenulovým
# návratovým kódem. Stejný guard má i sesterský `stav-buildu.sh`.
#
# Vypisuje `OTISK=`, `POSLEDNI=`, `BUILD=` a `POTREBA=ano|ne|nevim`.
# Návratový kód: 0 když se stav podařilo zjistit, 1 když ne.
#
# `ROZBOR=cesta` uloží nezpracovanou odpověď EAS do souboru — na zjištění,
# jak se které pole jmenuje, bez hádání.
set -euo pipefail

# <b>Připnutá verze, ne `@latest`.</b> Tenhle skript běží v CI v úloze,
# která drží `EXPO_TOKEN` a má zapojenou cestu do obchodu. Repozitář
# pinuje externí akce na otisk commitu právě proto, že kdo ovládne cizí
# balík, spustí si kód v našem CI — a `@latest` by to pravidlo obešel.
# Druhý důvod: tvar `--json` výstupu se může mezi verzemi změnit a tenhle
# skript se o pole v něm opírá.
EAS_VERZE="27.11.0"

profil="${1:-production}"

token="${EXPO_TOKEN:-}"
if [[ -z "$token" ]] && command -v security >/dev/null 2>&1; then
  token=$(security find-generic-password -a "$USER" -s expo-token -w 2>/dev/null || true)
fi
if [[ -z "$token" ]]; then
  echo "POTREBA=nevim"
  echo "Chybí token. Buď ho dej do EXPO_TOKEN, nebo na Macu do klíčenky:" >&2
  echo "  security add-generic-password -a \"\$USER\" -s expo-token -U -w \"\$(pbpaste)\"" >&2
  exit 1
fi

# Otisk dnešního stromu. `expo-updates` z `node_modules`, ne přes `npx -y`:
# otisk musí počítat tatáž verze, která ho počítala při buildu, jinak by
# `POTREBA` bylo natrvalo `ano`.
if ! otisk_json=$(npx --no-install expo-updates fingerprint:generate --platform android 2>&1); then
  echo "POTREBA=nevim"
  echo "Otisk se nepodařilo spočítat. Chybí `npm ci` v app/?" >&2
  printf '%s\n' "$otisk_json" >&2
  exit 1
fi
if ! otisk=$(printf '%s' "$otisk_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["hash"])' 2>&1); then
  echo "POTREBA=nevim"
  echo "Otisk se nedá přečíst z odpovědi expo-updates:" >&2
  printf '%s\n' "$otisk" >&2
  exit 1
fi

# `--status finished`: rozdělaný ani spadlý build o stavu obchodu nic
# neříká. Chybová hlášení se schválně **nezahazují** — bez nich by člověk
# u selhání neměl z čeho poznat příčinu.
if ! seznam=$(EXPO_TOKEN="$token" npx -y "eas-cli@${EAS_VERZE}" build:list \
  --platform android --profile "$profil" --status finished \
  --limit 1 --json --non-interactive 2>&1); then
  echo "POTREBA=nevim"
  echo "Dotaz na EAS selhal:" >&2
  printf '%s\n' "$seznam" >&2
  exit 1
fi

if [[ -n "${ROZBOR:-}" ]]; then
  printf '%s' "$seznam" > "$ROZBOR"
fi

# Otisk buildu je v `fingerprint.hash`; `runtime.version` nese tutéž
# hodnotu a je tu jako záloha, kdyby jedno z polí zmizelo. Plochý
# `fingerprintHash` v odpovědi **není** (ověřeno 24. 11. 2026 proti
# eas-cli 27.11.0). Prázdný seznam není chyba — znamená, že se z tohohle
# profilu ještě nic nepostavilo.
if ! rozbor=$(printf '%s' "$seznam" | python3 -c '
import json, sys
b = json.load(sys.stdin)
if not isinstance(b, list):
    sys.exit("odpoved neni seznam buildu")
if not b:
    print("- -")
    raise SystemExit
x = b[0]
otisk = (x.get("fingerprint") or {}).get("hash") or (x.get("runtime") or {}).get("version")
if not otisk:
    sys.exit("build nema otisk ani ve fingerprint.hash, ani v runtime.version")
print(otisk, x.get("id") or "-")
' 2>&1); then
  echo "POTREBA=nevim"
  echo "Odpověď EAS má jiný tvar, než na jaký se tenhle skript spoléhá:" >&2
  printf '%s\n' "$rozbor" >&2
  exit 1
fi

read -r posledni build <<<"$rozbor"

echo "OTISK=$otisk"
echo "POSLEDNI=$posledni"
echo "BUILD=$build"
if [[ "$posledni" == "$otisk" ]]; then
  echo "POTREBA=ne"
else
  echo "POTREBA=ano"
fi

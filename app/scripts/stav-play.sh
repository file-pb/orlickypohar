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
# postavilo, kdežto soubor jen to, co si někdo zapamatoval zapsat.
# Porovnává se otisk dnešního stromu s otiskem **posledního dokončeného**
# buildu z profilu, který se nahrává do obchodu.
#
# Vypisuje `OTISK=`, `POSLEDNI=`, `BUILD=` a `POTREBA=ano|ne`. Návratový
# kód je vždycky 0, když se to podařilo zjistit — rozhoduje `POTREBA`,
# aby se nemíchalo „je potřeba" s „nepovedlo se".
set -euo pipefail

profil="${1:-production}"

token="${EXPO_TOKEN:-}"
if [[ -z "$token" ]] && command -v security >/dev/null 2>&1; then
  token=$(security find-generic-password -a "$USER" -s expo-token -w 2>/dev/null || true)
fi
if [[ -z "$token" ]]; then
  echo "Chybí token. Buď ho dej do EXPO_TOKEN, nebo na Macu do klíčenky:" >&2
  echo "  security add-generic-password -a \"\$USER\" -s expo-token -U -w \"\$(pbpaste)\"" >&2
  exit 1
fi

otisk=$(npx -y expo-updates fingerprint:generate --platform android \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["hash"])')

# `--status finished`: rozdělaný ani spadlý build o stavu obchodu nic neříká.
seznam=$(EXPO_TOKEN="$token" npx -y eas-cli@latest build:list \
  --platform android --profile "$profil" --status finished \
  --limit 1 --json --non-interactive 2>/dev/null)

read -r posledni build <<EOF
$(printf '%s' "$seznam" | python3 -c '
import json, sys
b = json.load(sys.stdin)
if not b:
    print("- -")
else:
    x = b[0]
    # Otisk je v `runtime.version`, ne v `fingerprintHash` — to pole
    # v odpovědi není (ověřeno 24. 11. 2026 proti eas-cli).
    print((x.get("runtime") or {}).get("version") or "-", x.get("id") or "-")
')
EOF

echo "OTISK=$otisk"
echo "POSLEDNI=$posledni"
echo "BUILD=$build"
if [[ "$posledni" == "$otisk" ]]; then
  echo "POTREBA=ne"
else
  echo "POTREBA=ano"
fi

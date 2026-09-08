#!/usr/bin/env bash
# Vyrobí typy pro web i appku z jednoho zdroje — z OpenAPI dokumentu API.
#
# Proč se dokument stahuje z běžícího API a ne z buildu: aplikace při startu
# pouští migrace, takže bez databáze nenaběhne, a databáze na pracovním stroji
# nejede (Docker Hub je odsud nedostupný). Běžící instance je tedy jediný
# zdroj — a je to zároveň ta, se kterou klienti doopravdy mluví.
#
# Snímek dokumentu se commituje schválně: změna kontraktu je pak vidět
# v diffu pull requestu, ne až v chybě klienta.
#
#   ./generuj.sh                                  # z produkce
#   API=http://localhost:8080 ./generuj.sh        # z lokálního API
set -euo pipefail

kde=$(cd "$(dirname "$0")" && pwd)
api=${API:-https://orlickypohar-api.klihovka.cz}

echo "Stahuji dokument z $api"
curl -fsS "$api/openapi/v1.json" | python3 -m json.tool > "$kde/openapi.json"

# Typy jdou do obou klientů. Není to sdílený balíček, ale generovaná kopie:
# workspace se symlinky by musel obsloužit Next i Metro a zatím by to byla
# složitost navíc. Až začne kopírování vadit, je to jeden `npm workspaces`.
for cil in "$kde/../../web/lib/schema.d.ts" "$kde/../../app/src/lib/schema.d.ts"; do
  npx -y openapi-typescript@7 "$kde/openapi.json" -o "$cil"
  echo "→ $(cd "$(dirname "$cil")" && pwd)/$(basename "$cil")"
done

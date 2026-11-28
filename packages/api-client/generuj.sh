#!/usr/bin/env bash
# Vyrobí typy pro web i appku z jednoho zdroje — z OpenAPI dokumentu API.
#
# Proč se dokument stahuje z běžícího API a ne z buildu: aplikace při startu
# pouští migrace, takže bez databáze nenaběhne. Běžící instance je tedy
# zdroj — a produkce je navíc ta, se kterou klienti doopravdy mluví.
#
# Snímek dokumentu se commituje schválně: změna kontraktu je pak vidět
# v diffu pull requestu, ne až v chybě klienta.
#
#   ./generuj.sh                                  # z produkce
#   API=http://localhost:8080 ./generuj.sh        # z lokálního API
#
# POZOR na lokální zdroj: bez nakonfigurované identity se chráněné endpointy
# neregistrují vůbec (`if (identita)` v `Program.cs:241`), takže dokument
# vyjde o 127 cest kratší a generovaný klient tiše ztratí celou správu.
# Ověřeno 22. 11. 2026: 18 cest místo 145. Lokální API proto potřebuje
# `Identita__Authority`, `Identita__Audience` (adresa nemusí být dostupná,
# ale **musí být https** — s http vrací každá cesta včetně /health 500,
# `RequireHttpsMetadata`) a `Fotky__Endpoint`, `Fotky__Bucket`,
# `Fotky__VerejnaAdresa`. Hotové je to v `.claude/launch.json` jako
# `api-pro-typy` na portu 8085; databázi k tomu dá
# `docker run -d --rm --name op-typy -e POSTGRES_PASSWORD=typy -e POSTGRES_DB=op -p 55432:5432 postgres:17-alpine`.
# Po vygenerování vrať ve snímku `servers[0].url` na `http://localhost/` —
# lokální zdroj tam zapíše svůj port a diff by tvrdil změnu, která není.
# Dřív tu stálo, že na pracovním stroji nejede databáze a Docker Hub je
# nedostupný — ani jedno neplatí (viz oddíl o pastech v AGENTS.md).
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

#!/usr/bin/env bash
# Testy pravidel, která se nedají ověřit pohledem na stránku.
set -euo pipefail
cd "$(dirname "$0")"

export NODE_NO_WARNINGS=1
echo "== Pořadí na vodě =="
node --experimental-strip-types ./poradi.test.ts

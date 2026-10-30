#!/usr/bin/env bash
# Testy pravidel, která se nedají ověřit pohledem na stránku.
set -euo pipefail
cd "$(dirname "$0")"

export NODE_NO_WARNINGS=1
echo "== Pořadí na vodě =="
node --experimental-strip-types ./poradi.test.ts

echo
echo "== Panýlky rozjížděk =="
node --experimental-strip-types ./rozjizdky.test.ts

echo
echo "== Režie tabule =="
node --experimental-strip-types ./rezie.test.ts

echo
echo "== Postup po trati =="
node --experimental-strip-types ./postup.test.ts

echo
echo "== Události tabule =="
node --experimental-strip-types ./udalosti.test.ts

echo
echo "== Rozcestník regaty =="
node --experimental-strip-types ./rozcestnik.test.ts

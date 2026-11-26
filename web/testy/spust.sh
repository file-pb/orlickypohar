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

echo
echo "== Čtení souřadnic z adresy =="
node --experimental-strip-types ./souradnice.test.ts

echo
echo "== Hranice rozbalování zkratek =="
node --experimental-strip-types ./zkratky.test.ts

echo
echo "== Přesun lodi v zápisu =="
node --experimental-strip-types ./presun.test.ts

# Shoda v cíli v klepacím listu (K7, ZPJ A7). Dvě stejná čísla v něm dřív
# vzniknout nemohla — čísloval se index klepnutí.
echo
echo "== Shoda v cíli =="
node --experimental-strip-types ./shoda.test.ts

# Místní čas Orlíku proti okamžiku. Dvě pasti: server jede v UTC a posun
# se musí počítat k tomu dni, ne k dnešku.
echo
echo "== Čas Orlíku =="
node --experimental-strip-types ./cas-praha.test.ts

# Fronta mapových dlaždic. „Mapa se občas nevykreslí celá" (pozorování 11):
# počítadlo padalo do záporu a druhá vlna požadavků šla na zdroj celá naráz.
echo
echo "== Fronta mapových dlaždic =="
node --experimental-strip-types ./dlazdice.test.ts

# Který krok posouvá zápis dál. Rozhoduje, co na kartě rozjížďky dostane
# váhu — splést couvnutí s krokem vpřed je drahé oběma směry.
echo
echo "== Krok vpřed ve workflow =="
node --experimental-strip-types ./workflow.test.ts

# Čtení papírového zápisu, jak ho nasype člověk s modelem. Hlídá hlavně,
# že se nepřečtený řádek neztratí — jinak by tabulka vypadala úplná.
echo
echo "== Čtení papírového zápisu =="
node --experimental-strip-types ./papir.test.ts

# Kód k napojení appky, jak ho stránka Můj účet ukáže k opsání. Hlídá
# nezlomitelnou mezeru: s obyčejnou se kód na mobilu zlomí na dva řádky.
echo
echo "== Kód k opsání =="
node --experimental-strip-types ./kod-k-opsani.test.ts

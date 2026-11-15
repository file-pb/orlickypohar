#!/usr/bin/env bash
# Rozkopíruje pravidla průvodce stavbou prvku do obou klientů.
#
# Zadání (Filip, 10. 10. 2026): *„Stavitel bude potřebovat kliknout na typ
# prvku, dostat se do obrazovky pro daný typ a tam to jen pípnout, zvolit
# atributy, popojet, pípnout."* Tentýž průvodce má jít do appky, a protože
# appka je React Native, z webové obrazovky se tam nepřenese nic — ale
# kolik bodů který typ potřebuje, jak se pojmenují a jaké předpisy dávají
# smysl, ano.
#
# **Proč kopie a ne balíček ve workspace.** Plán to od 10. 10. 2026 popisuje
# jako „balíček sdílený oběma klienty, jako dnes schema.d.ts" — jenže
# schema.d.ts žádný balíček není, `packages/api-client/generuj.sh` píše dvě
# kopie a v komentáři u toho stojí důvod: workspace se symlinky by musel
# obsloužit Next i Metro. Dnes je ten důvod silnější, ne slabší: `app/` má
# vlastní `package-lock.json`, v kořeni repozitáře žádný `package.json`
# není a úloha `appka` v CI instaluje s `working-directory: app`. Workspace
# by znamenal přepsat instalaci, cache balíčků i `watchFolders` Metra kvůli
# dvěma souborům.
#
# **Co kopii drží poctivou, je kontrola v CI**, ne dobrá vůle: úloha `appka`
# pustí tenhle skript a `git diff --exit-code`. Bez ní se dvě kopie rozejdou
# do měsíce a pozná se to až na vodě.
#
# **Cíle jsou `lib/` obou klientů schválně.** Sdílený modul smí importovat
# jedině `./schema` a `./geo`, a ty tam leží jako jeho sourozenci —
# `web/lib/` i `app/src/lib/`. Relativní cesta tím vyjde stejně v Nextu,
# v Metru i v holém Node, kterým jedou testy.
#
#     ./rozkopiruj.sh            # přepíše kopie
#     ./rozkopiruj.sh --zkouska  # jen řekne, jestli sedí (nic nepíše)
set -euo pipefail

kde=$(cd "$(dirname "$0")" && pwd)
koren=$(cd "$kde/../.." && pwd)

# Seznam se bere z adresáře, ne z ruky: nový soubor ve zdroji se tím
# rozkopíruje sám a zapomenutou kopii ohlásí kontrola. Co to naopak
# nepozná, je **smazání** ze zdroje — kopie po něm v klientech zůstanou
# viset a tenhle skript se o ně nezajímá. Kdo maže, maže všechny tři.
SOUBORY=()
for s in "$kde"/*.ts; do SOUBORY+=("$(basename "$s")"); done
CILE=("$koren/web/lib" "$koren/app/src/lib")

zkouska=0
[[ "${1:-}" == "--zkouska" ]] && zkouska=1

# Hlavička se přidává až do kopie, ne do zdroje: ve zdroji by to byla věta,
# která posílá sama k sobě.
hlavicka() {
  cat <<HLAVICKA
// NEEDITUJ TENHLE SOUBOR. Je to kopie z \`packages/stavba/$1\`,
// kterou vyrábí \`packages/stavba/rozkopiruj.sh\`. Změna patří do zdroje;
// tahle kopie se při příštím běhu přepíše a CI rozdíl ohlásí.
HLAVICKA
}

nesedi=0

for soubor in "${SOUBORY[@]}"; do
  for cil in "${CILE[@]}"; do
    cesta="$cil/$soubor"

    if [[ "$zkouska" -eq 1 ]]; then
      if ! diff -q <(hlavicka "$soubor"; cat "$kde/$soubor") "$cesta" >/dev/null 2>&1; then
        echo "nesedí: ${cesta#"$koren"/}" >&2
        nesedi=1
      fi
      continue
    fi

    { hlavicka "$soubor"; cat "$kde/$soubor"; } > "$cesta"
    echo "→ ${cesta#"$koren"/}"
  done
done

if [[ "$zkouska" -eq 1 ]]; then
  [[ "$nesedi" -eq 0 ]] && echo "Kopie sedí se zdrojem." || {
    echo "Pusť packages/stavba/rozkopiruj.sh a výsledek zacommituj." >&2
    exit 1
  }
fi

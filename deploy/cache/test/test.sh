#!/usr/bin/env bash
# Test pravidel mikrocache proti falešnému webu. Běží v CI před nasazením;
# když selže, nic se nenasadí. Potřebuje jen Docker a curl.
#
#   deploy/cache/test/test.sh
#
# Kontroluje výsledek, ne konfiguraci: falešný web čísluje každé
# vykreslení, takže je vidět, jestli odpověď přišla z cache, nebo znovu
# z webu — a čí stránka to byla.
set -euo pipefail

ADRESAR="$(cd "$(dirname "$0")" && pwd)"
SIT=op-cache-test
PORT=18080
URL="http://127.0.0.1:$PORT"
chyb=0

uklid() {
  docker rm -f op-cache-test-web op-cache-test-cache >/dev/null 2>&1 || true
  docker network rm "$SIT" >/dev/null 2>&1 || true
}
trap uklid EXIT
uklid

docker build -q -t op-cache-test "$ADRESAR/.." >/dev/null
docker network create "$SIT" >/dev/null
# Alias jako v produkci — nginx hledá web pod tímhle jménem.
docker run -d --name op-cache-test-web --network "$SIT" --network-alias orlickypohar-web \
  -v "$ADRESAR:/t:ro" python:3.13-alpine python /t/falesny_web.py >/dev/null
docker run -d --name op-cache-test-cache --network "$SIT" -p "$PORT:8080" op-cache-test >/dev/null

for _ in $(seq 1 50); do
  curl -fs "$URL/health" >/dev/null 2>&1 && break
  sleep 0.2
done

# get CESTA [argumenty curl…] → nastaví $telo, $cache a $stav
get() {
  local cesta=$1; shift
  local hlavicky
  hlavicky=$(mktemp)
  telo=$(curl -s -D "$hlavicky" "$@" "$URL$cesta")
  stav=$(head -1 "$hlavicky" | awk '{print $2}')
  cache=$(grep -i '^x-cache:' "$hlavicky" | awk '{print $2}' | tr -d '\r' || true)
  rm -f "$hlavicky"
}
vykresleni() { sed -E 's/.*vykresleni=([0-9]+).*/\1/' <<<"$1"; }

ok()  { echo "  ok    $1"; }
spatne() { echo "  CHYBA $1"; chyb=$((chyb + 1)); }
ma() { # POPIS PODMÍNKA…
  local popis=$1; shift
  if "$@"; then ok "$popis"; else spatne "$popis (stav=$stav cache=$cache telo=$telo)"; fi
}

echo "Nepřihlášený: druhý požadavek z cache"
get /a; prvni=$(vykresleni "$telo")
get /a
ma "druhý je HIT" test "$cache" = HIT
ma "stejné vykreslení" test "$(vykresleni "$telo")" = "$prvni"

echo "Vzhled je v klíči, neplatná hodnota ne"
get /b -H "Cookie: op_rezim=tmavy"
ma "tmavý poprvé MISS" test "$cache" = MISS
get /b -H "Cookie: op_rezim=tmavy"
ma "tmavý podruhé HIT" test "$cache" = HIT
ma "tmavý dostal tmavou" grep -q "rezim=tmavy" <<<"$telo"
get /b
ma "bez cookie jiná položka (MISS)" test "$cache" = MISS
ma "bez cookie není tmavá" grep -q "rezim= " <<<"$telo"
bez=$(vykresleni "$telo")
get /b -H "Cookie: op_rezim=nesmysl"
ma "nesmyslný vzhled sdílí položku bez cookie" test "$cache" = HIT
ma "…a tutéž stránku" test "$(vykresleni "$telo")" = "$bez"

echo "Přihlášený nikdy z cache ani do ní"
get /c
get /c -H "Cookie: op_token=tajne"
ma "přihlášený BYPASS" test "$cache" = BYPASS
ma "přihlášený vidí sebe" grep -q "prihlaseny=1" <<<"$telo"
get /c
ma "anonym po něm HIT" test "$cache" = HIT
ma "anonym nevidí přihlášeného" grep -q "prihlaseny=0" <<<"$telo"
get /d -H "Cookie: op_rezim=tmavy; op_token=tajne"
get /d -H "Cookie: op_rezim=tmavy"
ma "stránka přihlášeného se neuložila" test "$cache" = MISS
ma "anonym ji nedostal" grep -q "prihlaseny=0" <<<"$telo"
for c in "op_token.0=a; op_token.1=b" "op_tok=x" "a=1; op_token=x"; do
  get /e -H "Cookie: $c"
  ma "cookie '$c' → BYPASS" test "$cache" = BYPASS
done
get /f; get /f -H "Cookie: xop_token=1"
ma "podobné jméno cookie sezení není" test "$cache" = HIT

echo "RSC požadavky mimo cache"
get /g -H "RSC: 1"
ma "RSC BYPASS" test "$cache" = BYPASS
get /g
ma "RSC odpověď se neuložila" test "$cache" = MISS

echo "Odpověď se Set-Cookie se neukládá"
get /nastav-cookie; a=$(vykresleni "$telo")
get /nastav-cookie
ma "podruhé znovu z webu" test "$(vykresleni "$telo")" != "$a"

echo "Chyba se neukládá, 404 ano"
get /chyba; a=$(vykresleni "$telo")
get /chyba
ma "500 podruhé znovu z webu" test "$(vykresleni "$telo")" != "$a"
get /neni; get /neni
ma "404 podruhé HIT" test "$cache" = HIT

echo "Zdraví a přihlašování nejdou přes cache"
get /health
ma "/health z webu" test "$telo" = Healthy
ma "/health bez X-Cache" test -z "$cache"
get /cache-zdravi
ma "/cache-zdravi odpovídá nginx" test "$telo" = ok
get /prihlaseni/zpet; a=$(vykresleni "$telo")
get /prihlaseni/zpet
ma "/prihlaseni vždy z webu" test "$(vykresleni "$telo")" != "$a"
get /sprava/2026; get /sprava/2026
ma "/sprava bez X-Cache" test -z "$cache"

echo "POST mimo cache"
get /h -X POST; a=$(vykresleni "$telo")
get /h -X POST
ma "POST podruhé znovu z webu" test "$(vykresleni "$telo")" != "$a"

echo "Nával na novou stránku vykreslí jednou"
for _ in $(seq 1 20); do curl -s "$URL/naval" & done > "$ADRESAR/.naval" ; wait
ma "20 souběžných → jedno vykreslení" test "$(grep -o 'vykresleni=[0-9]*' "$ADRESAR/.naval" | sort -u | wc -l)" -eq 1
rm -f "$ADRESAR/.naval"

echo "Po 10 s se stránka obnoví"
get /a; puvodni=$(vykresleni "$telo")
sleep 11
get /a
ma "po vypršení starou jen jednou (STALE/UPDATING/EXPIRED)" grep -qE '^(STALE|UPDATING|EXPIRED)$' <<<"$cache"
sleep 1
get /a
ma "pak nová verze z cache" test "$cache" = HIT
ma "…opravdu nová" test "$(vykresleni "$telo")" -gt "$puvodni"

if [ "$chyb" -gt 0 ]; then
  echo "Selhalo: $chyb"
  docker logs op-cache-test-cache 2>&1 | tail -20
  exit 1
fi
echo "Všechno prošlo."

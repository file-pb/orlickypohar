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
  docker rm -f op-cache-test-web op-cache-test-web-sezeni op-cache-test-cache >/dev/null 2>&1 || true
  docker network rm "$SIT" >/dev/null 2>&1 || true
}
trap uklid EXIT
uklid

docker build -q -t op-cache-test "$ADRESAR/.." >/dev/null
docker network create "$SIT" >/dev/null
# Aliasy jako v produkci — nginx hledá repliky pod těmihle jmény. Dvě,
# protože přihlášený jde na vlastní (S11, `$web_replika` v default.conf),
# a každá se v odpovědi hlásí jménem, aby se rozdělení ověřilo výsledkem.
docker run -d --name op-cache-test-web --network "$SIT" --network-alias orlickypohar-web \
  -e REPLIKA=anonym -v "$ADRESAR:/t:ro" python:3.13-alpine python /t/falesny_web.py >/dev/null
docker run -d --name op-cache-test-web-sezeni --network "$SIT" \
  --network-alias orlickypohar-web-sezeni \
  -e REPLIKA=sezeni -v "$ADRESAR:/t:ro" python:3.13-alpine python /t/falesny_web.py >/dev/null
# Port JEN na localhost. Bez `127.0.0.1:` ho Docker vystaví na všechny
# adresy a projde přes DNAT i okolo ufw — 10. 10. 2026 se takhle našel
# zapomenutý kontejner z tohohle testu, který odpovídal 200 z internetu
# (platform/docs/POUCENI.md, 61). Firewall to dnes zahodí, ale test to
# nemá vystavovat vůbec: `$URL` míří na 127.0.0.1, takže tím nic neztrácí.
docker run -d --name op-cache-test-cache --network "$SIT" -p "127.0.0.1:$PORT:8080" op-cache-test >/dev/null

for _ in $(seq 1 50); do
  curl -fs "$URL/health" >/dev/null 2>&1 && curl -fs "$URL/health-sezeni" >/dev/null 2>&1 && break
  sleep 0.2
done

# get CESTA [argumenty curl…] → nastaví $telo, $cache a $stav
get() {
  local cesta=$1; shift
  local hlavicky
  hlavicky=$(mktemp)
  local zacatek=$SECONDS
  telo=$(curl -s -D "$hlavicky" "$@" "$URL$cesta")
  # Doba požadavku v celých sekundách. Na nic jemného tu nestačí a nemá —
  # jediné, co se z ní tvrdí, je „netrvalo to minutu".
  trvalo=$((SECONDS - zacatek))
  stav=$(head -1 "$hlavicky" | awk '{print $2}')
  cache=$(grep -i '^x-cache:' "$hlavicky" | awk '{print $2}' | tr -d '\r' || true)
  replika=$(grep -i '^x-replika:' "$hlavicky" | awk '{print $2}' | tr -d '\r' || true)
  rm -f "$hlavicky"
}
vykresleni() { sed -E 's/.*vykresleni=([0-9]+).*/\1/' <<<"$1"; }
# <b>Hledá se značka, ne shoda čísel.</b> `vykresleni()` je `sed`, který při
# neodpovídajícím vzoru vrací vstup beze změny, takže porovnání „není rovno"
# projde i u chybové stránky nginxu a u prázdného těla — tedy ze špatného
# důvodu. Na „tohle tělo tady být nesmí" se musí ptát přímo.
# Negace je uvnitř funkce, ne před ní: `ma` spouští svoje argumenty
# jako příkaz a `!` mezi nimi je slovo, ne operátor. A číslo musí skončit,
# jinak by `vykresleni=7` našlo i `vykresleni=71` a ohlásilo uloženou
# stránku tam, kde je jiná.
nenese_vykresleni() { ! grep -qE "vykresleni=$2([^0-9]|$)" <<<"$1"; }

ok()  { echo "  ok    $1"; }
spatne() { echo "  CHYBA $1"; chyb=$((chyb + 1)); }
ma() { # POPIS PODMÍNKA…
  local popis=$1; shift
  if "$@"; then ok "$popis"; else spatne "$popis (stav=$stav cache=$cache replika=$replika telo=$telo)"; fi
}

echo "Nepřihlášený: druhý požadavek z cache"
get /a; prvni=$(vykresleni "$telo")
get /a
ma "druhý je HIT" test "$cache" = HIT
ma "stejné vykreslení" test "$(vykresleni "$telo")" = "$prvni"

# Položka pro oddíl „Výpadek původu" na konci. Ukládá se UŽ TADY schválně:
# do té doby jí vyprší platnost (10 s) bez jediného čekání navíc, takže
# poslední oddíl ověří opravdu `proxy_cache_use_stale`, a ne obyčejný HIT.
# Na runneru GitHubu to tak poprvé neprošlo — tam byl mezi uložením a
# výpadkem necelý interval a odpověď přišla jako HIT.
# NEPŘESOUVEJ to dolů k tomu oddílu.
get /vypadek
ocekavane_vypadek=$(vykresleni "$telo")

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

echo "Jména cookie sezení sedí s tím, co posílá web"
# N2: jediná pojistka proti uložení osobní stránky do cache je, že se taková
# odpověď pozná podle cookie sezení. `proxy_ignore_headers` zahazuje
# `Cache-Control` i `Vary`, a GET přihlášeného nemusí nést `Set-Cookie` —
# takže když se jméno cookie změní ve web/lib/oidc.ts a nezmění v nginxu,
# personalizované HTML se uloží pod anonymní klíč.
#
# Nekontrolují se řetězce proti řetězcům: jména se vytáhnou z oidc.ts
# a pošlou skutečnému nginxu. Prochází tedy to, co doopravdy nastane.
OIDC="$ADRESAR/../../../web/lib/oidc.ts"
jmena=$(grep -oE 'export const COOKIE_[A-Z]+ = "[a-z_]+"' "$OIDC" | sed -E 's/.*"([a-z_]+)".*/\1/')
ma "jména cookie se v oidc.ts našla" test -n "$jmena"

for j in $jmena; do
  get "/cookie-$j" -H "Cookie: $j=cokoliv"
  ma "cookie $j jde mimo cache" test "$cache" = BYPASS
done
# Dělený token: web ukládá kusy jako `op_token.0`, `op_token.1`, …
get /cookie-kus -H "Cookie: op_token.0=cokoliv"
ma "dělená cookie op_token.0 jde mimo cache" test "$cache" = BYPASS

# Negativní kontrola: kdyby výraz chytal cokoliv, prošly by i tyhle testy
# a nic by neověřovaly. Cizí cookie se cachovat MUSÍ.
get /cookie-cizi -H "Cookie: op_tokenovnik=cokoliv"
ma "cizí jméno se naopak cachuje (výraz nechytá vše)" test "$cache" = MISS
get /cookie-cizi -H "Cookie: op_tokenovnik=cokoliv"
ma "…a podruhé je to HIT" test "$cache" = HIT

echo "Přihlášený jde na vlastní repliku"
# Vlastní adresa klienta, a tedy vlastní rozpočet limitu. Bez ní sdílí
# tenhle blok zónu `render` se všemi testy výš, které hlavičku neposílají,
# a jedno cizí 429 by vypadalo jako špatně nasměrovaná replika.
smerovani="203.0.113.30"
# Nález S11: na společné replice se přihlášený zařadí do fronty za
# útočníkem, který si vyžádal vykreslení na stále nové adresy. Změřeno
# 9. 10. 2026: společná replika 1,9 s, vlastní 0,20 s.
#
# Ověřuje se to VÝSLEDKEM — kdo odpověděl —, ne čtením mapy v konfiguraci.
get /r1 -H "Cf-Connecting-Ip: $smerovani"
ma "anonym na anonymní replice" test "$replika" = anonym
get /r1 -H "Cf-Connecting-Ip: $smerovani" -H "Cookie: op_token=tajne"
ma "přihlášený na replice sezení" test "$replika" = sezeni
ma "…a je to vidět i v těle" grep -q "replika=sezeni" <<<"$telo"
get /r2 -H "Cf-Connecting-Ip: $smerovani" -H "Cookie: op_token.0=a"
ma "dělená cookie taky na repliku sezení" test "$replika" = sezeni
get /r3 -H "Cf-Connecting-Ip: $smerovani" -H "Cookie: op_rezim=tmavy"
ma "cookie vzhledu repliku nemění" test "$replika" = anonym

# RSC prefetch jde mimo cache, ale bez cookie sezení patří davu, ne
# pořadateli. Kdyby šel na repliku sezení, nával diváků by ji zavalil
# přesně v okamžiku, kdy ji pořadatel potřebuje.
get /r4 -H "Cf-Connecting-Ip: $smerovani" -H "RSC: 1"
ma "anonymní RSC prefetch zůstává na anonymní replice" test "$replika" = anonym
get /r4 -H "Cf-Connecting-Ip: $smerovani" -H "RSC: 1" -H "Cookie: op_token=tajne"
ma "RSC přihlášeného jde na jeho repliku" test "$replika" = sezeni

# `/sprava` je celá mimo cache a má volnější strop 10/s. Web na ní
# anonymovi 401 nevrací (to dělá API), takže se mu stránka vykreslí —
# jeden klient si tudy vyžádá 8,7 vykreslení/s, dvojnásobek kapacity.
# Musí proto skončit na anonymní replice.
get /sprava/2027 -H "Cf-Connecting-Ip: $smerovani"
ma "anonymní /sprava na anonymní replice" test "$replika" = anonym
get /sprava/2027 -H "Cf-Connecting-Ip: $smerovani" -H "Cookie: op_token=tajne"
ma "/sprava přihlášeného na jeho replice" test "$replika" = sezeni
get /prihlaseni/zacatek -H "Cf-Connecting-Ip: $smerovani"
ma "/prihlaseni bez cookie na anonymní replice" test "$replika" = anonym

# Dohled musí vidět OBĚ. `/health` jde bez cookie na anonymní repliku,
# takže spadlá replika sezení by znamenala 502 pro každého přihlášeného
# a monitoring by hlásil klid.
get /health -H "Cf-Connecting-Ip: $smerovani"
ma "/health je anonymní replika" test "$replika" = anonym
ma "…a vrací přesně Healthy" test "$telo" = Healthy
get /health-sezeni -H "Cf-Connecting-Ip: $smerovani"
ma "/health-sezeni je replika sezení" test "$replika" = sezeni
ma "…a vrací přesně Healthy" test "$telo" = Healthy

# Negativní kontrola: kdyby mapa vracela pořád totéž jméno, polovina
# testů výš by prošla. Projít musí OBA směry, a navíc se stránka jedné
# repliky nesmí objevit u druhé přes cache.
get /r5 -H "Cf-Connecting-Ip: $smerovani" -H "Cookie: op_token=tajne"; sezeni_vykresleni=$(vykresleni "$telo")
get /r5 -H "Cf-Connecting-Ip: $smerovani"
ma "stránka přihlášeného se neuložila pro anonyma" test "$(vykresleni "$telo")" != "$sezeni_vykresleni"
ma "…a anonym dostal anonymní repliku" test "$replika" = anonym
get /r5 -H "Cf-Connecting-Ip: $smerovani"
ma "anonymní verze se cachuje normálně" test "$cache" = HIT
ma "…a z cache je pořád anonymní replika" test "$replika" = anonym

echo "Limit vykreslování: jeden klient nesmí sebrat web ostatním"
# Měří se to, co bylo naměřeno v produkci: klient s cookie sezení jde mimo
# cache, takže každý jeho požadavek vykresluje. Útočník a kontrolní
# návštěvník MUSÍ mít různou Cf-Connecting-Ip, jinak by kontrolního odmítl
# vlastní limit a vypadalo by to jako kolaps webu.
# Prefetch celé stránky nesmí narazit. Next posílá `RSC: 1` a `?_rsc=<hash>`
# pro každý odkaz ve výřezu; stránky poháru jich mají 24 až 32. Dřív stačilo
# otevřít úvodní stránku a od jedenáctého prefetche chodily 429 (poučení 53).
# Souběh schválně NÍZKÝ, ne 32 naráz. Prohlížeč tolik spojení neotevře:
# k Cloudflare jde HTTP/2 po jednom a dál se spojení sdílejí, takže nginx
# vidí hodně požadavků na málo spojeních. Doklad z provozu 9. 10.: za půl
# hodiny osm varování zóny `render` a jen jedno `souben`. Kdyby se střílelo
# 32 naráz, měřil by se `limit_conn`, ne dávka — a test by tvrdil něco
# jiného, než co se na něj píše.
prohlizec="203.0.113.21"
: > "$ADRESAR/.pref"
seq 1 32 | xargs -P 6 -I{} sh -c \
  "curl -s -o /dev/null -w '%{http_code}\n' -H 'Cf-Connecting-Ip: $prohlizec' \
     -H 'RSC: 1' -H 'Next-Router-Prefetch: 1' '$URL/odkaz{}?_rsc=h{}'" >> "$ADRESAR/.pref"
stavy=$(cat "$ADRESAR/.pref"); rm -f "$ADRESAR/.pref"
ma "32 prefetchů stránky projde bez 429" test "$(grep -c 429 <<<"$stavy")" -eq 0
ma "…a opravdu jich odešlo 32" test "$(grep -c . <<<"$stavy")" -eq 32

utocnik="203.0.113.7"; divak="203.0.113.8"
# SOUBĚŽNĚ, ne za sebou. Sekvenční smyčka 25 curlů trvá přes deset vteřin
# a limit se jí průběžně doplňuje (2/s), takže by neodmítla nic a test by
# prošel naprázdno — první verze téhle zkoušky na to padla.
: > "$ADRESAR/.limit"
for i in $(seq 1 30); do
  curl -s -o /dev/null -w '%{http_code}\n' \
    -H "Cf-Connecting-Ip: $utocnik" -H "Cookie: op_token=x" "$URL/limit$i" \
    >> "$ADRESAR/.limit" &
done
wait
stavy=$(cat "$ADRESAR/.limit"); rm -f "$ADRESAR/.limit"
ma "nad dávku přijde 429" test "$(grep -c 429 <<<"$stavy")" -gt 0
ma "…a část přitom projde (limit nezavírá úplně)" test "$(grep -c 200 <<<"$stavy")" -gt 0

# Kontrolní návštěvník BĚHEM útoku, ne po něm — jinak se měří klid.
for i in $(seq 1 30); do
  curl -s -o /dev/null -H "Cf-Connecting-Ip: $utocnik" -H "Cookie: op_token=x" "$URL/soub$i" &
done
get /a -H "Cf-Connecting-Ip: $divak"
ma "jiný klient dostane stránku i během útoku" test "$stav" = 200
wait

# Cachované požadavky mají prázdný klíč zóny, takže je limit míjí — jinak
# by nával diváků na tutéž stránku spadl do 429 a mikrocache by byla k ničemu.
stavy=$(for _ in $(seq 1 25); do
          curl -s -o /dev/null -w '%{http_code}\n' -H "Cf-Connecting-Ip: $divak" "$URL/a"
        done)
ma "25× táž stránka z cache bez 429" test "$(grep -c 429 <<<"$stavy")" -eq 0

# Zapisovatel v cíli: souvislé ukládání nesmí narazit. Tempo určuje doba
# odezvy, ne prst — cil.tsx posílá další sadu hned, jak se vrátí předchozí.
zapisovatel="203.0.113.9"
stavy=$(for i in $(seq 1 20); do
          curl -s -o /dev/null -w '%{http_code}\n' -X POST \
            -H "Cf-Connecting-Ip: $zapisovatel" -H "Cookie: op_token=x" \
            "$URL/sprava/2027/vysledky/z/1/cil"
        done)
ma "20 zápisů správy za sebou projde bez 429" test "$(grep -c 429 <<<"$stavy")" -eq 0

get /cache-zdravi -H "Cf-Connecting-Ip: $utocnik"
ma "zdraví se nelimituje ani útočníkovi" test "$stav" = 200

# ---------------------------------------------------------------------------
# <b>Výměna replik: dvě adresy pod jedním jménem.</b> Tohle je ta situace,
# kvůli které v konfiguraci stojí `proxy_next_upstream` — při nasazení
# „nastartuj vedle a starou zastav potom" běží chvíli dva kontejnery pod
# týmž aliasem a nginx má v záznamu resolveru obě adresy. Komentář
# u toho pravidla tvrdí, že se při nedovolané replice zkusí druhá adresa;
# <b>doložené to nebylo ani dokumentací, ani měřením</b> (16. 10. 2026) —
# dokumentace nginxu mluví o přechodu mezi servery ve skupině `upstream`,
# kdežto tady je cíl proměnná překládaná resolverem.
#
# Ověřit to šlo až od chvíle, kdy se repliky zabíjejí místo zastavování:
# dřív by se na vypršení záznamu čekalo deset sekund navíc k deseti, které
# stálo samo zastavení.
echo "Výměna replik: nedovolaná adresa pod sdíleným jménem"

docker run -d --name op-cache-test-web2 --network "$SIT" --network-alias orlickypohar-web   -e REPLIKA=anonym2 -v "$ADRESAR:/t:ro" python:3.13-alpine python /t/falesny_web.py >/dev/null

# Čeká se na to, až nginx uvidí obě adresy — tedy až mu vyprší záznam
# s jedinou. Pozná se to tím, že odpoví druhá replika; slepé `sleep` by
# tvrdilo totéž, ale bez důkazu.
# Pokaždé jiná cesta: táž by se podruhé vydala z cache a hlavička
# `X-Replika` by pak mluvila o tom, kdo odpověděl posledně, ne teď.
obe=ne
for i in $(seq 1 60); do
  get "/vymena-cekani-$i"
  if [ "$replika" = anonym2 ]; then obe=ano; break; fi
  sleep 0.5
done
ma "nginx vidí obě repliky pod jedním jménem" test "$obe" = ano

# Zabije se ta, která právě odpověděla, a druhá zůstane. Požadavky pak
# musí projít všechny: adresa mrtvé je v záznamu dál a round-robin na ni
# bude střídavě sahat.
docker kill op-cache-test-web2 >/dev/null

# <b>Anonymně a pokaždé jinam.</b> Přihlášený by sem nepatřil: jeho
# požadavky vede `$web_replika` na repliku sezení (default.conf:73),
# která tenhle alias vůbec nemá. A táž cesta podruhé by přišla z cache,
# aniž by se web dotkla.
#
# Osm kusů: kdyby se opakování nekonalo, round-robin pošle na mrtvou
# adresu zhruba polovinu a tahle mez to pozná.
spatnych=0
for i in $(seq 1 8); do
  get "/vymena-$i"
  [ "$stav" -ge 500 ] && spatnych=$((spatnych + 1))
done
ma "při jedné mrtvé replice ze dvou projdou všechny požadavky" test "$spatnych" -eq 0

docker rm -f op-cache-test-web2 >/dev/null 2>&1 || true
# ---------------------------------------------------------------------------

# --- Výpadek původu -----------------------------------------------------
#
# Musí být až tady: scénář ZASTAVUJE repliky a nic po něm už by nefungovalo.
#
# Proč to vzniklo: od 10. 10. 2026 vyměňuje platforma kontejnery „nastartuj
# vedle a starého zastav potom". Mezera se tím zavřela, ale cache je ta
# poslední záchrana pro případy, které výměna neřeší — spadlý web, nezdařený
# start. A hlavně se tu hlídá, že se **stará stránka nikdy nedostane
# k přihlášenému**: to je tatáž podmínka jako u ukládání, jen z druhé strany.
echo "Výpadek původu: stará stránka ano, přihlášenému ne"

# `/vypadek` leží v cache od začátku testu a platnost jí mezitím vypršela,
# takže nginx musí jít na web — a ten za chvíli nebude.
# <b>`kill`, ne `stop`.</b> Dvojí důvod. `falesny_web.py` běží jako PID 1
# a nemá handler na SIGTERM, takže ho jádro u jedničky zahodí a `docker
# stop` čeká celý svůj výchozí desetivteřinový timeout, než pošle SIGKILL
# — deset sekund čistého čekání na každý běh CI, za nic.
#
# A hlavně: ten timeout běžel proti `resolver valid=10s`, takže o tom,
# jestli má nginx adresu zastaveného kontejneru ještě v záznamu, dřív
# rozhodoval závod dvou desetivteřinových lhůt. Odtud ten pád jednou za
# pětadvacet běhů. Okamžité zabití staví oddíl vždycky do té horší
# varianty — nginx se připojuje na mrtvou adresu — což je právě ten
# případ, kvůli kterému tu `proxy_connect_timeout` je.
#
# Zabití je navíc věrnější tomu, co tenhle oddíl modeluje: spadlý web,
# ne řádné odstavení.
docker kill op-cache-test-web op-cache-test-web-sezeni >/dev/null

get /vypadek
ma "nepřihlášený dostane poslední dobrou stránku" test "$stav" = 200
ma "…a je to opravdu ta uložená, ne nová" \
   test "$(vykresleni "$telo")" = "$ocekavane_vypadek"
# STALE, ne HIT: HIT by znamenal, že položka ještě platila a o výpadku
# nedokazuje nic. Když tady svítí HIT, posunul se oddíl nahoru.
ma "…vydaná jako STALE, tedy opravdu přes výpadek" test "$cache" = STALE

# <b>Hlídá se „nedostane", ne konkrétní číslo.</b> Který kód přijde, závisí
# na tom, jestli má nginx adresu zastaveného kontejneru ještě v záznamu
# resolveru (`valid=10s`): uvnitř té lhůty se na ni marně připojuje a vrátí
# 504, po ní jméno nepřeloží a vrátí 502. Obojí splňuje to, co tenhle oddíl
# tvrdí; test na 502 padal jednou za čas na závodu s tou lhůtou, aniž by se
# cokoliv pokazilo (16. 10. 2026).
get /vypadek -H "Cookie: op_token=x"
ma "přihlášený starou stránku NEDOSTANE" test "$stav" -ge 500
# Strop na sestavení spojení (`proxy_connect_timeout`, default.conf). Bez
# něj platí výchozí minuta nginxu a tenhle požadavek ji na mrtvé adrese
# celou vyčká. Mez je velkorysá schválně: hlídá se, že strop existuje,
# ne jak přesně je nastavený.
ma "…a nečeká se na to minutu" test "$trvalo" -lt 15
ma "…a nedostane ani její tělo" nenese_vykresleni "$telo" "$ocekavane_vypadek"

get /nikdy-nenavstivena
ma "nenavštívená adresa se nevymyslí" test "$stav" -ge 500

# Zdraví nginxu samotného musí přežít i mrtvý web — jinak by Traefik
# vyřadil ze směrování i cache, která má zbytek zakrývat (poučení 44).
get /cache-zdravi
ma "zdraví cache drží i při mrtvém webu" test "$stav" = 200

if [ "$chyb" -gt 0 ]; then
  echo "Selhalo: $chyb"
  docker logs op-cache-test-cache 2>&1 | tail -20
  exit 1
fi
echo "Všechno prošlo."

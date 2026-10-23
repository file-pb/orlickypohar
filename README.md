# orlickypohar

Seriál závodů plachetnic na Orlíku — web, veřejné výsledky, administrace
a mobilní přístup. .NET 10, Minimal API, PostgreSQL, vertikální řezy.

**Přicházíš sem poprvé nebo z jiného stroje?** Začni oddílem
[Rozjezd na jiném stroji](CLAUDE.md#rozjezd-na-jiném-stroji) — je tam,
co doklonovat, co musí být nainstalované a jak ověřit, že to drží.

Doménový model, stav a co dál jsou v [docs/PLAN.md](docs/PLAN.md), konvence
kódu v [CLAUDE.md](CLAUDE.md). Co dělat, když o závodním víkendu něco leží,
je v [docs/DEN-ZAVODU.md](docs/DEN-ZAVODU.md). Provoz, server a poučení
z chyb žijí v repozitáři
[file-pb/platform](https://github.com/file-pb/platform).

## Rychlý start

```bash
docker compose up --build
```

- API: <http://localhost:8080>
- OpenAPI UI: <http://localhost:8080/scalar/v1>
- Seq (logy): <http://localhost:5341>

**Na Filipově pracovním Macu tohle nefunguje** — Docker Hub je z firemní sítě
nedostupný, takže se nestáhne ani PostgreSQL. Web se dá vyvíjet proti
`tools/fake-api.py`, integrační testy běží v CI. Podrobněji
[JINY-STROJ.md](https://github.com/file-pb/platform/blob/main/docs/JINY-STROJ.md).

Bez Dockeru: spusť si Postgres a pak `dotnet run --project src/OrlickyPohar.Api`.
Vývojový connection string je v `appsettings.Development.json` — v kontejneru se
místo něj načte soubor z `/run/secrets`, viz [secrets/README.md](secrets/README.md).

## Model

```
Serie ─┬─ Kategorie          Race / Nad7m / Pod7m
       ├─ Prihlaska          loď v ročníku, v jedné kategorii  ← nositel bodů
       └─ Zavod              jedno z devíti zastavení
           ├─ Ucast          která loď přijela a kdo ji vezl
           └─ Rozjizdka
               └─ Vysledek   účast × rozjížďka
```

Ve `Vysledek` je jen to, co se stalo — pořadí, časy, kód. **Body se počítají,
neukládají**, aby šel seriál kdykoliv přepočítat podle změněných pravidel.

## Nahrání ročníku

Ročník nahrává jeden příkaz. Token se čte **zevnitř běžícího kontejneru**,
protože tajemství na serveru patří uživateli, pod kterým běží aplikace
(UID 1654) — ne `deploy`, kterým se přihlašuješ. `cat` na soubor v
`secrets/` proto skončí na `permission denied`.

```bash
python3 tools/gen-mock.py --publikovat > /tmp/rocnik.json
scp -q /tmp/rocnik.json deploy@178.105.62.172:/tmp/rocnik.json
ssh deploy@178.105.62.172 'C=$(docker ps --format "{{.Names}}" | grep orlickypohar | grep -m1 -- -app); \
  TOKEN=$(docker exec "$C" cat /run/secrets/Import__Token); \
  curl -s -X POST https://orlickypohar-api.klihovka.cz/import/serie \
    -H "X-Import-Token: $TOKEN" -H "content-type: application/json" \
    --data-binary @/tmp/rocnik.json; echo; rm -f /tmp/rocnik.json'
```

**Přepínač `--publikovat` tam musí být.** Soubor v `data/` je schválně
nepublikovaný, aby se vymyšlená data nedala omylem vystavit — na produkci
je ročník naopak publikovaný a web u něj ukazuje pruh, že data nejsou
skutečná. Import stav publikace **přepisuje**, takže nahrání doslovného
souboru z `data/` by ročník i všech osm zastávek schovalo a web by hlásil
„zatím žádný ročník". Není to kosmetika, ale výpadek — proto je to
přepínač generátoru a ne ruční úprava souboru před odesláním.

Odpověď má u každé skupiny počty; `"clanky":{"nove":8,...}` znamená, že
se založilo osm článků — tolik jich generátor vyrábí (8. 10. 2026).

Import je **idempotentní**: druhé odeslání téhož souboru vrátí samé nuly
ve `nove` a nic nepřidá. Opravený výsledek přepíše původní řádek. Buď projde
celá dávka, nebo se neuloží nic — napůl naimportovaný ročník je horší než
žádný, protože chybějící výsledky nikdo nepozná.

**Idempotence ale nechrání před zastaralým souborem.** Soubor připravený
jednou přepíše výsledky a publikaci, které vznikly během sezóny — obojí jsou
platná data a import to sám nepozná. Proto má tři režimy (`?rezim=`):

| Režim | Co dělá |
|---|---|
| `nahled` | **Nic neuloží** a vrátí, co by se stalo, i s kolizemi a otiskem ročníku |
| `bezpecny` | Výchozí. Uloží, ale **odmítne celou dávku** (`409`), kdyby přepsala výsledky zapsané v aplikaci, stáhla publikaci nebo vrátila stav zápisu |
| `oprava` | Přepíše i je. **Vyžaduje `otisk`** z náhledu |

Dokud se do ročníku zapisovalo jen souborem, projde příkaz výš bez dalšího.
Jakmile někdo uloží výsledky v aplikaci, skončí na `409` — a tahle dvojice
příkazů je cesta dál: nejdřív se podívat, co by se změnilo, a pak to
potvrdit otiskem z náhledu.

```bash
# 1) co by se stalo (nic se neuloží)
curl -s -X POST "$API/import/serie?rezim=nahled" \
  -H "X-Import-Token: $TOKEN" -H "content-type: application/json" \
  --data-binary @/tmp/rocnik.json | python3 -m json.tool

# 2) potvrzení s otiskem z náhledu
curl -s -X POST "$API/import/serie?rezim=oprava&otisk=$OTISK" \
  -H "X-Import-Token: $TOKEN" -H "content-type: application/json" \
  --data-binary @/tmp/rocnik.json
```

**Otisk platí jen do další změny.** Pokrývá revize sad výsledků, stav zápisu
a publikaci; když mezi náhledem a potvrzením někdo zapíše výsledky, vrátí
import `409` a náhled se musí udělat znovu. Bez něj by se potvrzovalo něco
jiného, než co člověk viděl. Podrobně v [docs/PLAN.md](docs/PLAN.md), oddíl
*Zastaralý soubor ročníku*.

`data/2026-nanecisto.json` má **skutečná jména lodí a vymyšlené výsledky**.
Existuje proto, aby se model dal prověřit dřív, než dorazí výsledky rozjížděk
od rozhodčího; až přijdou, soubor se nahradí a struktura zůstane.
`data/2026-poradi-rozhodci.json` je naproti tomu **skutečný sešit rozhodčího** —
ověřuje proti němu `SerieTests`.

## První správce

Kuře a vejce: obrazovka, která uděluje role, sama roli správce vyžaduje —
a na začátku ji nemá nikdo. Proto udělení **prvního** správce projde i na
importní token, ale jen dokud v ročníku žádný správce není. Po prvním
použití se ta cesta sama zavře.

Nejdřív se **musí ten člověk aspoň jednou přihlásit** na webu: účet vzniká
přihlášením a rolí se pozvat nedá.

```bash
ssh deploy@178.105.62.172 'C=$(docker ps --format "{{.Names}}" | grep orlickypohar | grep -m1 -- -app); \
  TOKEN=$(docker exec "$C" cat /run/secrets/Import__Token); \
  curl -s -X POST https://orlickypohar-api.klihovka.cz/sprava/serie/2026/opravneni \
    -H "X-Import-Token: $TOKEN" -H "content-type: application/json" \
    -d "{\"email\":\"filip@priklad.cz\",\"role\":\"Spravce\"}"; echo'
```

Dál už se role udělují přihlášeným správcem — `$PRISTUP` je jeho přístupový
token:

```bash
curl -X POST localhost:8080/sprava/serie/2026/opravneni \
  -H "authorization: Bearer $PRISTUP" -H "content-type: application/json" \
  -d '{"email":"poradatel@priklad.cz","role":"Organizator","zavod":"radavska-regata"}'

curl localhost:8080/sprava/serie/2026/opravneni -H "authorization: Bearer $PRISTUP"
curl -X DELETE localhost:8080/sprava/serie/2026/opravneni/3 -H "authorization: Bearer $PRISTUP"
```

Bez `zavod` platí role na celý ročník i na všechny jeho zastávky, s ním jen
na tu jednu. `Rozhodci` a `Spravce` jdou udělit **jen na ročník**. Posledního
správce ročníku odebrat nelze — jinak by se do administrace nedostal nikdo.

## Administrace

Za přihlášením je sedmnáct stránek (`web/app/sprava`). Skoro všechny jsou
**serverové a bez javascriptu** — chodí se tam zřídka a často z telefonu na
břehu. Výjimkou je zápis z vody: cílová obrazovka a dvě části konceptu
z telefonu javascript potřebují (`"use client"` v
`web/app/sprava/[serie]/vysledky/[zavod]/[cislo]/`).

| Kde | Kdo | Co |
|---|---|---|
| `/sprava/{serie}/opravneni` | rozhodčí a správce | uděluje role; rozhodčí jen organizátora a editora na jednu zastávku, seznam účtů vidí správce |
| `/sprava/{serie}/clanky` | editor a výš | píše novinky |
| `/sprava/{serie}/kalendar` | rozhodčí, organizátor | zakládá zastávky, termíny, stavy, zveřejnění |
| `/sprava/{serie}/vysledky` | rozhodčí, organizátor | workflow výsledků po rozjížďkách |
| `/sprava/{serie}/lode` | správce | kdo patří ke které lodi, kapitánství od kódu |
| `/sprava/{serie}/prihlasky/{zavod}` | rozhodčí, organizátor | kdo přijel, pozdní loď, startovné |
| `/sprava/{serie}/smernice/{zavod}` | rozhodčí, organizátor | vyvěšuje a stahuje plachetní směrnice |
| `/sprava/{serie}/boje/{zavod}` | rozhodčí, organizátor | pípne polohu bóje z telefonu, přenastaví, sebere |
| `/sprava/{serie}/poradatele/{poradatel}` | rozhodčí, organizátor | medailonek klubu, společný všem ročníkům |
| `/sprava` a `/sprava/{serie}` | kdokoliv s rolí | rozcestníky — vedou úkolem a jmenují roli |
| `/sprava/opravneni-webu` | správce webu | role platné ve všech ročnících |
| `/sprava/naklady` | správce webu | co web stojí |

**Kalendář:** plánovaný → potvrzený (rozhodčí) → vypsaný → odjetý
(organizátor), nebo zrušený. Po jednom kroku, oběma směry; rozhoduje cílový
stav, ne směr. Pořadí zastávek se přepočítává podle data a přesun potvrzené
zastávky si pamatuje původní termín.

**Výsledky:** navrženo → ověřeno → schváleno → potvrzeno, k tomu vrácení
k revizi s povinným důvodem a eliminace. Zapisuje pořadatel, ověřuje
a schvaluje rozhodčí, potvrzuje a publikuje správce; správce smí přeskočit
dopředu, couvnout o stupeň nesmí nikdo. **Publikace je vlastní příznak**,
takže potvrzený výsledek smí zůstat neveřejný a publikovaný se smí vrátit
k revizi.

```bash
curl localhost:8080/sprava/serie/2026/zastavky -H "authorization: Bearer $PRISTUP"
curl -X POST localhost:8080/sprava/serie/2026/vysledky/radavska-regata/rozjizdky/1/stav \
  -H "authorization: Bearer $PRISTUP" -H "content-type: application/json" \
  -d '{"stav":"Overeno"}'
```

**Heslo ani e-mail aplikace nespravuje.** OIDC standardizuje přihlášení, ne
správu účtu: heslo naší aplikací neprojde a změna e-mailu se ověřuje poštou.
Profilová nabídka proto jen odkazuje na samoobsluhu poskytovatele —
adresou z `IDENTITA_UCET_URL`, takže web pořád neví, kdo poskytovatel je.

## Veřejné čtení

```bash
curl localhost:8080/serie                              # publikované ročníky
curl localhost:8080/serie/2025                         # ročník s kategoriemi a přihláškami
curl localhost:8080/serie/2025/zavody/zahajeni-sezony  # zastávka s rozjížďkami a výsledky
curl localhost:8080/serie/2025/poradi                  # průběžné pořadí po kategoriích
```

Nepublikovaný ročník i nepublikovaná zastávka vracejí **404, ne 403** —
„existuje, ale neukážu" je taky informace. Zastávka se vydává i s pravidly
závodu (škrty, vyhodnocení, koeficient), bez nichž se pořadí nedá zkontrolovat.

**Body počítá server**, ne web: zastávka je vydává vedle syrových výsledků
a průběžné pořadí vydává obě čísla — součet i součet po škrtu, protože
rozhodčí vede obojí a rozdíl mezi nimi rozhoduje. Do pořadí jdou jen zastávky
ve stavu `Odjety`.

**Výsledky se vydávají jen z publikovaných rozjížděk.** Nepublikovaná
rozjížďka na stránce zůstane, ale prázdná — „jelo se" je pravda, nepotvrzené
pořadí pravda být nemusí. Eliminovaná zmizí úplně, protože neplatí nikde.
Import nahrává rozjížďky jako potvrzené a veřejné: je to zápis ze sešitu
rozhodčího, ne návrh.

## Web

```bash
tools/fake-api.py &          # falešné API z mock dat, port 8080
npm --prefix web run dev     # http://localhost:3000
```

**Přihlášený vývoj.** Bez proměnných identity se přihlášení vůbec nenabízí,
takže celá správa zůstane neviditelná. Pro lokální zkoušení stačí `.env.local`
s nesmyslnými hodnotami — na poskytovatele se nikdo neptá a mock token
nerozbaluje:

```bash
cat > web/.env.local <<'KONEC'
IDENTITA_AUTHORITY=http://localhost:9/neexistuje
IDENTITA_CLIENT_ID=vyvoj
WEB_URL=http://localhost:3000
KONEC
```

**Blesky jdou posunout do minulosti.** Pruh s bouřkou nad regatou
(`web/lib/blesky.ts`) se ukazuje jen v den regaty a jen když družice něco
vidí — tedy od května do září. Mimo sezónu se dá zobrazit jedině snímkem
z archivu:

```bash
echo 'BLESKY_TERMIN=2026-06-20T15:00:00Z' >> web/.env.local
```

Archiv vrstvy sahá k 30. 5. 2025 a chodí po pěti minutách. Ke zkoušení je
ještě potřeba regata s dnešním datem — v mocku stačí přepsat `datum`
u některé zastávky. Pozor na to, že `unstable_cache` drží výsledek i přes
restart dev serveru; po změně termínu smaž `web/.next`.

**Kdo je přihlášený, řídí cookie `op_token`** (nebo hlavička
`Authorization: Bearer <jméno>` při volání API přímo). Mock zná tahle jména
a jiné **odmítne** — překlep by jinak tiše udělal správce:

| Jméno | Kdo to je |
|---|---|
| `filip`, `vyvoj` | správce ročníku |
| `milos` | pořadatel jedné zastávky |
| `dana` | správkyně celého webu **bez role v ročníku** |
| `jana` | majitelka lodi, žádná role ve správě |
| `petr` | posádka lodi, **která nemá kapitána** |

Víc identit není rozmar. Snímek zápisu k porovnání je jeden na zapisovatele,
takže **dva zapisovatele u cíle nejde vyzkoušet pod jedním účtem**. Role na
celý web bez role v ročníku je stav, kvůli kterému vznikl rozcestník správy.
A kapitánské obrazovky se nedají zkusit z účtu, který loď nemá.

**Osobní cesty mock umí celé** — `/ja/lode`, vystavení a uplatnění kódu,
připojení k lodi i nároky. Nejsou to jen tvary odpovědí: platnost kódu je
patnáct minut, propadlý kód dává tutéž hlášku jako vymyšlený, kód i přijatý
nárok zakládají **posádku, nikdy kapitána**, a odmítnutí sedí na API včetně
hlášek. Jeden kód (`PROSLY`) je nasazený už propadlý, aby se při zkoušení
nečekalo čtvrt hodiny.

Úvodní stránka nese velkou fotku a nad ní **živou větu spočítanou z dat** —
kolik zastávek je odjeto, kdo vede v kategoriích a která zastávka je další.
Když se nenačte, prostě tam není; kvůli jedné větě nemá padat landing.
Fotky leží ve `web/public/foto/` a jsou součástí image, ne obsah v R2:
je to podklad stránky, ne nahraný soubor.

Web renderuje serverem, protože blog a výsledky potřebují SEO. Adresu API
bere z `API_URL`; výchozí je `http://localhost:8080`, takže proti falešnému
i skutečnému lokálnímu API funguje bez nastavování.

`tools/fake-api.py` servíruje mock ročník ve stejných tvarech jako skutečné
API, jen se tváří, že je publikovaný. Bodování má **opsané** z `Bodovani.cs`,
protože jinak by nešly stránky s body vidět; pravda o pravidlech leží v C#
a hlídají ji testy. Existuje proto, že **lokálně se
databáze rozjet nedá** — Docker Hub je z pracovního stroje nedostupný — a bez
něj by se stránky nedaly vidět jinak než nasazením.

Požadavky mlčí, dokud se o ně neřekne: `OP_LOG=1 python3 tools/fake-api.py`
vypisuje každý na stderr jako `REQ "GET /ja/lode/3/naroky HTTP/1.1" 200`.
Je to jediný způsob, jak ověřit, **kolik** dotazů která obrazovka posílá —
a bez něj se to ověřit nedá ani omylem: grep v tichém logu vrátí nulu
stejně, jako kdyby se dotaz přestal posílat. Počítá se `grep -c "^REQ "`;
chyby mají vlastní předponu `CHYBA`, aby `send_error` nenafukoval součet
o řádky, které žádné požadavky nejsou. Značky vkládané do souboru zvenčí
(`echo >> log`) si mock přepíše, protože píše na svůj offset — měř rozdílem
počtu řádků před a po, ne vloženými značkami.

## Appka

Čtecí appka pro telefon (Expo, React Native) — ročníky, kalendář, průběžné
pořadí, zastávka. Nepotřebuje přihlášení, protože čte totéž veřejné API
jako web.

```bash
npm --prefix app run telefon   # vývojový server pro Expo Go, i s přihlášením
npm --prefix app run apk       # postaví APK k rozdávání na serverech Expa
```

Podrobnosti a pasti (Expo Go chce od SDK 57 přihlášení na obou stranách,
Mac umí nabídnout špatné síťové rozhraní) jsou v [app/README.md](app/README.md).
APK ke stažení najdou lidé na `/appka`; adresu posledního buildu drží
proměnná `APK_URL`, viz níž.

## Zátěž

```bash
tools/zatez.py                                                    # proti falešnému API
tools/zatez.py --cil https://orlickypohar-api.klihovka.cz --rps 20 --doba 30
```

Čte, nikdy nezapisuje — zátěž na importu nebo na workflow by měnila skutečná
data. Měří pět veřejných cest a **průběžné pořadí je z nich zdaleka
nejdražší**: počítá se z celého ročníku při každém dotazu.

**Strop nad 30 dotazy za vteřinu není náš.** Před API stojí Traefik
s `ratelimit-standard` (30/s v průměru, špička 100, počítáno podle
`Cf-Connecting-Ip`, tedy podle jedné adresy). Nad tím se měří limiter, ne
aplikace, a pozná se to podle 429 ve výpisu. A ještě před ním je Cloudflare:
co odpoví z cache, do API vůbec nedojde.

Návratový kód je nenulový, jakmile se objeví něco jiného než 200.

## Klient API

```bash
packages/api-client/generuj.sh          # z produkce
API=http://localhost:8080 packages/api-client/generuj.sh
```

Typy pro web i appku se **generují z OpenAPI dokumentu**, ne píšou ručně:
skript stáhne dokument, uloží jeho snímek do `packages/api-client/openapi.json`
a vyrobí `web/lib/schema.d.ts` a `app/src/lib/schema.d.ts`. Snímek se
commituje schválně — změna kontraktu je pak vidět v diffu, ne až v chybě
klienta.

Dokument se stahuje z **běžícího API**, protože aplikace při startu pouští
migrace a bez databáze nenaběhne; na pracovním stroji databáze nejede.

## Testy

```bash
dotnet test --filter "Category!=Integracni"   # bez Dockeru, běží všude
dotnet test                                    # včetně Testcontainers
```

`ModelTests` drží model proti migracím, `KontraktTests` tvar importního
souboru, `BodovaniTests` a `SerieTests` bodovací pravidla — všechno bez
databáze. Značku `Category=Integracni` nese dvacet tři tříd (8. 10. 2026) —
mimo jiné `ImportTests`, `CteniTests`, `PoradiTests` a celá rodina
`*SpravaTests` — a potřebují Docker; na pracovním stroji se pustit nedají.
Běží ve vlastní úloze CI `integrace`, na kterou nasazení od 6. 10. 2026
**čeká**: dokud byl deploy krokem buildu, běžel vedle integrace, takže
červená integrace mohla znamenat už nasazenou vadnou verzi
(úloha `nasazeni` v `.github/workflows/build-deploy.yml` má `needs: [build, appka, integrace]`).

## Adresy

| Adresa | Co tam běží |
|---|---|
| `orlickypohar.klihovka.cz` | veřejný web |
| `orlickypohar-api.klihovka.cz` | API a import |

Hezká adresa patří webu, ne rozhraní. Jméno API je jednoúrovňové schválně:
bezplatný certifikát Cloudflare pokrývá jen `*.klihovka.cz`, takže na
`api.orlickypohar.klihovka.cz` by TLS selhalo dřív, než požadavek dojde
na server. Web mluví s API **vnitřní sítí**
(`http://orlickypohar-api:8080`), ne přes internet — jinak by to byla zbytečná
cesta ven a zpátky přes Traefik.

**Jméno `app` k tomu nepoužívej.** Web je i ve sdílené síti `edge` a Docker
jména ze všech sítí kontejneru slučuje; `app` tam má i telemetrie. Web se pak
ptal střídavě cizí aplikace, dostával 404 a ročník vypadal jako neexistující
(zjištěno 15. 9. 2026). API má proto ve vnitřní síti alias, který jinde není.

## Nasazení

`git push` do `main` → GitHub Actions postaví image → GHCR → nasazovací háček
na serveru si ji stáhne.

Potřebuje dvě věci v nastavení repozitáře: proměnnou `DEPLOY_WEBHOOK`
(adresa háčku) a tajemství `DEPLOY_TOKEN`. Obojí vypíše
`scripts/install-deploy-hook.sh` v repozitáři platformy. **Když proměnná
chybí, krok nasazení se tiše přeskočí** a na serveru běží dál stará verze —
což se pozná jen tím, že se nová funkce neobjeví.

## Kvóty CI

Audit kvót z 10. 10. 2026 (`platform/docs/KVOTY.md`) našel, že **nejbližší
zeď nejsou registry obrazů, ale minuty Actions**: pohár spotřeboval 4 707
fakturovatelných minut za třicet dní proti bezplatné hladině 2 000 **na celý
účet**. Úloha `build` z toho udělala 2 874 minut — 558 běhů po 5,2 minuty.
Actions cache repozitáře zároveň stála na 10,2–10,5 GB při limitu 10 GB,
tedy se trvale vytloukala.

Čtyři opravy v `build-deploy.yml`, všechny převzaté ze šablony
`service-template`, protože tam chyba vznikla a odtud se kopíruje:

| Co | Proč |
|---|---|
| `scope=api/web/landsat/cache` u každé vrstvy cache | Bez `scope` jdou všechny čtyři obrazy do klíče `buildkit` a **přepisují se**; je to zdokumentované chování buildx. Index pro `main` měl verzi #1151 při 37 živých záznamech — přepsaný tisíckrát. Platilo se 10,6 GB blobů a kupovala se z nich cache pro poslední ze čtyř obrazů. |
| cache `~/.nuget/packages` v `build` i `integrace` | `api.nuget.org` škrtí **po IP, a tu runner GitHubu sdílí s cizími projekty** — 9. 10. 2026 na tom jeden build spadl na `Connection reset by peer`. Je to tatáž zeď jako limit Docker Hubu, jen o vrstvu dál a s horší hláškou: resetnuté spojení vypadá na chybu sítě. |
| `cache: 'npm'` u `setup-node` v `appka` | Totéž pro `registry.npmjs.org`. Cesta k lockfilu se musí napsat, appka není v korzeni. |
| skupina souběhu na celém workflow | Druhý push do téže větve ten předchozí **zruší**. Na `main` se neruší nic — tam je každý běh nasazení. Nekoliduje se skupinou `nasazeni-produkce` u úlohy `nasazeni`, ta řeší jinou věc: jedno nasazení naráz přes všechny cesty do produkce. |

**Retence obrazů v GHCR** je samostatná úloha `uklid-balicku.yml`. Každý push
do `main` pošle do registru novou verzi a dřív ji **nic nemazalo** — čtyři
obrazy po 90–450 MB a 260 pushů za měsíc. Maže se podle věku (starší 30 dnů),
vždycky zůstane 10 nejnovějších a všechno se značkou `latest`; zrcadlo se
vynechává, tam je každá verze jediná kopie základního obrazu. **Ruční
spuštění je nanečisto**, plánované maže — mazání verze je nevratné.

Jména balíčků jsou v `BALICKY` **napsaná, ne zjištěná**: výpis balíčků
uživatele (`/users/{owner}/packages`) pod `GITHUB_TOKEN` vrací `400 Invalid
argument`, protože je to instalační token a endpoint chce uživatelský
(změřeno 10. 10. 2026). Čtení balíčku a jeho verzí token zvládne, takže se
každé napsané jméno před úklidem ověří proti registru — překlep by jinak
znamenal, že se tiše neuklidí nic. **Jestli na samotné smazání token stačí,
se ještě neví**; na 403 je potřeba osobní token s `delete:packages`
v tajemství `GHCR_UKLID_TOKEN`. Proto je ruční běh nanečisto: zjistí se to
bez následků.

**Zrcadlo vyrábí dvě značky na obraz.** Pohyblivá (`node:22-alpine`) ukazuje
na poslední přesyn a je pro ruční práci; **datovaná**
(`node:22-alpine-2026-10`) je nehybná a berou ji Dockerfily. Bez toho by
měsíční přesyn tiše změnil základ pod nohama: tentýž commit by se před ním
a po něm postavil z jiného obrazu. `FROM ${ZRCADLO}/...` složený z `ARG`
navíc **přestal být čitelný pro Dependabota**, takže o posunu základního
obrazu neupozorní ani ten — proto přesyn hlásí `::notice::`, které datum se
má přepsat. Jsou to tři místa: `web/Dockerfile`, `jobs/landsat/Dockerfile`,
`deploy/cache/Dockerfile` a proměnná `POSTGRES_IMAGE` v `build-deploy.yml`.

## Proměnné prostředí

| Kde | Co | Význam |
|---|---|---|
| `/run/secrets/ConnectionStrings__Postgres` | soubor | Povinné. Tajemství nepatří do proměnných prostředí — `docker inspect` je ukáže každému s přístupem k daemonu. |
| `Serilog__WriteTo__1__Args__serverUrl` | prostředí | Adresa Seq, volitelné. |
| `ASPNETCORE_HTTP_PORTS` | prostředí | Port, výchozí 8080. |
| `API_URL` | web | Adresa API pro server-side rendering. V provozu vnitřní `http://orlickypohar-api:8080` — ne `app`, to jméno má na sdílené síti i telemetrie. |
| `UKAZKOVE_SERIE` | web | Slugy ročníků s **vymyšlenými výsledky**, oddělené čárkou. Web u nich ukáže pruh, že data nejsou skutečná — **jen na stránkách toho ročníku** a na úvodu, který z nich bere pořadí (`patriPruh` v `web/app/ukazka.tsx`). Až dorazí skutečné výsledky, řádek se smaže. |
| `APK_URL` | web | Adresa posledního buildu appky pro stránku `/appka`. **Každý build má jinou** — po `npm --prefix app run apk` se přepíše v `deploy/docker-compose.yml`. Když se zapomene, stránka tiše nabízí předchozí build. |
| `KONTAKT_UDAJE` | web | E-mail pro žádosti o osobní údaje; ukáže se na `/osobni-udaje`. **Prázdná je povolený stav** — stránka o adrese mlčí a pošle čtenáře za pořadatelem regaty. |
| `IDENTITA_UCET_URL` | web | Samoobsluha poskytovatele identity — heslo, e-mail, druhý faktor. Vede na ni položka „Účet a heslo" v profilové nabídce; bez proměnné se nenabízí. **Adresa je v konfiguraci, ne v kódu**, aby výměna poskytovatele neznamenala změnu webu. |
| `EXPO_PUBLIC_API_URL` | appka | Adresa API při vývoji; výchozí je produkce. |

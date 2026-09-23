# Konvence tohoto repozitáře

**Orlický pohár** — seriál závodů plachetnic na Orlíku. Web, veřejné výsledky,
administrace, nativní appka s upozorněními a záznamem trasy.

**Než začneš cokoliv navrhovat, přečti si [docs/PLAN.md](docs/PLAN.md).** Je
tam doménový model i důvody, proč vypadá takhle, a rozhodnutí, která už padla.

## Rozjezd na jiném stroji

Tenhle oddíl je psaný pro agenta, který sem přijde bez jakéhokoliv kontextu.
Nepředpokládá nic kromě `git`, `ssh` a účtu na GitHubu.

**Repozitáře jsou privátní.** Bez přihlášení se nenaklonují a nic dalšího
nedává smysl zkoušet.

```bash
gh auth status
git clone git@github.com:file-pb/orlickypohar.git ~/Developer/GitHub/orlickypohar
git clone git@github.com:file-pb/platform.git   ~/Developer/GitHub/platform
scp deploy@178.105.62.172:/opt/platform/.env    ~/Developer/GitHub/platform/.env
```

Platformu potřebuješ vždycky: žijí v ní pravidla provozu, runbooky
a poučení z minulých chyb. Tenhle repozitář popisuje **jen konvence kódu**.

**Co musí být na stroji** (ověřeno 7. 9. 2026 v této kombinaci):

| Nástroj | Verze | K čemu |
|---|---|---|
| .NET SDK | 10.0 | API a testy |
| Node | 22+ (běží na 24) | web |
| `gh` | 2.x, přihlášený | CI, tajemství, sloučení |
| ssh klíč k `deploy@178.105.62.172` | | server, tajemství, DNS |

Rychlé ověření, že to celé drží:

```bash
dotnet test --filter "Category!=Integracni"     # musí projít bez Dockeru
ssh deploy@178.105.62.172 'docker ps'           # musí vypsat kontejnery
curl -s https://orlickypohar-api.klihovka.cz/health   # musí vrátit Healthy
```

**Kam se dívat dál**

| Otázka | Kde je odpověď |
|---|---|
| Co je hotové a co dál | [docs/PLAN.md](docs/PLAN.md) — oddíly *Stav* a *Kde se pokračuje* |
| Proč model vypadá takhle | [docs/PLAN.md](docs/PLAN.md) |
| Čím se liší pracovní Mac | [platform/docs/JINY-STROJ.md](https://github.com/file-pb/platform/blob/main/docs/JINY-STROJ.md) |
| Kde co běží a co když spadne | [platform/docs/PROVOZ.md](https://github.com/file-pb/platform/blob/main/docs/PROVOZ.md) |
| Chyby, které už jednou stály čas | [platform/docs/POUCENI.md](https://github.com/file-pb/platform/blob/main/docs/POUCENI.md) |

**Co na novém stroji nepůjde a je to v pořádku:** integrační testy
(`Category=Integracni`) potřebují Docker Hub, který je z firemní sítě
nedostupný. Běží v CI. Na stroji s běžnou sítí jdou pustit i lokálně.

## Kde je zbytek

Tenhle soubor popisuje **jen konvence kódu**. Server, nasazení, zálohy,
bezpečnost a minulé chyby žijí v repozitáři
[file-pb/platform](https://github.com/file-pb/platform) — lokálně obvykle
v `~/Developer/GitHub/platform`. Když potřebuješ kontext, který tu není,
začni jeho `CLAUDE.md`; odkazuje na zbytek.

Nejčastěji se hodí:

- `docs/POUCENI.md` — chyby, které už jednou stály čas. **Než začneš hledat
  příčinu selhání, koukni sem** — je slušná šance, že je popsaná i s opravou.
- `docs/PROVOZ.md` — kde co běží a co dělat, když to spadne.
- `docs/ARCHITEKTURA.md` — proč je to postavené takhle a co je odložené.

V `platform` jsou taky skilly `/stav`, `/novy-projekt`, `/pouceni` a `/audit`.

## Struktura

**Vertikální řezy, ne vrstvy.** Jedna funkce = jedna složka ve `Features/`.
V ní leží endpointy, handlery, DTO i entita pohromadě. Žádné
Domain/Application/Infrastructure — do toho se pouštěj teprve tehdy, až projekt
uživí druhého vývojáře.

```
src/OrlickyPohar.Api/
  Data/AppDbContext.cs        jediný DbContext
  Features/Serial/            série, kategorie, přihlášky — celoroční rovina
  Features/Lode/              lodě a osoby
  Features/Zavody/            závod, účast, rozjížďka, výsledek; kalendář,
                              přihlášky na zastávku, zápis a workflow výsledků,
                              zápis z vody: start, dojezdy s časem, poznávací
                              znak, fotka papíru a snímky obou zapisovatelů
  Features/Bodovani/          body závodu z rozjížděk, škrty, pořadí seriálu
  Features/Import/            nahrání ročníku souborem, importní token
  Features/Clanky/            novinky a články, jejich psaní a správa
  Features/Poradatele/        pořadatel jako záznam s medailonkem
  Features/Fotky/             nahrané obrázky: přepočet do WebP, úložiště R2
  Features/Vodocet/           sběr stavu Orlíku z Povodí Vltavy po 10 min,
                              přítok a odtok za 24 h
  Features/Identita/          uživatel, vazby (issuer, subject), role, Prava
  Features/Sprava/            udělování oprávnění, seznam přihlášených účtů
  Program.cs                  složení aplikace, mapování řezů

web/                          veřejné stránky (Next.js, renderuje server)
  app/                        stránky podle cest
  app/sprava/[serie]/         administrace ročníku, serverová, bez javascriptu
  …/vysledky/[zavod]/[cislo]/cil   cílová obrazovka — jediné místo správy
                              s javascriptem, klepání v cíli bez něj nejde
  …/[cislo]/porovnani         zápisy dvou zapisovatelů vedle sebe
  lib/api.ts                  typovaný přístup k API, veřejné čtení
  lib/sprava.ts               volání administrace s tokenem; další lib/*.ts
                              po obrazovkách (kalendar, prihlasky, vysledky…)
  lib/oidc.ts                 přihlášení, sezení v cookie
  app/sprava/obrazek.tsx      nahrání a odebrání obrázku, společné článku
                              i pořadateli; lib/fotky.ts volá API
  lib/schema.d.ts             generované typy — needituj, viz packages/api-client
app/                          mobilní appka (Expo, jen čtení)
  src/app/                    obrazovky, cesty podle souborů
  scripts/telefon.sh          spuštění pro Expo Go, scripts/apk.sh build APK
  scripts/ikona.py            ikona a splash se kreslí kódem
packages/api-client/          generuj.sh — typy pro web i appku z OpenAPI
jobs/landsat/                 plánovaná úloha (Python): teplota hladiny
                              z Landsatu jednou denně do API
deploy/docker-compose.yml     celé nasazení; háček ho přenáší s každým pushem
deploy/cache/                 nginx s mikrocache před webem (image);
                              test/test.sh ověřuje pravidla v CI před nasazením
tools/fake-api.py             mock ročník jako API, pro vývoj webu bez databáze
tools/gen-mock.py             vyrábí ten mock; skutečná fakta o ročníku patří sem
```

**Typy klientů se negenerují ručně.** `packages/api-client/generuj.sh` stáhne
OpenAPI dokument z běžícího API, uloží jeho snímek a vyrobí `schema.d.ts` pro
web i appku. Ruční kopie tvarů se dřív musely držet v hlavě na dvou místech.

**Veřejné čtení pouští prohlížeč z libovolného původu** (CORS, jen GET). Web
renderuje serverem a nepotřeboval to; appka má webový cíl a běží jako origin.

**Převod dat pro zobrazení patří do webu, ne do API.** Výsledky API vydává
po rozjížďkách, protože tak vznikají; tabulka je potřebuje po lodích.
Mobilní appka bude chtít jiný tvar a přepisovat kvůli tomu API by znamenalo
měnit kontrakt kvůli jednomu klientovi.

`DbContext` volej z handleru přímo. Repository vrstvu nepřidávej — EF Core už
jednou abstrakcí nad databází je.

## Pravidla, která nejsou na výběr

Jsou tu proto, že se porušují snadno a opravují draho.

1. **Žádný stav na lokálním disku.** Soubory přes S3-kompatibilní API, nikdy do
   `wwwroot/`. Tohle je nejčastější důvod, proč se služba nedá přestěhovat.
2. **Konfigurace jen z proměnných prostředí.** Žádné `appsettings.Production.json`
   na serveru, žádné klikání v panelu.
3. **Session nikdy v paměti procesu.** Cookie nebo Redis — druhá replika
   in-memory stav neuvidí.
4. **Migrace v kódu**, ne ručně spuštěné SQL přes SSH.
5. **Standardní OIDC.** Aplikace nesmí vědět, kdo je poskytovatel identity.
6. **Fronty přenositelné** — tabulka v Postgresu nebo RabbitMQ. Ne Service Bus, ne SQS.

## Pojmenování

Doménové entity **česky bez diakritiky**: `Zavod`, `Rozjizdka`, `Prihlaska`,
`Vysledek`. Zbytek anglicky: `CreateZavodHandler`, `ZavodResponse`.

Rozjížďka není *heat* ani *race* a přihláška do ročníku není *entry* — přesný
protějšek neexistuje, takže by ho každý překládal jinak a pokaždé znovu.
S pořadatelem i rozhodčím se navíc mluví česky a kódy závodních pravidel
(`DNF`, `OCS`) se nepřekládají tak jako tak.

Řez se jmenuje `Serial`, ne `Serie`: třída `Serie` uvnitř jmenného prostoru
`Serie` se v C# pere sama se sebou.

## Pasti, na které jsme už šlápli

Nejsou to konvence, ale fakta o prostředí. Každá stála čas.

**Časy do databáze patří v UTC.** Npgsql odmítne zapsat `DateTimeOffset`
s jiným posunem než nula do `timestamp with time zone`. Skutečná data mají
`+02:00`, takže import bez `ToUniversalTime()` padne až uprostřed zápisu.
Test s letním posunem to hlídá.

**V kontrolách zdraví piš `127.0.0.1`, ne `localhost`.** V kontejneru se
`localhost` překládá nejdřív na `::1`, kde aplikace neposlouchá — kontejner
je pak `unhealthy`, přestože aplikace běží, a Traefik ho vyřadí.

**Alpine image nemá ICU a `StringComparer.CurrentCulture` v něm lže.**
Oficiální `dotnet/aspnet:*-alpine` jede s `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=true`,
takže porovnávání spadne na ordinální a `Č` se řadí až za `Z`. Vývojový stroj
i runnery CI ICU mají — pořadí lodí se stejnými body proto vycházelo v testech
jinak než na produkci a nešlo to poznat odnikud než z výsledkové tabulky.
Proto je v `Dockerfile` `icu-libs` a porovnává se explicitně přes `cs-CZ`;
Program.cs při startu upozorní, kdyby ICU zase zmizelo.

**Subdomény jen jednoúrovňové.** Bezplatný certifikát Cloudflare kryje
`*.klihovka.cz`, takže `api.orlickypohar.klihovka.cz` selže na TLS dřív, než
požadavek dojde na server. Proto `orlickypohar-api.klihovka.cz`.

**Integrační testy lokálně nejedou.** Docker Hub je z pracovního stroje
nedostupný, takže Testcontainers běží jen v GitHub Actions. Před pushem
pusť aspoň `dotnet test --filter "Category!=Integracni"`.

## Zdraví a nasazení

- `/health` je liveness — běží proces.
- `/health/ready` je readiness — drží i databáze. Používá to rolling deploy.
- Migrace databáze se pouští při startu. U jedné repliky je to správně; až budeš
  škálovat, přesuň ji do samostatného kroku v CI.

## Pozor na škálování

`IHostedService` s pravidelnou úlohou se spustí tolikrát, kolik běží replik.
Než přidáš druhou, dej tomu zámek v databázi nebo oddělený scheduler kontejner.

## Změny schématu

Rozšiř a stáhni, nikdy přejmenování v jednom kroku: přidej nový sloupec, zapisuj
do obou, přepni čtení, starý zahoď. Tři nasazení, žádná odstávka, každé vratné.

## Sdílený kód

Knihovnu zakládej až tehdy, kdy tu samou věc kopíruješ **potřetí**. Abstrakce
postavená ze dvou vzorků skoro vždy trefí špatnou hranici.

## Identita

Aplikace **nikdy** nepoužívá `sub` z tokenu jako svůj primární klíč uživatele.
Vždy vlastní interní `UserId` a tabulka vazeb `(issuer, subject) → UserId`.

Důvod: OIDC standardizuje přihlášení, ne migraci identity. Garantovaně unikátní
je až dvojice `(iss, sub)` a při změně poskytovatele se mění obojí. Hesla,
passkeys, MFA faktory ani sessions přes OIDC nepřenese nikdo. Tahle jedna tabulka
je rozdíl mezi výměnou poskytovatele a datovou migrací.

Kód specifický pro konkrétního poskytovatele drž v jednom adaptéru, ne rozsypaný
po aplikaci.

## Co platí pro aplikační kód a co pro platformu

Pravidlo „sdílet až po třetí kopii" platí **jen pro aplikační kód**.

Platformní kontrakty se distribuují centrálně od začátku, protože bezpečnostní
a provozní pravidla nesmějí ve třech projektech nezávisle zmutovat:
znovupoužitelné CI workflow, základní image, autentizační adaptér, tvar health
endpointů a formát logů.

## Provozní hygiena

Věci, které se snadno vynechají a projeví se až v provozu:

- **Rotace logů.** Docker ve výchozím stavu rotaci nemá a `json-file` zaplní disk.
- **Limity paměti a CPU per kontejner.** Bez nich vyhladoví jeden build celý stroj
  a OOM killer nemusí zabít viníka.
- **`CONNECTION LIMIT` per databázová role.** Několik skoro prázdných aplikací
  společně vyčerpá limit clusteru.
- **Alert na zaplnění disku** na 70 / 85 / 95 %.
- **Retenční pravidla od začátku**, ne až když je tabulka plná.

## Kontrakt platformy — typ `http-service`

Tenhle kontrakt platí pro **dlouho běžící HTTP službu**. Není univerzální:
poller, worker bez HTTP, jednorázová dávka ani MQTT broker do něj nezapadají
a nemají kvůli platformě provozovat falešný HTTP server. Typy `worker`
a `scheduled-job` přidej, až první takový workload skutečně vznikne.

1. poslouchá na portu z proměnné prostředí, výchozí 8080
2. má `/health` (liveness) a `/health/ready` (readiness)
3. běžnou konfiguraci bere z proměnných prostředí
4. **tajemství čte ze souborů v `/run/secrets`**, ne z prostředí — proměnné
   prostředí vidí přes `docker inspect` každý s přístupem k Docker daemonu
5. loguje strukturovaně na stdout
6. nedrží na lokálním disku nic autoritativního (dočasný scratch je v pořádku)

Splnit se to dá v libovolném jazyce na pár desítek řádků. Proto může být
HTTP služba v Pythonu nebo Go, aniž by se cokoliv v platformě měnilo.

## Rozpočet databázových spojení

`CONNECTION LIMIT` na roli sám o sobě nestačí — bez sladění s poolem jen změní
přetížení na náhodné chyby v aplikaci. Musí platit obojí:

    suma limitů rolí + rezerva pro správu  <=  max_connections
    pool max aplikace                      <=  connection limit její role

Rezervu pro migrace, monitoring a ruční zásahy drž mimo aplikační součet.

## Verzování platformních kontraktů

Centrální distribuce bez verzování jen přesouvá drift z kopírovaných souborů do
skryté vzdálené závislosti — a jedna změna pak rozbije všechny projekty při
příštím buildu.

Znovupoužitelné workflow a základní image proto **připínej na tag, ne na `main`**.
Aktualizace je vědomé PR, ne překvapení. Vlastní package framework je zatím
předčasný; stačí připnutí a changelog.

## Útěkový nácvik

Nácvik **nesmí mít právo měnit produkční kontrolní rovinu**. Idempotence chrání
před opakovaným během proti témuž cíli, ne před tím, že testovací běh sáhne na
produkční DNS, bucket, credentials nebo callback URL.

Nácvik má vlastní subdoménu, vlastní credentials, vlastní bucket a explicitní
`target=drill`. Obnova dat je při něm read-only nebo do odděleného úložiště.

Kadence čtvrtletně plus po zásadní změně platformy. Měsíčně by to při rozpočtu
pět hodin týdně sežralo skoro sedm týdnů ročně.

## Změny veřejného API

Vygenerovaný TypeScript klient chrání jen tu verzi, kterou zrovna stavíš.
**Mobilní aplikace zůstávají u uživatelů na telefonech** a po breaking změně
backendu se rozbijí.

Před prvním mobilním vydáním proto plat pravidlo: změny API jsou **jen
aditivní**, nebo se API verzuje. Nepotřebuješ na to framework, jen rozhodnutí.

## Idempotence importu

Ročník se nahrává souborem přes `POST /import/serie`. Druhé odeslání téhož
souboru **nesmí nic zduplikovat** — opravený výsledek se přepíše, nic nepřibude.

Idempotence stojí na **přirozených klíčích**, ne na umělém importním
identifikátoru: série podle slugu, závod podle slugu v sérii, rozjížďka podle
čísla v závodě, výsledek podle dvojice rozjížďka × účast. Sloupec „externí id"
by do schématu propsal tvar zdrojového souboru, a ten se s každým ročníkem mění.

Dvě věci na to navazují a nesmějí se rozvázat:

1. **Unikátní indexy** `(SerieId, LodId)` na přihlášce a `(RozjizdkaId, UcastId)`
   na výsledku. Bez nich by duplicitu odhalilo až rozdvojené pořadí v seriálu.
2. **Celá dávka, nebo nic.** Napůl naimportovaný ročník je horší než žádný,
   protože chybějící výsledky nikdo nepozná.

Známé omezení: osoby se párují podle jména a příjmení, lodě podle názvu. Dva
Jani Novákové v jednom ročníku splynou. Při velikosti startovního pole je to
únosné; alternativou by bylo vymýšlet lidem identifikátory, které nikde neexistují.

## Nasazení

Nasazuje CI, ne člověk. Push do `main` postaví **dvě image** (API a web),
zavolá nasazovací háček na serveru a ten je vymění — včetně
`deploy/docker-compose.yml` ze stejného commitu, takže nová proměnná nebo
tajemství dojede spolu s kódem.

Když nasazení selže po výměně compose, háček vrátí původní zpátky. Nové
tajemství ale musí na serveru **existovat předem**, jinak kontejner nenaběhne
— a musí patřit uživateli, pod kterým aplikace běží (UID 1654), ne `deploy`.

## Testy

Bez databáze a bez Dockeru, v CI běží první:

- **`ModelTests`** — model proti migracím.
- **`KontraktTests`** — tvar importního souboru a pravidla, která má mock
  dodržet (třeba že se škrtá až při čtyřech odjetých rozjížďkách).
- **`BodovaniTests`** — body závodu z rozjížděk, kódy, škrty. Čisté funkce.
- **`SerieTests`** — průběžné pořadí proti **skutečnému sešitu rozhodčího**
  (`data/2026-poradi-rozhodci.json`). Nejcennější zkouška, jakou ten kód má.

Značka `Category=Integracni`, potřebují Docker, běží jen v CI:

- **`ImportTests`** — idempotence a mazání proti reálnému PostgreSQL přes
  Testcontainers. Schválně ne in-memory provider: stojí to na unikátních
  indexech, které by fake databáze neověřila.
- **`CteniTests`** a **`PoradiTests`** — veřejné čtení a průběžné pořadí,
  hlavně hranice publikovanosti.
- **`VysledkySpravaTests`** — workflow výsledků a zápis z vody: dojezd
  s časem od startu, poznávací znak, celkové pořadí napříč kategoriemi
  a snímky dvou zapisovatelů.

`data/2026-nanecisto.json` má **skutečná jména lodí a vymyšlené výsledky**;
vyrábí ho `tools/gen-mock.py` s pevným seedem. Skutečná fakta o ročníku patří
do generátoru, ne do vygenerovaného souboru — jinak je příští běh přepíše.
`data/2026-poradi-rozhodci.json` je naproti tomu **skutečný sešit rozhodčího**.

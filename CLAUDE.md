# Konvence tohoto repozitáře

**Orlický pohár** — seriál závodů plachetnic na Orlíku. Web, veřejné výsledky,
administrace, nativní appka s upozorněními a záznamem trasy.

**Než začneš cokoliv navrhovat, přečti si [docs/PLAN.md](docs/PLAN.md).** Je
tam doménový model i důvody, proč vypadá takhle, a rozhodnutí, která už padla.

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
  Features/Zavody/            závod, účast, rozjížďka, výsledek
  Program.cs                  složení aplikace, mapování řezů
```

Doménové entity se jmenují **česky bez diakritiky** (`Zavod`, `Rozjizdka`),
zbytek anglicky (`CreateZavodHandler`, `ZavodResponse`). Důvod je v
[docs/PLAN.md](docs/PLAN.md) — rozjížďka ani přihláška nemají anglický
protějšek, který by dva lidi přeložili stejně.

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

Zdroj dat se jmenuje `Source`, ne `Device`. Zdrojem může být zařízení, poller
externího API (ČHMÚ, Windy) nebo import ze souboru — úložiště ten rozdíl znát
nemá. Přejmenovat to zpětně stojí migraci, pojmenovat to správně hned nestojí nic.

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

## Katalog metrik a karanténa

Neznámá metrika se **nikdy neodmítá**. Katalog by jinak vytvořil synchronní
vazbu mezi firmwarem zařízení a deploymentem serveru: zařízení nasbírá offline
týden dat s novou metrikou a server mu celou dávku zamítne.

Neznámé hodnoty jdou do karantény s původním payloadem a důvodem, s omezenou
retencí, a do katalogu se povyšují ručně. Dávka je vždy přijatá celá.

## Předpovědi

`ValidAt` je čas platnosti, `IssuedAt` je vydání předpovědi. Tahle dvojice stačí
pro **jednu lokalitu a jeden model**.

Až bude potřeba víc lokalit, hladin nebo variant modelu, stane se z předpovědi
**vlastní typ záznamu** — nepřidávej další sloupce do tabulky pozorování.
Je to hranice, ne odklad.

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

## Pravidla identity `event_id`

Na `event_id` stojí idempotence, a ta je nejdražší věc v celém kontraktu na
pozdější opravu. Platí čtyři pravidla:

1. **Stabilita.** Totéž pozorování má při každém odeslání týž `event_id`.
   Přegenerovat ho při retransmisi znamená duplicitu, kterou nikdo nezachytí.
2. **Rozsah.** Unikátní v rámci zdroje, ne globálně. Dva zdroje smějí použít
   stejný řetězec.
3. **U předpovědí musí nést vydání i platnost.** Například
   `chmu-2026090412-1800`. Kdyby nesl jen platnost, vypadala by novější revize
   jako duplicita té starší a zahodila by se.
4. **Když ho zařízení neumí vyrobit stabilně, nesmí ho posílat vůbec.**
   Typicky když nemá čítač, který přežije restart. Chybějící `event_id` znamená
   možné duplicity při retransmisi; *špatný* `event_id` znamená tiché ztrácení
   dat, což je horší.

Zlaté payloady v `tests/OrlickyPohar.Api.Tests/GoldenPayloads/` tahle pravidla fixují.
Když se ty testy rozbijí, rozbijí se i producenti, ke kterým se nedostaneš —
firmware na lodi nepřeflashuješ na dálku.

## Testy

- **`ContractTests`** — JSON kontrakt, bez databáze a bez Dockeru. V CI běží první.
  Obsahují evoluční testy oběma směry: starý payload po rozšíření schématu
  a nová, serveru neznámá pole, která nesmějí shodit ingest.
- **`IngestTests`** — chování proti reálnému PostgreSQL přes Testcontainers.
  Vyžadují běžící Docker. Schválně ne in-memory provider: idempotence stojí
  na filtrovaném unikátním indexu, který by fake databáze neověřila.

# orlickypohar

Seriál závodů plachetnic na Orlíku — web, veřejné výsledky, administrace
a mobilní přístup. .NET 10, Minimal API, PostgreSQL, vertikální řezy.

**Přicházíš sem poprvé nebo z jiného stroje?** Začni oddílem
[Rozjezd na jiném stroji](CLAUDE.md#rozjezd-na-jiném-stroji) — je tam,
co doklonovat, co musí být nainstalované a jak ověřit, že to drží.

Doménový model, stav a co dál jsou v [docs/PLAN.md](docs/PLAN.md), konvence
kódu v [CLAUDE.md](CLAUDE.md). Provoz, server a poučení z chyb žijí
v repozitáři [file-pb/platform](https://github.com/file-pb/platform).

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
       └─ Zavod              jedno z ~12 zastavení
           ├─ Ucast          která loď přijela a kdo ji vezl
           └─ Rozjizdka
               └─ Vysledek   účast × rozjížďka
```

Ve `Vysledek` je jen to, co se stalo — pořadí, časy, kód. **Body se počítají,
neukládají**, aby šel seriál kdykoliv přepočítat podle změněných pravidel.

## Nahrání ročníku

```bash
curl -X POST https://orlickypohar-api.klihovka.cz/import/serie \
  -H "X-Import-Token: $(cat secrets/Import__Token)" \
  -H 'content-type: application/json' \
  --data-binary @data/2025-mock.json
```

Import je **idempotentní**: druhé odeslání téhož souboru vrátí samé nuly
ve `nove` a nic nepřidá. Opravený výsledek přepíše původní řádek. Buď projde
celá dávka, nebo se neuloží nic — napůl naimportovaný ročník je horší než
žádný, protože chybějící výsledky nikdo nepozná.

`data/2025-mock.json` jsou **vymyšlená data**. Existují proto, aby se model dal
prověřit dřív, než dorazí skutečné výsledky od rozhodčího; až přijdou, soubor
se nahradí a struktura zůstane.

## Veřejné čtení

```bash
curl localhost:8080/serie                              # publikované ročníky
curl localhost:8080/serie/2025                         # ročník s kategoriemi a přihláškami
curl localhost:8080/serie/2025/zavody/zahajeni-sezony  # zastávka s rozjížďkami a výsledky
```

Nepublikovaný ročník i nepublikovaná zastávka vracejí **404, ne 403** —
„existuje, ale neukážu" je taky informace. Zastávka se vydává i s pravidly
závodu (škrty, vyhodnocení, koeficient), bez nichž se pořadí nedá zkontrolovat.

## Web

```bash
tools/fake-api.py &          # falešné API z mock dat, port 8080
npm --prefix web run dev     # http://localhost:3000
```

Web renderuje serverem, protože blog a výsledky potřebují SEO. Adresu API
bere z `API_URL`; výchozí je `http://localhost:8080`, takže proti falešnému
i skutečnému lokálnímu API funguje bez nastavování.

`tools/fake-api.py` servíruje mock ročník ve stejných tvarech jako skutečné
API, jen se tváří, že je publikovaný. Existuje proto, že **lokálně se
databáze rozjet nedá** — Docker Hub je z pracovního stroje nedostupný — a bez
něj by se stránky nedaly vidět jinak než nasazením.

## Testy

```bash
dotnet test --filter "Category!=Integracni"   # bez Dockeru, běží všude
dotnet test                                    # včetně Testcontainers
```

`ModelTests` drží model proti migracím, `KontraktTests` tvar importního
souboru — obojí bez databáze. `ImportTests` a `CteniTests` mají značku
`Category=Integracni` a potřebují Docker; na pracovním stroji se pustit
nedají a běží ve vedlejší úloze CI, která nasazení neblokuje.

## Adresy

| Adresa | Co tam běží |
|---|---|
| `orlickypohar.klihovka.cz` | veřejný web |
| `orlickypohar-api.klihovka.cz` | API a import |

Hezká adresa patří webu, ne rozhraní. Jméno API je jednoúrovňové schválně:
bezplatný certifikát Cloudflare pokrývá jen `*.klihovka.cz`, takže na
`api.orlickypohar.klihovka.cz` by TLS selhalo dřív, než požadavek dojde
na server. Web mluví s API **vnitřní sítí**
(`http://app:8080`), ne přes internet — jinak by to byla zbytečná cesta ven
a zpátky přes Traefik.

## Nasazení

`git push` do `main` → GitHub Actions postaví image → GHCR → nasazovací háček
na serveru si ji stáhne.

Potřebuje dvě věci v nastavení repozitáře: proměnnou `DEPLOY_WEBHOOK`
(adresa háčku) a tajemství `DEPLOY_TOKEN`. Obojí vypíše
`scripts/install-deploy-hook.sh` v repozitáři platformy. **Když proměnná
chybí, krok nasazení se tiše přeskočí** a na serveru běží dál stará verze —
což se pozná jen tím, že se nová funkce neobjeví.

## Proměnné prostředí

| Kde | Co | Význam |
|---|---|---|
| `/run/secrets/ConnectionStrings__Postgres` | soubor | Povinné. Tajemství nepatří do proměnných prostředí — `docker inspect` je ukáže každému s přístupem k daemonu. |
| `Serilog__WriteTo__1__Args__serverUrl` | prostředí | Adresa Seq, volitelné. |
| `ASPNETCORE_HTTP_PORTS` | prostředí | Port, výchozí 8080. |

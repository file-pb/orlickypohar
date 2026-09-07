# orlickypohar

Seriál závodů plachetnic na Orlíku — web, veřejné výsledky, administrace
a mobilní přístup. .NET 10, Minimal API, PostgreSQL, vertikální řezy.

Doménový model a fáze jsou v [docs/PLAN.md](docs/PLAN.md), konvence kódu
v [CLAUDE.md](CLAUDE.md).

## Rychlý start

```bash
docker compose up --build
```

- API: <http://localhost:8080>
- OpenAPI UI: <http://localhost:8080/scalar/v1>
- Seq (logy): <http://localhost:5341>

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
curl -X POST localhost:8080/import/serie \
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
curl localhost:8080/serie                                   # publikované ročníky
curl localhost:8080/serie/2025                              # ročník s kategoriemi a přihláškami
curl localhost:8080/serie/2025/zavody/zahajeni-sezony       # zastávka s rozjížďkami a výsledky
```

Nepublikovaný ročník i nepublikovaná zastávka vracejí **404, ne 403** —
„existuje, ale neukážu" je taky informace. Zastávka se vydává i s pravidly
závodu (škrty, vyhodnocení, koeficient), bez nichž se pořadí nedá zkontrolovat.

## Testy

```bash
dotnet test
```

`ModelTests` drží model proti migracím a nepotřebují databázi ani Docker.
Testy proti reálnému PostgreSQL přes Testcontainers přibudou s importem
loňských dat — idempotence stojí na unikátních indexech, které by fake
databáze neověřila.

## Nasazení

`git push` do `main` → GitHub Actions postaví arm64 image → GHCR → webhook.
Adresu webhooku dej do proměnné repozitáře `DEPLOY_WEBHOOK`; když chybí,
krok nasazení se přeskočí a image se jen postaví.

## Proměnné prostředí

| Kde | Co | Význam |
|---|---|---|
| `/run/secrets/ConnectionStrings__Postgres` | soubor | Povinné. Tajemství nepatří do proměnných prostředí — `docker inspect` je ukáže každému s přístupem k daemonu. |
| `Serilog__WriteTo__1__Args__serverUrl` | prostředí | Adresa Seq, volitelné. |
| `ASPNETCORE_HTTP_PORTS` | prostředí | Port, výchozí 8080. |

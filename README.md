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

# service-template

Šablona služby pro hračkárnu — .NET 10, Minimal API, PostgreSQL, vertikální řezy.
Nový projekt založíš přes **Use this template** na GitHubu.

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

## Vyzkoušení příkladového řezu

Metrika musí být v katalogu, jinak měření skončí v karanténě:

```bash
docker compose exec postgres psql -U service -c \
  "insert into \"Metrics\" (\"Path\",\"Unit\") values ('electrical.batteries.house.voltage','V')"
```

```bash
curl -X POST localhost:8080/measurements -H 'content-type: application/json' -d '{
  "sourceId": "esp32-lodni-baterie",
  "measurements": [
    { "metric": "electrical.batteries.house.voltage",
      "value": 13.42, "validAt": "2026-09-03T18:00:00Z", "eventId": "a1" }
  ]
}'

curl "localhost:8080/measurements?source=esp32-lodni-baterie&metric=electrical.batteries"
```

Druhé odeslání téže dávky vrátí `duplicates: 1` a nic nepřidá — idempotence
podle `eventId`. Neznámá metrika vrátí `quarantined: 1`; dávka je **přijatá celá**
a nic se neztratí. Dotaz hledá prefixově, takže `electrical.batteries` vrátí
všechny baterie.

## Testy

```bash
dotnet test --filter "FullyQualifiedName~ContractTests"   # bez Dockeru
dotnet test                                                # včetně Testcontainers
```

`ContractTests` fixují JSON kontrakt zlatými payloady a testují evoluci schématu
oběma směry. `IngestTests` ověřují idempotenci, karanténu a revize předpovědí
proti reálnému PostgreSQL — potřebují běžící Docker.

## Co upravit v novém projektu

1. Přejmenuj `OrlickyPohar.Api` na jméno projektu (`.sln`, `.csproj`, namespace).
2. Smaž `Features/Measurements` a napiš vlastní řez.
3. Zkontroluj, že platí pravidla v [CLAUDE.md](CLAUDE.md).

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

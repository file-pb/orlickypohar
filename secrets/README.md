# secrets/

Vývojová tajemství. **Do gitu patří jen tenhle soubor**, ne obsah — viz `.gitignore`.

Aplikace čte tajemství ze souborů v `/run/secrets`, ne z proměnných prostředí.
Důvod: proměnné prostředí vidí přes `docker inspect` každý, kdo má přístup
k Docker daemonu. Běžná konfigurace v prostředí zůstat může.

| Soubor | K čemu |
|---|---|
| `ConnectionStrings__Postgres` | připojení k databázi |
| `Import__Token` | sdílené tajemství pro `POST /import/serie`; bez něj import vrací 503 |

Na serveru se stejné soubory berou ze šifrovaného úložiště v `platform` repu.

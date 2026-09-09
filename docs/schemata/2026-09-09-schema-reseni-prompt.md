
Nakresli technické schéma následujícího systému. Je to reálně běžící webová
aplikace, ne cvičení — schéma má sloužit jako přehled pro vývojáře a jako
podklad k rozhodování, co stavět dál.

**Formát:** tři propojené panely pod sebou (nebo tři samostatné obrázky):
(1) nasazení a provoz, (2) vnitřek API, (3) datový model. Text česky.
Orientace na šířku, čitelné i vytištěné na A4.

**Barevné odlišení stavu** — použij tři barvy a udělej legendu:
- **hotové a v provozu** (plná čára, sytá barva)
- **rozdělané** (plná výplň světlejší, čárkovaný obrys)
- **plánované, zatím neexistuje** (jen čárkovaný obrys, bez výplně)

---

## Panel 1 — nasazení a provoz

**Klienti (vlevo):**
- Prohlížeč — návštěvník veřejného webu. *hotové*
- Mobilní aplikace (Expo / React Native, Android, zatím jen čtení). *hotové*

**Vstupní bod (nahoře):**
- Cloudflare — DNS a certifikát pro `*.klihovka.cz`. Poznámka do schématu:
  certifikát kryje jen jednu úroveň subdomén, proto se jména píšou
  `orlickypohar-api`, ne `api.orlickypohar`.
- Traefik — reverzní proxy, Let's Encrypt přes DNS-01, rate limit,
  bezpečnostní hlavičky. *hotové*

**Jeden server (Hetzner CX23, x86, Docker Compose)** — orámuj jako jeden box
se dvěma skupinami uvnitř:

*Skupina „platforma" (`/opt/platform/stack`), sdílená všemi projekty:*
- Traefik
- PostgreSQL 17
- Seq — sběr logů, `logs.klihovka.cz`
- Uptime Kuma — stav služeb, `stav.klihovka.cz`
- deploy-hook — služba systemd (ne kontejner), `deploy.klihovka.cz`
Vše *hotové*.

*Skupina „aplikace" (`/opt/apps/orlickypohar`):*
- kontejner **API** — .NET 10, `orlickypohar-api.klihovka.cz` *hotové*
- kontejner **web** — Next.js, renderuje na serveru, `orlickypohar.klihovka.cz` *hotové*

**Šipky a toky, každou popiš:**
1. Prohlížeč → Traefik → web → API (web renderuje na serveru; odpovědi API
   drží v cache 60 sekund).
2. Mobilní aplikace → Traefik → API **přímo, mimo web** (CORS povoluje jen GET).
3. API → PostgreSQL.
4. API i web → stdout → Seq.
5. **Nasazení:** push do větve `main` → GitHub Actions → testy → build dvou
   kontejnerových obrazů → GHCR → zavolání deploy-hooku → server vymění oba
   kontejnery i `docker-compose.yml` ze stejného commitu. Při selhání se
   vrátí původní compose. *hotové*
6. **Generování typů:** běžící API → `/openapi/v1.json` → skript → TypeScript
   typy pro web i pro mobilní aplikaci. Nakresli jako samostatný, ruční tok
   z vývojářského stroje — nespouští se v CI. *hotové*
7. **Import ročníku:** soubor JSON → `POST /import/serie` s tajným tokenem
   v hlavičce → transakce → PostgreSQL. *hotové*

**Plánované doplnit čárkovaně:**
- **Zitadel** — poskytovatel identity (OIDC), poběží na tomtéž serveru jako
  další kontejner, vlastní subdoména a vlastní databáze. *rozdělané*
- **Objektové úložiště (S3/R2)** — fotky a dokumenty; dnes jsou fotky
  zabalené přímo v obrazu webu. *plánované*
- **Odesílání upozornění** — Outbox v databázi → služba Expo → FCM (Android)
  a APNs (iOS). *plánované*

Přidej k serveru poznámku: zásada „na disku aplikace nesmí být nic
autoritativního", tajemství se čtou ze souborů v `/run/secrets`, ne
z proměnných prostředí.

---

## Panel 2 — vnitřek API

.NET 10, členěné na **vertikální řezy podle funkce, ne na vrstvy**. Nakresli
jako sadu bloků vedle sebe, každý sahá od HTTP až k databázi — schválně tam
NEJSOU vrstvy typu Domain / Application / Infrastructure ani repository.
Napiš to do schématu jako vědomé rozhodnutí.

Řezy:
- **Serial** — ročník, kategorie, přihlášky. Veřejné čtení. *hotové*
- **Lode** — lodě a osoby. *hotové*
- **Zavody** — zastávka, účast, rozjížďka, výsledek. Veřejné čtení. *hotové*
- **Bodovani** — výpočet bodů a průběžného pořadí. Označ jako **čisté
  funkce**: body se nikam neukládají, počítají se při každém dotazu, aby šel
  seriál kdykoliv přepočítat podle změněných pravidel. *hotové*
- **Clanky** — blog na dvou úrovních: články ročníku a články jednotlivé
  zastávky. *hotové*
- **Import** — nahrání celého ročníku jedním souborem, idempotentní.
  Chráněné sdíleným tajemstvím, protože identita zatím neexistuje. *hotové*
- **Identita** — uživatelé, vazba na externí účty, oprávnění. *rozdělané*

Napříč řezy (nakresli pod nimi jako společný podklad):
- jediný `DbContext`
- migrace databáze se pouštějí při startu aplikace
- `/health` (běží proces) a `/health/ready` (drží i databáze)
- `/openapi/v1.json` — zdroj pravdy pro generované klienty

---

## Panel 3 — datový model

Nakresli jako ERD s kardinalitami. Klíčové entity a vazby:

**Ročník a celoroční rovina:**
- `Serie` (ročník) — 1:N `Kategorie`
- `Serie` — 1:N `Prihlaska`
- `Prihlaska` — N:1 `Lod`, N:1 `Kategorie`
- Zvýrazni: **`Prihlaska` je nositel bodů v seriálu.** Body sbírá loď, ne
  posádka — kormidelník se mezi závody mění, loď ne. Proto kategorie patří
  k celoroční přihlášce, ne k jednotlivému závodu.

**Lodě a lidé (leží mimo ročník, sdílí se napříč lety):**
- `Lod` — N:1 `Osoba` (majitel)
- `Osoba` — volitelná vazba na `Uzivatel`; většina osob účet nikdy mít nebude

**Jedna zastávka:**
- `Serie` — 1:N `Zavod` (zastávka; ročník jich má devět)
- `Zavod` — 1:N `Ucast` (která loď na tuhle zastávku přijela)
- `Ucast` — N:1 `Prihlaska`, N:0..1 `Osoba` (kormidelník)
- `Zavod` — 1:N `Rozjizdka`
- `Rozjizdka` — 1:N `Vysledek`
- `Vysledek` — N:1 `Ucast`
- Zvýrazni: **ve `Vysledek` je jen to, co se stalo** — pořadí v cíli, čas,
  kód (nedokončil, nestartoval, diskvalifikace…). Body tam nejsou.

**Blog:**
- `Clanek` — N:1 `Serie`, N:0..1 `Zavod`
- Popiska: prázdný odkaz na zastávku znamená článek celého ročníku,
  vyplněný článek jedné zastávky. Z téže dvojice se odvozuje právo psát.

**Identita** (*rozdělané*, nakresli čárkovaně):
- `Uzivatel` — 1:N `UcetVazba`
- `UcetVazba` nese dvojici `(vydavatel tokenu, subjekt)` → interní `UserId`
- `Uzivatel` — 1:N `Opravneni`
- `Opravneni` — N:1 `Serie`, N:0..1 `Zavod`, plus role
- Zvýrazni dvě věci:
  1. Aplikace **nikdy** nepoužívá identifikátor z tokenu jako svůj primární
     klíč. Má vlastní a k němu tabulku vazeb — díky tomu je výměna
     poskytovatele identity vložení řádku, ne migrace celé databáze.
  2. Oprávnění má **rozsah**: buď celý ročník, nebo jedna zastávka.
     Pořadatel jedné zastávky nespravuje ročník ani cizí zastávky.

**Unikátní omezení, na kterých stojí idempotence importu** — vyznač je
v ERD (třeba ikonou klíče):
- `Prihlaska` unikátní na (ročník, loď)
- `Vysledek` unikátní na (rozjížďka, účast)
- `Zavod` unikátní na (ročník, slug)
- `Clanek` unikátní na (ročník, slug)
- `UcetVazba` unikátní na (vydavatel, subjekt)

---

## Styl

Střízlivé technické schéma, ne marketingový obrázek. Žádné 3D, žádné stíny,
žádné fotografie. Rovné čáry, obdélníky se zaoblenými rohy, bezpatkové
písmo. Šipky se šipkovým hrotem ve směru toku dat, každá popsaná. Legenda
se třemi stavy v rohu. Nadpis: „Orlický pohár — schéma řešení".

# Dotazníky v Play Console

Odpovědi na *Dokončete nastavení aplikace*. Každá se dá ověřit v kódu —
odkaz je u ní, protože špatně vyplněná deklarace je důvod ke stažení
aplikace, ne k poznámce. Ověřeno 22. 11. 2026 proti mainu.

## Krátké

| Úkol | Odpověď |
|---|---|
| Zásady ochrany soukromí | `https://orlickypohar.klihovka.cz/osobni-udaje` |
| Reklamy | **Ne**, aplikace reklamu neobsahuje |
| Cílové publikum | **18 a více** — nižší věk zapne pravidla pro rodiny a s nimi přísnější požadavky na data |
| Státní aplikace | Ne |
| Finanční funkce | Žádná z možností |
| Zdraví | Ne |
| Kategorie | Sport |
| Kontaktní e-mail | tvoje volba, bude veřejný |
| Web | `https://orlickypohar.klihovka.cz` |

## Přihlašovací údaje

**Část aplikace je za přihlášením** — kontrolor Googlu by se jinak
k podstatné funkci nedostal a appku odmítne jako nefunkční.

Co je veřejné bez čehokoliv: ročníky, kalendář, výsledky, průběžné pořadí,
lodě. Co je za přihlášením: správa závodu a cíl (účet s oprávněním),
a záznam trasy (klíč k lodi, `src/lib/klic.ts`).

**V appce je ale ukázkový režim** (`src/lib/ukazka.ts`, v nabídce *Ukázka
pro závodníka*), který ukáže pohled posádky na vodě bez účtu i bez klíče.
Do pole s pokyny pro kontrolora patří proto tohle:

```
Výsledky, kalendář a průběžné pořadí jsou veřejné bez přihlášení.
Obrazovku, kterou vidí posádka na vodě, si lze projít bez účtu přes
nabídku (tři tečky vpravo nahoře) → „Ukázka pro závodníka".
Záznam trasy vyžaduje klíč k lodi, který posádce vydá kapitán; na
vyžádání dodáme testovací klíč.
```

## Zabezpečení údajů (Data safety)

Aplikace sbírá tohle a nic víc. Posílá se jen na náš server
(`orlickypohar-api.klihovka.cz`), **nikomu třetímu**, a všechno jde přes
HTTPS — tedy *šifrováno při přenosu: ano*.

| Typ dat | Sbírá se | Kdy a kde v kódu | Účel | Povinné? |
|---|---|---|---|---|
| **Poloha — přesná** | ano | jen při spuštěném záznamu; `tracker/nahravani.ts` posílá `sirka`, `delka`, `presnostM` | funkce aplikace | nepovinné |
| **Osobní údaje — jméno, e-mail** | ano | při přihlášení přes poskytovatele identity, `lib/identita.ts` | správa účtu, funkce aplikace | nepovinné |
| **Identifikátory zařízení** | ano | token pro upozornění, `lib/upozorneni.ts` posílá `{token, platforma, odbery}` na `/zarizeni` | funkce aplikace (upozornění na start) | nepovinné |
| **Diagnostika** | ano | stav baterie u každého bodu trasy a v hlášení, `ozviSe({baterieProcent})` | funkce aplikace (pořadatel vidí, že telefon na lodi žije) | nepovinné |

**Nic z toho se nesdílí s nikým dalším** a appka nemá žádnou analytiku ani
sledovací skripty. Kód to potvrzuje: jediná čtyři místa, kam appka zapisuje
ven, jsou `/klice/uplatnit`, `/klice/sledovani`, `/klice/hlaseni`
a `/zarizeni`, plus dávka trasy.

**Mazání dat: odpověz „ano, uživatel může požádat o smazání"** a jako cestu
uveď kontakt ze zásad. Pozor ale na dvě věci, které z toho plynou a nejsou
dořešené:

1. **Trasy se nemažou samy a tlačítko na to v appce není.** Zásady to
   přiznávají; Play to snese, dokud existuje cesta požádat.
2. **Appka umožňuje přihlášení, takže Google chce i cestu ke smazání
   účtu** — u takových aplikací se vyžaduje adresa, kde o to jde požádat
   i bez instalace. Zásady dnes říkají „zrušit se dá u poskytovatele
   identity" a nabízejí e-mail. Jestli to Play uzná, se pozná až
   z formuláře; kdyby chtěl samostatnou adresu, je to další oddíl na
   `/osobni-udaje`, ne práce v appce.

## Hodnocení obsahu

Dotazník vyplň na kategorii **Odkazy a nástroje** (ne hra). Všechny otázky
na násilí, sex, drogy, hazard a nevhodný jazyk jsou **ne**. Appka
neobsahuje uživatelsky tvořený obsah ani chat — novinky a výsledky píše
pořadatel, ne uživatelé.

Jedna otázka si zaslouží pozornost: **sdílí aplikace polohu uživatele
s jinými uživateli?** Odpověď je **ano** — trasa lodi se za určitých
podmínek ukáže divákům a ostatním posádkám. Podrobnosti jsou v zásadách
v oddílu *Kdo trasu vidí*; rozhoduje o tom rozhodčí dvěma přepínači
(`Features/Polohy/PolohyEndpoints.cs`).

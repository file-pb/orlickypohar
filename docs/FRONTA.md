# Fronta: co z oponentury rozhodčího zbývá (18. 11. 2026)

Oponentura role rozhodčího (`OPONENTURA-ROZHODCI.md`) našla **49 nálezů**
(R1–R41 z diskuse s Milošem, K1–K8 z kódu a pravidel) a většina z nich už
stojí v kódu. Tenhle dokument je **fronta**: jeden řádek na každou věc, která
skutečně zbývá, a u něj to jediné, co o ní potřebuješ vědět dřív, než ji
vezmeš — **kdo nebo co ji drží**.

**Proč vznikl.** Oddíl *Celá fronta* v `SOUPIS-A-PLAN-START.md` je z 28. 10. a
počítá čtyřicet jeden nález na devatenácti otázkách; `STAV-RESENI.md` je k
8. 11. Mezitím se tři týdny stavělo a obě čísla přestala platit. Fronta
rozdělená podle *otázek, které visí*, je dnes k ničemu, protože rozhodnutí už
nedrží nic — drží stavba.

**Co kde platí.** Nálezy a jejich zdůvodnění zůstávají v oponentuře, stav
jednotlivých Milošových požadavků v `STAV-RESENI.md`, pořadí kroků u startu v
`SOUPIS-A-PLAN-START.md`. Tady je **jen to, co se má vzít**, a nic jiného.

**Mez poctivosti.** Řádek odsud odejde jedině tak, že je věc **doložená v kódu
nebo nasazená**. Nic tu není „asi hotové": u každé položky ve skupině A je
cesta a číslo řádku, kde se dnes dá vidět, že hotová není. Ověřeno proti
`main` na commitu `0f9834a2`, 18. 11. 2026.

---

## A) Nic to nedrží — dá se vzít hned

| # | Co zbývá | Kde se to dnes vidí | Velikost |
| --- | --- | --- | --- |
| **K7** | **Shoda v cíli na webu.** Appka to umí od 7. 11. — dvě lodě na témž místě, body podle ZPJ A7. Web pořád počítá pořadí jako `i + 1`, takže rozhodčí, který zapisuje od stolu, shodu zapsat nemůže, a totéž klepnutí má na telefonu a na webu různý výsledek | `web/app/sprava/[serie]/vysledky/[zavod]/[cislo]/cil/cil.tsx:921` a `:1122` | střední |
| **R25** | **Verze 3 souhlasu.** Rozhodnuto 29. 10.: VMP a technický průkaz se sbírat nebudou, závodník je potvrdí v souhlasu. Jenže znění o průkazech mlčí a kód vydává verzi 2 — dokud se nezmění, je to rozhodnutí jen v dokumentaci, a závodník nepotvrzuje nic | `src/OrlickyPohar.Api/Features/Zavody/Souhlas.cs:44` | malá: text a verze, kolonka `SouhlasVerze` v datech už je |
| **R21** | **Dva ze čtyř prázdných bodů vypsání**, a to ty, které si aplikace umí dosadit sama: *Dráha* (J1.3(4)) z předpisu trati a *lhůta pro změny bodování* (J1.2(6)) ze ZPJ 90.3(e). Zbylé dva vydává Miloš — jsou ve skupině B | `src/OrlickyPohar.Api/Features/Zavody/Vypsani.cs:136` a `:139` | střední |
| — | **Verze appky na `/appka`.** Stránka rozdává APK a QR kód, ale neřekne, který build to je. Kdo si stahuje podruhé, nepozná, že je novější než ten jeho — a přitom `app/vydane-apk.json` to číslo vede | `web/app/appka/page.tsx` | malá |
| — | **`VeleniDto` mimo vygenerovaný kontrakt.** Tvar odpovědi stojí v appce ručně, protože ve `schema.d.ts` ten typ není. Je to dluh s předem napsaným koncem: až se kontrakt vygeneruje znovu, má ruční typ zmizet | `app/src/lib/api.ts:366` | malá, ale patří ke generování kontraktu |

## B) Čeká na Miloše — a vejde se to do jedné zprávy

Z šesti otázek na konci návodu (s. 23) jsou **dvě odpovězené** (odstartování
rozjížďky a zčásti flow rozpravy). Zbývá tohle:

| Otázka | Bod návodu | Co na ní visí |
| --- | --- | --- |
| Kde a jak chceš revidovat trať? | 5 | příjem trati rozhodčím proti stavbě v appce |
| Kde chceš mít přehled o lodích za jízdy? | 10 | co má být na mapě za jízdy a komu |
| Co potřebuješ vidět, než uznáš výsledky? | 16 | podpis výsledků — dnes se nabízí bez čehokoli |
| Kde a jak se má regata uzavřít? | 17 | konec dne závodu jako úkon |
| **Začátek a konec rozpravy** | 8 | zbytek otázky 6: co rozprava zapíná, už víme (R3, R4, R6, R39), kdy začíná a končí ne |
| **Má protestní limit nepustit podpis, nebo to jen napsat?** | — | K2. Limit se počítá a píše se u rozjížďky; nezamyká nic, protože aplikace neví, že nějaký protest visí |
| **Vyloučení: „nepustím ke startu", nebo „vyhazuju z výsledků"?** | — | K4 a mez z pravidla 76.1(a) |
| **Dva body vypsání, které vydáváš ty** — kdy se poslední den už nestartuje (J1.3(7)) a odepření práva na odvolání (J1.3(8)). A **místo konání**, které aplikace nevede nikde, takže je v dokumentu zadrátované „neuvedené" | — | R21, R23, zbytek R1/R8 |

## C) Čeká na rozhodnutí Filipa

- **Smí do zápisu dojezdů i pořadatel?** Milošova věta říká *„pouze
  rozhodčí"*, tvoje rozhodnutí ze 16. 10. *„pořadatel, dokud je zápis
  otevřený"*. Dnes platí tvoje, a Milošova tím zůstává nenaplněná — tohle
  není chyba v kódu, je to nezavřený spor dvou zadání (R38).
- **Kdo appku nemá, se o přeloženém termínu nedozví** (zbytek K5). Zpráva
  odchází odběrem ročníku, tedy jen do telefonů. Druhý kanál je rozhodnutí
  (mail? SMS? vůbec?), ne práce.
- **Licence** — Play 25 USD jednorázově, Apple 99 USD ročně. Bez nich se nová
  appka k pořadatelům dostane jedině kabelem, a zrovna stavitel trati je
  funkce, kterou budou chtít mít v telefonu bez tvé asistence.

## D) Postavené, ale neověřené — čeká na telefon a na vodu

- **Zkouška stavitele trati**: `ZKOUSKA-STAVITELE.md`, **22 nezaškrtnutých
  bodů**. Od commitu `ea0e6682` (meze polohy rozvolněné z Orlíku na Česko) se
  celý průvodce projde **na suchu**; na vodě zbývá jen to, co vodu doopravdy
  potřebuje.
- **R18 — že push dojde na telefon posádky do minuty.** Takt kódu je minuta,
  doručení neměřil nikdo.
- **Tracking z telefonu.** Nasazený 24. 10., z telefonu neověřený.
- **Nerušit si dirigent na iPhonu nevyžádá** (na Androidu ano). Není to vada,
  je to mez systému — patří sem proto, aby se u vody nečekalo, že to zabere.

## E) Velké věci s vlastním rozhodnutím

- **Protesty (K2).** Celek se nestaví a je to tak rozhodnuté: pohár není pod
  svazem, odvolání k ČSJ odpadá a protestní komise by byla poslední instancí.
  Postavené je jen to, na co aplikace data má — protestní limit podle ZPJ
  60.3(b). Visí na tom **zbytek R13**: protest vytlačené lodi, náprava podle
  61.4(c) a zproštění viny podle 43.1(a). Cesta komise (zrušení s důvodem,
  odložení, důkaz z trasy podle 61.4(d)) běží.
- **Vypsání jako plný dokument J1** (R1, R8). Osnova stojí, dva body si
  aplikace dosadí sama (skupina A), dva vydává Miloš a místo konání nevede
  nikdo (skupina B). Teprve pak je to dokument, o kterém R8 mluví.

---

## Co z fronty vypadlo od 28. 10. 2026

Aby bylo vidět, že se z hromady dostáváme: zavřelo se **K1, K3, K5, K6, K7
(v appce), K8, R3, R4, R6, R9, R10, R12, R13 (cesta komise), R17, R19, R33,
R34, R35, R36, R37, R38 (polovina), R39** a celá startovní procedura podle
ZPJ 26 včetně dirigenta. Zbytek, který měl 28. 10. *pípání a focení bójí
z appky*, postavily commity `a4710ffa`, `34605f3d` a `4b9c256d`.

Z devatenácti nálezů, které tehdy čekaly na rozhodnutí, nečeká **ani jeden**.
Fronta na stavbu má dnes **pět položek ve skupině A**, z nichž tři jsou malé.

## Jak se tahle fronta udržuje

1. Nový nález jde do `OPONENTURA-ROZHODCI.md` jako **R**, ne sem.
2. Stav Milošova požadavku jde do `STAV-RESENI.md`, ne sem.
3. Sem se píše **jen to, co se má vzít**, a řádek se maže teprve tehdy, když
   je věc v kódu nebo nasazená. Hotovo se nepíše do sloupce, hotovo řádek
   odebere — doklad zůstane v commitu.

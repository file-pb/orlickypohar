# Stav řešení: co chce Miloš × co z toho stojí

**Stav k 28. 10. 2026, večer.** Tenhle dokument je **přehled pro Filipa**, aby
měl kontrolu nad stavem: každý Milošův požadavek na jednom řádku, u něj v jakém
je stavu, **kde se to dá vidět** a co zbývá. Je seřazený **podle dne závodu**,
protože tak o tom Miloš mluví — od vypsání po výsledky.

**Co v něm není.** Je to řez **dnem rozhodčího**. Web a články, editor trati,
bóje, tabule pro diváky, náklady, zálohy a kalendář v něm nejsou — ty vede
`PLAN.md`. Kdo u vody stojí a s jakými právy, vede `AUDIT-OBSAZENI.md`.

Zdroje: `OPONENTURA-ROZHODCI.md` (nálezy R1–R40, K1–K7, 38 střípků),
`SOUPIS-A-PLAN-START.md` (plán ovládání startu a celá fronta).

**Jak se čte stav.** Šest slov, nic mezi nimi:

| Stav | Znamená |
| --- | --- |
| **Běží** | Nasazené na produkci, dá se vyzkoušet |
| **Jen web** | Běží, ale **ne v appce** — a Miloš bude na lodi |
| **V API** | Schopnost existuje, obrazovku nikdo nepostavil |
| **Zadané** | Víme přesně co, nestaví se |
| **Čeká** | Stojí na rozhodnutí, které ještě nepadlo |
| **Zavřené** | Miloš rozhodl, že se stavět nebude |

---

## Před závodem

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Vypsání závodu jako dokument | **Běží** | Web, dokument z dat. Čtyři body J1 jsou prázdné a místo konání je „neuvedené" (R21, R23) |
| Plachetní směrnice ke stažení | **Běží** | Jako PDF. Formu zdroje odložil sám: *„teď stačí zdroj jak máme"* (R2) |
| Směrnice **předvyplní** trať, časy a režim startu | **Čeká** | R22. Navrhl to sám; nerozhodnuté je **kdy**, ne jestli. Leží v ní dva ze čtyř prázdných bodů vypsání a oba chybějící údaje o startu |
| Vypsání platné bez jeho podpisu | **Zavřené** | *„Je platné i bez mého podpisu"*. Elektronický podpis jen jako nabídka (R20, R32 v nahrávce 32) |
| Přihlašování po zveřejnění vypsání | **Běží** | Přihlášky vede pořadatel |
| Přihlašování se zavře rozpravou | **Zadané** | R39. Dnes se nezavírá nikdy |
| Číslo VMP a technického průkazu v přihlášce | **Zadané** | R25. Dnes se místo nich sbírá číslo ČSJ, které vypsání nežádá |
| Souhlas se závodními pravidly u přihlášky | **Běží** | `Souhlas.cs`, verze 2 včetně polohy |
| Nezletilý závodník | **Zavřené** | *„Žádný z kapitánů není nezletilý"* (R26) |
| Čtyři třídy (do 7 m, nad 7 m lehký, těžký, RACE) | **Zavřené** | *„Neřeš, do tříd si je zařadíme sami"* — dva nové záznamy v nastavení, zařadí ručně (R40) |
| Platba startovného u kapitána | **V API** | `Ucast.Zaplaceno` a `StartovnePoznamka` existují i s endpointem; **kde se to klepne, jsem neověřil** |

## Rozprava

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Po rozpravě nastavit předpokládaný čas startu | **Jen web** | K6, nasazeno. V appce to nejde |
| Tabule se startovní listinou | **Běží** | Přepíná se sama podle fáze dne, nezapíná se ručně |
| Do startovní listiny smí jen rozhodčí | **Čeká** | R38. Kód dnes říká opak: *„Přihlášky vede pořadatel"* — a je potřeba rozhodnout, co „zásah do listiny" znamená |
| Mapa 10 minut před startem | **Čeká** | R4. Dnes naskočí až výstřelem |
| Odkdy se posádkám hlásí telefon | **Čeká** | R3 — jediná otázka, na kterou Miloš neodpověděl |

## Start

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Spustit startovní proceduru jedním tlačítkem | **V API** | `POST …/procedura`. Appka neumí nic z procedury |
| Odpočet s intervaly 5 / 4 / 1 / 0 na obrazovce | **Zadané** | **Nikde.** Je to krok 1 plánu a hlavní věc, kterou chce mít v ruce (*„abych nemusel držet stopky"*) |
| Dlaždice **Odklad startu** s novým časem | **Zadané** | R37. API to umí ve dvou krocích (odložit + zapsat plánovaný start), appka nijak |
| Dlaždice **Zrušit rozjížďku / neplatný start** | **V API** | `Odvolat` (ZPJ 29.2) — přidá minutu a jede znovu |
| Dlaždice **OCS** → loď → odčinila / neodčinila | **Zadané** | R35. Kód `Ocs` existuje, postup ne. Jedna otázka zbývá: zapsat `OCS`, nebo `DSQ`? |
| Velitelský čas na mobilu hlavního startéra | **Běží** | `Velitel`, převzetí na žádost, doklad |
| Start přežije výpadek | **Jen web** | Fronta nezaslaného startu je na webu; v appce se musí postavit znovu |
| Posádka vidí tutéž sekvenci jen ke čtení | **Zadané** | R34. Nikde |
| Posádka hlásí komisi (trest, neregulérnost) | **Zavřené** | R41. *„Alespoň v prvních verzích ne."* Miloš došel k témuž: *„abychom jim nekomplikovali život"* |

## Za jízdy

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Úprava tratě za jízdy | **Jen web** | Změna úseku a chybějící značka (ZPJ 33, 34) |
| Dlaždice **360°** za dotek bóje | **Zadané** | R36, ZPJ 31 |
| Dlaždice **720°** za dotek s lodí soupeře | **Zadané** | R36, ZPJ 44 |
| Trest dostupný **celou** rozjížďku, ne jako krok | **Zadané** | Z nahrávky 23: dlaždice se má *„průběžně posouvat"* |
| Vytlačená loď a rozjížďka přerušená pro bezpečnost | **Zadané** | R13. Pravidla mají čtyři různé cesty podle toho, kdo je původce, a aplikace nezná ani jednu; zrušit rozjížďku jde dnes jen oklikou přes eliminaci výsledků |
| Startovní tresty bez vlajek | **Zavřené** | R15, R16. Na poháru se vlajky nevyvěšují, jede se megafonem, takže tresty podle pravidla 30 formálně neplatí. Nosné pro dlaždici OCS |
| Polohy lodí na mapě | **Běží** | Tracking nasazený 24. 10.; **z telefonu to nikdo neověřil** |

## Cíl

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Ruční zápis průjezdu cílem | **Jen web** | Běží |
| Přepsat to, co určilo trasování | **Zadané** | R33. Nikde — a je to vlastní velká věc |
| Shoda v cíli (dvě lodě stejně) | **Zadané** | K7. Aplikace ji dnes odmítne zapsat, ZPJ A7 ji dělí rovným dílem |

## Po rozjížďce

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Odsouhlasení pořadí | **Jen web** | Stavy výsledků, běží |
| Úpravu výsledků smí jen rozhodčí | **Čeká** | R38, tatáž otázka jako u listiny |
| Zásah do pořadí při protestu | **Zadané** | Protesty jsou celá nepostavená fáze; dnes je jen věta, že protest visí (K2) |
| Ověřeno a Schváleno jako dva kroky | **Čeká** | K3. Dnes jsou to dvě klepnutí téhož člověka — kandidát na ubrání |
| Pomocník u cíle a slave startér | **Zadané** | K8. Rozhodnuto 28. 10.: **příznak u regaty**, který rozhodčí zaškrtne v klubovně u zápisu u lidí, kteří už pořadateli jsou. Otevře velení a zápis průjezdu, **ne** startovní listinu. Žádná nová role |
| Zahájit další rozjížďku | **V API** | `POST …/rozjizdky` |
| Kódy výsledků včetně DNE | **Běží** | Jedenáct kódů, čtyři z nich doplněné 28. 10.; DNE se nedá vyškrtnout (K1) |
| Zrušení rozjížďky s povinným důvodem | **Běží** | Fáze 4.2 |

## Mimo den závodu

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Appka řekne, že se sama aktualizovala | **Běží** | Banner a sekce *Verze appky* v Účtu, od 28. 10. **Jak to vypadá na telefonu, nikdo neviděl** |
| Aktualizace po síti bez instalace | **Běží** | První aktualizace publikovaná 28. 10.; do té doby v kanálu neležela **žádná** |
| Publikace automaticky z CI | **Čeká** | Úloha je v mainu, ale `EXPO_TOKEN` v secrets chybí → jen varování |
| Přeložený termín dá vědět přihlášeným | **Zadané** | K5. ZPJ 80 to žádá, aplikace termín přesune a nikomu nic neřekne |

---

## Co čeká na Filipa

Pět věcí, a žádnou z nich nerozhodne nikdo jiný:

1. **Co znamená „do startovní listiny smí jen rozhodčí"** (R38) — přejdou
   přihlášky celé na rozhodčího, nebo smí jen měnit, kdo v rozjížďce startuje?
2. **OCS, nebo DSQ** u lodě, která start neodčinila (R35) — dotaz na Miloše,
   ale rozhodnutí o výsledkové listině.
3. **`EXPO_TOKEN` do secrets**, nebo zůstane publikace ruční.
4. **Cíl a přepsání trasování** (R33) — vlastní velká věc, kdy se do ní jde.
5. **Mez z pravidla 76.1(a)** u vyloučení (K4) — jediná otázka, kterou Miloš
   nedostal.

## Jak se tenhle dokument udržuje

Píše se **po každé Milošově dávce** a mění se v něm **jen sloupec Stav**. Řádky
se neruší: co Miloš jednou řekl, zůstává, i když se to rozhodne nestavět — pak
má stav **Zavřené** a je u toho jeho věta. Stav se nikdy nepřepisuje podle
plánu, jen podle toho, co je **doložené v kódu nebo nasazené**.

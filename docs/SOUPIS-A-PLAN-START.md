# Soupis a plán: ovládání startu (28. 10. 2026)

Filip, 28. 10. 2026, než odjel:

> *„Musíme, než budeme překopávat cokoli, udělat nějaký soupis a plán, abychom
> si to nerozbili a rozhodli se správně. Toto je místo, ke kterému se kdyžtak
> vrátíme."*

**Nic z toho níž není postavené.** Dokument vznikl **místo** stavby, ne po ní.
Co je hotové, je v oddílu *Co už běží*; co by se stavělo, je v *Plánu* a čeká
na rozhodnutí z oddílu *Čtyři rozhodnutí*.

Zdroje: `docs/OPONENTURA-ROZHODCI.md` (nálezy R1–R34, pyramida autority),
jedenáct hlasových nahrávek rozhodčího z 28. 10. 2026 a dva vzory jeho listin.

---

## Pyramida autority — rámec, který rozhoduje o všem ostatním

Filip to rozhodl natvrdo a je to jediné místo, kde se nesmí improvizovat:

| # | Kdo řídí závod | Čím je neporazitelný |
| --- | --- | --- |
| 1 | **Startér a jeho papír** | Nepotřebuje elektřinu, síť ani nás |
| 2 | **Mobil hlavního startéra** | Vlastní hodiny; velitelský čas vzniká tady |
| 3 | **Slave startéři** | Mají čas od hlavního; bez něj jen hlásí |
| 4 | **Systém a ostatní appky** | Odběratelé toho, co hlavní rozešle |

Z toho plyne trojice pravidel, podle kterých se dá každý návrh níž přečíst
a zamítnout:

1. **Odpočet nikdy nečeká na odpověď serveru.** Běží z hodin telefonu.
2. **Žádná obrazovka startéra se nesmí zablokovat kvůli systému.** Nejvýš
   „zatím neodeslané", nikdy „nelze, nejsem online".
3. **Rozpor se řeší přepsáním shora**, ne slučováním
   (`Veleni.ProcNesmiPrepsatStart`).

---

## Co už běží

**Hotové a nasazené** (fáze 1 až 4, 28. 10. 2026):

| Co | Kde |
| --- | --- |
| Plánovaný start se dá zapsat, aniž rozjede rozjížďku | nález K6, fáze 1.1 |
| Startovní procedura: spustit, odložit (ZPJ 27.3), odvolat (ZPJ 29.2) | `Procedura.cs`, `POST …/rozjizdky/{cislo}/procedura` |
| Velitelský čas: kdo velí, převzetí na žádost, doklad | `Velitel`, `VeleniSprava`, `POST …/velitel` |
| Start přežije výpadek (čeká v telefonu, dokud neprojde) | fáze 1.2 — **jen na webu** |
| Čtyři chybějící kódy výsledků (ZFP, UFD, BFD, DNE) | `KodVysledku`, fáze 3.3 |
| DNE se nedá vyškrtnout (ZPJ 90.3(b)) | `Bodovani.NelzeSkrtnout` |
| Vypsání závodu jako dokument z dat | `Vypsani.cs`, fáze 2.1 |
| Souhlas závodníka, verze 2 (včetně polohy) | `Souhlas.cs`, fáze 2.2 |
| Zrušení rozjížďky s povinným důvodem | fáze 4.2 |
| Doručení ven v taktu minuty | nález R18, fáze 4.3 |
| Změna úseku a chybějící značka (ZPJ 33, 34) | #512, #513 — cizí session |

**Co z toho umí appka: nic z procedury.** Startovní procedura je v
`app/src/lib/schema.d.ts` jen jako typ z API a žádná z jedenácti obrazovek
appky start neovládá. Fronta nezaslaného startu (fáze 1.2) existuje jen na
webu.

---

## Co chce rozhodčí, a co z toho aplikace neumí

Z nahrávky 21 (dvě minuty nepřerušeného zadání), doplněné 22 až 25:

| # | Krok | Stav |
| --- | --- | --- |
| 1 | Po rozpravě nastavit předpokládaný čas startu | **je**, ale jen web |
| 2 | Procedura T−5, pět minut před startem | **je** (`DelkaProceduryMin`) |
| 3 | Jedním tlačítkem spustit, až je na lodi připravený | API je, appka ne |
| 4 | Odpočet s intervaly: vyzývací, přípravné, minuta, start | **nikde** |
| 5 | V poslední minutě přerušit / zrušit start | API je, appka ne |
| 6 | Dlaždice *alternativní trest* → jména přihlášených lodí | kódy jsou, obrazovka ne |
| 7 | Pak „start / odstartováno" | API je, appka ne |
| 8 | Po startu zrušení i trest zůstávají dostupné | — |
| 9 | Sekvence se ukončí, rozjížďka jede | **je** |
| 10 | Za jízdy úprava tratě | #513, jen web |
| 11 | U cíle ruční průjezd **i přepsání toho, co určilo trasování** | ruční je, přepsání ne |
| 12 | Trest průběžně dostupný celou rozjížďku (otáčky 360°/720°) | **nikde** |
| 13 | Odsouhlasení pořadí a zásah při protestu | protesty = fáze 5 |
| 14 | Zahájit další rozjížďku | API je, appka ne |
| 15 | Posádka vidí **tutéž sekvenci** jen ke čtení | **nikde** |

**Míra úspěchu není počet obrazovek**, ale jediná Milošova věta:

> „abych nemusel držet stopky a současně aplikaci ještě houkačku a megafon"

Má dvě ruce a v nich houkačku a megafon. Otázka po každé změně tedy je:
**odejdou mu z ruky stopky?**

---

## Mapa dotyků: co se čím dá rozbít

Tohle je ta část, kvůli které soupis vznikl.

| Zásah | Co se tím může rozbít | Jak se to pozná dopředu |
| --- | --- | --- |
| **Nová obrazovka v appce** (JS) | Nic v nativní části; projde OTA aktualizací | `expo-keep-awake` je už tranzitivní závislost `expo`, takže **otisk se nemění** |
| **Nová nativní závislost v appce** | Otisk se rozejde → telefony přestanou dostávat aktualizace, **tiše** | Hlídač v CI (`473acd0`) to ohlásí |
| **Odpočet počítaný na serveru** | Poruší pyramidu: prodleva sítě posune start | Test: vypni síť v poslední minutě. Musí doběhnout. |
| **Změna `StartV` za jízdy** | Tabule a appky posádek čtou totéž; rozpor je vidět všem | Zrušení startu je dnes *opakovaný start* (`Procedura.JeOpakovanyStart`) |
| **Změna tříd na čtyři** (R29) | Ročník 2027 je naimportovaný a lodě v něm kategorii mají → přeřazení existujících přihlášek | Konfigurace, ne kód, ale **ne bez rozhodnutí rozhodčího** |
| **Zamknutí startovní listiny** (R32) | Popře nález R6: nově přihlášená loď se musí objevit **i po startu** | R6 říká, že zamknout nejde |
| **Dvě dlaždice „alternativní trest"** | Jedno jméno pro dva různé úkony (R31): před startem pravidlo 30, u cíle ZPJ 44.2 | Musí být vidět, **co** se zapisuje |
| **Práce v `app/`** souběžně s jinou session | Kolize v `package.json` a buildech APK | `app/` drží session, která staví APK |

---

## Čtyři rozhodnutí, která musí padnout dřív než kód

Žádné z nich není technické a žádné za Filipa a Miloše udělat nemůžu.

1. **Kde se odpočet ovládá.** Jen v appce (Miloš je na lodi), nebo i na webu?
   Na webu dnes běží všechno ostatní a tabule odpočet už kreslí. Kdyby se
   ovládal na obou, je potřeba rozhodnout, co když oba klepnou — a to je pyramida:
   platí mobil hlavního startéra.
2. **Co dělá „přerušit" v poslední minutě.** Miloš jmenoval tři věci jedním
   dechem: *„přerušit startovní interval, nebo přerušit start, zrušit start"*.
   Aplikace má dvě (`Odlozit` = ZPJ 27.3, `Odvolat` = ZPJ 29.2) a liší se tím,
   co udělají s časem: odložení ho zruší, odvolání přidá minutu a jede znovu.
   **Jsou to z jeho strany dvě věci, nebo tři?**
3. **Čtyři třídy: podle čeho lehký a těžký.** R29. Hmotnost z technického
   průkazu, konstrukce, nebo případ od případu? A přeřadí se ročník 2027, nebo
   platí až 2028?
4. **Kdy se zobrazí stav telefonů posádek.** Nález R3, nezodpovězené od včera:
   odkdy se posádky „hlásí" — od rozpravy, nebo dřív?

---

## Plán: pořadí, které nic nerozbije

Navržené pořadí vychází z toho, co je **nejmenší a nejdřív ověřitelné**, ne
z toho, co je nejdůležitější.

### Krok 1 — odpočet v appce, jen ke čtení (nízké riziko)

Obrazovka, která **ukazuje** odpočet a fáze podle plánovaného startu, který už
dnes jde zapsat na webu. Nic neovládá, nic neposílá.

- Proč první: ověří čitelnost na slunci a keep-awake, tedy přesně to, co se
  u stolu nezměří — a Miloš to může ladit sám.
- Riziko: žádné. Čtení existujícího `startV`, JS změna, projde OTA.
- Hotovo znamená: Miloš se na to na vodě podívá a řekne, jestli vidí.

### Krok 2 — spuštění procedury z appky (střední riziko)

Jedno tlačítko → `POST …/procedura` se `Spustit`. Odpočet běží **z hodin
telefonu**, odeslání vedle a opakovaně, jako fronta zápisu z fáze 1.2.

- Riziko: fronta se musí postavit v appce znovu (na webu je, v appce ne).
- Hotovo znamená: s vypnutou sítí doběhne odpočet do nuly a start se odešle,
  až se síť vrátí.

### Krok 3 — přerušení a odvolání (čeká na rozhodnutí 2)

Teprve až bude jasné, jestli jsou to dvě věci, nebo tři.

### Krok 4 — posádka vidí tutéž sekvenci (po kroku 2)

Čtení téhož stavu v appce kapitána. Žádné ovládání.

### Krok 5 — alternativní trest (čeká na rozhodnutí o R31)

Dvě různé věci pod jedním jménem; dokud není jasné, jak se mají jmenovat na
obrazovce, nestavět.

### Co do tohoto plánu nepatří

- **Cíl a přepsání trasování** (R33) — vlastní velká věc, vlastní rozhodnutí.
- **Protesty** (K2, R32) — fáze 5, nezávislá.
- **Vypsání: třináct chybějících oddílů** (R21) — není o startu.
- **Čtyři třídy** (R29) — konfigurace, dělá rozhodčí, ne kód.

---

## Co se smí dělat bez dalšího rozhodnutí

- **Zapisovat další nahrávky a nálezy.** Miloš posílá průběžně a každá zpráva
  může změnit návrh — jedna už ho dnes obrátila (R34).
- **Odpovídat na jeho otázky** a pokládat ty, které jsou v dokumentu označené
  jako nezapsané.
- **Nestavět nic v `app/`**, dokud session stavící APK nedokončí vydání.

## Kde se pokračuje

`docs/OPONENTURA-ROZHODCI.md` — nálezy R1 až R34, pyramida autority, mapa
pravidel proti aplikaci a plán fází 1 až 4, který je už odjetý.

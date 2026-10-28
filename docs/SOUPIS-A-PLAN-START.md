# Soupis a plán: ovládání startu (28. 10. 2026)

Filip, 28. 10. 2026, než odjel:

> *„Musíme, než budeme překopávat cokoli, udělat nějaký soupis a plán, abychom
> si to nerozbili a rozhodli se správně. Toto je místo, ke kterému se kdyžtak
> vrátíme."*

**Nic z toho níž není postavené.** Dokument vznikl **místo** stavby, ne po ní.
Co je hotové, je v oddílu *Co už běží*; co by se stavělo, je v *Plánu* a čeká
na rozhodnutí z oddílu *Čtyři rozhodnutí*.

Zdroje: `docs/OPONENTURA-ROZHODCI.md` (nálezy R1–R34 a K1–K7, pyramida
autority), jedenáct hlasových nahrávek rozhodčího z 28. 10. 2026 a dva vzory
jeho listin.

**Přehled stavu je jinde.** Co z Milošových požadavků stojí a co ne, se čte
z `docs/STAV-RESENI.md` — jeden řádek na požadavek, seřazené podle dne závodu.
Tenhle dokument je o **pořadí stavby**, ne o stavu.

**Co kde je.** Horní polovina dokumentu je o **ovládání startu** — to je ta
věc, kterou Miloš potřebuje mít v ruce nejdřív. Dolní polovina
(*Celá fronta*) je soupis **všech 41 nálezů** rozdělený tak, aby se dal
odbavovat po dávkách.

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
| **Zamknutí startovní listiny** | Nic — Miloš to 28. 10. večer rozhodl: *„po rozpravě už nesmí"*. Zámek patří k **rozpravě**, ne ke startu | R39. R6 platí dál pro změny, které nejsou přihlášením (vyloučení, odhlášení, oprava třídy) |
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

---

## Celá fronta: 41 nálezů a co s nimi

Tohle je ta „hromada", ze které se máme postupně dostat. Nálezů je **41**
(R1–R34, K1–K7) a bez rozdělení se v nich pracovat nedá, protože **nejsou to
všechno úkoly**. Každý nález je níž přesně v jedné skupině:

| Kolik | Co to je |
| --- | --- |
| 12 | něco už z nich stojí (u sedmi zbývá zbytek) |
| 19 | **čeká na rozhodnutí** — nejde stavět, dokud nepadne |
| 3 | **dá se stavět hned**, nic nedrží |
| 6 | **poznání, ne práce** — nestaví nic, ale vysvětlují ostatní |
| 1 | rozhodnuto Milošem, nic se nestaví |

Z toho plyne věc, kvůli které ten soupis vznikl: **fronta na stavbu má dnes
tři položky**, ne čtyřicet jednu. Všechno ostatní je hotové, čeká na jednu
z devíti otázek, nebo to úkol nikdy nebyl.

### A) Něco z nich stojí — a co u nich zbývá (12)

| # | Hotovo | Co z toho zbývá |
| --- | --- | --- |
| R1, R8 | Vypsání jako dokument z dat (fáze 2.1) | Čtyři body J1 jsou `null` a místo konání je zadrátované „neuvedené"; dva z těch čtyř Miloš skutečně vydává |
| R5, R12 | Procedura: čas, délka, odložení, odvolání (fáze 3.1) | Obrazovka startéra a intervaly — jádro plánu výš |
| R9 | Souhlas závodníka, verze 2 včetně polohy (fáze 2.2) | Nezletilý závodník (otázka 7) |
| R10 | Tab `Lodě` na stránce regaty (fáze 1.3) | Miloš pak jmenoval **jiný** seznam dlaždic (otázka 1) |
| R17 | Zrušení rozjížďky s povinným důvodem (fáze 4.2) | — |
| R18 | Doručení ven v taktu minuty (fáze 4.3) | Že push dojde na telefon posádky do minuty, neověřeno |
| R19 | Velitelský čas, převzetí, doklad (fáze 1.2 + 3.2) | **Fronta nezaslaného startu je jen na webu**, v appce ne |
| K1 | Čtyři chybějící kódy, DNE se nedá škrtnout | — |
| K2 | Věta o visícím protestu u podpisu (fáze 1.3) | Protesty samotné = fáze 5 |
| K6 | Plánovaný start bez rozjetí rozjížďky (fáze 1.1) | — |

### B) Čeká na rozhodnutí — devatenáct nálezů na devíti otázkách (19)

Tohle je skutečná zácpa, a je menší, než vypadá: **osmnáct z devatenácti
nálezů stojí na devíti otázkách a osm z nich může Miloš odpovědět jednou
zprávou.** Proto jsou seřazené podle toho, kolik nálezů jedna odpověď uvolní,
ne podle čísla.

| Otázka | Uvolní | Komu patří |
| --- | --- | --- |
| 1. Jak se jmenují dva různé „alternativní tresty" na obrazovce — před startem (pravidlo 30) a u cíle (otáčky ZPJ 44)? A je dlaždic pro nepřihlášeného pět, nebo ten druhý seznam? | R31, R28 | Miloš |
| 2. Je „přerušit interval / přerušit start / zrušit start" dvě věci, nebo tři? Aplikace má dvě (ZPJ 27.3, 29.2) a liší se tím, co udělají s časem | R23, R13, R4 | Miloš |
| 3. Čtyři třídy: podle čeho lehký a těžký, a přeřadí se ročník 2027? Vypsání dnes říká délka trupu dle technického průkazu plus čelen | R29, R24 | Miloš |
| 4. Kdo smí po rozpravě sáhnout do startovní listiny a do tříd, a odkud? Dnes vede přihlášky pořadatel a rozhodčí jen vylučuje | R32, R6 | Miloš |
| 5. Odkdy se posádky „hlásí" — od přihlášky, nebo od rozpravy? | R3 | Miloš |
| 6. Je vypsání platné bez podpisu rozhodčího? Které z třinácti oddílů se mezi ročníky mění — a psal by směrnici v appce? | R20, R21, R22 | Miloš |
| 7. Vede nezletilého podpis za kormidelníka, nebo za kteréhokoli člena posádky? | R26 | Miloš |
| 8. Vynucovat průkaz VMP a technický průkaz při přihlášce, když je vypsání žádá a appka vede místo nich číslo ČSJ, které vypsání nežádá? A čas vyzývacího znamení, který neuvádí ani jeden jeho dokument? | R25, R27 | Miloš |
| 9. Cíl: ruční průjezd **i** přepsání toho, co určilo trasování, v jedné obrazovce | R33, R34 | Filip (je to velká věc) |

Devatenáctý je **K4** — mez z pravidla 76.1(a) u vyloučení. Je to otázka na
Miloše, ale nic nedrží; připojí se k té zprávě jako poslední řádek.

### C) Dá se stavět hned — nic nedrží (3)

| # | Co | Velikost |
| --- | --- | --- |
| K5 | Přeložený termín: ZPJ 80 žádá informovat **všechny přihlášené lodě**; aplikace termín přesune pečlivě a nikomu nic neřekne | malá, samostatná |
| K7 | Shoda v cíli: ZPJ A7 ji počítá rovným dílem, aplikace ji odmítne zapsat | malá |
| K3 | Ověřeno a Schváleno jsou dvě klepnutí téhož člověka — kandidát na „jde to, ale zbytečně" | malá, jen ubrat |

K tomu dva **zbytky z hotových**, které taky nic nedrží: ověřit na telefonu, že
push dojde do minuty (R18), a fronta nezaslaného startu i v appce (R19) — to
druhé je zároveň krok 2 plánu výš.

### D) Poznání, ne práce (6)

Tyhle se nemají odbavovat, mají se **znát**, protože vysvětlují ostatní:

- **R7** — hierarchie pramenů: rozhodčí má pravdu nad aplikací, a plyne z toho,
  kde smí žít vlastní pravidlo poháru.
- **R15 + R16** — **vlajky na poháru nejsou, jede se megafonem.** Z toho plyne
  věc, která musí být na očích při každé stavbě trestů: tresty podle
  pravidla 30 na poháru formálně neplatí, protože každé z těch pravidel začíná
  vyvěšenou vlajkou. Tabule to nespraví.
- **R11 + R14** — jeden Milošův výraz pro dva různé úkony; co se z toho má
  stavět, je otázka 1.
- **R30** — celý tok od rozpravy po odstartování jeho vlastními slovy. Je to
  **zdroj** patnáctikrokové tabulky výš, ne další úkol.

### E) Rozhodnuto Milošem, nic se nestaví (1)

**R2** — **forma** směrnice ke stažení: PDF versus zdrojový text. Jeho slova:
*„do budoucna uděláme prekognici … Teď stačí zdroj jak máme."* PDF tedy
zůstává.

> **Opraveno 28. 10. večer.** Původně tu stálo, že Miloš odložil *směrnici jako
> zdroj dat*. To byla moje nepravda: odložil formu ke stažení, a předvyplnění
> dat ze směrnice **sám navrhl**. Ten nález je **R22** a patří do skupiny B —
> nerozhodnuté je kdy, ne jestli.

### Jak se z toho dostáváme postupně

Dávky jsou navržené tak, že **žádná nečeká na tu před sebou**, kromě té, kde je
to napsané. Dá se začít kteroukoli.

| Dávka | Co se v ní dělá | Na čem to stojí |
| --- | --- | --- |
| **1** | Devět otázek ze skupiny B pošleme Milošovi jako **jeden seznam**, ne po jedné | na ničem — a uvolní osmnáct nálezů |
| **2** | Krok 1 plánu: odpočet v appce jen ke čtení | na ničem (otisk se nemění, jde po síti) |
| **3** | K5, K7, K3 — tři malé samostatné věci | na ničem |
| **4** | Krok 2 plánu: spuštění procedury z appky + fronta | po dávce 2 |
| **5** | Kroky 3 až 5 plánu | na odpovědích na otázky 1 a 2 |
| **6** | Vypsání: doplnit čtyři `null` body a místo konání | na odpovědi na otázku 6 |
| **7** | Cíl a přepsání trasování | otázka 9, vlastní velká věc |

> **Hranice návrhu, rozhodnutá 28. 10. večer.** Posádka v prvních verzích
> komisi **nic nehlásí** (R41) — appka kapitána je odběratel, ne vstup. Každý
> návrh, který by lodi dal kudy něco poslat komisi za jízdy, se tím zamítá.

> **Změna 28. 10. večer.** Miloš odpověděl na sedm z osmi otázek jednou dávkou
> třinácti nahrávek. Skupina B tím spadla z devatenácti na **deset**: R2, R3,
> R4, R6, R13, R21, R22, R33, K4 a R38 jako nová. Tři nálezy jsou zavřené jeho
> rozhodnutím (R26, R40, a R20 jako „neblokuje") a přibyly čtyři zadané věci
> ke stavbě: R35 (OCS), R36 (dvě otáčky), R37 (odklad s časem), R39 (zámek
> u rozpravy). Podrobně v oponentuře, oddíl *Odpovědi na osm otázek*.

**Čím se měří, že se z hromady dostáváme:** ne počtem zavřených nálezů, ale
tím, kolik zbývá ve skupině B. Dnes devatenáct. Po jedné zprávě Milošovi může
být jeden.

## Kde se pokračuje

`docs/OPONENTURA-ROZHODCI.md` — nálezy R1 až R34, pyramida autority, mapa
pravidel proti aplikaci a plán fází 1 až 4, který je už odjetý.

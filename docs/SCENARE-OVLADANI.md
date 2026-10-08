# Scénáře pro zkoušku ovládání a ergonomie

K čemu to je: **zjistit, kam se která role nedostane** a kde se cesta hledá
déle, než má. Výsledky plus audit kódu jsou podklad pro úpravy navigace — ne
seznam přání, ale seznam míst, kde někdo stál a nevěděl kudy.

Tohle je **zásobník na několik sezení, ne program jednoho odpoledne.** Jeden
člověk, který projde všechny role za sebou, přestane po druhé skupině měřit
ovládání a začne měřit, jak se aplikaci naučil a jak je unavený. Pořadatel
zkouší C; přihlášení pod účtem rozhodčího z něj rozhodčího nedělá. Co vzít
do prvního sezení, je na konci.

## Zadává se úkol, ne cesta

U každého scénáře je **Zadání** a **Pro moderátora**. Účastník slyší nebo čte
jen *Zadání* — očekávaná cesta, „čeká se", ruční adresa i organizační pokyny
pro druhý telefon jsou moderátorův list. Přečtené dohromady měří následování
návodu a potvrdí hypotézu, se kterou se do zkoušky šlo.

Napovědět se smí **až po třech minutách** a zapíše se **přesné znění nápovědy.**
Tři minuty platí na hledání odkazu. Při dávce dojezdů se zmeškaná loď musí
zachytit hned — pomoc o minutu později už zakryje selhání v tempu. **Otázky se
při rychlých dojezdech odkládají až za dávku**, jinak nestíhání vyrobí
moderátor.

## Co se zapisuje

Místo *dokončil / nedokončil* čtyři možnosti:

- **samostatně**
- **s pomocí** (a přesné znění nápovědy)
- **nedokončil**
- **zdánlivě dokončil, data nesedí** — obrazovka řekla hotovo, v datech to není
  nebo je to jinak

Dál čas, kolik špatných odboček, a jeho vlastní věta o tom, co čekal. Ta věta
je nejcennější — říká, kde čekal odkaz, který tam není.

**Co je špatná odbočka, se určí předem**, ne při zápisu: krok, ze kterého se
musel vrátit, protože na něm úkol dokončit nelze. **Jiná funkční cesta než
očekávaná není chyba** — je to zjištění o tom, kde cestu lidi hledají.

**Pozorování se zapisuje zvlášť od návrhu.** „Otevřel kalendář, pak směrnici"
je pozorování; „směrnice patří do nabídky" je návrh. Smíchané dohromady vydají
preferenci autora za zjištění účastníka.

U známého zákazu (C2, B4, B5, D4, D5) se neměří „nedokončil", ale dvě věci:
**rozpoznal důvod** a **našel skutečně dostupný další krok.** Bez toho se
v zápisu smíchá správné odmítnutí, chybějící funkce a nenalezený odkaz — a
oprava se pak navrhne na špatné místo.

Moderátor, který kouká pořadateli na telefon, při zápisu dojezdů klepnutí
propásne. Potřeba je druhý pozorovatel, nebo se souhlasem záznam obrazovky
a hlasu.

**Moderuju vlastní aplikaci**, kterou jsem napsal. Proto: zadání je napsané
předem a čte se slovo za slovem, nápověda se zapisuje v přesném znění,
a návrh úpravy nesmí vzniknout během sezení — jen pozorování.

## Kde se to zkouší a co z toho plyne

**Mock** (`tools/fake-api.py` + `npm --prefix web run dev`) na A, B, C, D, E
a F: scénáře zapisují a mažou data, na produkci nemají co dělat. Skupina B
a F1 přibyly 6. 10. 2026 (viz níž).

Mock **nic neukládá na disk.** Data načte při startu (`tools/fake-api.py:23`)
a nikdy je nezapisuje zpátky; stav žije v běžícím procesu. Celou sestavu
s databází na tomhle stroji rozjet nejde (není tu kontejnerový běh a Docker Hub
je odtud nedostupný — `README.md:24`). **Hranice závěru je tedy tahle:**

- **Co mock dokládá:** že je stav správný v běžícím procesu.
- **Co nedokládá:** trvanlivost. Zůstává neověřená a tak se i zapíše — ne jako
  úspěch, ne jako selhání.
- **„Potvrzeno serverem"** znamená **nové nezávislé načtení** bez místního
  konceptu v telefonu a porovnání **všech očekávaných údajů** (pořadí, časy,
  kódy). Zelená hláška `uloženo` sama nestačí.
- **Restart mocku během scénáře měření zneplatní.** Zapíše se jako neplatné,
  ne jako „data nesedí".

Rozlišují se tři stavy, ne dva: **místní zápis v telefonu**, **čeká na
odeslání**, **potvrzeno serverem.** Obrazovka to umí
(`uloženo / ukládám… / neuloženo`), zápis to musí rozlišovat taky.

### Co se na mocku zatím ověřit nedá

**Skupina B, posádka v A3 a F1 už jdou** (6. 10. 2026): mock umí `/ja/lode`,
`/ja/lode/{id}/kod`, `/ja/lode/{id}/pripojeni`, `/ja/pripojeni` a nároky,
včetně **platnosti kódu, přechodů rolí a odmítnutí**. Projeto scénáři B1–B5.
Účty pro ně: **`jana`** (majitelka lodi JOY, žádná role ve správě) a
**`petr`** (posádka lodi SENDY, která **nemá kapitána** — na tom stojí B5).
Jeden kód je nasazený **už prošlý** (`PROSLY`), aby se u B2 nečekalo
patnáct minut.

Zbývá dvojí, kde se závěry **nedělají**:

| Co | Proč | Co by to spravilo |
|---|---|---|
| **E4 v plném rozsahu** | Mock u zápisu **práva nerozlišuje** — přihlášeného bere jako pořadatele. Udělení role proto přístup druhého účtu doopravdy nezmění; jiný podpis autora to nedokládá | Vymáhat v mocku rozsah role, ne jen podepisovat |
| Odmítnutí ve správě ročníku (D4, D5) | Mock je odvozuje z **pravidel stavu**, ne z role, takže se měří hláška, ne oprávnění. Dvě výjimky, kde roli vymáhá doopravdy: **B4 a B5 podle vztahu k lodi** (403, jen majitel nebo kapitán) a **pořadatelský kód k cizí lodi** (`tools/fake-api.py:1196`, 403 bez role na celý ročník nebo na celý web). **C2 sem nepatří** — zapsat posádku ve správě nejde ani v mocku, ani ve webu, takže to není odmítnuté právo, ale chybějící funkce | Vymáhat rozsah role i ve správě ročníku |

Co naopak **jde**: role se liší v tom, co člověk **vidí** — nabídka, rozcestník
a jeho položky se počítají z týchž pravidel jako na serveru. Scénáře o tom,
kam se kdo dostane, tedy platí; scénáře o tom, co mu server zakáže, zatím ne.

**Druhý zapisovatel na mocku je.** Mock bere token jako jméno účtu
(`TOKENY` v `tools/fake-api.py`): `filip` je správce ročníku, `milos`
organizátor jedné zastávky, `zdenek` rozhodčí celého ročníku (přidán
8. 10. 2026, aby skupina D nejela jako správce), neznámé jméno mock odmítne
čtyřistajedničkou — dřív padalo na Filipa (změněno 6. 10. 2026).
Scénář **C7 je tím celé proveditelné** — ověřeno průchodem od konfliktu
přes porovnání dvou sloupců až po ruční společný výsledek.

**Výpadek nevyrábí mock, ale zařízení:** letový režim na telefonu nebo
*Offline* v nástrojích prohlížeče.

## Co už víme z auditu kódu (6. 10. 2026)

Tyhle věci není potřeba objevovat znovu — je potřeba změřit, **jak moc vadí**:

| Zjištění | Kde |
|---|---|
| ~~Nabídka účtu se počítá **jen z rolí na ročník**. Kdo má roli na celý web a žádnou v ročníku, nevidí v nabídce ročníkové položky — ačkoliv na ty obrazovky smí a po zadání adresy ho pustí~~ | **hotovo 6. 10. 2026** — nabídka i rozcestník počítají z jedněch pravidel, která ročníková práva míchají s rolí na celý web: `web/lib/co-smim.ts:46`, `web/app/profil.tsx:28`. Kdo má roli jen na web, jde přes položku Správa (`web/app/profil.tsx:92`); zkratky „Ročník {slug}" zůstávají schválně jen pro vlastní ročníky |
| ~~**Přihlášky nemají v nabídce položku.** Jde se na ně oklikou z kalendáře („přihlášky →") nebo z výsledků regaty („přihlášené lodě →")~~ | **hotovo 6. 10. 2026** — rozcestník ročníku vypisuje u každé regaty Výsledky · Přihlášky · Plachetní směrnice (`web/lib/co-smim.ts:179`, vykresluje `web/app/sprava/[serie]/page.tsx:163`). V rozbalovací nabídce pod ikonkou účtu položka není a nemá být — ta vede jen na rozcestník |
| ~~**Správa nemá rozcestník.** Neexistuje `/sprava` ani `/sprava/{ročník}`; jediná navigace je rozbalovací nabídka pod ikonkou účtu~~ | **hotovo 6. 10. 2026** (70cb074) — `web/app/sprava/page.tsx`, `web/app/sprava/[serie]/page.tsx`; nabídka na rozcestník vede, `web/app/profil.tsx:92` |
| **Posádku nejde zadat ve správě.** Pořadatel ji jen vidí; zapsat ji umí kapitán ve veřejné přihlášce nebo import. Kormidelník totéž | `prihlasky/[zavod]/page.tsx:494` |
| **Koncept z telefonu se vydává za ztracenou práci, i když je to vlastní přepsaný zápis.** `rozdily` (`web/app/sprava/[serie]/vysledky/[zavod]/[cislo]/koncept.ts:74`) hází do jedné hromady dva různé případy: řádek, který **v uloženém zápisu vůbec není** (`chybi` — ten se opravdu ztratí), a řádek, kde **uložené má jiné** (`jinak` — konflikt, klidně cizí oprava). Obojí se pak vypíše pod větou „Proti uloženému zápisu má navíc tohle" a „počítej i s nimi" (`koncept-ukazka.tsx:57,70`), ve formuláři dokonce jako „neodeslaný zápis, **který uložená čísla nemají**". V C12 jsou všechny rozdíly `jinak` a koncept je **vlastní dřívější zápis, který druhý zapisovatel opravil** — rada tedy vede k vrácení té opravy. *Doplnit do formuláře* to jedním klepnutím udělá. **Nalezeno reprodukcí C12 8. 10. 2026, opravit bez ohledu na zkoušku** | `koncept.ts:74`, `koncept-ukazka.tsx:53` |
| **Rozhodčí se k výsledkům dostane jen přes „Co teď".** V „Celém ročníku" má Kalendář a Oprávnění, ne Výsledky (ta položka chce organizátora, `web/lib/co-smim.ts:133`), a odkazy u jednotlivých regat chtějí organizátora všechny tři (`co-smim.ts:168,175,182`). Zbývá tedy úkol „Ověřit a pustit ven", a ten se počítá jen pro rozjížďky, které **nejsou k revizi** (`web/app/sprava/[serie]/page.tsx:263`). Dokud je něco k revizi, rozhodčí na tu regatu odkaz nemá — ačkoliv server ho k výsledkům pouští (`VysledkyEndpoints.cs:480`) a potvrzení i vrácení je jeho práce (`Workflow.cs:51`). **Změřit v D2 a D3**, pak rozhodnout | `web/lib/co-smim.ts:133` |
| **Medailonek pořadatele je jen z kalendáře.** ~~Směrnice taky~~ — ty jsou od 6. 10. 2026 na rozcestníku ročníku | `kalendar/page.tsx:313`; směrnice `web/lib/co-smim.ts:186` |

Prokázaná chyba z auditu je podklad pro opravu **i když ji zkouška mine.** Malá
zkouška není důkaz, že nevadí — jen ji nepotkala.

## Role, se kterými se zkouší

Role se udělují na `/sprava/{ročník}/opravneni`. Pro zkoušku je potřeba
**šest účtů**, ne jeden s přepínáním: půlka nálezů je o tom, co kdo v nabídce
vidí.

1. **Nepřihlášený** — běžný návštěvník.
2. **Kapitán lodi** bez role ve správě.
3. **Organizátor jedné zastávky.**
4. **Rozhodčí ročníku.**
5. **Správce ročníku** a zvlášť **správce celého webu bez role v ročníku**.

### Který účet kterou skupinu odjede

Předchozí verze tohohle dokumentu jmenovala role, které se mají zkoušet, ale
ne účty, kterými se zkoušejí — a ty se od nich v mocku lišily. Tabulka je
**ověřená v mocku 8. 10. 2026** (`tools/fake-api.py`: `OPRAVNENI` a
`_nasad_vazby`), a kde se liší role zadaná od role skutečné, stojí to u ní.

| Skupina | Účet (`op_token`) | Role, kterou doopravdy má | Výchozí stav | Platnost závěru |
|---|---|---|---|---|
| A | žádný — bez cookie | — | ročník je publikovaný | plná |
| B1–B4 | `jana` | **majitelka** lodi JOY (CZE 457), ve správě nic | k lodi nikdo další | plná, s výhradou níž |
| B5 | `petr` | posádka lodi SENDY (CZE 204) | loď **nemá odpovědného** | plná |
| C | `milos` | organizátor **jen zastávky `jarni-vitr`** | 11 účastí, 1 rozjížďka | **jen `jarni-vitr`**, viz níž |
| C5, C7 na `izolepa` | `filip` + `milos` | správce ročníku + organizátor cizí zastávky | 22 účastí, 3 rozjížďky | **tempo a konflikt ano, rozsah role ne** |
| D1–D3 | `zdenek` | **rozhodčí celého ročníku** | výsledky `Potvrzeno`, nic nečeká | plná pro navigaci |
| D4, D5 | `zdenek` | tamtéž | — | **jen hláška** — mock odmítá z pravidel stavu, ne z role |
| E1–E3 | `filip` | správce ročníku (`zavod: null`) | LUNA má kapitána od kódu → *ke kontrole* | plná, výhrada u E2 |
| E4 | `filip` | tamtéž | Jana je v seznamu účtů bez role | **jen zadání** — udělenou roli mock nevymáhá |
| E5 | `dana` | správkyně **celého webu**, v ročníku nic | — | plná |

Tři věci z toho, které měří něco jiného, než co je v názvu skupiny:

- **Skupina se jmenuje „kapitán", účet je majitelka.** `jana` je *majitel*,
  ne *kapitán*. Práva jsou tatáž — odpovědný za loď je majitel i kapitán
  (`Features/Lode/Kapitanstvi.cs`, `Odpovedny`) — ale **kapitána bez
  majitelství mock nemá**, takže se nezkouší, jestli se obě role na
  obrazovce chovají stejně. Zapiš u B, kterou rolí se jelo.
- **Miloš má roli jen na `jarni-vitr`** (`tools/fake-api.py`,
  `ZAVOD_DVOU_ZAPISOVATELU` je první odjetá zastávka s rozjížďkou), a ta má
  **11 účastí**. C5 chce 25–30 lodí a konflikt v C7 je zreprodukovaný na
  `izolepa` s 22. **Obojí v jednom průchodu nejde:** na `izolepa` Miloš roli
  nemá a projde jen proto, že mock u zápisu rozsah nevymáhá. Rozhodnutí:
  **tempo a konflikt se jedou na `izolepa`** (tam je na čem), a do zápisu se
  napíše, že se **neměřilo, kam se dostane organizátor jedné zastávky** —
  to je samostatné krátké sezení na `jarni-vitr`.
- **E2 si Filip potvrzuje vlastní kapitánství.** Loď *ke kontrole* je LUNA
  a kapitána od kódu na ní má právě `filip`. Scénář se tím dá odjet, ale
  otázka „pozná z obrazovky, proč je ke kontrole" se ptá člověka, který
  tam vidí své jméno. Pro čisté měření přehoď vazbu na jiný účet.

Kombinace, u kterých se **závěr nedělá**, se v zápisu značí `NEODJETO` s
důvodem — ne „prošlo". Dnes to jsou: **E4 v plném rozsahu**, **D4 a D5
jako odmítnutí práva** a **celá skupina C jako organizátor jedné zastávky**,
pokud se jelo na `izolepa`.

## Příprava dat a lidí

Bez tohohle se měří improvizovaná příprava, ne aplikace. Každý scénář má mít
**výchozí stránku, připravená data a určeného člověka**, který obsluhuje druhý
telefon.

- **Dlouhý seznam do cíle (C5).** V mocku má nejvíc lodí `izolepa` — 22 účastí
  z 37 lodí v ročníku, a to stačí; doplňovat `ucasti` v
  `data/2026-nanecisto.json` není potřeba. Podobná jména tam už jsou (ČERVENÉ
  CAFE / MODRÉ CAFE, SEA MOUSE III / FAR STAR III, MICHELLE / MICINY) —
  hledání v seznamu se zkouší proti nim. Dojezdy musí přijít **těsně za
  sebou**, ne vlastním tempem; přesný scénář je u C5.
- **Prázdná rozjížďka pro C5.** Všechny tři rozjížďky `izolepy` mají dojezdy
  zapsané, a do obsazeného cíle se klepat nedá — dojetá loď ze seznamu zmizí.
  Zadání proto začíná **odstartováním nové rozjížďky**: ta vyjde prázdná jako
  návrh (`tools/fake-api.py`, `pridej_rozjizdku`) a na odjeté zastávce ji
  založit jde (`proc_nejde_na_zavod` pouští `Vypsany` i `Odjety`). Ověřeno
  čtením kódu 8. 10. 2026, **projít si to před sezením stejně.**
- **Stav výsledků.** Zapisovat jde na zastávce ve stavu `Vypsany` nebo `Odjety`
  (`tools/fake-api.py:867`) a jen dokud jsou výsledky `Navrzeno` nebo `KRevizi`
  (`tools/fake-api.py:858,877`). Vybrat konkrétní rozjížďku předem.
- **Prošlý kód (B2).** Platnost je 15 minut
  (`src/OrlickyPohar.Api/Features/Lode/PripojovaciKod.cs:71`). Čekat na ni
  rozbije sezení — mít prošlý kód připravený dopředu a druhého člověka, který
  kód doopravdy dostane.
- **Konflikt (C7).** Nejdřív si ho **sám projdu a zreprodukuju**, včetně
  přesného pořadí načtení a uložení, a sepíšu správný společný výsledek. Bez
  toho spotřebuje čas na zkoušku příprava a rozbor se odbyde.
  **Druhý zapisovatel musí mít vlastní účet** (viz C7). Nejspolehlivější je
  mít jeho uložení připravené jako hotový příkaz, který se odpálí v daný
  okamžik — ne druhý člověk klikající podle sluchu.

  **Postup, kterým se konflikt vyvolá** (ověřený, `izolepa`, 1. rozjížďka):
  1. Potřebuješ `web/.env.local` — negitovaný soubor (`web/.gitignore:34`), bez
     něj se přihlášení vůbec nenabízí a nikdo není přihlášený. Na tomhle stroji
     už leží; na jiném ho založ takhle. Hodnoty jsou nesmyslné schválně, na
     poskytovatele se nikdo neptá:

     ```
     IDENTITA_AUTHORITY=http://localhost:9/neexistuje
     IDENTITA_CLIENT_ID=zkouska-ovladani
     WEB_URL=http://localhost:3000
     ```

  2. Kdo je kdo, se řídí cookie `op_token`. Jména zná mock: **`filip`**
     (správce ročníku), **`milos`** (pořadatel jedné zastávky — `jarni-vitr`),
     **`zdenek`** (rozhodčí celého ročníku, přidán 8. 10. 2026), **`dana`**
     (správkyně celého webu bez role v ročníku), **`jana`** (majitelka lodi
     bez role ve správě), **`petr`** (posádka lodi bez kapitána) a `vyvoj`
     jako Filip.
     **Jiné jméno mock odmítne** — překlep by jinak tiše udělal správce
     a měřilo by se něco jiného, než co se zadalo. Druhý telefon je tedy
     jiný profil prohlížeče s `op_token=milos`, anebo připravený příkaz
     s hlavičkou `Authorization: Bearer milos`.
  3. Rozjížďka musí být `Navrzeno` nebo `KRevizi`. Odjetá regata má výsledky
     `Potvrzeno` a zapisovat do nich nejde — nejdřív je **vrátit k revizi**.
  4. Telefon A zapíše dojezd (uloží se, revize se posune).
  5. Telefon B vyjde ze **starší** revize → konflikt. Pak načte čerstvý zápis
     a uloží svou verzi.
  6. Telefon A klepne znovu → konflikt, a v porovnání jsou dva sloupce.

---

## A. Nepřihlášený návštěvník

**A1 — Kdy se jede a kde.**
*Zadání:* Najdi termín a místo nejbližší regaty.

**A2 — Podle čeho se jede.**
*Zadání:* Najdi plachetní směrnici k té regatě.
*Pro moderátora:* hledá ji u regaty, nebo v menu? Je na stránce vidět, že je
to závazný dokument?

**A3 — Přihlásit loď.**
*Zadání:* Přihlas svou loď na regatu, včetně posádky.
*Pro moderátora:* **urči, čí loď to je a co na ni má za oprávnění** — jinak
se problém identity zapíše jako špatná navigace. Najde formulář? Čeká, že se
přihlašuje u regaty, nebo globálně? Dojde mu, že pole „Kdo pojede s tebou" je
volný text a nikoho to nezaloží?

**A4 — Jak si stojí loď v poháru.**
*Zadání:* Najdi průběžné pořadí a v něm jednu loď.

**A5 — Co znamená prázdno.**
*Zadání:* U tohohle ročníku zjisti, jak to vypadá s výsledky.
*Pro moderátora:* ročník se skrytými výsledky. Pozná, že se jelo, ale výsledky
se neukazují, od toho, že se nejelo?

**A6 — Co je venku doopravdy.** Jednou, po C3 i C4.
*Zadání:* Jsi účastník. Otevři směrnici k té regatě a řekni, která je to verze.
*Pro moderátora:* po C3 má být venku **ta správná verze**; po C4 nesmí jít
otevřít. Zkouší se **nové načtení původní adresy**, ne co má člověk už
otevřené. Tady se pozná rozpor mezi správou a veřejností.

**A7 — Minulá sezóna.**
*Zadání:* Je otevřený nový ročník. Najdi konečný výsledek a směrnici regaty
z toho minulého.
*Pro moderátora:* dohledatelnost po sezóně. Zapiš, kolik odboček a jestli
si nebyl jistý, že se dívá na ten starý ročník.

## B. Kapitán lodi (bez role ve správě)

Účty: **`jana`** je majitelka lodi JOY, **`petr`** posádka lodi SENDY bez
kapitána. Prošlý kód k uplatnění je `PROSLY`.

**B1 — Dostat se ke své lodi.**
*Zadání:* Přihlas se a najdi svoji loď.
*Pro moderátora:* očekávaná cesta je ikonka účtu → Moje lodě. Nahlas se
to neříká.

**B2 — Připojit posádku.**
*Zadání:* Přidej k lodi dva lidi.
*Pro moderátora:* druhý příjemce kódu je připravený a prošlý kód taky
(15 minut, viz příprava). Najde vystavení kódu? Pochopí, že kód předává
posádce, ne že je zadává sám? Co udělá s prošlým?

**B3 — Kdo mi to tam leze.**
*Zadání:* Někdo požádal o připojení k tvé lodi — najdi to a rozhodni.

**B4 — Odebrat člověka.**
*Zadání:* Odeber připojeného. Potom odeber sebe.
*Pro moderátora:* druhé **nejde** (jediný kapitán). Měř, jestli z hlášky pozná
důvod a jestli najde, co má udělat místo toho.

**B5 — Loď bez kapitána.**
*Zadání:* Jsi posádka lodi, která kapitána nemá. Vystav kód.
*Pro moderátora:* **nejde.** Je vidět proč a za kým jít?

## C. Organizátor zastávky

**C1 — Zapsat loď, která v ročníku není.**
*Zadání:* Na tvou regatu přijela loď, která letos ještě nikde nestartovala.
Zapiš ji i s majitelem.
*Pro moderátora:* najde blok „Nová loď, která v ročníku ještě není"? Ví, že
tím loď zakládá na celý ročník, ne jen na svou regatu?

**C2 — Zapsat posádku.**
*Zadání:* K téhle přihlášené lodi dopiš posádku.
*Pro moderátora:* **nejde — funkce chybí** (viz audit). Neeviduj jako
„nedokončil", ale jako **chybějící možnost zápisu**. Zapiš, kde ho to
zastavilo, co zkoušel a jestli našel, kdo to zapsat může (kapitán, import).

**C3 — Vyvěsit směrnici.**
*Zadání:* Vyvěs tohle PDF u své regaty, ať je podle čeho jet.
*Pro moderátora:* očekávaná cesta je kalendář → směrnice.

**C4 — Odvolat špatnou směrnici.**
*Zadání:* Ve vyvěšeném PDF jsou telefony posádky. Zařiď, ať není venku.
*Pro moderátora:* hledá mazání? Najde stažení? Je mu po provedení jasné, co
ještě musí udělat ručně? Pak jde A6 s původní adresou.

**C5 — Zápis z cíle.** Na telefonu, venku, jednou rukou.
*Zadání:* Odstartuj rozjížďku a zapiš, jak lodě dojely. Budu ti je číst.
*Pro moderátora:* **to hlavní z celé zkoušky.** Dřív tu stálo jen „dojezdy
těsně za sebou" — to si každý moderátor odmoderuje jinak a dvě sezení pak
nejde srovnat. Tempo je proto **dané, čte se z papíru se stopkami** a
nepřizpůsobuje se tomu, jak účastník stíhá. Zastávka `izolepa` (22 účastí),
nově odstartovaná rozjížďka.

**Co se čte** — jméno, a v závorce kolik sekund po předchozím:

| # | Loď | po |
|---|---|---|
| 1 | MAMBA | — |
| 2 | ČERVENÉ CAFE | 4 s |
| 3 | MODRÉ CAFE | 2 s |
| 4 | SEA MOUSE III | 6 s |
| 5 | FAR STAR III | 2 s |
| 6 | LUNA | 8 s |
| 7 | THEA | 3 s |
| 8 | Zephyr | 2 s |
| 9 | MICHELLE | 1 s |
| 10 | MICINY | 1 s |
| 11 | HOGAN | 10 s |
| 12 | AVENIR | 5 s |

Pak jediná věta: **„SOCKA nedojela."** Celé čtení je asi 44 sekund. Trojice
dvojic je tam schválně: dvě CAFE a dvě „III" po dvou sekundách a MICHELLE
s MICINY po jedné — tam se pozná, jestli seznam jde prohledat, nebo se v něm
chybuje.

**Správný výsledek:** těch dvanáct lodí přesně v tomhle pořadí, SOCKA jako
DNF, nic dalšího v rozjížďce. Porovnává se po scénáři **novým nezávislým
načtením**, ne zelenou hláškou.

*Sleduj:* zvládne to bez pomoci? Ví po každém klepnutí, že je uloženo? Stíhá
tempo, nebo hledá v seznamu — a u které dvojice? **Otázky odlož až za celou
dávku**; zmeškanou loď (SOCKA) ohlas v okamžiku, kdy na ni dojde řada, ne
později.

**C6 — Oprava omylu.**
*Zadání:* Dvě lodě dojely v jiném pořadí, než jsi zapsal, a jedna ti vypadla.
Oprav to.
*Pro moderátora:* **dvakrát tutéž loď klepnout nejde** — dojetá loď ze seznamu
zmizí (`cil.tsx:234`) a stejnou sadu odmítne i API („Loď je v zápisu dvakrát",
`tools/fake-api.py:888`). Zkouší se tedy **záměna dvou lodí** (přesun v pořadí,
`cil.tsx:244`) a **vynechaný dojezd** dopsaný pozdě. Dvojí klepnutí na totéž
nech jako samostatné pozorování: co se stane a pozná to.

**C7 — Dva telefony.** Dokončit, ne jen vidět hlášku.
*Zadání:* Ulož zápis. — a po uložení, s oběma podklady v ruce: — Tady jsou
zápisy obou zapisovatelů. Zařiď, aby ve výsledcích bylo pořadí, jak se
doopravdy dojelo.
*Pro moderátora:* **nic z tohohle se neříká předem.** Druhý zapisovatel uloží
svou opravu na pokyn, až bude účastník uprostřed své. Nečekaná změna je část
toho, co se měří.
Účastník dostane **dva podklady s oběma platnými opravami** (čím se zápisy
liší), správný společný výsledek zůstává na tvém listu.
*Čeká se* hláška o konfliktu, odkaz na porovnání a to, že vlastní klepnutí
zůstanou v telefonu. **Společný výsledek je dosažitelný ručně** — porovnání
nabídne buď „Použít verzi: {kdo}", nebo odkaz na formulář zápisu se větou
„Když platí kus od každého, sepište správné pořadí"
(`porovnani/page.tsx:146,152`); formulář si nese čerstvou revizi
(`[cislo]/page.tsx:181`), takže ruční pořadí se se starou verzí neutká.
Automatické sloučení aplikace neumí a nemusí.
**Dvě místa, kde se dřív ztrácel dojezd, jsou opravená** (6. 10. 2026) —
zkouška je teď kontroluje, místo aby na ně doplácela:

- **Porovnání ukazuje i neodeslaný zápis z telefonu** a vyjmenuje, co má
  navíc proti serveru. Dřív stavělo vedle sebe jen snímky ze serveru, takže
  klepnutí, které kvůli konfliktu neprošlo, v něm nebylo vůbec — kdo
  sepisoval společný výsledek podle porovnání, o ně přišel.
- **Oprava ve formuláři koncept vyřeší.** Dá se z něj doplnit jedním
  klepnutím a po uložení zmizí, takže už se na cíli nenabídne k odeslání.
  Dřív tam zůstal ležet a odeslat ho znamenalo přepsat právě dokončenou
  opravu.

*Sleduj tedy:* všimne si účastník té věty o telefonu v porovnání? Použije
**Doplnit do formuláře**, nebo pořadí přepíše ručně? A dojde mu u *Odeslat
z telefonu a přepsat uložené*, co to udělá — hláška mu teď vyjmenuje, které
lodě by se přepsaly.

Po druhém zapisovateli se nad zápisem objeví *„Zapisuje i někdo další. Každý
má svoji verzi; ve výsledcích je ta naposledy uložená."* — všiml si jí dřív,
než přišel konflikt?

**Musí to být dva různé účty.** Snímek k porovnání je jeden na zapisovatele
(`ZapisSprava.cs:369`, test `Dva_zapisovatele_maji_kazdy_svuj_snimek`), takže
při **jednom účtu na dvou telefonech** druhé uložení ten první snímek přepíše:
konflikt (409) nastane, ale porovnání ukáže jediný sloupec a větu „Zapisoval
jeden člověk ({kdo}), takže se porovnávat nemá s čím" (`porovnani/page.tsx:125`).
Účastník by skončil ve slepé uličce a jeho neúspěch by neznamenal nic.
Varianta s jedním účtem je proto **samostatné pozorování s předem známým
koncem**, ne cesta k společnému výsledku — a eviduje se jako funkční mezera
k rozhodnutí, protože sdílený účet na dvou telefonech je u vody pravděpodobný.
Hláška u konfliktu navíc v tom případě tvrdí *„uložila ho někdo jiný"*,
ačkoliv to byl tentýž účet, a porovnání pak řekne, že není s čím porovnávat —
přitom dva různé stavy existují. K opravě by nejspíš stačilo porovnat
serverový zápis s místním konceptem; to je ale návrh, ne nález z této
zkoušky.

**C8 — Papír.**
*Zadání:* Dopiš zápis doma z fotky papíru a přilož ji.

**C9 — Přerušení zápisu: přepnutí aplikace.** Se signálem.
*Zadání:* (uprostřed C5) Zamkni telefon, podívej se do zprávy a vrať se
k zápisu. Pokračuj.
*Pro moderátora:* zkouší se **jediná věc** — přežije otevřená stránka
uspání. Obrazovka si po návratu načítá čerstvý zápis (`cil.tsx:214`). Ověř,
že nechybí ani jeden dojezd, a zapiš, jestli účastník po návratu věděl, na
čem je. Dřív byly tyhle tři scénáře jeden a zápis z nich nešel rozdělit:
nebylo poznat, co selhalo při uspání a co až při novém načtení.

**C10 — Přerušení zápisu: nové načtení bez signálu.**
*Zadání:* (navazuje, s neodeslanými dojezdy) Vypni signál a načti stránku
znovu.
*Pro moderátora:* **chybová stránka prohlížeče není ztráta dat** a nesmí se
tak zapsat. Web je serverový, takže bez sítě se stránka nemá z čeho
vykreslit; měří se tu jen tohle: **dozví se účastník, že jeho dojezdy
pořád existují**, nebo si z chybové stránky odvodí, že o ně přišel? Jeho
vlastní věta je celý výsledek scénáře. Zápis je `samostatně / s pomocí /
nedokončil` **o rozpoznání stavu**, ne o dokončení úkolu — úkol tu žádný
dokončitelný není.

**C11 — Přerušení zápisu: obnova po vrácení signálu.**
*Zadání:* Vrať signál a dostaň zápis do pořádku.
*Pro moderátora:* tady se teprve zkouší **obnova konceptu z telefonu**
(`cil.tsx:163`) — bez samostatného scénáře zůstává nefunkční obnova
schovaná za tím, že karta předtím nezmizela. Když se zápis mezitím změnil,
nabídne se *Odeslat z telefonu a přepsat uložené* / *Zahodit zápis
z telefonu* (`cil.tsx:382,392`). **Čeká se**, že se nic neztratilo a že
výsledek projde kontrolou novým nezávislým načtením. Zapiš, kterou
z nabídek zvolil a proč — a jestli mu bylo jasné, co druhá udělá.

**C12 — Uložení, o kterém telefon neví.** Nejzrádnější případ u vody.
*Zadání:* (s neodeslanými dojezdy v telefonu) Ulož zápis a zařiď, aby ve
výsledcích bylo správné pořadí.
*Pro moderátora:* situace, kterou žádný scénář nepokrýval: **server zápis
přijal, ale odpověď se k telefonu nevrátila.** Telefon si drží koncept jako
neodeslaný, mezitím druhý zapisovatel opraví záměnu, a účastník pak klepne
na uložení znovu.

*Jak ji vyrobit* (bez simulace sítě, přes tři kroky, na `izolepa`):

1. **Telefon A** naklepe dojezdy a **neuloží** — v telefonu leží
   neodeslaný koncept.
2. **Připravený příkaz** s hlavičkou `Authorization: Bearer filip` pošle
   **tutéž sadu** na server (s čerstvou revizí, bez ní ji server odmítne).
   Tím je na serveru zápis účastníka, o kterém jeho telefon neví.
3. **Telefon B** (`milos`) načte čerstvý stav, prohodí dvě lodě a uloží.
4. **Telefon A** klepne na uložení → konflikt a porovnání.

*Správné řešení je zahodit koncept*, protože server už obsahuje totéž plus
opravu od B. Nebezpečí je přesně obrácené: *Odeslat z telefonu a přepsat
uložené* vrátí záměnu zpátky. **Měří se tedy jediná otázka:** pozná
účastník z porovnání, že jeho koncept **nemá nic navíc**, a že tudíž není
co odesílat? Zapiš jeho vlastní věty, čím se rozhodl.

*Jak se vyrobí neodeslaný koncept:* cílová obrazovka **ukládá po každém
klepnutí**, takže „naklepat a neuložit" samo o sobě nejde — telefon A musí
v tu chvíli být bez signálu. Pak klepnutí zůstanou v telefonu
(`cil.tsx`, `zapamatuj`) a odejdou samy, až se síť vrátí (`cil.tsx`,
posluchač `online` a půlminutový časovač). Krok 2 a 3 se mezitím odbaví
připravenými příkazy.

*Stav scénáře:* **zreprodukováno v prohlížeči 8. 10. 2026** proti mocku,
celou cestou — nová rozjížďka, výpadek, tři klepnutí, uložení telefonu A
mimo prohlížeč, oprava od Miloše, návrat sítě, konflikt, porovnání.
A **našlo to chybu**, viz audit níž: porovnání i formulář tvrdí o konceptu,
že ho uložená čísla „nemají", a radí ho započítat — přitom je to vlastní
starší zápis, který mezitím někdo opravil. *Doplnit do formuláře* opravdu
jedním klepnutím vrátí starší pořadí (ověřeno; neuloženo). **Do sezení
s člověkem patří až po opravě té hlášky** — jinak se měří, jestli účastník
odolá špatné radě.

## D. Rozhodčí ročníku

**D1 — Založit regatu.**
*Zadání:* Založ regatu a dej jí termín.

**D2 — Ověřit výsledky.**
*Zadání:* Ověř výsledky jedné rozjížďky a pusť je ven.

**D3 — Vrátit k revizi.** Dokončuje se až předáním, ne vrácením.
*Zadání:* V těchhle výsledcích je chyba. Zařiď opravu.
*Pro moderátora:* má je vrátit s důvodem. **Pokračuj dál:** pořadatel opravu
udělá a pošle je zpátky, rozhodčí je pustí ven. Pochopí pořadatel, že se bez
vrácení čísla přepsat nedala? Dozvěděl se, že se má něco opravit, z aplikace?
Od 6. 10. 2026 na to rozcestník ročníku odpovídá sám: vrácené výsledky stojí
na prvním řádku „Co teď" s počtem k revizi a se sdělením, že rozhodčí napsal,
co je špatně (`web/app/sprava/[serie]/page.tsx:234`) — ten důvod samotný ale
na rozcestníku není, takže se pořád měří, jestli ho člověk najde.

**D4 — Zapsat výsledky sám.**
*Zadání:* Zapiš výsledky téhle rozjížďky.
*Pro moderátora:* **nejde.** Měř rozpoznání důvodu a nalezení dalšího kroku.

**D5 — Přesunout termín.**
*Zadání:* Přesuň termín téhle regaty.
*Pro moderátora:* regata je odjetá, **nejde.** Totéž: důvod a další krok.

## E. Správce

**E1 — Určit kapitána lodi.**
*Zadání:* Tahle loď má jen posádku. Urči kapitána.
*Pro moderátora:* očekávaná cesta je nabídka → Lodě {ročník}.

**E2 — Kapitán od kódu.**
*Zadání:* Najdi lodě, u kterých je potřeba zkontrolovat kapitána, a jednu
potvrď.
*Pro moderátora:* pochopí z obrazovky, proč jsou ke kontrole?

**E3 — Nahradit kapitána**, kterého udělal kód omylem.
*Zadání:* U téhle lodi je kapitánem někdo, kdo jím být nemá. Sprav to.

**E4 — Udělit roli.** Dokončuje se prvním přihlášením toho druhého.
*Zadání:* Nový pořadatel má dělat jednu regatu. Zařiď mu to.
*Pro moderátora:* **pokračuj dál:** ten člověk se poprvé přihlásí a má najít
svou regatu. Tady se pozná, jestli práce neuvázne mezi lidmi — role je
udělená a druhý netuší, kam jít. Dozvěděl se vůbec, že ji má?

**E5 — Správce celého webu.**
*Zadání:* Přesuň termín budoucí regaty ročníku 2027.
*Pro moderátora:* účet s rolí **jen na celý web** (`dana`,
`tools/fake-api.py:352,371`). Zkratky na ročník v nabídce nejsou, cesta vede
přes **Správa → ročník → Kalendář ročníku**: rozcestník ročníky zná i z role
na celý web (`web/lib/co-smim.ts:92`, `web/app/sprava/page.tsx:46`). **Ruční
adresu podej až po zaznamenaném neúspěchu** — schopnost uhodnout adresu není
měřítko použitelnosti. Veřejný kalendář najde snadno; proto se zadává úprava,
ne hledání. Od rozcestníku (6. 10. 2026) se tu měří, jestli tu cestu najde — ne
jestli usoudí, že funkce neexistuje.

## F. Napříč rolemi

**F1 — Od začátku do konce.** Jen pro **čerstvého účastníka** — po A a B už tentýž
člověk první orientaci neměří.
*Zadání:* Přihlas se, připoj se k lodi, podívej se na směrnici a po regatě si
najdi výsledek.
*Pro moderátora:* kolik odboček?

**F2 — Zpět a staré adresy.**
*Zadání:* (po uložení zápisu a po opravě) Vrať se tlačítkem Zpět. — a po C4: —
Načti znovu adresu té stažené směrnice.
*Pro moderátora:* u zápisu nesmí jít uložit starší stav; obrazovka cíle si
proti tomu po návratu načítá čerstvý zápis (`cil.tsx:214`). U směrnice je
rozhodující **nové načtení původní adresy po stažení** — že má člověk PDF
pořád otevřené nebo uložené v telefonu, selhání odvolání není.

**F3 — Bez signálu.**
*Zadání:* (v C5) Zapni letový režim, zapiš tři dojezdy, pak signál vrať.
*Pro moderátora:* **čeká se**, že se dojezdy dopraví samy — hned po chycení
sítě, jinak do půl minuty (`cil.tsx:192`). Rozliš místní zápis, čekání
a potvrzení serverem podle hranice výš: potvrzení je nové nezávislé načtení
a porovnání všech údajů, ne zelená hláška. Trvanlivost tím ověřená není.

Podmínky u vody (telefon, jedna ruka, slunce) nejsou samostatný scénář —
patří do C5 a C7.

---

## První sezení: jedno odpoledne s jedním pořadatelem

Data připravená předem, konflikt v C7 předem zreprodukovaný. Začíná se **prvním
přihlášením po udělení role**, ne na hotové obrazovce. Dva bloky s pauzou,
dohromady **do dvou hodin včetně rozboru** — kdyby to mělo přetéct, obětuje se
bod 4, ne rozbor.

1. Zapsat dávku dojezdů venku na telefonu — **C5**
2. Opravit záměnu a vynechaný dojezd, pak celá cesta výpadkem: uspání,
   nové načtení bez signálu, obnova po vrácení signálu — **C6, C9, C10,
   C11, F3**
3. Vyřešit připravený konflikt a dojít ke společnému výsledku (dva různé
   účty, jinak není co porovnávat) — **C7**
4. Vyvěsit a stáhnout PDF, ověřit veřejný stav — **C3, C4, A6**

**Rezerva**, když zbude čas: **C1** (pozdě příchozí loď). **C12** do
sezení nepatří, dokud se neopraví hláška o konceptu (viz audit) — dnes by
se měřilo, jestli účastník odolá špatné radě na obrazovce. Do prvního sezení
nepatří skupina B ani F1 — ~~na mocku nejsou proveditelné~~; od 6. 10. 2026 na
mocku jdou (viz výš), ale první sezení je o pořadateli a F1 chce čerstvého
člověka.

Výstupem jsou konkrétní blokátory práce pořadatele. Ostatní role potřebují
vlastní krátká sezení.

## Kdy je toho dost

Aby z každého nového názoru nevznikla další přestavba nabídky:

- **Blokátor potvrzený auditem nebo vlastní reprodukcí** jde do oprav hned.
- **Další navigační zásek** potřebuje **druhé nezávislé pozorování**, nebo
  potvrzení auditem, že cesta chybí. Jedno zaseknutí jednoho člověka je
  podnět, ne nález.
- Po opravách přijde **čerstvý pořadatel na hlavní úkoly** (C5, C6, C7)
  **a na výpadek s obnovou** (C10, C11, F3). Výpadek do závěrečného
  průchodu patří proto, že se u vody stane častěji než konflikt a jeho
  selhání je tiché: zelená hláška zůstane, chybí až data. Obrazovka
  o výpadku je dnes čtyři měsíce stará a žádným sezením neprošla.
- **Kolo končí, když ty úkoly dokončí samostatně a výsledná data sedí** —
  kontrolou novým nezávislým načtením, ne hláškou. U C10 se za dokončení
  bere **rozpoznání stavu**, ne provedení úkolu; úkol tam žádný není.

## Z čeho se bude vycházet při úpravách

Z nálezů, ne z dojmu. Každý návrh úpravy má mít u sebe **scénář, ve kterém
někdo stál**, a odhad, koho se to týká. Pořadí podle toho, co blokuje práci
u vody, pak co se dělá často, a teprve pak pohodlí.

Seznam přání do úprav nepatří. **Prokázaná chyba z auditu ano** — i když ji
zkouška nepotkala.

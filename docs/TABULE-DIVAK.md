# Tabule očima diváka: co dělá, když se mění stavy a pozice

Zadání (Filip, 26. 10. 2026): *„koukni na tabuli z pohledu diváka, když se
mění stavy a pozice lodí, zda je v ní vše v pořádku."*

Tabule visí v hospodě a nikdo ji neobsluhuje. Měří se tedy jediná věc:
**co se na ní stane samo, když se na druhé straně něco pohne** — pořadatel
odstartuje, zapíše dojezd, rozhodčí vrátí čísla k revizi, správce je pustí
ven, trať se přestavuje, lodě jedou po vodě. Nálezy jsou seřazené podle
toho, co divák uvidí, ne podle souborů.

## Mez poctivosti

**Odjeto agentem proti mocku, ne s divákem u televize.** Co to dokládá:
že cesta existuje, že se stav na obrazovce po změně skutečně změní a že
čísla sednou. Co to nedokládá: jestli to někdo přes místnost přečte, jestli
ho to zmate a co ho zajímá. Sezení s někým, kdo se na tabuli dívá kvůli
závodu, to nenahrazuje.

**Každý nález o oprávnění nebo o výdeji dat je ověřený i proti API**
(`src/OrlickyPohar.Api`), ne jen proti mocku — mock se v dřívějších
auditech ukázal jako lhář v obou směrech. Kde nález stojí jen na mocku, je
to u něj napsané.

## Čím se měřilo

- vlastní mock na portu **8111** (`tools/fake-api.py` nad kopií
  `data/2026-nanecisto.json`, kde má `izolepa` rozjížďky vrácené do
  `Planovana`), web na **3111** — cizím session se na 8080/8099 nesahalo;
- regata **`izolepa`** v ročníku `2026-nanecisto`: 22 přihlášených lodí,
  tři třídy, trať o třech prvcích, přijatá k 1. a 2. rozjížďce;
- celý závodní den odjetý příkazy do správy (rozprava → živý přenos ven →
  start → dvanáct dojezdů → konec → ověřeno → schváleno → potvrzeno →
  publikace → revize → eliminace → zastávka odjetá → skryté výsledky),
  obrazovka u toho celou dobu otevřená;
- stav obrazovky se **nečetl ze snímku, ale z DOM** (`getBoundingClientRect`,
  text karet v půlsekundovém odečtu). Karta alertu se prolíná a na snímku
  obrazovky se dá minout; odečet ji minout nemůže.
- okno **1280 × 720**, tedy televize 16 : 9 s jednotkou `--tv` stejnou jako
  na Full HD.

Ovládací skripty (nepatří do repa) leží v `rizeni/` ve scratchpadu té
session: `op.py` (volání do správy), `dojezdy.py` (zápis z cíle),
`cely_den.py` (odjede den od rozpravy po publikaci).

---

## Opraveno

### 1. První vykreslení bylo staré, a první obnova z toho udělala salvu
**Kdy to divák vidí:** vždycky, když se stránka načte — televize po
restartu, prohlížeč po probuzení, člověk, který na adresu přijde.

Stránka tabule četla detail závodu s minutovou cache
(`nacti` ve `web/lib/api.ts`, `revalidate: 60`), kdežto obnovovací cesta
`tabule/data` bez ní. Alerty se počítají **proti poslednímu snímku**, takže
první obnova porovnala čerstvý stav proti až minutu starému a vyjela kartu
za každou změnu z té minuty.

*Změřeno:* načtení tabule nad regatou, která měla rozjížďku dojetou
a publikovanou, vyjelo `1. rozjížďka dojeta` a po ní dvanáct karet
`V cíli · 1. MAMBA … 5. FAR STAR III …` — tedy celý závod znovu, jako by
se dojíždělo právě teď.

*Oprava:* `nactiZavod(slug, zavod, true)` v
`web/app/serie/[slug]/zavody/[zavod]/tabule/page.tsx`. Mikrocache před
webem drží odpověď deset vteřin pro celou hospodu, takže API to nezatíží.

*Ověřeno po opravě:* totéž načtení, 28 vteřin odečtu, **ani jedna karta**.

### 2. „Potvrzeno" u regaty, kde se jedna rozjížďka přepisuje
**Kdy to divák vidí:** rozhodčí vrátí jednu rozjížďku k revizi a jiná je
mezitím potvrzená — tedy běžná chvíle po závodě.

`Vysledky` hledá **nejméně hotový stav** ze všech odjetých rozjížděk
(`vysledky.tsx`). Počítalo se to `RADA.indexOf`, jenže `KRevizi` v řadě
není a vrací −1; jakmile se −1 jednou uložilo, přebil ho **kterýkoliv
pozdější** stav. Výsledek tedy záležel na pořadí rozjížděk, což je
u „nejslabšího ze všech" samo o sobě špatně.

*Změřeno:* 1. rozjížďka `KRevizi`, 2. `Potvrzeno` → hlavička hlásila
`odjeto 2 rozjížďky · potvrzeno · 1 z 2 potvrzeno` a oranžové varování
*„Předběžné pořadí; čísla se ještě mohou změnit"* **zmizelo** — přesně ve
chvíli, kdy má být vidět.

*Oprava:* revize stojí pod celou řadou, ne mimo ni.

*Ověřeno po opravě:* `odjeto 2 rozjížďky · v revizi · 1 z 2 potvrzeno`
a varování svítí.

### 3. Mezi rozjížďkami nadpis „POŘADÍ" nad prázdnem
**Kdy to divák vidí:** rozjížďka dojela, pořadatel ji zapsal, správce ji
ještě nepustil ven. To je většina závodního dne.

`panely` v `web/lib/tabule.ts` vrací i při prázdném pořadí **jeden náhradní
panel**, aby karuselu nezmizel celý sloupec. Obrazovka výsledků se ale
ptala `tabule.length === 0`, a to tím pádem nenastane nikdy.

*Změřeno:* jediný panel s nadpisem `POŘADÍ`, nula řádků, výška 198 px,
žádná věta. Půlka obrazovky černá a nic ji nevysvětlí.

*Oprava:* rozhoduje, jestli má aspoň jeden panel lodě. Text navíc rozlišuje
dvě různé věci: *„Zatím se nejelo."* a *„Odjeto je, čísla ještě nejsou
venku. Jakmile je správce pustí, objeví se tady."*

*Ověřeno po opravě:* věta je na obrazovce, panel zmizel.

### 4. Karta o přestavbě trati si odporovala
Nadpis `Trať se přestavuje`, pod ním *„rozhodčí ji ještě nepřijal"*.
Veřejná trať při přestavbě nevydává číslo rozjížďky, takže detail spadl do
větve pro nepřijatou trať.

*Oprava:* přestavba má vlastní větu — *„lodě čekají, značky se posouvají"*.
*Ověřeno po opravě:* `ČEKÁ SE | Trať se přestavuje | lodě čekají, značky
se posouvají`.

### 5. Tabule nepočítala s tím, co leží nad ní
`.tabule` má výšku `100dvh − patička`, jenže nad ročníkem nanečisto visí
pruh *„Ukázková data"* (`web/app/ukazka.tsx`) a ten ji posune o svou výšku
dolů. Tabule tedy končila **28 px pod pásem partnerů** a těch 28 px si
držela jako plochu, která na obrazovce není. Pásy tříd byly proti tomu
přišpendlené k oknu (`position: fixed` v `globals.css`, s komentářem, který
ten pruh jmenuje) — srovnalo se to u pásů, ne u tabule.

*Oprava:* obrazovka si změří vlastní horní okraj a pošle ho do CSS jako
`--nad-tabuli`; výška si ho odečte. Natvrdo zapsaná výška pruhu by se
rozešla s textem, který se na úzkém okně zalomí.

*Ověřeno po opravě:* `.tabule` končí na 674 px, pás partnerů začíná na
674 px. **Nález 6 to ale neřeší** — viz níž.

### Mock: dvě místa, která by se měřila místo aplikace
- **Jména lodí v polohách a v záznamu byla klíče.** `polohy_zastavky`
  a `zaznam_rozjizdky` braly `u["lod"]` z účastí, což je klíč, kdežto API
  vydává `Lod.Nazev`. Na tabuli z toho bylo pořadí `cervene-cafe`,
  `sea-mouse-iii`, `m-rtina` — vypadá to jako vada webu a není.
- **Záznam rozjížďky padal na `ValueError`.** Čas startu nese „Z"
  a `datetime.fromisoformat` ho do Pythonu 3.11 nepřijme; na tomhle stroji
  běží mock pod **Pythonem 3.9**, takže zrychlené review nešlo lokálně
  vyzkoušet vůbec — tabule dostávala prázdnou odpověď.

Obojí je opravené. **Pozor:** obě opravy se svezly do cizího commitu
`8dee4cc` (souběžná session auditu obsazení commitovala celý pracovní
strom), takže v historii stojí pod jejím popisem, ne pod tímhle auditem.

---

## Otevřené — o těchhle rozhodne Filip

**Nálezy 6 a 8 jsou od 27. 10. 2026 přeškrtnuté** a **nález 7 od
28. 10. 2026**, ale zůstávají tady: u šestky kvůli číslům, proti kterým se
oprava dá přeměřit, u osmičky proto, že poslední rozhodnutí v ní nebylo
technické, a u sedmičky proto, že se na ni odkazuje oponentura rozhodčího.

### 6. ~~Startovní listina nemá výškový rozpočet a lodě z ní tiše padají~~
**Opraveno 27. 10. 2026.**

**Kdy to divák viděl:** před startem, tedy když se u tabule stojí nejvíc.

Teaser krátil seznam na `NEJVIC_V_TRIDE = 12` lodí a zbytek přiznal řádkem
*„a další N"*. To číslo ale nic nevědělo o tom, kolik místa na obrazovce
je — sloupec s dvanácti loděmi se nevešel a **přetekl pod běžící pásy
tříd**. Řádek „a další" se nevypsal, protože z pohledu kódu se vešly
všechny.

*Změřeno před opravou (okno 1280 × 720, pruh ukázkových dat nahoře):*
- `NAD7M`, 12 lodí: poslední řádek `THEA` končil na **606 px**, pásy tříd
  začínají na **587 px** → dvě lodě pod pásy, `a další` hlásilo nulu;
- s delší vývěskou (pět zpráv místo tří) se seznam posunul níž a zmizely
  **dvě z dvanácti** úplně.

*Oprava:* místo čísla rozhoduje **místo**. `Obrazovka` měří, kde začínají
pásy tříd (ty jsou přišpendlené k oknu, takže jejich poloha neplyne
z toho, co je nad nimi), a posílá tu mez teaseru; ten si změří **výšku
jednoho řádku** a spočítá, kolik se jich mezi seznam a pásy vejde.
Nevejde-li se pole celé, ubere se jedno místo na řádek „a další N" —
jinak by ho vytlačil ven právě ten výpis, který má o přetečení říct.
`NEJVIC_V_TRIDE` zůstává jen jako hodnota pro první vykreslení, než se
změří doopravdy.

*Ověřeno po opravě, čtyřikrát:*

| Stav | Co se ukáže |
|---|---|
| 1280 × 720, tři zprávy na vývěsce | `NAD7M` 10 řádků, poslední „a další 3" |
| táž tabule, vývěska naroste za běhu | přepočítá se na 7 lodí a „a další 5" |
| 1280 × 560 | 6 lodí a „a další 6" |
| 1600 × 900 | 7 lodí a „a další 5" |

Ve všech čtyřech **nic nekončí pod pásy** a „a další N" sedí s tím, co se
neukázalo. Na pravidlo nejsou jednotkové testy schválně: celé stojí na
změřeném rozvržení, takže důkaz je měření v prohlížeči, ne přepočet
v Node.

**Jedna lež mocku u toho:** vydané zprávy dostávaly číslo
`int(čas * 1000) % 1000000`, takže dvě zprávy vydané v téže milisekundě
měly totéž — React pak hlásil dva potomky se stejným klíčem a vývěska
o jednu zprávu přijít mohla. V API je to identita z databáze. Mock má
teď počítadlo.

### 7. ~~Časomíra k nejbližšímu startu se nikdy neukáže~~
**Padlo 28. 10. 2026** — plánovaný start jde zapsat a odpočet ožil. Co se
změnilo a čím se to měřilo, je u nálezu **K6** v
`docs/OPONENTURA-ROZHODCI.md` (fáze 1.1 jeho plánu); sem patří jen to, co
z toho vidí divák:

> *Změřeno na mocku:* `POST …/rozjizdky/1/start` s časem o 4,5 minuty
> v budoucnu → rozjížďka zůstane **`Planovana` se `startV`** a tytéž
> rozjížďky protažené `rozjizdky-tabule.ts` daly **„startovní procedura
> 2:04"**; u vzdálenějšího startu **„procedura ve 00:58"**. Tedy obě fáze,
> které sem dole byly popsané jako mrtvé. Běžící rozjížďka má dál panýlek
> *„jede se 0:10"*.

**Co zbývá:** Filipův návrh na vlajku a odpočty na mapě je dál jen
zapsaný, bez rozhodnutí — i s těmi třemi výhradami na konci nálezu. A to
podstatné z nich platí dál: mapa se rozsvítí jen u **běžící** rozjížďky,
takže prvek *na mapě* před startem pořád nemá kam sednout.

**Původní znění nálezu** (text zůstává, jak byl zapsán):

`rozjizdky-tabule.ts` umí dvě fáze — *„procedura ve 10:25"* a odpočet
*„startovní procedura 4:30"* — a obě chtějí rozjížďku ve stavu `Planovana`
s vyplněným `startV`.

**Takový stav nejde vyrobit.** `StartV` zapisuje v API jediné místo
(`ZapisSprava.StartAsync`, řádek 474) a to ve stejném kroku přepne
rozjížďku na `Probiha`; mimo něj ho plní už jen import ročníku. Plánovaný
čas startu se tedy nikam zadat nedá a obě věty jsou mrtvé.

*Změřeno:* `POST …/rozjizdky/1/start` s časem o 4,5 minuty v budoucnu →
rozjížďka je okamžitě `Probiha`, na tabuli panýlek *„jede se"*, žádný
odpočet. Komentář v `rozjizdky-tabule.ts` to ostatně sám říká: *„v mocku se
to nedá zahlédnout, protože tam žádná rozjížďka nečeká na start"* — není to
vlastnost mocku, je to vlastnost modelu.

Divákova nejčastější otázka („kdy se zase pojede?") tím zůstává bez
odpovědi. Chybí buď pole *plánovaný start* u rozjížďky, nebo to, aby
`start` s budoucím časem nechal rozjížďku plánovanou až do něj.

**Potvrzeno z druhé strany (27. 10. 2026).** Z diskuse s rozhodčím vyšlo
totéž trojím nezávislým způsobem — tenhle nález, `K6`
v `docs/OPONENTURA-ROZHODCI.md`, a dva střípky od Miloše a Filipa. Miloš
popisuje, že *„v rozpravě na konci setneme, kdy asi bude startovní procedura"*,
a Filip k tomu: *„měl by běžet veliký odpočet do termínu dohodnutém na
rozpravě"*. Plánovaný čas startu je tedy **vstup, který na rozpravě vzniká
tak jako tak** — jen ho dnes není kam zapsat.

**Co by se tím odemklo naráz:** odpočet na tabuli (tenhle nález), odpočet
v ruce startéra, přepnutí tabule z listiny na mapu 15 minut před startem,
i panýlek *„procedura v 10:25"*, který je dnes mrtvý. Všechno ostatní kolem
startovní procedury je nad tím postavené
(`docs/OPONENTURA-ROZHODCI.md`, R12).

**Filipův návrh na rozvržení (27. 10. 2026), zapsaný bez rozhodnutí:**

> *„Vlajku (vlající 3d) můžeme ukázat třeba na telce vlevo na mapě dole nad
> běžícími pořadími spolu s odpočty a informacemi startovní procedury."*

Tři věci k tomu, než se o tom rozhodne:

- **Rozvržení tabule je zafixované** stavem z 25. 10. (`9c816ba`, PR #487)
  a drží ho pravidlo, že sloupec zůstává na jednom místě a nic se nehýbe.
  Nový prvek *nad běžícími pořadími* ten pruh posouvá — je potřeba ověřit,
  co to udělá s výškovým rozpočtem, na který už jednou narazil nález 5
  (*Tabule nepočítala s tím, co leží nad ní*) a nález 6 u startovní listiny.
- **Vlajka na tabuli není znamení pro pole** — tabule je na břehu, lodě na
  vodě. Pro diváka je to naopak cenné: právě on neví, co se na vodě děje.
  Rozbor je v `docs/OPONENTURA-ROZHODCI.md`, R16.
- **Mapa se rozsvítí, jen když sedí všechno čtvero** (trať, povolený přenos,
  běžící den, běžící rozjížďka). Prvek *na mapě* by tedy před startem neměl
  kam sednout — a startovní procedura je přesně doba, kdy se ještě nejede.
  To je nejspíš podstatnější překážka než samotné rozvržení.

### 8. ~~V cíli se za celý závod neobjeví nic, a při publikaci všechno naráz~~
**Opraveno 27. 10. 2026 — zčásti. Druhá půlka je rozhodnutí pořadatele,
ne kód**, viz konec nálezu.

Veřejný výdej pouští čísla jen z **publikovaných** rozjížděk, nebo ze všech
u regaty s *procesním dějem* (`ZavodEndpoints.PohledAsync`: `v.Rozjizdka
.Publikovano || (zavod.ProcesniDej && …)`; mock stejně, `venku()`).
Karta „V cíli" se přitom vázala na **řádek, který v minulém snímku
nebyl** — a to je v datech totéž, ať loď právě projela cílem, nebo se
jen objevila celá hotová sada.

*Změřeno před opravou:* zápis dvanácti dojezdů do nepublikované rozjížďky →
snímek nese `vysledky: []`, žádná karta. Po `publikace: true` odečet DOM
zachytil `V CÍLI 1. MAMBA` → … → `10. MICINY` v pravidelném rytmu, salva
běžela **přes padesát vteřin** — a opakovala se při každém dalším
publikování, tedy i po stažení čísel na opravu.

**Rozhodnutí: karta je o tom, co se právě stalo, ne o tom, že se objevil
řádek.** Dojezd a publikace jsou dvě různé zprávy a tabule je od sebe
odděluje:

| Co se stalo | Co divák uvidí |
|---|---|
| loď projela cílem a zápis ji poslal ven | karta `V cíli · 3. SOCKA` |
| hotová rozjížďka šla ven (dvě lodě a víc najednou) | **jedna** karta `Výsledky · 1. rozjížďka je venku · 12 lodí v cíli` |
| jedna loď dopsaná dodatečně | nic — je to oprava zápisu, ne zpráva do hospody |
| táž sada znovu (opakovaná publikace, obnovení stránky) | nic |

Čerstvost se počítá z **času dojezdu**, ne z toho, kdy řádek dorazil:
`startV + casSekundy` proti času snímku, okno **90 vteřin**
(`CERSTVY_DOJEZD_S` v `lib/tabule-udalosti.ts`). Zápis se ukládá po každém
klepnutí a tabule se ptá po pěti vteřinách, takže devadesát je rezerva
s velkým náskokem. Loď **bez zapsaného času** (dopsaná z papíru, kód místo
pořadí) se bere jako stará — pravděpodobná hodnota se nedosazuje.

Kvůli tomu nese snímek u každého řádku pořadí i `cas` (`lib/tabule.ts`);
API ho vydávalo odjakživa (`VysledekDto.casSekundy`), jen se zahazoval.

*Ověřeno po opravě, obě cesty:*
- rozjížďka odjetá před dvaceti minutami, publikace při otevřené tabuli →
  **jedna karta** `VÝSLEDKY | 1. rozjížďka je venku | 12 lodí v cíli`;
- regata se zapnutým procesním dějem, tři dojezdy zapsané po osmi
  vteřinách → `V CÍLI | 1. LUNA`, `2. SOCKA`, `3. JOY`, každá do dvou
  vteřin od zápisu.

Na pravidlo jsou testy (`web/testy/udalosti.test.ts`, osm případů) —
rozdíl mezi čerstvým dojezdem a sadou se v prohlížeči hledá špatně.

**Druhá půlka: kdy se dojezdy objeví živě.** Rozhoduje o tom přepínač
*procesní děj* u regaty — ve správě *„Ukazovat průběžné výsledky"*
v úpravě regaty v kalendáři ročníku. Bez něj jdou čísla ven až publikací,
takže se v cíli celý den nestane nic a přijde jen ta jedna karta na konci.
**Tabule ten přepínač neobchází a obcházet nemá:** neplatí jen pro tabuli,
ale i pro veřejnou stránku regaty, a to, že nepodepsané pořadí nejde ven
samo, je rozhodnutí z 9. 10. 2026.

**Rozhodnuto 27. 10. 2026 (Filip): nová regata se zakládá se zapnutým.**
Formulář má u nové regaty předvolené *„Ano, i nepodepsané"*; existující
regata si drží, co má — přepsat pořadateli nastavení při úpravě termínu by
bylo horší než konzervativní výchozí hodnota. Je to **předvolba ve
formuláři, ne skrytá vlastnost**: pořadatel ji vidí a může ji přepnout
dřív, než regatu založí.

*Ověřeno:* v kalendáři ročníku má formulář nové regaty `ano`, Izolepa
(zapnuto) `ano` a zbylých sedm regat ročníku `ne`.

**A ještě jedna lež mocku, nalezená u toho:** `zastavka_radek`
`procesniDej` vůbec nevydával, ačkoliv `ZastavkaRadek` v API ho nese
(`KalendarEndpoints.Radek`, `z.ProcesniDej`). Lokálně tím formulář úpravy
regaty ukazoval vždycky *„Ne"* — a uložení termínu by přepínač potichu
vyplo. Proti API se to nestane (`ZastavkaVstup.ProcesniDej` je `bool?`
a `KalendarSprava` dělá `vstup.ProcesniDej ?? zastavka.ProcesniDej`),
takže je to vada mocku, ne aplikace. Opraveno.

### 9. Skrytý ročník: odjetá regata vypadá jako regata před rozpravou
Když ročník nevydává výsledky (`VysledkyZavoduVerejne = false`), API vrací
detail **bez rozjížděk** (`ZavodEndpoints`, zkratka hned za načtením
závodu — schválně, aby se čísla ani nenačetla). Tabule z toho spočítá, že
žádná rozjížďka není dokončená, a spadne do startovní listiny.

*Změřeno:* regata s dojetou, potvrzenou a publikovanou rozjížďkou po
skrytí ročníku ukazuje `22 přihlášených lodí`, stav **„Čeká se na
rozpravu"**, žádné panýlky rozjížděk — plus proužek *„Ročník má výsledky
zatím skryté…"*. Dvě sdělení na jedné obrazovce si odporují.

Vedlejší důsledek: obě věty, které `Vysledky` pro skrytý ročník má
(*„pořadí se počítá, rozhodčí ho zatím nezveřejnil"* a *„Až to rozhodčí
pustí ven, objeví se to tady."*), jsou **nedosažitelné** — do té podoby se
tabule při skrytém ročníku nikdy nedostane.

Je to tatáž otázka jako scénář A5 v `SCENARE-OVLADANI.md` („pozná, že se
jelo, od toho, že se nejelo?"), jen na tabuli — a odpověď je zatím ne.

### 10. Trať zrušené rozjížďky jde ven jako „trať na řadě"
`NaRadeAsync` (`Features/Boje/TratSprava.cs`) hledá trať rozjížďky, která
je na řadě, a když žádnou nenajde, vezme **poslední přijatou trať vůbec** —
a ta poslední větev se zrušených rozjížděk neptá, ačkoliv o pár řádků níž
je `VerejneRozjizdkyAsync`, která je vyřazuje. Mock je opsaný stejně.

*Změřeno:* po eliminaci 2. rozjížďky a přestavbě trati vyjela karta
`TRAŤ · Trať schválena · 2. rozjížďka` — o rozjížďce, která se nejede.

### 11. Publikovaná a potom eliminovaná rozjížďka drží čísla venku
Filtr je `Publikovano || (ProcesniDej && StavVysledku != Eliminovano)` —
komentář nad ním tvrdí *„Eliminovaná ven nejde ani tak"*, ale to platí jen
pro druhou větev. Jednou publikovaná a potom eliminovaná rozjížďka své
řádky ve veřejném výdeji **podrží**.

*Změřeno:* `(2, 'Zrusena', 'Eliminovano', 4 výsledky)` ve veřejném detailu.
Na tabuli se to neprojeví (pořadí ji nepočítá a panýlek říká *zrušena*),
na veřejné stránce regaty ano. **Je to mimo zadání tohohle auditu**, patří
k veřejné stránce — zapsané, ať se na to nepřijde potřetí.

### 12. Mrtvý kód v tabuli
Tři soubory v `tabule/` neimportuje nikdo: **`semafor.tsx` (298 řádků)**,
**`atributy.tsx` (62)** a **`vlajka.tsx` (92)**, kterou drží při životě jen
semafor. V `obrazovka.tsx` zůstaly nepoužité `STAVY_ROZJIZDEK`, `ZAPIS`,
`NA_STRANKU` a `stranky()`.

Navíc: mapa dostává `onUdalost`, hlídá si ho (`if (!onUdalost) return`),
ale od 25. 10. ho **nikdy nezavolá** — dojezd i prohození si řeší sama
(`setLepik`). Druh karty `souboj` a jeho nadpisek *„Na vodě"* jsou tím
nedosažitelné.

Je to Filipovo rozhodnutí: vlajky stavu rozjížďky se do návrhu vrátit mohou,
a pak je lepší mít je po ruce než je psát znovu. Ale dokud leží bez cesty,
čte je každý, kdo tabuli otevře, jako živý kód — tenhle audit je taky nejdřív přečetl celé.

### 13. Nález mimo tabuli: náhled fotky prvku přes celou obrazovku
V `globals.css` je **slepená kopie** komentáře o výšce tabule i s jejím
`height: calc(100dvh - var(--paticka))`, a to uvnitř pravidla
`.seznam-prvku .ikona-detailu.foto img`. Náhled fotky u prvku trati je tím
vysoký přes celou obrazovku (`object-fit: cover` to jen ořízne).
Neopraveno schválně: je to obrazovka pořadatele, ne tabule, a může na ní
pracovat jiná session.

---

## Pozorování, ze kterých návrh nevznikl

Zapsaná zvlášť schválně: rozhodnout o nich patří k návrhu, ne k měření.

- **Fronta karet je sériová a „Dojeto" čeká na konci.** Po dojetí regaty
  přijde `Regata · Dojeto` až za všemi dojezdy, které se do fronty dostaly
  dřív — u dvanácti lodí skoro minutu po tom, co se stalo.
- **Pořadí při zrychleném review píše u všech lodí „před 0 s".** Je to
  záznam, ne živá data; stáří polohy tam nic neznamená.
- **Stažení čísel z veřejnosti je tiché.** Publikace zpátky na `false`
  nevyvolá nic, řádky prostě zmizí. Opačný směr vyjede salvu (nález 8).
- **Zpráva na vývěsku vyjede jako karta a zapadne do panelu** — tohle
  funguje přesně tak, jak bylo zadáno, včetně toho, že se stará zpráva
  neopakuje.
- **Zrychlené review naskočí 75 vteřin po načtení** a běží 30, přesně podle
  `SEZNAM_MS`/`PREHRAVKA_MS`. Ověřeno odečtem: `......PPPPPPPPPPPPPP`.
- **Pás partnerů a pásy tříd se nepřetahují.** Poslední pás tříd končí 2 px
  nad logy, i při třech třídách.
- **Karta alertu se prolíná**, takže na snímku obrazovky ji jde minout —
  kdo bude tabuli zkoušet po mně, ať čte DOM, ne screenshot. Tenhle audit
  na to zprvu naletěl a málem zapsal „alerty nejezdí".

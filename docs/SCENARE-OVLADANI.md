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

Mock **nic neukládá na disk.** Data načte při startu do konstanty `D`
(`json.load` v `tools/fake-api.py`) a nikdy je nezapisuje zpátky; stav žije
v běžícím procesu. Celou sestavu s databází na tomhle stroji rozjet nejde
(není tu kontejnerový běh a Docker Hub je odtud nedostupný — `README.md`,
oddíl *Rychlý start*). **Hranice závěru je tedy tahle:**

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

### Co mock vymáhá a co ne

**Skupina B, posádka v A3 a F1 už jdou** (6. 10. 2026): mock umí `/ja/lode`,
`/ja/lode/{id}/kod`, `/ja/lode/{id}/pripojeni`, `/ja/pripojeni` a nároky,
včetně **platnosti kódu, přechodů rolí a odmítnutí**. Projeto scénáři B1–B5.
Účty pro ně: **`jana`** (majitelka lodi JOY, žádná role ve správě) a
**`petr`** (posádka lodi SENDY, která **nemá kapitána** — na tom stojí B5).
Jeden kód je nasazený **už prošlý** (`PROSLY`), aby se u B2 nečekalo
patnáct minut.

**Od 8. 10. 2026 mock role vymáhá.** Brána stojí na jednom místě, hned za
kontrolou tokenu, hlídá `/sprava/**` a pravidla má opsaná z `Prava.Smi`:
rozhodčí není stupeň, pověření k jedné zastávce platí jen na ni, právo na
celý web všude. Kde role závisí na tom, *co* se posílá, hlídají si to
handlery samy — stupeň workflow podle `Workflow.KdoSmi`, zařazení do poháru
podle `KdoSmiDoSerie`, vyloučení přihlášky podle `Prihlasky.cs`.

**Obrazovka nabízí jen to, co projde:** `smiZapisovat`, `smiPublikovat`,
`smiZalozit`, `smiPridatRozjizdku` i nabídka stupňů se počítají z práv toho,
kdo se ptá. Projito: rozhodčí na potvrzené rozjížďce vidí jen *Vrátit do
poháru* a *Vrátit k revizi*, správce celou sadu, a pořadatel cizí regaty
dostane „K výsledkům téhle regaty nemáš přístup".

Dvě věci z toho stojí za zapamatování, protože mění, co scénáře měří:

- **Potvrzení a publikace nejsou práce rozhodčího.** `Workflow.KdoSmi` dává
  rozhodčímu *Ověřeno*, *Schváleno* a *K revizi*; *Potvrzeno*, *Eliminováno*
  i puštění ven patří **správci**. D2 tedy rozhodčí dotáhne po *Schváleno*
  a dál to předává — zadání „pusť je ven" se bez správce nedokončí.
- **C2 není odmítnuté právo, ale chybějící funkce** — zapsat posádku ve
  správě nejde nikomu, ani v mocku, ani ve webu.

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
| ~~Nabídka účtu se počítá **jen z rolí na ročník**. Kdo má roli na celý web a žádnou v ročníku, nevidí v nabídce ročníkové položky — ačkoliv na ty obrazovky smí a po zadání adresy ho pustí~~ | **hotovo 6. 10. 2026** — nabídka i rozcestník počítají z jedněch pravidel, která ročníková práva míchají s rolí na celý web: funkce `prava` ve `web/lib/co-smim.ts`, kterou volá `web/app/profil.tsx`. Kdo má roli jen na web, jde přes položku Správa (`maSpravu` ve `web/app/profil.tsx`); zkratky „Ročník {slug}" zůstávají schválně jen pro vlastní ročníky |
| ~~**Přihlášky nemají v nabídce položku.** Jde se na ně oklikou z kalendáře („přihlášky →") nebo z výsledků regaty („přihlášené lodě →")~~ | **hotovo 6. 10. 2026** — rozcestník ročníku vypisuje u každé regaty Výsledky · Přihlášky · Plachetní směrnice (`polozkyZastavky` ve `web/lib/co-smim.ts`, vykresluje je `web/app/sprava/[serie]/page.tsx`). V rozbalovací nabídce pod ikonkou účtu položka není a nemá být — ta vede jen na rozcestník |
| ~~**Správa nemá rozcestník.** Neexistuje `/sprava` ani `/sprava/{ročník}`; jediná navigace je rozbalovací nabídka pod ikonkou účtu~~ | **hotovo 6. 10. 2026** (70cb074) — `web/app/sprava/page.tsx`, `web/app/sprava/[serie]/page.tsx`; nabídka na rozcestník vede, `maSpravu` ve `web/app/profil.tsx` |
| **Posádku nejde zadat ve správě.** Pořadatel ji jen vidí; zapsat ji umí kapitán ve veřejné přihlášce nebo import. Kormidelník totéž | `Podrobnosti` v `prihlasky/[zavod]/page.tsx` |
| ~~**Koncept z telefonu se vydává za ztracenou práci, i když je to vlastní přepsaný zápis.** `rozdily` hází do jedné hromady řádek, který v uloženém zápisu vůbec není, a řádek, kde uložené má jiné. Obojí se vypíše pod „Proti uloženému zápisu má navíc tohle" a „počítej i s nimi", ve formuláři dokonce jako zápis, „který uložená čísla nemají" — a *Doplnit do formuláře* jedním klepnutím vrátí cizí opravu zpátky~~ | **nalezeno reprodukcí C12 a opraveno 8. 10. 2026** — `podleRizika` (`koncept.ts`) rozdíly rozděluje a obě obrazovky mají **dva seznamy**: „tohle uložený zápis vůbec nemá, bez doplnění se to ztratí" a „tady má uložený zápis něco jiného… mohl to být druhý zapisovatel, který tvůj zápis opravil". Ve formuláři jsou místo jednoho tlačítka dvě — *Doplnit chybějící* a *Přepsat rozdílná čísly z telefonu* |
| ~~**Předání opraveného zápisu zpátky rozhodčímu je tiché.** Úkol „Ověřit a pustit ven" se počítal jen pro zastávky, kde není venku všechno, takže rozjížďka, která už venku je a jen prošla revizí, rozhodčímu nenaskočila — a přitom čekala na jeho podpis~~ | **hotovo 8. 10. 2026** — přehled zastávek vydává `kPodpisu` (zapsané, ještě ne potvrzené) a `kPublikaci` (potvrzené a přesto ne venku), a „Co teď" z nich dělá **dva různé úkoly**: *Ověřit výsledky* rozhodčímu podle **stavu zápisu**, *Pustit ven* správci podle publikace. Publikace není podpis — „čísla platí" říká rozhodčí, „ať to vidí veřejnost" správce |
| ~~**Rozhodčí se k výsledkům dostane jen přes „Co teď".** V „Celém ročníku" má Kalendář a Oprávnění, ne Výsledky, a odkazy u jednotlivých regat chtějí organizátora všechny tři. Zbývá úkol „Ověřit a pustit ven", a ten se počítá jen pro rozjížďky, které nejsou k revizi — dokud je něco k revizi, rozhodčí na tu regatu odkaz nemá~~ | **hotovo 8. 10. 2026** — položka smí mít víc podob a vybere se ta, na kterou člověk má (`prvniPlatna` v `web/lib/co-smim.ts`). Rozhodčí teď vidí Výsledky v celém ročníku i všechny tři odkazy u každé regaty, se svými popisy („Ověřit rozjížďky, vrátit k revizi a pustit ven", „Kdo přijel a koho vyloučit ze závodu"). Opsané ze serveru, který ho u všech tří pouští (`VysledkyEndpoints.PohledAsync`, `PrihlaskyEndpoints.PrehledAsync`, `SmerniceEndpoints.SmiAsync`). **„Co teď" se nechalo být**: regata vrácená k revizi čeká na pořadatele, ne na rozhodčího — ten na ni teď má odkaz, i když ho to nenutí |
| **Medailonek pořadatele je jen z kalendáře.** ~~Směrnice taky~~ — ty jsou od 6. 10. 2026 na rozcestníku ročníku | `Zastavka` v `kalendar/page.tsx`, odkaz pod `smiMedailonek`; směrnice jsou položka *Plachetní směrnice* v `polozkyZastavky` (`web/lib/co-smim.ts`) |

Prokázaná chyba z auditu je podklad pro opravu **i když ji zkouška mine.** Malá
zkouška není důkaz, že nevadí — jen ji nepotkala.

## Co našlo první sezení (9. 10. 2026)

První nález je od Filipa při vlastním průchodu, ne z auditu — a je to
blokátor podle pravidla *Kdy je toho dost*, takže šel do oprav hned.

| Zjištění | Oprava |
|---|---|
| ~~**Do editace bójí nejde vlézt z kalendáře ani z detailu zastávky.** Odkaz na bóje byl jen na rozcestníku ročníku; kalendář si svůj výpis odkazů u regaty skládal ručně (přihlášky, výsledky, směrnice) a o bójích nevěděl~~ | **hotovo 9. 10. 2026** — kalendář bere výpis z `polozkyZastavky` (`web/lib/co-smim.ts`), tedy z téhož zdroje jako rozcestník. Přibyly bóje a zmizely odkazy na regaty, ke kterým ten člověk práva nemá |
| ~~**Cesta nahoře neodpovídá tomu, jak se chodí.** U ročníku *Domů » Ročník » Správa*, kde „Ročník" mířil na **veřejnou** stránku, takže krok nahoru vedl ze správy ven; u bójí a směrnic *Domů » Kalendář » Bóje*, ačkoliv se na ně chodí z rozcestníku ročníku~~ | **hotovo 9. 10. 2026** — jeden tvar *Domů » Správa » Ročník » {regata} » {obrazovka}*, skládá ho `drobeckySpravy` (`web/app/drobecky.tsx`). Pravidlo i tabulka cest jsou v `docs/PLAN.md`, *Jak se chodí po správě* |
| ~~**Z veřejné stránky regaty nevedlo do správy nic.** Pořadatel na ní stojí (dívá se na výsledky jako divák) a do své práce se musel vracet přes nabídku účtu a rozcestník~~ | **hotovo 9. 10. 2026** — rámeček s odkazy na tu regatu pro toho, kdo na ni má práva, a na stránce ročníku odkaz na rozcestník. Mikrocache požadavek s cookie sezení nekešuje, takže se rámeček nemůže dostat k někomu jinému |
| ~~**Obrazovka bójí neřekla, čí trať se staví.** Nadpis „Bóje na trati" a nic víc — API o bójích název regaty nevydává~~ | **hotovo 9. 10. 2026** — název se bere z kalendáře (`nazevZastavky`), který smí číst každý, kdo se na bóje dostane; totéž u směrnic. Výpadek toho čtení obrazovku neshodí, jen zůstane bez názvu |

**Dvě nepravdy v mocku**, které by tohle sezení měřilo místo aplikace
(nalezeno při ověřování téhle opravy, opraveno 9. 10. 2026):

- **Kalendář mock nepouštěl pořadateli vůbec** (chtěl rozhodčího na celý
  ročník), kdežto `KalendarEndpoints.PohledAsync` pouští i pořadatele
  jediné zastávky a jen schová tlačítka. Pořadatel by v C* kalendář
  neotevřel a vypadalo by to jako chybějící právo.
- **Řádek kalendáře nabízel tlačítka a medailonek bez ohledu na roli.**
  Server je filtruje (`Kalendar.KdoSmi`, `SmiKalendar || organizator`),
  takže mock ukazoval pořadateli cizí regaty jako jeho vlastní. Teď se
  u každého řádku ptá na *tu* zastávku.

## Co odjela skupina E (9. 10. 2026)

**Odjeto reprodukcí, ne účastníkem.** E1–E5 projetá proti mocku za `filip`
a `dana`. Měří to jen to, co se bez cizího člověka změřit dá: **jestli cesta
existuje, jestli role projde a jestli data sednou.** První orientaci, čas ani
špatné odbočky to neměří — kdo aplikaci zná, nehledá. Sezení s pořadatelem
to nenahrazuje.

| Scénář | Cesta, kterou to šlo | Výsledek |
|---|---|---|
| E1 — určit kapitána | nabídka → Správa → *Lodě a kapitáni* → SENDY → *Určit kapitánem* | samostatně, data sedí (`rucne: true`, `urcil: Filip Burda`) |
| E2 — kapitán od kódu | tamtéž → LUNA → *Potvrdit kapitána* | samostatně, data sedí; **ke kontrole se ale hledá očima** (viz pozorování) |
| E3 — nahradit kapitána | tamtéž → LUNA → *Určit kapitána* z účtu, který k lodi nepatří | samostatně; Miloš kapitánem, Filip spadl na posádku, historie zapsala obojí |
| E4 — udělit roli | Správa → *Oprávnění* → Jana, organizátor, Pohár Slunce | samostatně, data sedí. **Pokračování projito:** Jana po přihlášení dostane rozcestník „pořadatel — Pohár Slunce" s oddílem *Moje regaty*; na přihlášky cizí regaty ji server odmítne a odkáže na rozcestník |
| E5 — správce celého webu | Správa → *Orlický pohár 2027* → *Kalendář ročníku* → *Upravit termín a údaje* | samostatně, data sedí (termín 15. 5. → 22. 5. 2027) |

**E5 potřebuje ročník 2027.** Ročník 2026 má všechny termíny za sebou, takže
„budoucí regatu" v něm není co přesunout; mock se pouští
s `data/2027-kalendar.json`.

### Opraveno hned

| Nález | Oprava |
|---|---|
| ~~**Mock nešel pustit na ročníku bez lodí.** `data/2027-kalendar.json` je jediný ročník s budoucími termíny, tedy jediný, na kterém jde E5 odjet — a mock na něm padal (`_nasad_kody`, `StopIteration` nad prázdnými přihláškami). Přišlo to 6. 10. 2026 s prošlým kódem pro B2 (7b277dc) a do teď to nikdo nepotkal, protože se mock pouštěl jen na 2026~~ | **hotovo 9. 10. 2026** — bez přihlášek se prošlý kód nenasazuje a ten soubor jde servírovat |
| ~~**„Potvrdit kapitán".** Tlačítko u kapitána od kódu skládalo jméno role v prvním pádě (`NAZEV_ROLE`), takže říkalo „Potvrdit kapitán", u majitele „Potvrdit majitel"~~ | **hotovo 9. 10. 2026** — `NAZEV_ROLE_KOHO` (čtvrtý pád) v `web/lib/pripojeni.ts` |
| ~~**„Jarní vítr" uložena.** Věty po zápisu do kalendáře jsou v ženském rodě podle „regaty", ale vkládá se do nich jméno regaty, které má rod svůj~~ | **hotovo 9. 10. 2026** — jméno nese i podstatné jméno: „Regata „Jarní vítr" uložena." (`kalendar/page.tsx`, funkce `hotovo`) |

### Pozorování, ze kterých návrh nevznikl

Zapsané zvlášť schválně: rozhodnout o nich patří k návrhu, ne k měření.

- **Loď ke kontrole stojí pod všemi loděmi bez kapitána.** Řadí se
  `MaKapitana`, pak `KeKontrole`, pak abecedně
  (`SeznamAsync` v `Features/Lode/Kapitanstvi.cs`; mock stejně), takže
  v ročníku, kde kapitána nemá skoro nikdo, je jediný řádek, který čeká
  na rozhodnutí, 37. z 38. Obrazovka přitom o lodích bez kapitána říká
  „normální stav — čeká na určení". Filtr, počet ani oddíl pro ke kontrole
  není a podtitulek počítá lodě bez kapitána („Čeká 36 lodí").
- **„Co teď" o kapitánství neví.** Počítá se jen ze zastávek
  (`coTeď(udelena, serie, mojeZastavky)`), takže s LUNOU ke kontrole hlásí
  „Nic nečeká."
- **Loď s posádkou a bez kapitána je k nerozeznání od lodi, ke které nepatří
  nikdo** — řádek říká jen „bez kapitána", ačkoliv `LodSpravaDto.Vazby`
  posádku nese. Loď ze zadání E1 se najde jen podle jména.
- **Panel lodi není po příchodu vidět.** Odkaz *posádka a kapitán →* vede
  na `?lod=N` na tutéž stránku; panel začíná 1705 px pod okrajem při okně
  768 px a stránka se na něj neposune (žádný fragment ani `id`). Po akci se
  poloha drží (`scrollY` 1427), takže vadí jen první příchod.
- **Hláška o udělení role v ročníku není `role="status"`** — chybová na téže
  stránce `role="alert"` má a na oprávněních celého webu mají obojí.
- **Drobečky na odmítnuté obrazovce říkají „Regata"** místo jména regaty.
  U publikované regaty je přitom jméno veřejné.

**Měřicí past, ne nález:** veřejné čtení má `revalidate: 60`
(`nacti` ve `web/lib/api.ts`), takže po přehození mocku na jiný ročník ukazuje
rozcestník ještě minutu ročníky z toho předchozího. Vypadá to jako chyba
v rozcestníku a není.

## Co odjela skupina F (9. 10. 2026)

Zase **reprodukcí, ne účastníkem** (viz skupinu E). F1 se u čerstvého člověka
měří na odbočkách, a to tahle zkouška neumí. Co změřit šlo: že cesta existuje,
že role projde a že data sednou — u F2 a F3 navíc, že **nejde uložit starší
stav** a že **neodeslaná klepnutí dojdou sama**.

| Scénář | Co se měřilo | Výsledek |
|---|---|---|
| F1 — od začátku do konce | přihlášení → připojení k lodi kódem od pořadatele → směrnice na veřejné stránce regaty → výsledek téže regaty | **řetěz projde celý**, tři zádrhely na cestě (níž) |
| F2 — Zpět | po uložení zápisu přidala cizí ruka dojezd; pak Zpět na cílovou obrazovku a klepnutí | **starší stav neprojde**: po návratu je na obrazovce čerstvý zápis (`router.refresh()` při připojení), klepnutí staví na něm a cizí dojezd zůstal — revize 3, čtyři dojezdy |
| F2 — stará adresa směrnice | stažení verze 2 z vývěsky, pak nové načtení původní adresy | **404**; nestažená verze 1 dál 200 a záznam drží kdo, kdy a proč |
| F3 — bez signálu, obrazovka zavřená | tři klepnutí s vypnutým API, pak znovu otevřená cílová obrazovka | odešla **sama, bez jediného kliknutí**; koncept z telefonu se po uložení zahodil |
| F3 — bez signálu, obrazovka otevřená | dvě klepnutí s vypnutým API, pak se API vrátilo a obrazovky se nikdo nedotkl | „neuloženo" 13:47:42 → „uloženo" do 13:48:39, tedy **v dokumentovaném půlminutovém okně** |

Všechny čtyři případy potvrdilo **nezávislé čtení zápisu z API**, ne zelená
hláška na obrazovce.

**Výpadek vyráběl vypnutý server, ne zařízení.** Pro obrazovku je to totéž
(odpověď nedojde), ale událost `online` tím nenastane — měřil se tedy
třicetisekundový časovač, ne doručení hned po chycení sítě. Na to je potřeba
telefon v letovém režimu.

### Opraveno hned

| Nález | Oprava |
|---|---|
| ~~**Pořadatel nemohl vystavit připojovací kód.** `LodNaZastavceDto` nese `LodId` od 4. 10. 2026 právě kvůli tomu, mock ho ale neposílal: skryté pole zůstalo prázdné a každé vystavení skončilo na „Kód se nepovedlo vystavit". **F1 tím začínal slepou uličkou**~~ | **hotovo 9. 10. 2026** — mock vydává `lodId`, totéž číslo jako u přihlášky |
| ~~**Soubor směrnice v mocku vůbec neexistoval.** `adresa` mířila na `/fake-soubor/…`, kde nic neposlouchalo, takže vracela 404 i před stažením — odvolání nešlo poznat od souboru, který nikdy nebyl. **F2 se o to nedalo opřít**~~ | **hotovo 9. 10. 2026** — mock skládá nejmenší platné PDF a servíruje ho, dokud verze není stažená; po stažení 404, jako když soubor zmizí z R2 |

### Pozorování, ze kterých návrh nevznikl

- **Kdo už k nějaké lodi patří, nemá v „Mých lodích" kudy se připojit
  k další.** Odkaz na `/pripojeni` je jen ve větvi „Zatím nepatříš k žádné
  lodi" (`lode.length === 0` ve `web/app/moje-lode/page.tsx`) — a právě ta
  věta vysvětluje
  všechny tři cesty. Kdo dostane kód na druhou loď, musí adresu znát.
- **Panel lodi v „Mých lodích" se neptá na roli.** Po připojení kódem se
  otevře s `?lod=…` a posádka v něm vidí *Vystavit kód* i rozhodování
  o žádostech. Server to odmítne (403) a obrazovka řekne jen „Kód se
  nepovedlo vystavit" — proti pravidlu *obrazovka nabízí jen to, co projde*.
- **Mock nemá účet bez lodi a bez role**, tedy přesně profil čerstvého
  účastníka z F1: `petr` a `jana` mají loď, `dana` a `zdenek` roli. F1 se
  proto jela Petrem, který už loď má — neměřilo se první připojení, ale
  druhé.
- **Odvolaná směrnice visí na veřejné stránce ještě do minuty.** Soubor
  zmizí hned (404), stránku regaty ale drží `revalidate: 60`. Pro F2 je to
  to podstatné: dokument je odvolaný okamžitě, odkaz na něj do minuty.
  Tatáž past při F1 na chvíli vypadala jako chybějící oddíl se směrnicí —
  stránka byla z mezipaměti z doby, kdy mock neběžel.

## Co přineslo ukazování rozhodčímu (27. 10. 2026)

Jiný druh vstupu než skupiny výš: **nikdo neodjížděl scénář.** Filip ukazoval
aplikaci Milošovi (rozhodčí ročníku) a tohle je postřeh, který při tom vznikl
jemu samotnému — tedy pozorování člověka, který aplikaci zná, ne čerstvého
účastníka. Co z téže diskuse vyšlo na pravidla, je
v `docs/OPONENTURA-ROZHODCI.md`; sem patří jen ovládání.

### Pozorování, ze kterých návrh nevznikl

Filip, 27. 10. 2026: *„když jsem Milošovi ukazoval rozdíl mezi správou pod
přihlášeným uživatelem a detailem regaty, kde se zobrazí lišta pro správu, mi
přišlo, že by stačilo jedno místo. Nevím."* Doplněno jako **podnět k rozvaze,
výslovně ne jako pokyn ke změně**, takže návrh tu stát nemá. Co se k tomu dá
doložit:

- **Vstupy do práce na regatě jsou tři, ne dva.** Rozcestník ročníku
  (`web/app/sprava/[serie]/page.tsx:166`), řádek regaty v kalendáři
  (`web/app/sprava/[serie]/kalendar/page.tsx:380`) a lišta `DoSpravy` na
  veřejné stránce regaty (`web/app/serie/[slug]/zavody/[zavod]/hlava.tsx:111`).
- **Všechny tři vypisují tentýž seznam** z `polozkyZastavky`
  (`web/lib/co-smim.ts:267`), takže obsahem se rozejít nemůžou. Komentář
  v kalendáři říká, proč to tak je: *„dvě ruční kopie se rozešly hned při
  prvním přírůstku — bóje se přidaly na rozcestník a v kalendáři na ně odkaz
  nebyl"*.
- **Každý z těch tří vznikl z jiného nálezu**, dva z nich z téhle zkoušky:
  rozcestník 6. 10. 2026 (správa neměla žádnou navigaci), odkazy v kalendáři
  9. 10. 2026 (*„do editace bójí nejde vlézt z kalendáře"*, viz *Co našlo první
  sezení*), lišta 9. 10. 2026 na vlastní žádost — v `hlavicka.tsx` je u ní
  citát *„klidně ať do správy mohu ze zastávky, když na to mám práva"*.
- **Lišta se sama označuje za zkratku, kalendář ne.** `DoSpravy` končí
  odkazem *„vše k regatě →"* na `/sprava/{ročník}#{regata}` a má dvě podoby
  podle toho, jestli člověk má práva na tu regatu, nebo jen roli v ročníku.
  Řádek v kalendáři vypisuje tytéž odkazy bez jakéhokoliv rámce okolo.

**Co se tímhle nezměřilo:** jestli ta tři místa někoho matou. Postřeh je od
člověka, který aplikaci postavil, a vznikl při vysvětlování — tedy ve chvíli,
kdy se rozdíl popisoval nahlas. Jestli si ho všimne někdo, kdo ji vidí poprvé,
a jestli mu vadí, by změřilo teprve sezení s čerstvým člověkem.

### Zadání na ovládání od startéra

Z téže diskuse, a je to **nejtvrdší ergonomické zadání, jaké projekt zatím
dostal** — protože není formulované přáním, ale podmínkami provozu. Miloš
o startovní proceduře:

> *„Hele ale já spustím startovní proceduru. Musí to být jednoduše a jedním
> tlačítkem, mobil mi nesmí usnout a musím na něj dobře vidět. Nemůžu v jedné
> ruce držet megafon, dalekohled a řídit motorák, koukat kdo je přes čáru a do
> toho vyplňovat formulář v appce."*

Filip k tomu: *„To byla samozřejmě nadsázka, ale vcelku trefná."* Co z toho
plyne na ovládání, bez návrhu řešení:

- **Jedna ruka, a ta druhá drží něco jiného.** Nejde o počet klepnutí celkem,
  ale o počet klepnutí **za jedné ruky a v pohybu na vodě**.
- **Obrazovka nesmí zhasnout** po dobu procedury. Dnes to neřeší nic — appka
  je na nahrávání trasy, kde na probuzené obrazovce nezáleží.
- **Čitelnost na přímém slunci** na vodě, ne v klubovně. Zkouška u stolu tohle
  nezměří; měřit se to dá jen venku.
- **Žádné formuláře za jízdy.** Vyplňování patří před proceduru (čas startu
  z rozpravy) nebo za ni (cíl), ne doprostřed.
- **Odpočet musí být čitelný na dálku** — Filip: *„veliký odpočet… něco jako
  count down"*.

Pravidlová část téhož střípku (co se v proceduře děje, jaké jsou lhůty a co
pravidla říkají o trestech) je v `docs/OPONENTURA-ROZHODCI.md`, nálezy R11
a R12. **Pozor při zkoušce:** co tam stojí o deseti minutách a o tlačítkách
s loděmi, se podle pravidel dělí na dvě různé věci s různými lhůtami — scénář
se podle toho návrhu psát nemá, dokud to není rozhodnuté.

**Pro tohle zkouška u stolu nestačí.** Zbylé skupiny se dají odjet reprodukcí
nebo v klubovně; tohle ne — měří se jedna ruka, slunce a houpající se motorák.
Dokud se to nezkusí na vodě, zůstává to zadání, ne ověřená vlastnost.

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
| C | `milos` | organizátor **jen zastávky `izolepa`** | 22 účastí, 3 rozjížďky | plná |
| C7, druhý telefon | `filip` | správce ročníku, píše všude | tamtéž | plná |
| D1–D3 | `zdenek` | **rozhodčí celého ročníku** | výsledky `Potvrzeno`, nic nečeká | plná pro navigaci |
| D4, D5 | `zdenek` | tamtéž | — | **jen hláška** — mock odmítá z pravidel stavu, ne z role |
| E1–E3 | `filip` | správce ročníku (`zavod: null`) | LUNA má kapitána od kódu → *ke kontrole* | plná, výhrada u E2 |
| E4 | `filip` | tamtéž | Jana je v seznamu účtů bez role | plná od 8. 10. 2026 — mock roli vymáhá, včetně pokračování za Janu |
| E5 | `dana` | správkyně **celého webu**, v ročníku nic | **ročník 2027** (`tools/fake-api.py data/2027-kalendar.json`) — 2026 má všechny termíny za sebou | plná |

Dvě věci z toho, které měří něco jiného, než co je v názvu skupiny:

- **Skupina se jmenuje „kapitán", účet je majitelka.** `jana` je *majitel*,
  ne *kapitán*. Práva jsou tatáž — odpovědný za loď je majitel i kapitán
  (`Features/Lode/Kapitanstvi.cs`, `Odpovedny`) — ale **kapitána bez
  majitelství mock nemá**, takže se nezkouší, jestli se obě role na
  obrazovce chovají stejně. Zapiš u B, kterou rolí se jelo.
- **E2 si Filip potvrzuje vlastní kapitánství.** Loď *ke kontrole* je LUNA
  a kapitána od kódu na ní má právě `filip`. Scénář se tím dá odjet, ale
  otázka „pozná z obrazovky, proč je ke kontrole" se ptá člověka, který
  tam vidí své jméno. Pro čisté měření přehoď vazbu na jiný účet.

Kombinace, u kterých se **závěr nedělá**, se v zápisu značí `NEODJETO`
s důvodem — ne „prošlo". Od 8. 10. 2026, kdy **mock role vymáhá**, nejsou
žádné: odmítnutí ve správě ročníku je skutečné odmítnutí, ne hláška
z pravidel stavu.

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
- **Vyvěšení směrnice (C3).** Mock přijímá nahrání od 9. 10. 2026 a kontroluje
  totéž co API (`Vyveseni.ProcNejde` a `JePdf`): jen PDF — a rozhoduje
  **obsah, ne koncovka** —, do 20 MB, verze je `max + 1` a starší zůstávají.
  Nahraný soubor se pak vrací přesně tak, jak přišel, takže A6 po C3 ukazuje
  tu správnou verzi. Mít PDF připravené dopředu.
- **Skryté výsledky (A5).** Ročník se přepne ve správě (`POST
  /sprava/serie/{slug}/vysledky-zavodu`, smí **správce**) a mock se pak chová
  jako API: zastávka zůstane i se seznamem lodí, rozjížďky a pořadí odejdou
  prázdné a klient dostane `vysledkySkryte`. Přepnout **před** scénářem a po
  něm vrátit — stav žije v paměti procesu, takže restart mocku ho srovná.
- **Stav výsledků.** Zapisovat jde na zastávce ve stavu `Vypsany` nebo `Odjety`
  (`proc_nejde_na_zavod` v `tools/fake-api.py`) a jen dokud jsou výsledky
  `Navrzeno` nebo `KRevizi` (konstanta `OTEVRENY`, hlídá ji
  `proc_nejde_prepsat`). Vybrat konkrétní rozjížďku předem.
- **Prošlý kód (B2).** Platnost je 15 minut (konstanta `Platnost`
  v `src/OrlickyPohar.Api/Features/Lode/PripojovaciKod.cs`). Čekat na ni
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
zmizí (`zbyvaji` v `cil.tsx`) a stejnou sadu odmítne i API („Loď je v zápisu
dvakrát", `proc_nejde_ulozit` v `tools/fake-api.py`). Zkouší se tedy **záměna
dvou lodí** (přesun v pořadí, `presun` v `cil.tsx`) a **vynechaný dojezd**
dopsaný pozdě. Dvojí klepnutí na totéž nech jako samostatné pozorování: co se
stane a pozná to.

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
(tlačítko *Použít verzi* a odkaz `zapisAdresa` v `porovnani/page.tsx`);
formulář si nese čerstvou revizi (skryté pole `revize` v `[cislo]/page.tsx`),
takže ruční pořadí se se starou verzí neutká.
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
(`SnimekAsync` v `ZapisSprava.cs`, test
`Dva_zapisovatele_maji_kazdy_svuj_snimek`), takže při **jednom účtu na dvou
telefonech** druhé uložení ten první snímek přepíše:
konflikt (409) nastane, ale porovnání ukáže jediný sloupec a větu „Zapisoval
jeden člověk ({kdo}), takže se porovnávat nemá s čím" (větev
`navrhy.length === 1` v `porovnani/page.tsx`). Účastník by skončil ve slepé
uličce a jeho neúspěch by neznamenal nic.
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
uspání. Obrazovka si po návratu načítá čerstvý zápis (`router.refresh()`
v `cil.tsx`). Ověř, že nechybí ani jeden dojezd, a zapiš, jestli účastník po
návratu věděl, na čem je. Dřív byly tyhle tři scénáře jeden a zápis z nich
nešel rozdělit: nebylo poznat, co selhalo při uspání a co až při novém
načtení.

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
(`precti` v `cil.tsx`) — bez samostatného scénáře zůstává nefunkční obnova
schovaná za tím, že karta předtím nezmizela. Když se zápis mezitím změnil,
nabídne se *Odeslat z telefonu a přepsat uložené* / *Zahodit zápis
z telefonu* (blok `cizi` v `cil.tsx`). **Čeká se**, že se nic neztratilo a že
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
A **našlo to chybu, která je týž den opravená** (viz audit výš): porovnání
i formulář tvrdily o konceptu, že ho uložená čísla „nemají", a radily ho
započítat — přitom to byl vlastní starší zápis, který mezitím někdo opravil,
a *Doplnit do formuláře* jedním klepnutím vracelo starší pořadí. Teď jsou
rozdíly ve dvou seznamech a tlačítka jsou dvě; **ověřeno průchodem po
opravě**: *Doplnit chybějící* dopsalo jen chybějící dojezd a cizí opravu
nechalo být.

**Scénář je tím proveditelný**, a je to jediný scénář, u kterého se měří
rozhodnutí mezi dvěma platnými čísly — ne hledání cesty.

## D. Rozhodčí ročníku

**D1 — Založit regatu.**
*Zadání:* Založ regatu a dej jí termín.

**D2 — Ověřit výsledky.** Rozhodčí to sám nedotáhne, a to je zjištění.
*Zadání:* Ověř výsledky jedné rozjížďky a pusť je ven.
*Pro moderátora:* **„pustit ven" není jeho.** `Workflow.KdoSmi` dává
rozhodčímu *Ověřeno*, *Schváleno* a *K revizi*; *Potvrzeno* a publikaci
dělá správce. Zadání je proto schválně napsané tak, jak ho člověk dostane
ústně — a měří se, jestli pozná, kde jeho část končí, a najde, kdo
pokračuje. Nedokončení tu **není selhání účastníka.**
*Projito 8. 10. 2026 jako `zdenek`:* celá řada navrženo → ověřeno →
schváleno → potvrzeno → venku, každý krok s větou, co znamená („Čísla sedí
s papírem z vody", „Protesty vyřízené, pořadí platí", „Konečné. Dál se
needituje"). Po ověření se *zapsat výsledky* mění na *zobrazit zápis* —
zápis se zavírá sám. **Pozor:** průchod byl ještě před tím, než mock začal
vymáhat role, takže poslední dva kroky udělal rozhodčí neprávem; dnes mu
obrazovka nabídne jen *Ověřit* a *Schválit*. **Veřejnou stránku ověř až novým načtením:** hned po
*Pustit ven* ukazovala ještě starou tabulku z mezipaměti routeru a sloupec
rozjížďky v ní chyběl. Zapsat jako „data nesedí" by bylo mylné.

**D3 — Vrátit k revizi.** Dokončuje se až předáním, ne vrácením.
*Zadání:* V těchhle výsledcích je chyba. Zařiď opravu.
*Pro moderátora:* má je vrátit s důvodem. **Pokračuj dál:** pořadatel opravu
udělá a pošle je zpátky, rozhodčí je pustí ven. Pochopí pořadatel, že se bez
vrácení čísla přepsat nedala? Dozvěděl se, že se má něco opravit, z aplikace?
Od 6. 10. 2026 na to rozcestník ročníku odpovídá sám: vrácené výsledky stojí
na prvním řádku „Co teď" s počtem k revizi a se sdělením, že rozhodčí napsal,
co je špatně (`web/app/sprava/[serie]/page.tsx`) — ten důvod samotný ale
na rozcestníku není, takže se pořád měří, jestli ho člověk najde.

*Projito 8. 10. 2026 (`zdenek` → `milos` → `zdenek`, `jarni-vitr`):*

- **Směr k pořadateli funguje.** Vrácení chce důvod v rozbaleném poli, bez
  něj to nejde. Miloš má na prvním řádku „Co teď" *Opravit vrácené výsledky*
  a **důvod najde na stránce regaty**, jedno klepnutí dál.
- **Aplikace mu řekne i další krok**: po uložení opravy stojí v hlášce
  *„Až bude opravený celý, vrať ho na stránce regaty do návrhu, ať ho
  rozhodčí ověří znovu."* Tohle je přesně to, co D3 měří — zapiš, jestli
  tu větu účastník vůbec přečetl.
- **Zpáteční směr byl tichý, dnes už není** (opraveno 8. 10. 2026, viz
  audit). Po `Vrátit do návrhu` stojí rozhodčímu na prvním řádku „Co teď"
  *Ověřit výsledky — {regata}* s počtem rozjížděk, které čekají na jeho
  podpis. Ověřeno průchodem po opravě.
- **Důvod revize na obrazovce zůstává i po potvrzení.** Je to schválně
  (`VysledkySprava.PrepniStavAsync`: přepíše ho až nové vrácení), ale
  u rozjížďky označené *potvrzeno* se „K revizi: …" čte, jako by pořád něco
  viselo. Zapiš, jestli to účastníka zmátlo — nenavrhuj.

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
*Pro moderátora:* účet s rolí **jen na celý web** (`dana`; v mocku
`WEBOVA` a řádek v `OPRAVNENI_WEBU`). Zkratky na ročník v nabídce nejsou, cesta vede
přes **Správa → ročník → Kalendář ročníku**: rozcestník ročníky zná i z role
na celý web (`rocniky` ve `web/lib/co-smim.ts`, volá ji
`web/app/sprava/page.tsx`). **Ruční adresu podej až po zaznamenaném
neúspěchu** — schopnost uhodnout adresu není měřítko použitelnosti. Veřejný
kalendář najde snadno; proto se zadává úprava, ne hledání. Od rozcestníku
(6. 10. 2026) se tu měří, jestli tu cestu najde — ne jestli usoudí, že funkce
neexistuje.

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
proti tomu po návratu načítá čerstvý zápis (`router.refresh()` v `cil.tsx`).
U směrnice je rozhodující **nové načtení původní adresy po stažení** — že má
člověk PDF pořád otevřené nebo uložené v telefonu, selhání odvolání není.

**F3 — Bez signálu.**
*Zadání:* (v C5) Zapni letový režim, zapiš tři dojezdy, pak signál vrať.
*Pro moderátora:* **čeká se**, že se dojezdy dopraví samy — hned po chycení
sítě, jinak do půl minuty (`zkus` v `cil.tsx` — na události `online`
a každých 30 s). Rozliš místní zápis, čekání a potvrzení serverem podle
hranice výš: potvrzení je nové nezávislé načtení a porovnání všech údajů, ne
zelená hláška. Trvanlivost tím ověřená není.

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

**Rezerva**, když zbude čas: **C1** (pozdě příchozí loď) nebo **C12**
(uložení, o kterém telefon neví). C12 je náročná na přípravu — tři kroky
mimo prohlížeč — ale ze všech rezerv nejvíc říká o tom, jestli je obrazovka
srozumitelná ve chvíli, kdy se rozhoduje mezi dvěma platnými čísly. Do prvního sezení
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

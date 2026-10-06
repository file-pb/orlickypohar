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

**Mock** (`tools/fake-api.py` + `npm --prefix web run dev`) na A, C, D, E
a F2–F3: scénáře zapisují a mažou data, na produkci nemají co dělat.

Mock **nic neukládá na disk.** Data načte při startu (`tools/fake-api.py:23`)
a nikdy je nezapisuje zpátky; stav žije v běžícím procesu. Celou sestavu
s databází na tomhle stroji rozjet nejde (není tu kontejnerový běh a Docker Hub
je odtud nedostupný — `README.md:233`). **Hranice závěru je tedy tahle:**

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

**Skupina B, posádka v A3 a F1 zatím nejsou proveditelné.** Z osobních cest má
mock jen `/ja` (`tools/fake-api.py:2043`); `/ja/lode`, `/ja/lode/{id}/kod`,
`/ja/lode/{id}/pripojeni` a `/ja/naroky`, které web volá
(`web/lib/pripojeni.ts:75,79,90,142`), chybí. **Do sezení se nezvou**, dokud
ty čtyři cesty do mocku nedopíšu — F1 obzvlášť: spotřeboval by čerstvého
účastníka na chybu zkušebního prostředí.

**Porovnání zápisů v C7 na mocku nejde celé.** Mock hodnotu tokenu nečte,
jen jeho přítomnost, takže zná **jedinou identitu** (`tools/fake-api.py:2043`).
Konflikt se vyvolat dá (dvě karty, starší revize), **druhý zapisovatel ne** —
a tím ani dva sloupce v porovnání. Chce to v mocku druhou identitu odvozenou
z tokenu; do té doby se C7 zkouší jen do hlášky o konfliktu.

**Výpadek nevyrábí mock, ale zařízení:** letový režim na telefonu nebo
*Offline* v nástrojích prohlížeče.

## Co už víme z auditu kódu (6. 10. 2026)

Tyhle věci není potřeba objevovat znovu — je potřeba změřit, **jak moc vadí**:

| Zjištění | Kde |
|---|---|
| Nabídka účtu se počítá **jen z rolí na ročník**. Kdo má roli na celý web a žádnou v ročníku, nevidí v nabídce ročníkové položky — ačkoliv na ty obrazovky smí a po zadání adresy ho pustí | `web/app/profil.tsx` |
| **Přihlášky nemají v nabídce položku.** Jde se na ně oklikou z kalendáře („přihlášky →") nebo z výsledků regaty („přihlášené lodě →") | `kalendar/page.tsx:325` |
| **Správa nemá rozcestník.** Neexistuje `/sprava` ani `/sprava/{ročník}`; jediná navigace je rozbalovací nabídka pod ikonkou účtu | — |
| **Posádku nejde zadat ve správě.** Pořadatel ji jen vidí; zapsat ji umí kapitán ve veřejné přihlášce nebo import. Kormidelník totéž | `prihlasky/[zavod]/page.tsx:494` |
| Směrnice a medailonek pořadatele jsou taky jen z kalendáře | `kalendar/page.tsx:313,329` |

Prokázaná chyba z auditu je podklad pro opravu **i když ji zkouška mine.** Malá
zkouška není důkaz, že nevadí — jen ji nepotkala.

## Role, se kterými se zkouší

Role se udělují na `/sprava/{ročník}/opravneni`. Pro zkoušku je potřeba
**pět účtů**, ne jeden s přepínáním: půlka nálezů je o tom, co kdo v nabídce
vidí.

1. **Nepřihlášený** — běžný návštěvník.
2. **Kapitán lodi** bez role ve správě.
3. **Organizátor jedné zastávky.**
4. **Rozhodčí ročníku.**
5. **Správce ročníku** a zvlášť **správce celého webu bez role v ročníku**.

## Příprava dat a lidí

Bez tohohle se měří improvizovaná příprava, ne aplikace. Každý scénář má mít
**výchozí stránku, připravená data a určeného člověka**, který obsluhuje druhý
telefon.

- **Dlouhý seznam do cíle (C5).** V mocku má nejvíc lodí `izolepa` — 22 účastí
  z 37 lodí v ročníku. Na 25–30 se dostane doplněním `ucasti`
  v `data/2026-nanecisto.json`. Podobná jména tam už jsou (ČERVENÉ CAFE /
  MODRÉ CAFE, SEA MOUSE III / FAR STAR III / Charlotte III) — hledání v seznamu
  se zkouší proti nim. Dojezdy musí přijít **těsně za sebou**, ne vlastním
  tempem: čte je někdo druhý ze seznamu.
- **Stav výsledků.** Zapisovat jde na zastávce ve stavu `Vypsany` nebo `Odjety`
  (`tools/fake-api.py:683`) a jen dokud jsou výsledky `Navrzeno` nebo `KRevizi`
  (`tools/fake-api.py:677,693`). Vybrat konkrétní rozjížďku předem.
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

---

## A. Nepřihlášený návštěvník

**A1 — Kdy se jede a kde.**
*Zadání:* Najdi termín a místo nejbližší regaty.

**A2 — Podle čeho se jede.**
*Zadání:* Najdi plachetní směrnici k té regatě.
*Pro moderátora:* hledá ji u regaty, nebo v menu? Je na stránce vidět, že je
to závazný dokument?

**A3 — Přihlásit loď.** Posádka zatím na mocku nejde (viz výš).
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

**Zatím neproveditelné** — mock neumí osobní cesty, viz „Kde se to zkouší".
Do sezení se tyhle scénáře nezvou.

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
*Zadání:* Odstartuj rozjížďku a zapiš, jak lodě dojely. Jedna nedojela.
*Pro moderátora:* **to hlavní z celé zkoušky.** 25–30 přihlášených, dojezdy
těsně za sebou, jméno lodi čte někdo druhý. Zvládne to bez pomoci? Ví po
každém klepnutí, že je uloženo? Stíhá tempo, nebo hledá v seznamu? Zmeškanou
loď zapiš v okamžiku, kdy nastane, otázky odlož za dávku.

**C6 — Oprava omylu.**
*Zadání:* Dvě lodě dojely v jiném pořadí, než jsi zapsal, a jedna ti vypadla.
Oprav to.
*Pro moderátora:* **dvakrát tutéž loď klepnout nejde** — dojetá loď ze seznamu
zmizí (`cil.tsx:211`) a stejnou sadu odmítne i API („Loď je v zápisu dvakrát",
`tools/fake-api.py:707`). Zkouší se tedy **záměna dvou lodí** (přesun v pořadí,
`cil.tsx:221`) a **vynechaný dojezd** dopsaný pozdě. Dvojí klepnutí na totéž
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
(`porovnani/page.tsx:127,132`); formulář si nese čerstvou revizi
(`[cislo]/page.tsx:165`), takže ruční pořadí se se starou verzí neutká.
Automatické sloučení aplikace neumí a nemusí.
Hlídej dvě pasti: *Přesto odeslat* přepíše práci druhého, *Zahodit* zahodí
svoji (`cil.tsx:330,340`) — a po ručním sepsání ve formuláři zůstává
v telefonu starý neodeslaný zápis, který se při návratu na cíl nabídne znovu.

**Musí to být dva různé účty.** Snímek k porovnání je jeden na zapisovatele
(`ZapisSprava.cs:369`, test `Dva_zapisovatele_maji_kazdy_svuj_snimek`), takže
při **jednom účtu na dvou telefonech** druhé uložení ten první snímek přepíše:
konflikt (409) nastane, ale porovnání ukáže jediný sloupec a větu „Zapisoval
jeden člověk, takže se porovnávat nemá s čím" (`porovnani/page.tsx:103`).
Účastník by skončil ve slepé uličce a jeho neúspěch by neznamenal nic.
Varianta s jedním účtem je proto **samostatné pozorování s předem známým
koncem**, ne cesta k společnému výsledku — a eviduje se jako funkční mezera
k rozhodnutí, protože sdílený účet na dvou telefonech je u vody pravděpodobný.

**C8 — Papír.**
*Zadání:* Dopiš zápis doma z fotky papíru a přilož ji.

**C9 — Přerušení zápisu.**
*Zadání:* (uprostřed C5, bez signálu) Zamkni telefon, podívej se do zprávy
a vrať se k zápisu. Pokračuj. — potom: — Načti stránku znovu.
*Pro moderátora:* dvě různé věci. Přepnutí aplikace zkouší, jestli přežije
otevřená stránka; **nové načtení s neodeslanými dojezdy** zkouší obnovu
konceptu z telefonu (`cil.tsx:154`) — bez něj by nefunkční obnova zůstala
schovaná za tím, že karta nezmizela. Když se zápis mezitím změnil, nabídne
*Přesto odeslat / Zahodit* (`cil.tsx:159,330`). Ověř, že se **nic
neztratilo**, a zapiš, jestli po návratu věděl, jak na tom je.

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
*Pro moderátora:* účet s rolí **jen na celý web**. V nabídce ročníkové položky
nejsou (viz audit), přes `/sprava/{ročník}/kalendar` se tam dostane. **Ruční
adresu podej až po zaznamenaném neúspěchu** — schopnost uhodnout adresu není
měřítko použitelnosti. Veřejný kalendář najde snadno a vstup do správy
zůstane neobjevený; proto se zadává úprava, ne hledání. Dnes
nejpravděpodobnější místo, kde člověk usoudí, že funkce neexistuje.

## F. Napříč rolemi

**F1 — Od začátku do konce.** **Zatím neproveditelné** (potřebuje osobní cesty
skupiny B). Až pak, a jen pro **čerstvého účastníka** — po A a B už tentýž
člověk první orientaci neměří.
*Zadání:* Přihlas se, připoj se k lodi, podívej se na směrnici a po regatě si
najdi výsledek.
*Pro moderátora:* kolik odboček?

**F2 — Zpět a staré adresy.**
*Zadání:* (po uložení zápisu a po opravě) Vrať se tlačítkem Zpět. — a po C4: —
Načti znovu adresu té stažené směrnice.
*Pro moderátora:* u zápisu nesmí jít uložit starší stav; obrazovka cíle si
proti tomu po návratu načítá čerstvý zápis (`cil.tsx:205`). U směrnice je
rozhodující **nové načtení původní adresy po stažení** — že má člověk PDF
pořád otevřené nebo uložené v telefonu, selhání odvolání není.

**F3 — Bez signálu.**
*Zadání:* (v C5) Zapni letový režim, zapiš tři dojezdy, pak signál vrať.
*Pro moderátora:* **čeká se**, že se dojezdy dopraví samy — hned po chycení
sítě, jinak do půl minuty (`cil.tsx:178`). Rozliš místní zápis, čekání
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
2. Opravit záměnu a vynechaný dojezd, pokračovat bez signálu, obnovit zápis
   po přerušení a po novém načtení — **C6, F3, C9**
3. Vyřešit připravený konflikt a dojít ke společnému výsledku (dva různé
   účty, jinak není co porovnávat) — **C7**
4. Vyvěsit a stáhnout PDF, ověřit veřejný stav — **C3, C4, A6**

**Rezerva**, když zbude čas: **C1** (pozdě příchozí loď). Do prvního sezení
nepatří skupina B ani F1 — na mocku nejsou proveditelné.

Výstupem jsou konkrétní blokátory práce pořadatele. Ostatní role potřebují
vlastní krátká sezení.

## Kdy je toho dost

Aby z každého nového názoru nevznikla další přestavba nabídky:

- **Blokátor potvrzený auditem nebo vlastní reprodukcí** jde do oprav hned.
- **Další navigační zásek** potřebuje **druhé nezávislé pozorování**, nebo
  potvrzení auditem, že cesta chybí. Jedno zaseknutí jednoho člověka je
  podnět, ne nález.
- Po opravách přijde **čerstvý pořadatel na hlavní úkoly** (C5, C6, C7).
  **Kolo končí, když je dokončí samostatně a výsledná data sedí.**

## Z čeho se bude vycházet při úpravách

Z nálezů, ne z dojmu. Každý návrh úpravy má mít u sebe **scénář, ve kterém
někdo stál**, a odhad, koho se to týká. Pořadí podle toho, co blokuje práci
u vody, pak co se dělá často, a teprve pak pohodlí.

Seznam přání do úprav nepatří. **Prokázaná chyba z auditu ano** — i když ji
zkouška nepotkala.

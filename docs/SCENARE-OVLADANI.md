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
jen *Zadání* — očekávaná cesta, „čeká se" a ruční adresa jsou moderátorův
list. Přečtené dohromady měří následování návodu a potvrdí hypotézu, se kterou
se do zkoušky šlo.

Napovědět se smí **až po třech minutách** a zapíše se **přesné znění nápovědy.**
Tři minuty platí na hledání odkazu. Při dávce dojezdů se zmeškaná loď musí
zachytit hned — pomoc o minutu později už zakryje selhání v tempu.

## Co se zapisuje

Místo *dokončil / nedokončil* čtyři možnosti:

- **samostatně**
- **s pomocí** (a přesné znění nápovědy)
- **nedokončil**
- **zdánlivě dokončil, data nesedí** — obrazovka řekla hotovo, v datech to není
  nebo je to jinak

Dál čas, kolik špatných odboček, a jeho vlastní věta o tom, co čekal. Ta věta
je nejcennější — říká, kde čekal odkaz, který tam není.

U známého zákazu (C2, B4, B5, D4, D5) se neměří „nedokončil", ale dvě věci:
**rozpoznal důvod** a **našel skutečně dostupný další krok.** Bez toho se
v zápisu smíchá správné odmítnutí, chybějící funkce a nenalezený odkaz — a
oprava se pak navrhne na špatné místo.

Moderátor, který kouká pořadateli na telefon, při zápisu dojezdů klepnutí
propásne. Potřeba je druhý pozorovatel, nebo se souhlasem záznam obrazovky
a hlasu.

## Kde se to zkouší

**Mock** (`tools/fake-api.py` + `npm --prefix web run dev`) na A, C, D, E, F:
scénáře zapisují a mažou data, na produkci nemají co dělat.

Dvě věci o mocku je potřeba vědět předem, jinak vyrobí falešnou jistotu:

- **Nic neukládá na disk.** Data načte při startu (`tools/fake-api.py:23`)
  a nikdy je nezapisuje zpátky. Stav žije v běžícím procesu: obnovení stránky
  i načtení z druhého zařízení projde, restart mocku smaže všechno. Kde se
  ověřuje, že je výsledek **doopravdy uložený**, ať běží celá sestava:
  `docker compose up --build`.
- **Výpadek nevyrábí mock, ale zařízení.** Letový režim na telefonu nebo
  *Offline* v nástrojích prohlížeče. V mocku pro to vypínač není a nemá být.

**Skupina B a posádka v A3 se na mocku zkoušet nedají.** Z osobních cest má
mock jen `/ja` (`tools/fake-api.py:2043`); `/ja/lode`, `/ja/lode/{id}/kod`,
`/ja/lode/{id}/pripojeni` a `/ja/naroky`, které web volá
(`web/lib/pripojeni.ts:75,79,90,142`), chybí. Buď na B pustit `docker compose`,
nebo ty čtyři cesty do mocku dopsat. **Rozhodnout před sezením**, ne u stolu.

Při zápisu se rozlišují tři stavy, ne dva: **místní zápis v telefonu**,
**čeká na odeslání**, **potvrzeno serverem.** Obrazovka to umí
(`uloženo / ukládám… / neuloženo`), zápis to musí rozlišovat taky.

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
- **Konflikt (C7).** Dvě **různé** opravy, jejich správný společný výsledek
  sepsaný předem, a člověk na druhém telefonu, který jednu z nich uloží na
  pokyn.

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

**A6 — Co je venku doopravdy.** Navazuje na C3 a C4, hned po nich.
*Zadání:* Jsi účastník. Otevři směrnici k té regatě a řekni, která je to verze.
*Pro moderátora:* po C3 má být venku **ta správná verze**; po C4 musí původní
veřejný odkaz přestat fungovat. Tady se pozná rozpor mezi správou
a veřejností — ve správě to vypadá hotově a venku je starý soubor.

**A7 — Minulá sezóna.**
*Zadání:* Je otevřený nový ročník. Najdi konečný výsledek a směrnici regaty
z toho minulého.
*Pro moderátora:* dohledatelnost po sezóně. Zapiš, kolik odboček a jestli
si nebyl jistý, že se dívá na ten starý ročník.

## B. Kapitán lodi (bez role ve správě)

Nejde na mocku — viz „Kde se to zkouší".

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
*Pro moderátora:* očekávaná cesta je kalendář → směrnice. Po dokončení jde A6.

**C4 — Odvolat špatnou směrnici.**
*Zadání:* Ve vyvěšeném PDF jsou telefony posádky. Zařiď, ať není venku.
*Pro moderátora:* hledá mazání? Najde stažení? Je mu po provedení jasné, co
ještě musí udělat ručně? Po dokončení jde A6 s původním odkazem.

**C5 — Zápis z cíle.** Na telefonu, venku, jednou rukou.
*Zadání:* Odstartuj rozjížďku a zapiš, jak lodě dojely. Jedna nedojela.
*Pro moderátora:* **to hlavní z celé zkoušky.** 25–30 přihlášených, dojezdy
těsně za sebou, jméno lodi čte někdo druhý. Zvládne to bez pomoci? Ví po
každém klepnutí, že je uloženo? Stíhá tempo, nebo hledá v seznamu? Zmeškanou
loď zapiš v okamžiku, kdy nastane.

**C6 — Oprava omylu.**
*Zadání:* Dvě lodě dojely v jiném pořadí, než jsi zapsal, a jedna ti vypadla.
Oprav to.
*Pro moderátora:* **dvakrát tutéž loď klepnout nejde** — dojetá loď ze seznamu
zmizí (`cil.tsx:211`) a stejnou sadu odmítne i API („Loď je v zápisu dvakrát",
`tools/fake-api.py:707`). Zkouší se tedy **záměna dvou lodí** (přesun v pořadí,
`cil.tsx:221`) a **vynechaný dojezd** dopsaný pozdě. Dvojí klepnutí na totéž
nech jako samostatné pozorování: co se stane a pozná to.

**C7 — Dva telefony.** Dokončit, ne jen vidět hlášku.
*Zadání:* Ulož zápis. (Druhý zapisovatel mezitím uloží na pokyn svou opravu.)
Zařiď, aby ve výsledcích bylo správné pořadí.
*Pro moderátora:* **čeká se** hláška o konfliktu, odkaz na porovnání a to, že
vlastní klepnutí zůstanou v telefonu. To je ale jen začátek — nech ho konflikt
**doopravdy dořešit** a porovnej s předem sepsaným správným výsledkem.
Pozor na tlačítka *Přesto odeslat* a *Zahodit* (`cil.tsx:330,340`): prvním
přepíše práci druhého zapisovatele, druhým zahodí svou. Zapiš, jestli mu bylo
jasné, co která volba udělá. Zkus i **stejný účet na dvou telefonech.**

**C8 — Papír.**
*Zadání:* Dopiš zápis doma z fotky papíru a přilož ji.

**C9 — Přerušení zápisu.**
*Zadání:* (uprostřed C5, bez signálu) Zamkni telefon, podívej se do zprávy
a vrať se k zápisu. Pokračuj.
*Pro moderátora:* samotný letový režim tohle neodhalí. Obrazovka má zápis
držet v telefonu a po návratu ho sama odeslat (`cil.tsx:154`); když se zápis
mezitím změnil, nabídne *Přesto odeslat / Zahodit* (`cil.tsx:159,330`). Ověř,
že se **nic neztratilo**, a zapiš, jestli po návratu věděl, jak na tom je.

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

**F1 — Od začátku do konce.** Jen pro **čerstvého účastníka**, ne po A a B —
ten už první orientaci neměří.
*Zadání:* Přihlas se, připoj se k lodi, podívej se na směrnici a po regatě si
najdi výsledek.
*Pro moderátora:* kolik odboček?

**F2 — Zpět.**
*Zadání:* (po uložení zápisu, po opravě a po stažení dokumentu) Vrať se
tlačítkem Zpět.
*Pro moderátora:* nesmí se ukázat starší stav. Obrazovka cíle si proti tomu
po návratu načítá čerstvý zápis (`cil.tsx:205`) — ověř, že to funguje.

**F3 — Bez signálu.**
*Zadání:* (v C5) Zapni letový režim, zapiš tři dojezdy, pak signál vrať.
*Pro moderátora:* **čeká se**, že se dojezdy dopraví samy — hned po chycení
sítě, jinak do půl minuty (`cil.tsx:178`). Rozliš místní zápis, čekání
a potvrzení serverem; úspěch potvrď **načtením z druhého zařízení**, ne
zelenou hláškou. Na trvalé uložení ať běží `docker compose`, ne mock.

Podmínky u vody (telefon, jedna ruka, slunce) nejsou samostatný scénář —
patří do C5 a C7.

---

## První sezení: jedno odpoledne s jedním pořadatelem

Data připravená předem. Začíná se **prvním přihlášením po udělení role**, ne
na hotové obrazovce. Dva bloky do hodiny s pauzou.

1. Najít svou regatu a přidat pozdě příchozí loď — **C1**
2. Zapsat dávku dojezdů venku na telefonu — **C5**
3. Opravit záměnu, pokračovat bez signálu a obnovit zápis po přerušení —
   **C6, F3, C9**
4. Vyřešit připravený konflikt a ověřit společný výsledek — **C7**
5. Vyvěsit a stáhnout PDF, ověřit veřejný stav — **C3, C4, A6**

Výstupem jsou konkrétní blokátory práce pořadatele. Ostatní role potřebují
vlastní krátká sezení.

## Z čeho se bude vycházet při úpravách

Z nálezů, ne z dojmu. Každý návrh úpravy má mít u sebe **scénář, ve kterém
někdo stál**, a odhad, koho se to týká. Pořadí podle toho, co blokuje práci
u vody, pak co se dělá často, a teprve pak pohodlí.

Seznam přání do úprav nepatří. **Prokázaná chyba z auditu ano** — i když ji
zkouška nepotkala.

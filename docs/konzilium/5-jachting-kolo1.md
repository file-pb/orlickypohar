# Jachting a ČSJ — kolo 1

## Co je dobře

1. **Pruh veřejné regaty je po R10/R28 srovnaný, a je správně vzorem.** Miloš
   položky vyjmenoval dvakrát (27. a 28. 10. 2026) a pořadí sedí na druhý
   výčet až na jeden přívlastek (viz otázky) — dvakrát stejně jmenované zadání
   je to nejpevnější, co v projektu je.
2. **„Co teď" jako první tab ročníku.** Rozhodčí má osm zastávek a podpis
   u každé; jiné místo, které mu řekne, u které něco visí, není. Fronta, ne
   agenda — tak ta role vypadá.
3. **Barva podle agendy, ne podle patra** — R10 nechává otevřené, že Miloš
   chodí veřejně i do správy a *Závodní trať* vs. *Bóje na trati* ho plete.
4. **„čeká na podpis rozhodčího" v seznamu regat** (`Regaty.dc.html`) —
   podpis je skutečný úkon, ne stav v databázi, a u vody se na něj čeká.
5. **Pořadí dělené po kategoriích pilulkou** — seriál má tři pořadí, ne jedno.

## Co je špatně

### 1. Průběžné pořadí počítá na závodové stupnici, ne na seriálové

- **Nález** — `VerejnyRocnik.dc.html`: vítěz má *Jarní vítr 1, Radavská 2,
  Celkem 3*. Do seriálu jde **pořadí v kategorii mínus jedna**, vítěz zastávky
  má **0** (PLAN *Nízkobodový systém*; sešit rozhodčího: Mamba první → 0).
- **Proč to vadí** — Miloš má sešit s nulou u vítěze. Tabulka s jedničkou se
  s ním rozejde na každém řádku a posun o jedničku se projeví až u shod, tedy
  tam, kde se pohár rozhoduje. PLAN před touhle chybou výslovně varuje.
- **Návrh** — čísla přepsat na 0 / 1 / 2 a nad tabulku větu *„Nízkobodový
  systém: vítěz zastávky 0 bodů."*

### 2. Ve sloupcích zastávek stojí kódy, které patří rozjížďce

- **Nález** — `DNF` a `OCS` ve sloupcích *Jarní vítr* a *Radavská*. To jsou
  kódy **jedné rozjížďky** (A5.2, `Bodovani.BodyRozjizdky`). Za zastávku má
  loď bodové číslo; v seriálové tabulce mají smysl jen **DNC** a **DSQ**
  (20 bodů) — API u pořadí vydává jen tyhle dva.
- **Proč to vadí** — tabulka míchá dvě úrovně bodování, které projekt
  schválně rozdělil. Loď s DNF v jedné z pěti rozjížděk může zastávku vyhrát;
  takhle to čte, jako že nedojela celou regatu.
- **Návrh** — ve sloupci zastávky jen číslo; kód jen `DNC` a `DSQ` (u DSQ
  s číslem 20). Kódy rozjížděk patří do výsledků regaty.

### 3. Škrt je vysvětlen pravidlem z jiné úrovně a součet si s ním protiřečí

- **Nález** — poznámka *„Škrtá se od čtyř odjetých rozjížděk"* pod seriálovou
  tabulkou je pravidlo **závodu** (`Zavod.PocetSkrtu`). V ročníku se škrtají
  **zastávky** (`Serie.PocetSkrtu`, 2026 = 2; Miloš: *„od devíti odjetých –
  2 škrtačky"*). Maketa navíc po 2 z 8 regat škrtnuté výsledky už kreslí
  a **sčítá je**: Kormorán má škrtnutý DNF a Celkem 14, tedy 9 + 5.
- **Proč to vadí** — rozhodčí čte listinu přes součet; přeškrtnuté číslo,
  které v součtu je, je horší než žádný škrt — nejde poznat, co platí.
- **Návrh** — text *„V ročníku se škrtají dvě nejhorší zastávky, od devíti
  odjetých. Zatím se neškrtá."*; škrtnutí nekreslit, dokud se neškrtá, a pak
  škrtnuté číslo ze součtu vyndat.

### 4. Tabulka se nedá vzít jako výsledková listina

- **Nález** — chybí: poznávací znak jako **samostatný sloupec** (dnes je
  v podřádku u jména), **kategorie v hlavě tabulky** (jen v pilulce, takže
  vytištěná tabulka neví, čí je), **datum vydání**, **kdo ji vydal**, počet
  odjetých rozjížděk u zastávky a bonus 24hodinovky (`Zavod.PosunDoSerie`).
  Rozstřel při shodě vidět není, a seriál ho má.
- **Proč to vadí** — Miloš listiny vydává a podepisuje. Bez kategorie, data
  a autora je to obrazovka, ne doklad; při shodě nikdo nepozná, co rozhodlo.
- **Návrh** — nad tabulku jeden řádek hlavičky: *„Orlický pohár 2027 ·
  kategorie nad 7 m · průběžné pořadí po 2 z 8 regat · vydáno 15. 5. 2027 ·
  rozhodčí Miloš Zvonař"*, znak do vlastního sloupce, u shody notu, co rozhodlo.

### 5. Kategorie v maketě nejsou kategorie Orlické série

- **Nález** — pilulka *Kajuta · Sport · Open*. Seriál má **do 7 m, nad 7 m,
  Race**, a od nové sezóny **čtyři třídy** (R29).
- **Proč to vadí** — rozhodčí to na maketě přečte první, a čtvrtá kategorie
  mění šířku pilulky, která se posuzuje teď.
- **Návrh** — skutečné názvy a počítat se čtyřmi kategoriemi.

### 6. „2 ze 4 rozjížděk venku" tvrdí jmenovatel, který ještě neexistuje

- **Nález** — `Regaty.dc.html`. Počet rozjížděk se rozhoduje **na vodě podle
  větru**, ne při vypisování (PLAN *Bodování ve dvou úrovních*).
- **Proč to vadí** — na tom čísle visí škrt v závodě: se čtyřmi odjetými se
  škrtá, se třemi ne. Pořadatel čte „ze 4" jako plán, rozhodčí jako hranici
  škrtu, a aplikace neví ani jedno.
- **Návrh** — *„2 rozjížďky venku · 1 k revizi"*; jmenovatel teprve tehdy,
  až rozhodčí počet uzavře.

### 7. „přihlášeno 14 lodí" není číslo, podle kterého se pořadatel rozhoduje

- **Nález** — `Regaty.dc.html`. Rozhoduje počet přihlášených **v kategorii**:
  na něm stojí body za kódy (A5.2 — přihlášených v kategorii + 1) i za
  neúčast (`Bodovani.PrihlasenaDoZavodu`). R10 navíc odděluje *přihlášky*
  (proces) od *startovní listiny* (kdo startuje); čtrnáctka nerozliší zapsané,
  potvrzené, vyloučené ani nedostavivší se.
- **Proč to vadí** — pořadatel ráno potřebuje vědět, kolik lodí stojí v které
  kategorii (jede se vůbec?) a kolik přihlášek čeká na potvrzení; jedno číslo
  neodpoví ani na jedno.
- **Návrh** — *„14 přihlášek · 11 na listině · 4 / 5 / 2 po kategoriích"*.

### 8. Veřejnému ročníku chybí vypsání seriálu a pravidla bodování

- **Nález** — taby *Úvod · Kalendář · Průběžné pořadí · Přihlášené lodě ·
  Novinky*. Není tam, podle čeho se ročník jede: kategorie **a pravidlo, podle
  kterého do nich loď patří** (R24 — je ve vypsání a nikde jinde), počet
  škrtů, bonus 24hodinovky, bodování neúčasti, DSQ = 20.
- **Proč to vadí** — ZPJ 25.1 žádá podmínky dostupné **dřív, než se loď
  přihlásí**; R10 bod 1 to má u regaty jako první položku a Miloš to dává
  i nepřihlášeným. U ročníku ekvivalent chybí, a hodnoty (2 škrty, DSQ 20)
  patří ročníku, ne webu — `/pravidla` je mimo okno a ročníkové číslo neunese.
- **Návrh** — šestý tab **Pravidla ročníku** mezi *Kalendář* a *Průběžné
  pořadí*, odkazovaný z poznámky pod tabulkou pořadí.

### 9. „Přihlášené lodě" u ročníku splývá s přihláškou na zastávku

- **Nález** — tab ročníku *Přihlášené lodě* proti tabu regaty *Startovní
  listina*; přihláška do ročníku a na zastávku jsou dvě entity (PLAN).
- **Proč to vadí** — kdo se přihlásil do seriálu, bude čekat, že je tím
  přihlášený na zastávku; omyl stojí neúčast v bodech počtu lodí kategorie.
- **Návrh** — *Lodě ročníku*, a u každé lodi, na kolika zastávkách startovala.

### 10. Dvě vady v datech makety, které rozhodčí přečte první

- **Nález** — *Vánoční regata* s termínem **24. července** (`Regaty.dc.html`)
  v ukázkových datech od 23. 9. 2026 není, je zrušená. A štítek **„vypsáno"**
  má po R1 dva významy: stav v kalendáři, a dokument vyvěšený od 28. 10. 2026.
- **Proč to vadí** — letní Vánoční regata udělá z makety hračku; u štítku to
  není kosmetika, protože podle vyvěšeného vypsání se smí přihlašovat.
- **Návrh** — zastávku z termínové listiny 2027; vedle štítku stavu řadu
  *vypsání · směrnice · trať* s tím, co je venku.

## Co bych potřeboval vědět

**Na rozhodčího** (přes Filipa, nebo tabem *Otázky k aplikaci*):
1. Od kolika odjetých zastávek se v ročníku škrtá a kolik škrtů má ročník
   s **osmi** zastávkami? „Od devíti – 2 škrtačky" na 2027 nesedí.
2. Smí být průběžné pořadí vydané jako **listina** (datum, kategorie, tvé
   jméno), nebo listinu vydáváš jen ty sám?
3. Platí od 2027 **čtyři** třídy (R29)? Mění to tři tabulky na čtyři, a má se
   u shodného součtu veřejně psát, co rozhodlo?

**Na Filipa** — dostane veřejný ročník tab *Pravidla ročníku* (nález 8), nebo
se spoléhá na `/pravidla` mimo okno?

**Na 1-ergonomii** — správa ročníku má adresu `/poradatele`, ale v pruhu osmi
tabů pořadatelé nejsou. Devátý tab, nebo část *Kalendáře*?

**Na 4-jazyk** — `Závodní trať` má podle R28 znít **„Předpokládaná trať"**:
trať se přijímá a za jízdy se smí změnit. Slovo je tvoje, důvod můj.

## Čeho se nedotýkám

Hierarchie, barvy a rytmus (2-design). Počet kroků, telefon u vody a práce
pod tlakem (1-ergonomie). Prázdné stavy, chyby a toky rolí (3-ux). Znění textů
(4-jazyk) — kromě dvou míst výš, kde jméno mění význam podle pravidel.

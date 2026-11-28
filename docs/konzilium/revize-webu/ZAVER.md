# Závěr konzilia nad revizí webu (27. 11. 2026)

Osm oborů, tři kola, 2 332 řádků posudků. Tohle je, co z toho platí.
Nesouhlas je zapsaný, ne zahlazený; kde nevyšla shoda, rozhodl moderátor a je
to u toho napsané.

**Podklady:** [`ZADANI.md`](ZADANI.md), [`AUDIT.md`](AUDIT.md), posudky
`<obor>-kolo{1,2,3}.md`, zadání kol [`KOLO2.md`](KOLO2.md)
a [`KOLO3.md`](KOLO3.md).

**Nic z toho není postavené.** Konzilium nesáhlo na kód; závěr je zadání
pro stavbu a čeká na Filipovo slovo.

## Co bylo v podkladu špatně

Tři věci v mém auditu a zadání, které kola opravila:

- **Pevné pruhy na telefonu berou návštěvníkovi 231 px (28 %), ne 124 (15 %).**
  Audit měřil přihlášeného s rolí, kterému layout schová partnery
  (`web/app/layout.tsx:139`). Nezávisle změřili 8-pr a 10-grafik.
- **Kontrast nadpisu okna je 3,13–4,32**, ne 3,99–4,49 (2-design, 12
  kombinací), a světlý vzhled není „jinak čistý": slovo stupně výstrahy
  má 1,92.
- **`milos` není v mocku rozhodčí**, ale pořadatel jedné regaty; rozhodčí je
  `zdenek`.

**Co nikdo z osmi neviděl:** den regaty, nepodepsané výsledky, upravitelný
zápis a cíl v běhu — mock má všechno odjeté a potvrzené. Co se o těch stavech
tvrdí, je z kódu. Je to první podmínka stavby (oddíl *V jakém pořadí*).

## Co se mění — správa

### 1. Karta regaty v kalendáři nese stav, krok vpřed a jeden odkaz

Sedm odkazů, které zdvojují pruh dlaždic, jde pryč. Zůstane termín, název,
stav, **krok vpřed** (má-li regata nějaký), „Otevřít regatu →" přes celý řádek
a úprava termínu. **Shoda 1, 3, 5, 7, 9** (kolo 2).

### 2. Kroky zpět bydlí v patě okna regaty

Sbalený oddíl **„Stav regaty: odjeto · na webu ▸"**, stejný pod všemi
agendami okna. Uvnitř každý krok zpět s větou následku a tlačítkem, které
nese jméno regaty. **Hlasování 3 : 2** (1, 3, 5 pro patu; 7 a 9 pro vlastní
stránku „Termín a stav", 7 s patou jako druhou volbou). V kole 2 se tu
ustupovalo dokola — původní zastánci karty přešli k oknu a naopak; hlasování
to rozseklo.

Proč ne karta: v řadě osmi stejných karet zůstává omyl „správný úkon, špatná
regata" (7) a po úkonu se kalendář vrací nahoru bez kotvy (3). Proč ne nová
stránka: nový cíl v nadpisu okna, který už dnes na 375 px přetéká (1).

### 3. Odjetou regatu s výsledky v poháru server zpět nepustí

`Kalendar.ProcNejde` odmítne krok Odjetá → Vypsaná, dokud je z regaty něco
v poháru. **Hlasování 3 : 2** (3, 5, 9 pro; 1 a 7 chtěli výjimku pro
rozhodčího a správce s důvodem).

Rozhodlo měření 9-rizik proti kódu:

- dnes krok projde každému včetně pořadatele jediné regaty
  (`Kalendar.cs:41–44`, `:84–88`);
- regata vypadne z průběžného pořadí i s body (`PoradiEndpoints.cs:85`,
  `:105`), veřejné výsledky regaty přitom visí dál;
- **automat ji do dne zavře znovu** (`Uzavirani.cs:85–91`) — pohár se
  přepočítá tam a zpět a zbude nepravdivý štítek „uzavřeno samo".

Co má z poháru ven, jde po rozjížďkách: „Vrátit k revizi", „Vyndat
z poháru". 5-jachting svůj návrh výjimky vzal zpět: zápis jde u odjeté regaty
stejně jako u vypsané (`Zapis.cs:53`).

### 4. Řádek přihlášky je karta s jedním krokem

Na 375 px shora dolů:

1. `CZE 434` · **FAR STAR III** tučně, vpravo stav prezence slovem;
2. kormidelník · typ lodi;
3. **jen co chybí**, slovy („nezaplaceno · bez souhlasu"); nechybí-li nic,
   stojí tam „v pořádku" — ticho není stav;
4. „Potvrdit prezenci", 44 px přes šířku, **jen u nepotvrzené lodi**.

Řádky 1–3 jsou `summary` Podrobností; uvnitř kód k připojení, zrušení
prezence, změny stavu, posádka. Odstavec „Bez souhlasu: 16 z 16" se jmény
pryč, nad seznamem jedna věta s počty. **Shoda 1, 3, 5, 7; bod 3 hlasování
4 : 0.** Stav slovem, ne znakem: červená a zelená stavu mají ve světlém mezi
sebou jas 1,16 : 1 (2).

Dvě věci k tomu:

- **Souhlas s pravidly se do řádku nestaví, dokud ho u zapsané lodi nejde
  zaznamenat** — dnes jde jen při zápisu nové lodi
  (`prihlasky/[zavod]/akce.ts:44–46`). Jinak se šestnáct upozornění, se
  kterými nejde nic dělat, jen přestěhuje z hlavičky do řádků (3, 7).

  > **Filip, 27. 11. 2026:** souhlas podmínkou je, ale **stačí napsat, že
  > účastí s pravidly závodník souhlasí.** Sedí to na rozhodnutí z 28. 10.
  > („souhlas je doklad, ne branka", `PLAN.md:9803`). Do řádku přihlášky tedy
  > souhlas **nejde vůbec**, úkon „Zaznamenat souhlas" nevzniká a prezenci
  > nic neblokuje. Kam věta patří a co s výčtem „Bez souhlasu: N z M", je
  > v oddílu *Co čeká na Filipa*, bod 4.
- **„Zrušit prezenci" se lodi s výsledky nenabízí.** Změřeno (9, 3, 5): dnes
  projde (`Prihlasky.cs:114–117`), body nemění (`Bodovani.cs:44–45`), ale loď
  spadne z veřejné listiny mezi nepotvrzené a příští uložení zápisu ji vrátí.

### 5. Zápis rozjížďky ukazuje listinu, ne ročník

Lodě regaty nahoře (dnes 16), zbytek ročníku pod `details` „Lodě mimo
listinu (21)" v témže formuláři — stejně, jako to už dělá cíl; data příznak
`naRegate` nesou. Obrazovka klesne ze 4,1 na asi 2,5 obrazovky (1).
**Shoda 1, 5, 9.**

Důvod, proč zápis nabízel celý ročník, už neplatí (`ZapisSprava.cs:10–12`:
účast tehdy přinášel jen import). A riziko je skutečné: výsledek zapsaný
lodi mimo listinu jí založí a potvrdí účast (`:341–351`) a **vymazáním
výsledku se to nevrátí** (`:373–374`) — třídě zůstane o bod vyšší každý kód.
Věta v rozbalovači to musí říct celé (9, výhrada).

### 6. Druhé klepnutí má jedno pravidlo

> Druhé klepnutí dostane úkon, jehož omyl **(1)** nejde vrátit jedním
> klepnutím na téže obrazovce, nebo **(2)** na téže obrazovce není vidět —
> ubírá něco veřejnosti nebo přepočítá pohár.

Druhým klepnutím je rozbalovač s **větou následku** (ne `title` — ten se na
dotyku neukáže); třetí nikde. Tlačítko nese předmět: „Opravdu skrýt ročník
2026", ne holé „Opravdu". Nevratný úkon nikdy plnou výplní; obrysově
v `--stav-zruseny` (2). **Shoda 1, 3, 7, 9** na jádru; seznam jsem složil
z jejich čtyř.

| Dostane | Nedostane |
|---|---|
| Smazat přihlášku (u stavu *K doplnění* se nenabízí vůbec) | Potvrdit prezenci |
| Odebrat a Nahradit fotku papíru | Zrušit prezenci |
| Odebrat roli, Odebrat vazbu k lodi | Vystavit kód |
| Zrušit regatu | dojezd, přesun pořadí |
| Smazat článek, dokud nemá oddíl smazaných | Zveřejnit a ostatní kroky vpřed |
| Skrýt ročník | Skrýt na webu u neodjeté regaty |
| Skrýt na webu u odjeté regaty a u rozjížďky, která je venku | „Skryté" u článku |
| Vyndat z poháru | |

Už ho mají: zrušení rozjížďky, klíč trackeru, smazání trati, verze směrnice.

**„Pustit výsledky ven" zůstává, kde je — hlasování 3 : 1** (1, 3, 7 proti
dalšímu klepnutí; 9 pro). Ověřil jsem, že úkon už pod „Další úkony" leží
(`vysledky/[zavod]/page.tsx:593–665`), takže druhé klepnutí fakticky má.
Mění se jméno: **„Pustit ven a oznámit do telefonů"** — je to jediný úkon
správy, jehož následek opouští web.

### 7. Role se odebírá rozbalovačem — moderátorské rozhodnutí, ne shoda

**Hlasování 2 : 2** (1 a 9 pro rozbalovač „Opravdu odebrat <role> —
<jméno>"; 3 a 7 pro štítek na jedno klepnutí s „Vrátit roli" v hlášce).
7 a 9 si mezi koly vyměnili strany.

Beru **rozbalovač a k němu „Vrátit roli" v hlášce**. Rozhoduje shoda z bodu
14: pilulka je jen pro štítek, na který se neklepe — a štítek role je
pilulka, na kterou se klepe, s cílem 35 px a mezerou 6 px od sousední role
(`globals.css:6297`). Odebrání navíc nenechává stopu
(`OpravneniSprava.cs:243–261`), takže omyl nikdo nedohledá.

**Mění to bod 15 konzilia z 12. 11.** (štítek role jako ovládací prvek).
Ten bod stál na vadě, která podle poznámky v tamním závěru neexistovala.

### 8. „Stáhnout" znamená jen uložit soubor

**Skrýt na webu** (vratné) · **Sejmout z vývěsky** (zpráva zmizí, záznam
zůstane) · **Smazat soubor** (nevratné). „Schovat ročník" → „Skrýt ročník".
Směrnice dělá obojí: „Sejmout z vývěsky a smazat soubor". **Shoda 5, 7, 9**;
„sejmout" je slovo vývěsky (5: „vyvěšeno dne, sejmuto dne"). Jazykový obor
u stolu neseděl.

## Co se mění — veřejná část

### 9. Úvod má jednu skladbu

Pro 375 × 812, návštěvník:

| # | Co | Jak | Výška |
|---|---|---|---|
| 1 | hlavička | jedna řada | 67 |
| 2 | fotka | na ní **jen stavová věta**, 19,2 px / 700, bílá, nejvýš dva řádky, celá odkazem | 200 |
| 3 | věta pro cizího | 16 px, dva řádky, na čistém pozadí | ~60 |
| 4 | dvě tlačítka | 44 px, plné jen jedno | 60 |
| 5 | pořadí | tři třídy, **stojí** | ~200 |
| 6 | kalendář | popisek a první karta | ~95 |

- **Stavová věta na fotce: hlasování 6 : 0.** Má tři stavy sezóny: „Další:
  Jarní vítr, 15. května" · „Dnes: Radavský pohár, start 10:00" · „Ročník
  2026 vyhráli SEA MOUSE III, PEZI a LUNA" (vítěz jen po třídách — celkové
  pořadí seriál nemá, 5).
- **Velikost 19,2 px je moje rozhodnutí:** 22,4 se nevejde na řádek (338
  v 335 px, změřil 2) a 20 px není na stupnici.
- **Fotka je obraz, ne podklad** (10): vrstva vysoká jen jako pás, závoj jen
  dole pod větou — z fotky je pak vidět 74 % šířky místo dnešních 21 %.
  Poloha výřezu zvlášť pro každý snímek; tentýž výřez slouží `og:image`.
  Monitor unese pás 320 px, je-li nejbližší regata první kartou (1, 3).
- **Tlačítka se jmenují podle cíle a fáze: hlasování 4 : 2** (2, 3, 5, 10
  pro; 7 a 8 pro „Chci závodit" · „Výsledky"). Před regatou „Přihlásit loď"
  · „Vypsání", v den regaty „Výsledky" · „Vypsání", po sezóně „Konečné
  pořadí" · „Kalendář 2027". „Přihlásit loď" jen s otevřenými přihláškami
  (5); tlačítko bez cíle se nevykreslí (3).
- **Pořadí bloků 5 a 6 je moje rozhodnutí** — 3 a 10 chtěli kartu nejbližší
  regaty před pořadím; beru součet, který 2-design změřil (674 px z 688).
- **Vypadne:** podtitul verzálkami, „Vedou…" a „Odjeto N z M" z hrdiny,
  jedoucí řádky pořadí, novinky. Znění věty pro cizího podle 5: „duben až
  září", počty z dat, „přihlásit se může loď, která splní vypsání".

### 10. Pevných zůstane 67 px, v den regaty 124

- **Hlavička návštěvníka na jeden řádek**, „Přihlásit" i přepínač vzhledu
  v nabídce. Shoda 1, 7, 8, 10.
- **Pruh počasí lepí jen v den regaty** — shoda. **Výstraha mimo den regaty
  ho nelepí: hlasování 4 : 0**; 27. 11. svítí „sněhové jevy" a pruh by lepil
  celou zimu.
- **V den regaty lepí na všech veřejných stránkách — moderátorské
  rozhodnutí, hlasování 2 : 2** (7 a 10 pro všude; 1 a 8 jen pro úvod
  a veřejnou regatu; 1 a 7 si vyměnili strany). Beru „všude": je to jedno
  pravidlo místo dvou a pruh, který během dne mizí a vrací se podle stránky,
  vypadá jako chyba. Cena je změřená (1): nápověda má s pruhem 18,7 tahu
  místo 15,8 — osm dní v roce.
- **Partneři podle toho, co je jim slíbeno** (viz otázky níž). Repozitář
  zná slib jen jako „veřejnost je vidí dál" (`SCENARE-OVLADANI.md:702–706`),
  takže výchozí je: na telefonu nepřipínat, na konci úvodu stojící blok osmi
  log se jmény. Dlaždice partnerů v tmavém vzhledu `#e8e6e1` místo bílé.

### 11. Na obrazovce se hýbe nejvýš jedna věc

Na úvodu dnes běží **šest nekonečných animací naráz** (fotka, tři pásy
pořadí, počasí, partneři) a na dotyku nejdou zastavit — pauza je jen na
`:hover` (7; WCAG 2.2.2). Hýbe se fotka; pořadí, počasí i partneři stojí.
Nikdo nenamítl.

### 12. Tabule na malé obrazovce je rozcestník s vývěskou

- **Práh:** `(max-width: 999px), (max-height: 561px)`, tedy písmo tabule pod
  10 px. 2 a 3 k němu došli nezávisle; kryje i telefon naležato. Moje
  rozhodnutí, bez výhrad.
- **Pod prahem** adresa tabule vykreslí rozcestník: **„Vydáno k regatě"
  jako seznam** (data tabule čte už dnes, `tabule/page.tsx:41`) a odkazy
  Výsledky a Startovní listina. **Hlasování 3 : 1** (2, 3, 5; 7 chtěl větu
  vést na Výsledky).
- Věta při běžící rozjížďce pod prahem vede na rozcestník a **neříká „na
  tabuli"**. A ukáže se jen v den regaty — `jedeSeDnes` už existuje
  (`upozorneni.tsx:76`), dnes věta visí jen na stavu rozjížďky a na
  ukázkových datech tvrdí v listopadu, že se jede.

### 13. Kód ve výsledcích stojí pod číslem

Číslo nahoře, **kód pod ním týmž písmem 14,4 px**; DNC tlumeně, kódy, které
jsou rozhodnutí (DSQ, DNF, OCS, RDG), v barvě textu. **Škrt jen závorkou
kolem čísla, přeškrtnutí pryč — hlasování 2 : 0.**

Rozhodlo měření 2-designu: kód vedle čísla přidá tabulce 135 px, pod číslem
17 px. Tabulka pořadí se na telefon nevejde dnes ani potom (664 v 333 px).
5-jachting potvrdil, že „(2)" nad „DNC" čte jako listinu. Věty „přeškrtnuté
číslo" pod pořadím, pod výsledky a v pravidlech se musí přepsat.

## Co se mění — vzhled

### 14. Modrá znamená „dá se klepnout"

`--voda` jen pro odkazy a tlačítka; **hotový stav** (odjeto, potvrzeno,
přijato) v barvě textu s plným okrajem. Barva znaku `#0c4a8c` na tlačítko
nejde — **rozhodlo měření** (2 i 10 shodně): v tmavém vzhledu má 1,87–2,03.
`--znacka` jen na to, na co se neklepe: linka úvodu místo osiřelé červené
a `h1` veřejných stránek. Jachting pro modrou u „odjeto" žádnou konvenci
nemá (5).

### 15. Tokeny: pět velikostí písma, tři poloměry, jedna pilulka

- **Písmo 12,8 · 14,4 · 16 · 19,2 · 28 px a nic mezi tím** — moderátorské
  rozhodnutí, 2 a 10 si vyměnili návrhy; bez výhrad. Dnes je mimo tabuli 34
  různých velikostí. Popisek a metadata 12,8; údaj, podle kterého se
  rozhoduje, nejmíň 14,4 v barvě textu; u vody (cíl, zápis) nejmíň 16.
  Těch 16 je výpočet zorného úhlu, ne měření (1) — potvrdí zkouška venku.
- **Poloměry 4 · 10 · 999 px.** Pilulka (999) **jen pro štítek, na který se
  neklepe**; úkon je obrysové tlačítko r 10 a plné je na obrazovce jedno.
- **Nadpis okna na dva řádky:** kontext drobně a tlumeně, agenda 19,2 / 700
  v barvě textu, barva úkonu na levé hraně. Ruší vadu A1 (nadpis 396 px
  v 335) i kontrast pod 4,5 u 8 z 12 nadpisů.

Shoda 2 a 10.

## Jméno — doporučení, rozhodnutí je Filipovo a Milošovo

**Jedno jméno všude: shoda všech.** Které, hlasovalo všech osm:
**„Orlický pohár" 6 : 2** (1, 2, 3, 7, 9, 10 proti 5 a 8).

- **Pro „Orlický pohár":** nese ho adresa, titulek, appka a vypsání 2026
  složené aplikací — nosiče, které se nedají vzít zpět.
- **Pro „Orlickou sérii"** (5, 8): tak se jmenují tři dokumenty rozhodčího
  (`PLAN.md:6161`, `:6300`, `:6428`); tři z osmi regat mají „pohár" v názvu,
  takže „Orlický pohár" se v kalendáři čte jako devátá regata; a se znakem
  „Orlik Yacht Series" je to totéž jméno ve dvou jazycích.

Ať vyhraje kterékoliv: nápis u znaku plnou výplní, ne šrafou (2), a **totéž
jméno musí nést i papíry rozhodčího** — jedno jméno na webu a druhé na
termínové listině je horší než dnešek, protože vypadá jako rozhodnuté (8).

> **Filip, 27. 11. 2026: jméno zatím zůstává, jak je** — Miloš tomu říká
> oběma názvy, doladí se to. Nic se tedy nepřejmenovává a nápis u znaku se
> nekreslí znovu. Podmínka 6 z pořadí stavby tím zůstává otevřená: co nese
> jméno natrvalo ven (`og:site_name`, věta pro cizího), počká, nebo vezme
> to, co dnes stojí v titulku.

## Opravy, o kterých se nikdo nepřel

Vady A1–A3 a cíle pod 44 px z auditu se opraví tak jako tak (rámec 8).
K nim, bez námitky kteréhokoliv oboru:

- **Úvod a čísla:** zrušená regata se nepočítá do „z osmi" (3, 5, 7) ·
  úvod zná stav „po sezóně".
- **Přihlášení a chyby:** vypršelé sezení vrací tam, kde člověk byl — 35
  odkazů a tři přesměrování bez `kam`, cíl při 401 marně opakuje (3) ·
  jedna podoba odmítnutí a chyby (`error.tsx` říká „Výsledky se nedaří
  načíst" pro cokoliv) · formulář po odmítnutí vrátí vyplněné hodnoty
  a skočí na místo (kalendář, veřejná přihláška; 3, 7).
- **Sliby:** veřejná přihláška se pořadateli ukáže v „Co teď" (dnes slibuje
  „pořadatel ji uvidí" a nic mu ji neukáže) · „Co teď" si neprotiřečí · nad
  cizí regatou věta „Tady jen čteš".
- **Kontrast:** odkaz v textu podtržený (dnes 1,03 : 1 proti okolí) ·
  hranice pole 3 : 1, nový token · `.tlacitko` s písmem `--papir` (dnes
  2,35 v tmavém) · slovo stupně výstrahy v barvě textu · `button` dědí písmo.
- **Navenek:** `noindex` ukázkového ročníku **a teprve potom** `openGraph` ·
  náhled sdílených výsledků nese „předběžné / konečné" · kontakt na seriál
  a tři odstavce „O seriálu" · stránka appky nabízí, místo aby se omlouvala
  · převzatá novinka bez zástupné plochy 159 px a o stupeň tišší.
- **Jachting:** jedna tabulka kódů a s ní tři věcné chyby pravidel ročníku
  (DNC do poháru bez „+ 1", RDG určuje komise, ZFP ven) · „předběžné /
  konečné" nad výsledky · číslo plachty nebo poznávací znak na listině ·
  veřejné vypsání jen vyplněné oddíly.
- **Správa:** „Co je vidět" nad „Závodní den" · „Nová regata" a úprava
  termínu mají tři pole, pravidla regaty vlastní rozbalení (7) · položka
  nabídky nemizí na stránce, na které stojíš · posádka v Mých lodích má
  odkaz na loď · oddíl „Smazané" u článků.
- **Dlouhé stránky:** osobní údaje na telefonu jako seznam, ne tabulka
  1416 px · nápověda s odkazy podle role.
- **Okem** (10): rozsypaný sloupec Novinky na 1280 px (`boky.tsx`) ·
  uříznutý štítek „potvrzená" · vodoznak jen od 1180 px.

## V jakém pořadí — podmínky oborů

> **Stav stavby k 27. 11. 2026.** Krok 1 je hotový: `DEN_REGATY=1
> python3 tools/fake-api.py` přidá *Zkušební regatu* s dnešním datem (tři
> lodě čekají na prezenci, druhá rozjížďka je nepodepsaná, třetí se jede).
> Krok 2 je hotový **zčásti**: tokeny písma a poloměrů jsou v `globals.css`,
> 175 velikostí písma a 118 poloměrů je na ně převedených a
> `tools/kontrola-tokenu.py` hlídá stupnici i páry s barvou zapsanou
> natvrdo. **Zbývá:** 56 velikostí písma, které se převodem pohnou o víc
> než pixel (jdou po obrazovkách), a pravidlo „stav nikdy modrý".
>
> Krok 3 je hotový **na serveru**: `Kalendar.ProcNejde` odmítne Odjetá →
> Vypsaná, dokud se z regaty počítá do poháru aspoň jedna rozjížďka
> (`KalendarSprava.VPoharuAsync` — tatáž podmínka jako dotaz na pořadí).
> Krok se pak nenabízí a kalendář místo něj nese sbalené „Vrátit mezi
> vypsané nejde" s větou ze serveru (`procNejdeZpet`). **Automat** si po
> vrácení měří dva dny znovu, od vrácení (`Zavod.VracenoMeziVypsaneV`) —
> ne „už nikdy sama", protože vrácená a zapomenutá regata by se do poháru
> tiše nepočítala. **Zbývá** obrazovka: oddíl „Stav regaty" v patě okna
> (bod 2) a karta kalendáře (bod 1).

1. **Mock dostane regatu ve stavu „den regaty"** — nepotvrzenou loď,
   otevřenou rozjížďku, cíl v běhu. Bez ní se řádek přihlášky a cíl staví
   naslepo (1).
2. **Tokeny před obrazovkami** (2, 10): stupnice, poloměry a pravidlo modré
   do `globals.css` a `tools/kontrola-tokenu.py` hlídá páry písmo–podklad
   v obou vzhledech. Jinak každá oprava přidá další hodnotu.
3. **Server před obrazovkou** (3, 9): nejdřív pravidlo z bodu 3, pak
   přestavba kalendáře.
4. **Druhé klepnutí v téže změně jako obecné pravidlo 44 px** (9), a celé
   naráz (7). Opačné pořadí udělá z mazacích tlačítek nejsnáz trefitelné
   cíle. Pravidlo 44 px dostane kontrolu v CI jako appka (1).
5. **Zápis rozjížďky se zvětšuje až po bodu 5** (5) — jinak naroste 21
   řádků, které tam být nemají.
6. **Jméno před `openGraph`, nápisem a větou pro cizího** (8, 10).
7. **Text na fotce má změřený kontrast v obou vzhledech** dřív, než se
   úvod sloučí (2): závoj pod větou aspoň 50 % černé.
8. **„Přihlásit loď" na úvodu až poté, co se přihláška ukáže pořadateli**
   (8).

## Mimo revizi — do plánu

Chtějí nový model nebo API, proto jsem je z kol vyřadil: záznam „kdo to
udělal" u stavu a publikace regaty, ročníku a oprávnění · verze fotek
papíru místo přepisu (držet do vyhlášení ročníku, 5) · mazání přihlášky
v jedné transakci · zpráva do telefonů „výsledky staženy k opravě" ·
rozprava v modelu a na stránce regaty · náhradní termín regaty a automat,
který ji zavírá.

## Co čeká na Filipa

1. ~~Které jméno platí?~~ **Zodpovězeno 27. 11.:** zatím zůstává, jak je;
   doladí se s Milošem.
2. ~~Co je slíbeno partnerům?~~ **Zodpovězeno 27. 11.:** zatím nic, pás je
   návrh. Platí tedy výchozí z bodu 10: na telefonu se nepřipíná a na konci
   úvodu stojí blok log.
3. **Bod 7 přepisuje bod 15 z konzilia 12. 11.** Filip 27. 11.: „nevím,
   přibliž mi to" — **čeká na rozhodnutí.**
4. ~~Je souhlas s pravidly podmínkou startu?~~ **Zodpovězeno 27. 11.:** ano,
   ale větou „účastí závodník souhlasí", ne brankou. **Zbývá dořešit:** kde
   ta věta stojí (návrh: ve vypsání regaty a u veřejné přihlášky) a jestli
   výčet „Bez souhlasu: N z M" na přihláškách zmizí celý — s touhle větou
   už neříká nic, co by rozhodčí potřeboval.
5. **Pouštějí se výsledky ven nepodepsané?** Pokud ano, je řádek
   „předběžné" první v řadě oprav.
6. **Mají všechny lodě číslo na plachtě?** Jinak listina nese poznávací znak.
7. **Kdy jde web ven s ostrými daty a pod jakou adresou?** (8)
8. **Za jak dlouho umíš ze zálohy vrátit jednu smazanou přihlášku?** (9)
9. **Zapisuje proxy adresy správy i s dotazem do logu?** Připojovací kód
   k lodi se nese v adrese (9).
10. **Kdo kromě tebe letos správu použil a kvůli čemu ti volal?** (7)

## Co čeká na Miloše

1. **Jméno** — viz výš; jeho dokumenty říkají „Orlická série".
2. **Prezence:** u stolu před rozpravou, nebo i na molu? 5-jachting soudí
   podle zvyku klubových regat, neověřeno.

## Co se při stavbě zapomene první

- **1-ergonomie:** **cíl** — dojetá dlaždice zůstane stát na místě, opravy
  44 px s rozestupem 8 px, *✕* mimo řadu; a na dlaždici **poznávací znak**
  nejmíň 16 px (ne číslo plachty, jak sám navrhl v kole 2).
- **2-design:** **kontrola párů písmo–podklad v obou vzhledech** — z vad
  kontrastu byla jedna jen v tmavém a jedna jen ve světlém, nikdo je
  neviděl naráz.
- **3-ux:** **návrat po přihlášení je 35 odkazů**, ne pět bran; a tři
  nálezy bez vlastního bodu — podoba chyby, vyprázdněný kontakt po chybě
  přihlášky, posádka bez odkazu na loď.
- **5-jachting:** s tabulkou kódů **tři věcné chyby pravidel ročníku**;
  a oznámení komise musí mít na telefonu **cestu**, ne jen adresu.
- **7-psycholog:** **formulář po odmítnutí vrátí, co člověk napsal**; a kde
  obrazovka jen čte nebo nic nechce, řekne to větou — ticho si dobrovolník
  vyloží jako vlastní chybu.
- **8-pr:** **kontakt na seriál a stránka appky** — nejsou v žádném sporu,
  a proto hrozí nepostavit.
- **9-rizika:** **automat, který zavírá regaty**, přepíše každý povolený
  krok zpět — ať se pravidlo postaví jakkoliv, musí s ním počítat.
- **10-grafik:** **poloha výřezu zvlášť pro každou fotku** a čtyři vady
  viditelné jen okem.

## Zapsané nesouhlasy

- **7 a 9 k bodu 2:** chtěli vlastní stránku „Termín a stav" — patu šesti
  agend pod tlakem nikdo nenajde (7) a tentýž blok ponese i zápis u vody
  (9). Přijata pata, 3 : 2.
- **1 a 7 k bodu 3:** kdo za pohár ručí, má mít na chybné uzavření nástroj,
  jinak si najde okliku. Přijato odmítnutí všem, 3 : 2; oba svůj hlas
  podmínili tím, že vrácení nepřepíše automat.
- **3 a 7 k bodu 7:** vrácení role na místě chrání líp než otázka předem,
  protože se neodklepává. Rozhodl moderátor při rovnosti.
- **1 a 8 k bodu 10:** v den regaty se na telefonu čte vypsání a směrnice
  a pruh tam jen ubírá. Rozhodl moderátor při rovnosti.
- **9 k bodu 6:** „Pustit ven" je jediný následek, který nejde vzít zpět
  ničím. Přijato 3 : 1 bez dalšího klepnutí; úkon ale za rozbalovačem leží.
- **7 a 8 k bodu 9:** „Vypsání" je slovo zasvěcených a jméno tlačítka, které
  se třikrát do roka změní, se nedá napsat na plakát. Přijato 4 : 2.
- **7 k bodu 12:** rozcestník bez vyvěšené zprávy je klepnutí naprázdno.
  Přijato 3 : 1; rozcestník proto nese i odkazy na výsledky a listinu.
- **5 a 8 k jménu:** viz výš.

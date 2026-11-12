# Ergonomie ovládání — kolo 2

Spory D a F jsem přepočítal proti `web/app/globals.css`, ne proti maketám: **moje
i designové číslo o telefonu byly optimistické**. Na rozhodnutí to nic nemění,
na podmínku ano.

## Kde ustupuju

- **A — ustupuji 3-ux.** Jeho řešení léčí příčinu (`coTeď` zná tři věci z osmi
  regat), moje ji obchází. Můj vzor `kamNaRegate` navíc nedrží tak, jak jsem
  tvrdil: ta stránka **vlastní obsah nemá** (*„Stránka regaty sama nenese obsah"*,
  `co-smim.ts:293`), takže se volí jen cíl přesměrování; *Co teď* obsah má.
  Měnit výchozí tab podle stavu by rozhoušelo i můj vlastní nález 2 (drobeček
  do tabu *Regaty*) — pokaždé jiné přistání, pokaždé jiná cesta zpět.
  **Dvě podmínky**: dopočítaná položka je **odkaz na práci**, ne oznámení (jinak
  návrh krok přidá), a komu *Co teď* nenaplní nikdy nic, tab se nekreslí.
- **B — ustupuji 2-designu.** Barva nevybrané dlaždice nemůže být vodítkem,
  když má soustava dvě kolize na hex (ΔE = 0) a při deuteranopii ΔE′ 1,9–3,4;
  na slunci na vodě to platí dvojnásob. Vodítkem je **poloha**, a ta je
  spolehlivější, protože pořadí drží pole `vse` v `polozkyRocniku`
  (`co-smim.ts:184`). **Podmínka:** filtrace podle práv nesmí pořadí přeskládat —
  dlaždice, které člověk má, si musí držet **vzájemné pořadí**, jinak nemá
  svalová paměť na čem stát a odebráním barvy nezbyde nic.
- **C — ustupuji 4-jazykovi v umístění *Otázek*.** Jeho patro (Správa webu) je
  lepší než moje nabídka pod účtem: pruh je viditelný seznam, nabídka šuplík.
  Číslo pruhu ročníku je tím **7**.
- **D — ustupuji 4-jazykovi na plných jménech** všude, kde je dlaždice širší než
  10,75 rem. Argument šířky patří jen telefonu, a tam se neřeší jménem (viz níž).
- **F — ustupuji 2-designu v tom, že pruh na telefonu smí stát 145 px**, a návrh
  „čtyři dlaždice + *Víc*" stahuju: nic se neschová, odpověď na „co můžu
  spravovat" zůstane celá (tím je zodpovězená i otázka na 3-ux) a spor
  s rozhodnutím z 29. 10. o akordeonu mizí. Těch 145 px ale není zdarma.

## Kde držím

### F, D — práh 7,25 rem je ten pravý pák, a obě čísla jsou o řádek vedle

- **Nález.** `.obal` má `padding: 0 1.25rem` (`globals.css:287`) a žádnou
  telefonní výjimku, takže na 390 px zbývá **350 px**. Počet sloupců u `auto-fit`
  je `floor((místo + mezera) / (práh + mezera))`; s prahem 7,25 rem
  (`globals.css:1995`) a mezerou 0,4 rem to je `(350 + 6,4) / 122,4 = 2,91` →
  **dva sloupce**. Osm dlaždic jsou tedy **čtyři řádky**, při 44 px
  `4 × 44 + 3 × 6,4 = 195 px`. Tři sloupce v maketě dělá její vlastní odsazení
  0,9 rem (361 px), ne aplikace.
- **Proč to vadí.** 195 px na 390×844 je **23 % displeje navigací**, než začne
  obsah — a to je ta obrazovka, na které se pracuje u vody jednou rukou.
- **Návrh.** Práh **7 rem** místo 7,25: `(350 + 6,4) / 118,4 = 3,01` → tři
  sloupce, sedm dlaždic do **tří řádků = 145 px**, tedy přesně číslo, na kterém
  se s 2-designem shodneme. **Pruh dnes míjí tři sloupce o 3,6 px.** Spočítáno,
  ne změřeno na stránce — ověřit na 390 i 393 px (iPhone 15 má 353 px místa,
  `359,4 / 118,4 = 3,04`, pořád tři).
- **Pro 2-design:** váš `minmax(7.25rem, max-content)` + `justify-content: start`
  **držím a podporuju** — na 1280 px dělá přesně to, co tvrdíte. Na telefonu
  nedělá nic, protože tam váže práh, ne jméno. Je to dvě poloviny jedné opravy.

### D — na telefonu není zkrácené jméno na výběr

- **Nález.** Při třech sloupcích má dlaždice ~112 px = 7 rem, tedy **pod
  stávajícím `@container (max-width: 10.75rem)`** (`globals.css:2040` a dál),
  kde si CSS samo bere `nazevKratky`. A `.nazev` má `white-space: nowrap`
  (`globals.css:2026`), takže položka **bez** krátké podoby na telefonu
  z rámečku vyteče — komentář u toho pravidla to říká sám.
- **Co to znamená pro 4-jazyka.** *Lodě a kapitáni* a *Otázky k aplikaci* mohou
  zůstat celé v pruhu i v nadpisu, ale krátkou podobu pro šířky pod 172 px mít
  **musí**. Není to druhé jméno, je to to, co se vejde — stejný vzorec, jaký
  veřejná regata používá na *P. směrnice*. Rozhodnutí z 29. 10. tím není
  porušené; porušilo by ho jméno vyteklé z dlaždice.

### C — Pořadatelé do pruhu nepatří (odpověď 5-jachtingovi)

`/poradatele` je evidence s medailonky, otevřená několikrát za sezónu; pruh je
odpověď na „co spravuju **teď**". Devátý tab by na telefonu přidal řádek a není
co vyměnit — *Otázky* jsou už venku. **Návrh:** odkaz z řádku *Kalendáře*, kde
pořadatel u regaty stejně stojí (`Regaty.dc.html:87`).

### 3-ux nález 3 — jinak, a mám k tomu čísla

Pořadatel jedné zastávky, od nabídky účtu k práci: **dnes 2 klepnutí**
(rozcestník → řádek, `kamNaRegate` dojde na úkon sám), **s přesměrováním 1**,
**s oknem a neprázdným *Co teď* 2**. Přesměrování ale platí jinde: vypsat svou
regatu jde **jen z Kalendáře ročníku** (`co-smim.ts:198–206`) a okno regaty ten
úkon nemá — z 2 klepnutí se tím stanou 3, a vypsání je jeho hlavní předsezónní
práce (scénáře C). **Jedno klepnutí v den regaty proti jednomu navíc po celou
sezónu: okno držím.** Padá to, až okno regaty vypsání samo ponese (R1, R8).

### J — zalomení nadpisu mi nevadí, `nowrap` ano

Kde stojím, nese vybraná dlaždice a drobeček; nadpis je potvrzení, ne navigace.
Zalomený nadpis stojí řádek, nezalomený stojí **vodorovné posouvání** pod ~560 px
(číslo 2-designu), a to jednou rukou na vodě nejde. Zalomit.

## Kde jsme se shodli

- **44 px dotykový cíl** na telefonu (1 + 2).
- ***Co teď* zůstává a je první tab** (všech pět).
- ***Co teď* a *Regaty* jsou dva taby**, ne jeden slepenec (1 + 3 + 5).
- ***Co teď* nesmí být prázdné**, výchozí tab se nemění (1 ustupuje 3).
- **Barvu nese jen vybraná dlaždice** (1 ustupuje 2), při zachovaném pořadí.
- **Plná jména od 10,75 rem výš**, krátká podoba jen jako záchrana šířky (1 + 4).
- ***Otázky k aplikaci* z pruhu ročníku ven, pruh má sedm tabů** (1 + 4).

## Nové, co vylezlo z cizích posudků

**Drobeček má v maketách tři různé hloubky.** `Main.dc.html:51–55`
a `Regaty.dc.html:58–62` končí ročníkem — vybraný tab v drobečku vůbec není;
`Kalendar.dc.html` končí *» Kalendář*, `Clanky.dc.html` *» Obecné články*.
Pravidlo „jeden pruh naráz" přitom z drobečku dělá **jediného nositele
nadřazených pater**, takže jeho hloubka musí být jedno pravidlo, jinak se při
každém přepnutí čte, kde to končí. **Návrh:** drobeček končí vždy patrem, nikdy
tabem — tab už nesou dlaždice i nadpis. 4-jazyk řešil jeho znění, ne hloubku.

## Podmínka

1. **Práh 7 rem a 44 px, ověřené na živé stránce na 390 px.** Bez toho je pruh
   na telefonu čtyři řádky a 195 px, tedy skoro čtvrtina displeje navigací
   na obrazovce, kde se pracuje jednou rukou. Telefonní podoba se bez téhle
   kontroly stavět nemá.
2. **Každá položka v *Co teď* je odkaz na práci.** Dopočítaná věta „Jarní vítr,
   15. 5.: vypsat závod", která nikam nevede, je vývěska — a pak si člověk
   cestu hledá v dalším tabu, čímž se krok z postřehu 3 nešetří, ale přidává.

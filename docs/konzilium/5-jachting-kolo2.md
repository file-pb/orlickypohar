# Jachting a ČSJ — kolo 2

## Kde ustupuju

**B (barva nevybraných) — 2-designu.** Z jachtingu námitka neplyne: závodní
signalizaci nese vlajka a zvuk, ne obrazovka. Kolizi `#a18a4a` ale řešte ve
prospěch **Směrnice** — jediný dokument, jehož verze se nepřepisují, protože
aplikace je vývěska. U vody rozhoduje velikost cíle, ne odstín.

**C (Pořadatelé) — devátou dlaždici neberu.** Pořadatel je záznam
s medailonkem, zakládá se spolu s regatou, práce raz za rok. Patří do
**Kalendáře**, kde regata vzniká.

**I (počty po kategoriích) — ustupuju z místa, ne z věci.** Adresát má na
řádku přednost před čísly; počty po kategoriích do okna regaty, ale na
**jedno** klepnutí: visí na nich body za kódy (A5.2) i za neúčast
(`Bodovani.PrihlasenaDoZavodu`) a ráno se podle nich rozhoduje, jestli se
v kategorii jede.

## Kde držím

**A (prázdné *Co teď*) — s 3-uxem, dopočítávat. Odpověď na jeho otázku: ano,
jde to odvodit z dokumentů a není to výmysl.** Před prvním startem musí
existovat řada, kterou dávají pravidla: **vypsání závodu** (ZPJ 25.1 —
dostupné dřív, než se loď přihlásí; R1, R8), **plachetní směrnice** (ZPJ 25.1,
R22), **předpokládaná trať** (*„bez přijaté trati se nestartuje"*, R28)
a **startovní listina** (potvrzené lodě, R10). *Co teď* u plánované zastávky
vydá **první chybějící položku té řady**: „Jarní vítr, 15. 5. — vypsání závodu
není vyvěšené". Povinnost s pořadím, ne připomínka, a záznam o každé je.

**Dvě hranice, bez kterých by to výmysl byl.** Řádek jmenuje **chybějící
dokument**, nikdy vymyšlený úkol; a **lhůtu aplikace nestanoví** — R27 je ten
případ (aplikace chce čas vyzývacího znamení, který žádný skutečný dokument
neuvádí). Tedy „není vyvěšené", ne „vyvěsit do pátku". Proti 1-ergonomii:
s touhle řadou prázdné nebude a cesta vede přímo na chybějící dokument —
o krok **méně** než přes *Regaty*.

**C (Pravidla ročníku veřejně) — držím, a dám cenu.** ZPJ 25.1 žádá podmínky
dostupné dřív, než se loď přihlásí, a R24 říká, že pravidlo, podle kterého loď
patří do kategorie, je **ve vypsání a nikde jinde**. U regaty to R10 má jako
první položku; u ročníku ekvivalent chybí a ročníkové hodnoty (škrty, DSQ 20,
bonus) `/pravidla` mimo okno neunese. **Cena:** *Novinky* z pruhu ven, do
*Úvodu* jako tři poslední s odkazem — pruh zůstane pětičlenný: *Úvod ·
Kalendář · Pravidla ročníku · Průběžné pořadí · Lodě ročníku*. Jinak je
minimum oddíl *Jak se boduje* v *Úvodu* nad ohybem, ne stránka webu.

**E (*Rozjížďky* ve správě) — s 4-jazykem.** Rozhodčí mluví o rozjížďkách
a podepisuje je po sadách; stav se vede na rozjížďce, ne na výsledku (PLAN
*Workflow výsledků*), a „pustit ven" je publikace té rozjížďky, ne jiná
agenda. Asymetrii venku/ve správě projekt přijal vědomě už u *Závodní trať* /
*Bóje na trati* (R10). 2-designu: sdílená barva pak tvrdí „tady se dělá
totéž", a to neplatí — venku je listina, ve správě sada k podpisu.

## Kde jsme se shodli

- **H není spor** — tabulka pořadí je věcně špatně, zapsat jako opravu;
  kódy rozjížděk do seriálové tabulky nepatří (nikdo neoponoval).
- **44 px dotykový cíl** (1-ergonomie × 2-design) — podporuju: u vody se
  pracuje jednou rukou a vedlejší klepnutí je načtení stránky (`DEN-ZAVODU.md`).

## H — tabulka průběžného pořadí, jak má vypadat

**Jedna tabulka na kategorii.** Pilulka má tolik položek, kolik má ročník
kategorií — tři dnes, **čtyři od 2027** (R29). Žádné „Celkem": do poháru se
boduje vždy po kategoriích (PLAN), takže pořadí napříč kategoriemi seriál
nezná a vyhlásit by se podle něj nedalo.

**Sloupce, v tomhle pořadí:**

| sloupec | obsah |
|---|---|
| `#` | pořadí v kategorii po škrtech |
| `Loď` | jméno; kapitán v podřádku (na telefonu) nebo vlastním sloupci |
| `Znak` | poznávací znak samostatně (`S7`, `CZE 142`), zarovnaný na číslice |
| zastávka ×N | krátký název + datum v hlavičce; **seriálová stupnice, vítěz 0**; místo čísla `DNC` nebo `DSQ 20`; bonus 24hodinovky jako `−1`; škrtnutá hodnota přeškrtnutá a **vyňatá ze součtu** |
| `Škrty` | jen až se škrtá: součet vyňatých hodnot |
| `Celkem` | součet po škrtech, tučně |

**Hlavička listiny**, jeden řádek nad tabulkou (znění 4-jazyku):

> Orlický pohár 2027 · do 7 m · průběžné pořadí po 2 z 8 regat · nízkobodový
> systém, vítěz zastávky 0 bodů · k 15. 5. 2027

**Jméno rozhodčího až s Milošovým souhlasem.** Bez něj listina autora nemá,
a pak se **musí** říct, co to je: *„průběžné pořadí, neoficiální, k 15. 5.
2027"*. Tabulka bez autora vydávaná za listinu je slib naprázdno.

**Shoda.** U shodného součtu značka `*` a pod tabulkou věta: *„Shoda 7 b:
Charlotte III výš — jedno první místo, JOY žádné."* Pravidlo je Milošovo:
1. počet prvních, druhých, … míst; 2. lepší umístění v poslední regatě, kterou
obě lodě dokončily na bodovaném místě a která se ani jedné neškrtá. Bez té
věty nikdo nepozná, proč je jedna loď výš — a to je první dotaz po vyhlášení.

**Škrty, dokud Miloš neodpoví.** 2027 má osm zastávek, pravidlo zní *„od
devíti odjetých – 2 škrtačky"*. Do odpovědi **škrt nekreslit vůbec** a sčítat
všechny zastávky: neškrtnutý součet je pravda o odjetém, chybně škrtnutý je
nepravda.

## I — řádek regaty, jeden tvar

**Údaj podle fáze, ne všechny naráz** — tím se řádek nerozpadne a 3-uxův
adresát se vejde:

```
15 kvě | Jarní vítr · Marina Orlík | čeká na tvůj podpis | 2 rozjížďky venku
26 čvn | 24hodinovka · Stingray    | čeká na pořadatele  | 14 přihlášek, 11 na listině
```

- **Adresát vždy**, podle téhož filtru práv jako `coTeď` (3-ux, nález 7).
- **Jmenovatel nikdy**, dokud rozhodčí počet rozjížděk neuzavře: na čtyřech
  odjetých visí škrt v závodě a počet se rozhoduje na vodě podle větru (PLAN).
- **Před regatou přihlášky a listina**, po regatě odjeté rozjížďky; R10 ta dvě
  čísla odděluje — přihláška je proces, listina je kdo startuje.
- **Štítek „vypsáno" zrušit**, místo něj tři značky *vypsání · směrnice ·
  trať*: po R1 má to slovo dva významy a pořadatel potřebuje ten dokumentový.

## Nové, co vylezlo z cizích posudků

**3-ux, nález 6 (vstup do správy z veřejné stránky) — podporuju z jiného
důvodu:** rozhodčí se na veřejnou stránku dívá, aby viděl, **co vidí
závodník**. To je dohled nad vývěskou, ne pohodlí.

## Podmínka

1. **Tabulku pořadí nepublikovat na závodové stupnici ani se škrtem, který je
   v součtu.** Dokud Miloš neřekne, od kolika odjetých zastávek se v ročníku
   škrtá, škrty nekreslit a tabulku označit za průběžnou a neoficiální.
2. **V ročníku nesmí vzniknout pořadí napříč kategoriemi.** Pravidla seriálu
   takové pořadí neznají; kdyby se zobrazilo, někdo podle něj vyhlásí.

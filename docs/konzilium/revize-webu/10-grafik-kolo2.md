# 10-grafik — kolo 2

## Kde ustupuju

- **F, tlačítko — 2-designu.** Čísla to rozhodla za mě:

  | `#0c4a8c` | světlý | tmavý |
  |---|---|---|
  | `h1` na `--pozadi` | 8,48 | **2,03** |
  | `h1` na `--papir` | 8,85 | **1,87** |
  | výplň tlačítka pod písmem `--papir` | 8,85 | **1,87** |

  V tmavém neprojde nikde. Jeho tmavý pár `#d6e6f5` (`globals.css:453`)
  projde (14,13 / 13,02 / 13,02), jenže od `--text` ho dělí **1,06 : 1** —
  v tmavém vzhledu značka barvu nemá, jen jas. Tlačítko musí znamenat totéž
  v obou vzhledech; to umí `--voda` (5,67 / 7,06 s písmem `--papir`).
  Tlačítko tedy zůstává `--voda` a platí pravidlo 2: modrá = dá se klepnout.
- **G, písmo — 2-designu.** Beru jeho pět kroků 12,8 · 14,4 · 16 · 19,2 · 28.
  Moje 12 a 13 px jsou přesně ten rozdíl 0,8 px, který jsem v kole 1 kritizoval,
  a jeho kroky už v CSS jsou (0,8 · 0,9 · 1 · 1,2 · 1,75 rem). Verzálkový
  popisek: 12,8 px / 600 / 0,07 em.
- **G, nadpis okna — 2-designu.** Dva řádky (kontext 12,8 px tlumeně, agenda
  19,2 / 700 v `--text`, barva úkonu na hraně) řeší A1, kontrast i můj nález
  o barvě nadpisu, která se mění po obrazovkách. Lano za nadpisem zůstane
  tam, kde na řádku zbude místo; barvu nese hrana, ne lano.
- **D, partneři na telefonu — 8-pr, podmíněně.** Je-li slíbena *přítomnost*:
  pás se na telefonu nepřipíná a na konci úvodu stojí mřížka osmi log se
  jmény. Je-li slíbena *trvalá viditelnost*: pás zůstane (64 px).
- **Oprava vlastního čísla z kola 1.** „85 % fotky" platí jen pro vrstvu
  přesně v pásu. `.hero-fotky` začíná 32 px pod hlavičkou (y = 78, hlavička
  končí na 110), takže po návrhu je vidět **74 % šířky a 86 % výšky** snímku.
  Dnešních 21 % šířky a 34 px bez závoje platí.

## Kde držím

- **C — fotka je obraz; text na ní smí mít dva řádky.** Měřeno na živém
  úvodu (návštěvník, 375 × 812, oba vzhledy); návrh simulován stylem vloženým
  jen do mého prohlížeče. Dnes: pod pevnými pruhy zbývá **581 px**; text leží
  na y 196–310, tedy na **114 z 200 px** pásu, a první odkaz na regatu má
  návštěvník na **608 px** (audit měřil správce, 543). Návrh: vrstva vysoká
  `--hero + 2rem`, závoj od 62 % výšky → **112 px čisté fotky**, dole 62 px se
  závojem a v nich **dva řádky 19,2 px / 700** (24 px na řádek + 14 px okraj).
  Motiv (náklon, loď pod zámkem, spinakr) je vidět na všech třech snímcích
  v obou vzhledech a popisek pod pásem se ve světlém čte. Každý další řádek
  stojí 24 px; věta pro nováčka s dvěma tlačítky by dala 118 px — dnešní stav.
  Šířky v 335 px: „Další: Jarní vítr, 15. května" 238 px (1 řádek), „Dnes:
  Radavský pohár, start 10:00" 313 px (1 řádek; při 22,4 px už 2), „Ročník
  2026 vyhráli SEA MOUSE III, PEZI a LUNA" 441 px (2 řádky). Proto 19,2 a ne
  1,4 rem — a 1,4 rem navíc není na stupnici 2-designu.
  **Seznam pro 375 × 812** (pevných 67 px, viz D):
  1. hlavička, 67 px;
  2. fotka 200 px, v ní jen stavová věta 19,2 / 700, nejvýš 2 řádky;
  3. věta pro nováčka (8-pr, 7-psycholog) **pod** fotkou na čisté `--pozadi`,
     16 px / 400, 2 řádky ≈ 48 px;
  4. dvě tlačítka 44 px vedle sebe: „Chci závodit" plné, „Výsledky" obrysové;
  5. blok podle fáze (5-jachting): karta nejbližší regaty, 65 px + popisek;
  6. pořadí: popisek a tři řádky tříd, ≈ 180 px — končí kolem y = 720.
  **Vypadne:** verzálkový podtitul (nahradí ho věta 3; už ve 12 px se láme,
  348 px v 335), kalendář, novinky a vodočet pod ohyb.
  *Když se rozhodne proti:* fotka zůstane texturou a tři nejlepší snímky,
  které web má (shoda s 8-pr), dál nikdo neuvidí; pak ji raději zmenšit než
  na ni vršit text.
- **D — pevných 67 px, v den regaty 124.** Hlavička jednořádková (shoda).
  Počasí: beru pravidlo **podle času** (7-psycholog), ne podle místa — pravidlo
  1-ergonomie nechává pruh trvale právě na úvodu, kde bere místo fotce
  a první regatě. Lepí se v den regaty; výstraha lepí jen tehdy, týká-li se
  plavby (mock nese „sněhové jevy" trvale — co se počítá, ať řekne 5 a 7).
  Partneři podle podmínky výš: 0 px, nebo 64 px (pak 131 / 188 px).
  Dlaždice partnerů v tmavém vzhledu `#e8e6e1` držím v obou případech — bílá
  `#fff` je tam nejjasnější plocha obrazovky a platí i pro monitor.
- **F — značka mimo tlačítko.** `--znacka` jen na to, na co se neklepe: znak,
  linka úvodu místo osiřelé červené `#c41e3a`, `h1` veřejných stránek. Ve
  světlém 8,48–8,85; v tmavém vyjde `h1` prakticky jako `--text`, takže tam
  se s 2 nepřeme vůbec. Spor zbývá jen o světlý `h1`: námořnická proti
  `--voda` má jasový odstup 1,56 : 1 a jiný tón. *Když se rozhodne proti:*
  `h1` v `--text`, značka žije jen ve znaku a v lince; nic se nerozbije, znak
  jen zůstane nálepkou. Otázka na 8-pr z bodu F je tedy ta pravá.
- **G — pilulka jen pro štítek, na který se neklepe.** 2-design sám v nálezu 3
  píše, že modrý štítek „potvrzena" vedle modrého „Podrobnosti" mate; u tvaru
  je to totéž. A bod B úkony z řádku stejně stěhuje do Podrobností — v řádku
  zbude jeden krok, a ten je plné tlačítko 44 px (1-ergonomie), ne pilulka.
  *Když se rozhodne proti:* tvar přestane rozlišovat stav od úkonu a všechno
  ponese barva, kterou chce 2 šetřit.

## Kde jsme se shodli

- **Hlavička na telefonu jednořádková, 67 px**, „Přihlásit" v nabídce (8, 10).
- **Stupnice písma (pět kroků) a tvar nadpisu okna podle 2-designu** (2, 10).
- **Fotky jsou nejsilnější materiál webu a mají být vidět** (8, 10); na
  telefonu se fotka pod obsah netáhne.
- **Převzatý článek není velká karta** a bez vlastní fotky nedostane šedou
  plochu se znakem svazu (8-pr nález 5, můj 7).
- **L (s 8-pr), doporučení: jedno jméno „Orlický pohár"** — nápis u znaku, titulek,
  `h1`, sdílený obrázek. „Orlik Yacht Series" smí stát jen uvnitř kruhu jako
  součást kresby; „Orlická série" jen v běžném textu. Trvá-li Miloš na
  „Orlická série", pak ať je všude ona — jde o to, aby bylo jedno.

## Nové, co vylezlo z cizích posudků

- **Sdílený obrázek a pás na telefonu jsou jeden výřez.** `og:image`
  1200 × 630 (8-pr) má poměr 1,90 : 1, pás 375 × 200 má 1,88 : 1. Výřez se
  u každé fotky vybere jednou a slouží oběma.
- **Jedna poloha výřezu pro tři fotky nestačí.** `object-position: 62%`
  (`globals.css:571`) je společná; v simulaci drží motiv 6 % (náklon), 30 %
  (zámek) a 45 % (spinakr).
- **Odpověď 8-pr (výřez; nese fotka za pořadím?):** loď u zámku dnes vypadne,
  protože je vidět 21 % šířky se společnou polohou; po úpravě je na všech
  třech. Za pořadím a kalendářem fotka nenese, jen tmavne nebo šedne — pryč.
- **Odpověď 2-designu (kde se nepotkáme; text hrdiny ve světlém):** nepotkáme
  se jen u pilulky a u 1,4 rem v hrdinovi. Text na fotce je ve světlém čitelný
  (bílá na závoji 86 %); nečitelné jsou až popisky sloupců v mlze pod pásem.

## Podmínka

1. **Jméno před kresbou.** Dokud Filip s Milošem neřeknou, které jméno
   platí, nekreslit nápis, sdílený obrázek ani nepřepisovat titulky — jinak
   se to dělá dvakrát.
2. **Tokeny před opravami.** Stupnice písma a tři poloměry do `globals.css`
   dřív, než se opravují jednotlivé obrazovky (A1, oddíl B, řádek přihlášky,
   nadpis okna). Jinak každá oprava přidá další hodnotu.

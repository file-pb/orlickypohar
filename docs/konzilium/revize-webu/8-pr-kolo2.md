# PR a marketing — kolo 2

## Kde ustupuju

- **C → 2-design:** nejtěžší text první obrazovky je stavová věta, ne moje věta
  pro nováčka. Té stačí 16 px / 600. Jen velikost jinak: 19,2 px / 700, ne
  22,4 — 19,2 je krok obou navržených stupnic (bod G), 22,4 žádné.
- **C → 10-grafik:** fotka je obraz. Z pásu odchází podtitul verzálkami i živá
  věta; zůstane na něm jediná věta.
- **C → 5-jachting:** „Chci závodit" pouštím. Tlačítka se jmenují podle toho,
  kam vedou: „Přihlásit loď" a „Vypsání". Poctivější a nic se nevysvětluje.
- **Můj nález 5 z kola 1:** prázdná plocha nad titulkem je zástupná plocha se
  znakem ČSJ, 159 px (10-grafik, 7c), ne nenačtený obrázek. Jeho návrh (karta
  jen s textem, titulek o stupeň níž) je lepší než můj odhad.

## Kde držím

### C — jeden seznam shora dolů (375 × 812, návštěvník, běžný den)

| # | Co | Jak | Výška | Konec |
|---|---|---|---|---|
| 1 | hlavička, jedna řada | znak, nabídka | 67 | 67 |
| 2 | fotka, závoj jen dole 80 px | na ní **jedna** věta pro cizího, 16 / 600, 2 řádky = 51 px | 200 | 267 |
| 3 | stavová věta, tři stavy sezóny | 19,2 / 700, 1–2 řádky | 80 | 347 |
| 4 | dvě tlačítka vedle sebe | 44 px | 60 | 407 |
| 5 | pořadí, tři třídy, **stojí** | jako dnes (nadpis + 3 × 40 + odkaz) | 229 | 636 |
| 6 | kalendář: nadpis a první karta | karta 65 px | 94 | 730 |

- **Vejde se** (měřeno proti `localhost:3000`, písmem stránky, sloupec
  335 px): „Osm regat plachetnic na Orlíku, květen až září." má 352 px,
  i delší znění s počtem lodí a tříd (555 px) jsou dva řádky. „Další: Jarní
  vítr, 15. května" má 238 px, jeden řádek; „Ročník 2026 vyhráli SEA MOUSE III,
  PEZI a LUNA" 441 px, dva řádky.
- **Tlačítka podle fáze:** před regatou „Přihlásit loď" · „Vypsání"; v den
  regaty „Výsledky" · „Vypsání"; po sezóně „Konečné pořadí" · „Kalendář 2027".
- **Vypadne:** podtitul verzálkami (nahradí ho věta), „Odjeto N z M" (patří
  nad kalendář), pohyb řádků pořadí, druhá a další karta, novinky, vodočet.
- **Proč dvě tlačítka, a ne odkaz ve větě:** dnešní „Další:" je 16 px vysoký
  cíl (audit B). Věta říká, tlačítko vede; jedno druhé nezastoupí.
- **Když se rozhodne proti:** úvod dál slouží jen tomu, kdo už jezdí.

### D — pevné pruhy: 67 px, v den regaty 124

- **Hlavička:** 67 px pro každého. Shoda.
- **Počasí — jedno pravidlo: lepí se jen v den regaty.** Jinak je blokem ve
  stránce. Beru čas (7-psycholog), ale bez „nebo s výstrahou": 27. 11. svítí
  na produkci i v mocku „Rizikové sněhové jevy" a pruh by lepil celou zimu.
  Proti místu (1-ergonomie): úvod je právě ta obrazovka, kde se o pixely hraje.
- **Partneři — podmíněně.** Repozitář zná slib jen jako „veřejnost, závodníci
  i tabule je vidí dál" (`SCENARE-OVLADANI.md:702–706`); „na očích pořád"
  (`partneri.tsx:2–4`) je návrhové rozhodnutí z 15. 9., ne znění slibu.
  - **Je-li slíbena přítomnost:** pod 48 rem pás nelepit; stojí na konci každé
    stránky a na úvodu je blok osmi log se jmény. **Pevných 67 px (8 %),
    v den regaty 124 (15 %).**
  - **Je-li slíbeno „trvale na očích":** pás zůstane a ztlumí se (10-grafik).
    **Pevných 131 px (16 %), v den regaty 188 (23 %)** — první karta kalendáře
    z bodu C pak v den regaty končí pod ohybem. Blok na úvodu chci i tak:
    jedoucí pás se partnerovi nedá vyfotit.
- **Když zůstane 231 px:** pod hlavičkou zbude 581 px. Seznam z bodu C se
  uřízne na 648 — pořadí se vejde, kalendář celý vypadne.

### L — jedno jméno: „Orlický pohár"

- **Držím, že vést smí jedno.** Proti sobě přiznávám: papíry rozhodčího se
  jmenují „Orlická série" (`PLAN.md:6161`, `:6300`, `:6428`). Web, adresa
  a appka říkají „Orlický pohár" a sám web ve výsledcích i správě mluví
  o „poháru" („do poháru", „v poháru").
- **Doporučení:** vede **„Orlický pohár"** — titulek, nápis vedle znaku,
  `og:site_name`, appka. Důvod není vkus: adresy se nemění (rámec 9) a appka
  už venku je. **Druhé jméno smí stát** jen jako obecné slovo v textu („série",
  „Historie série") a v názvech dokumentů rozhodčího, jak je vydal. „Orlik
  Yacht Series" jen uvnitř kruhu znaku.
- **Trvá-li Miloš na „Orlické sérii":** pak se přepíše titulek, `h1`
  i `og:site_name` a „Orlický pohár" zůstane jen v adrese. I to je lepší než
  dnešek. Neudržitelné jsou jen tři jména naráz.
- **Když se nerozhodne:** `openGraph` je nesporný a `og:site_name` jedno jméno
  chce. Rozhodne ho ten, kdo ho bude psát.

### F — přizván: značka dvě místa unese

- **Jinak, blíž 2-designu.** Barva značky už dnes nežije ani ve znaku: v tmavém
  vzhledu ho CSS přebarvuje, protože tmavě modrá na tmavém mizí
  (`logo.tsx:8–10`). Značku tedy nese tvar znaku, jméno a fotka, ne plocha
  barvy. Dvě stálá místa stačí.
- **Tlačítko ne.** Druhá modrá na věci, na kterou se klepe, se navenek nečte
  jako značka, ale jako nedotaženost. `--znacka` patří na neklikatelné: linka
  úvodu, a `h1` veřejných stránek jen tehdy, vyjde-li měření 10-grafika na
  4,5 : 1 v obou vzhledech.
- **Kde barva chybí víc než na webu:** v tom, co z webu odchází — náhled
  odkazu a ikona appky, která má dosud původní znak (`layout.tsx:81–83`).

## Kde jsme se shodli

- Hlavička na telefonu jedna řada 67 px, „Přihlásit" v nabídce (8, 10).
- Věta pro cizího a stavová věta se třemi stavy; po sezóně vítěz (3, 5, 7, 8).
- Převzatá novinka bez zástupné plochy 159 px a o stupeň tišší (8, 10).
- Dlaždice partnerů v tmavém vzhledu ztlumit (10) — nezávisle na bodu D.

## Nové, co vylezlo z cizích posudků

- **Tlačítko na úvodu zesílí slib, který web neplní.** Veřejná přihláška říká
  „Pořadatel ji uvidí a ozve se" (`prihlaska/page.tsx:77`), a pořadateli ji
  nic neukáže (3-ux, nález 2). Dnes se k ní dojde přes regatu a startovní
  listinu; z úvodu to bude jedno klepnutí. Viz podmínka 2.
- **Náhled sdílených výsledků musí nést stav.** 5-jachting (nález 3) chce
  „předběžné / konečné" nad tabulkou. S `openGraph` totéž patří do titulku
  náhledu — jinak nepodepsaná rozjížďka odejde do skupiny jako hotová.
- **Odpověď 10-grafikovi (slib partnerům):** z repozitáře pevný pruh na
  telefonu neplyne, zapsána je jen viditelnost pro veřejnost; stačí blok log,
  dokud Filip neřekne, že slíbil víc. Jméno: „Orlický pohár", viz bod L.
- **Odpověď 9-rizika (pípnutí, nebo mlčení):** horší je mlčení — špatný
  výsledek dál koluje jako platný; druhá zpráva ale musí říct „staženo
  k opravě", ne znovu „výsledky jsou venku".

## Podmínka

1. **Jméno se rozhodne dřív, než se napíše `openGraph` a věta pro cizího.**
   Jinak se tři jména rozejdou do náhledů ve skupinách, odkud se nevracejí.
2. **„Přihlásit loď" na úvodu až poté, co se veřejná přihláška ukáže pořadateli
   v „Co teď"** (nesporné, 3-ux 2). Do té doby vede první tlačítko na „Vypsání".

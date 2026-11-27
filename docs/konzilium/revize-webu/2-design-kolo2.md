# 2-design — kolo 2

Měřeno 27. 11. 2026 na **375 × 812** proti mocku, tmavý vzhled. Šířky variant v bodě I jsou
z přepsané stránky v mém prohlížeči, kód jsem neměnil. „S / T" = světlý / tmavý.

## Kde ustupuju

**I — ustupuji 5-jachtingu, s jiným tvarem buňky.** Tabulka průběžného pořadí (třída Race,
7 regat, 15 buněk s kódem) v obalu 333 px, sloupec Loď lepivý 145 px, na zbytek okno 188 px:

| Tvar buňky s kódem | Tabulka | Sloupec regaty | Řádek |
|---|---|---|---|
| dnes: `2` a index „DNC" 8,64 px | **664 px** | 52–61 px | 62 px |
| můj návrh z kola 1: index 0,85 em (12,2 px) | 712 px | 52–69 px | 62 px |
| 5-jachting: „DNC 2", škrt „(DNC 2)", jeden řádek 14,4 px | **799 px** | 52–85 px | 62 px |
| kód 14,4 px **pod** číslem, škrt „(2)" nad „DNC" | **681 px** | 52–59 px | 62 px |

Tabulka se nevejde dnes ani potom (664 v 333), takže „vejde-li se" odpověď nemá; měří se
přírůstek. Kód vedle čísla přidá 135 px (+20 %) tahu do strany. Kód **pod** číslem přidá 17 px
a výšku řádku nezmění, protože řádek už dnes drží dvouřádková buňka lodi. Je to méně než můj
vlastní index 0,85 em. **Návrh:** číslo nahoře (drží sloupec pro oko), kód pod ním týmž písmem
a v `--text`; škrt závorkou a tlumenou barvou, přeškrtnutí pryč — čára přes číslici 14,4 px
ji kazí. 5-jachting ať potvrdí, že „(2)" nad „DNC" čte jako listinu.

**G, pilulka — ustupuji 10-grafikovi.** Poloměr 999 px jen pro štítek, na který se neklepe;
úkon v řádku přihlášky je obrysové tlačítko r 10. Je to moje vlastní pravidlo (tvar a barva
znamenají jedno) použité důsledněji, než jsem ho použil já. „Zrušit prezenci" je dnes pilulka.

**G, stupnice — ustupuji na šest kroků grafika** (12 · 13 · 14,4 · 16 · 19,2 · 28 px). Mých
12,8 px padá. Co na kterém kroku stojí, držím níž.

**E — ustupuji 7-psychologovi a 3-ux, práh jinak.** „Nevykreslit odkaz" nepokryje přímou adresu
ani větu „Sledovat na tabuli →". Jedno řešení: adresa tabule pod prahem vykreslí rozcestník
(7) a oba odkazy pod týmž prahem vedou rovnou na Výsledky (3), aby rozcestník nebyl klepnutí
navíc. **Práh 600 ani mých 700 px neobstojí.** Změřeno na tabuli v 375 px: nejvíc textu má
3,4 px (500 znaků), nejmenší 2,6 px, při `--tv` = 3,75 px. Hlavní písmo je tedy 0,907 × `--tv`:
při šířce 600 px má 5,4 px, při 700 px 6,3 px, při 1000 px 9,1 px, při 1280 px 11,6 px.
**Návrh prahu:** rozcestník, dokud `--tv` < 10 px, tedy `(max-width: 999px), (max-height: 561px)`
— výška proto, že `--tv` je `min(1vw, 1,78vh)` a telefon naležato (812 × 375) má 6,7 px.

**C — ustupuji z 1,4 rem na 1,25 rem.** Při 22,4 px se „Další: Radavský pohár, 29. srpna"
(338 px) nevejde na řádek 335 px; při 20 px ano (305 px).

## Kde držím

**C — stavová věta je nejtěžší text první obrazovky; jeden seznam.** Počítám s hlavičkou 67 px
(bod D) a pruhem počasí 57 px: zbývá 688 px.

1. **Fotka 200 px** (`--hero`, jak chce 10-grafik). Na ní jediný text: stavová věta 20 px / 700,
   bílá, nejvýš dva řádky = 50 px, ve spodních 62 px. Nad ní 138 px čisté fotky.
2. **Věta pro nováčka** 16 px / 400 v `--text` na `--pozadi`, dva řádky (445 px textu): 72 px.
3. **Dvě tlačítka 44 px** vedle sebe (text 93 a 69 px, vejdou se): 60 px. Plné jen jedno.
4. **Pořadí:** popisek a tři řádky tříd, dnes 197 px.
5. **Kalendář:** popisek a první karta, 97 px. Součet s mezerami 674 px ≤ 688.

Z první obrazovky vypadne: podtitul verzálkami 11,52 px (říká totéž co věta 2, hůř), červená
linka, „Vedou…" z hrdiny (říkají to řádky pořadí), Novinky. Zůstanou-li partneři připnutí
(624 px), vypadne i první karta kalendáře. *Když se rozhodne proti:* odpověď na „kdy se jede"
zůstane 14,4 px / 400 a nejtěžší na obrazovce bude dál logo a číslo dne.

**F — držím, a čísla to rozhodují za nás.** Na co se klepe, má jednu barvu, `--voda`, včetně
plného tlačítka. Změřeno pro `#0c4a8c`: S na `--pozadi` 8,48, na `--papir` 8,85, bílé písmo na
výplni 8,85. T na `--pozadi` **2,03**, na `--papir` **1,87** — nepoužitelné, proto má hlavička
v tmavém `#d6e6f5` (`globals.css:453`): 14,13 / 13,02. Jenže `#d6e6f5` proti `--text` má
**1,06 : 1**. V tmavém vzhledu tedy barva značky není barva: nadpis v ní je prostě bílý
a tlačítko s ní je nejjasnější plocha obrazovky. Ve světlém má značka proti `--voda` jas 1,56
— dvě tmavé modré vedle sebe. **Jinak:** `--znacka` ano na linku úvodu a `h1` veřejných stránek
(neklepe se, nenese stav), na tlačítko ne. *Když se rozhodne proti:* buď nese „klepni" dvě
modré, nebo — je-li značka na tlačítku i na `h1` — jedna modrá znamená úkon i nadpis.

**G, nadpis okna — držím dva řádky.** Kontext 13 px `--tlumeny`, agenda 19,2 px / 700
v `--text`, barva úkonu na levé hraně. S bodem F to sedí: správa má `h1` v `--text`, veřejná
stránka ve značce. *Když ne:* zůstane 8 z 12 nadpisů pod 4,5 : 1 a A1 se musí řešit zvlášť.

**G, co na kterém kroku stojí — držím.** 12 px jen verzálkový popisek. 13 px metadata (datum,
zdroj, nápověda, štítek). Údaj, podle kterého se rozhoduje — jméno lodi, body, kód, čas, počet
— nejmíň 14,4 px a v `--text`. *Když ne:* stupnice se zavede a přihlášky budou mít dál
polovinu textu pod 13 px, jen v méně velikostech.

## Kde jsme se shodli

- Kód ve výsledcích písmem čísla (I); zbývá jen potvrdit tvar „pod číslem".
- Pilulka jen pro neklepací štítek; úkony obrysovým tlačítkem r 10, plné tlačítko jedno (G).
- Šest kroků písma jako tokeny, nic mezi nimi; `h1` a `h2` okna už nejsou 0,8 px od sebe (G).
- Televizní rozvržení se na malé obrazovce nevykreslí a odkazy na něj vedou na Výsledky (E).
- Fotka je pás `--hero`, pod ním čisté `--pozadi`; na fotce jeden text (C, s 10-grafikem).

## Nové, co vylezlo z cizích posudků

- **Stav znakem je krok zpět (k B, 5-jachting × 7-psycholog).** „Dva znaky — startovné,
  souhlas" by stav nesl jen tvarem nebo barvou; červená a zelená stavu mají ve světlém mezi
  sebou jas 1,16 : 1. Platí 7-psycholog: stav slovem. Ani nepřítomnost slova není stav.
- **Text na fotce ve světlém vzhledu nikdo nezměřil.** 10-grafik píše, že závoj je tam šedá
  mlha a popisky v ní mizí. Stavová věta proto musí být bílá na tmavém závoji v **obou**
  vzhledech: závoj ≥ 50 % černé pod větou dá bílé 3,98 : 1 i na bílém místě snímku, což pro
  20 px / 700 (velký text, mez 3 : 1) stačí.
- **Nápis vedle znaku (k L).** `--napis-znacky` má v tmavém 4,76 : 1, jenže písmo je šrafované,
  takže plochy je zlomek (potvrzuje 8-pr: „skoro nečitelný"). Ať vyhraje kterékoliv jméno,
  má být plnou výplní.
- **Bílé dlaždice partnerů v tmavém vzhledu** (10-grafik, nález 5) jsou i moje věc: nejjasnější
  plocha nenese nejdůležitější obsah. Jeho `#e8e6e1` podporuji.

**Odpovědi.** Přímou otázku mi nikdo nepoložil; tři věci mi kolegové přenechali:
- *9-rizika, podoba nebezpečných tlačítek:* nevratný úkon nikdy plnou výplní; „Opravdu smazat"
  je obrysové tlačítko v `--stav-zruseny` (S 5,95, T 5,41) a je to jediné místo, kde úkon
  smí být červený.
- *8-pr, podoba tabule na telefonu:* žádná — viz bod E, rozcestník a Výsledky.
- *5-jachting, jak velký má být kód:* jako číslo, 14,4 px — viz bod I.

## Podmínka

1. **Nejdřív tokeny, potom obrazovky.** Šest kroků písma, tři poloměry a pravidlo „klepací =
   `--voda`, stav nikdy modrý" jako tokeny, a `tools/kontrola-tokenu.py` hlídá páry
   písmo–podklad v obou vzhledech. Bez toho se každá obrazovka opraví po svém a rozejdou se
   znovu — z kontrastních vad kola 1 byla jedna jen v tmavém a jedna jen ve světlém vzhledu.
2. **Úvod se nestaví, dokud text na fotce nemá změřený kontrast ve světlém vzhledu.** Celá
   skladba bodu C stojí na jedné větě na fotce.

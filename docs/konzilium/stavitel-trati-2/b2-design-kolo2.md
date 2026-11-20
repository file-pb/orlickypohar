# Vizuální design — kolo 2

## Kde ustupuju

**5-jachtaři (J10), a je to moje pravidlo porušené v souboru, který jsem
chválil.** `Main.dc.html:58` kreslí Bránu 2 červeným kolečkem `#c1121f`,
a červená je ve vyhlášce pravá strana plavební dráhy. Chválil jsem, že
barvy bójí sedí na `znak-boje.tsx`, a přehlédl, že jedna tam stojí jako
**kategorie prvku**. To měla chytit moje věta „barva znamená pořád totéž".

**5-jachtaři (J1): ta čísla na obrazovku patří.** Ubírání neznamená míň
údajů, znamená **míň tvarů**; rozpočet, co za ně zmizí, je níž.

**1-ergonomii (E5): vzorek měří 40 pt, ne 38.** Měřil jsem `width`, tedy
obsah; oni rámeček včetně 1 dp lemu. Platí jejich číslo.

**1-ergonomii (E1).** `scrollHeight` 981 na 844 jsem odepsal jako vadu
makety; je to vada rozložení — pruh roluje a akce leží na y 865–951.

**3-ux: `Zamek` je pátý pohled na týž seznam**, ne varianta řádku — v mé
tabulce byl jen jedním ze šesti způsobů kresby.

## Kde držím

**Spor B — a je menší, než vypadá.** S 1-ergonomií se o *Jsem u ní*
nepřeme: ta akce **měří**, takže plnou plochu drží právem a E8 má pravdu,
že dvě tlačítka by znamenala akci bez terče. Moje pravidlo zní „plná
`voda` = změř polohu tady a teď", ne „= pípni"; spor zbývá jen u dvou
terčů, které neměří — *Postavit sem* (`ZdrojPolohy.Mapa`) a *Hotovo*
v `Barva` —, a ty patří do váhy 2, obrysové s rámem `text`.

**Slovo na tlačítku se ale měnit nesmí, i když akce zůstává táž.**
1-ergonomie změřila, že *Pípni* drží místo i velikost přes změnu stavu
(11 pt) a že právě v tom je návyk; záměna `PÍPNI ZNAČKU` → `JSEM U NÍ`
ruší slovem to, co rozložení uhájilo. A 3-ux chce na tlačítko cíl:
`JSEM U BRÁNY 2 — LEVÁ` měří 24/800 **281 pt**, s ikonou 323 z 358, tedy
bez rezervy na delší jméno. **Tvar, který unese obojí:** řádka 1 `PÍPNI`
26/800 (66 pt) s ikonou, řádka 2 `u Brány 2 — levá` 15/600 (**117 pt**).

**Spor C držím a na 1-ergonomii čekám.** J10 ho posiluje: je-li vlevo
kresba značky, nemá se kam vrátit barva kategorie — kresba ji nemá z čeho
vzít. A **devět hexů mimo `theme.ts` i bílá napevno na modré ploše** drží
beze změny: nikdo se toho nedotkl a překreslení rozložení to nezlevní.

## Kde jsme se shodli

- Barva v seznamu je barva té věci ve vodě, nikdy kategorie (5/J10, 2/2);
  číslovaný seznam zrušit, osa je jedna (3-ux/1, 2/2).
- `Hotovo` je pruh nahoře, ne obrazovka s vlastní hlavní akcí (3-ux/1,
  1-erg/E3, 2/1 a 2/2).
- Jantarová karta plánu je druhý tvar téhož a má zmizet (2/3, 3-ux/2).
- Dolní pruh patří ven z rolovaného obsahu a do každého stavu (E1, E3).

## Nové, co vylezlo z cizích posudků

### Spor A: co zmizí a kde ta čísla stojí

Měřeno na `Main.dc.html`: hlavička 106, proužek polohy 42 (y 112–154),
obsah 482, dolní blok 208 — v něm dva sekundární terče 358 × 48, popiska
16 a hlavní plocha 86.

**Co zmizí — 84 pt, a nic z toho nenese hierarchii:**

| co | kolik | proč to smí pryč |
|---|---|---|
| řádek *Přerovnat* + *Nahlásit hotovo* (48 + 10) | **58 pt** | J3: přerovnání není rozhodnutí stavitele; hlášení je jednou za regatu proti dvaceti pípnutím a patří nahoru jako pruh |
| návěstí *CO UŽ STOJÍ* (16 + 10) | **26 pt** | je to jediný seznam na obrazovce, osa se nepopisuje |

**Co ta čísla stojí — 14 pt:**

- **Vítr do proužku polohy jako druhá řádka.** Je to stav prostředí
  měnící se bez přičinění stavitele — přesně to, co rozhodnutí 4 do
  proužku umístilo. Na jednu řádku to nejde: `Poloha je čerstvá · vítr
  240° 4 m/s` měří 16/600 **255 pt** a vešlo by se, ale nejdelší věta
  z `posud` ne. Proužek tedy **42 → 56 pt**.
- **Azimut a vzdálenost do řádku, ne do nového pásu — 0 pt.** Řádek je
  324 × 56 s vnitřkem **298 pt**: jméno 16/600 = 66, předpis 13 = 134,
  vpravo sloupec `↑ 063° · 310 m` 15/700 = **109 pt**; s mezerou 10 je to
  253 z 298, a pod ním stav slovem 13/600 (`změřeno` = 55). Dvě řádky
  15 + 13 se do vnitřní výšky 38 pt vejdou, **fajfka vpravo tím odchází**.
- **Délka linie a vzdálenost od prvního bodu** mají tvar hotový ze závěru
  (34 dp/800 `↑ 63 m`); J9 ho jen rozšiřuje na start, cíl a odskok.

**Zůstatek +70 pt**, víc než celý další řádek (56). Elegance tu neznamená
míň čísel: znamená, že jdou do dvou tvarů, které na obrazovce už jsou,
a zaplatí je dva tvary, které tam jsou navíc.

### Spory D a G jsou jedna oprava, ne dvě

Zmizí-li jantarová karta plánu a stav bude slovo vpravo v řádku
(`změřeno` / `z plánu`), **plán přestane být rozložením**: obrazovka
vypadá stejně, ať plán je, nebo není, a Filipovo „o plánu nepadne ani
slovo" platí samo od sebe. Pás, který se objevuje a mizí, je druhé
rozložení; slovo ve sloupci je jedno. Na čem ten příznak stojí
(`Trat.ZverejnenaV` podle 3-ux), můj obor neřeší — kreslí se to stejně.

A **která trať** se staví (G) má v hlavičce měřené místo: podnadpis
`Radavská regata · 2. rozjížďka` měří 13/400 **181 pt** z ~300 volných
vedle šipky zpět. Stačí z něj udělat terč se stupínkem dolů a `POST
/dalsi` i klon dát do té nabídky, ne na hlavní obrazovku — nula pásů.

### Odpověď 1-ergonomii na 44 × 44

Dva řádky po čtyřech ne — sedm se na čtyři a tři rozpadne nesymetricky.
Jeden řádek drží: **kresli disk dál 38–40 dp a nafoukni jen terč na
44 × 44** paddingem, ne průměrem. Řada měří 7 × 44 + 6 × 8 = **356 z 358
pt**, ale barevné plochy jsou od sebe 14 pt a od okraje 3 plus 16 pt
stránkového okraje: opticky se nezmění nic a mez je splněná.

## Podmínka

1. **Jedna řádka trati nakreslená jednou, dřív než se postaví cokoliv** —
   56 dp, vlevo kresba ze `znak-boje.tsx`, vpravo sloupec s číslem
   a stavem —, a podle ní překreslené všechny pohledy. Šest značek v pěti
   výškách není nedbalost kresby: každá kóduje jinou proměnnou.
2. **Žádná barva na obrazovce bez tokenu v `theme.ts` s tmavým
   protějškem**, a `app/testy/kontrast.test.ts` rozšířený o páry, které
   stavitel zavádí — včetně sabotáže, tedy ověření, že pár s bílou napevno
   na `voda` **spadne**. Devět pevných hexů dnes CI nevidí a v tmavé sadě
   se obracejí (spojnice osy 2,02 → 8,53:1).

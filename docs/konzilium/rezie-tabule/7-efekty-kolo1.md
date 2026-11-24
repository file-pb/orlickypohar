# Broadcast grafika a efekty — kolo 1

Měřeno čtením kódu a CSS proti 1920 × 1080 (`--tv` = 19,2 px), u pravidel
bez `--tv` i přepočtem na 3440 × 820. Běžící tabuli jsem nespouštěl; co
z toho plyne, je u dotčených nálezů označené jako předpoklad.

## Co je dobře

1. **Výměna řádků je FLIP, ne dekorace po skoku** (`mapa-trackeru.tsx:1344`
   až `:1367`): polohy se změří, řádek se transformem vrátí a odtud dojede,
   takže se dvojice doopravdy míjí. Ustupující navíc uhne stranou a ztlumí
   se — efekt nese „kdo komu uhnul". Jediný prvek tabule udělaný tak, jak
   by to udělal grafik přenosu.
2. **„Karta se prolne, nelétá"** (`globals.css:3898`–`3911`) i jeho příčina:
   televize dopočítávají mezisnímky a škálující se cedule se rozdvojí.
   Nejcennější zjištění v oddílu — jen se podle něj neřídí zbytek (E4).
3. **Šipka a číslo v jedné buňce mřížky** (`:5134`–`5136`, keyframy
   `:5147`–`5157`): řádek při přehození nepodskočí a oba si buňku předají,
   místo aby se prolnuly do změti.
4. **Lepík se kreslí mimo rolovaný seznam a měří si pozici**
   (`mapa-trackeru.tsx:1176`–`1196`), animace jen `opacity` (`:5490`).
5. **Restart animace přes `animation: none` → `offsetWidth` → `""`**
   (`:1370`–`1377`) místo `key`, i se zapsaným důvodem, proč `key` neprošel.

## Co je špatně

### E1. Každý dojezd ztmaví celou obrazovku na 4,5 s

- **Nález** — `.tabule-clona` je `inset: 0` nad celou tabulí
  (`globals.css:3806`–`3811`), renderuje se ke každé kartě
  (`obrazovka.tsx:808`) a `ALERT_MS` = délka animace = 4 500 ms, takže
  mezi kartami fronty není mezera.
- **Proč to vadí** — dvanáct dojezdů je 54 s, kdy je celá plocha (mapa,
  žebříček, pásy) pod `rgb(0 0 0 / 0.55)`; clona dohasíná na 70 % a další
  hned nabíhá, takže obrazovka v nejzajímavějším úseku regaty pulzuje
  v taktu 4,5 s. Plná clona je nástroj pro přerušení vysílání, ne pro jméno
  lodi v cíli.
- **Návrh** — clonu renderovat jen pro `udalost.druh === "vystraha"`.
  Ostatní karty mají vlastní pozadí i `backdrop-filter: blur(8px)`,
  čitelné jsou bez ní.

### E2. Prostřih na záznam je tvrdý řez bez značky — a nemusí být výměna plochy

- **Nález** — `ukazujeZaznam` vymění celý `<Vysledky>` za
  `.tabule-prehravka` (`obrazovka.tsx:634`–`658`). CSS té podoby
  (`globals.css:6007`) nemá žádnou animaci, nová instance mapy startuje
  s `setCas(0)` (`mapa-trackeru.tsx:1010`) a dlaždice tahá až po připojení.
- **Proč to vadí** — v jednom snímku se vymění sto procent plochy a
  příchozí strana přijde s nenačtenou mapou. Není to řez (ten má hned
  obraz) ani přechod; je to jediná změna na tabuli, která vypadá jako
  chyba načítání.
- **Návrh (otázka 1: PIP ano, ale ne zdarma)** — vsuvka
  `aspect-ratio: 16/9; width: calc(34 * var(--tv))` (653 px na Full HD),
  otevírá se `clip-path: inset(0 0 0 100%)` → `inset(0)` za 320 ms. Clip,
  ne `scale`: obsah se nehýbe, takže nemá co zdvojovat. Tři překážky
  k zaplacení: (a) prop `tabule` nese zároveň rozvržení i sloupec pořadí —
  vsuvka potřebuje třetí režim bez sloupce; (b) rozměry `.nacrt-na-tv` jsou
  v `rem` (`globals.css:5258`–`5262`, `:5290`–`5298`), ne v `--tv`, takže
  ve třetinové vsuvce zůstane písmo v původní velikosti; (c) dvě instance
  mapy = dvě sady dlaždic a dva intervaly.
- **A při tom padne i tohle** — v přehrávce chybí `onUdalost`, takže se
  neukáže ani lepík (branka `:1144`): třicetisekundový záznam dojezdy
  nijak neoznačí. A lodě se v něm hýbou po jedné sekundě (`:995`–`1003`),
  tedy třicetkrát za rozjížďku. `transition: transform 1s linear` na
  lodičce (dnes `<path transform=…>` bez třídy, `:336`) z toho udělá
  plynulý pohyb za nula dalších překreslení. Že to dopočítávání mezisnímků
  na té telce doopravdy zlepší, je **můj předpoklad**, ne měření.

### E3. Souboj dostane 40 s záběru a jediný signál je podbarvený řádek

- **Nález** — `.nacrt-v-zaberu` přidá 18 % barvy lodi a vnitřní linku
  (`globals.css:5448`–`5452`, nasazení `mapa-trackeru.tsx:1872`), bez
  `transition`, takže skočí. Hláška, která to měla říct, **není v DOM**:
  `.nacrt-swap` i `.nacrt-souboj*` (`:5035`–`5090` a `:5288`–`5298`,
  75 řádků včetně vlastní tabulové varianty) nerenderuje nikdo — grep po
  obou třídách ve `web/**/*.tsx` nemá zásah, a komentáře v kódu se přitom
  na „hlášku v rohu mapy" odvolávají jako na existující.
- **Proč to vadí** — 43 % času záběru mapy je bez značky. Potvrzuje to R2
  jinou cestou než přes `onUdalost`: i kdyby šla karta `souboj` vyvolat,
  byla by to špatná volba — karta je událost na 4,5 s, souboj je **stav
  na 40 s**.
- **Návrh (otázka 2)** — pás vlevo nahoře na mapě, přesně tam, kam mířilo
  mrtvé pravidlo `:5288`. Přijede `clip-path` wipe zleva za 300 ms, drží
  celých 40 s, odejde 300 ms `opacity`. Dvě tečky v `--barva-lodi` ho sváží
  s podbarvenými řádky i se stopami — barvu už oba konce mají. Žádný posun,
  žádné škálování.

### E4. Pět druhů karet pořád létá a škáluje — proti vlastnímu pravidlu

- **Nález** — `globals.css:3929`–`3962` přepisuje `animation-name` na
  `tabule-alert-vpravo-nahoru` / `-nahoru` / `-vlevo` pro `start`, `trat`,
  `ceka`, `dokonceno`, `venku`, `zrusena`, `lod`, `zavod`. Ty keyframy mají
  `scale(0.6)` → `1.04` → `scale(0.2)` a odlet na `translate(32vw, -12vh)`.
  Bez škálování zůstal jen `dojezd`.
- **Proč to vadí** — (a) ruší se důvod, pro který se základní animace
  přepsala na prolnutí (zdvojená „POLARIS"); (b) `prefers-reduced-motion`
  na `:3912`–`3920` je **neúčinné** — `.tabule-alert.start` má specificitu
  0,2,0 proti 0,1,0 uvnitř media query, takže ji přebije; respektuje ji jen
  `dojezd`; (c) cíle odletu jsou ve `vw`/`vh`, ne v `--tv` — na 3440 × 820
  odletí karta 1101 px vpravo, kde sloupec pořadí končí na 350 px, tedy
  „usadí se" mimo svůj chlíveček.
- **Návrh** — ty přepisy `animation-name` smazat a usazení vyjádřit
  posunem o `calc(1.5 * var(--tv))` ve směru cíle v posledních 12 %
  animace. Směr informaci nese, dráha přes půl obrazovky ne.

### E5. Změna záběru je skok projekce, ne pohyb kamery

- **Nález** — `setZ` + `setStred` (`mapa-trackeru.tsx:1077`–`1085`)
  přepnou přiblížení v jednom snímku; mezi `celek` a `celo` je nejméně
  jeden stupeň (`:1073`), tedy dvojnásobné zvětšení, a nové dlaždice se
  musí stáhnout — na tu dobu prosvítá hrubý podklad `PODKLAD_Z = 14`.
- **Proč to vadí** — stejná voda v jiném měřítku bez pohybu a bez
  doostřeného obrazu nečte jako řez (ten potřebuje úplnou změnu
  kompozice), ale jako záseknutí. A je to dvanáctkrát až osmnáctkrát
  za rozjížďku.
- **Návrh** — dlaždice držet na jemnější úrovni obou záběrů a měnit jen
  výřez: `transform` na obalu plátna s `transition: transform 700ms
  cubic-bezier(.4,0,.2,1)`. Vyjde nájezd, dlaždice se netahají znovu.

### E6. Dohasínání záběru se počítá proti nule, ne proti začátku záběru

- **Nález** — `silaZaberu` (`mapa-trackeru.tsx:1107`–`1112`) používá
  `cas % delka`, ale záběr začíná v čase prohození (`rezie-tabule.ts:172`,
  mřížka po 10 s), takže jeho začátek je násobkem deseti, ne čtyřiceti.
- **Proč to vadí** — ve třech případech ze čtyř stopa zhasne a zase se
  rozsvítí **uprostřed** jednoho záběru, nebo nový záběr nastoupí už
  dohasnutý na 0,3: efekt, který má říkat „tenhle záběr končí", říká něco
  jiného. A bez `transition` se mění skokem — živě se `cas` posouvá
  s obnovou, tedy po ~5 s, což je krok 16 % průhlednosti.
- **Návrh** — doběh počítat ze začátku záběru (čas prohození už v plánu
  je) a na stopu dát `transition: opacity 400ms linear`.

### E7. Kaskáda výměn se vleče za daty a při změně pole naopak skočí

- **Nález** — jeden takt je `TAKT_MS` 1 900 ms a prohazují se jen sousedé
  (`mapa-trackeru.tsx:1304`–`1316`): loď, která po bóji získá pět míst,
  jede 9,5 s, dvanáct inverzí je 22,8 s, mezitím dorazí další data (5 s).
  Při změně počtu lodí naopak `setZobrazene(cilove)` srovná žebříček
  **bez animace** (`:1294`–`1298`).
- **Proč to vadí** — žebříček ukazuje stav, který už neplatí, a přitom se
  pořád hýbe, takže to divák nepozná. Opačný extrém — skok celého seznamu
  — přijde právě ve chvíli, kdy někdo odpadne.
- **Návrh** — při víc než třech inverzích pustit výměny souběžně: FLIP na
  `:1344` umí animovat všechny řádky naráz, stačí je nepouštět po jedné.
  Jedna společná výměna 1,1 s místo řetězu po 1,9 s.

### E8. Na tabuli není ani jedna `transition`

- **Nález** — po řádku 3600 `globals.css` neobsahuje `transition` ani
  jednou (všech 7 výskytů v souboru patří webu), zato 28 deklarací
  `animation`.
- **Proč to vadí** — rejstřík je jen dvojí: tvrdý skok, nebo keyframe při
  připojení. Všechno, co se mění *na místě* (podbarvení řádku, síla stopy,
  výřez mapy, stáří dat), proto skáče. Televizní dojem dělá právě ten
  prostřední rejstřík: změna vlastnosti za 200–400 ms.
- **Návrh** — jedna utilita `.tabule [data-prechod] { transition: opacity
  300ms ease, background-color 300ms ease; }` nasazená na `.nacrt-v-zaberu`,
  stopy a lepík. Obojí jde na kompozitor, takže to nestojí překreslení.

## Co bych potřeboval vědět

- **1-rezie:** má vsuvka se záznamem (E2) nahradit prostřih úplně, nebo má
  zůstat i chvíle, kdy záznam dostane celou plochu? Technika je stejná, ale
  vsuvka smí běžet souvisle a prostřih ne.
- **1-rezie:** střídání `celek`/`celo` (18 s / 12 s) nezná důvod záběru,
  takže během 40 s souboje se obraz na 18 s odtáhne na celé pole. Čí je to
  nález — tvůj (kdy), nebo můj (čím)? Já tvrdím jen to, že ať se rozhodne
  jakkoliv, přechod má být nájezd, ne skok.
- **6-design:** vsuvka v koutě (E2) a pás souboje vlevo nahoře (E3) berou
  plochu. Který kout je volný na podobě `mezi` a který na `mapa`?
- **5-jachting:** je u souboje podstatné vidět *obě* lodě ve výřezu, nebo
  stačí čelo pole? Na tom visí, jestli má souboj vlastní výřez (E5).
- **Filip:** jde pustit přehrávku záznamu na té telce a vyfotit ji? U E2
  i u pulzování clony (E1) je to jediný způsob, jak zjistit, jak moc to
  dopočítávání mezisnímků zhoršuje — já to mám jako předpoklad.

## Čeho se nedotýkám

- **Kdy a jak dlouho** se co ukáže, pořadí ve frontě, stropy a hystereze
  přepínání podob (R3, R4) — 1-rezie.
- Barvy, kontrast, velikost písma a hierarchie — 6-design. U E2 jsem se
  rozměru dotkl jen proto, že `rem` versus `--tv` je technická překážka.
- Texty karet, nadpisky druhů a jméno pásu u souboje — 8-jazyk.
- Jestli je souboj do třetího místa ten správný jev a co znamená dav
  u bóje — 5-jachting.
- Odpojený `semafor.tsx` a `vlajka.tsx` (R1) jako rozhodnutí; až se
  připojí, animace vlajky (`globals.css:5344`–`5352`) je hotová a
  v pořádku — vlní se `scaleY` na `transform-box: fill-box`.

# Názvosloví a čeština — kolo 1

Posuzováno z kódu a z nálezu 12 v `docs/TABULE-DIVAK.md`, bez spuštěné tabule:
všechny nálezy jsou o slovech a jejich tvarech, ne o tom, jak jsou velká.
Starší běh (`4-jazyk-kolo1..3.md`) jsem přečetl a jeho rozhodnutí o jménech
cituju jako platná.

## Co je dobře

1. **„Vydáno" je jedno slovo přes tři místa** — pole `vydanoV`, nadpis panelu
   *Vydáno k regatě* (`web/.../tabule/infopanel.tsx:60`) a nadpisek karty
   (`obrazovka.tsx:823`). Karta se po 4,5 s usazuje do panelu, který má v hlavě
   totéž slovo, takže divák pozná, kam zpráva odešla. Držet — a to slovo
   nerozšiřovat na výsledky: nad nepodepsanou tabulkou stát nesmí
   (`4-jazyk-kolo2.md`, podmínka 2).
2. **`ZAPIS` je nejlepší kus slovníku v celé tabuli** (`obrazovka.tsx:845`):
   *čerstvé z vody / u rozhodčího / potvrzeno / přepisuje se*. Čtyři různé věci,
   žádná úřední, a všechny středního rodu, takže se shodnou s *pořadí* v nadpisu
   dvě řádky výš. Že se nezobrazuje, je nález 1.
3. **Trať má dva druhy událostí, ne jeden s barvou** (`tabule-udalosti.ts:130`):
   „červená *čeká se* se nesmí splést se zelenou *jede se*". Správné pravidlo —
   škoda, že ho polovina nadpisků nedodržuje (nález 4).
4. **„venku" pro zveřejnění** (`tabule-udalosti.ts:229`). To slovo si projekt
   vybral už dřív — *Vydání* → *Venku od*, „stáhnout" vyhozeno jako download
   (`4-jazyk-kolo1.md`, bod 7) — a tabule ho drží.

## Co je špatně

### 1. `ZAPIS` je mrtvý a na tabuli jede slovník správy, který `ZAPIS` jmenovitě odmítl

- **Nález** — `ZAPIS` (`obrazovka.tsx:845`) nereferencuje nic (grep přes `app/`,
  `lib/`, `testy/`). Co divák doopravdy vidí, je `JAK_JISTE`
  (`tabule/vysledky.tsx:18–24`), vypisované na `vysledky.tsx:122`: *zapisuje se /
  zapsáno / potvrzeno / v revizi / eliminováno*. Je to kopie štítků **pro
  správce** (`lib/vysledky.ts:69, 88, 93, 99, 107`). Komentář nad `ZAPIS` přitom
  odmítá právě to slovo: *„«zapsáno» říká jen to, že se na to už někdo díval"*.
- **Proč to vadí** — (a) rámec 5 tohoto konzilia cituje `ZAPIS` jako to, co na
  tabuli stojí; nestojí, takže se posuzuje text, který nikdo neviděl — totéž, co
  R2 říká o `souboj`. (b) *zapisuje se* a *zapsáno* se přes místnost liší dvěma
  znaky a divácky znamenají skoro opak: *zapsáno* je podepsané rozhodčím,
  *zapisuje se* je stav, kdy to nikdo nekontroloval. (c) *eliminováno* jde proti
  Filipovu rozhodnutí ze 16. 10. 2026, zapsanému v `lib/vysledky.ts:102–106`:
  *„Zrušená, ne «eliminovaná» — pod tím slovem se na vodě rozhoduje"*. Je to
  přesně ten latinismus typu „Legislativa", který starší běh vyhodil.
- **Návrh** — `JAK_JISTE` zrušit a `vysledky.tsx:122` vypisovat z `ZAPIS`. Tím se
  obrací disposice nálezu 12 („`ZAPIS` … bez majitele, smazat se dá kdykoliv"):
  smazat se má ten druhý. **Pád:** štítek správy pro `Eliminovano` je *zrušená*
  (ženský rod, shoda s *rozjížďkou*) — kdo `JAK_JISTE` „spraví" kopií ze správy,
  rozbije shodu s *pořadí*, které je v té větě podmětem. `ZAPIS` má *zrušeno*
  a je to správně.
- **Druhá polovina téhož** — karta `venku` (`tabule-udalosti.ts:229`) říká
  *„3. rozjížďka je venku · 5 lodí v cíli"* a **o podepsanosti ani slovo**,
  přitom `r.stavVysledku` je přímo v ruce. Rámec 5 to zakazuje. Detail má znít
  *„5 lodí v cíli · čerstvé z vody"*.

### 2. Dvě ze čtyř podob se nejmenují, jen se předložkou odkazují

- **Nález** — `type Rezim = "listina" | "mapa" | "mezi" | "po"`
  (`obrazovka.tsx:942`). `listina` a `mapa` jsou podstatná jména, `mezi` a `po`
  předložky, které samy nic neznamenají — proto jim nabídka dema musí chybějící
  jméno dodat (`:710–713`: *Mezi rozjížďkami*, *Po dojetí regaty*). Režie ve
  stejném repozitáři přitom pojmenovává záběry důsledně jmény: `souboj | boje |
  kolotoc` (`lib/rezie-tabule.ts:65`).
- **Proč to vadí** — (a) **na pátou podobu pro start (R1) není z čeho odvodit
  jméno**: sada má dvě pravidla naráz, takže `start` i `pred` se obhájí stejně
  dobře. (b) `"po"` se nedá najít: `grep '\bpo\b'` nad `app/` a `lib/` vrací
  1 361 řádků, `'"po"'` osm, z nichž část je cizí. Jméno, které nejde
  vyhledat, platí každý další čtenář. (c) Nedá se skládat: třída `tabule-po` ani
  věta „režim po" nic neříkají.
- **Návrh** — `listina | mapa | pauza | konec`, pátá `start`. `konec` není nový
  nápad: kód ten stav **už tak jmenuje** — `konec={rezim === "po"}`
  (`obrazovka.tsx:658`, `vysledky.tsx:40–45`). Popisky v demu zůstávají věty,
  jako dnes u `listina`.

### 3. „Na vodě" u souboje nerozlišuje nic, a ta karta nemá titulek

- **Nález** — `NADPISKY.souboj = "Na vodě"` (`obrazovka.tsx:827`). Druh `souboj`
  existuje jen v typu (`tabule-udalosti.ts:30`), nic ho nestaví, takže k tomu
  nadpisku **žádný titulek napsaný není** (R2, nález 12).
- **Proč to vadí** — v podobě `mapa` je na vodě všechno. Nadpisek má podle
  komentáře nad sebou (`obrazovka.tsx:810`) říct druh zprávy dřív, než divák
  dočte obsah, a „Na vodě" neřekne nic; navíc stojí jedno slovo od
  `lod: "Na startu"` (`:834`), což je jiná zpráva, a obě mohou vyjet z jednoho
  snímku.
- **Návrh** — nadpisek **„Souboj"**: to slovo už pro tentýž jev používá režie
  (`rezie-tabule.ts:65, 177`), takže jedna věc = jedno jméno. **Titulek musí
  nechat každé jméno lodi v prvním pádě**, tvarem jako dojezd
  (`tabule-udalosti.ts:218`): *„2. LUNA"*, detail *„posun z 3. místa ·
  4. rozjížďka"*. „LUNA předjela Izolepu" vyžaduje čtvrtý pád a rod jména, které
  ho spolehlivě nemá (*Izolepa*, *24hodinovka*) — to je past „Jarní vítr
  uložena" (`docs/PLAN.md:5870`), kterou projekt jednou zaplatil. Celý
  `tabule-udalosti.ts` dnes jméno lodi neskloňuje ani raz; ať to tak zůstane.

### 4. Pět nadpisků z dvanácti opakuje slovo z vlastní karty

- **Nález** — `obrazovka.tsx:823–834` proti titulkům v `tabule-udalosti.ts`:

  | druh | nadpisek | titulek / detail |
  |---|---|---|
  | `dokonceno` | Rozjížďka | „4. **rozjížďka** dojeta" (`:190`) |
  | `zrusena` | Zrušeno | „4. rozjížďka **zrušena**" (`:183`) |
  | `trat` | Trať | „**Trať** schválena" (`:121`) |
  | `ceka` | Čeká se | „**Čeká se** na trať" (`:134`) |
  | `lod` | Na startu | detail „**na startu** · J. Hradil" (`:159`) |

- **Proč to vadí** — nadpisek je verzálkami a v barvě druhu, čte se první a je to
  jediná řádka, kterou divák vidí dřív než obsah. V pěti případech z dvanácti na
  ní stojí slovo, které si o řádek níž přečte znovu — karta tím nese jednu
  informaci místo dvou. U `ceka` je nadpisek navíc **věta**, přestože komentář
  nad sadou slibuje „jedno slovo" (`:821`).
- **Návrh** — pravidlo: *nadpisek nesmí obsahovat slovo, které je v titulku nebo
  v detailu téže karty.* Naplní ho čtyři změny: `ceka` → **„Zdržení"**;
  `dokonceno` → nadpisek **„Dojeto"** a titulek *„4. rozjížďka"*; `zrusena` →
  titulek *„4. rozjížďka"* (nadpisek zůstává); `lod` → detail bez „na startu",
  tedy *„J. Hradil"*. U `zavod` (`:148`) se k tomu **vymění řádky**: dnes je
  titulek *„Dojeto"* a jméno regaty v detailu — jméno je to větší a patří nahoru,
  nadpisek *Regata* a detail *dojeto* zbytek doříkají.

### 5. „v cíli" říká na jedné obrazovce tři různé věci

- **Nález** — v podobě `mapa` je naráz nadpisek karty **„V cíli"**
  (`obrazovka.tsx:826`), přelétavý lepík **„v cíli"** u řádku
  (`app/mapa-trackeru.tsx:1832`, 6 s) a trvalý štítek **„v cíli"** v pořadí
  (`:1923`). Komentář u lepíku to ví: *„«v cíli» u řádku zůstane tak jako tak"*
  (`:1165`).
- **Proč to vadí** — dvě z těch tří jsou **zpráva** („právě dojela"), třetí je
  **stav** („je dojetá"). Rozdíl nesou jen velikost a místo, a ty se přes
  místnost nečtou jako gramatický rozdíl: divák, který přijde o dvě minuty
  později, čte u tří řádků totéž co na čerstvé kartě.
- **Návrh** — tři různé jobs, tři různá slova: karta **„Cíl"** (jedno slovo,
  nadpisek druhu), lepík **„právě dojela"** (minulý čas = právě se stalo), štítek
  v pořadí zůstává **„v cíli"** (stav). Rod: *dojela* se shoduje s *lodí*, ne se
  jménem lodi, takže u *Izolepy* ani *RACKA* nic nepraskne — jméno v té větě
  nestojí.

### 6. Lodě se počítají na čtyřech místech čtyřmi způsoby; ta v `lib/` lže ve svém komentáři

- **Nález** —
  - `lib/tabule-udalosti.ts:72` `lodi()` vrací `${kolik} ${kolik < 5 ? "lodě" :
    "lodí"}`. Komentář nad ní slibuje *„dvě lodě", „pět lodí"*, tedy číslovku
    slovem; kód vydá **„2 lodě", „5 lodí"**. (Zadání kola 1 ten komentář
    odcitovalo jako fakt — já jsem mu věřil taky, než jsem řádek otevřel.)
  - tatáž funkce dá pro 1 a 0 **„1 lodě"** a **„0 lodě"**; dnes to drží jen
    podmínka `zDavky >= 2` o sto padesát řádků níž (`:225`).
  - `obrazovka.tsx:901` `jesteLodi()` míchá číslovku slovem s číslicí: *„a ještě
    jedna loď"* vs *„a ještě 3 lodě"*.
  - `tabule/atributy.tsx:36` `lodi()` je jediná správná (ošetří 1 i 0) — a je
    v souboru, který nikdo neimportuje (nález 12).
  - týž fakt má v podobách `mezi`/`po` čtvrté znění: *„a další 3"*
    (`vysledky.tsx:169`) proti *„a ještě 3 lodě"* v panelech (`obrazovka.tsx:891`).
- **Proč to vadí** — tabuli nikdo neobsluhuje (rámec 2), takže „1 lodě" by na ní
  viselo do rána, a nejpřístupnější z těch funkcí je právě ta nehlídaná v `lib/`.
  Čtyři znění jednoho faktu jdou navíc proti pravidlu, které si tabule sama
  napsala: *„aby se tabule mezi fázemi dne nepřevlékala"* (`obrazovka.tsx:633`).
- **Návrh** — jedna exportovaná funkce v `lib/tabule.ts`: `pocet(kolik, ["loď",
  "lodě", "lodí"])`, vždy číslicí (shoduje se s *„a další 3"*), s 1 i 0 uvnitř,
  a všechna čtyři místa na ni. Komentář na `tabule-udalosti.ts:72` opravit, ať
  neslibuje číslovku slovem.

## Co bych potřeboval vědět

- **Filipovi:** má se slovník stavů zápisu rozdvojit na divácký (`ZAPIS`)
  a správcovský (`STAVY`), nebo chceš stejná slova všude? `ZAPIS` existuje právě
  jako ten divácký a dnes se nikde neukazuje.
- **5-jachtingu:** je *„Zdržení"* správné slovo pro stav, kdy se přestavuje trať
  nebo se čeká na její přijetí? A sedí *„Souboj"* na to, co hlásí tracker
  (prohození v čele), nebo se tomu na vodě říká jinak?
- **1-rezii:** bude-li pátá podoba pro start, pojmenuješ ji `start`? Má-li krýt
  i proceduru před prvním signálem, bude potřeba jiné jméno a rád ho navrhnu.
- **6-designu:** u karty `zavod` navrhuju dát jméno regaty do titulku místo do
  detailu. *Jarní vítr* i *Vánoční regata* se tím dostanou do největšího stupně —
  vejdou se?
- **7-efektům:** karta se na konci usazuje animací do panelu *Vydáno k regatě*.
  Platí to i pro karty, které do žádného panelu nepatří (dojezd, souboj)?
  Jestli ne, je nadpisek jejich jediná adresa a tím spíš musí být přesný.

## Čeho se nedotýkám

Velikost, kontrast a kolik se toho na řádek vejde (6-design) — píšu jen tvary
slov. Rytmus a kdy která karta vyjede (1-rezie). Technika přechodů (7-efekty).
Věcnost jachtařských pojmů (5-jachting): o *souboji*, *přestavbě trati*
a startovní proceduře říkám jen to, jestli se to v češtině dá napsat a sklonit,
ne jestli to na vodě platí. Patnáct časových konstant z R5 je v kódu
pojmenovaných konzistentně (`*_MS`, `*_S`) — tam nemám co dodat.

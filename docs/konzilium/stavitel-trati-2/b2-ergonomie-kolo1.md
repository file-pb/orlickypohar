# Ergonomie ovládání — kolo 1

Měřeno v prohlížeči na všech patnácti maketách (390 × 844, z
`getBoundingClientRect`), na grafu odkazů mezi nimi a na živém kódu. Klepnutí
počítám po cestách, které za regatu proběhnou dvacetkrát.

## Co je dobře

1. **Založení značky stojí dvě klepnutí a to kritické je první.** Doloženo
   odkazy: `Popis.dc.html` má osm terčů a čtyři (otočná ×2, průjezdní ×2)
   vedou rovnou na `Main.dc.html`. Dnes čtyři klepnutí a kritické je třetí
   (`stavba.tsx:338`, `:392`, `:449`) — **−50 %**, jak to první běh slíbil.
2. **Osmiřádkový seznam se vejde s rezervou.** Řádky 358 × 58, poslední končí
   **y 745** z 844, `scrollHeight` kořene 844 — **neroluje**, a je o 50 pt
   lepší než odhad prvního běhu (795).
3. **Pípni drží místo i velikost přes změnu stavu.** `Main` 358 × 86 na
   y 728–814, `Plan` 358 × 86 na y 739–825: jedenáct bodů je pod rozlišovací
   schopností palce v rukavici, návyk tedy přechod přežije. Tohle je ta
   elegance, na kterou se Filip ptá.
4. **Smazání ve dvou fázích drží rozhodnutí 6 do písmene.** Fáze 1 bez rámu
   (328 × 48), fáze 2 s rámem 2 px (328 × 52), nepohnutý terč, ~0,5 s.

## Co je špatně

### E1. Na obrazovce se zádrhelem je hlavní akce pod okrajem
- **Nález.** `Fronta.dc.html`: obsah **981 pt na 844pt obrazovce**,
  *PÍPNI ZNAČKU* na **y 865–951**, tedy celé pod hranou. Dolní pruh je
  v rolovaném obsahu a `flex: 1` se složil na nulu.
- **Proč to vadí.** Rozhodnutí 1 nežádá jen dostupnost, ale **pevné místo** —
  a jediný stav, kde pípni své místo opustí, je ten, kde už něco nefunguje.
  Rolování je v rukavicích nejhorší interakce, jakou máme, a nechtěné
  klepnutí při něm padne na *Zahodit prvek 5*.
- **Návrh.** Dolní pruh ven z rolovaného obsahu; obsah roluje nad ním.

### E2. Destruktivní terč sedí v klidové poloze palce, a to ve dvou maketách
- **Nález.** `Dvoubod`: *Zahodit rozestavěnou bránu* 358 × 48 na **y 766–814**,
  osm bodů pod *PÍPNI PRAVOU* (končí y 758). `Fronta`: *Zahodit prvek 5*
  326 × 44 na y 343, **2 pt** pod *Zkusit znovu* (326 × 54, končí y 341) —
  a bezpečná akce je o 10 pt větší než ta nevratná.
- **Proč to vadí.** Spodní hrana je místo, kam palec dopadne, když se loď
  houpne. U `Dvoubod` to první běh našel a závěr uzavřel: terč se stěhuje do
  hlavičky (kolo 3, bod δ). Maketa překreslená 20. 11. ho má pořád dole —
  **nedotažená oprava, ne nové rozhodnutí.**
- **Návrh.** `Dvoubod`: zahození do hlavičky. `Fronta`: nejmíň 16 pt mezery
  a zahození ne menší než akce nad ním.

### E3. Ve stavu „hotovo" a v režimu přerovnání pípnout nejde
- **Nález.** `Hotovo.dc.html`: žádný terč kromě ztlumeného *Nahlásit hotovo*
  (358 × 60, y 730), vlastní hlavička, **pípnutí nikde**. `Poradi.dc.html`:
  **nula terčů nad 44 pt**, *Přidat značku* je ikona 26 px s textem v řádku
  bez plochy a z režimu nevede ven žádný terč.
- **Proč to vadí.** `NAVRH.md:530–538` to má napsané správně — *„pípnutí je
  hlavní akce vždycky"* —, nakreslené je to naopak. Přitom v obou situacích
  stavitel sedí v motoráku: hlásí hotovo a zjistí, že chybí bóje; přerovnává
  a vidí, že jedna není pípnutá vůbec.
- **Návrh.** Obě mají mít týž dolní pruh jako `Main` (358 × 86, y 728);
  v režimu ať *Hotovo* režim ukončí a pípni zůstane.

### E4. Hlavní práce dne nemá nakreslenou obrazovku, a tedy ani změřenou cenu
- **Nález.** V žádné z patnácti maket není slovo *Přesunout* ani *Sebrat*
  (grep přes `navrh/*.dc.html`). Detail prvku, kam nálezy 7, 12, 13 a 14
  ukládají své akce, nakreslený není a cesta do něj neexistuje: řádky
  v `Main` nejsou terče a v živém kódu jsou to `View` (`stavba.tsx:475`).
- **Proč to vadí.** Založení značky stojí 2 klepnutí; přesun, podle Filipa
  běžný průběh dne, stojí detail + akci + potvrzení + návrat, tedy **nejmíň
  4** — a nikdo to nepočítal, protože ta obrazovka není nakreslená.
  **Nejlevnější cesta patří té vzácnější činnosti.**
- **Návrh.** Nakreslit detail prvku a změřit ho: *Přesunout sem* a *Sebrat
  z vody* jako dva terče 44+ nahoře, fotka a barva pod nimi, mazání nejslabší
  a dole; vstupem celý řádek seznamu (358 × 56 už je).

### E5. Barva stojí 40 pt a jedno klepnutí u každé značky
- **Nález.** `Barva.dc.html`: sedm vzorků **40 × 40** s mezerami 13 pt, proti
  mezi 44 pt (`NAVRH.md:552`, `tools/kontrola-dotyku.py`). Jediný terč dole je
  *Hotovo* (358 × 60); *Přeskočit* nakreslené není, přestože ho návrh slibuje
  (`NAVRH.md:359`).
- **Proč to vadí.** Mez: 7 × 44 = 308 a šest mezer po 8 = 48, tedy **356
  z 358 dostupných** — čtyřicítka nic neušetřila. Cena: obrazovka za popisem
  zdraží každou značku z 2 na 3 klepnutí (**+50 %**) kvůli údaji, který se
  mění *„jednou za ráno"* (`NAVRH.md:362`).
- **Návrh.** Vzorky 44 × 44 s mezerou 8 pt, a barvu **ven ze zakládací
  cesty**: do detailu prvku a do řádku „dnes stavíme oranžové" na hlavní
  obrazovce. Nula klepnutí u značky, jedno za ráno.

### E6. Z obrazovky „co jsi pípnul" nevede cesta zpátky
- **Nález.** `Popis.dc.html` má osm terčů a všech osm zapisuje typ: žádná
  šipka zpět, žádné „byl to omyl". Dnešní kód cestu zpět má v každém kroku
  (*Zahodit rozdělaný prvek*, `stavba.tsx:407`, `:434`, `:459`).
- **Proč to vadí.** *PÍPNI ZNAČKU* je 358 × 86 v klidové poloze palce, tedy
  nejpravděpodobnější nechtěné klepnutí na obrazovce — a jediné, po kterém se
  nedá nic nedělat. Náprava: typ (1) → řádek (1) → detail (1) → smazání ve
  dvou fázích (2) = **pět klepnutí**, a mezitím odejde na server prvek, který
  na trati není.
- **Návrh.** Obrysový terč v hlavičce: *Nebylo to nic* — zahodí polohu, nic
  neodešle, vrátí na `Main`. Není to „popíšu potom", je to „nepípal jsem".

### E7. Varianta se jako nakreslená ptá před druhým pípnutím
- **Nález.** Všechny tři dlaždice ve `Varianta.dc.html` (358 × 90) vedou na
  `Dvoubod.dc.html`, tedy na obrazovku s *PÍPNI PRAVOU*. Závěr prvního běhu
  počítá opačný sled: *„pípni → typ → pípni → varianta"* (bod 2).
- **Proč to vadí.** Mezi konci brány se popojíždí. Varianta před druhým
  pípnutím staví před časově kritický krok rozhodnutí, které čas nemá — ta
  vada, kterou nález 1 odstraňuje. A klepnutí jsou to čtyři v obou sledech.
- **Návrh.** Srovnat se závěrem: u dvoubodových z `Popis` rovnou na `Dvoubod`
  a varianta po druhém pípnutí; chybí jen hrana `Dvoubod` → `Varianta`.

### E8. Ve stavu „jedeš podle plánu" nemá značka mimo plán terč
- **Nález.** `Plan.dc.html`: obsah 879 pt na 844, takže řádek *„Značka
  v plánu nestojí? Pípni ji jako novou."* padá **pod hranu**. A je to věta,
  ne terč: jediný terč dole je *JSEM U NÍ* (358 × 86).
- **Proč to vadí.** Buď je *Jsem u ní* totéž co pípnutí — pak ta věta nic
  neříká a bere místo, které obrazovce chybí —, nebo totéž není a jedna ze
  dvou akcí nemá terč. Návrh tvrdí první (`NAVRH.md:532–534`), maketa druhé.
- **Návrh.** Jedno tlačítko, jedno chování: pípnutí měří polohu tady a server
  si poradí, jestli tím nahrazuje plánovaný záznam.

### E9. Úchyt na přerovnání je nejmenší terč v celé sadě
- **Nález.** Úchyt v `Poradi.dc.html` je **24 × 15 pt** (tři řádky tříbodových
  tečísek s mezerou 3 px) — pro gesto, které si návrh sám označil za
  nejtěžší, jaké obrazovka může mít (`NAVRH.md:415–419`).
- **Proč to vadí.** Přetažení se musí nejdřív uchopit, a uchopení je míření;
  patnáct bodů na výšku je pod mezí dvakrát. Buď je terčem celý řádek
  (358 × 56) a úchyt jen obrázek — pak ale gesto vystřelí při rolování, čemuž
  měl režim právě zabránit —, nebo se musí trefit tenhle pásek.
- **Návrh.** Úchyt nejmíň 44 × 56, celá pravá hrana řádku. Zapsaná cesta
  zpátky platí: *výš / níž*, dva terče 44 × 44, bez gesta i bez závislosti.

## Co bych potřeboval vědět

- **Filip:** kolik fotek se vejde do dne? Dvě na značku při dvaceti je
  **čtyřicet** spuštění fotoaparátu, každé s potvrzením snímku mimo appku.
  Značka stojí 2 klepnutí, fotky k ní nejmíň 4. U *každé*, nebo u sporných?
- **Filip:** otázka 5 ze závěru pořád visí (četnost kombinací). Rozhoduje,
  které dva řádky z osmi stojí nahoře — tam jde palec bez čtení.
- **2-design:** vzorky 44 × 44 s mezerou 8 pt zaberou 356 z 358 pt šířky.
  Unese to vizuálně, nebo jsou lepší dva řádky po čtyřech?
- **3-ux:** *Nebylo to nic* v hlavičce `Popis` (E6) — rozbije ti to stav
  „pípnuto, nepopsáno", nebo ho naopak uzavírá?

## Čeho se nedotýkám

- **Barva, kontrast, typografie, hierarchie ploch** — obor 2. Jestli je 40pt
  vzorek vidět, je jeho otázka; že je pod mezí, je moje.
- **Smysl toku, prázdné stavy, chování při chybě** — obor 3. Model „jedna
  obrazovka ve stavech" posuzuju jen tam, kde se z něj stane cena (E3).
- **Jak se trať staví a jestli jsou znaky a tvary správné** — obor 5. **Cena
  nativní závislosti a datum podpisu** je rozhodnutá; zmiňuju ji jen jako
  důvod, proč má *výš / níž* zůstat zapsané.
- **Chybějící odkazy mezi maketami** beru jako nedbalost makety — hlas z toho
  dělám jen tam, kde chybí **obrazovka**, ne odkaz, tedy u E4.

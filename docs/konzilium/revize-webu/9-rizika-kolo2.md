# 9-rizika (bezpečnost a rizika) — kolo 2

Měření jsou proti řádkům kódu; na mocku jsem nic neodeslal. Posudky 1, 3, 5, 7, 8 jsem
četl celé, z 2-design a 10-grafik osnovu nálezů a otázky — na můj obor nemíří nic.

## Kde ustupuju

- **A, místo — 1-ergonomie, 3-ux, 7-psycholog.** Úkony zůstanou na kartě pod „Další úkony"
  s následkem větou. Okno regaty pro ně místo nemá: je to přesměrování bez vlastního obsahu
  (3-ux, `zavod/[zavod]/page.tsx:60–75`) a stavět kvůli třem úkonům novou obrazovku je
  přestavba, ne revize. Riziku stačí, že úkon není jedno klepnutí v řadě osmi stejných karet.
- **K — 7-psycholog.** Beru „Skrýt na webu" (moje „z webu" je horší čeština) a „Sundat
  z vývěsky" pro zprávu. Trojice: **Skrýt na webu · Sundat z vývěsky · Smazat soubor**.
  Slovo „stáhnout" zůstane jen pro uložení souboru („Stáhnout GPX").
- **H, „Schovat ročník" — 1-ergonomie.** Podle mého pravidla níž druhé klepnutí nepotřebuje:
  omyl je hned vidět (červená hláška, `kalendar/page.tsx:161–165`) a vrací se jedním klepnutím.
  Za rozbalovač patří z jiného důvodu — rámec 6: použije se dvakrát za sezónu, nemá mít váhu.
- **Moderátor.** Záznam „kdo to udělal", verze fotek, transakce mazání a opravná zpráva do
  telefonů jdou do plánu, v kolech je nehájím. Výjimka je jedna, viz Podmínka 1.

## Kde držím

- **A, server: Odjetý → Vypsaný nemá projít, dokud má regata výsledky venku. Měření:**
  1. Projde. `Kalendar.ProcNejde` pouští sousední krok oběma směry (`Kalendar.cs:84–88`),
     smí ho i pořadatel té jedné regaty (`:41–44`, `KalendarEndpoints.cs:172–173`).
     `PrepniStavAsync` přepíše jen stav (`KalendarSprava.cs:417–424`); výsledky ani
     publikace rozjížděk se nedotkne.
  2. Regata vypadne z průběžného pořadí jako sloupec (`PoradiEndpoints.cs:85`) i s body
     (`:105`); škrty se všem lodím přepočítají bez ní.
  3. Veřejné výsledky regaty zůstanou viset: `StavZavodu.Odjety` se ve `Features/` mimo
     pořadí veřejně nikde nečte (hledáno). Web tedy ukazuje výsledky, které pohár nepočítá.
  4. **Vrátí se to samo.** Automat zavírá každou vypsanou regatu s dojetou rozjížďkou starší
     dvou dnů (`Uzavirani.cs:85–91`), běží jednou denně a při každém startu služby
     (`UzavreniRegat.cs:22`), a přepíše štítek na „uzavřeno samo" (`:83–84`). Krok zpět
     u srpnové regaty tedy žije nejvýš den: pohár se mezitím přepočítá tam a zpátky a po omylu
     nezůstane nic než nepravdivý štítek.
  Protiargument „je to vratné" tím padá — úkon, který za člověka vrátí robot, není nástroj,
  ale past. **Rozhodne-li se proti:** „Další úkony" ji jen schovají; pravidlo „odjetý závod
  zrušit nejde" (`Kalendar.cs:74–77`) dál obejdou dvě klepnutí.
- **B, měření: „Zrušit prezenci" u lodi s výsledky projde, body třídy nemění.**
  `ProcNejdePrepnout` lodi s výsledky zakazuje jen stavy Zrušena, Odmítnuta, K doplnění
  a Nedostavila (`Prihlasky.cs:114–117`); Přihlášená mezi nimi není. Do rozpravy to smí
  pořadatel, po ní jen rozhodčí (`:76–81`, `PrihlaskyEndpoints.cs:149–152`). Body se nehnou:
  „přihlášená do závodu" je Přihlášená i Potvrzená stejně (`Bodovani.cs:44–45`,
  `PoradiEndpoints.cs:143`). **Tvrzení 5-jachtingu o A5.2 tedy neplatí pro tenhle úkon** —
  platilo by pro odhlášení, a to API odmítne. Co se stane doopravdy: loď spadne na veřejné
  listině mezi nepotvrzené (`ZavodEndpoints.cs:196`), ač má výsledky, a příští uložení zápisu
  ji potvrdí zpátky (`ZapisSprava.cs:351`). Není to past, je to **zbytečné tlačítko** — má
  5 pravdu, že se lodi s výsledky nabízet nemá. Do Podrobností s ním souhlasím.
- **H, pravidlo.** *Druhé klepnutí (rozbalovač s větou o následku) dostane úkon, jehož omyl
  (1) nejde na téže obrazovce jedním klepnutím vrátit, nebo (2) ho ten, kdo klepl, na téže
  obrazovce neuvidí.* K otázce 1-ergonomie: vratnost stačí, jen když je omyl vidět. Rozbalovač
  „Další úkony" se jako druhé klepnutí počítá; třetí nechci nikde. Dnes pod pravidlo spadá:
  - (1) Smazat přihlášku · Odebrat a Nahradit fotku papíru · Odebrat roli (ročník i web) ·
    Odebrat vazbu k lodi (`lode/page.tsx:424–427`) · Zrušit regatu — zpět vede jen přes
    Plánovanou, nové potvrzení a nové vypsání (`Kalendar.cs:79–82`) · „Smazané" u článku, dokud
    výpis nemá oddíl smazaných.
  - (2) Vrátit mezi vypsané a Skrýt na webu **u odjeté regaty** (pohár) · Vyndat z poháru ·
    Pustit výsledky ven (telefony) · přidání lodi mimo listinu (bod J).
  - Už ho mají: zrušení rozjížďky, klíč trackeru, smazání trati, verze směrnice.
  - **Nespadá:** Zrušit prezenci, kroky vpřed, Zveřejnit, Skrýt na webu u neodjeté regaty,
    Vystavit kód, „Skryté" u článku. Tam je druhé klepnutí jen zdržení.
  **Rozhodne-li se proti:** zvětšení cílů na 44 px (rámec 8) udělá z mazání nejsnáz
  trefitelná tlačítka obrazovky.
- **H, bod 15 (štítek role jako mazací tlačítko) — jinak.** Pravidlo samo říká, jak z něj
  ven: když hláška po odebrání ponese „Vrátit roli" na jedno klepnutí, omyl je vidět i vratný
  a štítek smí zůstat, jak rozhodlo konzilium 12. 11. Bez toho držím rozbalovač: dnes roli
  vrátí jen zbylý správce, který zná e-mail (`opravneni-webu/page.tsx:150–160`).
- **H, fotka papíru.** Verze jdou do plánu; do té doby „Odebrat" i „Nahradit" za rozbalovač
  (`vysledky/[zavod]/[cislo]/page.tsx:386–419`). Lhůtu držení nechávám 5-jachtingu.
- **J — s 5-jachtingem: 16 lodí listiny a výslovný úkon „Přidat loď mimo listinu".** Horší
  je výsledek zapsaný cizí lodi, protože selže potichu a natrvalo: zápis lodi bez účasti
  účast sám založí a potvrdí (`ZapisSprava.cs:341–351`), bez otázky, kterou jinak pozdní
  přihláška dostává (`PrihlaskySprava.cs:223–226`), a mimo zámek listiny po rozpravě.
  Vymazání omylu smaže výsledek (`:373–374`), **účast ne** — loď zůstane „přihlášená do
  závodu", na veřejné listině, a třídě zůstane o bod vyšší každý kód. Chybějící loď naproti
  tomu selže nahlas: stojí u mola a rozhodčí ji v zápisu nenajde. **Rozhodne-li se proti**
  (zůstane 37): aspoň oddělit řádky mimo listinu nadpisem a větou „zápis loď přihlásí
  do závodu".

## Kde jsme se shodli

- Karta regaty v kalendáři: stav, „Otevřít regatu →", sedm odkazů pryč; úkony pod „Další
  úkony" (A — po mém ústupku čtyři obory z pěti).
- „Zrušit prezenci" a „Vystavit kód" do Podrobností; prezence je jediný krok s vahou (B).
- „Schovat ročník" za rozbalovač s větou (7, 1 a já — každý z jiného důvodu, výsledek týž).
- Tabule se na telefonu nenabízí (E) — z mého oboru bez námitky k žádné ze čtyř cest.
- Trojice sloves z bodu K, pokud 7 přijme „Smazat" pro verzi směrnice.

## Nové, co vylezlo z cizích posudků

- **Zápis tiše mění listinu i stavy.** Kromě bodu J: uložení zápisu přepne na Potvrzenou
  každou loď s výsledkem kromě vyloučené (`ZapisSprava.cs:351`) — tedy i odhlášenou nebo
  odmítnutou. Je to záměr („loď s výsledkem přijela"), ale obrazovka to neříká.
- **Krok zpět u regaty přepisuje automat** (viz A, bod 4). Nikdo to v kole 1 neměl.
- **Odpovědi:**
  - *5-jachting:* prezenci lodi s výsledky pořadatel zrušit smí (do rozpravy), bodů se to
    netkne; odjetou regatu z webu pořadatel stáhnout **nesmí**, jen správce ročníku
    (`KalendarEndpoints.cs:190`) — ten ale bez důvodu a jedním klepnutím.
  - *7-psycholog:* „Vrátit mezi vypsané" projde a je to past, kterou do dne vrátí robot;
    „Zrušit prezenci" projde a je to zbytečné tlačítko. API neodmítne ani jedno.
  - *8-pr:* skutečná jména s vymyšlenými body jsou škoda na cizím jménu a z vyhledávače se
    nevrací hned — `noindex` ukázkového ročníku patří před cokoliv, co web zviditelní
    (`openGraph`), ne za to.
  - *3-ux:* životnost tokenu na produkci neznám, nastavuje ji poskytovatel identity mimo
    tenhle repozitář; krátký token je správně a lék je návrat přes `kam`, ne delší život.
  - *1-ergonomie:* viz pravidlo v H — vratnost stačí u omylu, který je vidět.

## Podmínka

1. **Než se kalendář přestaví, server přestane krok Odjetý → Vypsaný nabízet u regaty
   s výsledky venku.** Je to jedna podmínka v `Kalendar.ProcNejde`, žádný nový model; bez
   ní se přestavbou jen přestěhuje tlačítko, které mění pohár a které robot do dne přepíše.
2. **Druhé klepnutí u úkonů ze seznamu (1) nejpozději v téže změně, která zvětší cíle na
   44 px.** Opačné pořadí riziko na čas zvýší — nejdřív se mazání snáz trefí, pojistka až potom.

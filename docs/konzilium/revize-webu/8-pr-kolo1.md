# PR a marketing — kolo 1

## Co je dobře

1. **Fotky jsou skutečné a silné** (`web/public/foto/`, červený spinakr, zámek
   Orlík, kredit „Foto Jiří Tašl"). Je to jediný materiál webu, který se dá
   poslat dál bez vysvětlování, a odlišuje ho od svazových webů s tabulkou.
2. **Živá věta z dat** (`web/app/page.tsx:141–165`): „Odjeto 7 z 8 regat · Vedou
   … · Další: …". Říká, že se něco děje, nikdo ji nemusí psát a dá se citovat.
3. **Web nelže o stáří obsahu**: „Konečné pořadí 2026", „Letos se zatím
   nejelo", „tohle je od svazu", přiznaný výpadek. Kdo jednou zjistí, že web
   mluví pravdu i proti sobě, věří mu i výsledky.
4. **Jeden hlas**: tyká a mluví lidsky („Nevíš, proč má loď zrovna takové
   číslo?"). Na komunitu jedné přehrady to sedí líp než úřední tón.
5. **Je proč se vracet i mimo regatu**: vodočet, vítr, teplota vody. Návštěva
   v týdnu je to, co se dá nabídnout partnerovi — výsledky jsou osmkrát ročně.

## Co je špatně

Měřeno na 375 × 812. Návštěvníka bez přihlášení jsem viděl na produkci
(27. 11. 2026), mock jen přihlášený — pás partnerů tam proto vidět není.

### 1. Odkaz poslaný dál nenese obrázek ani větu
- **Nález** — produkční úvod má v hlavičce jen `<title>` a `description`;
  `og:image`, `og:title` ani `twitter:card` neexistují nikde (`openGraph`
  v `web/app` nula výskytů, `layout.tsx:19–25`). Článek má titulek a perex,
  obrázek ne (`novinky/[clanek]/page.tsx:14–22`); regata jen název.
- **Proč to vadí** — závodníci si posílají odkazy ve WhatsAppu a na Facebooku.
  Tam se odkaz ukáže jako holý řádek; fotka, nejsilnější věc webu, necestuje.
- **Návrh** — `openGraph` v `layout.tsx` (snímek 1200 × 630 z `hero.jpg`, jméno
  webu) a ve třech `generateMetadata`: článek svůj obrázek, regata „název ·
  datum · pořadatel", pořadí „Průběžné pořadí 2026". Javascript to nechce.

### 2. Web má tři jména
- **Nález** — v kruhu loga „Orlik Yacht Series", vedle něj nápis „Orlická
  série" (`logo.tsx:28`, na přání rozhodčího 22. 9.), v titulku, `h1`, adrese
  a nadpisu ročníku „Orlický pohár"; `h1` úvodu je navíc skrytý
  (`page.tsx:135`). Nápis vedle loga je šrafovaný a na tmavém skoro nečitelný.
- **Proč to vadí** — nový člověk po první obrazovce neřekne, jak se to
  jmenuje. Novinář napíše jedno ze tří, hledání podle druhého nenajde nic.
- **Návrh** — nést jedno: **„Orlický pohár"** (adresa, titulek, trofej). Kruh
  zůstane znakem, nápis vedle něj se vrátí na „Orlický pohár" a „Orlická
  série" zůstane v běžném textu. Je to proti rozhodnutí z 22. 9. — vědomě.

### 3. Úvod neříká nováčkovi, co to je a jak se přidat (otázka 3)
- **Nález** — první viditelný text je řádek 11,52 px verzálkami (audit E),
  hned pod ním jména lodí. Nejlepší věta webu — „8 regat · 7 odjetých ·
  37 přihlášených lodí" — stojí drobně až na stránce ročníku. Vstup pro
  závodníka je pod třemi tečkami (`menu.tsx:41–46`) a míří na ty, kdo už loď
  mají. Auditních 543 px k první regatě platí pro mock po sezóně; na produkci
  je „Další: Jarní vítr" na 313 px, ale jako 14,4px text s cílem 16 px.
- **Proč to vadí** — fanoušek se zorientuje, nový závodník ne: neví, kdo smí
  jet, kolik to je víkendů ani kam klepnout. Web tak slouží těm, kdo už jezdí.
- **Návrh** — pořadí první obrazovky: (1) čitelná věta z dat, aspoň 16 px:
  „Osm regat na Orlíku od dubna do září, 37 lodí ve třech třídách";
  (2) živá věta; (3) dvě tlačítka 44 px: **„Chci závodit"** (vypsání nejbližší
  regaty) a **„Výsledky"**. Teprve pak pořadí a kalendář.

### 4. Vítěz se nedá vyfotit a mimo sezónu úvod mlčí
- **Nález** — při loňském pořadí je `vedou` schválně prázdné
  (`page.tsx:91–95`), takže od října do dubna zbude jen „Další: Jarní vítr,
  15. května". Řádky pořadí jedou (`karusel-poradi.tsx:89`): tři moje snímky
  produkce po sobě ukázaly „1. SEA MOUSE III", „5. ČERVENÉ CAFE", „2. MODRÉ CAFE".
- **Proč to vadí** — vítěz ročníku je nejsdílenější fakt, jaký seriál má,
  a web ho sedm měsíců neřekne větou. Snímek obrazovky zachytí náhodné místo.
- **Návrh** — u konečného pořadí věta „Ročník 2026 vyhráli SEA MOUSE III, PEZI
  a LUNA"; první tři každé třídy stojí, pohybuje se nejvýš zbytek.

### 5. Novinky mluví cizím hlasem
- **Nález** — produkce 27. 11.: blok „Novinky" na úvodu je celý ze svazu,
  druhá položka „ZÁPIS Z LISTOPADOVÉHO JEDNÁNÍ VV ČSJ 2026". Na stránce
  novinek má první karta nad titulkem prázdnou plochu zhruba 160 px (čteno ze
  snímku; nevím, jestli obrázek chybí, nebo se nenačetl).
- **Proč to vadí** — druhé nejviditelnější místo webu nese zápis ze schůze
  jiné organizace. Partner to čte jako „tady se nic neděje".
- **Návrh** — převzaté články na úvodu nikdy jako velká karta a nikdy samy:
  nejvýš dva řádky pod nadpisem „Ze svazu". Není-li vlastní novinka, blok
  „Novinky" se na úvodu neukáže.

### 6. Pás partnerů je slib, který se partnerovi nedá ukázat (otázka 4)
- **Nález** — na 375 px je pás pevný, 64 px, vejde se 2,3 loga a jedou; po
  načtení jsou místo log chvíli bílé dlaždice (`loading="lazy"`,
  `partneri.tsx:79`). Nadpis je skrytý. V jedné řadě stojí svaz, marina,
  pořádající kluby, charita a závodní tým. Nikde nejsou všichni pohromadě.
  **Auditních 15 % platí pro přihlášeného.** Návštěvník na produkci má
  hlavičku 110 px (odkaz „Přihlásit" ji zalomí na dva řádky) + počasí 57
  + partneři 64 = **231 px, 28 % výšky**.
- **Proč to vadí** — partnerovi se nedá poslat snímek „tady jste". A logo, které
  cizímu člověku trvale bere desetinu čtení, na sebe váže podráždění, ne přízeň.
- **Návrh** — na konec úvodu stojící blok „Partneři a pořadatelé": osm log
  v mřížce se jmény. Na šířce telefonu pás nepřipínat, nechat ho na konci
  stránky; „Přihlásit" tam schovat do nabídky, hlavička se vrátí na 67 px.

### 7. Veřejný web tvrdí, co neplatí
- **Nález** — produkce 27. 11.: regata Jarní vítr (15. 5. 2027, „vypsáno") hlásí
  „Právě se jede 4. rozjížďka. Sledovat na tabuli →" (`upozorneni.tsx:127`).
  Pruh „Ukázková data" je jen nad ročníkem 2026, nad 2027 ne. `robots.txt`
  pouští vyhledávače; ve výsledcích jsou skutečná jména lodí s vymyšlenými
  body, včetně „LUNA −1".
- **Proč to vadí** — první snímek, který někdo pošle do skupiny, bude „podle
  webu se v listopadu jede". A vymyšlený výsledek skutečné lodi se z vyhledávače
  nevrací.
- **Návrh** — větu „Právě se jede" ukazovat jen v den regaty a stránkám
  ukázkového ročníku dát `noindex`, dokud nevyjde první ostrý.

### 8. Stránka appky se omlouvá, místo aby nabízela
- **Nález** — podtitulek „Totéž co na webu" (`appka/page.tsx:59–62`) nedává
  důvod instalovat, ač appka umí upozornění a záznam trasy. Chybí snímek
  appky. Třetinu textu tvoří Play a blokování na Samsungu. „Pro iPhone zatím ne
  … 99 dolarů ročně. Zaplatí se, až bude o appku zájem" (ř. 147–152). „Napiš
  nám" — a web nemá kam.
- **Proč to vadí** — majitel iPhonu čte, že za 99 dolarů nestojí; partner čte
  rozpočet. Stránka se nedá ukázat jako „máme appku".
- **Návrh** — nahoru dva snímky appky a tři věci, které web neumí; iPhone jednou
  větou „Pro iPhone připravujeme, do té doby poslouží web v telefonu"; návod
  k instalaci mimo obchod pod `<details>`.

### 9. Není koho oslovit
- **Nález** — kontakt na seriál na veřejném webu není (`mailto`/kontakt jen
  u pořadatele regaty, v přihlášce a osobních údajích). „Historie série" je
  seznam ročníků, ne příběh.
- **Proč to vadí** — novinář ani možný partner nemají dveře; skončí u toho,
  koho znají osobně, nebo nikde.
- **Návrh** — na `/historie` (adresa se nemění) tři odstavce nahoře: co seriál
  je, od kdy, kdo ho pořádá, jeden e-mail. Z úvodu odkaz „O seriálu".

## Co bych potřeboval vědět

- **Filip:** kdy jde web ven s ostrými daty a pod jakou adresou? Subdoména
  `klihovka.cz` se na plakát ani do tiskové zprávy nedává.
- **Filip (za Miloše):** které jméno je hlavní — a smí se „Orlická série" vedle
  loga znovu otevřít?
- **Filip:** co přesně je partnerům slíbeno — trvalá viditelnost, nebo
  přítomnost? A je mezi osmi logy rozdíl (sponzor × pořadatel × svaz)?
- **5-jachting:** jaký je skutečný první krok nového závodníka, kam má vést
  „Chci závodit"? A je „vítěz ročníku" po třídách, nebo i celkový?
- **10-grafik:** výřez fotek na 375 px — na snímku se zámkem jsem loď neviděl —
  a jestli fotka za pořadím a kalendářem ještě nese, nebo jen tmavne (dojem).
- **7-psycholog:** dva pohyblivé pruhy naráz (pořadí, partneři) — unavují?
- **9-rizika:** skutečná jména lodí s vymyšlenými výsledky ve vyhledávači.

## Čeho se nedotýkám

- **Správy** (otázky 1, 2, hustota C) — venku se nevidí; 1-ergonomie a 3-ux.
- **Tabule na telefonu** (otázka 5) — jen hlas: písmo 2,9 px za odkazem
  z veřejné regaty je ostuda navenek, radši odkaz na telefonu nenabízet.
  Podobu nechávám 2-design a 5-jachting.
- **Dlouhých stránek** (otázka 6), kontrastu, cílů pod 44 px a vad A1–A3.
- **Krásy a jednoty** (otázka 7) — 10-grafik a 2-design; já jen jméno (bod 2).
- **Mobilní appky samotné** — posuzuji jen stránku, která ji nabízí.

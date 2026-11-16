# Psycholog — kolo 2

## Kde ustupuju

**A, tvar úložiště — ustupuji 3-ux.** Moje „vlastní tabulka, popis ji
překlopí do fronty" řeší přežití a **rozvazuje pořadí** — scénář 3-ux/1
a 9-rizika/3. Řádek **ve frontě bez popisu**, který se neodesílá a drží
pořadí, řeší obojí na jednom místě, a je levný: `zarad` je `runSync`
(`fronta.ts:130`), tedy hned na disku, a `prvniKOdeslani` tutéž zábranu
už umí pro odmítnutý (`fronta.ts:164`).

**A, „uložená" — ustupuji z tvaru, držím podstatu.** Nežádal jsem vlastní
tabulku, ale krytí pro to slovo. S řádkem ve frontě ho má, takže námitka
proti `Popis.dc.html:26` padá — až ten řádek bude.

**A, text tlačítka — ustupuji 3-ux.** *Popíšu potom (další prvky počkají)*
je lepší než moje *(budou 3 bez popisu)*: pojmenuje překážku, ne účet.
Dluh v paměti je abstraktní, zastavená práce ne.

**C, kanál — ustupuji 2-design.** 1,09:1 a 1,00:1 při protanopii jsou
měření, proti kterému nemám co postavit: tečka stav nést nemůže a žádný
token ve světlé sadě to nespraví. Proužek **musí** nést text trvale.

**D, mechanika — ustupuji 9-rizikům.** Rozdělení na vadu prvku a vadu
okolností (403, 404, 5xx, 502 z nasazení) je silnější než můj nález 6
a tabulka `zahozene` je moje „zahozeno: <věta serveru>" dotažená.

**B, částečně odvolávám sám sebe.** Napsal jsem, že „Jedna značka / Dvě
značky" je kategorie **zápisu**, ne trati. U počtu bodů to podle 3-ux
neplatí: je to jediná věc, kterou appka po pípnutí **nedovodí**, protože
váže dvě měření do jednoho prvku — je vynucená, ne vymyšlená.

## Kde držím

**C, číslo — držím, a není to „obojí".** SC 1.4.1 žádá kanál, který není
barva; nežádá číslo. Tři stavy ve **slovech** („poloha je čerstvá" /
„signál slabý — značka bude nepřesná" / „čekám na polohu z družic")
kritérium splní celé. Živé číslo nenese rozhodnutí: na ±4 → ±7 → ±11
stavitel neodpoví ničím než čekáním, a protože se hýbe, pozornost si
vybere — v pohybu je to pohled, který patřil vodě. Číslo tedy u akce
a v detailu prvku (`poloha.ts:105` má pravdu právě tam), v proužku ne.
Proti mně rozhodnuto bude proužek jediná trvale se měnící věc na
obrazovce a bude konkurovat tomu, co má podle pravidla 6 vyhrávat.
**Podmínka k těm třem stavům: hystereze.** Slovo blikající mezi „čerstvá"
a „slabý signál", jak přesnost chodí kolem `PRESNOST_K_ZAMYSLENI_M` = 25
(`poloha.ts:33`), krade pozornost stejně jako číslo a navíc se čte jako
nejistota nástroje. Nahoru na 25 m, zpátky až pod 20.

**A, nejvýš jedna nepopsaná — držím s 1-ergonomií**, a je to nutnost, ne pohodlí; důvod je v oddílu „Nové".

**A, u brány nepadá odklad popisu, padá odklad vazby.** Po prvním pípnutí
se musí odpovědět **jedna** otázka — patří k tomu druhý konec? — a ta se
odpovídá za jízdy mezi konci, tedy v době, kdy nic nemizí (`poloha.ts:40`
hlídá okamžik pípnutí, ne cestu). Druh brány, značení i směr se odložit
smějí. Odklad tedy není výjimka pro jednobodové prvky; jen se z něj vyjme
bit, který appka nedovodí. Variantu „spojit dva řádky až při popisu"
**odmítám**: přesouvá vazbu dvou měření do paměti, tedy do dohadu, který
jsem v kole 1 označil za nejhorší na celém odkladu.

**D, hlavní akcí karty je *Zkusit znovu* — držím s 9-riziky.** Člověk pod
tlakem klepne na to, co uvolní blokádu; pod ten reflex patří **nezhoubná**
akce. Zahození ať je text pod ní, s potvrzením. K otázce 2-designu: plnou
plochu to mít nemusí — uvnitř karty rozhoduje pozice, šířka a stupeň
písma. Pravidlo „jedna plná plocha" zůstane celé a reflex je obsloužený.
**Navíc:** odesílání běží samo (`odesilani.ts`), takže ruční pokus se tiše
neliší od nicnedělání — a tlačítko, po kterém se nic nestane, se zmáčkne
znovu a pak se eskaluje na to vedle, tedy na nevratné. Karta ať říká, že
to zkouší sama, a kdy naposled.

**Odpověď 9-rizikům na odemčení přijaté trati (nález 4).** Věta
o následku pomůže málo: pod tlakem se čte tlačítko, ne odstavec nad ním.
Z mého oboru to právo na motoráku být nemá vůbec — kdo odemčení
potřebuje, sedí u počítače. Potvrzení je až druhá nejlepší odpověď.

**B, přizván: doptání po pípnutí je menší zátěž než delší seznam.**
Otevřená smyčka, kterou drží **obrazovka** a zavře se za pár vteřin na
témže místě, není paměťová zátěž; zátěž je ta, ke které se člověk musí
vrátit sám a bez vodítka. To je celý rozdíl mezi doptáním a odkladem.
Druhý důvod proti jedenácti řádkům: pod zúženou pozorností lidé
nevybírají správnou položku, ale **první přijatelnou** — u sedmi je to na
hraně, u jedenácti rolujících je chybná volba pravidlo.

**E, přizván: znak mění správnost, ne rychlost.** Barva se **detekuje**,
znak se **čte**; tempo tedy dává barva a znak je pojistka, aby stav byl
vůbec dekódovatelný — a podle měření 2-designu bez něj není. Nejrychlejší
kanál tu ale není tečka, je to **vzhled hlavní akce**: jestli jde
pípnout, má říkat tlačítko samo. Mezi 12 a 20 dp nerozhoduji.

## Kde jsme se shodli

- Nepopsané pípnutí musí být na disku **a** držet místo v pořadí; tvar je
  řádek ve frontě bez popisu, který zastaví odesílání za sebou.
- Odmítnutí se dělí na vadu prvku a vadu okolností; u druhé je hlavní akce
  opakování, zahození podřízené a s potvrzením, zahozené zůstane doložené.
- Živá vzdálenost u brány: jeden stupeň se znakem směru (`↑ 63 m`), pod
  `NEJKRATSI_LINIE_M` = 5 věta, že linie nevyjde (1, 2 i já, každý jinudy).
- Nic z mých stanovisek obrazovku nezesložiťuje: přidávám jednu otázku
  mezi dvě pípnutí a hysterezi, ubírám živé číslo a neomezený odklad.

## Nové, co vylezlo z cizích posudků

**Zastavená fronta je na vodě jako cena odkladu zdarma — a proto sama
nestačí.** 3-ux i 9-rizika staví odstrašení na tom, že nepopsaná značka
zastaví odesílání. Jenže fronta existuje právě proto, že *„na vodě signál
není"* (`fronta.ts:5`–`7`): tehdy se neodesílá nic tak jako tak, cena je
v okamžiku rozhodnutí nulová a **celý dluh dopadne na břehu**, kde se
popis dělá z dohadu. Odstrašení musí být vidět hned — proto nejvýš
**jedna** nepopsaná naráz (1-ergonomie): druhé pípnutí se neodemkne,
dokud není první popsané. Jediná zábrana, která drží i bez signálu.

## Podmínka

1. **Odklad popisu se nesmí zapnout dřív, než nepopsané pípnutí žije jako
   řádek ve frontě v `stavba.db`, drží pořadí a je nejvýš jedno naráz.**
   Dokud to neplatí, je „pípni teď, popiš potom" horší než dnešek a slovo
   „uložená" se na obrazovku napsat nesmí.
2. **Trať se nesmí dát nahlásit hotovo, dokud existuje nepopsané
   pípnutí** (navazuje na 3-ux/5). Stavitel nesmí odjet od vody s pocitem,
   že je hotovo, zatímco jedno měření žije jen v jeho telefonu — po přijetí
   už ho server nevezme a následek nese závod.

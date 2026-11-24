# Dramatik — kolo 1

Měřeno kódem a scénářem dne (`docs/PLAN.md`, oddíly *Životní cyklus zastávky*
a *Průběh závodu*; `docs/TABULE-DIVAK.md`). Proti běžící tabuli jsem neměřil —
sled dějů se z ní odečítá hodinu na jeden.

## Co je dobře

1. **Karta je o tom, co se stalo, ne že se objevil řádek** — `CERSTVY_DOJEZD_S`
   a rozdělení `dojezd` / `venku` (`web/lib/tabule-udalosti.ts:193–231`):
   publikace hotové sady není dvanáct zpráv, je jedna.
2. **Kdo přijde v půlce, nedostane salvu** (`tabule-udalosti.ts:81–82`). Oblouk
   patří dni, ne načtení stránky.
3. **Nejistota se hraje jako obsah, ne jako mlčení** (`PLAN.md`, *Tabule má
   čtyři fáze dne*). Stav zápisu u pořadí odpovídá naráz na „kdo vyhrál" a „jak
   moc to platí".
4. **Poměr seznamu k záznamu je schválně nerovný** (75 : 30): výsledky jsou
   důvod, proč se divák dívá, záznam je ozdoba toho důvodu.
5. **Vzor pro režii v repozitáři je** — `web/lib/rezie-tabule.ts` a jeho
   jedenáct kontrol. Plán *dne* o úroveň výš chybí, tvar se ale vymýšlet nemusí.

## Co je špatně

### D1. Vrchol dne vypadá jako pauza mezi rozjížďkami

**Nález:** `mezi` a `po` jsou tatáž větev
(`web/app/serie/[slug]/zavody/[zavod]/tabule/obrazovka.tsx:626–658`);
`konec={rezim === "po"}` mění ve `vysledky.tsx` jedno slovo v nadpisu (`:114`)
a jednu větu (`:133`), nic jiného. **Proč to vadí:** konec regaty je jediný
okamžik, ke kterému celý den míří a u kterého se dívá celá hospoda — a dostane
obrazovku, kterou odpoledne viděla sedmkrát. To, co se dnes doopravdy rozhodlo
(změna v poháru), jde ven jen běžícím pásem jmen a bodů dole
(`obrazovka.tsx:92–108`), tedy nejslabším místem obrazovky. **Návrh:** `po`
dostane panel *co se dnes změnilo v poháru* — vítěz regaty po třídách a první
tři v sérii. Pořadí série v obrazovce už je (`:75`); rozdíl proti stavu před
regatou ve `Snimek` není, to by byla žádost o data (rámec 4).

### D2. Obrazovka nepozná „právě se jede" od „nic se neděje"

**Nález:** volba podoby (`obrazovka.tsx:303–311`) se na stav `Probiha` neptá
ani jednou; první podmínka je `zive.length > 0`, tedy *hlásí telefony* —
a průběžné odesílání poloh zatím není, tabule to u sebe píše (`:608`).
Rozjížďka bez poloh spadne do `mezi` (nebo `listina`) a jediná zmínka o tom,
že se jede, je panýlek *„jede se 0:10"* (`rozjizdky.tsx:40–48`), nejmenší prvek
na obrazovce. **Proč to vadí:** expozice, stoupání i vrchol mají jednu
obrazovku, a je to tabulka; oblouk dne je `listina → mezi → po`, tři tabulky.
Celá dramatická rovina tabule visí na fázi, která v ročníku 2026 nenastane ani
jednou. A je to horší než prázdno: tabule tvrdí „Průběžné pořadí" nad čísly
z minulé rozjížďky, zatímco se jede další. **Návrh:** podobu rozhoduje stav
rozjížďky, polohy jen její náplň — podoba „jede se" pro `Probiha` (mapa, když
polohy jsou; pořadí předchozí rozjížďky s titulkem o té běžící, když ne). Jeden
výraz na `:303`.

**Tím vyvracím R4 zpola.** Hystereze na `zive.length` kmitání zarazí, ale
upevní tu chybu, že o podobě rozhoduje technický signál, ne děj. Pojistka
potřeba je; řídit ji má stav rozjížďky.

### D3. Záznam se pustí teprve tehdy, kdy ho divák nepotřebuje

**Nález:** střídání startuje seznamem, `ukazujeZaznam` začíná na `false`
(`obrazovka.tsx:379`), takže zrychlené review přijde až po 75 s pořadí a od té
chvíle se vrací každých 105 s do konce dne. **Proč to vadí:** divák zná
výsledek dřív, než uvidí, jak se jelo — záznam nemá co stavět a v `po` je už
pětkrát viděný. Přitom minuta po dojetí je ta nejhorší v dni (`PLAN.md`,
tamtéž) a záznam je jediné, co v ní lze poctivě ukázat: rozjížďka je
`Dokoncena`, takže výdej ho pouští, a `stavVysledku` je teprve `Navrzeno`.
**Návrh:** první přehrání hned při přechodu do `Dokoncena`, jednou a celé;
pravidelné střídání teprve po něm.

### D4. Mezi startem a cílem se nestane nic, co by se dalo ohlásit

**Nález:** z dvanácti druhů událostí (`tabule-udalosti.ts:16–30`) jsou o vodě
tři — `start`, `dojezd`, `souboj`; zbylých devět je o papírech. `souboj` je
nedosažitelný a `dojezd` u regaty bez *procesního děje* taky — a tu má sedm
z osmi regat ročníku 2026 vypnutou (změřeno, `TABULE-DIVAK.md` nález 8). Zbývá
karta o startu, karta o dojetí a jedna „venku": tři karty na hodinu závodu.
**Proč to vadí:** stoupání je prázdné. Oblouk má expozici i vrchol, ale mezi
nimi hodinu, ve které obrazovka neřekne nic nového — a ta hodina je závod.
**Návrh:** do hlavního koryta pustit jediný druh souboje, prohození o vedení
(`Prohozeni.pozice === 1`, `rezie-tabule.ts:67`), nejvýš jednou za dvě minuty.
Ne každý souboj — jen ten, který mění odpověď na „kdo vyhrává".

**Tím vyvracím R2 v jeho rámování.** Odpojené to není omylem: rozhodnutí stojí
v komentáři u toho místa (`web/app/mapa-trackeru.tsx:1145–1148`, Filip
24. 10. 2026: *„Prohození velkou kartu nedostane… karta přes půl obrazovky
patří dojezdu… ne souboji, který se stane každou chvíli"*), dojezd má vlastní
o řádek níž (`:1154`). `souboj` a nadpisek *„Na vodě"* jsou mrtvé proto, že je
Filip zabil — a argument frekvencí je správný. Právě proto se nemá vracet
souboj, ale změna v čele: ta se každou chvíli nestane.

### D5. Expozice neřekne, o co se dnes hraje

**Nález:** `listina` ukazuje, kdo přijel, a větu o stavu dne
(`teaser.tsx:184`, `:194`). Kolikátá zastávka to je, kdo vede pohár a komu co
stačí, nestojí nikde — pořadí série do obrazovky chodí (`obrazovka.tsx:75`)
a dělá se z něj běžící pás. **Proč to vadí:** bez sázky nemá stoupání co
zvyšovat; dojezd třetí lodi je zpráva jen tomu, kdo ví, že třetí místo dnes
rozhoduje pohár. **Návrh:** v `listina` panel *o co se jede* — první tři
v poháru s rozdílem bodů. Počet zastávek ročníku ve `Snimek` není, to je žádost
o data (rámec 4).

## Co bych potřeboval vědět

- **5-jachting:** kolikrát se v jedné rozjížďce na Orlíku doopravdy mění
  vedoucí loď? Je-li to víc než dvakrát, padá můj návrh u D4 — „změna v čele"
  přestává být vrchol.
- **1-rezie:** kolik minut lze dát vlastní podobě `po` (D1), než se opakuje?
- **Filip:** má tabule v `po` dožít do rána na konečném pořadí regaty, nebo se
  po chvíli vrátit k pořadí poháru? Dnes dožije na regatě.
- **Filip / 4-insider:** je **vyhlášení** moment, který má tabule mít? `PLAN.md`
  ho v průběhu dne jmenuje, do modelu se nezapisuje — tabule nepozná konec dne,
  jen že regata je `Odjety`, a poslední takt oblouku nemá spoušť.

## Čeho se nedotýkám

Délek a toho, co ustoupí čemu (1-rezie; D3 říká *v jakém sledu*, ne *jak
dlouho*). Vzhledu navržených panelů (6-design). Přechodů a prostřihů (7-efekty).
Jmen podob a textů karet (8-jazyk). Věcnosti souboje a davu u bóje (5-jachting).
Čitelnosti pro nejachtaře (3-fanousek). Patnácti konstant z R5 — vada provedení
režie, ke sledu dějů mi neříká nic.

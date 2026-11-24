# Režie — kolo 1

**Na čem jsem měřil.** Na kódu a na aritmetice z pojmenovaných konstant, ne na
běžící tabuli: moje nálezy jsou o čase, a čas se z běžící obrazovky nespočítá
(týž důvod, jaký si zapsala `rezie.test.ts`). Referenční obrazovka je televize
1920 × 1080, `--tv` = 19,2 px; rozměr hraje roli jen u Š1. Co je dojem, píšu jako
dojem.

## Co je dobře

1. **`rezie-tabule.ts` je skutečná režie, ne časovač:** plán dopředu na celou
   rozjížďku, deterministický, a s **rozpočtem času** (43 / 28 / 29 %). Rozpočet
   záběrů je přesně to, čím se televize od webové stránky liší.
2. **Kolotoč navazuje, kde ho souboj přerušil** (`mimoSouboje`). To není časovač,
   to je kontinuita — dvojice dostane svých 60 s i přes dvě přerušení. S hysterezí
   `DAV_DRZI_M` 110 m jsou to dvě místa, kde už někdo myslel jako střihač.
3. **Režie řadí pole týmž pravidlem jako tabule** (`seradNaVode` v obou), takže
   dvojice v záběru je dvojice ze žebříčku. Nález z 26. 10. (osmá s jedenáctou)
   byla režijní chyba první kategorie a je zavřená.
4. **Dávkový dojezd dostane jednu větu, ne dvanáct karet** (`CERSTVY_DOJEZD_S` 90
   a druh `venku`, `tabule-udalosti.ts:195–231`) — jediné redakční rozhodnutí o tom,
   co je zpráva, které v projektu je.
5. **`PanylkyRozjizdek` visí mimo volbu podoby** (`obrazovka.tsx:690`) a tiká po
   vteřině ve všech čtyřech podobách. Je to jediný prvek, který obrazovku nikdy
   neopustí; režijně je to pás kontinuity a tabule na něm stojí víc, než si píše.

## Co je špatně

### Š1. Tři hodinové stroje — změna každých pět sekund a nic nelícuje

**Nález.** Za rozjížďky běží tři nesouvisející časovače: karusel tříd `PANEL_MS`
9 s (`karusel.tsx:21`, montovaný jen při živé mapě, `obrazovka.tsx:759`), rám mapy
18 / 12 s (`mapa-trackeru.tsx:1034–1042`) a předmět záběru 40 / 60 s. Z těch
konstant: 6,7 výměny panelu + 4 výměny rámu + ~1,2 změny předmětu = **jedna
viditelná změna každých ~5 s**, a protože nsn(36, 30, 40) = 360 s, **žádné dvě na
sebe za šest minut nesednou**.

**Proč to vadí.** Horší než tempo je, že **rám nenásleduje předmět**: časovač
celek/celo se o `zabery` nezajímá, jediná výjimka je dav u bóje (`:1061`) a i ta
platí jen těch 12 s z 30, kdy je rám na „celo". Režie řekne „dívej se na souboj
o druhé místo" a rám k tomu dvě třetiny času ukazuje celé pole. To nejsou dvě
roviny jedné režie, to jsou dva lidé u dvou pultů.

**Návrh.** `zabery.duvod` rozhoduje o výřezu (`souboj`, `boje` = blízko,
`kolotoc` = střídá) a časovač celek/celo se restartuje při změně předmětu — tedy
`useEffect` na `:1034` dostane do závislostí identitu záběru.

### Š2. Zrychlená přehrávka stlačuje čas 120× a rozbije u toho celou režii

**Nález.** `krok = (konec * 1000) / prehravkaMs` (`mapa-trackeru.tsx:997`), tik po
vteřině, `PREHRAVKA_MS` 30 000. Hodinová rozjížďka jde po **120 s závodního času
na tik**; plán má rozlišení 10 s a čte se `rezie.get(floor(cas/10)*10)` (`:1095`),
takže za 30 s přehrávky se vybere **30 různých položek plánu, každá na vteřinu**.
Kaskáda výměn v žebříčku (`VYMENA_MS` 1 100, `:1366`) se do tiku nevejde.
Nativní pracovní bod téhle mapy je 2× (náčrt, `:1004`).

**Proč to vadí.** Půlminutové review je jediný prostřih, který tabule má, a v něm
se zvýrazňují jiné lodě každou vteřinu. Komentář u toho kódu si frekvenci sám
rozmýšlí (*„čtyři obrázky za vteřinu dělají duchy"*), ale o plynulosti pohybu, ne
o rozlišení plánu.

**Návrh.** V přehrávce režii na plán nepouštět: jeden záběr na celou půlminutu —
celé pole, zvýrazněné jen lodě, které v té rozjížďce skončily do třetího místa.

### Š3. Dohasínání záběru se počítá podle cizích hodin

**Nález.** `silaZaberu` (`mapa-trackeru.tsx:1107–1112`) bere zbytek záběru jako
`delka - (cas % delka)`. Souboj ale začíná v `p.cas` toho prohození — číslo z dat,
ne násobek čtyřiceti — a kolotoč mění dvojici podle `mimoSouboje`, tedy po
odečtení času v soubojích a u bóje. Fáze souhlasí jen náhodou.

**Proč to vadí.** Je to jediný mechanismus na tabuli, který má zmírnit střih
(*„aby přechod na další nebyl střih přes černou"*). Dnes dohasíná uprostřed záběru
a na samotném střihu svítí na 0,95 — dělá tedy dvakrát přesně to, čemu měl zabránit.

**Návrh.** `planRezie` ať do `Zaber` dopíše `od` a `do` (má je při sestavování
plánu v ruce), `silaZaberu` ať čte `do - cas`. Žádná nová konstanta.

### Š4. Start nemá vlastní podobu — ale ne proto, že chybí data

**Nález.** R1 míří správně, zdůvodnění má o čtvrtinu vedle: odpočet **je** a běží
(`PROCEDURA_S` 300, `rozjizdky-tabule.ts:54`, `casomira` v `rozjizdky.tsx`,
panýlky mimo volbu podoby). Chybí mu váha, ne data. Pět minut procedury drží celou
obrazovku `listina` — tabulka přihlášených, která se po celých 300 s nezmění —
a odpočet k tomu běží jako panýlek v rohu.

**Proč to vadí.** `PROCEDURA_S` = 300 s je **jediné okno celého dne, jehož délku
tabule zná dopředu**; všechno ostatní přichází zvenčí a režie to může jen
doprovázet. Jediné okno, které se dá naplánovat na vteřiny, je jediné, které se
nenaplánovalo vůbec. Odpojený `semafor.tsx` (298 ř.: světla, odpočet, stopky,
počet lodí, na které se čeká) je na to napsaný.

**Návrh.** Pátá podoba `start`, volená **ze stavu rozjížděk, ne z `zive`**:
`rozjizdky.some(r => r.stav === "Planovana" && procedura(r) !== null)` ⇒ `"start"`.
Tím padá i výhrada u nálezu 7 `TABULE-DIVAK.md` (*„prvek na mapě před startem
nemá kam sednout"*) — vlajka a odpočet nemají sedět na mapě, mají mít obrazovku.

### Š5. Přepnutí podoby je hard cut, který řídí cizí příznak

**Nález.** R4 potvrzuji a doplňuji mechanismus: `rezim` visí na `zive.length > 0`
(`obrazovka.tsx:303`), `zive` na `polohy?.vysila` (`:196`) a `vysila` je `false`,
jen co skončí okno rozjížďky (`PolohySprava.cs:73–78`, *„vydávání se vypíná"*);
`useStopy` vrátí prázdno týmž tikem (`stopy.ts:56`). Uzavření rozjížďky tedy
**jedním pětisekundovým obnovením vymění celé rozvržení** — bez minimální doby,
bez hystereze. O úroveň níž, u jedné lodi u bóje, hystereze je.
Druhá polovina: v `mezi` běží smyčka 75 s seznam + 30 s záznam, i třicet minut
mezi rozjížďkami — **až sedmnáct identických opakování téže půlminuty** — a
začíná seznamem (`useState(false)`, `:380`), takže první věc po dojetí je 75 s
statické tabulky.

**Proč to vadí.** Střih padne na nejzajímavější okamžik hodiny a padne bez
ohlášení; a za ním se minutu a čtvrt nestane nic. V televizi je za dojezdem
review, ne tabulka.

**Návrh.** Smyčku po přechodu do `mezi` / `po` nastartovat **záznamem** (a při
změně `posledniDojeta` ji na záznam resetovat). Pro samotný střih minimální doba
podoby, `PODOBA_DRZI_S` — obdoba `DAV_DRZI_M` o úroveň výš.

### Š6. Fronta karet: R3 je ve svém příkladu vedle, ve svém závěru ne

**Nález.** R3 tvrdí, že výstraha čeká za dojezdy **ze stejného snímku** — neplatí:
`udalosti()` vkládá zprávy a výstrahy první (`tabule-udalosti.ts:102`), dojezdy až
na `:215`. Platí ale přednost **napříč snímky**: výstraha z nového snímku čeká za
vším, co ve frontě zbylo, a strop není — hromadný dojezd (všichni do 90 s) dá
dvanáct karet = 54 s, a to je právě ta minuta, kdy je mapa nejdůležitější.
K tomu, co R2 nevidí: **dojezd se ohlašuje dvakrát dvěma kanály** — lepík
z trackeru v okamžiku projetí (`mapa-trackeru.tsx:1157`, 6 s) a karta z porovnání
snímků, až to zapisovatel napíše (`:215`). Mezera je nepředvídatelná.

**Vyvracím R2.** Nedosažitelný druh karty `souboj` není nedopatření: 24. 10. 2026
bylo rozhodnuto *„Prohození velkou kartu nedostane… Karta přes půl obrazovky patří
dojezdu"* (`:1145`), a s tím rozhodnutím souhlasím. Vadou je `onUdalost` jako
povinná, nikdy nevolaná závislost nad kódem, který volá jen `setLepik` — mrtvý
prop, ne mrtvá režie.

**Návrh.** Dvě pravidla na jedno místo: výstraha a zpráva z vývěsky se vkládají na
**začátek** fronty, a dojezdů se vedle sebe ukážou nejvýš tři — zbytek nahradí už
existující druh `venku`.

## Co bych potřeboval vědět

- **5-jachting:** je procedura na Orlíku vždycky těch pět minut a dá se její
  začátek znát dopředu natolik, aby na ni šla plánovat podoba? A jak dlouhá je
  doopravdy pauza mezi rozjížďkami — na tom stojí celé Š5.
- **7-efekty:** snese televize prolínačku mezi podobami (celoplošná výměna
  rozvržení) a jak dlouhá smí být? Bez odpovědi je Š5 jen „drž podobu dýl".
- **2-dramatik:** má „před první rozjížďkou dne" být jiná podoba než „mezi
  rozjížďkami"? Dnes je dělí jen to, jestli už se jelo.
- **3-fanousek:** co musí zůstat **nehybné** po celou dobu, co na obrazovku
  koukáš? Š1 říká, že dnes nic.
- **Filip:** je sedmnáct opakování téže půlminuty záznamu mezi rozjížďkami
  v pořádku, nebo má review přijít po dojetí jednou či dvakrát a pak přestat?
- **Data (rámec 4):** zná `Snimek` plánovaný start **následující** rozjížďky, nebo
  jen té, která už má `startV`? Bez toho pokryje Š4 jen první start dne.

## Čeho se nedotýkám

Vzhledu, kontrastu a čitelnosti přes místnost (6-design) — u Š1 mluvím o počtu
změn za minutu, ne o tom, jak vypadají. Techniky přechodů, délek animací a ceny
za překreslení (7-efekty): u Š2 a Š5 říkám *kdy* se střihne, ne *čím*. Věcnosti
jachtingu (5): co znamená dav u bóje, co procedura, jestli je souboj o třetí místo
souboj. Jmen podob a textů karet (8-jazyk) — `start` v Š4 je zástupné jméno.
Příběhového oblouku (2-dramatik): měřím takt, ne stavbu. A otevřeného rozhodnutí
z nálezu 14 `TABULE-DIVAK.md` (odkud na tabuli pochází stáří polohy) — je o tom,
k čemu tabule je, ne o rytmu.

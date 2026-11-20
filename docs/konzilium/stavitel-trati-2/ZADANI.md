# Konzilium nad staviteli trati — druhý běh (20. 11. 2026)

Čtyři obory, **čtyři kola**, poslední je kolo 4. Sestavu vybral Filip
jmenovitě: ergonomie, UX, design a jachtař. Psát se bude do
`docs/konzilium/stavitel-trati-2/`.

## Co se posuzuje

Návrh přepracování obrazovky **Stavitel trati** v mobilní aplikaci
(Expo/React Native), kterou pořadatel používá **z lodi na vodě**.

- **Text návrhu:** `docs/konzilium/stavitel-trati/NAVRH.md` — 602 řádků,
  **patnáct nálezů**.
- **Makety:** `docs/konzilium/stavitel-trati/navrh/*.dc.html` — patnáct
  obrazovek, statické HTML v rozměru 390 × 844. Čti je jako zdroj.
  Rozložení ověřuj v prohlížeči, ne odhadem z kódu; jedna chyba
  (`box-sizing`) se takhle našla 20. 11.
- **Závěr prvního běhu:** `docs/konzilium/stavitel-trati/ZAVER.md` —
  sedm rozhodnutí o návrhu a čtyři nálezy o živém kódu.

Na co se díváte je **návrh**, ne hotová věc. Postavené z něj není nic
kromě obrazovky výběru zastávky.

## Čím se ten návrh od prvního běhu liší

První konzilium (17. 11.) posuzovalo šest nálezů a jednu obrazovku.
Od té doby Filip dodal, jak to chodí doopravdy, a návrh narostl
na patnáct nálezů a patnáct maket. **Tohle je ta změna, kvůli které
sedíte znovu**:

1. **Trať se často plánuje předem z kanceláře** naklikáním nad mapou,
   aby posádky věděly, jak se pojede. V den regaty vyrazí loď a stavitel
   pípá úpravy z vody podle větru. **Plán ale není pravidlo** — někdy se
   staví rovnou na vodě, podle toho, kdo to dělá a jak svědomitě.
2. **Hlavní práce na vodě je úprava, ne zakládání.** Dnešní obrazovka
   umí jen „pípni novou značku"; přesunout ani sebrat značku neumí
   (nález 14).
3. Přibyla **fotka u značky** (nález 7), **znak místo kolečka** (8),
   **uložená trať a schéma** (9), **bod z mapy** (10), **barva a tvar
   bójky** (12), **přerovnání přetažením a mazání** (13), **plán
   a jeho potvrzování** (15).
4. Čtyři obrazovky (Stavba, Plán, Hotovo, Pořadí) byly 20. 11.
   prohlášeny za **jednu obrazovku ve stavech a v režimu**. Hlavní akcí
   zůstává pípnutí ve všech.

## Na co se ptá Filip

Doslova: *„tady je to potřeba vylepšit více elegantně"*. Návrh je
úplný, ale narostl přikládáním — každý nález přidal kus. Otázka je,
jestli z toho pořád je **jedna věc, kterou jde vzít na vodu**, nebo
hromada správných odpovědí na patnáct oddělených otázek.

## Co je rozhodnuté a nediskutuje se

Ze závěru prvního běhu. Nevracejte se k tomu, ledaže by nový kontext
(plán z kanceláře, úprava na vodě) některé z nich **přímo vyvracel** —
pak to řekněte a zdůvodněte, to je legitimní.

1. Pípnutí je první a trvale dostupná akce.
2. Odklad popisu („Popíšu potom") padl 3 : 1.
3. Seznam má osm řádků; průjezdní nese stranu jako otočná.
4. Stav polohy nese trvale slovo, číslo jen u akce a v detailu.
5. Tečka u polohy je silueta 20 dp.
6. Karta zádrhelu: *Zkusit znovu* nad zahozením, zahození obrysové
   a s potvrzením ve dvou fázích na nepohnutém terči. **Modální dialog
   zamítnut** — v rukavicích se objeví pod klesajícím palcem.
7. Vzdálenost u brány jedním stupněm se znakem směru.

Dál platí a není to k hlasování: pomocníkovi se otevírá jen pípnutí
a čtení; mazání a přestavba zůstávají organizátorovi a rozhodčímu.

## Co víme o prostředí a co to stojí

Nejsou to názory, jsou to fakta, která rozhodují o tom, co je levné:

- **Nativní závislost = posunutý otisk.** `runtimeVersion` má politiku
  `fingerprint`; nový nativní modul rozdělí kanál OTA a každý telefon
  chce ruční instalaci. Fotoaparát (`expo-image-picker`) i přetahování
  (`gesture-handler`, `reanimated`) do té kategorie patří. V jednom
  buildu se to zaplatí jednou. **Podpis na iPhonu vyprší 23. 11. 2026**,
  takže jeden nativní build stejně musí proběhnout.
- **Změna JavaScriptu je zdarma** — vyjde po síti jako aktualizace.
- **Obrys Orlíku už máme**: `web/lib/orlik-obrys.ts`, 1 365 bodů z OSM
  zjednodušených na 20 m, 27 kB. Schéma tedy nepotřebuje dlaždice ani
  síť.
- **Server umí víc, než appka používá**: barvu i tvar bóje, zdroj polohy
  (`Mapa` proti `Telefon` — „jediný zdroj, který měří"), přesun jako nový
  záznam (`NahrazenaV`), sebrání, mazání prvku, pořadí při úpravě.

## Co hájí kdo

**1-ergonomie** — cenu ovládání: kolik klepnutí, kolik hledání, co jde
jednou rukou v rukavicích na houpající se lodi. Podkládej počtem kroků
na konkrétní cestě, změřeným terčem, scénářem. Nedotýkáš se estetiky
(2), smyslu toku (3) ani jachtařské věcnosti (5).

**2-design** — hierarchii, čitelnost a to, čemu Filip říká elegance:
co je na obrazovce nejtěžší, nese nejdůležitější věc; barva znamená
pořád totéž; patnáct obrazovek drží jeden jazyk. **Tenhle běh je
hlavně tvůj** — Filip chce, aby to bylo elegantnější, ne aby to umělo
víc. Podkládej změřeným kontrastem, WCAG, tokenem a jeho hexem,
šířkou z prohlížeče. Nedotýkáš se počtu kroků (1) ani domény (5).

**3-ux** — tok a stavy: kudy kdo projde, co uvidí, když není nic, a co
se stane, když to spadne. Hlavně: drží model „jedna obrazovka ve
stavech a režimu"? Co dělá plán, který neexistuje? Nedotýkáš se vizuálu
(2) ani toho, jak se jachta řídí (5).

**5-jachtar** — aby to sedělo na skutečnou praxi a netvrdilo o oboru
nepravdu: staví se trať takhle? Jsou ty znaky a tvary správně? Dává ten
sled kroků smysl člověku na motoráku, který pokládá bóje a kouká na
vítr? Podkládej pravidlem, předpisem, zvykem praxe, tím, jak tomu říká
rozhodčí. Nedotýkáš se techniky provedení (1, 2) ani pojmenování
v aplikaci.

## Pravidla

- **Nálezy podkládej** — soubor a řádek, scénář, předpis, změřená věc.
  **Dojem označ jako dojem.**
- **Nepřepisuj.** Navrhuješ-li jiný tvar, napiš ho do posudku; neměň
  maketu ani kód.
- **Nesmlouvej sám se sebou.** Je-li něco podle tvého oboru špatně,
  napiš to rovnou, i kdyby to bylo rozhodnuté.
- **Necommituj, nesahej na cizí soubory.** Píšeš výhradně svůj posudek.
- Shoda se nevyžaduje. Nesouhlas se zapíše i s důvodem, ne zahladí.
- **Vada makety není vada návrhu.** Vymyšlená jména lodí, čísla
  rozjížděk a zástupné texty jsou nedbalost makety. Hlas je, jen když
  se z nich dá něco naučit špatně.

## Kolo 1

Do `docs/konzilium/stavitel-trati-2/<tvoje-session>-kolo1.md`, **do 150
řádků**:

```markdown
# <obor> — kolo 1

## Co je dobře
Co z návrhu obstojí a proč. Krátce; není to zdvořilost, je to doklad,
že se to nemá předělávat celé.

## Co je špatně
Pro každý nález: co je špatně / proč to vadí / co s tím. Podložené.

## Co bych potřeboval vědět
Otázky na Filipa, na které si neumíš odpovědět sám.

## Čeho se nedotýkám
**Povinná rubrika.** Co jsi viděl, ale patří jinému oboru.
```

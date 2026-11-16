# Psycholog — kolo 1

Posuzuji, co návrh dělá s pozorností, důvěrou a odpovědností člověka na
rozhoupaném motoráku hodinu před startem. Na vodě to neběželo, takže všechno
níž je úvaha podložená kódem, ne zkušenost.

## Co je dobře

1. **Pípnutí jako trvalá hlavní akce (nález 1) míří na to, čeho se člověk
   bojí.** Poloha je jediná nevratná věc na obrazovce (`poloha.ts:40`, fix
   starší 4 s se zamítne). Dnešní pořadí nutí stavitele rozhodovat dvě
   nepodstatné věci přesně ve chvíli, kdy sleduje, jestli mu neuteče fix —
   a dělená pozornost pod tlakem je to, z čeho chyby vznikají. Kdo ví, že
   zachytit polohu smí vždycky, přestane předvídat a začne pracovat.
2. **Jediná plná barevná plocha = hlavní akce (nález 6).** Při vysokém
   vybuzení se pozornost zužuje a přežije jen jeden salientní terč. Obrazovka,
   kde váží všechno stejně, se za pohybu nečte — čte se znovu.
3. **Trvalý proužek stavu polohy (nález 3)** mění nepředvídatelné odmítnutí na
   předvídatelné čekání — rozdíl mezi „nástroj mě zradil" a „počkám pět vteřin".
4. **Hlášky `posud` (`poloha.ts:67`–`101`) přisuzují selhání prostředí, ne
   člověku, a každá nabízí akci** („Počkej, až telefon zaměří znovu."). U
   dobrovolníka na jednu regatu je to rozdíl mezi „jsem neschopný" a „čekám na
   družice". Na těch větách neměňte ani slovo.
5. **Karta zádrhelu fronty vysvětluje následek, ne jen stav** (nález 5, dnes už
   `stavba.tsx:304`–`307`). Bez vysvětlení si člověk vymyslí vlastní, obvykle
   „appka je rozbitá", a začne klepat na všechno ostatní.

## Co je špatně

### 1. „Poloha je uložená" je slib, který nemá čím být krytý

- **Nález.** `navrh/Popis.dc.html:26` říká doslova *Poloha je uložená*. Ale
  nepopsané pípnutí se nemá kam uložit: fronta bere jen hotový
  `PrvekKPostaveni`, kde je `typ` povinný (`fronta.ts:28`–`46`), a bez typu
  prvek neodejde jedním požadavkem, jak určuje rámec. Zůstane tedy v Reactu —
  a `fronta.ts:13`–`17` sama píše, proč to nestačí: *„když systém appku zabije,
  React state je pryč a stavitel by nepoznal, že o prvek přišel."*
- **Proč to vadí.** Odložení popisu má jediný smysl: aby si člověk polohu
  nemusel pamatovat. Když se spolehne, přestane si ji pamatovat — to je ta
  úspora — a appka mu ji vezme beze zvuku. Obrazovka slibuje jednu věc, že
  pípnutí drží. Když jednou nedrží, nedůvěra se přenese na všechno ostatní
  a stavitel si začne bóje psát na papír. Telefon je na vodě dlouho v kapse
  a Expo appku systém zabije běžně.
- **Návrh.** Odložené pípnutí ukládat do `stavba.db` jako vlastní tabulku hned
  při klepnutí; popis ho teprve překlopí do fronty. Dokud to tak není, slovo
  „uložená" se na tu obrazovku napsat nesmí.

### 2. Po čtyřiceti minutách se popis nerekonstruuje ze znalosti, ale z dohadu

- **Nález.** `navrh/Main.dc.html:70` nese u nepopsaného prvku jen *„pípnutá,
  ještě nepopsaná — klepni"*; jediný kontext je číslo prvku a v
  `Popis.dc.html:27` čas a souřadnice. Na hladině je osm žlutých bójí
  k nerozeznání a desetinné stupně na vodě nikdo nepoužije.
- **Proč to vadí.** Je to **tatáž vada, kterou návrh popisuje u nálezu 4**:
  dohad vypadá na obrazovce stejně jako znalost a pozná se až z mapy trati —
  jen u nálezu 4 ji návrh odstraňuje a tady ji zavádí. Následek nenese
  stavitel, nese ho závod: špatně popsaná otočná znamená jiné pořadí.
- **Návrh.** U každého nepopsaného řádku ukazovat **živě vzdálenost a směr od
  aktuální polohy** („180 m na SV odsud"). `vzdalenostM`
  (`packages/stavba/geo.ts:14`) i `azimut` (`stavba-prvku.ts:460`) existují,
  žádná nová závislost. Identifikace tím přestane být z paměti.

### 3. „Popíšu potom" je volba, jejíž cenu člověk v tu chvíli nevidí

- **Nález.** Tlačítko *Popíšu potom* (`navrh/Popis.dc.html:72`) nenese žádné
  číslo ani následek a váží stejně jako volby popisu.
- **Proč to vadí.** Odložení se volí ve chvíli **nejnižší vnímané ceny** — vím,
  co to je, dopíšu to za minutu — a platí ve chvíli nejvyšší: hodinu před
  startem, s osmi bójemi a frontou, kdy je paměť nejhorší. Pod termínem lidé
  spolehlivě berou to, co je zdarma teď. Nepopsaný prvek navíc drží otevřenou
  smyčku v pracovní paměti; jedna je únosná, tři ne, a nástroj jejich počet
  nijak neomezuje.
- **Návrh.** Napsat na tlačítko stav, do kterého to člověka posune: *„Popíšu
  potom (budou 3 bez popisu)"*. Jedna věta, a rozhodnutí přestane být zdarma.

### 4. Dvě různé nedodělanosti jsou slité do jednoho malého řádku dole

- **Nález.** `navrh/Main.dc.html:79`: *„3 prvky odeslány · 1 čeká na popis"* —
  13 px, pod seznamem. Dnešní obrazovka má frontu jako pruh **nahoře**
  (`stavba.tsx:289`).
- **Proč to vadí.** Pro odpovědnost jsou to dvě různé věci: *čeká na popis*
  spraví jedině člověk, *čeká na odeslání* se spraví samo signálem. A před
  odjezdem z vody má stavitel jednu otázku: **vidí rozhodčí tu trať, kterou
  jsem postavil?** Řádek počtů dole ji nedává a zjistí se to až ráno.
- **Návrh.** Jedna věta nahoře u proužku polohy, s podmínkou odjezdu: *„Na
  trati 3 · u tebe v telefonu 1 — nepopsané a neodeslané prvky rozhodčí
  nevidí."*

### 5. Živé číslo přesnosti je číslo, se kterým se nedá nic udělat

- **Nález.** Nález 3 chce v trvalém proužku „číslo v metrech a větu
  o čerstvosti".
- **Proč to vadí.** Přesnost se stavitelovým jednáním nemění: jediná akce, kterou
  nabízí, je čekat na lepší číslo. Hodnota skákající každou vteřinu (±4, ±7,
  ±11) si přitom pozornost vybere, protože se hýbe, a odvede ji od vody.
  U vzdálenosti (nález 4) je to obráceně — tam akce existuje (popojet), a proto
  je živé číslo správně. `poloha.ts:105` argumentuje, že bez čísla se 5 m a 65 m
  tváří stejně; to platí **ve chvíli rozhodnutí pípnout**, ne trvale.
- **Návrh.** V proužku držet tři stavy (jde / jde, ale bude to nepřesné /
  nejde) a číslo ukázat u tlačítka a v detailu prvku. Prahy existují:
  `PRESNOST_K_ZAMYSLENI_M` 25 a `NEJHORSI_PRESNOST_M` 100 (`poloha.ts:26`–`33`).

### 6. Jediná cesta ze zablokované fronty je nevratná a vede přes člověka, který ten stav nezpůsobil

- **Nález.** `zahod` je `DELETE` (`fronta.ts:185`) a návrh 5 dává tlačítko
  *Zahodit prvek N* přímo do karty zádrhelu.
- **Proč to vadí.** Člověk pod tlakem v nevratném rozhodnutí volí to, co uvolní
  blokádu. Zmizí tím měření, které se nedá zopakovat — bóje je ve vodě, motorák
  jinde — a odpovědnost nese stavitel, přestože důvod odmítnutí nezpůsobil. To
  je nejhorší tvar odpovědnosti, jaký nástroj může člověku dát.
- **Návrh.** Zahození nechá řádek v seznamu jako „zahozeno: <věta serveru>"
  i se souřadnicemi, aby šel prvek dopsat jinudy. Mechaniku nechávám 9-rizika.

### 7. Pořadí voleb (otázka 4): podle četnosti, a nikdy se nesmí měnit

- **Nález.** Seznam v `navrh/Popis.dc.html` řadí volby zhruba podle pořadí na
  trati (otočné, průjezdní, dva konce, start, cíl).
- **Proč to vadí.** Pod zátěží lidé klepou na **pozici**, ne na text — po třetí
  bóji už volbu nečtou. Pořadí na trati se liší regatou od regaty, takže
  nejčastější případ pak stojí na proměnlivém místě.
- **Návrh.** Řadit podle četnosti na Orlíku a pořadí **pevně zadrátovat** —
  žádné „naposledy použité" nahoru. Seznam, který se sám přerovnává, ruší
  motorickou paměť právě tomu, kdo ji nejvíc potřebuje.

## Co bych potřeboval vědět

- **Zadavateli (Filip).** Staví se trať podle předem nakresleného plánu, nebo
  se o prvcích rozhoduje až na vodě podle větru? Rozhoduje to o ceně celého
  odloženého popisu: podle plánu je dopsání po čtyřiceti minutách skoro
  bezpečné, při rozhodování na vodě je to vymyšlená trať.
- **Zadavateli.** Kormidluje a pípá tentýž člověk, nebo jsou na motoráku dva?
  Mění to celou úvahu o zátěži i o odloženém popisu.
- **1-ergonomii.** Musí odložení popisu vůbec existovat, nebo je to obchvat
  toho, že popis nejde udělat v pohybu jednou rukou? Když se zvládne za stání
  u bóje, odpadá většina mých nálezů 1 až 3.
- **9-rizikům.** Je přijatelné, aby se trať uzavřela se třemi nepopsanými pípnutími, a co se s nimi stane, když appku zabije systém?
- **3-ux.** Kdo dopisuje popis, když stavitel-pomocník odjede domů? Jde nepopsané pípnutí popsat z webu, nebo žije jen v tom jednom telefonu?

## Čeho se nedotýkám

- **Kontrast, barvy, typografie, čitelnost na slunci** — 2-design; měření
  tokenů nechávám jim. Můj nález 5 mluví o pozornosti, ne o odstínu.
- **Počet kroků, dosah palce, rukavice, práce jednou rukou** — 1-ergonomie.
- **Toky mezi obrazovkami, prázdné stavy, oprávnění pomocníka** — 3-ux.
- **Nevratnost zápisu, co selže tiše na serveru, mechanika zahození** — 9-rizika.
- **Sloučení typu a předpisu a cena zásahu do `packages/stavba/`** (otázka 1).
  Z mého oboru k tomu mám jednu větu: „Jedna značka / Dvě značky" je kategorie
  **zápisu**, ne trati, a kategorie vymyšlená nástrojem je zátěž navíc. Jestli
  ta úspora stojí za rozdvojení pravidel sdílených s webem, neposoudím.

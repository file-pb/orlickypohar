# Vizuální design — kolo 3

## Rozhodnutí

**β — jedno číslo je 350 px a na práh sahat netřeba.** Pravdu má 1-ergonomie: moje
361 px bylo odsazení **makety** (`.okno 0.9rem`), aplikace má `.obal { padding: 0
1.25rem }` (`globals.css:287`), takže na 390 px zbývá **350 px**. Přeměřeno proti
skutečné komponentě, ne maketě (`globals.css:1998`, `:2024`) — dlaždice 77–134 px:

| pruh na 350 px, cíl 44 px | sloupců | sedm plných jmen |
|---|---|---|
| mřížka, práh 7,25 rem (dnes) | 2 | 4 řádky = 195,2 px |
| mřížka, práh 7 rem | 3 | 3 řádky = 144,8 px |
| `flex-wrap`, bez prahu | — | 3 řádky = 144,8 px |

Obě čísla platila, každé o jiné věci: 195 px je dnešek, 145 px oprava. **Hlas: práh
nechat být a zrušit mřížku** — `flex-wrap` jsme si v kole 2 odhlasovali oba a prahu se
tím zbavíme úplně; 7 rem je záloha, kdyby mřížka zůstala. Na iPhonu 15 totéž.

**γ — sdílená barva zůstává, 5-jachtingovi neustupuju.** Barva netvrdí „tady se dělá
totéž", ale „je to tatáž věc" — a projekt tenhle případ už rozhodl ve prospěch sdílení:
`trat` ↔ `boje` mají jeden token s důvodem *„venku se na trať dívám, ve správě ji
stavím"* (R10, `globals.css:2174`). To je tvoje vlastní rozlišení (venku listina, ve
správě sada k podpisu) a tam vedlo ke společné barvě. Po δ navíc plnou barvou mluví
vždycky jedna dlaždice, ta, na které stojím. `--ukon-vysledky` tedy platí pro *Zápis
výsledků* i pro *Výsledky* venku.

**δ — tu cenu neobhajuju, ruším ji.** K principu: 1.4.11 váže vizuální informaci
potřebnou k rozpoznání prvku a jeho stavu, takže zkouška je smazat hranu a zjistit, co
přestane být rozpoznatelné. Nic — jméno drží 14,7 : 1 a vybraná dlaždice má tři kanály,
takže pod 3 : 1 by to obstálo. **Jenže nemusí:** stačí míchat **do `--tlumeny`**:

| nevybraná hrana | L\* rozptyl | C\* rozptyl | min ΔE mezi dlaždicemi | hrana / papír |
|---|---|---|---|---|
| plná barva (dnes) | 15,2 | 17,5 | — | 3,36–5,77 |
| 45 % do `--linka` (kolo 2) | 6,4 | 9,3 | 5,3 | **1,95–2,37** |
| **45 % do `--tlumeny`** | 7,1 | 11,9 | **6,2** | **4,12–5,31** |

Nad 4,5 : 1, duha zkrocená skoro stejně, a dlaždice jsou od sebe **dál** než v mé
vlastní variantě (ΔE 6,2 proti 5,3). Cena je jediná: pruh je o stupeň těžší, sedm
tmavších akcentů místo bledých. Beru to — výjimka, kterou by bylo potřeba hájit při
každém rozšíření kontroly, je horší než pruh o odstín tmavší. **1-ergonomii:** ano,
45 % na zamíření stačí, ΔE 6,2 mezi dlaždicemi a 18,8–24,2 od šedi. A ke kontrole:
**dnes by to nenašla ani tak** — hrana je `border-color` nad `color-mix`, kdežto
`tools/kontrola-tokenu.py` páruje jen pravidla s `color` i **plným** `background`; to
není argument pro podkročení, to je ta mez z mého nálezu 5 v kole 1.

**δ, `--ukon-coted`** — rozhodnutí nechávám 1-ergonomii a 3-uxovi. Podmínka platí:
zůstane-li teplá, musí přestat být teplé `--ukon-vypsani` (81°) a `--ukon-smernice`
(89°), jinak *Co teď* nerozlišuje nic.

## Co nesmí spadnout pod stůl

**Na telefonu se plná jména neukážou ani po opravě** — dlaždice tam vyjde na 77–134 px,
tedy pod mez `@container (max-width: 10.75rem)` = 172 px, kde si CSS bere `nazevKratky`
(`globals.css:2040`), takže „plná jména" z kola 2 jsou rozhodnutí o monitoru a každá
nová položka pruhu musí mít i krátkou podobu, jinak z dlaždice vyteče. A **devět nových
tokenů potřebuje tmavou odrudu dřív, než se pruh postaví**: tři jsou na tmavém papíru
pod 3 : 1 a kontrola tokenů je nezměří, takže se to pozná až u vody.

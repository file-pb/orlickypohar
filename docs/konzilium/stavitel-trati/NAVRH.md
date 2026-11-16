# Stavitel trati — návrh přepracování (17. 11. 2026)

Podklad pro konzilium. **Není to rozhodnutí**, je to návrh k rozcupování.
Makety k němu leží v `navrh/` a jako plátno v artefaktu
*Stavitel trati — návrh přepracování*.

## Čím to začalo

Obrazovka se postavila 16. 11. 2026 a hned ten večer Filip napsal:
*„koukl jsem zběžně a chtělo by to trochu zapracovat taky na ergonomii
a designu."* Žádný konkrétní nález — dojem z letmého pohledu. Tenhle návrh
je pokus ten dojem pojmenovat a nabídnout, co s ním.

Obrazovka **nikdy neběžela na vodě**. Všechno níž je rozbor kódu a úvaha,
ne zkušenost z motoráku. Co z toho padne při první skutečné stavbě, padne.

## Co dnes obrazovka dělá

`app/src/app/serie/[slug]/zavody/[zavod]/stavba.tsx`, průvodce o pěti krocích:

1. **typ prvku** — Jedna značka · Dvě značky · Start · Cíl · Odskok
   (`packages/stavba/stavba-prvku.ts`, `TYPY`)
2. **předpis** — Otočit levobokem · Nechat po pravoboku · Projet mezi nimi …
3. **značení + pípnutí** — řádek předvoleb a velké tlačítko *Pípni*
4. **růžice** — světová strana, jen u Startu a Cíle (`patriSmer`)
5. **potvrzení** — a teprve tady se prvek zařadí do fronty

Nad tím bannery (zámek trati, chybějící oprávnění k poloze, fronta)
a pod tím seznam *Co už stojí*.

## Co na tom vadí

### 1. Časově kritický krok je až třetí

**Nález.** Pípnutí je krok 3. Před ním stavitel vybírá typ a předpis.

**Proč to vadí.** Poloha je jediná věc na téhle obrazovce, která **mizí**.
`poloha.ts:37` odmítá fix starší než čtyři vteřiny, protože loď se mezi
dvěma body posune a uložená poloha by položila značku tam, kde loď stála
před chvílí. Všechno ostatní — typ, předpis, značení, směr — se dá vyplnit
za hodinu stejně dobře jako teď. Dnešní pořadí tedy nutí stavitele
rozhodnout dvě nepodstatné věci dřív, než smí zachytit tu jedinou, která
na čase závisí. U brány, kde se mezi konci popojíždí, se to platí dvakrát.

**Návrh.** Obrátit to: **pípnutí je trvale dostupná hlavní akce** dole na
obrazovce, dostupná v každém stavu. Klepnutí uloží polohu a čas. Teprve pak
se obrazovka ptá, co to bylo — a i na to se dá odpovědět později.

### 2. Typ a předpis jsou dvě otázky na jednu věc

**Nález.** Krok 1 se ptá na počet bodů (*Jedna značka* / *Dvě značky*),
krok 2 na to, co loď má udělat (*Otočit levobokem*).

**Proč to vadí.** Stavitel neuvažuje v počtu bodů. Veze v lodi žlutou bóji
a ví, že to bude **otočná, kterou se jede levobokem** — jedna věc, ne dvě.
„Jedna značka" je kategorie vymyšlená kvůli tomu, kolikrát se pípne;
to je vnitřní vlastnost zápisu, ne vlastnost trati.

**Návrh.** Jeden seznam konkrétních věcí: *Otočná — levobokem*,
*Otočná — pravobokem*, *Průjezdní*, *Brána*, *Odskok*, *Start*, *Cíl*.
Kolik bodů se pípne, plyne z volby a neptá se na to nikdo.

**Co to stojí.** `stavba-prvku.ts` je **sdílený s webem**
(`packages/stavba/`, rozkopírovává se do obou klientů). Tahle změna se tedy
dotkne i webového průvodce, nebo se ta pravidla musí rozdělit — a rozdělení
by znamenalo dvě pravdy o tomtéž, což byl celý důvod, proč modul vznikl.
**To je nejdražší bod celého návrhu a nejspíš i nejspornější.**

### 3. Stav polohy je vidět jen v jednom kroku

**Nález.** Přesnost (`popisPresnosti`) se vykresluje u tlačítka *Pípni*,
tedy v kroku 3.

**Proč to vadí.** Stavitel se dozví, že má špatný signál, až ve chvíli, kdy
chce pípnout — po dvou krocích vybírání. Přitom je to stav prostředí, ne
stav průvodce: platí pořád a mění se bez jeho přičinění.

**Návrh.** Trvalý proužek pod hlavičkou: tečka (zelená/oranžová/červená),
číslo v metrech a věta o čerstvosti. Jedno místo, stejné v každém stavu.

### 4. Po prvním bodu brány není podle čeho poznat, že stačí popojet

**Nález.** U dvoubodového prvku se po prvním pípnutí ukáže jen výzva
*„Popojeď a pípni pravou"* (`stavba-prvku.ts`, `TYPY`).

**Proč to vadí.** Pravidlo o čtyřech vteřinách hlídá stáří fixu, ne
vzdálenost. Když stavitel pípne druhý konec dost pozdě, aby byl fix
čerstvý, ale dřív, než doopravdy popojel, vznikne brána široká pár metrů —
a **na obrazovce to vypadá úplně správně**. Pozná se to až z mapy trati.

**Návrh.** Po prvním bodu ukazovat **vzdálenost od něj**, velkým číslem,
živě. Je to levné (`vzdalenostM` v `packages/stavba/geo.ts` už existuje)
a dává staviteli zpětnou vazbu, kterou dnes nemá odnikud.

### 5. Zádrhel fronty má podobu pruhu, přestože zastavuje celou stavbu

**Nález.** Odmítnutý prvek se ukáže jako pruh nad průvodcem
(`stavba.tsx`, `stojici`), vedle ostatních bannerů.

**Proč to vadí.** Odmítnutý prvek **zastaví frontu celou** — a je to
schválně, protože pořadí na trati určuje pořadí, v jakém prvky dorazí na
server. Dokud ho někdo nezahodí, nic dalšího neodejde. Takový stav není
oznámení, je to překážka, a vypadá stejně jako banner o oprávnění k poloze.

**Návrh.** Vlastní karta s červeným rámem, větou od serveru, vysvětlením
následku a tlačítkem *Zahodit prvek N* přímo v ní.

### 6. Všechno na obrazovce váží stejně

**Nález.** Karty voleb (`velke`), řádky seznamu (`radek`) i pruhy (`pas`)
mají týž rám o jednom pixelu a podobné odsazení (`stavba.tsx`, `styly`).

**Proč to vadí.** Na slunci, v pohybu a přes mokré sklo se hierarchie
nečte z odstínů rámečků. Obrazovka, kde je všechno stejně důležité, nutí
stavitele číst, místo aby mířil.

**Návrh.** Jedna plná barevná plocha na obrazovku = hlavní akce. Volby
bílé s tenkým rámem. Informace bez rámu. Nic dalšího barevného, kromě
stavů (červená = stojí, oranžová = pozor).

## Co se nemění, a proč

1. **Prvek se pořád zapisuje jedním požadavkem.** `POST …/trat/prvky/postav`
   a jeho atomicita jsou hotové a správné; návrh mění pořadí otázek
   v rozhraní, ne tvar zápisu. **API se nedotkne.**
2. **Odmítnutý prvek dál zastaví frontu.** Je to rozhodnutí o pořadí trati,
   ne nedodělek.
3. **Klepací cíle zůstávají nad 44 pt** (`tools/kontrola-dotyku.py`).
4. **Žádná nová nativní závislost.** Otisk se nesmí pohnout, jinak si všichni
   musí ručně přeinstalovat APK. To vylučuje fotoaparát i mapu.
5. **Server zůstává autoritou na pravidla.** Klient je jen předsíň.

## Na co se ptám konzilia

1. **Je sloučení typu a předpisu do jednoho seznamu správné?** Sedm položek
   místo dvou kroků — a za cenu zásahu do pravidel sdílených s webem.
2. **Je „pípnutá, ale nepopsaná značka" bezpečný stav?** Dovolí rychle
   pípnout dva konce, ale taky se na ni dá zapomenout.
3. **Pomůže vzdálenost od prvního bodu, nebo je to další číslo na čtení?**
4. **V jakém pořadí mají volby stát?** Podle četnosti na Orlíku, nebo podle
   pořadí na trati?
5. **Co z tohohle je proti tomu, jak se trať staví doopravdy?**

## Makety

| Soubor | Co ukazuje |
|---|---|
| `navrh/Main.dc.html` | klidový stav: stav polohy, co stojí, trvalé *Pípni* |
| `navrh/Popis.dc.html` | po pípnutí: jeden seznam konkrétních prvků |
| `navrh/Dvoubod.dc.html` | rozestavěná brána: vzdálenost od prvního bodu |
| `navrh/Fronta.dc.html` | bez signálu a zaseknutý prvek |
| `navrh/Zamek.dc.html` | přijatá trať, jen ke čtení |

Barvy a rozměry jsou **skutečné tokeny appky**
(`app/src/constants/theme.ts`, světlé téma), ne vymyšlená paleta. Makety
jsou statické HTML: čti je jako zdroj, ne jako aplikaci. Co je v nich
nedbalé — zástupná jména lodí, čísla rozjížděk — je vada makety, ne návrhu.

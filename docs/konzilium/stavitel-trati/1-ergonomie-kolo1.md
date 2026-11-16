# Ergonomie ovládání — kolo 1

Měřeno na kódu obrazovky, na pravidlech průvodce a na maketách (390 × 844 pt,
iPhone v logických bodech). Klepnutí počítám po nejčastějších cestách.

## Co je dobře

1. **Pípnutí jako první klepnutí uspoří dvě na nejčastějším prvku.** Otočná
   bóje levobokem je dnes čtyři klepnutí — *Jedna značka*, *Otočit
   levobokem*, *Pípnout*, *Postavit prvek* (`stavba.tsx:323`, `:342`,
   `:399`, `:456`) — a to časově kritické je třetí. Podle makety jsou to dvě
   a kritické je první: −50 % klepnutí a nulová prodleva před jediným
   krokem, který má hodiny (`poloha.ts:40`).

2. **Pípni dostává pevné místo** — 86 pt na y 728–814, v dosahu palce. Dnes
   leží v `ScrollView` za bannery a předvolbami: tři pruhy po ~63 pt
   (`stavba.tsx:262–303`) a sedm předvoleb zabalených na 358 pt do tří
   řádků (~132 pt, `:366–388`) posunou jeho horní hranu o víc než 200 pt
   podle stavu. Pohyblivý hlavní terč neumí vybudovat návyk, a v rukavicích
   je návyk to, co člověk má místo miření.

3. **Živá vzdálenost předchází chybě, která stojí cestu zpátky.** Když oba
   body padnou blíž než `NEJKRATSI_LINIE_M = 5` (`stavba-prvku.ts:490`,
   `:500`), `kolmice` vrátí `null` a obrazovka nabídne jen větu a *Zahodit
   rozdělaný prvek* (`stavba.tsx:438–443`): oba body padnou a motorák jede
   k první značce znovu. **Otázka 3: zaplatí se, viz ale nález 5.**

4. **Zahodit zaseknutý prvek přestává být nejmenší terč.** Maketa `Fronta`
   z něj dělá 52pt plochu v kartě; dnes je to nahý odkaz `s.zahodit`
   (`:555–558`), skutečně ~41 pt (nález 3) — tedy nejhůř trefitelné
   klepnutí na obrazovce, a jediné, které rozjede zastavenou frontu.

5. **Stav polohy dostává trvalé místo.** Dnes je přesnost číslem jen v kroku
   3 (`:390–392`): odpověď na „jde vůbec pípnout" přijde až po dvou
   klepnutích, která se pak zahazují.

## Co je špatně

### 1. Sloučený seznam má v maketě sedm řádků, v pravidlech jedenáct — a klepnutí v něm už nic nehlídá
- **Nález.** `VOLBY` nese deset předpisů (`stavba-prvku.ts:223–311`) plus
  Odskok jako typ. Maketa `Popis` má sedm řádků: slučuje *po levoboku* a *po
  pravoboku* do jedné *Průjezdní*, tři dvoubodové varianty do jedné *Brány*
  a dva druhy startu do jednoho *Startu* — čtyři rozlišení, která dnešní
  průvodce zapíše, v seznamu nejsou.
- **Proč to vadí.** Buď je seznam nepravdivý, nebo má jedenáct řádků:
  11 × 56 pt + 10 × 6 pt = 676 pt, s hlavičkou (103), kartou polohy (66),
  dvěma nadpisy (76) a spodním pruhem (92) ≈ 1 010 pt na 844pt obrazovce →
  roluje se. Rolování je v rukavicích na popojížděícím motoráku nejhorší
  myslitelná interakce: flick se nedá dávkovat a nechtěné klepnutí během něj
  **zapíše prvek** — řádek nemá potvrzení a hotový prvek jde opravit jen
  z webu (`:72–77`). Rozteč navíc padá z dnešních 87 pt (`velke`: 36 pt výplně
  + 18pt titul + 14pt popis + 10 margin, `:516–522`) na 62 pt, o 29 %.
- **Návrh.** Sedm častých řádků a doptání na variantu jen u těch, které ji
  mají (brána, start), až **po** uložení polohy: otočná a průjezdní dvě
  klepnutí, brána a start tři až čtyři, a seznam neroluje.

### 2. Nejlíp dosažitelný terč na obrazovce je ten destruktivní
- **Nález.** V maketě `Dvoubod` leží *Zahodit rozestavěnou bránu* (48 pt,
  y 766–814) osm bodů pod *PÍPNI PRAVOU* (86 pt, y 672–758), oboje
  v pevném spodním pruhu.
- **Proč to vadí.** Spodní hrana je klidová poloha palce, takže nejsnadněji
  dosažitelná plocha zahodí rozestavěnou bránu včetně měření prvního konce
  — a náprava je jízda, ne klepnutí. Dnes tatáž sousednost existuje
  (`:414–416`), ale odroluje s obsahem; připíchnutím je trvalá.
- **Návrh.** Do řádku hlavičky k názvu prvku: dosažitelná zůstane, ale ne
  tam, kam dopadá bušící palec.

### 3. Dva terče na téhle obrazovce mez 44 pt nedrží a kontrola to nevidí
- **Nález.** `chip` (`stavba.tsx:543–548`): 2 × 12 pt výplně a řádek písma
  13 pt, jehož schránka je na iOS i Androidu ≈ 15,5 pt → **≈ 39,5 pt**.
  `zahodit` (`:555–558`): 2 × 12 pt a `Text` bez `fontSize`, tedy platformních
  14 → **≈ 40,7 pt**. `kontrola-dotyku.py` obojí pustí: každý
  řádek počítá paušálem `RADEK_PT = 20` (`:61`, `:179`), horním odhadem
  schválně, takže terči s 13pt písmem připíše 4,5 pt, které nemá. Proto
  `ZKOUSKA-STAVITELE.md:53–54` tvrdí, že předvolby „měly 36 pt a teď mají
  44" — obě čísla jsou čísla kontroly, vykreslené je 39,5.
- **Proč to vadí.** Bod 4 rámce se nediskutuje, a přesně na posuzované
  obrazovce **už neplatí**, aniž by to šlo poznat. Návrh řádek předvoleb
  vypouští (v maketě `Popis` značení není), takže nález zakrývá.
- **Návrh.** `minHeight: 44` u každého terče s písmem pod 16 pt: kontrola ho
  čte první (`kontrola-dotyku.py:169`) a na odhadu fontu nezávisí.

### 4. Cesta ke startu a cíli není doložená — růžice v maketách není
- **Nález.** `patriSmer` (`stavba-prvku.ts:513`) žádá u startu a cíle po obou
  bodech světovou stranu. Řádky *Start* i *Cíl* v maketě `Popis` vedou na
  `Dvoubod.dc.html`, kde krok se směrem není, a nemá ho ani jiná maketa.
- **Proč to vadí.** Start se staví pod největším tlakem a je to jediný
  prvek, u kterého návrh počet klepnutí nedokládá. Kdyby směr nebo druh
  startu připadl před druhé pípnutí, vrátí se vada, kterou návrh vyhlásil za
  hlavní.
- **Návrh.** Směr na totéž místo jako popis: start leží v seznamu jako
  „pípnutý, směr nedoplněn" a růžice se ptá odtamtud — pět klepnutí proti
  dnešním šesti a nic nepodstatného před pípnutím.

### 5. Vzdálenost se ukazuje bez meze, proti které se dá přečíst
- **Nález.** `Dvoubod` hlásí „63 m · roste". Jediná mez v kódu je
  `NEJKRATSI_LINIE_M = 5` (`stavba-prvku.ts:490`).
- **Proč to vadí.** Číslo bez měřítka odkládá rozhodnutí na člověka ve
  chvíli, kdy na ně má nejméně kapacity: nepotřebuje vědět 63, potřebuje
  vědět, jestli to stačí.
- **Návrh.** Pod 5 m k číslu větu, že z toho linie nevyjde; od 5 m výš
  samotné číslo. Jedna mez, ta jediná, která existuje.

### 6. Volba značení zmizela a platí se za ni ve frontě
- **Nález.** Dnes je značení řádek sedmi předvoleb s výchozí *Naše bóje*
  (`stavba.tsx:99`, `:366–388`). Maketa `Popis` nese barevnou tečku, ale
  volbu nikde. `Plavidlo` a `ObjektNaBrehu` (`stavba-prvku.ts:405–419`) jsou
  přitom to, co potřebuje start mezi startovací lodí a molem — a barvu ani
  tvar u nich server nebere (`jeBoje`, `:428`).
- **Proč to vadí.** Jestli to server odmítne, je otázka pro obor 9; cena je
  moje. Odmítnutý prvek zastaví frontu celou (bod 3 rámce) a ven vede jen
  zahodit a postavit znovu: 1 + 2 až 4 klepnutí a další jízda ke značce.
- **Návrh.** Jediný řádek s volbou, která mění druh záznamu — *bóje* /
  *není to bóje* —, jemnější značení webu.

### 7. Odskok dnes nelze postavit a skončí v zaseknuté frontě
- **Nález.** `TYPY` má u Odskoku dva body, ale `jak: "jedna"`
  (`stavba-prvku.ts:202–211`), takže se nabídnou předpisy z `VOLBY.jedna` —
  a `postav` ukládá `typ: volba.typ` (`stavba.tsx:199`), tedy `OtocnaBoje`
  se dvěma body, což `dvaBody` (`stavba-prvku.ts:74`) vylučuje.
- **Proč to vadí.** Pět klepnutí končí prvkem, který nejspíš zastaví
  frontu: plná práce, nulový výsledek, odblokování je klepnutí plus jízda.
- **Návrh.** Zároveň nejlepší argument pro sloučení z otázky 1: ve sloučeném
  seznamu je *Odskok* jeden řádek s vlastním předpisem. Postavit ten seznam
  tak, aby každý řádek byl jedna úplná a platná kombinace.

## Co bych potřeboval vědět

- **Obor 2 (design):** je 56pt řádek se 6pt mezerou v rukavicích ještě
  bezpečný terč při kontrastu makety? Měřím rozteč, trefu rozhoduje hrana.
- **Obor 3 (UX):** moje odpověď na otázku 2 je *nejvýš jedna nepopsaná
  značka* — dva řádky lišící se jen časem a souřadnicemi (`Popis`,
  „19:42:08 · ±4 m · 49,4957 N") jsou paměťová zátěž a souřadnice nejsou na
  vodě vodítko. Rozbije to tok, který potřebuješ?
- **Obor 9 (rizika):** má popsaný prvek po `hotovo()` (`fronta.ts:168`)
  cestu zpět v appce? Nález 1 to předpokládá.
- **Zadavatel:** otázka 4 — z hlediska ceny ovládání je odpověď četnost, ne
  pořadí na trati: pořadí stavitel zná z hlavy, četnost rozhoduje, kam jde
  palec bez čtení. Kolik z těch jedenácti věcí se za sezónu postaví?

## Čeho se nedotýkám

- Barvy, kontrast na slunci, typografie a „jedna plná plocha na obrazovku"
  (nález 6 návrhu) — obor 2. Měřím rozteč a výšku terčů, ne jak se čtou.
- Smysl toku, role pomocníka, prázdné stavy a chování při chybě — obor 3.
  Otázky 2 a 5 beru jen ze strany klepnutí a zapamatování.
- Jména položek, texty výzev a formulace vět — nezadáno.
- Jestli je „pípnutá, nepopsaná značka" bezpečná z hlediska dat a
  odpovědnosti za trať a jestli server prvek bez značení nebo odskok se
  dvěma body odmítne — obory 7 a 9. Počítám jen cenu návratu, až odmítne.

# Jachtař — kolo 1

Posuzuju jedno: sedí to na stavbu trati, jak se dělá, a netvrdí to o oboru nepravdu.

## Co je dobře

**Pípnutí jako trvale dostupná hlavní akce je věcně správné.** Motorák u bóje
nestojí — vítr s vlnou ho odnáší, takže okno, ve kterém je loď *u té značky*,
jsou vteřiny; typ, předpis i barva se dají doplnit po cestě.

**Nález 14 je ten nejdůležitější v návrhu.** Posun bóje podle větru není
zvláštní případ, je to průběh každého větrnějšího dne: vítr se stočí, horní znak
je vedle, jede se přesadit. Model na to byl navržený (`Boje.NahrazenaV`,
`Boje.cs:172–179`); appka to neumí.

**Nález 12 není kosmetika.** Směrnice barvu znakům slibuje („otočné znaky jsou
žluté nafukovací"), takže zapsat žlutou tam, kde plave oranžová, je rozpor
s textem, podle kterého posádka u bóje rozhoduje za deset sekund. **Nález 7** je
zase doklad, čím se po regatě dokazuje, kde znak stál a který to byl.

**Rozlišení `Brana` / `OtocnaBrana` je správně:** v otočné bráně si posádka
vybere, kterou bójí se otočí, a zapsat jí stranu by bylo vydávání jejího
rozhodnutí za pravidlo (`PrvekTrati.cs:66–85`). Stejně tak „odečteno z mapy ≠
změřeno" (nález 10, 15) a vlaječka na konci, kde stojí komise (nález 8).

## Co je špatně

### J1. Trať se staví podle větru, a vítr v návrhu není — ani směr a vzdálenost

Slovo *vítr* není v žádné z patnácti maket (`grep -ril` nad `navrh/` nenajde
nic); směr a vzdálenost jsou jen v `Dvoubod.dc.html:50`. Přitom stavba trati je
**navigační úkon**: horní znak se staví na azimut větru v dané vzdálenosti od
startu, startovní linie kolmo na vítr — rozhodčí neříká „dej ji támhle", ale
„tři sta metrů na nula dvacet". Tři místa to potřebují a žádné to nemá:

1. **Plán** (`Plan.dc.html`): akce *Jsem u ní* předpokládá, že stavitel
   k plánované značce dojede — a neřekne mu, kudy a jak daleko to je.
2. **Přesun** (nález 14): posune-li se znak během rozjížďky, pravidlo 33 žádá
   vyvěsit změnu dalšího úseku **s novým azimutem** (vlajka C a číslo) dřív, než
   na ten úsek vjede první loď. Appka to číslo zná a nevydá ho.
3. **Utržená bóje**: pravidlo 34 žádá vrátit znak na místo, nahradit ho podobným
   nebo tam poslat plavidlo s vlajkou M — a „na místo" se jede podle směru
   a vzdálenosti k uložené poloze.

**Co s tím.** U každého prvku směr a vzdálenost *odsud*, u linie navíc azimut
a délka — `azimut()` v `packages/stavba/stavba-prvku.ts:568`, `vzdalenostM()`
v `geo.ts:14`. A věta o větru v pruhu nahoře dá schématu z nálezu 9 smysl.

### J2. „Pořadí na trati" není seznam toho, co stojí ve vodě

Dvoukolová trať se v modelu zapisuje opakováním prvku — `start → A → brána → A →
brána → cíl` (`PrvekTrati.cs:177–182`); pojem *kolo* model nezná (`Trat.cs`).
Stavitel ale položil A **jednou**, takže na ose v `Main` i `Poradi` vyjdou na
jednu bóji dva řádky a *Přesunout sem* nebo *Sebrat* na jednom z nich nemá
jednoznačný význam. V praxi je počet kol věta ve směrnici, ne další bóje na vodě.
**Co s tím:** ukazovat **značky** (jeden řádek na bóji, u ní „jede se dvakrát"),
ne průjezdy; pořadí se skládá u mapy.

### J3. Přerovnání pořadí je rozhodnutí rozhodčího, a návrh ho dává staviteli pod palec

Model to říká sám: *„typ, pořadí, strana a směr jsou rozhodnutí rozhodčího"*
(`PrvekTrati.cs:146–149`). Mazání návrh schoval za příznak (nález 13, správně),
přerovnání ne — a stavitel na vodě pořadí nevymýšlí, dostane ho zadané. **Co
s tím:** režim *Přerovnat* za týž příznak jako mazání.

### J4. Startovní linie nemá levobok a pravobok

`stavba-prvku.ts:188–189`: *„Pípni levobok startu"*, *„Popojeď a pípni pravobok
startu"*, a značka vznikne jako `start levobok`. Linie se bokem neponechává,
**prochází se jí**; boky má loď, ne čára. Konce se jmenují tím, co na nich
stojí: **startovní plavidlo** (stěžeň s oranžovou vlajkou, u cíle modrá)
a **startovní bóje**. Jméno jde ven ve veřejných datech (`Boje.Nazev`), takže
„start levobok" dojde až k posádkám. **Co s tím:** *„Pípni konec u plavidla"*.

### J5. Otevírající se start pípá dvě věci, které se jmenují špatně

Volba *Otevírající se brána* (`stavba-prvku.ts:402`) nemá vlastní `jmena`, takže
`jmenaBodu` (`:431–438`) jí dá tytéž „start levobok / pravobok". U gate startu
žádné dva konce linie nestojí — po linii jede vodicí loď a branka se za ní
otevírá; dva body popisují, **kudy ta linie vede** (`PrvekTrati.cs:113–121`).
Stavitel pípne, na co se ho zeptají, a v datech bude linie, která nestála.
**Co s tím:** *„Pípni, kde brána startuje"* / *„kam dojede"*.

### J6. „Levá" a „pravá" značka brány se nemají k čemu vztahovat

`Dvoubod.dc.html:33,42` říká *Levá značka stojí* / *Pravá značka chybí*, jména
jsou `brána 2 vlevo / vpravo` (`:438`). U brány se směr průjezdu **neukládá** —
`smer` smí být jen u startu a cíle (`PrvekTrati.cs:302`) — takže „vlevo" znamená
jen „pípnuto první"; jak se motorák otočí, je ta levá vpravo. **Co s tím:** *první
konec / druhý konec*, nebo rozlišit tím, co stavitel vidí.

### J7. „Stačí se jí dotknout" slibuje pravidlo, které nikdo neposoudí

`Varianta.dc.html`, volba `OtocnaZona` / stopa `dotek`. Linie mezi dráty VN a
bodem na břehu je imaginární: dotek nevidí rozhodčí z lodi a **nepozná se ani
z trasy** — z trasy se pozná proplutí za ni, a na porovnání trasy se stavem
trati celý projekt stojí. **Co s tím:** slovo, které jde posoudit a je stejné
jako ve směrnici — *„otočit se za linií"*.

### J8. „Otočit levobokem" je dvojznačnost, kterou projekt už jednou odstranil

`PrvekTrati.cs:88–96` to má zapsané: opis *„ponechat po levé"* vznikl proto, aby
si nikdo nepřečetl „objíždí se levou" jako „točit doleva", a padl kvůli
námořnictví. Jenže **ponechat znak po levoboku znamená točit doprava** — past se
vrátila a je v šesti dlaždicích z dvanácti (`NABIDKA`, `:270` a dál). Rozhodčí
ani směrnice neříkají, kam se točí; říkají, kterou stranou se znak ponechává.
**Co s tím:** *„Otočná — ponechat po levoboku"*. Náhled to dorovná, ale pravdivé
musí být i jméno — v seznamu a v datech zůstane jen ono.

### J9. Vzdálenost u druhého bodu je u startu a odskoku operační číslo, ne pojistka

Nález 4 ji obhajuje jako kontrolu proti pětimetrové bráně — platí, ale je to
menší polovina. Odskoková bóje se dává pár délek lodi za otočnou (zvyk: tři až
čtyři), startovní linie podle startovního pole (zvyk: asi 1,25 až 1,5násobek
součtu délek lodí). Číslo z `Dvoubod.dc.html:50` tedy patří i **u startu, cíle
a odskoku**, u startu i po dopípnutí: délka linie je údaj na celé ráno.

### J10. Červené kolečko u brány říká něco jiného, než se myslí

`Main.dc.html:58` kreslí Bránu 2 červeným kolečkem (`#c1121f`); červená je ve
vyhlášce **pravá strana plavební dráhy** (`Boje.cs:263`, `DrahaPrava`) a naše
brány jsou naše bóje, žluté nebo oranžové. Barva v seznamu smí být jedině barva
té věci ve vodě, nikdy kategorie prvku — jinak učí opak toho, co platí.

## Co bych potřeboval vědět

1. Dostává stavitel umístění zadané (azimut a vzdálenost rádiem od rozhodčího),
   nebo o něm rozhoduje sám? Podle toho má appka ta čísla ukazovat, nebo přijímat.
2. Jede se na Orlíku na kola (`start → 1 → 2 → 1 → 2 → cíl`)? Když ano, je J2
   první věc k opravě; když ne, je to malá vada.
3. Vyhlašujete u drátů VN doslova „dotknout se", nebo „otočit se za nimi" — a co
   podle toho posuzujete při protestu?
4. Startujete někdy otevírající se bránou, nebo je ta volba v modelu pro
   jistotu? Pokud se nepoužívá, stačí ji z nabídky vyřadit.
5. Posouvá se bójka i **během** rozjížďky, nebo jen mezi nimi? Jen pro první
   případ platí celé pravidlo 33, tedy i bod 2 v J1.
6. Mluvíte s rozhodčím o *znaku*, o *značce*, nebo o *bóji*? V appce má „znak"
   obsazený vyhláškou; stojí za to srovnat to se slovníkem z vody.

## Čeho se nedotýkám

- Počet klepnutí a terče — **1-ergonomie**; týká se to i J1: jestli směr
  a vzdálenost unese pruh nahoře, nebo řádek u prvku.
- Paleta, kontrast, hierarchie, jeden jazyk patnácti obrazovek — **2-design**,
  včetně toho, jak se z J10 udělá systém barev.
- Stavy, prázdné obrazovky, co dělá plán, který neexistuje, a jestli „jedna
  obrazovka ve stavech a režimu" drží — **3-ux**.
- Nativní závislosti a otisk (mám k tomu jen tolik, že pravdivý záznam trati
  stojí za jeden ruční build) a pojmenování v kódu — mluvím o slovech, která
  stavitel čte na obrazovce a která jdou ven v datech.

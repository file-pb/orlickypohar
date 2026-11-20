# Jachtař — kolo 2

## Kde ustupuju

**Vítr na obrazovku nepatří. Ruším tu část J1** (spor A). Stavitel vítr vidí — na
vlajce na stěžni, na čeřeni, na nárazech od břehu, a na kaňonu Orlíku i ve tvaru
vody. Co z vody přečíst nejde, je **geometrie**: že je to tři sta metrů a že to
je na nula dvacet. Pruh s větrem by nesl údaj, který stavitel zná lepší cestou,
a 2-design má pravdu, že by to byla řádka za nic. Vítr má smysl u plánu
v kanceláři, a to není tahle obrazovka.

**Barva ven ze zakládací cesty** (1-ergonomie/E5) je přesně praxe: do motoráku se
ráno naloží jedna krabice bójí. Řádek *„dnes stavíme oranžové"* je věcně
správnější než otázka u každé bóje.

**Varianta až po druhém pípnutí** (E7), a přidávám důvod z oboru: mezi konci
brány se **jede**, a volba *brána / otočná brána / linie* není rozhodnutí
stavitele u kormidla — je to rozhodnutí rozhodčího o tom, jak se to jede. Ptát se
na ně při popojíždění je dvojitá chyba: špatný čas a špatný člověk.

**Jedna osa a jeden tvar řádku** (2-design/2) beru i v obsahu: *cíl* nesmí být
třikrát jiná věc. A **jantarová karta plánu ať zmizí** (spor D) — vejdou se mi do
toho místa čísla, viz níž.

## Kde držím

### A — vzdálenost je nepostradatelná, azimut unese detail

1. **Vzdálenost k tomu, k čemu loď jede: nepostradatelná, u akce.** Vzdálenost
   nad vodou nikdo neodhadne — odhaduje se systematicky kratší a je to nejstarší
   chyba v oboru. Visí na ní čtyři věci: délka startovní linie podle startovního
   pole, odstup odskokové bóje, dojetí k plánované značce a vrácení utržené bóje.
   **Nic kvůli tomu nezmizí**, protože rozhodnutí 4 závěru to místo samo určuje —
   *„číslo jen u akce a v detailu"*. Tam dnes stojí „±4 m"; vedle patří „240 m"
   k cíli jízdy. Místo navíc dá zrušená karta plánu (67 dp proti řádku).
2. **Azimut: jen v detailu prvku, ne trvale.** Potřebuje se třikrát za regatu, ne
   dvacetkrát: u plánované značky, u vrácení utržené bóje a jako číslo, které
   rozhodčí vyhlašuje při změně úseku (pravidlo 33). Je to věta v detailu —
   *„nový azimut úseku 015°"* —, kterou stavitel přečte do vysílačky.
3. **Vítr: nikam** (viz výš).

Spor A má tedy odpověď, která nepřidává řádku: číslo u akce, azimut v detailu,
karta plánu pryč.

### E — když přerovnání není pro stavitele na vodě, gesto není potřeba vůbec

J3 držím: pořadí je rozhodnutí rozhodčího (`PrvekTrati.cs:146–149`), za týž
příznak jako mazání. Tím se ale **E9 rozpouští**, místo aby se řešil: úchyt
24 × 15 pt se nemusí zvětšovat, protože přetažení tam nemá co dělat. Jediný
případ, kdy pořadí sahá stavitel sám, je *„pípnul jsem to v jiném sledu, než jak
jsem jel"* — oprava o jedno, dvě místa, a na to je *výš / níž* v detailu lepší
než tažení. Vedlejší zisk: padá `gesture-handler` i `reanimated`.

### F — osa ať ukazuje značky; když se netrefím, je to levnější chyba

- **Jede se na kola.** Osa průjezdů dá na jednu bóji dva řádky a *Přesunout sem*
  na jednom z nich sáhne na kus plastu, který je ve vodě jeden.
- **Nejede se na kola.** „Značky" a „průjezdy" jsou **tentýž seznam** a J2 nemění
  nic.

Odtud ta nesymetrie: *značky* jsou v jedné větvi správné a v druhé neškodné,
*průjezdy* v jedné správné a v druhé nebezpečné. Netrefím-li se směrem ke
značkám, přijde stavitel o pohled na sled trati — a ten má ve směrnici a na
tabuli u startovní lodi, odkud ho čte i posádka. Netrefím-li se druhým směrem,
přesune se špatný záznam a pozná se to po závodě z mapy. Druhá chyba je horší.
Můj odhad je, že se na kola jede (dvě až tři kola nahoru–dolů je běžná podoba
rozjížďky), ale rozhodnutí to nepotřebuje.

## Kde jsme se shodli

- **Barva v seznamu je barva té věci ve vodě, nikdy kategorie prvku** (J10
  + 2-design/2), a nese ji **jedna řádka 56 dp s kresbou značky vlevo a stavem
  slovem vpravo** — tím je nález 8 i J10 vyřízený jedním tvarem.
- **Proužek polohy je první věc pod hlavičkou ve všech stavech**, karta plánu
  zmizí (spor D).
- **„Plán existuje" je `Trat.ZverejnenaV`, ne dopočet ze `Zdroj`** (3-ux/2).
  Z oboru to sedí doslova: plán je plán ve chvíli, kdy ho posádky dostanou —
  stejně jako směrnice platí vyvěšením. Dráty ani molo se do plánu nepočítají:
  k nim se nejede, takže se u nich nedá stát a potvrdit je.
- **Jména z J4–J8 jsou vada návrhu, ne makety** (zápis moderátora, bod 6).
- **Jedna obrazovka se opraví překreslením, ne rozhodnutím.**

## Nové, co vylezlo z cizích posudků

**G — klon je normální začátek druhé rozjížďky, ne zvláštní cesta.** Druhá
rozjížďka dne se jede na **téže trati**: bóje zůstanou ve vodě, nikdo nic
nepokládá a nikdo nepípá; rozhodčí nejvýš přesadí horní znak, když se vítr
stočil, nebo trať zkrátí. `POST /{trat}/klon` (*„kopíruje prvky na tytéž bóje —
žádná nová pípnutí"*) tedy není obezlička, je to **ten obvyklý průběh**, a sled
úkonů je klon → případný přesun horního znaku → hotovo. Dvě věci k tomu z oboru:
klon **musí být nová trať** s vlastním přijetím, protože autorita se dává na
jednu rozjížďku, ne na den; a změna mezi rozjížďkami se vyhlašuje na tabuli před
startem, takže pravidlo 33 (vlajka C) na ni **neplatí** — to platí jen na posun
během jezdící rozjížďky. Kdo klon zakládá, je otázka na Filipa; obě odpovědi jsou
v praxi vidět.

**3-ux/5 — jak daleko bývají dva plánované prvky.** Číslo, které mi v kole 1
chybělo: odskoková bóje stojí pár délek lodi za otočnou, u našich lodí
**patnáct až třicet metrů**; konce brány a startovní linie desítky až dvě stě
metrů. Pod padesát metrů tedy GPS dva kandidáty nerozliší a obrazovka se **musí
zeptat**; nad to si cíl vybrat smí. Jméno cíle na tlačítku je správně.

**3-ux/3 — `GET …/trat/prvky` nevydává `Zdroj`, `Barva` ani `Tvar`.** To jsem
neviděl a mění to J10: dokud ten údaj klient nemá, nekreslí seznam barvu bóje
**ani kdyby chtěl** — kreslí kategorii, protože nic jiného nezná. Oprava DTO je
tedy podmínkou J10 i nálezu 8, ne jejich následkem.

**2-design se ptá, smí-li bójka v seznamu přijít o barvu.** Tvar sám odliší znak
plavební dráhy od naší bóje, takže váhu nést může. Barva odlišuje **naše bóje
mezi sebou** (žlutá proti oranžové) a to se v jednom dni stane málokdy — z jedné
krabice. Takže barva smí být slabá, nikdy ale nahrazená barvou kategorie.

## Podmínka

1. **Jména, která jdou ven v datech, opravit dřív, než se obrazovka poprvé použije
   na vodě** (J4–J8). Záznam značky je měření a jméno se po zápisu nepřepisuje:
   co se zapíše jako „start levobok", je v datech napořád a dojde k posádkám.
2. **Vzdálenost k cíli jízdy u akce, azimut v detailu prvku.** Bez nich obrazovka
   neumí dojet k plánované značce ani vrátit utrženou bóji — a to jsou dvě ze tří
   věcí, proč se s telefonem na vodu jede.

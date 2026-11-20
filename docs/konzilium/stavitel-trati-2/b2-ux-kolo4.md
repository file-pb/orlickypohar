# UX — kolo 4

## Rozhodnutí

**α — volba 1, jen stav slovem.** Rozhodlo to, že bod 2 už to číslo umístil
k akci: vzdálenost v řádce i nad tlačítkem je **týž údaj dvěma tvary**, tedy
přesně to, čím zmizela jantarová karta plánu. Jachtařovu námitku ale beru
v tom, co není číslo: **šipka** je jiný kanál než číslice a nedubluje nic —
nemám nic proti ní v žlábku nebo před slovem u té jediné značky, ke které se
jede, potvrdí-li 2-design, že se vejde vedle sloupce 114 dp. Metry zůstanou
u akce, jednou.

**β — volba 2, souvislé vlákno.** Dva argumenty 2-designu jsou falzifikovatelné
a sedí: dvě tečky nejsou vzorek (přerušovaná potřebuje tři opakování) a vlákno
není prvek ve sloupci, takže na něm zkrácení rozteče není vidět. Z mého oboru
k tomu jedno: vlákno kreslené od prvního uzlu k poslednímu **nemá mezeru jako
samostatný stav**, takže se nemusí rozhodovat, jak vypadá spojnice mezi řádkou
odeslanou a řádkou, co čeká ve frontě. Tečky by ten stav musely řešit.

**γ — volba 1, mazání na lodi zůstává, ale s podmínkou.** Měním pozici z kola 3
a mám k tomu dva důvody. Jachtařův: bez mazání vede z omylu jediná cesta,
a to **přesun** — tedy ten jediný úkon, který historii trati doopravdy přepíše.
A můj vlastní dopočet: dvojznačnost, kterou jsem namítal, vzniká **jen u značky
se dvěma průjezdy**, a ty prvky stavitel nezaložil — opakování vzniká tam, kde
trať někdo skládá, tedy v kanceláři. U značky, kterou stavitel pípl sám, je
prvek právě jeden a mazání cíl nemá jak minout. **Podmínka:** u značky se dvěma
průjezdy se akce nenabízí, nebo musí říct, který průjezd maže. Filipovi tedy
neodpovídám nic — dostane, co si vyžádal.

**δ — volba 1, přesun ano, sebrání ne.** Zamítnout pomocníkovi přesun ten zápis
nezabrání, jen ho **zhorší**: pípnout novou značku smí (`Pomocnici.SmiStavet`
pouští `POST …/trat/prvky/postav`), takže na větrný den položí vedle staré bóje
druhou jako nový prvek, místo aby tu starou označil za nahrazenou. Výsledkem je
trať se zdvojenými značkami a bez řetězu `NahrazenaV` — horší data než ten úkon,
který jsme mu odepřeli. Sebrání měření není a patří za silnější příznak.

## Co nesmí spadnout pod stůl

**Prázdný stav není v žádné z patnácti maket, a proto se zapomene první** — je to
přitom obrazovka, kterou stavitel vidí na začátku každé regaty, a živý kód
rozlišuje dva (`stavba.tsx:468–471`): „nic tu nestojí" a „nepřečetlo se".
A ten druhý dnes lže, protože `nactiZaSebe` vrací `null` i na **401**
(`api.ts:85`): vypršelá relace se ukáže jako „bez signálu se stavět dá" a pozve
stavitele pokračovat, zatímco každý prvek skončí na „Nikdo není přihlášený".

## Výhrada

**Klon nesmí být v appce dřív, než přepojení prvků umí trať.** Uzavřený seznam
z klonu dělá obvyklý začátek druhé rozjížďky za tři klepnutí, ale
`PrepojPrvkyAsync` nefiltruje trať (`BojeSprava.cs:183–185`) a klon kopíruje
prvky na tytéž záznamy bójí (`TratSprava.cs:881–884`) — takže *Přesunout sem*
v druhé rozjížďce přepíše prvky té první, odjeté. Hlasovat se o tom nakonec
nedalo, protože v kole 4 ta podmínka na hlasování není; chci ji proto v závěru
i s důvodem. Postavit klon a přesun v jednom vydání bez toho filtru znamená
dát staviteli do ruky tři klepnutí, kterými tiše přepíše doklad o trati,
podle které se už jelo.

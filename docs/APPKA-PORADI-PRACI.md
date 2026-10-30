# Appka: v jakém pořadí se staví a co čeká na jednu instalaci

**Stav k 30. 10. 2026.** Dva seznamy, oba krátké. První říká, co se staví
a v jakém pořadí. Druhý vedl nativní závislosti, které se musely přidat
**najednou**, protože každá z nich posune otisk a Miloš kvůli ní instaluje
znovu — **ta dávka je od 30. 10. 2026 nainstalovaná** a seznam se změnil
v soupis toho, co z ní plyne.

Návrh obrazovek je na plátně **Start v appce — návrh**
(<https://claude.ai/artifact/F3bpQH1cX6VSjAGTuFc9bC>).

---

## Pořadí prací

Určil Filip 29. 10. 2026. Appka je **pomocník rozhodčího, dirigent**: drží
takt, zatímco rozhodčí dělá to své.

| | Co | Pro koho | Stav |
| --- | --- | --- | --- |
| 1 | **Rozhraní startu** | rozhodčí | **postavené** (29. 10. večer), s hlasem a klaksonem od 30. 10. |
| 2 | **Rozhraní cíle** | rozhodčí | **klepání a ukončení postavené**, viz níž |
| 3 | **Rozhraní závodníka** | posádka | návrh vstřelený, bude se ladit |
| 4 | **Stavitel tratě** | pořadatel | *„na to bude ale klid"* |

**Co se vědomě nestaví.** Informace pro veřejnost a diváky: *„funkce
informace pro veřejnost a diváky je marginální a kdoví jestli ji budeme
potřebovat. Na to máme web."* Čtení výsledků v appce zůstává, ale nikdo
kvůli němu nic nepředělává.

### Cíl: co stojí a co ne (29. 10. 2026)

Postavené v appce: karta *Cíl* na obrazovce regaty (ukáže se, jen když
rozjížďka jede), klepání na lodě s časem z hodin telefonu, průběžné
pořadí přes všechny kategorie, oprava posledního klepnutí i jednotlivého
místa (smazat, prohodit s předchozí), ukládání celé sady po každé změně
s revizí a *Ukončit rozjížďku*, které zbylým lodím zapíše DNF a zastaví
časomíru. Rozepsaný zápis leží v souboru, takže přežije i konec appky.

**Trasování navrhuje, nerozhoduje** (nález R33, postaveno tentýž večer).
Server počítá ze stopy, kdy která loď protla cílovou čáru *ve směru do
cíle* — bez směru by u Orlíku, kde cíl leží na startu, hlásil dojezd
celému poli ve chvíli startu. Z toho jsou v appce dvě věci:

- **čerstvý průjezd lodi, která ještě nemá místo**, se ukáže jako návrh
  s čárkovaným okrajem; klepnutím se zapíše — i s tím přesným časem;
- **k zapsanému klepnutí** nabídne obrazovka čas ze stopy, když leží do
  minuty od něj. Rozhodčí určil, *kdo* dojel, trasování dodá *kdy*.

Nic se nezapisuje samo a nic se nemaže.

**Co ještě ne.** Kódy kromě DNF (OCS, DSQ, odstoupila) se zapisují na
webu; v appce zatím nejsou. Lodě mimo regatu („Další lodě") taky ne —
appka nabízí ty přihlášené, a když přihlášky nikdo nevede, celý ročník.

### Co drží rozhraní rozhodčího pohromadě

- **Start i cíl musí být po zapnutí telefonu hned**, bez proklikávání
  (Filip, 29. 10.). Proto dvě karty pod jménem regaty, ne položky v menu.
- **Výsledky na obrazovku rozhodčího nepatří.** U startu nepotřebuje body
  z minulých rozjížděk; potřebuje čas a dlaždice. Výsledky zůstávají na
  obrazovce regaty, kde je čtenář hledá.
- **Loď se vybírá až jako druhý krok**, po klepnutí na trest nebo OCS —
  doloženo nahrávkou 21: *„Druhá dlaždice by měla být alternativní trest.
  A tu, když máčknu, tak bych tam měl vidět jména všech přihlášených lodí."*
- **Trestná lavice** drží běžící tresty na dně obrazovky; klepnutím na loď
  se trest odčiní.
- **Rozjížďku ukončuje rozhodčí, ne hodiny.** Tlačítko *Ukončit rozjížďku*
  je na cíli vždycky a zbylým lodím zapíše DNF; appka sama neukončí nic,
  ani když mají dojezd všichni — jen nabídne. Časový limit podle ZPJ 35
  se v prvních verzích nehlídá (Filip, 29. 10. 2026: *„v prvních verzích
  prostě ukončí ofiko rozhodčí"*). Pravidlo 35 ostatně aplikace nezná
  vůbec a plachetní směrnice poháru žádný limit nevypisuje, takže by
  nebylo co hlídat.
  <br>**A hlídat to ani netřeba, protože ukončení je brána:** dokud
  rozjížďka není uzavřená, nejde zahájit další ani podepsat výsledky
  (Filip tamtéž: *„jinak se nedostane k další a nebo ho to nepustí
  k uzavření výsledků"*). Rozhodčí tedy na ukončení nemusí být
  upozorňován — narazí na něj sám ve chvíli, kdy chce pokračovat.

### Názvosloví, na kterém záleží

- **Ohlásit rozjížďku**, ne *zahájit*. Zahájení zní, jako by se tím
  startovalo; ohlášení je to, co rozhodčí doopravdy dělá — řekne, že se
  pojede další, a teprve pak se nastaví čas a spustí procedura
  (Filip, 29. 10. 2026).
- **Jedeme do přístavu** ukončuje závodní den: další signály budou na
  břehu. Je to vedle ohlášení další rozjížďky, protože v tu chvíli se
  rozhoduje mezi těmi dvěma.

**Co zbývá probrat:** návrat do přístavu *jen na oběd*. Není to konec
dne ani odložení před startem — den pokračuje, ale jinde, a pravidla pro
to mají vlastní signál (AP nad H). Zatím se s tím nepočítá.

### Co má vidět posádka

Barvu stavu, pokyn závodní komise, svou loď s posádkou, spojení a jestli
se vysílá poloha. **Odpočet ne**: po síti chodí se zpožděním a na lodi by
sváděl řídit se jím místo znamení od komise. Barva zpožděním nelže
(rozhodnuto 29. 10., nález R34).

---

## Nativní dávka: nainstalovaná 30. 10. 2026

**Proč se čekalo.** Každý nativní balíček posune otisk (`runtimeVersion`
z fingerprintu), a tím přestanou na vydané APK dosedat aktualizace
vzduchem — Miloš by instaloval ručně po každém. Proto se přidaly najednou,
až bylo jasné, co rozhraní potřebuje; po dokončení startu i cíle to jasné
bylo.

| Balíček | Na co | Doložení |
| --- | --- | --- |
| `expo-keep-awake` | aby telefon uprostřed odpočtu nezhasl | Miloš, 27. 10.: *„mobil mi nesmí usnout"* |
| `expo-speech` | mluvená hlášení | nahrávka 21: *„abych nemusel držet … megafon"* |
| `expo-audio` | klakson, **a zvuk i na pozadí** | tatáž věta: *„houkačku"*; Filip, 29. 10. |
| `modules/nerusit` | *Nerušit* na dobu procedury (jen Android) | Filip, 29. 10.: *„krylo Milošovi nervy"* |

**Co se k tomu postavilo.** Partitura (`app/src/lib/hlaseni.ts`) stála už
dřív a má testy bez telefonu; nové je to, co ji přehrává
(`app/src/lib/dirigent.ts`).

**Klakson je nahrávka, ne syntéza** — a stála za to oklika. První pokus
skládal čisté sinusovky a Filip o něm řekl, že je to *„taková houkačka
pro děti"*. Měření jeho nahrávky skutečné Lalizasky ukázalo proč:
**základ 574 Hz během troubení klesá k 556 Hz a druhá harmonická
převezme vedení nad základem**, jak ubývá tlak. Syntéza, která stojí
na místě, tohle nemá — a dohnat to vzorcem šlo jen zčásti.

Zvuky proto vyrábí `app/scripts/klakson.py` z nahrávky *airhorn.wav*
od `guitarguy1985` z Freesoundu (CC0, tedy volné dílo; původ se uvádí
kvůli dohledatelnosti, ne kvůli licenci). Oba jsou **začátek nahrávky
uříznutý na potřebnou délku a zakončený jejím vlastním doběhem**
(Filip, 30. 10. 2026: *„ber jejich od začátku a zakonči ho tím jejich
koncem, tím to bude vypadat věrně"*) — umělý fade-out zněl jako
vypnutí, tenhle doběh jako puštěné tlačítko. Krátký má 1,72 s, dlouhý
4,12 s.

**Z YouTube se nestahovalo** a nebude: zvuk, který appka rozdává
rozhodčímu a posádkám, musí mít čistou licenci.

Hlášení po troubení čeká, až klakson dozní (`DELKA_TROUBENI_MS`
v `hlaseni.ts`) — jinak by věta zazněla pod ním. Že to číslo sedí se
soubory, hlídá `app/testy/zvuky.test.ts`, který délku čte rovnou
z WAV hlavičky.

Délky „krátce" a „dlouze" ZPJ v sekundách neurčuje — je to volba podle
toho, jak se troubí na vodě, ne citace pravidla.

**Hlas má přepínač a ten se musí ozvat.** Panel startu má řádek *Hlásí
a troubí / Mlčí*, volba se pamatuje mezi spuštěními, a při zapnutí appka
krátce zatroubí a řekne *„Dirigent hlásí"* — rozhodčí tím zjistí, jestli
z kapsy něco uslyší a jak nahlas. Hlásí se **jen tomu, kdo velí**;
obrazovku regaty čte i závodník a divák.

**Jedna věc, která se postavila jinak, než zněla v plánu.** Hlášení
a troubení v témže okamžiku se nedají přehrát přes sebe — klakson by
hlášení přehlušil. Věta proto jde až po doznění zvuku. Vyšlo to z testu,
který odhalil, že původní podoba vracela z jednoho okamžiku jen jednu
věc, takže by se při běžném tiku **buď netroubilo, nebo nemluvilo**.

### Appka houká s Milošem, ne místo něj

Filip, 29. 10. 2026: *„Houkat musí Miloš stejně, ale telefon bude houkat
s ním. Díky tomu se nemusí Miloš koukat na displej, protože uslyší
dirigenta, co má dělat."*

**Pozor při čtení Milošových odpovědí.** PDF *Aplikace u startu a v cíli*
mu Filip poslal **29. 10. 2026 odpoledne, ještě před tímhle upřesněním**.
Stojí v něm, že aplikace má Milošovi sundat z ruky stopky, houkačku
i megafon — a to už neplatí: houkačku drží dál. Další verzi mu Filip
posílat nebude (*„nebudu mu posílat 5 verzi"*), takže **jeho odpovědi
budou reagovat na ten starší text**. Když v nich bude něco o tom, že
nechce přijít o houkačku, není to nesouhlas s návrhem — je to odpověď
na větu, která se mezitím opravila.

**Tím se mění, k čemu ten hlas je.** Není to hlášení posádkám místo
megafonu — je to <b>vodítko pro rozhodčího</b>. Odpočet *„pět, čtyři,
tři, dva, jedna"* je signál, kdy zmáčknout houkačku; hlášení po něm
*„pět minut do startu"* slyší posádky jako vedlejší účinek, ne jako
hlavní účel.

**A proto se deset vteřin předem řekne i jaký tón přijde** (Filip,
30. 10. 2026: *„jak upozorňuješ, co se bude hlásit, tak tam dodej, když
bude tón, tak jaký bude. Tím zajistíš, že Miloš bude vědět, co se hlásí
a jakým tónem, a pak 5 4 3 2 1"*). U jedné minuty tedy zazní *„Jedna
minuta, dlouhý tón"*, po třech vteřinách ticha *„pět, čtyři, tři, dva,
jedna"* a na nule zvuk. Dřív se obojí mačkalo do jedné věty puštěné pět
vteřin předem — ta se tam nevešla a odpočet se o ni opozdil.

**Číslovky jsou pět samostatných hlášení, každé na svou vteřinu.** Jedna
věta dozní, kdy dozní, podle toho, jak rychle telefon mluví; takhle
poslední číslo padne na vteřinu, po které se troubí. Zbývá v tom jedna
nepřesnost, kterou se vyplatí znát: panel tiká po vteřině, takže zvuk
může zaznít až vteřinu po svém okamžiku. Spravit to jde plánováním
dopředu (`setTimeout` na přesný zlomek vteřiny) a na vodě se to má
změřit dřív, než se na odpočet někdo spolehne.

Tři věci, které z toho plynou a jinak by se postavily špatně:

- **Odpočet musí jít dost dopředu**, aby rozhodčí stihl zareagovat. Pět
  vteřin je proto minimum, ne ozdoba.
- **Klakson appky má splynout s houkačkou**, ne s ní soupeřit. Krátký
  a čistý; dvě houkačky v rozfázi znějí jako chyba, ne jako důraz.
- **Telefon nemusí být na očích.** Právě proto, že Miloš poslouchá místo
  dívání, může ležet v kapse nebo pod pláštěnkou — a tím se zvuk na
  pozadí mění z pohodlí na podmínku. Odpočet na zamčené obrazovce musí
  hrát, jinak ten celý nápad nefunguje.

### Odpočet nesmí uhnout

Filip, 29. 10. 2026: *„když jede závod a startovní procedura nesmí uhýbat
— když někdo zavolá, nebo naskočí jiná appka, nebo telefon usne, tak se
nesmí zastavit, nebo vypnout, nebo přestat měřit."*

Rozpadá se to na tři věci a každá má jiné řešení:

| Co se stane | Co to udělá | Jak je to vyřešené |
| --- | --- | --- |
| hovor, přepnutí appky | `setInterval` stojí | **hotovo** — čas se nepočítá přičítáním, ale pokaždé znovu z hodin, a návrat z pozadí překreslí hned (`AppState`) |
| zhasnutý displej | po probuzení totéž | totéž; navíc `expo-keep-awake`, aby k tomu nedošlo |
| appka na pozadí | zvuk nezazní | **hotovo** — `UIBackgroundModes: audio` z config pluginu `expo-audio`, na Androidu přehrávací služba a zámek (bez něj systém po ~3 minutách ztiší) |

**Co z toho plyne pro zvuk.** Hlášení a troubení na pozadí není totéž co
přehrát zvuk: iOS zvukovou relaci při hovoru přeruší a appce ji musí
vrátit, jinak klakson po hovoru mlčí.

**Jak je to vyřešené, a proč takhle.** `expo-audio` událost o přerušení
nevydává — v jeho typech na to žádný posluchač není. Appka proto na konec
hovoru nečeká: **relaci si vyžádá znovu před každým znamením**
(`probudRelaci` v `dirigent.ts`). Partitura hraje aspoň každou minutu,
takže se po zavěšení naváže sama. Vyzkoušet to jde jen na telefonu;
simulátor hovor neumí.

### Co se stane, když Milošovi uprostřed procedury zavolá manželka

Filip, 29. 10. 2026: *„nechci se dostat do situace, kdy Milošovi zavolá
manželka uprostřed startovní procedury a udělá to z něj blbce před celým
soutěžním polem."*

**Čtyři věci, a jen tři z nich jdou vyřešit v appce:**

| | Co se stane | Jde s tím něco udělat? |
| --- | --- | --- |
| měření | běží dál | **ano, hotovo** — čas se bere z hodin, ne z čítače |
| obrazovka | překryje ji hovor | **ne** — appka cizí obrazovku neodsune |
| zvuk **během** hovoru | iOS ho přeruší | **ne** — tohle neobejde žádná appka |
| zvuk **po** hovoru | sám se nevrátí | **ano** — relaci je potřeba obnovit po přerušení |

**Takže slib „appka troubí i během hovoru" se splnit nedá** a nemá se
slibovat. Co se splnit dá: aby po zavěšení hlášení okamžitě navázalo tam,
kde procedura doopravdy je — ne tam, kde zvuk skončil.

**A proto je jediná skutečná pojistka mimo appku:** rozhodčí si před
procedurou zapne *Nerušit*. Appka to za něj udělat nemůže (iOS to
nedovolí), ale může to připomenout ve chvíli, kdy proceduru spouští.
To je levné a je to to jediné, co ten případ doopravdy odstraní.

**Nepočítat ani s tím, že appka nahradí houkačku úplně.** Zůstává
pomocníkem, který drží takt; houkačka v ruce je záloha pro případ, kdy
telefon mlčí z důvodu, na který appka nedosáhne.

#### Může si appka zapnout Nerušit sama?

Filip, 29. 10. 2026: *„to by bylo dobrý, kdyby se to uprostřed startovní
procedury přeplo do nerušit a tím na chvíli krylo Milošovi nervy."*

**Na Androidu ano, na iPhonu ne** — a protože Miloš má Android a Filip
iPhone, je to rozdíl, který se projeví přesně u toho člověka, o kterého
jde.

| | Jde to? | Čím |
| --- | --- | --- |
| **Android** (Miloš) | **ano, postaveno 30. 10.** | `NotificationManager.setInterruptionFilter` s oprávněním `ACCESS_NOTIFICATION_POLICY`; uživatel ho jednou povolí v nastavení, a panel startu mu to nabídne |
| **iPhone** (Filip) | **ne** | Focus je systémové nastavení, které aplikace nepřepíná; privátní URL do Nastavení Apple zamítá |

**Kdy má klid platit.** Od <b>minuty před zahájením procedury</b> do
<b>pěti minut po startu</b> (Filip, 29. 10. 2026) — tedy přesně to okno, kde každá vteřina
něco znamená: po startu se řeší předčasné starty a případné odvolání,
a teprve pak se dá zvednout telefon. Mimo ně se režim nemění; vypnout
rozhodčímu vyzvánění na celý den by byla medvědí služba. Pravidlo je
postavené a otestované jako `maBytKlid` v `app/src/lib/start.ts` — chybí
k němu jen ta nativní část, která ho provede.

**Appka o tom mluví na obou koncích.** Minutu před procedurou řekne
*„Přepínám se do režimu Nerušit"*, o půl minuty později *„Za třicet vteřin
bude zahájena startovní procedura"*, a teprve pak jede partitura. Pět
minut po startu ohlásí *„Vypínám režim Nerušit"*. V předehře se schválně
netroubí: procedura ještě neběží a zvuk by poslal posádky ke startu dřív,
než má. A konec se ohlašuje proto, že tichý návrat do normálu by znamenal,
že rozhodčí nepozná zmeškaný hovor od vypnutého telefonu.

**Co na iPhonu zbývá:** automatizace ve Zkratkách — *při otevření
aplikace zapni Nerušit, při zavření vypni*. Nastaví si ji uživatel sám,
jednou, a pak funguje bez appky. Appka na ni může odkázat, udělat ji za
něj nemůže.

**Co to obnášelo na Androidu.** `expo-notifications` v závislostech je, ale
tohle neumí — je o přijímání upozornění, ne o režimu telefonu. Musel na to
vzniknout vlastní nativní modul: `app/modules/nerusit`, Kotlin, autolinkem
nalezený jako lokální modul (výchozí `./modules`).

Obě věci, které se u toho snadno zapomenou, jsou v něm vyřešené:

- **Režim se vrátí, i když appka spadne.** Předchozí nastavení se ukládá
  do `SharedPreferences` a modul ho vrací při každém svém vytvoření, tedy
  i po pádu nebo po vypnutí appky uprostřed procedury. Běžná cesta —
  vypnutí na konci okna — je jen ta první ze dvou.
- **Bez oprávnění se nic nezastaví.** Všechno vrací `false`, nic
  nevyhazuje; a panel na startu nabídne řádek *Povolit „Nerušit"*, který
  otevře nastavení systému. Povolit to za uživatele nesmí nikdo.

Zapíná se **Nerušit s prioritou**, ne úplné ticho: úplné ticho vypne
i budík a o tom, co je pro rozhodčího naléhavé, aplikace rozhodovat nemá.

**Co na tom není ověřené.** Kotlin se zkompiluje v buildu APK, ale že se
režim na Milošově telefonu doopravdy přepne a vrátí, neví nikdo — tady
není Android. Je to první věc, na kterou se u příští instalace podívat.

Partitura, kterou ty dva poslední balíčky budou přehrávat, je už
postavená a otestovaná: `app/src/lib/hlaseni.ts`.

**Než se sáhne na instalaci**, projít tenhle seznam znovu — a přidat
i to, co mezitím přibylo.

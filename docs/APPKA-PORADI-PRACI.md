# Appka: v jakém pořadí se staví a co čeká na jednu instalaci

**Stav k 29. 10. 2026.** Dva seznamy, oba krátké. První říká, co se staví
a v jakém pořadí. Druhý vede nativní závislosti, které se musí přidat
**najednou** — každá z nich posune otisk a Miloš kvůli ní instaluje znovu.

Návrh obrazovek je na plátně **Start v appce — návrh**
(<https://claude.ai/artifact/F3bpQH1cX6VSjAGTuFc9bC>).

---

## Pořadí prací

Určil Filip 29. 10. 2026. Appka je **pomocník rozhodčího, dirigent**: drží
takt, zatímco rozhodčí dělá to své.

| | Co | Pro koho | Stav |
| --- | --- | --- | --- |
| 1 | **Rozhraní startu** | rozhodčí | **postavené** (29. 10. večer) |
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

**Co ještě ne.** Ghost řádky z trasování a přepsání toho, co určilo
(R33) — to je vlastní velká věc. Kódy kromě DNF (OCS, DSQ, odstoupila)
se zapisují na webu; v appce zatím nejsou. Lodě mimo regatu („Další
lodě") taky ne — appka nabízí ty přihlášené, a když přihlášky nikdo
nevede, celý ročník.

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

## Nativní závislosti, které čekají na jednu instalaci

**Proč se čeká.** Každý nativní balíček posune otisk (`runtimeVersion`
z fingerprintu), a tím přestanou na vydané APK dosedat aktualizace
vzduchem. Miloš by instaloval ručně po každém. Proto se přidají najednou,
až bude jasné, co všechno rozhraní potřebuje.

| Balíček | Na co | Doložení |
| --- | --- | --- |
| `expo-keep-awake` | aby telefon uprostřed odpočtu nezhasl | Miloš, 27. 10.: *„mobil mi nesmí usnout"* |
| `expo-speech` | mluvená hlášení | nahrávka 21: *„abych nemusel držet … megafon"* |
| `expo-audio` | klakson, **a zvuk i na pozadí** | tatáž věta: *„houkačku"*; Filip, 29. 10. |

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
megafonu — je to <b>vodítko pro rozhodčího</b>. Odpočet *„za pět, čtyři,
tři, dva, jedna"* je signál, kdy zmáčknout houkačku; hlášení po něm
*„pět minut do startu"* slyší posádky jako vedlejší účinek, ne jako
hlavní účel.

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
| appka na pozadí | zvuk nezazní | **nevyřešené** — chce `UIBackgroundModes: audio` a zvukovou relaci, která přežije hovor |

**Co z toho plyne pro zvuk.** Hlášení a troubení na pozadí není totéž co
přehrát zvuk: iOS zvukovou relaci při hovoru přeruší a appce ji musí
vrátit, jinak klakson po hovoru mlčí. Je to nativní nastavení, ne kód —
patří k balíčkům výš a vyzkouší se až na telefonu, protože simulátor
hovor neumí.

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
| **Android** (Miloš) | **ano** | `NotificationManager.setInterruptionFilter` s oprávněním `ACCESS_NOTIFICATION_POLICY`; uživatel ho jednou povolí v nastavení |
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

**Co to obnáší na Androidu.** `expo-notifications` v závislostech je, ale
tohle neumí — je o přijímání upozornění, ne o režimu telefonu. Chce to
vlastní nativní modul nebo config plugin, tedy další nativní závislost
do fronty výš. A chce to rozmyslet dvě věci, které se snadno zapomenou:
**vrátit režim zpátky** po skončení procedury (i když appka spadne), a co
dělat, když oprávnění uživatel nedá — procedura kvůli tomu nesmí stát.

Partitura, kterou ty dva poslední balíčky budou přehrávat, je už
postavená a otestovaná: `app/src/lib/hlaseni.ts`.

**Než se sáhne na instalaci**, projít tenhle seznam znovu — a přidat
i to, co mezitím přibylo.

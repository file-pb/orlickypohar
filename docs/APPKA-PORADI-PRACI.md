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
| 1 | **Rozhraní startu** | rozhodčí | návrh hotový, pravidla postavená |
| 2 | **Rozhraní cíle** | rozhodčí | návrh hotový |
| 3 | **Rozhraní závodníka** | posádka | návrh vstřelený, bude se ladit |
| 4 | **Stavitel tratě** | pořadatel | *„na to bude ale klid"* |

**Co se vědomě nestaví.** Informace pro veřejnost a diváky: *„funkce
informace pro veřejnost a diváky je marginální a kdoví jestli ji budeme
potřebovat. Na to máme web."* Čtení výsledků v appce zůstává, ale nikdo
kvůli němu nic nepředělává.

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

Partitura, kterou ty dva poslední balíčky budou přehrávat, je už
postavená a otestovaná: `app/src/lib/hlaseni.ts`.

**Než se sáhne na instalaci**, projít tenhle seznam znovu — a přidat
i to, co mezitím přibylo.

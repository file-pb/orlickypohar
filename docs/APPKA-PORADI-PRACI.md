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
| `expo-audio` | klakson | tatáž věta: *„houkačku"* |

Partitura, kterou ty dva poslední balíčky budou přehrávat, je už
postavená a otestovaná: `app/src/lib/hlaseni.ts`.

**Než se sáhne na instalaci**, projít tenhle seznam znovu — a přidat
i to, co mezitím přibylo.

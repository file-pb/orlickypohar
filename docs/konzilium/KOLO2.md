# Kolo 2 — kde se neshodnete

Moderátorský zápis po prvním kole. **Přečti si čtyři cizí posudky**
(`docs/konzilium/*-kolo1.md`) a potom tohle.

Filip spí, takže **na otázky položené jemu odpovědi nejsou**. Kde na něm něco
visí, rozhodni podmíněně („je-li A, pak B, jinak C") a napiš, co z toho
považuješ za podmínku, bez které se stavět nemá.

## Co k tomu říká moderátor (autor návrhu)

Abyste neřešili nedbalost makety místo návrhu:

- **Prázdný stav *Co teď* v maketě chybí nedopatřením**, ne záměrem — maketa
  kreslí den regaty. Co má stát na prázdné obrazovce, je ale skutečná otevřená
  otázka a je jádrem sporu A.
- **Věta „Mimo ročník" v `Main.dc.html`** byla zástupná výplň, ne rozhodnutí.
  Kam ty položky patří, otevřené je.
- **`--ukon-coted` napevno v lanu na telefonu** je chyba makety.
- **Data v maketách** (Vánoční regata v červenci, kategorie Kajuta/Sport/Open,
  čísla v tabulce pořadí) jsem si vymyslel. Nález 5-jachtinga, že se jimi
  tvrdí nepravda o pravidlech, tím ale **nepadá**: maketa se posuzuje
  i předvádí, a co se na ní jednou přečte, se těžko odučuje.
- **Čím návrh začal:** Filipův postřeh 3 zní doslova *„ušetřili bychom jeden
  krok"*. Každé řešení, které krok přidá, je proti zadání.

## Sporné body

Očíslované. V posudku kola 2 projdi **ty, u kterých jsi jmenovaný**, a u každého
napiš: **držím / ustupuji / jinak** — a proč. Jedna věta stačí, když je jasná.

### A. Prázdné *Co teď* jako výchozí obrazovka

Tři různá řešení téže vady:

- **1-ergonomie:** výchozí tab vybrat podle obsahu — prázdné `coTeď` ⇒ otevřít
  *Regaty* (vzorem `kamNaRegate`).
- **3-ux:** *Co teď* nesmí být nikdy prázdné — dopočítat nejbližší termín
  a krok před ním z `Planovany` zastávek.
- **3-ux (nález 2, 3):** komu *Co teď* nikdy nic nevydá (editor), tabu
  nedávat; pořadatele jediné zastávky poslat rovnou do okna jeho regaty.

**Kdo odpovídá:** 1, 3. **Přizván:** 5 — dá se „co čeká před regatou" odvodit
z povinných dokumentů tak, aby to nebyl výmysl aplikace?

Rozhodněte mezi sebou jedno řešení. Dvě naráz (měnit výchozí tab *a* dopočítávat
obsah) znamenají, že obrazovka pokaždé vypadá jinak a nikdo neví proč.

### B. Barva nevybraných dlaždic

- **2-design (nález 3, 4):** osm barev je duha; barvu nese jen vybraná dlaždice,
  nevybrané dostanou `--linka`. Navíc dvě kolize na hex — *Oprávnění* = hex
  *Směrnice*, *Co web stojí* = hex *Trať*.
- **1-ergonomie** se ptá, jestli tím nezmizí možnost najít nevybranou dlaždici
  barvou dřív, než se přečte jméno — zvlášť u vody.

**Kdo odpovídá:** 2, 1. **Přizván:** 5 — znamená okrová na vodě směrnici
natolik, že si ji *Oprávnění* vzít nesmí?

Pozor na následek: padne-li barva nevybraných, padá i část odpovědi na otázku
„co můžu spravovat" a zbyde na jménech. Chci od vás jedno doporučení, ne dvě.

### C. Kolik tabů má pruh ročníku unést

Dnes osm. Návrhy ze všech stran:

- **1-ergonomie:** *Otázky k aplikaci* pryč do nabídky pod účtem; na telefonu
  jen čtyři denní dlaždice + *Víc*.
- **4-jazyk:** *Otázky k aplikaci* pryč, ale **o patro výš do Správy webu** —
  není to agenda ročníku.
- **3-ux:** *Otázky* naopak **opravit** (chybí `kdyz` pro pořadatele) a nechat.
- **5-jachting:** přidat **Pořadatele** (adresa existuje, v pruhu nejsou) a na
  veřejném ročníku šestý tab **Pravidla ročníku**.

**Kdo odpovídá:** všichni čtyři. Dohodněte **jedno** číslo a jedno umístění
*Otázek*. Kdo chce tab přidat, ať řekne, co z pruhu zmizí.

### D. Jména tabů: zkracovat, nebo ne

- **4-jazyk (nález 1):** zkracování jde proti rozhodnutí z 29. 10. 2026; *Lodě
  a kapitáni* a *Otázky k aplikaci* mají zůstat celé.
- **2-design (nález 7):** pruh má v každém patře jinou hustotu; navrhuje
  `minmax(7.25rem, max-content)`, takže **dlaždice má šířku svého jména** —
  tím by dlouhá jména přestala být problém šířky.
- **1-ergonomie (nález 4):** osm dlaždic jsou na telefonu tři řádky; delší
  jména to zhorší.

**Kdo odpovídá:** 4, 2, 1. Má-li 2-design pravdu, padá hlavní argument pro
zkracování. Řekněte, jestli to tak je.

### E. Jméno tabu *Výsledky* ve správě

- **4-jazyk (nález 2):** ve správě **Rozjížďky**, venku *Výsledky*.
- **2-design** přitom sdílenou barvu `--ukon-vysledky` mezi patry chválí jako
  důkaz pravidla „barva patří agendě" — jazyk tvrdí, že to pak tvrdí tutéž
  agendu, kterou to není.

**Kdo odpovídá:** 4, 2. **Přizván:** 5 — jak tomu říká rozhodčí, když to dělá?
A sedí *Rozjížďky* na obsah, pod kterým je i „pustit ven"?

### F. Telefon: výška dlaždice a počet řádků

- **1-ergonomie (nález 3)** i **2-design (nález 8b)** se shodují, že dotykový
  cíl 31–32 px je málo a má být 44. **Shoda, zapsat.**
- Rozcházíte se v tom, co s výškou pruhu: 2-design bere 145 px jako cenu,
  1-ergonomie chce čtyři dlaždice + *Víc* — a sám připouští, že si to zadírá
  s rozhodnutím z 29. 10., kterým akordeon skončil.

**Kdo odpovídá:** 1, 2. **Přizván:** 3 — ztratí se schováním čtyř dlaždic
odpověď na „co můžu spravovat"?

### G. Lano

**2-design (nález 2):** šrafa je obsazená publikací, lano má být stojící pramen.
Nikdo jiný to neotevřel. **Kdo odpovídá:** 2 potvrdí, ostatní jen když nesouhlasí.

### H. Tabulka průběžného pořadí je věcně špatně

**5-jachting (nálezy 1–5)**: závodová stupnice místo seriálové (vítěz 1 místo
0), kódy rozjížděk ve sloupcích zastávek, škrt vysvětlený pravidlem závodu
a škrtnuté číslo **v součtu**, chybějící hlavička listiny, vymyšlené kategorie.

Tohle nepovažuju za sporné — je to oprava. Co po vás chci:

- **5-jachting:** napiš tabulku, jak má vypadat, včetně sloupců a hlavičky.
- **2-design:** unese ta hlavička a sloupec se znakem rozvržení, nebo se tabulka
  musí přestavět?
- **4-jazyk:** znění poznámky o škrtech a hlavičky listiny.

### I. Řádek regaty: co na něm stojí a komu

- **3-ux (nález 7):** „1× k revizi" nemá adresáta, takže si Regaty a *Co teď*
  protiřečí v tom, jestli je to na mně.
- **5-jachting (nález 6, 7):** „2 ze 4 rozjížděk venku" tvrdí jmenovatel, který
  neexistuje; „přihlášeno 14 lodí" není číslo, podle kterého se pořadatel
  rozhoduje — chce počty po kategoriích a startovní listinu.

**Kdo odpovídá:** 3, 5. Shodněte se na jednom tvaru řádku. **Přizván:** 2 —
kolik údajů ten řádek unese, než se rozpadne.

### J. Nadpis okna

- **2-design (nález 1):** obrácená hierarchie — nejtěžší typografie na tom, co
  se nemění; stojící komponenta má 1,2 rem v barvě agendy.
- **2-design (nález 8a)** a **4-jazyk (nález 6)**: `white-space: nowrap`, chybí
  `flex-wrap`, a na telefonu v nadpisu **chybí pomlčka**.

**Kdo odpovídá:** 2 vede, 4 potvrdí znění, 1 řekne, jestli mu zalomení nadpisu
vadí v orientaci.

## Co napsat

Do `docs/konzilium/<tvoje-session>-kolo2.md`, do **120 řádků**:

```markdown
# <obor> — kolo 2

## Kde ustupuju
Bod, komu, proč. Krátce.

## Kde držím
Bod, protiargument, a co se stane, když se rozhodne proti mně.

## Kde jsme se shodli
Jen to, co máš za uzavřené a co může moderátor zapsat jako rozhodnuté.

## Nové, co vylezlo z cizích posudků
Jen když je to doloženo a nikdo to nenapsal. Nepřepisuj kolo 1.

## Podmínka
Nejvýš dvě věci, bez kterých se podle tebe stavět nemá.
```

Pravidla z kola 1 platí dál: podkládej, nepřepisuj kód ani makety, necommituj,
nesahej na cizí soubory.

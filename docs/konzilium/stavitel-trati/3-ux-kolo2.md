# UX — kolo 2

## Kde ustupuju

- **A, úložiště — 9-rizikům a 7-psychologovi.** Vlastní tabulka
  v `stavba.db`, ne řádek ve frontě. Měl jsem to podložené špatně:
  `fronta.vstup` je `NOT NULL` a drží hotový `PrvekKPostaveni`, kde je
  `typ` povinný a každý bod musí mít `nazev` (`fronta.ts:28–46`, `:77`),
  přičemž jména se počítají z typu a volby (`jmenaBodu`). Řádek bez popisu
  by znamenal povolit polovičatý `vstup` a zrušit jedinou invariantu
  fronty — že každý její řádek je odeslatelný požadavek.
- **A, pořadí — 1-ergonomii.** Beru *nejvýš jednu nepopsanou značku*,
  vynucenou tím, že se dál nepípne. Tím padá i důvod, proč jsem místo ve
  frontě chtěl: co nemá co předběhnout, pořadí ztratit nemůže. Zůstane
  jedno místo, kde prvek žije, a fronta se nemění vůbec. Je to zároveň
  levnější varianta, kterou nabídla 9-rizika.
- **Formulace — 7-psychologovi.** Slovo „uložená" se napsat nesmí dřív,
  než to platí o disku; slib je samostatná vada, moje kolo 1 řešilo jen
  mechaniku.

## Kde držím

### A — odklad popisu padá celý, ne jako výjimka pro jednobodové

Moderátor se ptá přímo, tak natvrdo: **padá celý.** Ze čtyř z pěti typů
(`stavba-prvku.ts:164–211` — `Dve`, `Start`, `Cil`, `Odskok`) musí typ
padnout **před druhým pípnutím**, jinak appka nepozná, že druhé pípnutí
patří k prvnímu. Odklad by tedy platil pro jediný typ `Jedna` — a návrh
ho v nálezu 1 zdůvodňuje právě tím, že *„u brány, kde se mezi konci
popojíždí, se to platí dvakrát"*, tedy tam, kde použít nejde.

**Co z nálezu 1 návrhu zůstává a držím na tom:** pípnutí patří před
otázky **uvnitř jednoho prvku** — celá hodnota toho nálezu. Padá jen
věta *„a i na to se dá odpovědět později"*.

Když se rozhodne proti mně a odklad zůstane pro `Jedna`: pak musí platit
aspoň to, že nepopsaná značka **blokuje další pípnutí** — jinak se vrací
ztráta pořadí a za jeden typ z pěti se platí nová tabulka, nová blokáda
a nový prázdný stav.

### B — řádek seznamu musí být jedna úplná a platná kombinace

Sedm řádků s doptáním podle 1-ergonomie, ne jedenáct — s jednou
podmínkou: **doptání je povinné a v lince, nikdy odložitelné.** Bez ní
se spor A vrací zadními vrátky, protože prvek s typem a bez varianty je
totéž nedodělané pípnutí, jen o krok dál. `VOLBY` nese 4 + 3 + 2 + 1
předpisů (`stavba-prvku.ts:223–311`) plus Odskok, tedy jedenáct úplných
kombinací: sedm řádků je bez doptání nepravdivých, jedenáct se nevejde.

### F3 — je to táž věc, s jedním rozdílem, který ji dělá horší

Mechanismus je týž: server počítá predikát **na konkrétní zastávku**
a appka kreslí podle něj (`Pohled.UVody`, `VysledkyEndpoints.cs:698–704`).
Rozdíl je směr chyby. Tam obrazovka nabízela **míň**, než zápis pustí,
a cena byl telefonát. Tady nabízí **víc**, a cena je fronta plná prvků,
ze které vede ven jen zahazování po jednom. Druhá věc, ať to nikdo
nespojí: oprava u výsledků poslala příznak jen pro `uVody`. Stavba stojí
na jiném predikátu (`StaviAsync`, `TratEndpoints.cs:537–540`), takže
potřebuje **vlastní** příznak, ne použití hotového.

A ještě jedno místo, kde ho **nesmí** nést: `GET …/trat` vrací 404,
dokud regata nemá ani jednu bóji. Příznak na tom DTO by chyběl přesně
ve chvíli, kdy se staví první prvek. Patří tam, kde `role.ts` už kouká —
do oprávnění v `/ja`, rozšířených o zastávky, kde je ten člověk
zaškrtnutý jako pomocník.

### G — predikát patří k `Pomocnici`, ne do `TratEndpoints`

`Pomocnici` je statická třída s čistým pravidlem (`Pomocnik.cs:77`,
`SmiUVody` na `:133`), dohledání rozsahu si drží endpoint. Nový
`SmiStavet(poradatel, pomocnik, rozhodci)` patří vedle `SmiUVody`
z důvodu, který je z mého oboru: appka potřebuje **tutéž** odpověď jako
příznak, a ten se podle precedentu počítá voláním téže čisté funkce.
Kdyby pravidlo leželo v `TratEndpoints` vedle `StaviAsync`, byl by
příznak druhá kopie výrazu — přesně vada z F3, postavená znovu.

## Kde jsme se shodli

- **A:** nepopsané pípnutí do vlastní tabulky v `stavba.db`, zapsané
  synchronně při klepnutí; **nejvýš jedno**, vynucené tím, že se dál
  nepípne; slovo „uložená" až tehdy, když to platí. Fronta se nemění.
  (1, 3, 7, 9 — k zápisu jako rozhodnuté.)
- **G:** stavba se pomocníkovi neotevře dřív, než vznikne vlastní
  predikát jen na `POST /prvky/postav` a čtení; mazání prvků, zahození
  trati a `/prestavba` zůstanou organizátorovi a rozhodčímu.
- **F3 až F5** vidím jako opravy, ne jako sporné body.

## Nové, co vylezlo z cizích posudků

1. **Pomocník prochází `veliNekde` už dnes — moje kolo 1 to mělo
   obráceně.** `Pomocnik.cs:140–143`: *„Pořadatelem ročníku musí být
   předem… Stačí přitom pořadatelství kterékoliv zastávky."* Pomocník
   u cíle Radavské regaty je pořadatel Zahájení sezóny, takže `VELI`
   (`role.ts:23`) ho pustí a kartu *Stavba trati* vidí na Radavě **už
   teď** — a server mu tam odmítne každý prvek. F3 tedy není příprava na
   chystanou práci, je to živá vada pro ty lidi z K8, kteří už existují.
2. **Nepopsané pípnutí nikdo jiný nedopíše** (odpověď 7-psychologovi).
   Žije jen v `stavba.db` toho jednoho telefonu (`fronta.ts:68`), web
   staví starou cestou po krocích (`ZKOUSKA-STAVITELE.md`, *Co tahle
   zkouška hledat nemá*) a cesta pro holou polohu bez prvku není —
   `postav` chce typ a aspoň jeden bod (`PrvkySprava.cs:208–212`). Když
   stavitel-pomocník odjede domů, značka je pryč, i kdyby přežila na
   disku. Druhý, nezávislý důvod pro „nejvýš jedna".
3. **Nález 1/4 (směr k popisu) otevírá tutéž díru.** *„Start leží
   v seznamu jako pípnutý, směr nedoplněn"* je odložený popis pod jiným
   jménem; `patriSmer` (`stavba-prvku.ts:513`) ho žádá u startu a cíle.
   Platí pro něj totéž pravidlo: nedoplněný směr blokuje další pípnutí.
4. **Odpověď 2-designu: proužek polohy klepací ne.** U špatné polohy je
   jediná akce čekat, takže terč by sliboval cestu, která neexistuje.
   Výjimka je stav bez oprávnění (`stavba.tsx:273–280`), kde akce je —
   nastavení telefonu; tam ať je tlačítko, a proužek zůstane nedotykový.

## Podmínka

1. **Obrazovka se neotevře nikomu, komu server stavbu odmítne.** Příznak
   počítaný na konkrétní zastávku, dřív než se otevře komukoliv dalšímu.
   Neplatí to až pro pomocníka — platí to dnes.
2. **Nepopsané pípnutí na disku, nejvýš jedno, a blokuje další pípnutí.**
   Bez všech tří je „pípni teď, popiš potom" zhoršení proti dnešku, ne
   zlepšení.

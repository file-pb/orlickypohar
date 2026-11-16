# Zkouška stavitele trati na telefonu

Obrazovka je postavená 16. 11. 2026 a **na reálném telefonu nevyzkoušená**.
Testy na Node drží pravidla polohy a frontu, kontrola klepacích míst drží
velikost terčů — ale jestli se s tím dá stavět trať z lodi, to žádný test
neřekne. Tenhle soubor je seznam toho, co projít, a čeká se, co se čekat má.

Zkouška je rozdělená podle místa, ne podle důležitosti: **část B nejde
odnikud než z Orlíku**, protože pípnutí mimo obdélník 49,2–49,8 N /
14,0–14,5 E obrazovka odmítne (`app/src/lib/stavba/poloha.ts:39`). Není to
chyba, je to pojistka proti značce z parkoviště.

## 0. Než se do toho pustíš

- [ ] **Appka se musí aktualizovat.** Aktualizace se stáhne při startu
      a uplatní se **až při dalším** spuštění: otevři appku, zavři ji
      úplně (ne jen na pozadí) a otevři znovu. Vydaná 16. 11. 2026,
      runtime `0759d5bd…`, což je otisk APK build 11 — ruční přeinstalace
      tedy není potřeba.
- [ ] **Jsi přihlášený** a máš roli `Rozhodci` nebo `Organizator` aspoň
      u jedné regaty. Bez toho karta *Stavba trati* na stránce regaty
      **vůbec není vidět** (`app/src/lib/role.ts:23`) — takže když ji
      nevidíš, není to chyba obrazovky.
- [ ] Na stránce regaty je karta **Stavba trati** s popiskem „Pípni značky
      z lodi. Bez signálu počkají ve frontě." Je **nad** panelem odpočtu,
      protože značky se staví ráno, kdy panel nic nekreslí.
- [ ] Trať u té regaty **není přijatá**. Když je, obrazovka místo průvodce
      ukáže banner o zámku — taky správné chování, ale nic nevyzkoušíš.
      Rozestavěnou trať zakládat nemusíš, obrazovka si ji při prvním prvku
      založí sama.

## A. Co jde vyzkoušet kdekoliv

Všechno až k okamžiku pípnutí. Mimo Orlík dojdeš ke kroku *Pípni* a ten
řekne „Tahle poloha není na Orlíku." — to je **správný výsledek** téhle
části, ne selhání.

- [ ] Appka se po otevření obrazovky zeptá na **přístup k poloze**.
      Odmítni ho poprvé schválně: má se ukázat „Appka nemá přístup
      k poloze." a ne prázdná obrazovka.
- [ ] Dej přístup. Vedle tlačítka *Pípni* má být **přesnost číslem**
      (`±5 m`), ne slovo. Bez čísla se 5 m a 65 m tváří stejně.
- [ ] Projdi průvodce až k pípnutí u všech pěti typů: **Jedna značka,
      Dvě značky, Start, Cíl, Odskok**. U každého má druhý krok nabídnout
      předpis (otočit levobokem, projet mezi nimi, pevná linie…).
- [ ] U *Startu* a *Cíle* přijde po obou bodech krok navíc — **růžice
      se světovými stranami**. U *Jedné značky* nepřijde.
- [ ] **Předvolby značení** (červený válec, levá strana dráhy…) jde
      klepnout v rukavicích. Tohle je ten řádek, který měl 36 pt a teď
      má 44 — jestli je to pořád málo, tady se to pozná.
- [ ] *Zahodit rozdělaný prvek* v každém kroku vrátí průvodce na začátek
      a nic nepošle.

## B. Co jde jen na Orlíku

- [ ] **Jedna značka od zídky přehrady.** Postav ji celou: typ → otočit
      levobokem → značení → pípni → potvrď. Má se objevit hláška
      „1. otočná bóje — zařazeno." a prvek v seznamu *Co už stojí*.
- [ ] **Dvě značky s popojezdem.** Pípni levou, popojeď aspoň dvacet
      metrů, pípni pravou. Pak si v seznamu zkontroluj, že to **nejsou
      dvě značky na témže místě**: to je celý důvod, proč obrazovka
      odmítá fix starší než čtyři vteřiny.
- [ ] **Zkus pípnout druhý bod hned**, bez popojetí a bez prodlevy.
      Jestli se poloha nestihla obnovit, má přijít „Poloha je N s stará."
      Když to projde vždycky, pravidlo je možná příliš mírné — to je
      zjištění, ne chyba.
- [ ] **Přesnost u vody.** Telefon má hlásit jednotky metrů. Když hlásí
      třicet a víc, přijde varování „Pípnout jde, ale značka bude
      nepřesná." — a to je informace o Orlíku, ne o appce.
- [ ] **Čitelnost na slunci** a klepání jednou rukou, druhá na kormidle.

## C. Bez signálu

Letový režim, nebo prostě místo, kde není signál.

- [ ] Postav prvek. Má se objevit pruh **„1 prvek čeká na odeslání"**
      a prvek má být v seznamu *Co už stojí* jako čekající.
- [ ] Zavři appku úplně a otevři ji. **Prvek musí ve frontě zůstat** —
      je v SQLite, ne ve stavu Reactu.
- [ ] Postav bez signálu další dva. Jména mají být **různá** (značka 7,
      8, 9), ne třikrát totéž.
- [ ] **Zapni signál a otevři obrazovku stavby znovu.** Fronta se má
      vyprázdnit a prvky naskočit jako postavené.
- [ ] **Známé omezení, ověř si ho:** fronta se posílá jen při otevření
      obrazovky, po postavení prvku a po zahození čekajícího
      (`stavba.tsx:156-160`). Když se signál vrátí a ty nic neuděláš,
      fronta **leží dál**. Jestli ti to na vodě vadí, patří tam reakce na
      návrat appky do popředí — ale ať to řekne zkouška, ne já.

## Co mi pak stačí říct

Nepotřebuju protokol. Stačí tohle:

1. U kterého bodu to spadlo nebo se zaseklo, a co bylo na obrazovce.
2. Jestli šlo klepat v rukavicích, nebo kam se netrefíš.
3. Kolik metrů přesnosti telefon na vodě hlásil.
4. Jedna věta o tom, co ti v průvodci chybělo nebo přebývalo.

Fotka obrazovky řekne víc než popis — hlavně u hlášky, kterou jsem
nečekal.

## Co tahle zkouška hledat nemá

Není to seznam nedodělků, je to hranice zkoušky:

- **Fotka papíru u značky** a výběr bodu z mapy nejsou postavené.
- **Web pořád staví po krocích** přes starou cestu; nový atomický
  endpoint používá jen appka. Je to schválně, viz `docs/PLAN.md`.
- **Signál na Orlíku** nikdo neměřil. Jestli ho tam je dost, se z téhle
  zkoušky dozvíme mimochodem — a je to vstup pro rozhodnutí o frontě.

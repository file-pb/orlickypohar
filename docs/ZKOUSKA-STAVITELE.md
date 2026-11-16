# Zkouška stavitele trati na telefonu

Obrazovka je postavená 16. 11. 2026 a **na reálném telefonu
nevyzkoušená**. Testy na Node drží pravidla polohy a frontu, kontrola
klepacích míst drží velikost terčů — ale jestli se s tím dá stavět trať
z lodi, to žádný test neřekne. Tenhle soubor je seznam toho, co projít,
a co se čekat má.

**Celý průvodce se dá projít na suchu**, kdekoliv v Česku. Byla chvíle,
kdy to neplatilo: meze pípnutí kopírovaly Orlík, takže se na zahradě
nedalo klepnout na *Pípni*. Rozvolnily se 16. 11. 2026 na republiku,
protože jejich úkol je chytit prohozenou šířku s délkou, ne vymezit
území — podrobně v `docs/PLAN.md`, oddíl *Hranice hlídají překlep, ne
území*. Na vodě tak zbývá jen to, co vodu doopravdy potřebuje.

## 0. Než se do toho pustíš

- [ ] **Appka se musí aktualizovat.** Aktualizace se stáhne při startu
      a uplatní se **až při dalším** spuštění: otevři appku, zavři ji
      úplně (ne jen na pozadí) a otevři znovu. Runtime `0759d5bd…` sedí
      s APK build 11, takže se nic nepřeinstalovává.
- [ ] **Jsi přihlášený** a máš roli `Rozhodci` nebo `Organizator` aspoň
      u jedné regaty. Bez toho karta *Stavba trati* na stránce regaty
      **vůbec není vidět** (`app/src/lib/role.ts:23`) — takže když ji
      nevidíš, není to chyba obrazovky.
- [ ] Na stránce regaty je karta **Stavba trati** s popiskem „Pípni
      značky z lodi. Bez signálu počkají ve frontě." Je **nad** panelem
      odpočtu, protože značky se staví ráno, kdy panel nic nekreslí.
- [ ] Trať u té regaty **není přijatá**. Když je, obrazovka místo
      průvodce ukáže banner o zámku — taky správné chování, ale nic
      nevyzkoušíš. Rozestavěnou trať zakládat nemusíš, obrazovka si ji
      při prvním prvku založí sama.

> Co postavíš na zkoušku, **zůstane v trati**. Dělej to na regatě, kde to
> nevadí, nebo si prvky potom smaž na webu.

## A. Na suchu, kdekoliv v Česku

- [ ] Appka se po otevření obrazovky zeptá na **přístup k poloze**.
      Odmítni ho poprvé schválně: má se ukázat „Appka nemá přístup
      k poloze." a ne prázdná obrazovka.
- [ ] Dej přístup. Vedle tlačítka *Pípni* má být **přesnost číslem**
      (`±5 m`), ne slovo. Bez čísla se 5 m a 65 m tváří stejně.
- [ ] **Postav celý prvek:** *Jedna značka* → otočit levobokem →
      značení → pípni → potvrď. Má přijít hláška „1. otočná bóje —
      zařazeno." a prvek se má objevit v seznamu *Co už stojí*.
- [ ] Projdi průvodce u všech pěti typů: **Jedna značka, Dvě značky,
      Start, Cíl, Odskok**. U každého má druhý krok nabídnout předpis
      (otočit levobokem, projet mezi nimi, pevná linie…).
- [ ] U *Startu* a *Cíle* přijde po obou bodech krok navíc — **růžice
      se světovými stranami**. U *Jedné značky* nepřijde.
- [ ] **Předvolby značení** (červený válec, levá strana dráhy…) jde
      klepnout v rukavicích. Tohle je ten řádek, který měl 36 pt a teď
      má 44 — jestli je to pořád málo, pozná se to tady.
- [ ] *Zahodit rozdělaný prvek* v každém kroku vrátí průvodce na začátek
      a nic nepošle.
- [ ] **Dva body s popojitím.** *Dvě značky*: pípni levou, popojdi aspoň
      dvacet metrů, pípni pravou. V seznamu zkontroluj, že to **nejsou
      dvě značky na témže místě** — to je celý důvod, proč obrazovka
      odmítá fix starší než čtyři vteřiny.
- [ ] **Pípni druhý bod hned**, bez popojití a bez prodlevy. Jestli se
      poloha nestihla obnovit, má přijít „Poloha je N s stará." Když to
      projde vždycky, je pravidlo možná příliš mírné — to je zjištění,
      ne chyba.

## B. Co potřebuje vodu

- [ ] **Přesnost u hladiny.** Telefon má hlásit jednotky metrů. Když
      hlásí třicet a víc, přijde varování „Pípnout jde, ale značka bude
      nepřesná." — a to je informace o Orlíku, ne o appce.
- [ ] **Popojetí motorákem**, ne pěšky: loď se pohybuje jinak a právě
      tady se ukáže, jestli čtyři vteřiny stačí, nebo jestli stavitel
      čeká s prstem nad tlačítkem.
- [ ] **Čitelnost na slunci** a klepání jednou rukou, druhá na kormidle.
- [ ] **Jestli tam vůbec je signál.** Nikdo to neměřil. Z téhle zkoušky
      se to dozvíme mimochodem a je to vstup pro rozhodnutí, kolik práce
      si fronta zaslouží.

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

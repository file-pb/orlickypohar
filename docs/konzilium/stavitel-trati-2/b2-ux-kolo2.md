# UX — kolo 2

## Kde ustupuju

**5-jachtaři v J3 celé, a mění mi to model.** Pořadí je rozhodnutí rozhodčího
(`PrvekTrati.cs:146–149`), takže režim *Přerovnat* na vodě nemá co dělat.
Ustupuju, protože to **model zjednodušuje**: režim je jeho nejdražší prvek —
musí se do něj vejít, vyjít a nakreslit se — a `Poradi.dc.html` východisko nemá
(můj nález 1, 1-ergonomie/E3). Vypadne tím jeden stav, dva přechody, gesto
i nativní závislost: z „jedné obrazovky ve stavech **a v režimu**" zůstává
„jedna obrazovka ve stavech", to ubírání, o kterém mluví 2-design.

**2-designu, že jantarová karta plánu má zmizet** a proužek polohy být první
věcí pod hlavičkou vždycky (jeho nález 2). Je to týž údaj podruhé a jiným
tvarem, a rozhodnutí 4 závěru říká, že stav polohy nese **trvale** slovo. Obsah
`Plan.dc.html` je navíc 879 pt na 844 (1-ergonomie/E8) — místo na dva tvary
téhož tam není.

**1-ergonomii v E6, a odpovídám na dotaz, který mi poslala:** *Nebylo to nic*
stav „pípnuto, nepopsáno" **nerozbije, uzavírá ho.** Ten stav totiž není
uložený nikde: rozhodnutí 2 odklad zrušilo a `fronta.vstup` je `NOT NULL`
a drží hotový `PrvekKPostaveni` (zapsaný nesouhlas 9-rizik v `ZAVER.md`).
Žije tedy jen v paměti obrazovky, a E6 mu dodává jediné, co mu chybělo —
východ, který živý kód má v každém kroku (`stavba.tsx:407`, `:434`, `:459`).
Jen ne slovem *Zpět*: to slibuje, že poloha zůstane. *Nebylo to nic* je
správné, protože říká, že měření jde pryč.

**1-ergonomii v E8 proti sobě.** Jméno cíle na tlačítku (*JSEM U BRÁNY 2 —
LEVÁ*) jsem navrhoval s vědomím dvou akcí. Jedno tlačítko s jedním chováním je
lepší: pípnutí měří polohu tady a **server rozhodne**, jestli tím nahrazuje
plánovaný záznam. Z mého nálezu 5 zůstává, co se tím neřeší: obrazovka musí
říct, **co se právě potvrdilo**, a při dvou kandidátech blíž než pár desítek
metrů se musí zeptat. To patří za pípnutí, ne před něj.

## Kde držím

**Plán se nesmí počítat ze `ZdrojPolohy` (spor D).** Nikdo neodporoval a doklad
platí: nález 10 chce `Mapa` pro dráty nad vodou, nález 15 z téhož příznaku dělá
plán; `Trat.ZverejnenaV` je jediný tvar, který obě věci nechá žít vedle sebe.
**Prázdný stav (bod 8) držím jako podmínku**, ne jako nález: je to nejčastější
první pohled na obrazovku. A **barva ven ze zakládací cesty** (1-ergonomie/E5)
je i stavově správně — je to vlastnost bóje a drží se pro další značku
(NAVRH:361–363), takže na cestě jednoho prvku nemá být vůbec.

## Kde jsme se shodli

- **Jedna obrazovka se opravuje překreslením, ne rozhodnutím** (bod 1); `Zamek`
  je její šestý stav a po J3 je stavů šest a režim žádný.
- **Osa vlevo nosí jen to, jak ta věc vypadá ve vodě** (2-design/2,
  5-jachtar/J10), stav je slovo vpravo — a z toho plyne, že `Zdroj`, `Barva`
  a `Tvar` musí vyjít z API (bod 5): bez nich ta řádka nejde nakreslit ani
  jednou, natož jednotně.
- **Detail prvku je nenakreslená obrazovka, ne chybějící odkaz**
  (1-ergonomie/E4) — a je to místo, kam po J3 patří i to, co by jinak zbylo na
  ose: *Přesunout sem*, *Sebrat*, fotka, barva, mazání.

## Nové, co vylezlo z cizích posudků

**Spor F: osa má ukazovat značky, a stavy to rozhodují jednoznačně.** Každý
stav, který návrh na řádek dává — *změřeno / z plánu*, *odesláno*, *chybí
fotka*, barva a tvar — je vlastnost **bóje**; vlastnost prvku je jen pořadí,
strana a předpis. Při jednom řádku na průjezd se tedy stavy zdvojí a nejde je
udržet shodné (jedna bóje nemůže mít fotku na druhém řádku a nemít ji na
prvním), a akce z nálezů 7, 12, 13 a 14 mají dva terče. Při jednom řádku na
značku se nezdvojí nic a ztratí se jedině doslovné pořadí — a to po J3 na vodě
nemá být. **Takže F a E se řeší týmž tahem.** Kdyby se netrefilo, horší je
průjezdová větev: stavový model, ve kterém se dva řádky o téže věci mohou
rozejít, je vada, kterou nepozná nikdo, kdežto chybějící doslovné pořadí se
pozná hned a leží na webu u rozhodčího.

**A repetice přichází z plánu, čímž F visí na D.** Stavitel pípne bóji jednou —
dva prvky na jednu bóji vznikají tam, kde trať někdo skládá, tedy v kanceláři.
Pruh v `Plan.dc.html` („Pět prvků je odečtených z mapy. Změřené jsou zatím
dva") tedy počítá průjezdy a u dvoukolové trati by hlásil víc, než kolik je
čeho pípnout — a jedno pípnutí by překlopilo dva řádky.

**Spor G: klon je trať, nikoli plán — a tady opravuju vlastní kolo 1.** Napsal
jsem, že klon je „nejlevnější hotová odpověď na plán z kanceláře". Není:
`KlonujAsync` kopíruje prvky **na tytéž záznamy bójí** (`TratSprava.cs:879–882`,
*„Kopíruje se rozhodnutí, ne měření"*), takže klon je trať, která ve vodě
doopravdy stojí a je celá *změřená* — pravý opak plánu z odečtených bodů.

**Čím se tedy druhá rozjížďka staví:** klonem, když se jede stejně (nula
pípnutí, všechny stavy *změřeno*, výchozí stav `Hotovo`, tedy nezamčeno —
`TratSprava.cs:840`), a `POST /dalsi`, když se jede jinudy; `/dalsi` je navíc
idempotentní (`:197–208`). Obojí je z appky bezpečné zavolat a slepá ulička
z mého nálezu 4 tím zmizí — `AktualniAsync` bere nejvyšší `Id` (`:36–41`),
takže nová trať se stane tou, do které se pípá.

**Jedna podmínka ale u klonu není hotová, a je to vážné.** `PrepojPrvkyAsync`
přepne na novou bóji **každý** prvek, který tu starou používá, a filtr na trať
tam není (`BojeSprava.cs:182–194`; dokumentace řeší jen cizí regatu). Po klonu
ale dvě tratě ukazují na tytéž záznamy — takže
*Přesunout sem* v druhé rozjížďce **přepíše prvky první**. Záznam bóje se
neztratí (`ZbytecnyAsync` ho drží, dokud do jeho platnosti padne `PrijatoV`
nějaké přijaté trati, `:357–370`), ale veřejná odpověď si pak protiřečí sama:
`Prvky` berou souřadnice přes připojenou bóji (`TratSprava.cs:515–521`), kdežto
seznam `Boje` se rekonstruuje časem proti `prijato` (`:544–548`). Jeden
požadavek, dvě polohy téže značky, a co se nakreslí, rozhoduje klient — přesně
ta vada, kterou komentář u přepojení popisuje jako důvod svého vzniku
(`BojeSprava.cs:131–144`, trať Jarního větru), jen zrcadlově. **Není to budoucí
problém:** klon volá web už dnes (`web/lib/trat.ts:535`), appka není potřeba.

**Spor A — co zmizí, aby se vešla jachtařova čísla.** Z mého oboru tři místa
a každé jen jedno: **pruh** nese polohu slovem a nic jiného (rozhodnutí 4, karta
plánu odtud mizí); **řádek** nese směr a vzdálenost *odsud*, ale jen u značky,
ke které se jede (na všech řádcích je to pět pohyblivých čísel, tedy znovu
„všechno váží stejně"); **detail** nese azimut, délku linie a přesnost. Místo se
bere z toho, co padlo: režim přerovnání, karta plánu a stavový sloupec u trati bez plánu.

## Podmínka

1. **Klon nesmí být v appce dřív, než přepojení prvků umí trať.** Dokud
   `PrepojPrvkyAsync` nemá filtr na trať (nebo dokud klon nekopíruje bóje), je
   *Přesunout sem* po klonu tichý přepis odjeté rozjížďky — a spor G posílá
   nález 14, podle jachtaře hlavní práci dne, přesně do téhle díry.
2. **Jeden řádek na značku, a stav u něj jen tehdy, když trať má plán** —
   a „má plán" se čte z `Trat.ZverejnenaV`, ne ze `ZdrojPolohy`. Bez prvního
   se stavy zdvojí a rozejdou, bez druhého stačí jedny dráty nad vodou, aby
   obrazovka mluvila o plánu, který neexistuje.

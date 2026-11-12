# Názvosloví a čeština v rozhraní — kolo 2

## Kde ustupuju

**C — umístění *Otázek k aplikaci*: ustupuju 1-ergonomii.** Chtěl jsem je do
Správy webu; to nejde. Adresa `/sprava/{ročník}/oponentura` (`co-smim.ts:250`) je
vázaná na ročník, takže přesun by změnil cestu (proti pravidlu 5) a odřízl
pořadatele, kterého server na čtení pouští (3-ux, nález 4). Takže z pruhu ven, do
nabídky pod účtem, odkazem na oponenturu **toho** ročníku. Můj důvod platí dál
(není to agenda ročníku), moje umístění bylo špatné.

**E — jméno *Rozjížďky*: ustupuju 5-jachtingu.** Jeho rozdíl je silnější: v ročníku
se škrtají **zastávky**, v závodě **rozjížďky** (nález 3), takže tab v pruhu
ročníku pojmenovaný *Rozjížďky* míří na špatnou úroveň — i když master–detail pod
ním je nad rozjížďkami. **Nové znění: *Zápis výsledků***. Drží slovo, které Miloš
používá, přidává to, co *Výsledky* zamlčují (je to proces, ne doklad), a nevybírá
si úroveň. Dvojice se čte sama: *ve správě se výsledky zapisují, venku jsou*.

**E — barva: ustupuju 2-designu a výhradu beru zpět.** Tvrdil jsem, že společný
`--ukon-vysledky` prohlašuje tutéž agendu. S rozdílnými jmény barva říká „tohle
k sobě patří", a to je pravda — námitka platila jen tak dlouho, dokud se obojí
jmenovalo *Výsledky*.

**Trať: přijímám *Předpokládaná trať*** (5-jachting, R28). Důvod je jeho a je
správný — trať se přijímá a za jízdy se smí změnit, takže *Závodní trať* slibuje
hotovou věc; je to tentýž princip, na kterém stojí můj spor E, a nemůžu ho
uplatnit jen ve svůj prospěch. Pruh tím potřebuje o ~46 px víc než dnešních 935
(`hlava.tsx:63`), což řeší oprava z D. **Podmínka:** je-li ta stránka i záznamem
trati, která se doopravdy odjela, jméno by po závodě lhalo obráceně — pak od
přejmenování ustupuju.

## Kde držím

**D — plná jména, a teď s čísly. 2-design má pravdu dvakrát:**

1. `minmax(7.25rem, max-content)` v `repeat(auto-fit, …)` je **platné CSS** —
   počet sloupců se rozhoduje jen z pevného minima a `<fixed-size>` smí být
   `minmax(<fixed-breadth>, <track-breadth>)`, kde `max-content` je legální.
2. Na šířku to vychází: z jeho měření (8 × 146 + 7 × 6,4 px) je při okně 1 280
   dostupných **1 216 px** a osm plných jmen potřebuje ~1 109 px → jeden řádek.
   Hranice jednoho řádku stoupne z ~1 037 na ~1 173 px, pořád pod běžným oknem.
   *(Šířky textu odhadnuté z délky jmen, ne změřené — ať potvrdí 2-design.)*

**Hlavní argument pro zkracování ale padá jinak:** jak se podle C vyndají
*Otázky*, zbude **sedm** tabů a mezi nimi **jediné** dlouhé jméno — *Lodě
a kapitáni*. Sedm plných jmen potřebuje ~877 px (jeden řádek až k oknu ~941 px)
a na 390 px tři řádky, přesně jako dnešních osm zkrácených — nic se neplatí.

**Kde 1-ergonomie zůstává v právu:** na telefonu `max-content` nepomůže — počet
sloupců plyne z minima, ne z délky jména, takže dlouhé jméno se zalomí dovnitř
dlaždice. Odpověď na to není druhé jméno ve slovníku, ale dva řádky v té jedné
dlaždici, které se to týká. **Bude-li se přes to zkracovat**, musí *Lodě*
a *Otázky* dostat jméno, které zkrácením nezlhaví, ne zkratku plného: tři slova
pro jednu věc (*Oprávnění · Oprávnění na celý web · Práva*) jsou dnes v maketách
a je to ta nesrovnalost, kterou projekt 29. 10. odmítl (`hlava.tsx:66–72`).

**H — v textu pro veřejnost *regata*, ne *zastávka*.** Znění od 5-jachtinga mluví
o „zastávkách"; to je slovo z kódu a z `PLAN.md`. Veřejně stojí tab *Regaty*,
hlava říká „po 2 z 8 regat" a Miloš mluví o regatách.

**J — pomlčka je to, co nadpis drží pohromadě.** Bez ní jsou to dva první pády
nalepené na sebe (dnes `Telefon.dc.html`: „Orlický pohár 2027 Co teď"). Apozice
`{jméno} — {agenda}` musí platit ve **všech** patrech, protože jen ona nikdy
nenutí jméno skloňovat: *Jarní vítr — Výsledky* se napíše, *Výsledky Jarního
větru* je past „Jarní vítr uložena" (`PLAN.md:5870`) a u *Izolepy*
a *24hodinovky* dopadne jinak u každé. K 2-designu: obrácení váhy na agendu
apozici nemění, to je v pořádku; po zrušení `nowrap` ale **pomlčka nesmí začínat
řádek** — pevná mezera před ní (`2027&nbsp;—`) ji udrží na prvním řádku a zlom
padne za ni. Je-li na telefonu místo jen na jedno, vypustí se **jméno ročníku**
(nese ho drobeček) a `h1` je samo *Co teď* — nikdy slepenec.

## Kde jsme se shodli

- **D uzavřené pro plná jména:** `max-content` + odchod *Otázek* = sedm tabů,
  jeden řádek, jedno dlouhé jméno.
- **Lodě napříč patry:** přijímám *Lodě ročníku* (5-jachting, nález 9). Řada je
  pak **Lodě ročníku** (kdo je v seriálu) · **Startovní listina** (kdo startuje) ·
  **Lodě a kapitáni** (správa ročníku) · **Přihlášky** (správa regaty, proces) —
  čtyři jména, čtyři věci; dnes čtyři jména a tři věci.
- **Nadpis:** `nowrap` pryč, pomlčka na telefon doplnit. **„Práva" → *Oprávnění***.

## Nové, co vylezlo z cizích posudků

**Zaškrtnutí „Text je vložený z Wordu" — dohledáno.** Přepíná `FormatClanku` na
`Html`, a ten je **jen vstupní**: server tělo při uložení převede na bloky
(`Clanek.cs:56–66`) — berou se jen značky ze seznamu a z atributů `href`, `src`,
`alt`, takže `mso-*` styly, fonty ani velikosti v bodech nepřežijí
(`Bloky.cs:61–66`). Bez zaškrtnutí se HTML uloží jako **prostý text** a značky se
vypíšou jako znaky. Popisek má tedy říkat, co se **zachová**: *„Text je vložený
z Wordu nebo z webu"* → **„Převzít nadpisy, seznamy a odkazy z vloženého
textu"**, nápověda **„Zaškrtni, když kopíruješ z Wordu nebo z webové stránky.
Formátování — fonty, velikosti, barvy — se zahodí, struktura zůstane."**

**H — znění, o které si moderátor řekl.** Hlavička je dvouřádková, aby obstála
i vytištěná; že opakuje `h1`, je správně — doklad musí stát sám, a v tom je rozdíl
proti dvojímu „ročník je venku" v kalendáři.

- **je-li podepsáno:** *„Orlický pohár 2027 · průběžné pořadí · kategorie nad
  7 m"*, tlumeně *„Po 2 z 8 odjetých regat. Vydáno 15. 5. 2027, rozhodčí Miloš
  Zvonař."* **Není-li podepsáno**, druhý řádek zní *„Po 2 z 8 odjetých regat.
  Nepodepsaný průběžný stav k 15. 5. 2027."* — slovo **vydáno** ani jméno
  rozhodčího se nad nepodepsanou tabulkou napsat nesmí. Tím je zodpovězená
  i otázka 2 od 5-jachtinga, ať Miloš odpoví jakkoliv.
- **škrtá-li se už:** *„**Nízkobodový systém:** vítěz regaty má 0 bodů. Ze {M}
  odjetých regat se dvě nejhorší škrtají; přeškrtnuté číslo se do součtu
  nepočítá."* **Neškrtá-li se ještě:** *„…Nejhorší regaty se škrtají od {N}
  odjetých — zatím se počítají všechny."*
- **má-li ročník zastávek méně než {N}** (otázka 1, 8 vs. 9): *„V ročníku 2027 se
  neškrtá: pravidlo začíná od devíti odjetých regat a ročník má osm."* Mlčet se tu
  nesmí, čtenář jinak škrt čeká. Legenda: *„**DNC** nestartovala · **DSQ**
  diskvalifikace"*, kolik bodů která znamená doplní 5-jachting — to číslo neznám.

**3-uxovi, který si o znění řekl:** prázdné *Co teď* → *„Nic nečeká. Nejbližší je
Jarní vítr 15. 5. — zbývá vypsat závod."* (nikdy jen první věta). Sloupec adresáta
→ *„čeká na pořadatele" / „čeká na tvůj podpis"*, vždy s adresátem.

## Podmínka

1. **Jména se rozhodnou před pilotem.** Pruh se staví z `polozkyRocniku` a ta
   jména jdou odtud do drobečků, nadpisů i do `NAVOD-ROZHODCI.pdf`; přejmenovat
   *Výsledky* potom znamená sahat na tytéž obrazovky dvakrát, proti pořadí z plánu.
2. **Nad nepodepsanou tabulkou nesmí stát „vydáno" ani jméno rozhodčího.** Jinak
   web vydává doklad, který rozhodčí nevydal.

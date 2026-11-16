# Ergonomie ovládání — kolo 2

## Kde ustupuju

**A — ustupuju od svého „nejvýš jedna nepopsaná značka" a jdu dál než 7 a 9:
odklad popisu ať nebude vůbec.** Důvod je z mého oboru a je to číslo: popis
je v návrhu **jedno klepnutí** na 56pt řádek a to klepnutí má čas — poloha
je uložená, čtyři vteřiny (`poloha.ts:40`) už doběhly. Odklad tedy nešetří
nic měřitelného a kupuje za to pořadí (3/1, 9/3), přežití (9/2, 7/1) a paměť
(7/2, 7/3). 7-psychologovi na jeho přímou otázku: neodkladná je poloha, ne
popis. Návrh si sám protiřečí — bod 2 tvrdí, že stavitel „veze v lodi žlutou
bóji a **ví**, že to bude otočná", bod 1 že to smí říct později; platí první.
Tím padá i spor o úložiště: **žádná nová tabulka ani řádek ve frontě.** Prvek
vzniká při popisu, dvě až tři vteřiny po pípnutí — expozice, kterou 9 sám
označil za dnešní přijatelný stav (9/2: *„dnes je expozice krátká"*). Pořadí
pípnutí se rovná pořadí ve frontě a nálezy 3/1 i 9/3 zanikají, místo aby se
řešily. Na otázku moderátora, **jestli je odklad výjimka pro jednobodové
prvky: padá celý**, a hlavní zisk návrhu na něm nestojí.

*Podmíněně:* řekne-li Filip (otázka 7-psychologa), že se o prvcích rozhoduje
až na vodě podle větru, stavitel typ při pípnutí nezná a odklad být musí. Pak
beru tvar 9-rizik (vlastní tabulka, synchronní zápis) a svůj strop jedné
nepopsané značky, ne tvar 3-ux: dvě místa, kde prvek žije, jsou dva seznamy
ke čtení.

**D — ustupuju 2-designu: *Zkusit znovu* nesmí být plná barevná plocha.**
Chtěl bych pro něj největší terč na kartě, ale „jedna plná plocha = pípnutí"
je silnější: pípnutí se dělá celý den, zádrhel jednou za regatu. Stačí pořadí
velikostí — *Zkusit znovu* obrysové, 2 dp rám, celá šířka, 56 pt; *Zahodit*
pod ním textové s `minHeight: 44`.

**E — ustupuju 2-designu, tečka ať nese znak a 20 dp.** Měření 1,00:1 při
protanopii je rozhodující a tečka není klepací cíl, takže z mého oboru proti
ní nic nestojí. **Podmínka:** znak je druhý kanál, ne první — proužek musí jít
přečíst bez pohledu na tečku, slovy, jak je dnes, a ty tři znaky se už nikdy
nesmějí změnit ani prohodit. Rozpoznání tvaru je pod zátěží pomalejší než
barva; vyplatí se jen proto, že je redundantní.

## Kde držím

**B — sloučený seznam má osm řádků, ne sedm, a doptání jen u dvou z nich.**
Maketa slučuje *po levoboku* a *po pravoboku* do jedné *Průjezdní*, jenže
strana je u průjezdní zapsaný údaj (`VOLBY.jedna`, `strana: PoLeve` /
`PoPrave`, `stavba-prvku.ts:241–256`) — stejně jako u otočné, která dva
řádky má. Tedy: otočná levobokem, otočná pravobokem, průjezdní levobokem,
průjezdní pravobokem, brána, odskok, start, cíl = **osm úplných řádků**,
a doptání zůstane jen u **brány** (`Brana`, `OtocnaBrana`, `OtocnaZona`)
a **startu** (dva druhy). Nejsou to dvě vrstvy, před kterými moderátor varuje
— šest z osmi řádků je hotových jedním klepnutím.

Změřeno: 8 × 56 + 7 × 6 = 490 pt seznamu; s hlavičkou (103), kartou polohy
(66) a dvěma návěstími (76) je to 735 pt na 844 pt. **Neroluje.** Cesty:
otočná, průjezdní, odskok a cíl dvě klepnutí (dnes čtyři až pět), brána tři
(dnes pět), start čtyři včetně růžice (dnes šest). 7-psychologovi: doptání
**nedrží otevřenou smyčku** — ptá se a odpovídá v téže vteřině, u téhož
prvku. To je celý rozdíl proti *Popíšu potom*, které ji drží minuty.

**D — potvrzení u zahození ano, ale ne dialogem.** V rukavicích a v pohybu
je modální okno nejhorší možný tvar: objeví se pod palcem, který už klesá,
a odklepne se týmž gestem. Dnešní obrazovka nemá jediné a není důvod ho
zavádět u akce, kterou se odblokuje fronta. Tvar: **dvě klepnutí na tomtéž
místě** — první přepne obrysové tlačítko na větu *„Zahodit prvek 5 — poloha
se nevrátí"*, druhé ho provede, terč se nepohne ani o bod a po pěti vteřinách
se vrátí zpátky. Jedna poloha prstu, žádné míření, a oba stavy jsou obrysové,
takže pravidlo 2-designu drží.

**F1 — `minHeight: 44` je správná oprava obrazovky, ale pro skript to oprava
není.** Pro `chip` i `zahodit` ji potvrzuju. Skript tím zůstane slepý:
`RADEK_PT = 20` připisuje dvacet bodů každému řádku bez ohledu na písmo
(`kontrola-dotyku.py:61`, `:179`), takže příští terč se 13pt textem projde
znovu. Oprava skriptu je jiná — číst `fontSize` z téže deklarace, kterou už
rozpouští (`deklarace()`, `:124`), a počítat 1,2 × jeho hodnotu; paušál 20
nechat jen tam, kde se nenajde. A rozšířit kontrolu znamená rozšířit její
sabotáž: `Pressable` s `fontSize: 13` a `paddingVertical: 12` **musí** nově
spadnout. A druhá slepota — `vyska()` měří výšku, šířku terče nikdy.

**F2 — Odskok je vada pravidel, ne kódu obrazovky, a je v obou klientech.**
`stavba.tsx:196–218` dělá přesně to, co mu `TYPY` a `VOLBY` říkají: počet
bodů z `typ.body`, ukládaný typ z `volba.typ`. Nic v pravidlech nežádá, aby
ta dvě souhlasila, a `jak: "jedna"` u typu se dvěma body je legální hodnota,
takže to nechytí ani typový systém. **Tutéž řádku má web**
(`…/boje/[zavod]/stavba.tsx:293`), takže je rozbitý stejně. Komentář
u `stopaProPrvek` (`stavba-prvku.ts:531–534`) přitom tvrdí, že se odskok
„uloží jako vlastní typ" — zapsaný úmysl, který kód neplní. Oprava patří do
`packages/stavba/`: vlastní `jak: "odskok"` a `VOLBY.odskok` s `typ:
"Odskok"`, což je táž změna jako spor B. Moderátor ať zapíše, co z toho
plyne: **`packages/stavba/` se musí otevřít tak jako tak** — cena, kterou
NAVRH označil za nejdražší bod návrhu, je splatná, i kdyby se nesloučilo
nic.

## Kde jsme se shodli

- **Pípnutí je první a trvale dostupná akce** — kreditovali všichni; můj
  podíl je −50 % klepnutí na nejčastějším prvku.
- **Vzdálenost od prvního bodu se staví** (1, 3, 9); spor je o typografii (2/6).
- **Zádrhel fronty je překážka, ne oznámení, a má vlastní kartu** (všech 5).
- **Pořadí voleb podle četnosti a pevně zadrátované** — 7/7 a má odpověď na
  otázku 4 došly nezávisle k témuž.
- **Nepopsané pípnutí nesmí žít v `useState`** — shoda čtyř oborů.

## Nové, co vylezlo z cizích posudků

1. **Zrušení *Popíšu potom* zaplatí osmý řádek seznamu.** Má v maketě `Popis`
   52 + 10 pt, osmý řádek stojí 62 pt. Útok 3, 7 a 9 na odklad a můj spor B
   tedy nejdou proti sobě — jeden financuje druhý.
2. **U „vady okolností" (9/1) je nejlevnější tvar nula klepnutí.**
   `posliCoJde` běží jen při otevření obrazovky, po postavení prvku a po
   zahození (`stavba.tsx:156–160`); `ZKOUSKA-STAVITELE.md:91–96` to vede jako
   známé omezení: *„když se signál vrátí a ty nic neuděláš, fronta leží dál."*
   502 od Traefiku zmizí samo za desítky vteřin, takže opakování na popředí to
   vyřeší dřív, než si toho někdo všimne — *Zkusit znovu* je pro netrpělivé,
   ne jediná cesta.

## Podmínka

1. **Sloučený seznam se nesmí postavit, dokud není každý řádek úplná a platná
   kombinace** (F2) — jinak hezčí povrch zakryje tutéž vadu jako dnešní Odskok.
2. **Odklad popisu se nesmí postavit, dokud Filip neřekne, že se o prvcích
   rozhoduje až na vodě.** Pak platí tvar 9-rizik a strop jedné nepopsané
   značky; jinak vůbec — přínos je nula klepnutí a cena tři cizí nálezy.

# Kolo 2 — sporné body

Osm posudků kola 1 je v tomhle adresáři (`<obor>-kolo1.md`). **Přečti si je
všechny** a pak napiš, kde ustupuješ a kde držíš. Kolo 3 bude poslední.

**Limit 100 řádků.** V kole 1 ho pět oborů z osmi překročilo (design 212,
efekty 188, jazyk 184, režie 165, jachting 141 proti 120). Osm oborů znamená,
že se platí místem: co se nevejde do limitu, nikdo nepřečte.

**Neotvírej nic nového** — výjimkou je rozpor v číslech a to, co ti vylezlo
z cizího posudku. Nálezy, které nikdo nerozporoval, se nepřipomínají: na ně
je rubrika v kole 3.

## Moderátorský zápis

**Tři z pěti nálezů moderátora padly a moderátor to přijímá.** Píšu to sem,
protože se na ně v posudcích odkazuje jako na zadání, a nejsou:

- **R2 (souboj se nikdy neohlásí) padl trojmo** — `1-rezie`, `2-dramatik`
  i `7-efekty` nezávisle dohledaly rozhodnutí Filipa z 24. 10. 2026
  (`mapa-trackeru.tsx:1145`): *„Prohození velkou kartu nedostane… karta přes
  půl obrazovky patří dojezdu, ne souboji, který se stane každou chvíli."*
  Nedosažitelná karta `souboj` je tedy **naplněné rozhodnutí**, ne nedopatření.
  Vadou zůstává mrtvý prop `onUdalost` a 75 řádků mrtvého CSS
  (`.nacrt-souboj*`, `globals.css:5035–5090`, `:5288–5298`), na které se
  komentáře v kódu odvolávají jako na existující hlášku.
- **R3 byl ve svém příkladu nepravdivý** — `udalosti()` vkládá zprávy a výstrahy
  na `:102`, dojezdy na `:215`, takže uvnitř jednoho snímku výstraha nečeká.
  Platí jen pořadí **napříč snímky** a chybějící strop.
- **R1 mělo vedle zdůvodnění** — odpočet existuje a běží (`PROCEDURA_S = 300`,
  `rozjizdky-tabule.ts:54`). Startu nechybí data, chybí mu váha.

**A jedno pravidlo rámce v `ZADANI.md` bylo nepravdivé.** Rámec 5 tvrdí, že
u pořadí stojí `ZAPIS` (*čerstvé z vody / u rozhodčího / potvrzeno*). `8-jazyk`
ukázal, že `ZAPIS` nereferencuje nic a na tabuli jede `JAK_JISTE`
(`vysledky.tsx:18`) — kopie štítků pro správce včetně *eliminováno*, které
Filip 16. 10. 2026 zakázal (`lib/vysledky.ts:102`). **Rámec 5 platí dál ve své
věcné části** (nepodepsaná čísla nesmějí vypadat jako hotová), ale jeho příklad
byl špatný.

### Tři fakta, o kterých se nehlasuje (moderátor změřil)

1. **`PoKategoriich` se jede.** `data/2026-nanecisto.json`: 4× `PoKategoriich`,
   4× `Oboje`; `data/2027-kalendar.json`: **8× `PoKategoriich` z devíti**
   zastávek, `CelePole` jedna. Nález 2 od `5-jachting` (režie neví o třídách)
   má tedy plnou tíhu — není to možnost v API, je to většina ročníku.
2. **`lodi()` dává „1 lodě".** `tabule-udalosti.ts:72` je
   `kolik < 5 ? "lodě" : "lodí"` a komentář nad ní slibuje číslovku slovem,
   kterou kód nevydá. Nález 6 od `8-jazyk` platí v obojím.
3. **`Snimek.lode` míchá tři stavy účasti** — `Prihlasena`, `Potvrzena`
   i `Vyloucena` (`ZavodEndpoints.cs:189–190`), rozlišuje je jen pole
   `potvrzena`. Odpověď pro `4-insider`: není to ani seznam přihlášených, ani
   přítomných, a tvůj nález 3 jde postavit dál, než jsi čekal.

## Co odpověděl Filip

1. **Televize:** *„Většinou velká plazma v restauraci, tak ta 55 je asi dost
   reálná."* ⇒ `6-design` měří na **55" ze 4–6 m**; podlaha textu z D3 platí
   v té tabulce.
2. **Slovo „vede":** *„Ano, to je dobrý nápad a dokonce i třeba nějaké hezké
   grafické tagy/pečetě/značení u vedoucí kategorie a nebo těch co jsou na
   stupních. Uvidíme v náhledu."* ⇒ slovo je povolené i u nepotvrzeného
   pořadí, s cedulkou o stavu zápisu u sebe. **A je to objednávka navíc:**
   odznak či pečeť u vedoucího a u prvních tří.
3. **Po dojetí regaty:** *„Tady jsem myslel, že nám poslouží i ty carrousely
   dole, kdy obrazovka může ukazovat pořadí a pak je možné ukazovat obojí, ale
   nechám na zváženou."* ⇒ směr je **střídat regatu s pohárem v pásech dole**,
   rozhodnutí nechává konziliu.
4. **Pauza mezi rozjížďkami:** *„U okruhové je to 15–30 (mimo obědu tam je to
   delší). U Izolepy, Fcanceru apod. se čeká na dojezdy z delší vzdálenosti,
   a tak se čeká třeba hodinu a půl, ale někdy fouká, tak to odsýpá. Takže
   podle situace."* ⇒ **pauza je neznámá délka od 30 minut do dvou hodin.**
   Smyčka 75 s + 30 s se tedy zopakuje ne sedmnáctkrát, ale **až
   sedmdesátkrát**.

5. **Hystereze podoby:** *„hystereze je asi ok, na telce v hospodě nezáleží
   až tak, jestli to frčí přesně na sekundu. Je to jednosměrný tok informací,
   které snesou zpoždění."* ⇒ **minimální doba podoby je schválená.** Zpoždění
   proti skutečnosti není v tomhle médiu cena, kterou by stálo za to odmítat;
   tabule nikoho neinformuje o něčem, na co musí reagovat.

## Sporné body

U každého je, **kdo se k němu má vyjádřit**. Ostatní ho vynechte — osm oborů
krát devět bodů se nedá přečíst.

### S1. Co řídí volbu podoby: technický signál, nebo stav rozjížďky?

`1-rezie` (Š5) potvrzuje R4 a chce minimální dobu podoby `PODOBA_DRZI_S`.
`2-dramatik` (D2) vyvrací R4 zpola: hystereze kmitání zarazí, ale upevní tu
horší chybu — že o podobě rozhoduje `polohy.vysila`, a ne děj. Změřený fakt
podpírá dramatika: volba podoby (`obrazovka.tsx:303–311`) se na `Probiha`
neptá ani jednou, a průběžné odesílání poloh **zatím vůbec není**, takže se
rozjížďka dnes vždycky promítne jako `mezi` nebo `listina`.
**Rozhodnuto 22. 11. 2026 (Filipova odpověď 5):** hystereze prochází, o ní
se už nehlasuje. Spor se tím zužuje na **vstup, ne na setrvačnost** —
`1-rezie` tedy neobhajuje `PODOBA_DRZI_S`, ale to, **z čeho** se podoba
počítá, když se volba na `Probiha` neptá a polohy se zatím neodesílají.
**Vyjádřit se: `1-rezie`, `2-dramatik`, `7-efekty`** (přechod mezi podobami).

### S2. Co dostane souboj místo karty?

Shoda tří oborů: kartu ne. Rozchod je v tom, co místo ní, a návrhy **nejsou
nutně výlučné** — každý míří na jinou vrstvu:

- `7-efekty` (E3): **pás** vlevo nahoře na mapě, wipe 300 ms, drží 40 s. Mrtvé
  CSS na to v repozitáři je.
- `2-dramatik` (D4): **karta o změně v čele** (`pozice === 1`), nejvýš jednou
  za dvě minuty — ne souboj, ale „změnila se odpověď na kdo vyhrává".
- `5-jachting` (1): **jiná spoušť** — souboj má zapínat blízkost (~50 m), ne
  potvrzené prohození po 60 s a 120 m, kdy je po souboji.
- `6-design` (D4): barva `--pozor`, ne zelená shodná s „dokončeno".
- `8-jazyk` (3): nadpisek **Souboj**, titulek bez skloňování jména lodi.

Otázka ke všem pěti: **dá se to složit do jednoho řešení**, nebo si některé
dva návrhy odporují? Komu připadne rozpočet času (dnes 43 % na souboj), řekni
`1-rezie`.
**Vyjádřit se: `1-rezie`, `2-dramatik`, `5-jachting`, `6-design`, `7-efekty`,
`8-jazyk`.**

### S3. Režie neví o třídách — a je to většina ročníku

`5-jachting` (2): `pozice` prohození je počet všech lodí před dvojicí,
`poradiVCase` řadí celé pole v jednom seznamu, takže `SOUBOJ_DO_POZICE = 3`
měří ve stupnici, kterou osm z devíti zastávek 2027 nepoužívá. Souboj
o vedení v `Pod7m` se neukáže nikdy. Navazuje na to `3-fanousek` (6): laik
nepozná, že jde o tři oddělené závody se třemi vítězi.
**Vyjádřit se: `5-jachting`, `1-rezie`** (co to dělá s rozpočtem času),
**`3-fanousek`, `6-design`** (jak se tři vítězové na obrazovce odliší).

### S4. Start jako pátá podoba — co do ní patří a v jakém stavu jsou součástky

Shoda, že pátá podoba má být. Rozpory jsou tři:

- `5-jachting` (4): **vlajky dnes lžou.** `dojeto` → **S** znamená
  v Závodních signálech *zkrácená dráha*; `ceka` → **P** je přípravný signál
  platný jen od −4:00 do −1:00 (ZPJ 26). A vlajka **N** u slova „zrušena"
  přeslibuje: N je *přerušení*, přerušená rozjížďka se může přeplout.
- `6-design` (D5): **semafor není připravený** — čtyři různé zelené, paleta
  natvrdo mimo tokeny, panel `var(--panel, #1a1a1a)` zmizí ve světlém režimu.
  Zapojit ho jak je znamená zapojit pátou a šestou zeleň.
- `5-jachting` (rámec 4): `Snimek` **nezná startovní signály** (X, první
  zástupce, AP, I/Z/U/černá podle ZPJ 30), takže odvolaný start — *„na startu
  ta nejlepší televize"* — podoba neukáže. To je návrh na nová data.

**Vyjádřit se: `1-rezie`, `5-jachting`, `6-design`, `8-jazyk`** (jméno podoby;
`8-jazyk` navrhuje přerovnat celou sadu na `listina | mapa | pauza | konec`
plus `start`).

### S5. Clona, strop karet a pulzování obrazovky

`7-efekty` (E1): clona `inset: 0` nad celou tabulí ke každé kartě, `ALERT_MS`
= délka animace, takže dvanáct dojezdů je 54 s pulzování; návrh — clonu jen
pro `vystraha`. `1-rezie` (Š6): výstraha na začátek fronty, nejvýš tři
dojezdy vedle sebe, zbytek nahradí existující druh `venku`. `6-design` se
ptá, kolik karet za rozjížďku režie připustí, protože clona sráží kontrast
a slovo „vede" se celou tu dobu čte přes ni.
**Vyjádřit se: `1-rezie`, `6-design`, `7-efekty`.**

### S6. Pohár z obrazovky mizí třemi různými způsoby

`4-insider` (1, 2, 4): pořadí série zamrzne v okamžiku otevření stránky
(změřeno — jde dolů jako prop, obnovovací smyčka nese jen `Snimek`); dnešní
dojezd se nikde nepřeloží do roku, přitom se hraje se dvěma škrty a do série
jde pořadí v kategorii minus jedna; a pásy s pohárem zmizí právě při
rozjížďkách. `2-dramatik` (D1, D5): `po` a `mezi` jsou tatáž větev lišící se
jedním slovem, a expozice neřekne, o co se dnes hraje. Filipova odpověď 3
dává směr: střídat v pásech dole.
**Vyjádřit se: `4-insider`, `2-dramatik`, `1-rezie`** (kdy a jak často),
**`6-design`** (unese pás dvě pořadí).

### S7. „Kdo vede" — Filip přidal objednávku

`3-fanousek` (1, 2) a `6-design` (D2) našli nezávisle totéž: ani jeden
selektor na první místo, a nejnižší body vyhrávají, aniž by to kdekoli stálo.
Filip slovo „vede" povolil a **přidal pečeti u vedoucího a u prvních tří**.
Spor tu není, úkol je. Rozdělte si ho: co je slovo (`8-jazyk`), co je tvar
a váha (`6-design`), co je příchod té pečeti (`7-efekty`).
**Vyjádřit se: `6-design`, `8-jazyk`, `7-efekty`, `3-fanousek`.**

### S8. Dva slovníky stavu zápisu, jeden mrtvý a jeden zakázaný

`8-jazyk` (1): `JAK_JISTE` zrušit a vypisovat `ZAPIS`; tím se obrací nález 12
v `TABULE-DIVAK.md`, který `ZAPIS` vedl jako kód bez majitele. Souvisí
s `4-insider` (5: cedulka jistoty je autorita rozhodčího) a s `3-fanousek`
(1: čte ta slova laik).
**Vyjádřit se: `8-jazyk`, `4-insider`, `3-fanousek`.**

### S9. Pauza může být dvě hodiny — a tabule na ni má smyčku 105 sekund

Nové z Filipovy odpovědi 4. `1-rezie` (Š5) počítal se sedmnácti opakováními,
při dvou hodinách je to **sedmdesát**, a začíná se vždy 75 s statické
tabulky. `2-dramatik` (D3): první přehrání hned při přechodu do `Dokoncena`,
jednou a celé, pravidelné střídání teprve po něm. Otázka je, co dělá
obrazovka v **sedmdesáté minutě** pauzy, kdy je všechno dávno přečtené.
**Vyjádřit se: `1-rezie`, `2-dramatik`, `3-fanousek`** (koukal bys ještě),
**`4-insider`** (je pauza místo na pohár).

## Jak se píše posudek kola 2

Do `docs/konzilium/rezie-tabule/<tvoje-session>-kolo2.md`. **Limit 100 řádků.**
Nesahej na cizí soubory, nic necommituj.

```markdown
# <obor> — kolo 2

## Kde ustupuju
Čí argument a proč tě přesvědčil. Jmenuj obor a bod.

## Kde držím
Co hájíš dál a čím to podkládáš proti námitce.

## Kde jsme se shodli
Body, kde je shoda — stačí věta, ať je vidět, co už je hotové.

## Nové, co vylezlo z cizích posudků
Jen co jsi bez nich nemohl vidět. Ne nové nálezy ve svém oboru.

## Podmínka
Za čeho splnění svůj ústup platí — nebo „žádná".
```

Pravidla zůstávají z kola 1: nálezy podkládej souborem a řádkem nebo změřenou
věcí, dojem označ jako dojem, měř na televizi (55", 4–6 m), nepřepisuj kód.
**Rozpor v číslech se neřeší hlasováním** — kdo si protiřečí v číslu, ať je
změří proti kódu a napíše proti čemu.

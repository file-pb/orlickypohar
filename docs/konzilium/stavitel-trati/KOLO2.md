# Kolo 2 — kde se neshodnete

Moderátorský zápis po prvním kole. **Přečti si čtyři cizí posudky**
(`docs/konzilium/stavitel-trati/*-kolo1.md`) a potom tohle.

**Zadavatel (Filip) spí**, takže na otázky položené jemu odpovědi nejsou.
Kde na něm něco visí, rozhodni podmíněně („je-li A, pak B, jinak C")
a napiš, co z toho považuješ za podmínku, bez které se stavět nemá.
Jeho otázky sbírám na konec tohohle souboru a ráno je dostane najednou.

## Co k tomu říká moderátor (autor návrhu)

Abyste neřešili nedbalost maket místo návrhu:

- **Souřadnice, časy, jména regat a čísla rozjížděk** v maketách jsem si
  vymyslel. Nálezy, které z nich plynou, padají — s jednou výjimkou:
  **nález 2/4 (barvy bójí z cizích tokenů) nepadá.** Žlutou a červenomodrou
  jsem vzal z `pripravaZnameni` a `stavZruseny`, protože se mi hodily
  odstínem. To je přesně to, před čím obor 2 varuje, a řeší se to i tehdy,
  když barva bóje nakonec žádný význam nemá.
- **Růžice se světovou stranou v maketách chybí** (nález 1/4). Je to díra
  v maketě, ne rozhodnutí, že směr zmizel. **Nález tím ale nepadá:** návrh
  neřekl, kam se směr přesouvá, a jestli připadne před druhé pípnutí,
  vrátí se tím vada, kterou návrh vyhlásil za hlavní.
- **Volba značení v maketách chybí** (nález 1/6). Totéž: díra, ne záměr.
  Nález platí celý, protože `Plavidlo` a `ObjektNaBrehu` jsou u startu
  mezi lodí a molem běžné a návrh pro ně nemá místo.
- **Bílá napevno na modré ploše** (nález 2/1) a **dvě plné barevné plochy
  v `Fronta.dc.html`** (nález 2/5) jsou chyby maket — ale pravidlo z nich
  plyne pro stavbu, ne pro maketu, a tam platí v plné síle. Appka má na to
  `pismoNaVyplni` a maketa ho obešla.
- **Čím návrh začal:** Filip, 16. 11. 2026, *„koukl jsem zběžně a chtělo by
  to trochu zapracovat taky na ergonomii a designu."* Letmý dojem, žádný
  konkrétní nález. Každé řešení, které obrazovku **zesložití**, jde proti
  tomu, čím to začalo — i když je samo o sobě správné.

**Tři nálezy nemíří na návrh, ale na živý kód** (1/3, 1/7, 3/2). Těch se
spor netýká a moderátor je bere jako opravy; viz oddíl F.

## Sporné body

Očíslované. V posudku kola 2 projdi **ty, u kterých jsi jmenovaný**, a u
každého napiš: **držím / ustupuji / jinak** — a proč. Jedna věta stačí,
když je jasná.

### A. Kam se ukládá nepopsané pípnutí a kde zabírá místo

Všichni čtyři jste našli totéž: nepopsaná značka nemá kde přežít a rozbíjí
pořadí. Shodu na tom zapíšu i bez vás. **Spor je o tvar řešení** a jsou
čtyři:

- **3-ux (nález 1):** řádek v `stavba.db` **ve frontě**, bez popisu,
  neodesílá se a zastavuje odesílání všeho za sebou — stejně jako odmítnutý
  prvek. Tlačítko přejmenovat na *Popíšu potom (další prvky počkají)*.
- **9-rizika (nález 2 a 3):** vlastní tabulka v `stavba.db`, zápis
  synchronně při klepnutí. Jako **levnější variantu** nabízí zakázat druhé
  pípnutí, dokud není první popsané.
- **7-psycholog (nález 1):** vlastní tabulka, popis ji teprve překlopí do
  fronty. Navíc: dokud to tak není, **slovo „uložená" se na tu obrazovku
  napsat nesmí**.
- **1-ergonomie:** ať je úložiště jakékoli, **nejvýš jedna** nepopsaná
  značka naráz.

**Kdo odpovídá:** 1, 3, 7, 9. Rozhodněte mezi sebou **jedno** řešení.
Vlastní tabulka a místo ve frontě nejsou totéž: první řeší přežití,
druhé pořadí, a přijmout obojí znamená dvě místa, kde prvek žije.

Zvlášť odpovězte na tohle, protože na tom visí celý nález 1/1 návrhu:
**u brány se popis odložit nedá** (3-ux), protože bez typu appka nepozná,
že druhé pípnutí patří k prvnímu. Je tedy odklad popisu výjimka pro
jednobodové prvky, nebo padá celý?

### B. Kolik řádků má sloučený seznam

- **1-ergonomie (nález 1):** `VOLBY` nese deset předpisů plus Odskok;
  maketa má sedm řádků, takže **čtyři rozlišení, která dnešní průvodce
  zapíše, v seznamu nejsou**. Jedenáct řádků se na 844 pt nevejde
  (≈ 1 010 pt) a rolování je v rukavicích nejhorší možná interakce.
  Navrhuje sedm častých a doptání na variantu jen u brány a startu,
  **až po uložení polohy**.
- **3-ux:** z toku vychází sloučení správně, s výhradou u brány.
- **7-psycholog:** „Jedna značka / Dvě značky" je kategorie **zápisu**,
  ne trati; k ceně se nevyjadřuje. Pořadí voleb ať je podle **četnosti**
  a pevně zadrátované, nikdy „naposledy použité nahoru".

**Kdo odpovídá:** 1, 3. **Přizván:** 7 — je doptání na variantu po pípnutí
menší zátěž než delší seznam, nebo větší, protože drží otevřenou smyčku?

Shodněte se na jednom tvaru. Dvě vrstvy naráz (dlouhý seznam **i**
doptávání) jsou horší než dnešek.

### C. Číslo přesnosti: trvale, nebo jen u rozhodnutí

Spor je přímý a oba jste ho podložili.

- **2-design (co je dobře, bod 2):** proužek nese **číslo a větu**, ne jen
  barvu — drží SC 1.4.1 i tehdy, když tečka nic neřekne.
- **7-psycholog (nález 5):** živé číslo si vybere pozornost, protože se
  hýbe, a odvede ji od vody. Přesnost se stavitelovým jednáním nemění —
  jediná akce je čekat. Navrhuje v proužku **tři stavy** a číslo ukázat
  u tlačítka a v detailu prvku.

**Kdo odpovídá:** 2, 7. Jde to smířit (text stavu trvale, číslo u akce),
nebo jeden z vás ustupuje? Rozhodněte tak, aby výsledek nebyl „obojí",
protože to je dnešní stav se dvěma místy navíc.

### D. Tvar cesty ven ze zaseknuté fronty

Tady se **doplňujete, ale nesedíte si v hlavní akci**:

- **9-rizika (nález 1):** rozdělit odmítnutí na *vadu prvku* (400 s větou
  pravidla) a *vadu okolností* (403, 404, 5xx — včetně **502 od Traefiku
  při nasazení během závodního dne**). U druhé třídy je hlavní akce
  **Zkusit znovu**, `Zahodit` leží pod ní a s potvrzením. Zahozené ať
  zůstane v tabulce `zahozene`.
- **2-design (nález 5):** v kartě zádrhelu **nesmí být druhá plná barevná
  plocha** — plnou plochu si drží jen pípnutí, zahození je obrysové.
- **7-psycholog (nález 6):** zahození ať nechá řádek „zahozeno: <věta
  serveru>" i se souřadnicemi.
- **1-ergonomie:** dnešní `Zahodit` je nejhůř trefitelný terč na obrazovce
  (≈ 40,7 pt) a zároveň jediný, který rozjede frontu.

**Kdo odpovídá:** 9, 2. Karta má mít dvě akce (*Zkusit znovu*, *Zahodit*).
Shodněte se, která z nich je vizuálně hlavní a jestli *Zkusit znovu* smí
být plná plocha, když pípnutí má být jediná. **Přizván:** 1 — je
potvrzení u zahození v rukavicích únosné, a v jakém tvaru?

### E. Co nese stav polohy, když barva nestačí

- **2-design (nález 2):** `vystraha` a `stavZruseny` mají mezi sebou
  **1,09:1** a při protanopii **1,00:1** — pro barvoslepého jedna barva.
  Ve světlé sadě **neexistuje token**, který by to spravil. Tečka ať nese
  **znak** (disk / vykřičník / kříž) a zvětší se z 12 na 20 dp.
- **1-ergonomie** se ptá opačně: unese tečka 20 dp znak, nebo je na paži
  v rukavicích čitelnější prázdná barevná ploška a stav patří jen do slov?

**Kdo odpovídá:** 2, 1. Jedno řešení. **Přizván:** 7 — mění znak místo
barvy něco na tom, jak rychle se stav přečte pod tlakem?

## F. Co sporné není a moderátor to bere jako opravu

Tohle nepotřebuje hlasování. Píšu to sem, aby to v kole 3 nespadlo pod stůl
— a aby ten, komu to patří, řekl, jestli to vidí stejně.

1. **Dva terče na dnešní obrazovce nedrží 44 pt a kontrola to nevidí**
   (nález 1/3): `chip` ≈ 39,5 pt, `zahodit` ≈ 40,7 pt, protože
   `kontrola-dotyku.py` počítá řádek paušálem 20 pt. **Moderátor to bere
   a přiznává, že to je jeho vlastní chyba z 16. 11.** — opravil tehdy 36 pt
   na „44" podle téhož skriptu a napsal to do `ZKOUSKA-STAVITELE.md`
   jako hotovou věc. Obě čísla byla čísla skriptu. **1-ergonomie:** potvrď
   v kole 2, že `minHeight: 44` je správná oprava i pro skript, ne jen pro
   obrazovku.
2. **Odskok dnes nelze postavit** (nález 1/7): `jak: "jedna"` u typu se
   dvěma body vyrobí `OtocnaBoje` se dvěma body, což `dvaBody` vylučuje.
   Pět klepnutí skončí prvkem, který zastaví frontu. **1-ergonomie:** je
   to podle tebe vada kódu, nebo jen pravidel v `stavba-prvku.ts`?
3. **`veliNekde` pouští k obrazovce i toho, komu server stavbu odmítne**
   (nález 3/2): appka se ptá „velí někde", server na rozsah konkrétní
   zastávky. Řešení (příznak `smiStavet` od serveru) je v repozitáři už
   jednou rozhodnuté u zápisu výsledků. **3-ux:** potvrď, že je to táž
   věc, a ne jen podobná.
4. **Tok stavitele nemá konec** (nález 3/5): appka neumí `POST …/hotovo`.
5. **Prošlé přihlášení se nedozví nikdo** (nález 3/4): 401 se zapíše jako
   neodmítnutá potíž a obrazovka ji neukáže.
6. **Destruktivní terč leží v klidové poloze palce** (nález 1/2).
7. **Bílá na `voda` je v tmavé sadě 2,35:1** (nález 2/1): brát
   z `pismoNaVyplni`, ikonu taky.

## G. Podmínka, kterou vznesl jeden obor a týká se rozdělané práce

**9-rizika (nález 5):** pomocník je schválně **příznak, ne role**, a má
otevírat „jen start a cíl". `StaviAsync` ale kryje celou skupinu `MapSpravu`
— tedy i `DELETE /{trat}`, `DELETE /prvky/{prvek}` a `/prestavba`. Přidat
pomocníka do `StaviAsync` by znamenalo, že člověk, který přijel na jednu
regatu vypomoct, smí smazat prvky a zahodit trať.

Moderátor to bere a zapíše jako podmínku: **stavba se pomocníkovi neotevře
dřív, než vznikne vlastní predikát** jen na `POST /prvky/postav` a čtení.
Je to zásah do práce, která se právě chystá, a je dobře, že to padlo teď.

**3-ux a 9-rizika:** shodněte se, jestli ten predikát patří k `Pomocnici`
(vedle `SmiUVody`), nebo do `TratEndpoints` vedle `StaviAsync`.

## Co napsat

Do `docs/konzilium/stavitel-trati/<tvoje-session>-kolo2.md`, do **120 řádků**:

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

Pravidla z kola 1 platí dál: podkládej, nepřepisuj kód ani makety,
necommituj, nesahej na cizí soubory.

## Otázky, které ráno dostane zadavatel

Sbírám je sem, ať se neztratí. Neodpovídejte na ně — rozhodněte podmíněně.

- **2-design:** jede telefon ráno na vodě v tmavém režimu? Mají barvy bójí
  na Orlíku skutečný význam (žlutá otočná, červený a modrý konec brány)?
- **7-psycholog:** staví se trať podle předem nakresleného plánu, nebo se
  o prvcích rozhoduje na vodě podle větru? Kormidluje a pípá tentýž člověk?
- **3-ux:** staví dva lidé jednu trať současně?
- **1-ergonomie:** kolik z těch jedenácti kombinací se za sezónu postaví?
- **9-rizika:** má `posud` dál pouštět celé Česko, když ani jedna kontrola
  nepozná bránu položenou mimo přehradu?

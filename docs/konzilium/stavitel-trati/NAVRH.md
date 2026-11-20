# Stavitel trati — návrh přepracování (17. 11. 2026)

Podklad pro konzilium. **Není to rozhodnutí**, je to návrh k rozcupování.
Makety k němu leží v `navrh/` a jako plátno v artefaktu
*Stavitel trati — návrh přepracování*.

**Nálezy 1 až 6 posuzovalo konzilium** (tři kola, závěr v `ZAVER.md`).
**Nálezy 7 až 11 přibyly 17. 11. 2026** z Filipových postřehů nad
maketami, konzilium je nevidělo, a každý to u sebe říká.

## Čím to začalo

Obrazovka se postavila 16. 11. 2026 a hned ten večer Filip napsal:
*„koukl jsem zběžně a chtělo by to trochu zapracovat taky na ergonomii
a designu."* Žádný konkrétní nález — dojem z letmého pohledu. Tenhle návrh
je pokus ten dojem pojmenovat a nabídnout, co s ním.

Obrazovka **nikdy neběžela na vodě**. Všechno níž je rozbor kódu a úvaha,
ne zkušenost z motoráku. Co z toho padne při první skutečné stavbě, padne.

## Jak se trať staví doopravdy

*Zapsáno 20. 11. 2026 podle Filipa. Konzilium tohle nevědělo a část jeho
rozvahy to posouvá.*

Plán trati často vzniká **předem z kanceláře**: někdo ho naklikne z webu
nad mapou, aby posádky dopředu věděly, jak se asi pojede. V den regaty
pak vyrazí loď a stavitel **pípá úpravy z vody** — bóje se posunou podle
větru a počasí. Pro další rozjížďky se někdy založí trať nová.

**Plán ale není pravidlo.** Někdy se trať postaví rovnou na vodě bez
jakékoliv přípravy — záleží, kdo ji staví a jak svědomitě. Obě cesty jsou
normální a **ani jedna není ta správná**; obrazovka proto nesmí plán
předpokládat, vyžadovat ho ani na jeho nepřítomnost upozorňovat.

Tři věci z toho plynou, a každá míří jinam, než návrh dosud mířil:

1. **Hlavní činnost na vodě není zakládání, ale úprava.** Obrazovka je
   celá postavená na „pípni novou značku"; skutečný den vypadá spíš jako
   „tahle je o dvacet metrů vedle". Viz nález 14.
2. **Bod z mapy není okrajový případ.** Nález 10 ho obhajoval dráty nad
   vodou — ve skutečnosti je to **způsob, jakým plán vzniká**, jen se to
   dělá na webu. Appka a web tedy dělají touž věc ze dvou stran.
3. **Trať se během dne mění, a to je v modelu záměr.** `Boje.NahrazenaV`
   a `Platna` existují proto, aby šlo porovnat trasu lodi se stavem,
   který zrovna platil (`Boje.cs`: *„přenastavení je nový záznam, ne
   přepis"*). Appka z toho dnes neumí nic.

## Co dnes obrazovka dělá

`app/src/app/serie/[slug]/zavody/[zavod]/stavba.tsx`, průvodce o pěti krocích:

1. **typ prvku** — Jedna značka · Dvě značky · Start · Cíl · Odskok
   (`packages/stavba/stavba-prvku.ts`, `TYPY`)
2. **předpis** — Otočit levobokem · Nechat po pravoboku · Projet mezi nimi …
3. **značení + pípnutí** — řádek předvoleb a velké tlačítko *Pípni*
4. **růžice** — světová strana, jen u Startu a Cíle (`patriSmer`)
5. **potvrzení** — a teprve tady se prvek zařadí do fronty

Nad tím bannery (zámek trati, chybějící oprávnění k poloze, fronta)
a pod tím seznam *Co už stojí*.

## Co na tom vadí

### 1. Časově kritický krok je až třetí

**Nález.** Pípnutí je krok 3. Před ním stavitel vybírá typ a předpis.

**Proč to vadí.** Poloha je jediná věc na téhle obrazovce, která **mizí**.
`poloha.ts:37` odmítá fix starší než čtyři vteřiny, protože loď se mezi
dvěma body posune a uložená poloha by položila značku tam, kde loď stála
před chvílí. Všechno ostatní — typ, předpis, značení, směr — se dá vyplnit
za hodinu stejně dobře jako teď. Dnešní pořadí tedy nutí stavitele
rozhodnout dvě nepodstatné věci dřív, než smí zachytit tu jedinou, která
na čase závisí. U brány, kde se mezi konci popojíždí, se to platí dvakrát.

**Návrh.** Obrátit to: **pípnutí je trvale dostupná hlavní akce** dole na
obrazovce, dostupná v každém stavu. Klepnutí uloží polohu a čas. Teprve pak
se obrazovka ptá, co to bylo — a i na to se dá odpovědět později.

### 2. Typ a předpis jsou dvě otázky na jednu věc

**Nález.** Krok 1 se ptá na počet bodů (*Jedna značka* / *Dvě značky*),
krok 2 na to, co loď má udělat (*Otočit levobokem*).

**Proč to vadí.** Stavitel neuvažuje v počtu bodů. Veze v lodi žlutou bóji
a ví, že to bude **otočná, kterou se jede levobokem** — jedna věc, ne dvě.
„Jedna značka" je kategorie vymyšlená kvůli tomu, kolikrát se pípne;
to je vnitřní vlastnost zápisu, ne vlastnost trati.

**Návrh.** Jeden seznam konkrétních věcí: *Otočná — levobokem*,
*Otočná — pravobokem*, *Průjezdní*, *Brána*, *Odskok*, *Start*, *Cíl*.
Kolik bodů se pípne, plyne z volby a neptá se na to nikdo.

**Co to stojí.** `stavba-prvku.ts` je **sdílený s webem**
(`packages/stavba/`, rozkopírovává se do obou klientů). Tahle změna se tedy
dotkne i webového průvodce, nebo se ta pravidla musí rozdělit — a rozdělení
by znamenalo dvě pravdy o tomtéž, což byl celý důvod, proč modul vznikl.
**To je nejdražší bod celého návrhu a nejspíš i nejspornější.**

### 3. Stav polohy je vidět jen v jednom kroku

**Nález.** Přesnost (`popisPresnosti`) se vykresluje u tlačítka *Pípni*,
tedy v kroku 3.

**Proč to vadí.** Stavitel se dozví, že má špatný signál, až ve chvíli, kdy
chce pípnout — po dvou krocích vybírání. Přitom je to stav prostředí, ne
stav průvodce: platí pořád a mění se bez jeho přičinění.

**Návrh.** Trvalý proužek pod hlavičkou: tečka (zelená/oranžová/červená),
číslo v metrech a věta o čerstvosti. Jedno místo, stejné v každém stavu.

### 4. Po prvním bodu brány není podle čeho poznat, že stačí popojet

**Nález.** U dvoubodového prvku se po prvním pípnutí ukáže jen výzva
*„Popojeď a pípni pravou"* (`stavba-prvku.ts`, `TYPY`).

**Proč to vadí.** Pravidlo o čtyřech vteřinách hlídá stáří fixu, ne
vzdálenost. Když stavitel pípne druhý konec dost pozdě, aby byl fix
čerstvý, ale dřív, než doopravdy popojel, vznikne brána široká pár metrů —
a **na obrazovce to vypadá úplně správně**. Pozná se to až z mapy trati.

**Návrh.** Po prvním bodu ukazovat **vzdálenost od něj**, velkým číslem,
živě. Je to levné (`vzdalenostM` v `packages/stavba/geo.ts` už existuje)
a dává staviteli zpětnou vazbu, kterou dnes nemá odnikud.

### 5. Zádrhel fronty má podobu pruhu, přestože zastavuje celou stavbu

**Nález.** Odmítnutý prvek se ukáže jako pruh nad průvodcem
(`stavba.tsx`, `stojici`), vedle ostatních bannerů.

**Proč to vadí.** Odmítnutý prvek **zastaví frontu celou** — a je to
schválně, protože pořadí na trati určuje pořadí, v jakém prvky dorazí na
server. Dokud ho někdo nezahodí, nic dalšího neodejde. Takový stav není
oznámení, je to překážka, a vypadá stejně jako banner o oprávnění k poloze.

**Návrh.** Vlastní karta s červeným rámem, větou od serveru, vysvětlením
následku a tlačítkem *Zahodit prvek N* přímo v ní.

### 6. Všechno na obrazovce váží stejně

**Nález.** Karty voleb (`velke`), řádky seznamu (`radek`) i pruhy (`pas`)
mají týž rám o jednom pixelu a podobné odsazení (`stavba.tsx`, `styly`).

**Proč to vadí.** Na slunci, v pohybu a přes mokré sklo se hierarchie
nečte z odstínů rámečků. Obrazovka, kde je všechno stejně důležité, nutí
stavitele číst, místo aby mířil.

**Návrh.** Jedna plná barevná plocha na obrazovku = hlavní akce. Volby
bílé s tenkým rámem. Informace bez rámu. Nic dalšího barevného, kromě
stavů (červená = stojí, oranžová = pozor).

### 7. Fotka z vody v návrhu není vůbec — a server ji čeká

*Doplněno 17. 11. 2026 na Filipův postřeh. **Konzilium tenhle nález
neposuzovalo**, přišel po závěru.*

**Nález.** Ani návrh, ani žádná z maket neříká o fotce slovo. Přitom doklad
fotkou u značky **je hotový**: `Fotka.UBojeId` s migrací
`20261009092122_FotkyBoje`, `POST …/boje/{boje}/fotky`
(`BojeEndpoints.cs:59`), `FotkySprava.PridejKBojiAsync` (`:169`) i mazání
(`:186`). Web to umí z obou stran — `nahrajFotku` a `odeberFotku`
(`web/lib/boje.ts:295`, `:326`). Fotek smí být na jednu bóji víc schválně:
*„jeden snímek zblízka neukáže zároveň bóji i břeh za ní, a teprve obojí
dohromady dokládá, kde to je"* (`FotkySprava.cs:160–162`, Filip, 9. 10.
2026).

**Proč to vadí.** Fotka se dá pořídit **jen z vody** a jen při stavbě — na
břehu je ta bóje daleko. Appka ale stavitele o fotku nijak nepožádá, takže
nevznikne, a co nevznikne na vodě, se nedoloží nikdy. Hotová serverová
cesta tím zůstane prázdná.

**Čím to není.** Není to chybějící tlačítko fotoaparátu. Obrazovka fotku
vynechává **vědomě** a důvod je zapsaný v jejím vlastním popisu: *„byla by
to nativní závislost, tedy posunutý otisk a ruční přeinstalace APK u všech"*
(`stavba.tsx:72–73`). Ten otisk je `runtimeVersion` z fingerprintu: nový
nativní modul (`expo-image-picker`, `expo-camera`) rozdělí kanál OTA a každý
telefon potřebuje ruční instalaci. Není to teorie — přeinstalace iPhonu
16. 11. chtěla kabel, Xcode a potvrzení certifikátu na telefonu, a podpis
osobního týmu vyprší 23. 11.

**Rozhodnuto (Filip, 17. 11. 2026): fotí se v appce**, a to **dvěma
cestami — vyfotit teď, nebo vybrat z galerie**. Nativní fotoaparát
telefonu, ale spustí ho appka a snímek se vrátí do ní. Tím padá varianta
„fotit zvlášť a nahrát na břehu z webu"; zůstává jen jako to, co funguje do
doby, než vyjde nativní build.

Obě cesty umí **jeden** modul, `expo-image-picker`: `launchCameraAsync`
a `launchImageLibraryAsync`. `expo-camera` by dal jen tu první a přinesl
větší nativní plochu — proto `expo-image-picker`.

**Galerie není jen pohodlí, je to záchranná cesta.** Kdo pod tlakem sáhne
po běžném fotoaparátu telefonu místo po appce, má pak snímky v galerii
a přiřadí je ke značkám z appky, dokud si to pamatuje. Má to ale jeden
důsledek, který musí být vidět: **snímek z galerie mohl vzniknout kdykoliv
a kdekoliv**, zatímco server ho uloží jako doklad k poloze. U vybraného
snímku se proto přebírá čas a poloha z EXIF, a nejsou-li tam, appka u něj
nesmí tvrdit, že byl pořízený u té značky.

**Nativní závislost není ta drahá část.** Pořadí prací je vynucené tímhle:

1. **Appka zahazuje čísla, bez kterých fotka nemá kam jít.** Snímek se
   nahrává na `POST …/boje/{boje}/fotky`, a to `{boje}` je číslo, které
   přiděluje server. V odpovědi přitom je — `PrvekDto` nese `KonecBojeDto`
   s `Id` pro oba konce (`PrvkySprava.cs:12–13`, `:22`). Jenže
   `postavPrvek` je v odesílání typovaný jako `Promise<unknown | null>`
   (`odesilani.ts:44`) a `hotovo(id)` řádek prostě smaže
   (`fronta.ts:168–170`). **Tohle je jediný krok, který nestojí otisk
   vůbec, a bez něj nejde postavit nic dalšího.**
2. **Fronta umí jen JSON, ne soubory.** `PrvekKPostaveni` je prostý objekt
   (`fronta.ts:28–46`). Fotka potřebuje vlastní frontu: cesta k souboru,
   ke kterému prvku patří (místním klíčem, server o něm ještě neví) a stav.
   A soubor se musí **překopírovat z dočasné složky fotoaparátu** do
   trvalé; na vodě není signál celé hodiny a dočasné soubory systém maže.
3. **Teprve pak fotoaparát.** `expo-image-picker` nebo `expo-camera` je
   nativní modul, a `runtimeVersion` má politiku `fingerprint`
   (`app/app.json:103–105`) — otisk se změní, kanál OTA se rozdělí a každý
   telefon chce ruční instalaci.

**Kdy ten otisk zaplatit: teď.** Appku má dnes jeden telefon, Milošovi se
nic neposílalo — ruční přeinstalace se tedy týká jednoho člověka, zatímco
za měsíc už jich může být pět. Navíc podpis osobního týmu na iPhonu vyprší
**23. 11.**, takže nový build a instalace kabelem stejně musí proběhnout
do šesti dnů. Nativní modul ať jede s ním; pak je otisk zaplacený jednou
a kvůli něčemu, co se muselo udělat tak jako tak.

**Co appka o fotce ví a říká.** Dvě fotky na značku, zblízka a s břehem —
tak, jak to žádá server (`FotkySprava.cs:160–162`). Řádek u prvku ukáže,
kolik jich chybí, a *nahlásit hotovo* na chybějící upozorní; odjet od vody
bez fotek jde, ale ne omylem.

### 8. Seznam kreslí kolečka, přestože appka zná znak

*Doplněno 17. 11. 2026 na Filipův postřeh. Konzilium neposuzovalo.*

**Nález.** Model drží barvu a tvar zvlášť a zná i znaky z vyhlášky:
`DruhZnaceni` má `DrahaPrava` (červený válec), `DrahaLeva` (zelený kužel),
`DrahaSport`, `DrahaZakaz`, `Plavidlo` a `ObjektNaBrehu`
(`Boje.cs:261–287`), `TvarBoje` vedle válce a kužele i plovatku
(`Boje.cs:213`). Web z toho **dělá obrázek na jediném místě** —
`web/app/znak-boje.tsx`, 353 řádků, s poznámkou, že *„znaky z vyhlášky
jsou kombinace, ne kategorie"*. Appka tvar při pípnutí **zapisuje**
(`stavba.tsx:210`), ale pak kreslí barevné kolečko; makety tohohle návrhu
taky.

**Proč to vadí.** Značka na vodě vypadá nějak a stavitel se na ni dívá.
Kolečko říká jen barvu, takže červený válec plavební dráhy vypadá
v seznamu stejně jako červená plovatka — a to je přesně ten rozdíl, podle
kterého se na vodě pozná, co ta věc je.

**Návrh.** Přenést `znak-boje.tsx` do appky, ne kreslit podruhé. Je to
čistá funkce z barvy, tvaru a značení na SVG; druhá implementace by se
rozešla při první změně. Kolečko zůstane tam, kde tvar není vyplněný —
nepovinný je schválně (`Boje.cs:210–211`).

**Start a cíl** rozlišovalo písmeno `S` a `C`, protože obojí je čára mezi
dvěma konci a tvar sám je nerozliší (`ikona-prvku.tsx:58–63`). V maketách
to od 17. 11. 2026 dělá **vlaječka na konci, kde stojí komise**:
trojúhelníková u startu, obdélníková modrá u cíle. Živý web má pořád
písmeno.

### 9. Stavitel nevidí, co už na trati stojí

*Doplněno 17. 11. 2026 na Filipův postřeh. Konzilium neposuzovalo.*

**Nález.** Appka si prvky trati načítá (`nactiPrvkySpravy`,
`stavba.tsx:126–128`), ale **jen ze sítě a nikam je neukládá**. Při výpadku
`nactiZaSebe` vyhodí chybu (`api.ts:86`) a u regaty bez jediné bóje vrátí
`null` na 404 (`:85`). Fronta vlastních pípnutí je v SQLite, stávající
trať nikde.

**Proč to vadí.** Scénář, který to vyvolal: někdo na břehu zapíše z webu
prvek, ke kterému se nejezdí — dráty vysokého napětí nad vodou. Model pro
to má kategorii (`ObjektNaBrehu` je popsaná jako *„molo, dráty nad vodou,
značka na skále"*, `Boje.cs:286`). Stavitel na vodě o něm ale neví, takže
ho buď postaví podruhé, nebo ho při hlášení hotovo bude postrádat.

**Návrh.** Dvojí, a to první je podmínka toho druhého:

1. **Uložit načtenou trať vedle fronty** do `stavba.db` a kreslit ji
   i bez signálu, s poctivým *„naposled načteno v 9:12"*. Bez toho je
   jakákoliv mapa prázdná přesně tam, kde je potřeba.
2. **Schéma, ne mapa s dlaždicemi.** Webová mapka jede na dlaždicích
   z OpenStreetMap (`mapka-trati.tsx`, `lib/mapa.ts`), což je na vodě
   šedá plocha. Co funguje, je kresba ze souřadnic: co stojí, kde jsem
   já, směr a vzdálenost — tedy táž věc, jakou návrh v nálezu 4 chce pro
   druhý konec brány, jen pro celou trať.
3. **Břeh k tomu už máme.** `web/lib/orlik-obrys.ts` je obrys zátopy
   z OpenStreetMap, 1 365 bodů zjednodušených na 20 m, 27 kB — statický
   soubor, který vyrábí `tools/obrys-nadrze.py` a commituje se. Appka ho
   může přibalit a kreslit břeh **bez jediného dotazu na síť**. Maketa
   `navrh/Mapa.dc.html` ho od 20. 11. 2026 kreslí doopravdy, ne jako
   vymyšlený tvar.

### 10. Prvek, ke kterému se nejede, nejde pípnout

*Doplněno 17. 11. 2026 na Filipův postřeh. Konzilium neposuzovalo.*

**Nález.** Obrazovka vynechává výběr bodu z mapy vědomě: *„ten vznikl pro
člověka u počítače — na vodě telefon měří"* (`stavba.tsx:74–75`). To platí
pro bójku, kterou tam stavitel pokládá. Neplatí pro dráty nad vodou, molo
ani kanálovou bóji, která tam stojí celý rok.

**Proč to nic nekazí.** Model rozlišuje, odkud poloha je: `ZdrojPolohy`
má `Telefon`, `Mapa` (*„odečteno z mapy"*) a `Qr` (`Boje.cs:22–32`), a
u `Telefon` výslovně stojí *„jediný zdroj, který měří"*. Bod odečtený
z mapy se tedy od změřeného pozná v datech, ne jen v hlavě toho, kdo ho
zadal.

**Návrh.** Pustit stavitele k výběru z mapy **jen s `Mapa` jako zdrojem** a
bez údaje o přesnosti, a na obrazovce to říct slovem — „odečteno z mapy",
ne „±4 m". Jakmile by se odečtený bod tvářil jako měření, přestane být
doklad o poloze dokladem.

### 11. Ze zaseknutého prvku vede ven jedině zahození

*Doplněno 17. 11. 2026 na Filipův postřeh. Část už řešilo konzilium.*

**Nález.** Maketa `Fronta.dc.html` nabízí u odmítnutého prvku jedinou akci,
*Zahodit prvek 5*, a to plnou červenou plochou. Konzilium přesně tenhle
tvar zrušilo: *Zkusit znovu* stojí nad zahozením, zahození je nejslabší
tvar na kartě, nese potvrzení a nechá doklad i se souřadnicemi. **Maketa
je tedy proti závěru** a je to vada makety, ne nové rozhodnutí.

**Druhá polovina je ale věcná a konzilium ji neřešilo:** věta, kterou
server vrací — *„Tahle trať je už přijatá"* — popisuje stav, který appka
odstranit nemůže. Z `Prijato` vede ven `/vraceni` (rozhodčí vrátí trať
stavitelům) a `/prestavba` (`TratEndpoints.cs:85`, `:210`, stavy
v `Trat.cs:14–34`). **Žádost o odemčení neexistuje žádná** — stavitel na
vodě může leda zavolat.

**Návrh.** Nejlevnější odpověď není žádost, ale **nechat prvek počkat**:
zámek je vada okolností, prvek se nezahazuje a jakmile trať někdo odemkne,
fronta se rozjede sama. Karta ať to řekne („počká, dokud se trať
neodemkne") a zahození ať zůstane tím, co udělá člověk, když chce. Teprve
kdyby se ukázalo, že se na odemčení čeká dlouho, má smysl příznak *stavitel
žádá o odemčení* tam, kde se rozhodčí dívá — ne nová cesta zpráv.

### 12. Barvu bójky nejde zapsat a z šesti tvarů se použije jeden

*Doplněno 20. 11. 2026 na Filipův postřeh. Konzilium neposuzovalo.*

**Nález.** Předvolby značení mají barvu **napevno**: `NaseBoje` je
`barva: "Zluta"` (`stavba-prvku.ts:511`) a appka pošle, co v předvolbě
stojí (`stavba.tsx:208`). Oranžovou ani růžovou bójku tedy není jak
zaznamenat, přestože `BarvaBoje` jich zná sedm a `Boje.Barva` je
nepovinná. Tvar je na tom hůř: `NaseBoje` má vyjmenovaných šest
(`SferickyVrsek`, `Valcova`, `Kuzelova`, `Kulova`, `Plovatka`,
`Plamenak`), ale odesílá se `tvary[0]` — vždycky ten první.

**Proč to vadí.** Barva je to, podle čeho se značka na vodě pozná na
dálku; je to vlastnost předmětu, ne rozhraní, a proto ji model drží
u bóje. Zapsat žlutou tam, kde plave oranžová, znamená uložit nepravdu
do dokladu o poloze — a zároveň je to důvod, proč nález 8 (kreslit znak
místo kolečka) nemá dnes z čeho kreslit.

**Návrh.** Po popisu prvku krok *Jaká bójka to je*: sedm barev
a tvary té předvolby, s předvolenou žlutou a nafukovacím válcem. Dá se
přeskočit — pak platí předvolba, tedy dnešní chování.

**Co z toho je nové pravidlo:** vybrané **drží pro další značku**. Kdo
dneska staví oranžové, mění to jednou za ráno, ne u každé bóje; předvolba
je výchozí stav, ne věta o tom, co se právě pokládá.

### 13. Pořadí na trati nejde přerovnat

*Doplněno 20. 11. 2026 na Filipův postřeh. Konzilium neposuzovalo.*

**Nález.** Pořadí prvku určuje server podle toho, v jakém pořadí dorazí
požadavky — při zakládání se `Poradi` ze vstupu **ignoruje** schválně,
protože klient počítá z toho, co měl načtené, a to bývá o krok pozadu
(`PrvkySprava.cs`, komentář u `PrvekVstup.Poradi`). Při **úpravě** už
`Poradi` platí, takže přerovnat trať server umí; appka pro to jen nemá
obrazovku.

**Proč to vadí.** Trať se staví v pořadí, v jakém se k značkám dojede,
a to nemusí být pořadí na trati — u brány se popojíždí, odskok se staví
hned za otočnou, a když se jedna značka pípne dvakrát, je rázem na
špatném místě. Jediná dnešní cesta je zahodit a pípnout znovu, což zahodí
i měření.

**Návrh.** Obrazovka *Pořadí na trati* s osou jako v mapových
aplikacích: kolečko na každý prvek, tečkovaná spojnice mezi nimi,
špendlík na cíl. Přetažení za úchyt mění pořadí, ukládá se samo a bez
signálu počká ve frontě. Přijatou trať přetahovat nejde — nejdřív se
odemkne na přestavbu.

**Co to stojí.** Přetahování potřebuje `react-native-gesture-handler`
a `reanimated`; v `app/package.json` není ani jedno, takže je to **další
nativní závislost a další posunutý otisk**. Jede-li to v témž buildu jako
fotoaparát (nález 7), zaplatí se jednou. Samo o sobě to nestojí za ruční
přeinstalaci u všech.

**Smazat prvek k tomu patří** (Filip, 20. 11. 2026), ale ne na seznam
pořadí — tam se jen přetahuje. Mazání sedí v detailu prvku, tedy o patro
níž, což je samo o sobě pojistka: destruktivní terč nemá být tam, kde
palec odpočívá. Server to umí (`DELETE …/prvky/{prvek}`) a **neztrácí
tím měření**: `SmazAsync` odstraní jen prvek, bóje zůstávají — *„prvek se
maže doopravdy, na rozdíl od bóje: není to měření, je to rozhodnutí"*
(`PrvkySprava.cs:434`). Potvrzovací věta to musí říct, jinak si člověk
myslí, že maže polohu.

**Filip chtěl modální dialog; kreslím dvě fáze, a tady je proč.**
Konzilium dialog zamítlo v kole 2 argumentem, který na vodě platí
doslova: v rukavicích se objeví pod klesajícím palcem a odklepne se
týmž gestem, kterým člověk mačkal to pod ním. Rozhodnutí 6 místo něj
žádá dvě klepnutí na **nepohnutém** terči s krátkou prodlevou. Maketa
`navrh/Smazani.dc.html` ukazuje obě fáze. Je to Filipovo rozhodnutí, ne
moje — tohle je jen zapsaný důvod, proč jsem ho neudělal rovnou.

**Mazání nepatří pomocníkovi.** Za jeho příznakem je jen pípnutí a čtení
(podmínka konzilia, bod 11); mazání zůstává organizátorovi a rozhodčímu,
takže se mu ta akce vůbec neukáže.

**Výhrada, kterou si zapisuju sám:** přetažení je v rukavicích na
houpající se lodi nejtěžší gesto, jaké obrazovka může mít. Dvě tlačítka
*výš / níž* na řádku zvládnou totéž bez jediné nové závislosti a bez
gesta. Kreslím, co Filip chtěl; kdyby se to na vodě neosvědčilo, tohle je
cesta zpátky.

### 14. Přesunout značku jde jen z webu, a přitom je to hlavní práce na vodě

*Doplněno 20. 11. 2026 na Filipův popis praxe. Konzilium neposuzovalo.*

**Nález.** Obrazovka stavitele přenastavení ani sebrání značky neumí
a je to zapsané jako záměr: *„přenastavení či sebrání značky (cesta pro
zvláštní případ, ta zůstává na webu)"* (`stavba.tsx:74–76`). Server to
přitom umí celé — `POST …/boje/{boje}/sebrana`, a přenastavení jako nový
záznam, který ten starý označí za nahrazený (`Boje.NahrazenaV`,
`Boje.Platna`).

**Proč to vadí.** Ten „zvláštní případ" je podle Filipa **běžný průběh
závodního dne**: plán se udělá předem z kanceláře, na vodě se bóje
posouvají podle větru. Stavitel tedy na lodi potřebuje přesně to jediné,
co obrazovka nemá — a sáhnout si pro to na web uprostřed přehrady nejde.

**Návrh.** U prvku v seznamu dvě akce vedle popisu: *Přesunout sem*
(pípne novou polohu a starou označí za nahrazenou) a *Sebrat z vody*.
Obojí je jedno klepnutí u značky, u které loď zrovna stojí, a obojí
projde frontou jako pípnutí. Žádná nová nativní závislost.

**Pozor na jednu věc:** přesun **není oprava překlepu**. Starý záznam
zůstává platný pro dobu, kdy platil, protože se podle něj posuzuje trasa
lodi. Obrazovka to musí říct slovem, jinak si stavitel bude myslet, že
opravuje chybu, a bude přesouvat i tam, kde chtěl jen přepsat špatně
zadanou polohu — na to je zahození a nové pípnutí.

### 15. Plán z kanceláře a jeho potvrzení na vodě

*Doplněno 20. 11. 2026 na Filipův popis praxe. Konzilium neposuzovalo.*

**Nález.** Model rozdíl mezi plánem a skutečností **už umí**, jen ho nikdo
nepoužívá k tomu, k čemu se hodí: `ZdrojPolohy.Mapa` je *„odečteno
z mapy"*, `ZdrojPolohy.Telefon` *„jediný zdroj, který měří"*
(`Boje.cs:22–32`). Trať naklikaná z kanceláře je tedy trať samých
odečtených bodů, a den regaty je její procházení a potvrzování měřením.
Appka o tom neví nic: načtené prvky kreslí stejně, ať jsou změřené, nebo
odečtené.

**Proč to vadí.** Stavitel, který vyrazí k plánu, potřebuje vědět, co
z trati už stojí doopravdy a co je zatím jen čára na mapě. Bez toho buď
pípá znovu to, co je hotové, nebo nechá na vodě bóji, kterou nikdo
nezměřil — a to druhé se pozná až po závodě.

**Návrh.** U každého prvku stav *změřeno* / *z plánu*, pruh s počtem
hotových, a hlavní akce **Jsem u ní** místo *Pípni značku*, když se
jede podle plánu. Pípnutí plán nepřepíše: založí nový záznam a ten starý
označí za nahrazený (nález 14, `Boje.NahrazenaV`).

**Co z toho nesmí vzniknout.** Plán je nepovinný. Když žádný není,
obrazovka vypadá přesně jako dnes a o plánu nepadne ani slovo — žádné
„trať nemá plán", žádná výzva ho udělat.

**Rozhodnuto (Filip, 20. 11. 2026): plán se zveřejnit dá, a bude na to
druhý příznak.** Dnes to nejde proto, že jsou dvě různé otázky slepené
do jedné: *přijatá* je o autoritě — tohle je trať, která platí — kdežto
*veřejná* je o tom, kdo ji smí vidět. Veřejné čtení se dnes ptá na stav
(`StavTrati.Prijato`), takže plán nemá jak ven.

**Tvar:** `Trat.ZverejnenaV` jako nepovinný časový údaj, stejně jako
`PrijatoV` o pár řádků výš, a vedle něj `ZverejnilId`. Ne `bool`:
repozitář tenhle druh příznaku zapisuje časem (`PrijatoV`, `ZkracenoV`,
`SebranaV`, `PodanoV`) a čas tu má smysl — *od kdy* je plán venku je
součást dokladu. Přidání nepovinného sloupce je aditivní změna, tedy
jedno nasazení bez odstávky.

**Dvě podmínky, bez kterých to nedělej.** Jsou tam proto, že pravidlo
„nepřijatá trať se nevydává vůbec" nevzniklo z opatrnosti, ale aby
posádka nenavigovala podle něčeho, co neplatí:

1. **Veřejná odpověď musí vždycky říct, co to je** — plán, nebo přijatá
   trať. Ne barvou v klientovi, ale údajem v datech, aby to nešlo
   vykreslit jako hotovou věc ani omylem. Appka i web jsou dva klienti
   a každý by si to jinak domyslel.
2. **Výchozí stav je neveřejná a zveřejnění je úkon člověka**, ne
   vedlejší účinek uložení. Totéž, co dnes platí o přijetí.

Co tím **nevzniká**: další stav v `StavTrati`. Stavy popisují, kde je
trať v řízení, a přidat mezi ně viditelnost by znamenalo násobit je —
„rozestavěná veřejná", „hotová neveřejná" a tak dál. Dva nezávislé údaje
jsou dva sloupce, ne osm stavů.

## Jedna obrazovka, ne čtyři

*Revize na Filipovu otázku, 20. 11. 2026: neukazují Stavba, Pořadí
a Přehled totéž, jen v jiném režimu?* **Ukazují.** Porovnáno řádek po
řádku:

| | Stavba | Plán | Pořadí | Hotovo |
|---|---|---|---|---|
| seznam prvků v pořadí | ano | ano | ano | ano |
| stav u prvku | odesláno | změřeno / z plánu | — | odesláno / chybí fotka / čeká |
| pruh nahoře | poloha | plán z kanceláře | — | co brání hlášení |
| hlavní akce | Pípni | Jsem u ní | — | Nahlásit hotovo |

Seznam je ve všech čtyřech **tentýž**, a i ty stavy jsou jen různé
pohledy na jeden prvek: kde se vzala jeho poloha, jestli už došel na
server, jestli u něj je fotka. Že jsem to nakreslil čtyřikrát, je vidět
i na tom, že *Hotovo* má číslovaný seznam a zbytek osu — tutéž věc jsem
dvakrát nakreslil jinak.

**Takže jedna obrazovka.** Pruh nahoře se mění podle situace, u prvku
stojí to, co je na něm zrovna podstatné, a přerovnání je **režim**, do
kterého se vejde schválně — jako v mapových aplikacích. Mód je tu
správně: přetažení nesmí vystřelit při rolování.

**Jedna věc se ale slepit nesmí: hlavní akce.** Rozhodnutí 1 konzilia
zní, že *pípnutí je první a trvale dostupná akce*, a obrazovka, jejíž
velké tlačítko jednou pípá a podruhé hlásí hotovo, to pravidlo ruší —
zrovna ve chvíli, kdy loď stojí u značky a potřebuje pípnout. Proto:

- **Pípnutí je hlavní akce vždycky.** *Jsem u ní* není jiná akce, je to
  jen jeho jméno ve chvíli, kdy je nejbližší značka z plánu na dosah;
  dělá totéž — změří polohu tady.
- **Nahlásit hotovo je podřízená akce.** Je to jednou za regatu, kdežto
  pípne se dvacetkrát. Patří nad hlavní tlačítko jako řádek, ne na jeho
  místo.
- **Přerovnat** je vstup do režimu, taky podřízený.

Co z toho plyne pro makety: `Main.dc.html` je **ta obrazovka**,
`Plan.dc.html` a `Hotovo.dc.html` jsou její **stavy** a
`Poradi.dc.html` je její **režim**. Zůstávají nakreslené zvlášť, protože
každý ukazuje jinou situaci, ale stavět se bude jedna.

## Co se nemění, a proč

1. **Prvek se pořád zapisuje jedním požadavkem.** `POST …/trat/prvky/postav`
   a jeho atomicita jsou hotové a správné; návrh mění pořadí otázek
   v rozhraní, ne tvar zápisu. **API se nedotkne.**
2. **Odmítnutý prvek dál zastaví frontu.** Je to rozhodnutí o pořadí trati,
   ne nedodělek.
3. **Klepací cíle zůstávají nad 44 pt** (`tools/kontrola-dotyku.py`).
4. **Žádná nová nativní závislost.** Otisk se nesmí pohnout, jinak si všichni
   musí ručně přeinstalovat APK. To vylučuje fotoaparát i mapu.
5. **Server zůstává autoritou na pravidla.** Klient je jen předsíň.

## Na co se ptám konzilia

1. **Je sloučení typu a předpisu do jednoho seznamu správné?** Sedm položek
   místo dvou kroků — a za cenu zásahu do pravidel sdílených s webem.
2. **Je „pípnutá, ale nepopsaná značka" bezpečný stav?** Dovolí rychle
   pípnout dva konce, ale taky se na ni dá zapomenout.
3. **Pomůže vzdálenost od prvního bodu, nebo je to další číslo na čtení?**
4. **V jakém pořadí mají volby stát?** Podle četnosti na Orlíku, nebo podle
   pořadí na trati?
5. **Co z tohohle je proti tomu, jak se trať staví doopravdy?**

## Makety

**Překresleno 20. 11. 2026 podle `ZAVER.md`.** Co v maketách bylo proti
závěru: odložený popis (zrušen 3 : 1), sedmiřádkový seznam (platí osm),
živé číslo přesnosti v proužku polohy (patří k akci, ne do proužku)
a karta zádrhelu s nevratnou akcí v popředí (platí *Zkusit znovu* nahoře,
zahození podřízené a s potvrzením). Přibyla maketa výběru zastávky —
jediná, která odpovídá tomu, co v appce **už běží**.

**Nakreslené je od 20. 11. 2026 celé**, včetně nálezů, které konzilium
nevidělo. Postavené z toho pořád není nic kromě obrazovky výběru zastávky
— makety jsou k tomu, aby se dalo rozhodnout dřív, než se začne stavět.

| Soubor | Co ukazuje |
|---|---|
| `navrh/Vyber.dc.html` | kde stavíš: vchod z nabídky, jen regaty, kam server pustí |
| `navrh/Main.dc.html` | klidový stav: osa s tím, co stojí, a trvalé *Pípni* |
| `navrh/Popis.dc.html` | po pípnutí: jeden seznam konkrétních prvků |
| `navrh/Dvoubod.dc.html` | rozestavěná brána: vzdálenost od prvního bodu |
| `navrh/Fronta.dc.html` | bez signálu a zaseknutý prvek |
| `navrh/Varianta.dc.html` | doptání po volbě brány — tři předpisy, neodkládá se |
| `navrh/Hotovo.dc.html` | hlášení rozhodčímu: co ještě neodešlo a kde chybí fotka |
| `navrh/Zamek.dc.html` | přijatá trať, jen ke čtení |
| `navrh/Fotka.dc.html` | doklad fotkou u značky: zblízka a s břehem, foťák i galerie |
| `navrh/Mapa.dc.html` | schéma trati ze souřadnic a bod odečtený z mapy |
| `navrh/Znaky.dc.html` | slovník tvarů a barev, jak to vypadá na hladině |
| `navrh/Barva.dc.html` | volba barvy a tvaru bójky, předvolená žlutá nafukovací |
| `navrh/Poradi.dc.html` | pořadí na trati v ose, přerovnání přetažením |
| `navrh/Plan.dc.html` | jízda podle plánu z kanceláře a jeho potvrzování |
| `navrh/Smazani.dc.html` | smazání prvku ve dvou fázích, bez dialogu |

Barvy a rozměry jsou **skutečné tokeny appky**
(`app/src/constants/theme.ts`, světlé téma), ne vymyšlená paleta. Makety
jsou statické HTML: čti je jako zdroj, ne jako aplikaci. Co je v nich
nedbalé — zástupná jména lodí, čísla rozjížděk — je vada makety, ne návrhu.

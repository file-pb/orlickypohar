# Orlický pohár — plán

Pilotní projekt platformy. Seriál závodů plachetnic na Orlíku: web, veřejné
výsledky, administrace a mobilní přístup.

**Jméno projektu:** `orlickypohar` → `orlickypohar.klihovka.cz`
(bez pomlčky a podtržítka — jméno slouží zároveň jako databáze, role i subdoména).

**Stav:** repozitář založen 6. 9. 2026, plán doplněn 7. 9. 2026 o uspořádání
repozitáře, pojmenování, import dat a rozpis fáze 1. Doménový model usazený,
chybí bodovací pravidla od rozhodčího (viz *Zbývá doladit*).

---

## Proč zrovna tenhle projekt jako první

Není to nejmenší možný projekt, ale je to **dobrý test platformy**, protože
poprvé narazí na věci, které telemetrie neřeší: skuteční uživatelé, role,
schvalovací proces a veřejný obsah. Tedy přesně to, kde se pozná, jestli je
platforma použitelná, nebo jen postavená.

## Doménový model

Upřesněno podle Filipových odpovědí 6. 9. 2026.

```
Serie (Orlický pohár 2026)
 ├── Kategorie          Race / Nad7m / Pod7m — konfigurovatelné
 ├── Prihlaska          loď + kategorie na CELÝ ROČNÍK  ← nositel bodů
 └── Zavod              jedno z ~12 zastavení, vlastní typ a bodování
      ├── Ucast         která loď na tenhle závod přijela, s kým za kormidlem
      └── Rozjizdka
           └── Vysledek  účast × rozjížďka
```

**Loď jede celý rok v jedné kategorii**, takže kategorie patří k celoroční
přihlášce, ne k jednotlivému závodu. Body v seriálu sbírá **loď**, ve
výsledcích se vedle ní uvádí jméno majitele.

Účast na jednotlivém závodě je pořád potřeba — loď nejede všech dvanáct
zastavení a kormidelník se mezi závody mění. Ale kategorii už nenese.

### Entity

| Entita | K čemu | Poznámka |
|---|---|---|
| `Serie` | ročník poháru | |
| `Kategorie` | Race / Nad7m / Pod7m | patří sérii, dá se přidat i přejmenovat |
| `Lod` | loď | jméno, číslo plachty, typ, **majitel** (odkaz na osobu) |
| `Osoba` | závodník, majitel, rozhodčí | |
| `Prihlaska` | loď do ročníku, v jedné kategorii | **nositel bodů v seriálu** |
| `Zavod` | jedno zastavení | pořadatel, datum, typ, pravidla bodování |
| `Ucast` | loď na konkrétním závodě | kormidelník a posádka pro ten závod |
| `Rozjizdka` | jedna rozjížďka závodu | číslo, čas startu, stav |
| `Vysledek` | účast v rozjížďce | pořadí, časy, kód, body |
| `Clanek` | blog série i jednotlivých závodů | |
| `Zarizeni` | push token, platforma, odběry | veřejný odběr bez přihlášení |
| `Osoba.UserId` | volitelné napojení na účet | většina osob účet mít nebude |
| `Trasa` | metadata trasy lodi v závodě | body samotné leží v R2, ne v databázi |

## Bodování ve dvou úrovních

Závody nejsou stejné — jsou vytrvalostní, okruhové, na 4,5 hodiny, každý
má své jméno a svá pravidla. U okruhových se škrtá jedna rozjížďka,
u Izolepy se do poháru počítá jen jedna. **Na tohle nepotřebujeme engine.**

Jsou to dvě oddělené otázky a každá má odpověď v datech, ne v kódu:

### 1. Rozjížďky → výsledek závodu

| Pole na `Zavod` | Co znamená | Příklad |
|---|---|---|
| `PocetSkrtu` | kolik nejhorších rozjížděk se škrtá | okruhový: `1`, vytrvalostní: `0` |
| `Vyhodnoceni` | `CelePole` nebo `PoKategoriich` | 24 h: `CelePole` |

### 2. Výsledek závodu → body do seriálu

| Pole na `Zavod` | Co znamená | Příklad |
|---|---|---|
| `PocetRozjizdekDoSerie` | kolik rozjížděk závodu se počítá do poháru; prázdné = všechny | Izolepa: `1` |
| `KoeficientDoSerie` | váha závodu v seriálu | běžně `1.0` |

**Do seriálu se boduje vždycky po kategoriích**, i když se závod vyhodnocoval
jako celé pole. U 24hodinovky se tedy zveřejní jedno pořadí přes všechny lodě,
ale do poháru se z něj vytáhne pořadí uvnitř kategorie: když v `Nad7m` skončily
lodě celkově třetí, sedmá a devátá, do seriálu jdou jako první, druhá a třetí.

Proto má seriál **tři průběžná pořadí, ne jedno** — jedno na kategorii.

### Co je pravda a co se dopočítává

V `Vysledek` se ukládá jen to, co se skutečně stalo: **pořadí v cíli, časy
a kód**. Body se **počítají**, neukládají jako pravda.

Je to schválně. Pravidla se mění mezi ročníky, škrty se doladí až podle
loňských dat a přepočet celého seriálu musí jít kdykoliv spustit znovu.
Kdyby byly body uložené jako fakt, každá změna pravidla by znamenala
migraci dat místo přepočtu.

Tři čísla na závodě pokrývají všechny tři příklady, které jsi uvedl. Kdyby
někdy přišel závod se **skutečně jiným vzorcem**, přibude jedna funkce —
až tehdy, ne teď. Tohle je přesně to místo, kde se lidem rodí pravidlové
enginy, a je to špatně: engine se píše dřív, než je známo, co má počítat.

### Nízkobodový systém

1. místo = 1 bod. Nedokončení = počet přihlášených + 1.

Kódy, bez kterých se výsledky nedají zadat: `DNF` (nedokončil), `DNS`
(nestartoval), `DNC` (nezúčastnil se), `OCS` (předčasný start), `DSQ`
(diskvalifikace), `RET` (odstoupil), `RDG` (náprava).

Tohle je jediné místo projektu, kde na správnosti opravdu záleží — špatně
spočítané pořadí je viditelná ostuda. Píše se to jako **čisté funkce
s testy**, ne rozeseté po endpointech.

## Handicap

Dnes se jede bez přepočtu (line honours) ve třech kategoriích. Yardstick
nebo ORC můžou přijít.

**Neděláme na to engine.** Do přihlášky přijde `HandicapKoeficient`, do
série údaj, jaký systém se používá, a přepočet je jedna funkce na systém.
Druhá vznikne, až druhý systém skutečně nastane — ne dřív.

## Workflow výsledků

Ze zadání: výsledek se dá **navrhnout, ověřit, schválit, potvrdit, vrátit
k revizi, publikovat nebo eliminovat**. Stavy tedy nejsou volba, jsou zadané.

| Stav | Kdo do něj dostane | Co znamená |
|---|---|---|
| `Navrzeno` | editor | zapsáno, nikdo to ještě nekontroloval |
| `Overeno` | rozhodčí | čísla sedí s papírem z vody |
| `Schvaleno` | rozhodčí | protesty vyřízené, pořadí platí |
| `Potvrzeno` | správce | konečné, dál se needituje |
| `Publikovano` | správce | vidí veřejnost |
| `KRevizi` | rozhodčí i správce | vráceno zpátky s důvodem |
| `Eliminovano` | správce | rozjížďka se nepočítá (zrušená, neplatná) |

Dvě rozhodnutí, která je potřeba udělat dřív, než se to začne psát:

**Stav se vede na rozjížďce, ne na jednotlivém výsledku.** Rozhodčí schvaluje
sadu výsledků jako celek — pořadí dává smysl jen dohromady. Stav na řádku by
znamenal, že rozjížďka může být zpola schválená, což neodpovídá ničemu ve
skutečnosti.

**Publikováno je vlastní příznak, ne poslední stav v řadě.** Potvrzený výsledek
smí zůstat neveřejný a publikovaný se smí vrátit k revizi, aniž by se
publikace ztratila. Kdyby to byl jeden sloupec, jedno by přepisovalo druhé.

Přechody hlídá jedna funkce s testy, ne rozeseté podmínky po endpointech.
Správce smí přeskočit dopředu — to už v plánu bylo a platí dál.

## Role a oprávnění

Práva jsou **rozsahová**: platí buď pro celou sérii, nebo pro jeden závod.
Pořadatel zastávky spravuje svůj závod, ne cizí.

| Role | Smí |
|---|---|
| Čtenář | vidí publikované |
| Editor | zadává přihlášky a výsledky, navrhuje |
| Rozhodčí | ověřuje a schvaluje výsledky |
| Správce | vše ve svém rozsahu, včetně publikace |

`Rozhodčí` není stupeň oprávnění, ale **funkce v procesu** — proto je to
samostatná role, ne úroveň mezi editorem a správcem.

## Web a mobil

| Část | Čím | Proč |
|---|---|---|
| API | .NET 10, vertikální řezy | standard platformy, kontrakt `http-service` |
| Web | React (Next.js) — veřejné stránky serverem, administrace v prohlížeči | blog a výsledky potřebují SEO, administrace ne |
| Mobil | **Expo / React Native, nativní na iOS i Android** | Filipovo rozhodnutí, viz níž |
| Fotky | R2 přes S3 API | pravidlo platformy — na disku nesmí být nic autoritativního |

Klient API je generovaný z OpenAPI v TypeScriptu a **sdílí ho web i appka**.
To je platformové rozhodnutí, ne volba projektu.

### Fotky — co na nich má být

Filipovo doporučení, ne pravidlo. Když se vybírá fotka na web, hledá se jedno
ze tří:

1. **Detail lodi** — takový, kde jsou na plachetnici vidět podrobnosti.
2. **Velká skupina lodí na startu.**
3. **Lodě pod plnými plachtami v náklonu.**

Pozadí typické pro Orlík fotku vylepší, nejlepší jsou záběry se zámkem; obecná
voda bez rozpoznatelného břehu může být odkudkoliv.

**Co nebrat: drobné cílové fotky**, kde jsou lodě jen tečky na hladině. Na
webu z nich není nic vidět a stránku ničím neobohatí.

Je to volba obsahu, ne technické rozhodnutí — píše se sem proto, že fotky bude
vybírat kdokoliv, kdo zrovna staví stránku, a bez tohohle odstavce vybere
první použitelnou.

**Odkud vzít první sadu:** Filipova vlastní galerie na Rajčeti. Fotil je sám,
takže u nich otázka práv odpadá a dají se použít bez ptaní.

To ale platí **jen pro tuhle sadu**. U fotek od pořadatelů a diváků, které
přibudou později, musí být u snímku vidět autor a souhlas se zveřejněním.
Je to jedno pole u fotky; doplňovat ho zpětně ke dvěma stům snímků je práce,
kterou nikdo neudělá.

### Administrace i na mobilu

Zadání chce administraci **na webu i na mobilu**, ne jen na webu. To mění
tvar mobilní linky: appka z fáze 3 je jen čtecí a nepotřebuje přihlášení,
ale administrační appka ho potřebuje — tedy **fázi 4**.

Znamená to dvě vydání appky, ne jedno: nejdřív čtecí, později se do ní
přidá přihlášení a zadávání. Není to zdržení, je to pořadí — učit se Expo
současně s OAuth tokem na mobilu jsou dva problémy najednou.

Kdy přesně přijde mobilní administrace, se rozhodne až podle toho, jestli
pořadatelé skutečně zadávají výsledky od vody. Když se ukáže, že je zadávají
večer u počítače, je to práce navíc bez užitku — a to se pozná až z provozu.

### Proč nativní a ne PWA

Navrhoval jsem PWA a Filip to odmítl. Důvod: chce si obojí zkusit postavit,
a hračkárna je přesně od toho. Rozhodnutí zůstává jeho.

Zapisuju to i s protiargumenty, aby bylo za rok jasné, co se vědělo:

- appka je druhý klient — druhý toolchain, buildy, podepisování, verzování
- žádný ze scénářů (číst výsledky, číst blog, zadat výsledky) nativní nutně
  nepotřebuje
- účet u Applu stojí ročně víc než celý provoz platformy

Proti tomu stojí, že se to Filip chce naučit. To je legitimní důvod
a v hobby projektu dokonce ten hlavní.

### Co to stojí a kdy

Ověřeno 6. 9. 2026 v dokumentaci Expo.

| | Vývoj | Rozdat lidem |
|---|---|---|
| **Android** | zdarma | zdarma (APK), Play Store 25 $ jednorázově |
| **iOS** | zdarma přes Expo Go na vlastním iPhonu | **99 $ ročně** — bez placeného účtu nejde nainstalovat na žádný iPhone |

**EAS staví iOS v cloudu na macOS strojích Expo**, takže na pracovní Mac
se neinstaluje Xcode ani nic dalšího. To je pro tenhle projekt zásadní —
stopa na firemním stroji zůstává stejná jako dnes (viz
[PRACOVNI-STROJ.md](https://github.com/file-pb/platform/blob/main/docs/PRACOVNI-STROJ.md)).

Free tier je 15 iOS a 15 Android buildů měsíčně, výslovně určený pro
hobby projekty jednotlivců.

**Pozor na Expo Go.** Push notifikace se v něm vyzkoušet **nedají** —
potřebují development build, a ten na iOS vyžaduje placený účet u Applu
kvůli APNs klíči. Expo Go tedy pokryje vývoj obrazovek, ne upozornění.

**Pořadí, které to nejlevněji umožňuje:** obrazovky i push vyvíjet na
Androidu, kde je všechno zdarma (FCM i instalace APK). Applu zaplatit ve
chvíli, kdy má appka poprvé fungovat na iPhonu včetně upozornění.
Protože push je jádro funkce, přijde ta chvíle **dřív**, než jsem odhadoval
před doplněním o upozornění.

## Upozornění (push)

Appka má závodním lodím nosit informace — během závodu (odložený start,
změna trati, zkrácení) i v rámci poháru (přihlášky, výsledky, termíny).

Tohle je ta funkce, kvůli které nativní appka dává smysl. Web ani PWA by
to na iPhonu spolehlivě neuměly.

### Jak to bude postavené

| Vrstva | Čím |
|---|---|
| Odeslání | Expo Push Notification Service — obálka nad APNs a FCM |
| iOS transport | APNs (Apple) |
| Android transport | FCM (Firebase, zdarma) |
| Evidence příjemců | tabulka `Zarizeni` — token, platforma, odběry |

### Dvě úrovně upozornění

| Komu | Příklad | Přihlášení |
|---|---|---|
| **Veřejná** | výsledky publikovány, nový článek, termín závodu | **ne** — zařízení se přihlásí k odběru série nebo závodu |
| **Jen účastníkům** | odložený start, změna trati, informace pro lodě právě v závodě | **ano** |

Veřejná upozornění nesmějí vyžadovat účet — divák ani fanoušek nemá kvůli
termínu závodu nic zakládat.

Účastnická jsou jiný případ: musí se dát určit, **komu se posílají**. Cíl
je odvoditelný z dat — lodě, které mají `Ucast` na právě běžícím závodě —
ale k doručení je potřeba vědět, které zařízení patří které lodi. A to bez
identity nejde.

**Důsledek pro pořadí fází:** účastnická upozornění stojí na identitě
(fáze 4). Veřejná se dají udělat dřív.

### Jak se z přihlášení stane „kormidelník lodi Anička"

Tohle je vlastní návrhový problém, ne detail. Uživatel se přihlásí přes
Zitadel a tím je to celé — systém pořád neví, ke které lodi patří.

Možnosti, mezi kterými se bude vybírat:

- **Přiřadí pořadatel.** Nejjednodušší, nejbezpečnější, ale někdo to musí dělat.
- **Kód z přihlášky.** Loď dostane při registraci kód, kdo ho zadá, připojí se k lodi.
- **Nárok a potvrzení.** Uživatel si řekne o loď, majitel nebo pořadatel potvrdí.

Platí pravidlo platformy č. 5: `Osoba` má **volitelné** napojení na interní
`UserId`. Většina osob v systému žádný účet mít nebude — figurují jen jako
majitelé a členové posádek.

### Co to znamená pro přenositelnost

`FCM` obejít nejde — na Androidu je to jediná cesta, jak doručit push.
Závislost na **Expo** je naproti tomu tenká: je to odesílací služba, kterou
lze nahradit vlastním odesíláním přes APNs a FCM. Lock-in je tedy v Googlu
a Applu, ne v Expu, a ten se z podstaty platformy vzít nedá.

### Spouští Outbox

Odložená položka platformy **Outbox** má spoušť „první commit, po kterém
nesmí být ztracena externí akce". Zpráva rozhodčího lodím na vodě je přesně
ona: když se uloží „start odložen" a odeslání selže, nikdo se to nedozví.

Řeší se to ve fázi, kdy vzniká odesílání — ne dřív.

### Otevřená otázka: je appka oficiální vývěska?

Jestli má být appka **oficiální vývěskou závodu**, musí to říkat plachetní
směrnice a mění to nároky na spolehlivost i na to, co se smí publikovat.
Jestli je to **pohodlí navíc** vedle oficiálních signálů, je to volnější.

Není to technické rozhodnutí — patří rozhodčímu.

## Tracker

Appka zaznamenává trasu lodi během závodu; po dojezdu si ji každý prohlédne
a porovná. Tohle je funkce, kterou web neumí a nikdy umět nebude.

Zároveň je to **samostatný projekt velikosti zbytku appky.** Mapa je ta
snadná část, těžké je všechno kolem ní.

### Co je na tom skutečně těžké

| Věc | Proč |
|---|---|
| **GPS na pozadí** | iOS vyžaduje oprávnění „Vždy" a deklarované background modes, Android trvale běžící službu s viditelným oznámením |
| **Baterie** | 24hodinovka na telefonu je jiná disciplína než hodinový okruh. Frekvence vzorkování se bude muset dát nastavit |
| **Offline** | Na vodě signál není. Appka musí zapisovat lokálně a nahrát trasu po návratu do dosahu — není to volitelné |
| **Schvalování v obchodě** | Apple se u polohy na pozadí ptá, k čemu to je. Musí to být v popisu appky obhájené |

### Kam trasy ukládat

**Návrh: body trasy jako komprimovaný soubor v R2, metadata v Postgresu.**

Trasa se zapíše jednou a čte se celá — nikdy se nedotazuje po jednotlivých
bodech. Ukládat statisíce řádků do databáze kvůli tomu, aby se vždycky
načetly všechny najednou, je zbytečné.

Co to **neznamená**: nesaháme po PostGIS ani po telemetrické službě.

- **PostGIS** by dával smysl u prostorových dotazů („kdo byl nejblíž bóji").
  Ty zatím nejsou. Přidat ho jde kdykoliv později.
- **Telemetrická služba** je stavěná na skalární veličiny se zdrojem a metrikou.
  Poloha je dvojice, ne skalár. Ohýbat kvůli tomu její model by bylo horší
  než soubor v R2.

### Rozhodnutí, které patří rozhodčímu

**Vidí se trasy živě během závodu, nebo až po dojezdu?**

Živé pozice soupeřů jsou v závodě informace, která může být proti pravidlům.
Není to technická otázka — a technicky je post-race jednodušší, protože
nepotřebuje spojení z vody.

Návrh: **až po dojezdu**, dokud rozhodčí neřekne jinak. Vlastní trasu vidí
závodník vždycky, cizí až po zveřejnění výsledků závodu.

### Nezávislost

Tracker nestojí na bodování, workflow ani administraci. Potřebuje jen
identitu a kontext závodu. Dá se tedy postavit **vedle** hlavní linky —
nebo dřív, když bude větší chuť.

## Kde co bydlí

**Monorepo — API, web i appka v tomhle repozitáři.**

```
src/OrlickyPohar.Api/     API (.NET 10)
web/                      veřejné stránky a administrace (Next.js)
app/                      mobilní appka (Expo)
packages/api-client/      TypeScript klient generovaný z OpenAPI
```

Rozhoduje o tom generovaný klient. Ve třech repozitářích by se musel
publikovat jako balíček a každá změna kontraktu by znamenala tři pull requesty
za sebou. Při pěti hodinách týdně je to celý večer režie na změnu, která je
jinak patnáctiminutová.

Cena monorepa je, že se buildy musí filtrovat podle cest, aby změna ve `web/`
nepřestavovala API image. To je jeden `paths:` filtr ve workflow, ne
architektonický problém.

**Kdy to přestane platit:** až bude mít appka vlastní release cyklus a verze
v obchodech se rozejdou s verzemi backendu. Tehdy se `app/` odštěpí — je to
přesun složky a jedno workflow, ne přepis.

## Pojmenování v kódu

**Doménové entity česky bez diakritiky, všechno ostatní anglicky.**

Rozjížďka není *heat* ani *race*, přihláška do ročníku není *entry* ani
*registration*. Přesný anglický protějšek neexistuje, takže by ho každý
překládal jinak a pokaždé znovu — a s pořadatelem i rozhodčím se stejně mluví
česky. Termíny závodních pravidel jsou navíc kódy (`DNF`, `OCS`), které se
nepřekládají tak jako tak.

Handlery, sufixy DTO, infrastruktura a testy zůstávají anglicky jako v šabloně:
`CreateZavodHandler`, `ZavodResponse`. Hranice vede u doménového pojmu, ne
u souboru.

Nezavádí se tím výjimka z pravidla o `Source` — to platí pro telemetrii, která
tady po první fázi nezůstane.

## Jak se dovnitř dostanou loňská data

**Import ze souboru přes chráněný endpoint** — ne seed v migraci a ne čekání
na administraci.

`POST /import/serie` přijme jeden JSON s celým ročníkem (závody, lodě,
přihlášky, výsledky) a je **idempotentní**: druhé odeslání téhož souboru nic
nezduplikuje. Chrání ho token ze souboru v `/run/secrets`, protože do fáze 4
neexistuje žádná identita.

Proč ne migrace: migrace je schéma, ne obsah. Překlep v loňském výsledku by se
opravoval další migrací a jednou spuštěná migrace se nepřehraje.

Proč ne počkat na administraci: fáze 1 existuje právě proto, aby se model
prověřil o skutečná data dřív, než se na něj něco postaví. Bez dat je to fáze
bez smyslu.

Vedlejší efekt je, že tentýž endpoint zvládne i každý další ročník a poslouží
jako záchrana, kdyby administrace ve fázi 5 nestíhala.

## Zdroje a inspirace

| Co | Kde | K čemu |
|---|---|---|
| Fotky | [galerie na Rajčeti](https://rajce.net/jitkaorlik/album/fuck-cancer-regatta-empatie) | první sada, Filipovy vlastní |
| Existující obsah | Facebook | něco z historie závodů se dá najít tam |
| Inspirace obsahem | [Česká námořní rallye](https://www.ceskanamornirallye.cz/) | co má český web závodu obsahovat a v jakém jazyce |
| Inspirace formou | [Vendée Globe](https://www.vendeeglobe.org/), [Rolex Middle Sea Race](https://www.rolexmiddlesearace.com/), [Barcolana](https://www.barcolana.it/en) | moderní responzivní podání výsledků a průběhu |

**ČNR se drž obsahem, ne formou.** Je to nejbližší srovnatelný český web
a dobře ukazuje, co takový web má mít, ale jeho podání je zastaralé.
Vizuální vzor patří hledat mezi moderními responzivními weby — těch je
spousta a nemusí to být zrovna weby plachetnic.

**Vzor se hledá v celém sportu, ne u plachtařů.** Nejtěžší kus veřejného webu
je jediný: dvacet lodí krát osm rozjížděk na displeji telefonu. Weby závodů
tenhle problém většinou neřeší dobře — líp ho mají vyřešený sportovní
výsledkové servisy a finanční tabulky, kde se na tabulce vydělává.

Plyne z toho i to, že model **není o plachtění**. Seriál, zastávka, rozjížďka,
kategorie a průběžné pořadí platí pro cyklistiku i pro šipky. Stránky
libovolného seriálu z toho tedy jednou být můžou.

**Nestaví se na to teď.** Zobecňovat model podle jednoho seriálu znamená
trefit špatnou hranici — pravidlo o třetí kopii platí i tady. Až přijde druhý
seriál, ukáže, co je společné doopravdy; do té doby je to poznámka, ne úkol.

Inspirace jsou k tomu, jak se výsledky a průběh **podávají**, ne k tomu, kolik
to stojí. Vendée Globe má rozpočet, který tenhle projekt nemá, a živý tracking
celé flotily je tam samostatný produkt.

## Fáze

Počítáno na pět hodin týdně.

| # | Co | Odhad | Proč v tomhle pořadí |
|---|---|---|---|
| 0 | Kostra: repozitář, databáze, DNS, nasazení, `/health` | večer | `/novy-projekt` to udělá |
| 1 | **Veřejné čtení** — model, loňská data, stránky série a závodů | 2–3 týdny | Model se prověří o skutečná data dřív, než se na něj něco postaví |
| 2 | **Bodování** — nízkobodový systém, kódy, škrty, pořadí po kategoriích | 1–2 týdny | Čisté funkce s testy |
| 3 | **Mobilní appka, jen čtení** | 2–3 týdny | **Nepotřebuje přihlášení** — dá se postavit dřív než identita a je to nejlepší místo, kde se Expo naučit |
| 4 | **Identita a role** — Zitadel, mapování `(issuer, subject) → UserId` | 1–2 týdny | Spouští odloženou položku platformy |
| 5 | **Administrace a workflow** — zadávání, stavy, publikace | 2–3 týdny | Až když je co spravovat |
| 6 | **Blog a fotky** | 1 týden | |
| 7 | **Upozornění** — veřejná i účastnická, odesílání, Outbox | 2–3 týdny | Účastnická stojí na identitě z fáze 4 a na napojení osoby k lodi |
| 8 | **Tracker** — záznam trasy, offline, nahrání, prohlížení | 4–6 týdnů | Samostatná linka; potřebuje jen identitu a kontext závodu |
| 9 | Handicap | až bude potřeba | |

Realisticky **čtyři měsíce** do použitelné verze. Fáze 1 dá něco, co jde
ukázat pořadatelům — a to je nejrychlejší způsob, jak zjistit, co je
v modelu špatně.

Fáze 3 je schválně brzy: čtecí appka nepotřebuje přihlášení ani
administraci, takže se dá postavit proti hotovému veřejnému API. Učit se
Expo současně s řešením OAuth toků na mobilu by byly dva problémy najednou.

### Fáze 1 krok za krokem

Pořadí je zvolené tak, aby se po každém kroku dalo přestat a mít funkční
repozitář.

| # | Krok | Hotovo, když |
|---|---|---|
| 1.1 | Smazat `Features/Measurements`, jeho migraci a testy vázané na katalog | `dotnet test` projde a `/health/ready` drží |
| 1.2 | Entity a nová `InitialCreate`: `Serie`, `Kategorie`, `Osoba`, `Lod`, `Prihlaska`, `Zavod`, `Ucast`, `Rozjizdka`, `Vysledek` | migrace se pustí při startu proti prázdné databázi |
| 1.3 | `POST /import/serie` — token, idempotence, celá dávka nebo nic | druhý import téhož souboru nepřidá řádek |
| 1.4 | Loňský ročník jako soubor v `data/` a nahraný do vývojové databáze | dotazy vracejí skutečná data, ne vymyšlená |
| 1.5 | Veřejné čtecí endpointy: série, závod, rozjížďka, výsledky | OpenAPI dokument je úplný a klient se z něj vygeneruje |
| 1.6 | `web/` — stránka série a stránka závodu, renderované serverem | dá se poslat odkaz pořadateli |

**Body se ve fázi 1 nepočítají.** Výsledky se ukazují tak, jak přišly
z importu. Počítání je fáze 2 a chce vlastní testy — míchat obojí znamená
ladit model a bodovací pravidla najednou.

Zlaté payloady ze šablony smazáním `Measurements` pozbývají smysl, ale
mechanismus ne: `ContractTests` se překlopí na tvar importu a veřejného API.
Producent, ke kterému se nedostaneš, je tady mobilní appka na cizím telefonu —
a platí pro ni totéž co pro firmware na lodi.

## Co to spouští v platformě

| Odložená položka | Spoušť | Stav |
|---|---|---|
| **Zitadel** | druhá aplikace se skutečnými uživateli | **nastala** — řeší fáze 3 |
| **Outbox** | akce, která nesmí být ztracena | **nastala** — push rozhodčího lodím, řeší fáze 7 |
| Stavy životního cyklu projektů | čtvrtý projekt | tohle je druhý |

Platí pravidlo platformy č. 5: **vlastní interní `UserId`** a tabulka
`(issuer, subject) → UserId`. Nikdy `sub` z tokenu jako primární klíč.

## Zodpovězeno

| Otázka | Odpověď |
|---|---|
| Nositel bodů v seriálu | **loď**, ve výsledcích se uvádí jméno majitele |
| Kategorie | **loď jede celý rok v jedné** → kategorie patří celoroční přihlášce |
| Škrty | liší se závod od závodu → pole na `Zavod`, ne na sérii |
| Rozhodčí | rozsahová role, na závod i na sérii týmž mechanismem |
| Workflow | všechny stavy, správce smí přeskočit dopředu |
| Různá pravidla závodů | čísla a přepínač na `Zavod`, viz bodování výš |
| Vyhodnocení 24h | celé pole dohromady, ale **do seriálu po kategoriích** |

## Zbývá doladit

Nic z toho nebrání založit projekt a napsat první migraci.

1. **Škrtají se v seriálu celé závody?** Při dvanácti zastaveních je běžné
   počítat třeba osm nejlepších. Je to jedno pole na sérii — ale je to
   rozdíl mezi „přijel jsem na deset z dvanácti a nevadí to" a „kdo vynechá,
   ten nemá šanci". Rozhodneme, až budou v systému loňská data.
2. **Seznam dvanácti závodů a jejich typy** — potřeba jako data, ne jako model.
   Vytrvalostní, okruhové, 4,5 h, Izolepa a co dál.
3. **Co když loď kategorii přece jen změní** (nové plachty, přeměření).
   Návrh: správce ji smí přepsat a pořadí se přepočítá. Historie se nevede,
   dokud se neukáže, že je potřeba.

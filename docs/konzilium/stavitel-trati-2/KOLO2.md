# Kolo 2 — spory

Druhé ze čtyř kol. **Rozprava, ne uzavírání:** nehlasuje se, uzavírá se až
v kole 4. Čtěte posudky ostatních v tomhle adresáři; každý z vás má co
přijmout i co odmítnout.

Posudky byly dobré a měřené. Proto níž **není nic**, co stojí jen na
jednom oboru a nikdo mu neodporuje — to je zapsané jako platné a vracet
se k tomu nemá smysl.

## Moderátorský zápis: co je vada makety

Abyste nehlasovali o překlepech. **Vada makety**, kterou neřešte: chybějící
odkazy mezi soubory, vymyšlená jména lodí, čísla rozjížděk, zástupné časy.
**Vada návrhu** je, když maketa říká něco jiného než text — a toho je tu
hodně, protože text se od 17. 11. čtyřikrát měnil a makety se překreslovaly
po částech.

Jedna věc se tím ale nesmí omluvit: **1-ergonomie a 2-design měřili to, co
je nakreslené**, a Filip se dívá na totéž. Co se na maketě jednou přečte,
se těžko odučuje.

## Co platí a nevrací se k tomu

Shodli jste se, aniž byste o tom věděli, nebo tomu nikdo neodporoval:

1. **„Jedna obrazovka" je vyhlášená, ne nakreslená.** Doloženo třikrát
   nezávisle: `Hotovo` a `Poradi` nemají pípnutí ani odkaz (3-ux/1),
   nemají dolní pruh (1-ergonomie/E3), kreslí týž seznam pěti způsoby
   (2-design/2). **Opravuje se to překreslením, ne rozhodnutím.**
2. **`Zamek` je pátý pohled na týž seznam** a v tabulce čtyř chyběl
   (3-ux/1).
3. **Dolní pruh na `Fronta` je pod hranou obrazovky** (981 pt obsahu na
   844) a hlavní akce tím opustila své místo (1-ergonomie/E1).
4. **Detail prvku, kam nálezy 7, 12, 13 a 14 ukládají své akce, není
   nakreslený** a nevede do něj cesta (1-ergonomie/E4).
5. **`GET …/trat/prvky` nevydává `Zdroj`, `Barva` ani `Tvar`**
   (`PrvkySprava.cs:12–13`), takže tři nálezy stojí na údaji, který klient
   nemá — a návrh přitom tvrdí, že se API nedotkne (3-ux/3). Text návrhu
   je v tomhle prostě nepravdivý.
6. **Jména, která jdou ven v datech, jsou věcně špatně** (5-jachtar,
   J4–J8): linie nemá levobok a pravobok, otevírající se start pípá dva
   body, které nejsou konce linie, „vlevo/vpravo" u brány nemá k čemu se
   vztahovat, „stačí se jí dotknout" slibuje neposouditelné pravidlo
   a „otočit levobokem" je ta dvojznačnost, kterou projekt jednou odstranil
   (`PrvekTrati.cs:88–96`). Tohle je mimo dosah ostatních oborů.
7. **Barva v seznamu smí být jen barva té věci ve vodě, nikdy kategorie
   prvku** (5-jachtar/J10 a 2-design/2 nezávisle).
8. **Prázdný stav není nakreslený v žádné z patnácti maket**, a živý kód
   přitom rozlišuje dva (3-ux/6).

## Spory

### A. Elegance je ubírání, ale jachtaři chybí tři čísla

Tohle je spor celého běhu, ostatní jsou jeho podmnožiny.

**2-design** odpověděl Filipovi, že elegance tu není ozdoba navíc, ale
**ubírání**: jedna řádka, jedna osa, tři váhy, jeden význam na barvu.
**5-jachtar** naopak hlásí, že slovo *vítr* není v žádné z patnácti maket
a směr s vzdáleností jen v jedné (J1) — a že bez nich obrazovka neumí tři
věci, které stavba trati doopravdy je: dojet k plánované značce, vyhlásit
změnu úseku podle pravidla 33 a vrátit utrženou bóji podle pravidla 34.

**Hlásí se:** 2 a 5 hlavně, 1 a 3 k tomu, čeho se to dotkne.
Není to „kdo má pravdu" — oba můžete mít. Chci vědět **co konkrétně
zmizí**, aby se ta čísla vešla, a **kde přesně stojí**: v pruhu nahoře,
u prvku, nebo jen v detailu.

### B. Smí nést plná modrá plocha akci, která neměří?

- **2-design:** ne. `voda` 358 × 86 má znamenat jedině *„změř polohu tady
  a teď"*; *Postavit sem* (bod z mapy) a *Hotovo* (zavření výběru barvy)
  nosí tentýž tvar, jen o 14 dp nižší, a jedna z těch akcí je výslovně
  ne-měření (`ZdrojPolohy.Mapa`).
- **1-ergonomie:** u plánu drží opak — *Jsem u ní* **je** pípnutí a dvě
  tlačítka by znamenala, že jedna ze dvou akcí nemá terč (E8).

Nejsou to tytéž obrazovky, ale je to totéž pravidlo. **Hlásí se:** 1 a 2.
Filip rozhodne, až budete vědět, co navrhujete.

### C. Co je vlevo na řádku: jak ta věc vypadá, nebo v jakém je stavu?

- **2-design** chce vlevo **vždycky** kresbu značky ze `znak-boje.tsx`
  a stav slovem vpravo; dnes tam je šest různých věcí v pěti výškách.
- **2-design se přitom ptá 1-ergonomie**, jestli řádek 56 dp unese
  siluetu (válec, kužel, plovatka), nebo je v pohybu nečitelná a disk je
  poctivější.
- **5-jachtar** přidává, že barva musí být barva té bóje (J10).

**Hlásí se:** 1 (odpověz designu rovnou) a 2.

### D. Podle čeho obrazovka pozná, že plán existuje

- **3-ux** doložil past: nález 15 definuje plán jako trať samých
  odečtených bodů, nález 10 chce `ZdrojPolohy.Mapa` pro dráty nad vodou —
  takže **jedny dráty překlopí obrazovku do režimu plánu** a u nich zůstane
  „z plánu" napořád, protože se k nim schválně nejede. Navrhuje místo toho
  `Trat.ZverejnenaV`.
- **5-jachtar** k témuž stavu chce směr a vzdálenost (J1/1).
- **2-design** chce zrušit jantarovou kartu plánu jako druhý tvar téhož
  údaje a vrátit tam proužek polohy.

**Hlásí se:** 3, 5, 2. Dohodněte jeden tvar té obrazovky, ne tři opravy.

### E. Přerovnání: čí je to rozhodnutí a čeho se chytá

- **5-jachtar/J3:** pořadí je rozhodnutí rozhodčího (`PrvekTrati.cs:146–149`),
  stavitel ho na vodě nevymýšlí; režim patří za týž příznak jako mazání.
- **1-ergonomie/E9:** úchyt je 24 × 15 pt pro gesto, které si návrh sám
  označil za nejtěžší; buď 44 × 56, nebo zapsaná cesta zpátky *výš/níž*.

Jde to spolu: když přerovnání není pro stavitele na vodě, mění se i to,
jak se chytá. **Hlásí se:** 5 a 1; 3 řekne, co to dělá s modelem stavů.

### F. Ukazuje osa značky, nebo průjezdy?

**5-jachtar/J2:** dvoukolová trať se v modelu zapisuje opakováním prvku,
takže na jednu bóji vyjdou dva řádky a *Přesunout* na jednom z nich nemá
jednoznačný význam; navrhuje jeden řádek na **značku**. To ale mění smysl
osy, kterou ostatní tři obory chválí jako pořadí na trati.

**Hlásí se:** 5, 3, 2. Jachtaři: bez Filipovy odpovědi na kola odhadni
obě větve a řekni, která je horší, když se netrefíš.

### G. Druhá rozjížďka: trať, kterou nikdo nezaloží

**3-ux/4** našel stav, ze kterého návrh nevede ven: appka si bere „tu
nejnovější trať", a jakmile rozhodčí přijme první, spadne každé pípnutí na
zámek — přesně `Fronta.dc.html`, jen bez cesty ven. Server má `POST /dalsi`
a `POST /{trat}/klon` (*„kopíruje prvky na tytéž bóje — žádná nová
pípnutí"*) a appka nevolá ani jedno.

**Hlásí se:** 3 a 5 (je klon tím, čím se staví druhá rozjížďka?), 1 (co to
stojí za klepnutí), 2 (kam se v hlavičce vejde, která trať se staví).

## Co napsat

Do `docs/konzilium/stavitel-trati-2/<tvoje-session>-kolo2.md`, do **120
řádků**:

```markdown
# <obor> — kolo 2

## Kde ustupuju
Čemu z cizího posudku dáváš za pravdu a proč. Jmenovitě.

## Kde držím
Co z tvého kola 1 platí i po přečtení ostatních — s důvodem, ne opakováním.

## Kde jsme se shodli
Co už je hotové a nemusí se o tom v kole 3 mluvit.

## Nové, co vylezlo z cizích posudků
Co jsi neviděl, dokud jsi nečetl ty druhé.

## Podmínka
Nejvýš dvě věci, bez kterých se to podle tvého oboru nemá stavět.
```

Pravidla platí dál: podkládej, nepřepisuj kód ani makety, necommituj,
nesahej na cizí soubory. **Neotvírej nic nového**, pokud to nevylezlo
z cizího posudku — na to bylo kolo 1.

## Filipovy otázky, které sbírám

Neodpovídejte si na ně sami, jen řekněte, co se změní podle odpovědi.
Jede se na Orlíku na kola? Dostává stavitel azimut a vzdálenost rádiem,
nebo rozhoduje sám? Kdo zakládá trať pro druhou rozjížďku? Smí pomocník
nahlásit hotovo? Kolik fotek se vejde do dne? Je plán zveřejněná trať?

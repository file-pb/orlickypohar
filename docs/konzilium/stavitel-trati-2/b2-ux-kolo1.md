# UX — kolo 1

Dvě zadané otázky zodpovídám hned, zbytek je doklad.

**Drží „jedna obrazovka ve stavech a v režimu"?** Diagnóza ano, provedení ne —
rozpadlo se to tam, kde se nekreslilo znovu (nález 1).

**Co dělá obrazovka, když plán neexistuje?** Dnes nic, a to je správně. V návrhu
to ale nejde poznat: „plán existuje" se počítá z údaje, který nález 10 používá na
něco jiného, takže jedny dráty nad vodou překlopí obrazovku do plánu (nález 2).

## Co je dobře

**Tabulka NAVRH:509–520 je nález, ne úklid.** Seznam prvků je ve všech čtyřech
pohledech týž a stavy jsou různé otázky na jeden prvek; sloučení je nesporné.
**Živý kód rozlišuje dva prázdné stavy** — rozdíl, který bych jinak vymáhal celé
kolo: `stavba.tsx:468–471` má zvlášť *„Trať se zatím nenačetla"* a *„Na trati
zatím nic nestojí. Začni prvním prvkem."* `GET …/trat/prvky` k tomu vrací prázdný
seznam, ne 404 (`TratEndpoints.cs:432–440`), takže ten rozdíl je opravdový.

**Práva z prvního běhu jsou postavená.** `smiStavet` (`role.ts:63–89`) počítá
tutéž trojici jako `Pomocnici.SmiStavet` (`Pomocnik.cs:162`), sbírá se to
v `StaviNeboPomahaAsync` (`TratEndpoints.cs:591–605`) a výběr zastávky nabízí jen
to, kam server pustí, i s prázdným stavem (`serie/[slug]/stavba.tsx:33–51`) — bod
10 závěru je uzavřený a nevisí na `GET …/trat`, jak byla podmínka. **Fronta má
u vypršelé relace větu**, ne mlčení (`odesilani.ts:64–69`), a **nález 7 je v bodě
1 zastaralý**: appka si čísla už pamatuje (`zapamatujCisla`, `odesilani.ts:72–85`,
commit `4b9c256d`). **A plán není klec:** `Plan.dc.html:274` nabízí *„Značka
v plánu nestojí? Pípni ji jako novou."*

## Co je špatně

### 1. Jedna obrazovka je vyhlášená, ne nakreslená

`Hotovo.dc.html` má hlavní akcí *Nahlásit hotovo*, **žádné pípnutí** a **ani
jeden odkaz** (0 × `href`); `Poradi.dc.html` taky 0 × `href`. NAVRH:527–537
přitom slibuje, že *pípnutí je hlavní akce vždycky* a *Nahlásit hotovo patří nad
hlavní tlačítko jako řádek, ne na jeho místo* — rozhodnutí 1 závěru. Revize si tu
vadu sama napsala (NAVRH:518–520) a maketu neopravila: `Main.dc.html` je
z 20. 11. 22:58, `Hotovo.dc.html` z 20:42.

Obrazovka bez cesty zpátky není stav, je to destinace: stavitel, který se podíval,
co ještě neodešlo, se k pípnutí nemá jak vrátit. A inventura je neúplná —
`Zamek.dc.html` je **pátý** pohled na týž seznam (číslovaný, vlastní hlavička,
akce *Odemknout na přestavbu*) a v tabulce čtyř není; čtyři se sloučily proto, že
se porovnaly. **Co s tím:** *Hotovo* je pruh nahoře plus stav u prvku nad tou
samou osou, *Zamek* je šestý stav, kde hlavní akce zmizí (ne se přejmenuje),
*Pořadí* je režim a potřebuje nakreslené východisko. Číslovaný seznam zrušit
všude — osa je jedna.

### 2. Plán a bod z mapy stojí na tomtéž údaji

Nález 15 definuje plán jako trať samých odečtených bodů (`ZdrojPolohy.Mapa`,
NAVRH:452–456), nález 10 chce `ZdrojPolohy.Mapa` pro dráty VN, molo a kanálovou
bóji (NAVRH:310–313). Týž příznak na dvě různé věci — a jediný prvek odečtený
z mapy, právě ty dráty, které nález 10 obhajuje, tím překlopí obrazovku do stavu
`Plan.dc.html`: pruh *„Jedeš podle plánu z kanceláře"*, hlavní akce přejmenovaná
na *JSEM U NÍ* a u drátů stav *„z plánu"*, který nikdo nikdy nezmění, protože se
k nim schválně nejede. Filipovo *„o plánu nepadne ani slovo"* (NAVRH:470–472) tedy
platí jen do první odečtené bójky, a to je stav, který nález 10 má za běžný.

**Co s tím.** „Plán existuje" nesmí být dopočítané ze `Zdroj`; má to být údaj
o trati, a jeden se právě zavádí: **plán je trať, kterou někdo zveřejnil**
(`Trat.ZverejnenaV`, NAVRH:480). Dokud ji nikdo nezveřejní, je to rozestavěná
trať a obrazovka mlčí. Levnější podmínka k tomu: `ObjektNaBrehu` a kanálová bóje
se do plánu nepočítají — nejede se k nim, takže se u nich nedá stát a potvrdit.

### 3. Stav „změřeno / z plánu" se z API nedá přečíst

Appka čte `GET …/trat/prvky` → `List<PrvekDto>` (`api.ts:462–463`), a
`KonecBojeDto` nese `Id, Nazev, Sirka, Delka, Znaceni` (`PrvkySprava.cs:12–13`) —
**`Zdroj` v něm není**, i když ho `Boje` má a jiné mapování ho vydává (`:342`).
Totéž pro nálezy 8 a 12: `Barva` ani `Tvar` tam nejsou, takže znak místo kolečka
se nemá z čeho nakreslit. **NAVRH:548 přitom tvrdí „API se nedotkne"** a tři
nálezy z patnácti to ruší, nikde přiznaně. Drahé to není (aditivní sloupce v DTO,
jedno nasazení) — ale dokud to návrh tvrdí, plánuje se ta práce jako nulová.

### 4. Mezi „kde stavíš" a „pípni" chybí krok, pro který má server čtyři cesty

`Main.dc.html` mluví o *2. rozjížďce*, `Plan.dc.html` o *1.*, `Vyber.dc.html`
vybírá **regatu**. Appka ale trať nevybírá vůbec: `nactiPrvkySpravy` posílá
`…/trat/prvky` **bez `trat`** (`api.ts:462–463`), což podle popisu znamená *„ta
nejnovější"* (`TratEndpoints.cs:93–96`). Jakmile rozhodčí přijme trať první
rozjížďky, „ta nejnovější" je ta přijatá —
každé pípnutí spadne na zámek a fronta stojí. Je to přesně stav `Fronta.dc.html`
(*„Tahle trať je už přijatá"*), jen bez cesty ven, protože založit trať pro druhou
rozjížďku z motoráku nejde. Nález 11 na to odpovídá *„nechat prvek počkat"* — čeká
se na odemčení trati, kterou nikdo odemykat nechce, protože je správně hotová.
Server to přitom umí celé: `POST /dalsi` (*„založí další, prázdnou trať regaty"*),
`POST /{trat}/klon` (*„kopíruje prvky na tytéž bóje — žádná nová pípnutí"*),
`GET /seznam`, `GET /rozjizdky` (`TratEndpoints.cs:134–190`); appka nevolá ani
jednu. **Co s tím:** do hlavičky patří, **která trať** se staví, a k ní založení
další. Klon je navíc nejlevnější hotová odpověď na „plán z kanceláře" pro druhou
rozjížďku: postaví ji z týchž bójí bez jediného pípnutí.

### 5. „Jsem u ní" nemá určeno, čeho se týká

`Plan.dc.html:259` říká *„Stojíš u Brány 2 · ±4 m"* a tlačítko nese jen *JSEM
U NÍ*. U dvoubodového prvku se neříká, **který konec** se potvrzuje, a u odskoku,
který se podle NAVRH:377 staví hned za otočnou, jsou dva plánované prvky v řádu
metrů od sebe — terč si vybírá GPS, ne člověk. Ty dvě cesty přitom zapisují různé
věci: potvrzení plánu zakládá nový záznam a starý označí za nahrazený
(NAVRH:467–468), *„Pípni ji jako novou"* zakládá prvek, a cesta zpátky ze záměny
je mazání, které v příznaku pomocníka není. **Co s tím:** jméno cíle patří **na
tlačítko** (*JSEM U BRÁNY 2 — LEVÁ*), a jsou-li dva kandidáti blíž než pár desítek
metrů, obrazovka se musí zeptat. Hranici neznám — otázka na jachtaře.

### 6. Prázdný stav není v žádné z patnácti maket

Je to stav, ve kterém se obrazovka otevírá **na začátku každé regaty** — a při
překreslování se tím ztratí to jediné, co živý kód o stavech umí (viz *Co je
dobře*). Ta druhá věta si navíc zaslouží opravu: `nactiZaSebe` vrací `null`
i na **401** (`api.ts:85`), takže vypršelá relace se ukáže jako *„Trať se zatím
nenačetla. Bez signálu se stavět dá, jen nevidíš, co na ní je."* — pozvání stavět
dál, zatímco každý prvek skončí na *„Nikdo není přihlášený"*
(`odesilani.ts:66–69`). **Co s tím:** nakreslit oba prázdné stavy a třetí přidat —
*relace skončila, přihlas se*, dřív než se pípne, ne až z fronty.

### 7. Hotovo se odemyká samo a pomocníkovi se nabízí, i když nesmí

`Hotovo.dc.html`: *„Odemkne se samo, až fronta doběhne."* Fronta na vodě
nedoběhne hodiny (NAVRH:213–214). A pomocník hlásit hotovo **nesmí vůbec**:
*„pomocník, který trať postavil, ji zatím nahlásit nemůže, a jestli má, je
rozhodnutí, které nikdo neudělal"* (`Pomocnik.cs:155–158`). Maketa ho nabízí všem,
přestože u mazání se táž věc řeší správně (`Smazani.dc.html`). **Co s tím:**
pomocníkovi ten řádek skrýt a u zamčeného terče říct, co chybí (*2 prvky ve
frontě*) — pruh nahoře to říká, ale člověk se dívá na tlačítko.

## Co bych potřeboval vědět

1. **Je plán zveřejněná trať, nebo „někdo naklikal body z mapy"?** Na tom stojí
   nález 2 — podle čeho obrazovka pozná, že plán existuje.
2. **Kdo zakládá trať pro druhou rozjížďku — kancelář, nebo stavitel z vody?**
   Pokud stavitel, patří do appky `POST /dalsi` a klon; pokud kancelář, co má
   obrazovka dělat tu dobu, kdy přijatá trať je nejnovější a nová ještě není?
3. **Smí pomocník nahlásit hotovo?** `Pomocnik.cs:155–158` to nechává výslovně
   nerozhodnuté a maketa rozhodla za něj.
4. **Jak daleko od sebe bývají dva plánované prvky, u kterých se dá „stát u ní"?**
   Podle toho se cíl smí, nebo nesmí vybírat automaticky.

## Čeho se nedotýkám

- **Kontrast, váha, elegance, jeden jazyk patnácti obrazovek** — 2-design. Že
  Main, Hotovo, Zamek a Poradi kreslí týž seznam čtyřmi způsoby, mám v nálezu 1
  jen jako věc toku; jak má vypadat, je jeho.
- **Počet klepnutí na cestě plán → potvrzení a velikost terče *JSEM U NÍ*** —
  1-ergonomie. **Cena nativních závislostí, pořadí prací u fotky, EXIF** — mimo tok.
- **Jestli se odskok staví hned za otočnou, jak daleko bývají konce brány a co je
  barva a tvar bójky doopravdy** — 5-jachtar; nález 5 na tom čísle visí a z nálezu
  12 mi patří jen to, že `Barva` a `Tvar` nejdou přečíst z API (nález 3).

# Bezpečnost a rizika — kolo 1

Posuzuju návrh ze strany toho, co se nedá vzít zpátky. Všechno níž je
z kódu — na vodě obrazovka neběžela, takže nic z toho není z provozu.

## Co je dobře

1. **Zámek se ukazuje nahoře, ne jako chyba od serveru**
   (`stavba.tsx:262`) — prvek, který by server odmítl kvůli zámku, se
   nedostane do fronty a nezastaví ji. Prevence, ne hlášení.
2. **Pravidla pípnutí jsou opsaná ze serveru schválně**
   (`poloha.ts:10-18`), odůvodněně: odmítnutý prvek zastaví frontu celou.
3. **Fronta je v SQLite, ne v Reactu** (`fronta.ts:12-17`): zápis je
   synchronní, takže prvek je na disku i když systém appku zabije. Ten
   argument je základ celého posudku.
4. **Opakované odeslání téhož klíče vrací 200, ne konflikt**
   (`TratEndpoints.cs:463-468`) — konflikt by frontu zastavil na prvku, co
   už stojí ve vodě.
5. **Vzdálenost od prvního bodu (návrh 4) je obrana proti tichému
   selhání.** Čtyři vteřiny hlídají stáří fixu, ne vzdálenost, takže dnes
   vznikne brána o šířce tří metrů a vypadá správně. Z mého oboru
   nejcennější bod návrhu.

## Co je špatně

### 1. Zahození je jediná cesta ven z fronty — i z chyb, které chybou prvku nejsou

**Nález.** `posliZaSebe` vyhodí `OdmitnutoServerem` pro **jakýkoli** ne-ok
stav kromě 401 (`api.ts:155-169`) a `odesilani.ts:68-71` z toho udělá
`odmitnuto = true`. `sit.ts:43-45` navíc schválně nepovažuje 5xx za potíž
spojení — doletělo. Takže 403 (odebrané právo), 404 (přejmenovaná
zastávka), 500 i **502 od Traefiku při rolling deploy** skončí jako „server
prvek odmítl". Jediná akce, kterou obrazovka nabízí, je `Zahodit`
(`stavba.tsx:295`) → `DELETE FROM fronta` (`fronta.ts:185-187`), bez
potvrzení, jedním klepnutím.

**Proč to vadí.** Nasazuje CI při každém pushi do `main` (AGENTS.md,
*Nasazení*), takže push během závodního dne na desítky sekund vyrobí stav,
ve kterém appka hlásí trvalé odmítnutí platného prvku — a tělo od Traefiku
není JSON, takže `duvod` zůstane `null` a zbyde holá věta „Server prvek
odmítl." Pípnutá poloha je jediná věc, která se nedá vyvolat znovu, motorák
už je jinde. Maže se nenahraditelné měření kvůli chybě, která mizí sama.

**A návrh to zvětšuje.** Maketa `Fronta.dc.html` ukazuje jako příklad
odmítnutí větu *„Tahle trať je už přijatá."* — tedy to, co se odstraní
odemčením — a vedle ní jediné tlačítko *Zahodit prvek 5*. Návrh (bod 5) ho
dělá větším a dostupnějším, potvrzení ani druhou cestu nepřidává.

**Návrh.** Rozdělit odmítnutí už v `odesilani.ts` na *vadu prvku* (400
s větou pravidla) a *vadu okolností* (403, 404, 5xx, 400 se zámkem). U druhé
třídy je hlavní akce `Zkusit znovu` a `Zahodit` leží pod ní, s potvrzením,
které jmenuje prvek a říká, že se poloha nevrátí. Zahození ať přesune řádek
do tabulky `zahozene` (popis, potíž, čas) — dnes po něm nezbude doklad, co
v trati chybí, a pozná se to až podle pořadí při plavbě.

### 2. „Pípnutá, ale nepopsaná značka" nemá kde přežít zabití appky

**Nález.** Návrh bodu 1 říká, že klepnutí uloží polohu a čas a *„i na to se
dá odpovědět později"*. Dnes žijí pípnuté body v `useState`
(`stavba.tsx:190`). Kam se nepopsaná značka ukládá, návrh neříká.

**Proč to vadí.** Tenhle spor už jednou padl a vyhrál ho disk
(`fronta.ts:12-17`): *„když systém appku zabije, React state je pryč
a stavitel by nepoznal, že o prvek přišel."* Dnes je expozice krátká —
pípnutí je krok 3 z 5 a potvrzení následuje hned. Návrh ji **schválně
prodlužuje na neurčito**: značka má smět čekat na popis hodinu. Telefon
v kapse, úsporný režim, a pípnutí zmizí bez řádku i bez hlášky.

**Návrh.** Nepopsaná pípnutí ukládat při klepnutí do vlastní tabulky
v `stavba.db`, synchronně, dřív než se cokoli vykreslí. Dokud to návrh
nemá, je „pípni teď, popiš potom" zhoršení bezpečnosti, ne zlepšení.

### 3. Odklad popisu rozvazuje vazbu „pořadí pípnutí = pořadí trati"

**Nález.** Pořadí prvku na trati počítá server podle pořadí doručení
(`odesilani.ts:4-7`, `PrvkySprava.cs:286`). Do fronty se prvek dostane
až při `postav`, tedy **až po popisu** (`stavba.tsx:221`).

**Proč to vadí.** Scénář: stavitel pípne otočnou, nepopíše ji, popojede,
pípne a popíše bránu, a teprve pak dopíše otočnou. Fronta dostane bránu
první. Trať bude mít správné prvky ve **špatném pořadí** — a to je pořadí,
podle kterého se pluje. Na obrazovce to vypadá správně; pozná se to až
z mapy, stejně jako u bodu 4 návrhu. Dnešní obrazovka to nemá, protože
nepustí pípnutí bez vybraného typu (`stavba.tsx:189`).

**Návrh.** Pípnutí zabírá místo ve frontě okamžitě jako „rozestavěný
prvek"; popis ho tam jen doplní a odeslat se nedá, dokud není. Levnější
varianta: zakázat druhé pípnutí, dokud není první popsané.

### 4. Odemčení přijaté trati mění veřejnou skutečnost jedním klepnutím

**Nález.** Maketa `Zamek.dc.html` má tlačítko *Odemknout na přestavbu* bez
vysvětlení následku a bez potvrzení. Server to pustí organizátorovi
i rozhodčímu (`TratEndpoints.cs:537-540`, vědomě od 9. 10. 2026) a hned se
tím mění, co vidí veřejnost: u přestavby se bóje zamlčí a vydá se jen
příznak (`TratSprava.cs:462-464`).

**Proč to vadí.** Je to nejnevratnější úkon na obrazovce, protože zpátky na
`Prijato` smí jen rozhodčí (`TratEndpoints.cs:78-83`). Omylem stisknuté
uprostřed závodního dne znamená, že divákům i posádkám trať zmizí
a pořadatel musí shánět rozhodčího — přesně to, čemu mělo rozšíření práv
předejít. `PrijatoV` se navíc nemaže (`TratSprava.cs:330-337`), takže z DTO
nejde poznat, že odemčení byl omyl.

**Návrh.** Potvrzení, které následek řekne slovy veřejnosti: *„Divákům se
trať skrývá a objeví se až po novém přijetí rozhodčím."* Potvrzovací
tlačítko umístit jinam než to první, aby dvě klepnutí nespustila obojí.

### 5. Rozšíření na pomocníka pustí víc, než se čeká

**Nález.** Rámec (bod 7) počítá s tím, že obrazovku bude obsluhovat
zaškrtnutý pomocník. Práva na celou trať drží jeden predikát `StaviAsync`
(`TratEndpoints.cs:537-540`), který kryje všechny cesty skupiny `MapSpravu`
— mezi nimi `DELETE /{trat}`, `DELETE /prvky/{prvek}` a `/prestavba`.

**Proč to vadí.** Pomocník je schválně **příznak, ne role**, a jeho smyslem
je otevřít *„jen start a cíl"* (`Pomocnik.cs:26-28`) právě proto, že role
`Organizator` dávala moc nad věcmi, které tomu člověku nepatří. Přidat ho
do `StaviAsync` zavede tu chybu znovu, o úroveň níž: člověk, který přijel
na jednu regatu vypomoct, by směl smazat prvky a zahodit trať. Návrh o tom
nemá ani řádku, přestože mu obrazovku otevírá.

**Návrh.** Pomocníkovi dát vlastní predikát, který kryje jen `POST
/prvky/postav` a čtení; zahození trati, mazání prvků a `/prestavba`
zůstanou organizátorovi a rozhodčímu. Dokud ten predikát není, stavba se
pomocníkovi otevřít nesmí — rozhoduje server, klient tlačítko jen skryje.

## Co bych potřeboval vědět

- **Ergonomie (1):** když se `Zahodit` podřídí potvrzení a `Zkusit znovu`
  (nález 1), je dvojklepnutí v rukavicích na vodě únosné, nebo potvrzení
  potřebuje jiný tvar než dialog?
- **UX (3):** má nepopsané pípnutí držet místo ve frontě (nález 3), nebo je
  lepší zakázat druhé pípnutí, dokud není první popsané?
- **Psycholog (7):** pomůže věta o následku u odemčení (nález 4), nebo se
  potvrzení pod tlakem překlepne a je lepší to právo z motoráku vzít?
- **Zadavatel:** má se obrazovka pomocníkovi otevřít dřív, než vznikne
  samostatný predikát (nález 5)? Z mého oboru je odpověď ne. A má `posud`
  dál pouštět celé Česko (`poloha.ts:90`, `vCesku`), ne Orlík, když ani
  jedna kontrola nepozná bránu položenou mimo přehradu?

## Čeho se nedotýkám

- **Vkus, barvy, kontrast, typografie, hierarchie** — obor 2; barvu jsem
  použil jen tam, kde nese stav. **Počet kroků, dosah palce, rukavice** —
  obor 1. **Formulace textů a prázdné stavy** — obor 3, kromě vět
  popisujících následek nevratného úkonu; ty jsem navrhl schválně.
- **Slučování typu a předpisu a pořadí voleb** (otázky 1 a 4 návrhu) —
  bezpečnostní dopad, který bych uměl podložit, v tom nevidím.
- **Cena změny a zásah do `packages/stavba/`** — náklady nepočítám.

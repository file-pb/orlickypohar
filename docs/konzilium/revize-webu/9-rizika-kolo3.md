# 9-rizika (bezpečnost a rizika) — kolo 3

## Rozhodnutí

- **α — hlas 3** (stránka „Termín a stav"). Úkon, který mění pohár, má mít jedno místo
  s jedinou regatou na obrazovce a s návratem tam, kde se klepnulo — pak je omyl vidět.
  Varianta 2 nese tentýž blok pod šesti agendami včetně zápisu u vody; varianta 1 nechává
  omyl „správný úkon, špatná regata" (7). Moje námitka z kola 2 byla cena, a ta není můj obor.
- **β — hlas 1** (odmítnout každému, dokud je z regaty něco v poháru). Drží jednoduché
  pravidlo bez výjimek: co web ukazuje jako výsledky odjeté regaty, to pohár počítá.
  Legitimní případy 5-jachtingu tím nepadají — kdo opravuje chybné uzavření, nejdřív skryje
  rozjížďky, a zásah do poháru je tak vědomý krok, ne vedlejší účinek. Varianta 2 chce
  důvod, který dnes není kam uložit (`KalendarSprava.cs:417–424` ho nepřijímá).
- **θ1 — hlas 1** (druhé klepnutí). Zpráva do telefonů je jediný následek správy, který
  nejde vzít zpět ničím. Nic nového to nestaví: úkon už za rozbalovačem „Další úkony" je
  (`vysledky/[zavod]/page.tsx:592–663`) a ten se jako druhé klepnutí počítá. Jméno
  „…a oznámit do telefonů" k tomu, ne místo toho.
- **θ2 — hlas 1** (rozbalovač „Opravdu odebrat <role> — <jméno>"). Cestu přes „Vrátit roli"
  jsem v kole 2 nabídl sám a beru ji zpět: platí jen pro toho, kdo se na hlášku podívá.
  Kdo klepne na štítek při posunu a telefon schová, omyl nevrátí — a protože odebrání
  nenechává stopu (`OpravneniSprava.cs:243–261`), nikdo nezjistí, že to omyl byl. Úkon je
  vzácný, takže rozbalovač nestojí nic.
- **κ — hlas 1** (Orlický pohár). Jméno už nesou nosiče, které se nedají vzít zpět — adresa
  (rámec 9), appka a vypsání 2026 složené aplikací (5), tedy dokument, kterým se závodník
  řídí. Tři hlavičky rozhodčího se přepsat dají; „Orlická série" smí stát jen jako popis
  v běžném textu, ne jako druhé jméno v hlavičce.

## Co nesmí spadnout pod stůl

Ať vyhraje kterákoli β, povolený krok zpět musí zastavit i automat: `UzavreniRegat` dnes
každou vypsanou regatu s dojetou rozjížďkou starší dvou dnů do dne zavře znovu
(`Uzavirani.cs:85–91`, `UzavreniRegat.cs:22`) a přepíše, kdo ji zavřel. Druhé klepnutí
u nevratných úkonů (Smazat přihlášku, fotka papíru, Odebrat roli) musí přijít nejpozději
v téže změně jako obecné pravidlo 44 px — to se udělá první, protože je to jeden řádek CSS,
a do té doby budou mazací tlačítka nejsnáz trefitelná na obrazovce.

## Výhrada

- **K β, vyhraje-li varianta 2.** Důvod, který se nikam neuloží a nenese jméno toho, kdo
  ho napsal, nic nehlídá — je to jen pole navíc. V tom případě se záznam „kdo a proč"
  u stavu regaty vrací z plánu do revize; jinak je varianta 2 slabší než dnešní stav
  s jedním klepnutím, protože budí dojem pojistky.
- **K J (uzavřeno v kole 2), jen k větě v rozbalovači.** Má říkat celou pravdu: zápis loď
  přihlásí do závodu **a vymazáním výsledku se to nevrátí** — účast zůstane
  (`ZapisSprava.cs:341–351`, `:373–374`). Bez druhé půlky věty je úkon popsaný jako vratný.

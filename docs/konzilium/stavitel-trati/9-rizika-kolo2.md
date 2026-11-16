# Bezpečnost a rizika — kolo 2

## Kde ustupuju

**A — tvar úložiště: ustupuju 3-ux.** Vlastní tabulka (moje i 7) a místo
ve frontě nejsou totéž a moderátor to pojmenoval správně. Řádek ve frontě
je lepší, protože prvek žije na **jednom** místě: překlopení z tabulky do
fronty je migrace, a migrace je místo, kde se dá ztratit. Fronta navíc
přežití řeší zdarma — WAL a synchronní zápis (`fronta.ts:69`), pořadí přes
`ORDER BY id`, a zastavování už umí (`fronta.ts:157-165`). Mou levnější
variantu (zakázat druhé pípnutí) stahuji ve prospěch stropu od 1-ergonomie:
**nejvýš jedna nepopsaná naráz** dělá totéž a nebere pohodlí u jednoho prvku.

**D — barva: ustupuju 2-design.** Netrvám na tom, aby `Zkusit znovu` bylo
plnou plochou. Obrysové v `voda` drží kontrast v obou sadách — na `papir`
**5,67:1** světlá, **7,19:1** tmavá (`theme.ts:22,26,42,46`) — takže
pravidlo „jediná plná plocha = pípnutí" zůstává celé a můj požadavek je
splněn beze zbytku. Plnou plochu jsem nikdy nepotřeboval, potřeboval jsem
pořadí.

## Kde držím

**D — hierarchie a potvrzení.** `Zkusit znovu` stojí **nad** `Zahodit`,
`Zahodit` je nejslabší tvar na kartě a nese potvrzení. Stane-li se opak,
platí scénář z kola 1 beze změny: push do `main` během závodního dne vyrobí
502, které `api.ts:155-169` nerozliší od věcného odmítnutí, a stavitel
nevratně smaže platné měření kvůli chybě, která mizí sama. Potvrzení ať
není modální dialog, ale druhá fáze téhož tlačítka s terčem **jinde** než
první klepnutí — tím se kryje i nález 1/2 (destruktivní terč v klidové
poloze palce) a zůstane 44 pt, které dnes nedrží (≈ 40,7 pt, nález 1/3).

**D, podstatnější než tvar karty: většina sporu zmizí klasifikací.** Když
403, 404 a 5xx přestanou zapisovat `odmitnuto = true` (`odesilani.ts:68-71`),
karta zádrhelu se u nich **vůbec nezobrazí** — zůstane pruh „zkouším znovu"
a fronta se rozjede sama. Karta pak zbude jen pro vadu prvku, kde je
`Zahodit` opravdu jediná akce a obrysový tvar stačí. Spor o druhou plochu
je tedy z devíti desetin spor o chybu v klasifikaci, ne o design.

**Proti 3-ux, nález 3: „zahodit celou frontu jedním klepnutím" ne.** Chápu
důvod — po zamčení trati je každá další značka jedno povinné zahození —, ale
tohle je nejnevratnější úkon, jaký na obrazovce může být: jedním klepnutím
mizí všechna měření regaty. Když už, tak s počtem ve větě („Zahodit 6 prvků
— měření se nevrátí") a s druhou fází. Lepší je tu frontu **nezahazovat**:
zámek je vada okolností, prvky mají počkat, a odemkne-li někdo trať na
přestavbu, odejdou samy.

**A — nepopsaný řádek musí být vlastní stav, ne prázdný popis.**
`prvniKOdeslani` zastaví frontu **jen** u `odmitnuto` (`fronta.ts:164`).
Vloží-li se nepopsaný řádek bez dalšího příznaku, odesílání ho vezme
a pošle, server ho odmítne na `ProcNejdePostavit` (`PrvkySprava.cs:222`),
appka zapíše `odmitnuto = true` — a jediná nabízená cesta ven bude
**zahození**. Tedy přesně ten stav, proti kterému celý můj nález 1 stojí.
Nepopsaný řádek musí `prvniKOdeslani` vyloučit **dřív než odešle**
a nesmí nikdy projít klasifikací odmítnutí.

**A — odklad u brány: odkládá se varianta, ne typ.** 3-ux má pravdu, že bez
typu appka nepozná, že druhé pípnutí patří k prvnímu. Ale návrh 1-ergonomie
ze sporu B to rozvazuje: ze sedmi řádků se vybere *Brána* hned po prvním
pípnutí a doptání na variantu přijde potom. Typ tedy padne vždy hned,
odkládá se jen varianta — a *Popíšu potom* u prvního konce brány nesmí
existovat vůbec, ne proto, že je nepohodlné, ale proto, že nedokončený
dvoubodový prvek nemá tvar, do kterého by se uložil.

**G — predikát patří na obě místa, každé na svůj díl.** Rozhodnutí ať je
čistá funkce `Pomocnici.SmiStavet(poradatel, pomocnik, rozhodci)` vedle
`SmiUVody` (`Pomocnik.cs:133`) — testovatelná bez databáze; sběr dat ať je
v `TratEndpoints` vedle `StaviAsync`, přesně jak to dělá
`SmiUVodyAsync` u výsledků (`VysledkyEndpoints.cs:644-665`). Kdyby žilo
jen v `Pomocnici`, nebude z `TratEndpoints` vidět, které cesty se tím
otevírají, a to je ta chyba, na kterou nález 5 mířil.

## Kde jsme se shodli

- **Nepopsané pípnutí patří na disk, ne do Reactu.** Shodli jsme se na tom
  všichni čtyři, nezávisle; jako tvar beru řádek ve frontě (3-ux) se
  stropem jedna (1-ergonomie) a zákazem slova „uložená", dokud to neplatí
  (7-psycholog).
- **Zahození nechá doklad** — 7/6 a moje 1 jsou tentýž požadavek. Beru
  jejich tvar: řádek „zahozeno: <věta serveru>" **i se souřadnicemi**, aby
  šel prvek dopsat jinudy. To je víc než moje tabulka `zahozene`.
- **403 není teoretický.** 3-ux doložil (`index.tsx:493`, `role.ts:26-28`),
  že `veliNekde` pustí k obrazovce pořadatele cizí zastávky. Můj nález 1
  předpokládal, že 403 je vzácnost; po jejich doložení je to **běžný
  provozní stav**, a klasifikace odmítnutí tím přestává být opatrnost
  a stává se podmínkou.
- **Pomocník:** podmínku, jak ji moderátor zapsal, potvrzuju beze změny.
- **Nahlásit hotovo** (3-ux, 5) beru jako svou věc taky: po přijetí trati
  `postav` neprojde (`ProcNejdeStavetAsync`, `PrvkySprava.cs:236`), takže
  nepopsané pípnutí, které přežije přijetí, je **zaručená** ztráta. Odpověď
  7-psychologovi tedy zní: ne, trať se se třemi nepopsanými uzavřít nesmí.
- **3-ux se ptal, jestli má o nepopsaném pípnutí vědět server.** Nemá —
  polotovar bez typu by znamenal nový stav v autoritě na pravidla, což
  rámec bod 2 zakazuje. Cenou je, že ztracený telefon bere nepopsaná
  pípnutí s sebou; únosné je to jen při stropu jedna.

## Nové, co vylezlo z cizích posudků

**Kořen nálezu 5 je výchozí hodnota, ne jeden predikát.** `RozsahAsync` má
`bool jenRozhodci = false` (`TratEndpoints.cs:524`), takže endpoint, který
nic neřekne, dostane ten **širší** predikát. Tak se k `StaviAsync` dostaly
i `DELETE /{trat}` a `/prestavba` — ne rozhodnutím, ale mlčením. Přidáním
pomocníka se ta past jen zvětší. Žádám, aby se s novým predikátem vybíral
rozsah u každé cesty **jmenovitě** (výčet, ne `bool` s výchozí hodnotou);
jinak příští přidaný endpoint zdědí nejširší práva znovu a nikdo si toho
nevšimne, protože se tím nic nerozbije.

## Podmínka

1. **Klasifikace odmítnutí musí být hotová dřív, než se povolí odklad
   popisu.** Odklad zvyšuje počet prvků, které čekají ve frontě, a dnešní
   fronta má z každé poruchy jedinou cestu ven, a ta maže data. Pořadí
   obráceně znamená, že se nejdřív vyrobí víc toho, co se pak zahazuje.
2. **Nový predikát pro pomocníka se vybírá jmenovitě u každé cesty.**
   Dokud je výchozí hodnota ta nejširší, je rozšíření práv o jeden příznak
   vždycky rozšíření o celý `MapSpravu`.

# UX (toky, role, prázdné stavy) — kolo 3

## Rozhodnutí

**α — hlas pro 3 (úkol v *Co teď*), s jednou opravou.** Jako úkol se *Otázky*
objeví, když něco visí; pořadatel ale odpovědi **čte** (server ho na čtení pouští,
`OponenturaEndpoints`), a to by bez trvalé cesty byla zase funkce bez cesty. Proto:
úkol v *Co teď*, **a trvalý odkaz ve spodním řádku pod ním** — tam, kde je dnes
*„Mimo ročník"* a kde už je dohodnuté filtrovat podle práv. Tím padá i jediná
námitka proti trojce.

**δ — ano, *Co teď* první tab unese i bez `--ukon-coted`; ustupuji 2-designu.**
Teplá barva slibuje spěch i ve dnech, kdy nic nevisí, a to je po shodě z kola 2
většina roku — barva, která lže, je horší než žádná. Tečka u úkolu je honest:
objeví se s úkolem a zmizí s ním, stejně jako sám úkol. Má-li tab něco nést
natrvalo, pak **počet** (*Co teď 3*, nic při nule), ne odstín.

**ε — potvrzuji dělení: pilot nejbližší zastávka, druhá fáze chybějící dokument.**
`ZastavkaVysledkyDto` (`web/lib/schema.d.ts:8943–8955`) nese `datum` a `stav`,
nic o vypsání, směrnici ani trati — řada 5-jachtinga je věcně správná (ZPJ 25.1,
R1/R8, R22, R28, R10) a je to **pořadí povinností, ne výmysl**, takže do druhé
fáze patří celá, i s jeho dvěma hranicemi (jmenovat dokument, nestanovovat lhůtu).
Pilot ji nemá z čeho spočítat; čekat na API by znamenalo postavit pilot
s prázdným landingem, což je přesně to, co obě podmínky zakazují.

**ε / znění 4-jazyka — sedí na druhou fázi, ne na pilot.** *„Nic nečeká. Nejbližší
je Jarní vítr 15. 5. — zbývá vypsat závod."* druhou polovinou tvrdí, co pilot
neví. V pilotu: *„Nic nečeká. Nejbližší je Jarní vítr 15. 5. — zatím plánovaná."*
(`stav` je fakt, který v DTO je), ve druhé fázi se druhá polovina vymění za
chybějící dokument. Pravidlo 4-jazyka *„nikdy jen první věta"* platí v obou.

**ζ — cena mi sedí: *Novinky* z pruhu do *Úvodu*.** Pro čtenáře, který přijde pro
novinky, jsou tři poslední na *Úvodu* dřív než za tabem; archiv je o klepnutí dál
a adresa `/serie/{slug}/novinky` se nemění (pravidlo 5). **Podmínka:** ten blok
musí na archiv odkazovat, jinak se z tabu stanou tři poslední novinky a zbytek
ročníku zmizí — dnes na něj vede `web/app/serie/[slug]/page.tsx:98`.

**η — souhlas: drobeček končí patrem, nikdy tabem.** Tab nesou dlaždice i nadpis
a třetí opis nepřidá nic; horší je, že drobeček končící tabem tvrdí, že tab je
hlubší patro, a krok nahoru pak znamená „opustit tab". Prakticky to je přestat
předávat poslední drobek do `drobeckySpravy(serie, dal)`
(`web/app/drobecky.tsx:56–63`) — tedy i u regaty, kde dnes končí obrazovkou
(`SCENARE-OVLADANI.md:154`); `drobekRegaty` zůstává posledním prvkem toho patra.

## Co nesmí spadnout pod stůl

**Pruh o jedné dlaždici se nekreslí:** čistému editorovi zbude po filtraci práv
jen *Novinky ročníku* a *Co teď* mu podle kola 2 nepatří (zdroj je pro něj
nečitelný, 403 → `nesmi`, `web/lib/sprava.ts:104`), takže zapomene-li se na to,
dostane dvoudlaždicové okno, které vypadá jako porucha.

**Odkaz z *Co teď* u plánované regaty míří dnes do prázdna:** `kamNaRegate`
(`co-smim.ts:311`) pošle toho, u koho se ještě nejelo, na přihlášky, a ty jsou
u `Planovany` regaty prázdné (hlásit se smí od `Vypsany`) — v pilotu tedy vést na
okno regaty, ve druhé fázi na chybějící dokument.

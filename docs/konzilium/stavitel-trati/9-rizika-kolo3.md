# Bezpečnost a rizika — kolo 3

## Rozhodnutí

**β — hlas pro 1: odklad padá celý.** Měním pozici z kola 2 a důvod je
z mého oboru: 1-ergonomie změřila, že popis je jedno klepnutí a že to
klepnutí **má čas**, protože poloha už je uložená a čtyři vteřiny
(`poloha.ts:40`) doběhly. Odklad tedy nekupuje nic měřitelného — a riziko,
které nic nekupuje, se neplatí. Padnutím odkladu zanikají oba mé nálezy
z kola 1 (přežití a pořadí) i celá nová mechanika, která by je musela
hlídat: žádný nový stav ve frontě, žádná nová tabulka, žádné nové místo,
kde se prvek dá ztratit. Nejlevnější bezpečnost je ta, která nemá co
chránit. **Podmínka 1-ergonomie platí i pro mě:** řekne-li Filip, že se
o prvcích rozhoduje až na vodě podle větru, stavitel typ při pípnutí nezná
a odklad být musí — pak platí tvar z mé výhrady níž a strop jedné.

**δ — hlas pro 1-ergonomii: terč se nepohne, ale druhá fáze má prodlevu.**
Ustupuju v poloze terče: v rukavicích je míření horší chyba než ta, které
jsem bránil, a nepohnutý terč je správně. Nevzdávám ale to, proti čemu
jsem posun navrhoval, protože asymetrie je jednostranná — **minout nestojí
nic** (klepne se znovu), **potvrdit omylem maže měření, které se nedá
zopakovat**. Druhá fáze proto ať přijme klepnutí teprve po krátké prodlevě
(řádově 300–500 ms), aby jedno klesající gesto neprošlo oběma fázemi. Žádné
míření to nevyžaduje a pětivteřinový návrat 1-ergonomie zůstává.

## Co nesmí spadnout pod stůl

**`RozsahAsync` má `bool jenRozhodci = false` (`TratEndpoints.cs:524`),
takže `DELETE /{trat}` a `/prestavba` se pod nejširší predikát dostaly
mlčením, ne rozhodnutím** — a příští přidaný endpoint to zdědí znovu,
protože se tím nic nerozbije; proto se rozsah musí u každé cesty vybírat
jmenovitě výčtem, ne výchozí hodnotou. **Vznikne-li přesto nepopsaný řádek
ve frontě, musí ho `prvniKOdeslani` vyloučit dřív, než odešle
(`fronta.ts:164` ho dnes zastaví jen u `odmitnuto`), a nesmí nikdy projít
klasifikací odmítnutí** — jinak ho server odmítne na `ProcNejdePostavit`
a jediná nabízená cesta ven bude zahození, tedy přesně to, proti čemu můj
nález 1 celou dobu stál.

## Výhrada

**Uzavřené body kola 3 zapsaly u úložiště tu variantu, od které její autor
v kole 2 s doložením ustoupil.** KOLO3 říká „řádek ve frontě …, ne ve
vlastní tabulce". 3-ux ale v kole 2 ustoupil mně a 7-psychologovi na
vlastní tabulku, a doložil proč: `fronta.vstup` je `NOT NULL`
(`fronta.ts:77`) a drží hotový `PrvekKPostaveni`, kde je `typ` povinný
a každý bod musí mít `nazev` (`fronta.ts:28-46`). Řádek bez popisu tedy
ruší jedinou invariantu fronty — že každý její řádek je odeslatelný
požadavek. Já jsem v kole 2 ustoupil opačným směrem, takže jsme se vyměnili
a zapsala se neobhajovaná polovina.

Je-li β rozhodnuto variantou 1, je to bezpředmětné: neukládá se nic a výhrada
padá s odkladem. Platí-li varianta 2, nebo vynutí-li odklad Filipova odpověď,
ať se zapíše **vlastní tabulka**, ne řádek ve frontě. Pořadí tím netrpí,
protože strop jedné nepopsané značky nedá nepopsanému pípnutí co předběhnout
— to je argument 3-ux z kola 2 a beru ho za svůj.

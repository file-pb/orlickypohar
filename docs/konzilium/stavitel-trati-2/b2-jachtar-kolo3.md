# Jachtař — kolo 3

Dělím obojí jedinou otázkou, na kterou mám nárok odpovídat: **co se dělá
za jízdy u kormidla a co ve stojící lodi nebo na břehu.**

## Jedna řádka trati

Za jízdy stavitel **nečte seznam, hledá v něm jeden řádek** — tu značku,
ke které zrovna jede — a potřebuje z něj dvě věci: *která to je* a *kde
je*. Všechno ostatní na řádce je kontrola, a kontrola se dělá, když loď
stojí. Podle toho dělím:

**Vlevo (sloupec 40 dp, silueta 28 × 36).** Kresba tam patří, ale ne
proto, že se čte za jízdy — za jízdy se nečte. Platí si místo tím, že
jedním pohledem oddělí **značku, kterou jsme položili, od znaku, který
tam stojí celý rok**: k válci plavební dráhy a k drátům se nejede, k naší
bóji ano. To je rozdíl, který na seznamu pěti řádků rozhoduje, kam loď
pojede, a žádné slovo ho neunese tak rychle. Výplň = barva té bóje (J10).

**Uprostřed, řádka 1: jméno.** *„Otočná 1"*, *„Brána 2"*, *„Start"* —
**tohle je identita za jízdy**, protože je to zároveň to, co se říká do
vysílačky a co stojí v plachetní směrnici. Ne barva, ne tvar. Designem
naměřených 66 pt (16/600) stačí; delší jméno nevzniká, protože jména dává
`stavba-prvku.ts`, ne člověk.

**Uprostřed, řádka 2: předpis, 13 px, 134 pt.** *„ponechat po levoboku"*,
*„projet mezi nimi"*. **Za jízdy se nečte vůbec** — stavitel ví, co
pokládá. Čte se dvakrát: na břehu při srovnání trati se směrnicí a
rozhodčím, když se ptá, jak to má vyhlásit. Proto smí být nejmenší na
řádce, ale **musí být v opraveném znění** (J8): tahle jediná řádka se
porovnává s textem směrnice, takže „otočit levobokem" by se porovnávalo
s nepravdou.

**Vpravo: jedno číslo, a jen na jednom řádku.** Z oboru dvě věci:

1. **Vzdálenost ano, číslo azimutu ne.** Směr u kormidla potřebuju jako
   **směr** — šipka otočená k té značce —, ne jako tři číslice; kam to
   je, si člověk přebere okem, jak daleko to je, nepřebere nikdy. Číslice
   azimutu se čtou do vysílačky, a to se dělá ve stojící lodi, tedy
   v detailu. Tím mizí rozpor, který v zadání kola 3 je: bod 2 uzavřených
   říká *„azimut jen v detailu prvku"*, kdežto §1 chce vpravo
   `↑ 063° · 310 m`. **Řešení: vpravo šipka + „310 m"** (ze 109 pt zbude
   okolo 60), číslice `063°` v detailu. Obojí uzavřené tím platí.
2. **Číslo jen u té značky, ke které se jede** (ux má pravdu, že pět
   pohyblivých čísel je zpátky „všechno váží stejně"). A u startu, cíle
   a odskoku se to číslo **po postavení mění na délku linie** (J9): dokud
   stojí, je číslo *„jak daleko to je"*, jakmile stojí, je to *„jak je to
   dlouhé"*. Je to pořád jedno číslo na jednom místě a obě podoby jsou
   operační — podle druhé se rozhoduje, jestli je linie dost dlouhá na
   startovní pole.

**Stav slovem vpravo pod číslem — a nejsou si rovné.** Z oboru mají tři
různou cenu: *z plánu* je **práce** (jeď tam a pípni), *chybí fotka* je
**práce, která jde udělat jen odsud**, a *čeká ve frontě* je **počasí** —
stavitel s tím nic nedělá, je to věc signálu. První dvě smí volat, třetí
musí být nejtišší, jinak obrazovka dvacetkrát za regatu hlásí něco, co
není úkol.

**Výška a rozteč: musí se vejít šest.** Orlická trať je *start →
dvě až čtyři otočné nebo brány → cíl*, tedy **čtyři až šest prvků**;
pět je o jeden méně než obvyklá trať, a ten jeden chybějící by byl
pokaždé ten poslední — cíl. Takže **spojnice na 8 dp (rozteč 64, šest
prvků) a k tomu rolování pod pevným pruhem**, ne jedno z toho: sedmý
a osmý řádek jsou skutečné (odskok, dráty VN, molo u klubovny), jen
vzácné, a ty ať rolují. Co se nesmí stát, je ustřižení (N1) — na vodě
chybí vždycky ten, co není vidět.

## Detail prvku

**Nahoře fakta, pod nimi akce podle toho, jak často se dělají, nevratné
dole.** Fakta jsou nahoře proto, že se **nemačkají, ale předčítají**: když
se rozhodčí na vysílačce zeptá „jaký je azimut na jedničku", čte se to
vestoje v houpající se lodi a nesmí se k tomu rolovat.

**Blok fakt (čtení, žádný terč):** jméno a předpis · poloha · přesnost
a zdroj (*změřeno telefonem* / *odečteno z mapy*) · čas · **azimut
a vzdálenost odsud, číslicemi** · u startu, cíle a odskoku **délka
linie** · čas posledního přesunu, pokud nějaký byl.

**Akce, shora dolů:**

1. **Přesunout sem** — jen z vody a jen u té značky, u které loď stojí.
   Na větrný den to je **několikrát denně** a je to hlavní práce dne
   (nález 14). Patří k tomu jediná věta, která se nesmí vynechat:
   *přesun není oprava překlepu* — starý záznam zůstává platný pro dobu,
   kdy platil, protože se podle něj posuzuje trasa lodi. Kdo chce opravit
   špatně zadanou polohu, zahodí a pípne znovu.
2. **Vyfotit** — jen z vody, dva snímky na značku, jednou za život
   značky. *Vybrat z galerie* je tatáž věc o patro níž: je to cesta pro
   toho, kdo pod tlakem sáhl po foťáku telefonu, a dělá se na břehu.
3. **Barva a tvar** — jednou za ráno, z jedné krabice bójí (E5). Vody ani
   břehu se to netýká, proto až tady.
4. **Sebrat z vody** — **a tady opravuju sám sebe**, viz níž: sebrání
   nepotřebuje polohu, takže ho jde zapsat i u mola, a na vodě se zapisovat
   nebude: na konci poslední rozjížďky se tahají mokré bóje do lodi
   v jednom kuse, ne po jedné s telefonem v ruce.
5. **Výš / níž** — pořadí je rozhodnutí rozhodčího (J3), tedy břeh nebo
   vysílačka, a oprava o jedno místo. Patří sem, ale nízko.
6. **Smazat prvek** — nejvzácnější a nevratné, dole, dvě fáze. Věta musí
   říct, že **měření zůstává** a mizí jen rozhodnutí; bez toho si člověk
   myslí, že maže polohu, a sáhne místo toho po přesunu — tedy po tom
   jediném úkonu, který historii trati doopravdy přepíše.

**Co z toho smí pomocník** (otevřená Filipova otázka, ale z oboru je to
jednoznačné): *Přesunout sem* **je pípnutí** — měří polohu telefonem
u bóje —, takže za jeho příznak patří; *Sebrat z vody* žádné měření není,
je to rozhodnutí o trati, takže ne. Pomocník je přitom často právě ten
člověk v motoráku, takže na tom nezáleží málo.

## Co jsem si rozmyslel

**Sebrání jsem v kole 1 psal jako práci na vodě vedle přesunu** („obojí je
jedno klepnutí u značky, u které loď zrovna stojí"). Není to tak: přesun
a fotka jsou **nemožné odjinud než od té bóje**, kdežto sebrání je jen
záznam a poloha se u něj nebere. Proto patří v detailu nízko, a ne vedle
přesunu — a proto taky nemá smysl stavět ho na to, že loď u značky stojí.

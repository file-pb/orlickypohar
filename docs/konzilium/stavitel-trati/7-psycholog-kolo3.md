# Psycholog — kolo 3

## Rozhodnutí

**β — hlasuji pro 1: odklad padá celý. Měním tím svůj hlas z kola 2.**
Můj hlas stál na tom, že otázka položená za jízdy mezi konci nic nekrade,
protože v té době nic nemizí. Jenže v tom slotu teď stejně stojí otázka na
typ (uzavřeno), takže varianta do něj přibude **zdarma** — a tím mi důvod
mizí. Zisk odkladu je jedno klepnutí ve chvíli, která nemá hodiny
(1-ergonomie: poloha uložená, čtyři vteřiny `poloha.ts:40` doběhly). Cena
je otevřená smyčka bez vodítka, a odkládá se právě údaj, který z paměti
mizí nejrychleji: jestli ta brána byla otočná, se po čtyřiceti minutách na
vodě nepozná, dvě bóje vypadají stejně. K tomu 3-ux/2 — nikdo jiný ji
nedopíše. **Z nálezu 1 návrhu drží to podstatné:** pípnutí patří před
otázky uvnitř jednoho prvku; padá jen věta *„a i na to se dá odpovědět
později"*. *Podmíněně, jako 1-ergonomie:* řekne-li Filip, že se o prvcích
rozhoduje až na vodě podle větru, odklad být musí — pak platí strop jedna,
zápis na disk i zákaz dalšího pípnutí, všechny tři, jinak vůbec.

**δ — terč se mezi fázemi pohnout musí. Hlas pro 9-rizika.**
Palec, který už klesá, nemíří — **opakuje**; druhé klepnutí není
rozhodnutí, ale motorické zdvojení prvního. Do opakování se stavitel
dostane ještě před kartou: odesílání běží jen při otevření, po postavení
a po zahození (`stavba.tsx:156`–`160`) a `ZKOUSKA-STAVITELE.md:91`–`96`
to vede jako známé omezení, takže „nic se nestalo" je tam běžný zážitek.
A asymetrie není vyrovnaná: **minout je nesrovnatelně lepší než potvrdit
omylem.** Minutí nic nezmění a pozná se hned; zahození smaže měření, které
se nedá zopakovat, a po `zahod` (`fronta.ts:185`) se nedá ani
**pojmenovat**, co zmizelo — pozná se to až z pořadí na mapě. Ztráta,
kterou člověk neumí pojmenovat, se nepřičte klepnutí, ale celému nástroji.
Námitku 1-ergonomie proti míření beru a nemusí se jí platit: druhá fáze ať
nesedí na novém malém terči, ale **zabere místo hlavní akce karty** (celá
šířka, tam kde stálo *Zkusit znovu*), a místo po prvním klepnutí, dole
v klidové poloze palce, ať nese **nezhoubnou** volbu. Opakované klepnutí
pak potvrzení ruší, ne provádí; tím se kryje i nález 1/2. Vrácení po pěti vteřinách je v pořádku.

**α — bez výhrady**, s jednou podmínkou, která platila o znacích a platí
i o siluetách: ty tři tvary se už nikdy nesmějí změnit ani prohodit — celá
jejich hodnota je v tom, že se poznají bez čtení, a to je naučený návyk.

## Co nesmí spadnout pod stůl

Tři slovní stavy proužku musí být **věty z `posud`** (`poloha.ts:67`–`101`),
které kromě závady říkají, co udělat („Počkej, až telefon zaměří znovu.") —
stav, který jen pojmenuje potíž, přesouvá vinu na člověka, a u dobrovolníka
je to rozdíl mezi „čekám na družice" a „jsem neschopný". A pruh „zkouším
znovu" musí ukazovat, že to zkouší, a kdy naposled; mlčící nástroj se čte
jako mrtvý a vede přesně k té jediné nevratné akci.

## Výhrada

**403 se nesmí schovat do „zkouším znovu".** U 5xx a 502 je skrytá karta
správně, mizí samy. 403 samo nezmizí: 3-ux doložil (`index.tsx:493`,
`role.ts:26`–`28`, `Pomocnik.cs:140`–`143`), že se k obrazovce dostane
pořadatel cizí zastávky i dnešní pomocník, takže je to **běžný stav, ne
porucha**. Tiché opakování v něm znamená, že stavitel postaví celou trať,
nedozví se nic a odjede od vody s přesvědčením, že je hotovo — nejhorší
tvar rozdílu mezi tím, co obrazovka slibuje a co dodá. Buď 403 nese vlastní
větu, nebo musí podmínka 1 od 3-ux (obrazovka se neotevře nikomu, komu
server stavbu odmítne) platit **dřív**, než klasifikace začne mlčet.

# Ergonomie ovládání — kolo 3

## Rozhodnutí

**β — hlas pro 1: odklad padá celý, i pro variantu.**
Nový důvod, který v kole 2 nepadl: **varianta 2 neušetří ani jedno klepnutí.**
U brány je to v obou případech pípni → typ → pípni → varianta; 7-psycholog
jen posouvá čtvrté klepnutí za druhé pípnutí a kupuje za to **návrat** —
stavitel musí prvek v seznamu znovu najít a znovu do něj vstoupit. Návrat je
nejdražší pohyb, jaký měřím, a platí se tu za nula ušetřených klepnutí.
Druhý důvod je tvrdý: **bez varianty se body nedají
pojmenovat.** `jmenaBodu` je počítá z `volba.jmena`
(`stavba-prvku.ts:323–331`) a u dvoubodových se liší právě variantou —
„brána 3" u `Brana` a `OtocnaBrana` (`:265`, `:273`) proti „linie 3"
u `OtocnaZona` (`:281`). Řádek fronty přitom žádá `nazev` u každého bodu
(3-ux: `fronta.ts:28–46`) a modul sám píše, že *„jméno se po zápisu
nepřepisuje, protože záznam značky je měření"* (`:157–161`). Odložená varianta
je tedy buď zástupné jméno v měření, nebo přepis jména po zápisu — obojí
zakázané. **Podmínka z kola 2 platí:** řekne-li Filip, že se o prvcích
rozhoduje až na vodě, odklad být musí, ve tvaru 9-rizik se stropem jedna.

**γ — hlas pro osm.**
Věcná otázka je zodpovězená v kódu a odpověď je ano: strana je u průjezdní
bóje zapsaný údaj. Neplyne to jen z `VOLBY.jedna`
(`strana: PoLeve` / `PoPrave`, `stavba-prvku.ts:241–256`) a ze zápisu
(`stavba.tsx:215`), ale přímo ze serveru — `StranaPatri` jmenuje
`PrujezdniBoje` vedle otočné (`PrvekTrati.cs:283–284`) a chybová hláška to
říká slovy. Sedm řádků je tedy vnitřně nekonzistentních: u otočné se strana
ptá rovnou dvěma řádky, u průjezdní se tatáž otázka o témže údaji odloží do
doptání. Osm řádků tu nesrovnalost ruší a nestojí nic.
**Mezera 12 dp se vejde:** 103 (hlavička) + 66 (karta polohy) + 2 × 38
(návěstí) + 2 × (4 × 56 + 3 × 12) = **795 pt z 844** — ale jen když spodní
pruh nenese druhé tlačítko: s 52pt *Popíšu potom* je to 857 a roluje. γ tím
visí na β.
**Jedna věc k zápisu, plyne z téhož řádku serveru:** `StranaPatri` jmenuje
i `Odskok`, takže po opravě F2 nese stranu i on. Devátý řádek se při 12 dp
nevejde (875 pt), ať tedy odskok dostane doptání jako brána a start — tři
doptání, osm řádků. Je to nejřidší prvek na trati, klepnutí navíc patří jemu.

**δ — hlas pro: terč se mezi fázemi nepohne.**
9-rizika chce pohybem pokrýt nález 1/2, jenže ten je už pokrytý: F6 je přijatá
oprava a destruktivní terč se z klidové polohy palce stěhuje do hlavičky.
Uvnitř karty zádrhelu navíc ani jedna fáze v té poloze neleží — karta je
v rolovaném obsahu a spodní pruh drží jen pípnutí, takže scénář „palec, který
už klesá" se na ni nevztahuje. Zbývá tedy čistý dvojklep
z houpnutí lodi, a na ten je levnější odpověď než stěhování: **druhá fáze se
odemkne až po ~500 ms.** Odrazu zabrání, mířit nikoho nenutí. Rozhodne-li se
proti mně, vzniká na nejhůř ovladatelné obrazovce appky jediné místo, kde se
musí trefit přesunutý terč — a je to místo, kde se maže měření.

## Co nesmí spadnout pod stůl

`kontrola-dotyku.py` musí přestat připisovat každému řádku textu paušálních
20 pt (`:61`, `:179`) a číst `fontSize` z deklarace, kterou už rozpouští
(`deklarace()`, `:124`), počítat 1,2 × jeho hodnotu a paušál nechat jen tam,
kde se `fontSize` nenajde — jinak `minHeight: 44` spraví `chip` a `zahodit`
a příští terč se 13dp písmem projde znovu, přesně jako tyhle dva.
A protože rozšířit kontrolu znamená rozšířit její sabotáž: `Pressable`
s `fontSize: 13` a `paddingVertical: 12` musí nově spadnout — a ať je tam
zapsané i to, že `vyska()` měří jen výšku a šířku terče nehlídá nikdy, takže
úzké tlačítko dnes nekryje vůbec nic.

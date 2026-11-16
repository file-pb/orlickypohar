# UX — kolo 3

## Rozhodnutí

**β — hlas pro 2 (odkládá se varianta, ne typ).** Měním svůj hlas z kola 2
a říkám proč: 7-psycholog má argument, který jsem neměl — varianta se
odpovídá **za jízdy mezi konci**, tedy jediné chvíli celého toku, kdy
staviteli nic nemizí a neplave vedle něj objekt ve vodě. 1-ergonomie měří
hodiny („klepnutí má čas"), a v tom má pravdu; tohle je o místě, a tam
prohrává: doptání před popojetím padne přesně u bóje, kam motorák dojíždí.
Moje výhrada z kola 2 mířila na **neomezené** odložení, ne na tohle —
a uzavřené pravidlo („nejvýš jedno naráz, vynucené tím, že se dál nepípne")
ho omezuje samo. Hlasuju pro 2 **s jedním upřesněním, bez kterého hlasuju
pro 1**: ono „dál se nepípne" znamená *pípnutí nového prvku*; druhý konec
téhož prvku pípnout jde, protože nepřidává nic, co by se dalo zapomenout.
Volné *Popíšu potom* jako samostatný útěk neexistuje, jak žádá 9-rizika.

Podmínku 1-ergonomie si přebírám celou: platí to pro trať stavěnou podle
plánu. Řekne-li Filip, že se o prvcích rozhoduje až na vodě podle větru,
nemění to můj hlas — odklad varianty tím jen přestává být volba a stává se
nutností, a hranice zůstává tatáž.

**γ — hlas pro osm.** Ustupuju 1-ergonomii na věcné otázce, protože ji má
doloženou: `StranaPatri` zahrnuje `PrujezdniBoje`
(`PrvekTrati.cs:283–284`) a server stranu u typu, kam nepatří, odmítne
větou *„Strana se uvádí u otočné bóje, průjezdní bóje a odskoku"*
(`:338–339`). Sloučení *po levoboku* a *po pravoboku* do jedné *Průjezdní*
tedy maže údaj, který server ukládá a hlídá — a obrazovka, která ho neumí
zapsat, je přesně to, co jsem v kole 1 vytýkal opačným směrem. Sedm řádků
drželo jen tím, že jsem ten údaj považoval za volbu o rozjížďce; není to
volba, je to zápis.

**γ, mezera 2-designu: 12 dp se vejde.** Podle čísel 1-ergonomie je osm
řádků 735 pt na 844; z 6 na 12 dp přidá 7 × 6 = 42 pt, tedy 777 pt a 67 pt
zbývá. Platí to proto, že na obrazovce popisu **spodní pruh s *Pípni*
nepatří** — nové pípnutí je v tu chvíli zakázané uzavřeným pravidlem,
takže tlačítko by nabízelo úkon, který sám návrh zavřel. Kdyby se tam ten
pruh (92 pt) nakonec kreslil, 12 dp se nevejde a vejde se 8.

## Co nesmí spadnout pod stůl

Pomocník **musí** být pořadatelem kterékoliv zastávky ročníku
(`Pomocnik.cs:140–143`), takže ho `VELI` (`role.ts:23`) pustí a kartu
*Stavba trati* vidí na cizí zastávce **už dnes** — server mu tam odmítne
každý prvek (`StaviAsync`, `TratEndpoints.cs:537–540`), takže F3 není
příprava na chystanou práci, ale živá vada pro lidi z K8, kteří existují.
A příznak `smiStavet` nesmí viset na `GET …/trat`: ten vrací 404, dokud
regata nemá ani jednu bóji, tedy chyběl by přesně u prvního prvku trati.

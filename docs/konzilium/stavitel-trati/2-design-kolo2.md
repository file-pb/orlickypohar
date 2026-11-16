# Vizuální design — kolo 2

Měřeno proti `app/src/constants/theme.ts`, obě sady, WCAG 2.2; barvoslepost Machado 2009, závažnost 1,0. Jmenovaný jsem u C, D, E a u F bodu 7.

## Kde ustupuju

- **C, psychologovi: trvalé číslo přesnosti ruším.** V kole 1 jsem psal, že
  proužek drží SC 1.4.1 tím, že nese **číslo a větu**. Drží ho ta **věta** —
  `tlumeny` `#5d666f` na `pozadi` je 5,60:1 a při 15 dp se čte sama. Číslo
  k bezbarvé čitelnosti nepřidává nic a skákající hodnota si bere salienci
  vyhrazenou jediné plné ploše. Trvale slovo, číslo u akce.
- **E, ergonomii: znak uvnitř tečky ruším.** Po C nese stav slovo, takže
  tečka nemusí být čitelná sama o sobě a nemá smysl do ní cpát symbol,
  který se v rukavicích na paži stejně nepřečte.
- **D, rizikům: pořadí akcí v kartě zádrhelu je jejich.** *Zkusit znovu*
  smí být vizuálně hlavní akcí té karty. Rozlišení vady prvku od vady
  okolností je věcné rozhodnutí, do kterého mi nic není; já hlídám jen,
  z čeho je ta hlavní akce udělaná (viz Kde držím, D).

## Kde držím

### C — stav polohy musí mít trvale **slovo**, a ta tři slova musí být tři

Psycholog chce v proužku „tři stavy". Když se ty tři stavy odliší jen
tečkou, vrací se nález 2/2: `vystraha` `#8a5000` a `stavZruseny` `#a8433a`
mají mezi sebou **1,09:1**, při protanopii **1,00:1**; `jede`/`vystraha`
1,03:1. **Ve světlé sadě neexistuje token**, který by od `vystraha` (jas
0,1114) držel 3:1 na tmavé straně — vyžadovalo by to jas ≤ 0,0038.
Rozhodne-li se proti mně, stav polohy pro ~8 % mužů nenese **nic**:
tečka splyne a slovo tam nebude.

**A číslo u tlačítka nesmí skončit na té modré ploše ztlumené.** Bílá na
`light.voda` při 72 % krytí (vzor `sPruhlednosti` v `zavodnik.tsx:292`)
dává **3,79:1** — pod 4,5:1 pro malý text. Číslo patří nad tlačítko na
`pozadi` (`tlumeny` 5,60:1), ne do něj.

### D — hlavní akce karty ano, **barevná plocha ne**

Moje pravidlo neříká „jedno tlačítko", říká **jedna sytá plocha na
obrazovku**. Obojí se splní naráz: *Zkusit znovu* jako plná plocha
z tokenu `text` — ve světlé `#1a1d21`, v tmavé `#edeae5`, tedy neutrál
v obou, popis z `pismoNaVyplni(t, t.text)` (16,91:1 světlá, 14,99:1 tmavá;
týž vzor už je v `zavodnik.tsx:284`). Jediná **barevná** plocha zůstane
pípnutí a hierarchie sytosti drží.

Co držím tvrdě: **destruktivní akce nikdy jako plná plocha.** Bílá na
`dark.stavZruseny` `#e2726a` je **3,07:1** a 17 dp/700 je pod mezí velkého
písma (18,66 dp), takže platí 4,5:1 — propadá. *Zahodit* je text
`stavZruseny` bez výplně (5,70:1 světlá, 5,87:1 tmavá) s `minHeight: 44`,
pod *Zkusit znovu*. Rozhodne-li se pro červenou výplň, má appka v tmavém
režimu nečitelné právě to tlačítko, které maže nenahraditelné měření.

### E — ploška ano, ale stavy se musí lišit **jasem**, ne odstínem

Ergonomii dávám za pravdu v tom, že se nemá číst symbol. Nedávám jí za
pravdu v tom, že stačí „prázdná barevná ploška": tři odstíny se od sebe
neliší (viz C). Kompromis: **20 dp**, a stavy se liší siluetou, ne
znakem — **plný disk / kroužek 3 dp / kroužek s diagonálou**. To se
nečte, to se pozná, a funguje to i tam, kde odstín selhal na 1,00:1.
Odstín zůstává jako druhý kanál.

### Nález 2/4 (barvy bójí) — moderátor ho nechal stát, takže zůstává

Měření beze změny: žlutá bóje `pripravaZnameni` na `papir` **1,68:1**,
s rámem `#c9922f` **2,75:1** — pod 3:1, ve světlé sadě neviditelná,
v tmavé 9,88:1. Dvoubarevná brána `#a8433a` proti `#1f6f8b` **1,05:1**.
Platí i tehdy, když barva bóje nakonec nic neznamená.

## Kde jsme se shodli

- **F7:** potvrzuju. Popis i `stroke` ikony z `pismoNaVyplni(t, t.voda)`.
  Dodávám jednu věc, kterou nikdo neřekl: `app/testy/kontrast.test.ts`
  měří **jen proužky znamení na panelu odpočtu**, takže návrat téhle
  chyby by CI nechytila. Test patří rozšířit o páry, které stavitel
  zavádí (výplň `voda` / `linka` / `text` × `pismoNaVyplni`, tečka proti
  `papir` i `pozadi`).
- **F1 (`minHeight: 44`):** z mé strany bez výhrad — 13 dp písmo je
  i typograficky pod mezí, kterou bych na vodě připustil.
- **D, rizika, nález 1:** rozdělení odmítnutí na vadu prvku a vadu
  okolností beru celé; mění se tím jen to, která akce je v kartě první.
- **C:** proužek drží trvale **text** stavu, číslo se ukazuje u akce.
- **A, B, G:** nemám hlas a nepřidávám ho.

## Nové, co vylezlo z cizích posudků

1. **Rolující seznam voleb nemá čím ohlásit, že roluje.** Ergonomie (1/1)
   počítá jedenáct řádků ≈ 1 010 pt na 844pt obrazovku. Řádek i mezera
   jsou dnes neviditelné: `papir` proti `pozadi` **1,04:1**, rám `linka`
   **1,26:1**. Useknutý řádek na dolní hraně je jediná obvyklá nápověda,
   že je dole ještě něco, a při těchhle číslech ji nebude vidět. Z mého
   oboru je to další argument pro **sedm řádků** (spor B): jedenáct by
   potřebovalo viditelnou hranu seznamu, a tu sada tokenů na 3:1 neumí.
2. **Odpověď ergonomii na její otázku (1/„Co bych potřeboval vědět"):**
   56pt řádek se 6pt mezerou je **jako terč** v pořádku, ale **vidět ho
   není** — hrana 1,26:1, mezera 1,04:1. Člověk proto nemíří na řádek,
   míří na text, tedy na ~18 dp vysoký pruh uprostřed 56 dp. Spraví to
   odstup, ne rám: **mezera 12 dp** místo 6 a rám u voleb vypustit.
3. **Psychologova věta o stavu odjezdu (7/4) se nesmí stát druhým blokem
   nahoře.** Proužek 41 dp plus druhá věta dá ≈ 70 dp; při šířce 358 dp
   to je 25 060 dp² proti 30 788 dp² hlavní akce, tedy **81 %** její
   plochy — nahoře by vznikl soupeř. Patří do návěstí skupiny, které už
   existuje: *CO UŽ STOJÍ* → *NA TRATI 3 · V TELEFONU 1*, 15 dp místo
   13. Zadarmo, u seznamu, kterého se to týká.

## Podmínka

1. **Žádný stav nenese jen odstín.** Ke každému stavu patří slovo a druhý
   bezbarvý kanál (silueta, poloha, tloušťka rámu). Není to vkus: ve
   světlé sadě je to měřitelně neřešitelné — od `vystraha` nedrží 3:1 na
   tmavé straně žádný token, a `vystraha` proti `stavZruseny` je při
   protanopii 1,00:1.
2. **Nic nepokládá písmo ani grafiku na výplň napevnou barvou.** Všechno,
   co leží na ploše, bere barvu z `pismoNaVyplni`, a `kontrast.test.ts`
   se rozšíří o páry stavitele. Bez toho jde do tmavé sady hlavní akce
   s **2,35:1** — a pravidlo 6 návrhu z ní dělá jediný nosník hierarchie.

Podmíněně k otázce na zadavatele: **je-li** appka někdy v tmavém režimu,
platí obě podmínky; **není-li**, padá podmínka 2 a podmínka 1 zůstává celá,
protože barvoslepost na režimu nezávisí. Bez Filipovy odpovědi se staví
přísnější varianta — stojí jedno volání funkce, která už existuje.

# Vizuální design — kolo 1

Vše níž je měřeno proti `app/src/constants/theme.ts` (obě sady) vzorcem
WCAG 2.2; barvoslepost simulována Machado 2009, závažnost 1,0. Makety
nesou jen světlou sadu, takže tmavá je posouzená z tokenů.

## Co je dobře

1. **Hlavní akce je největší věc na obrazovce a nese to, co mizí.** 86 dp
   výšky, popis 26 dp/800, jediná plná plocha. Hierarchie tím konečně něco
   tvrdí: poloha je jediná pomíjivá věc (`poloha.ts:37`) a má nejvyšší
   vizuální váhu. Tohle je na návrhu nejlepší rozhodnutí.
2. **Stav polohy nese číslo a větu, ne jen barvu.** „±4 m · poloha je
   čerstvá" drží SC 1.4.1 i tehdy, když tečka nic neřekne — a ona neřekne,
   viz nález 2.
3. **Zádrhel fronty se liší tvarem, ne odstínem.** 2 dp rám `stavZruseny`
   na `papir` = 5,95:1, dvojnásobná šířka proti ostatním prvkům. Překážku
   od oznámení odliší i v šeru a i bez barvy.
4. **Rozestavěná brána staví „stojí" proti „chybí" plným a přerušovaným
   rámem.** Dashed vs. solid je kanál, který přežije slunce i barvoslepost;
   barva (`jede` vs. `voda`) je jen doplněk. Správné pořadí kanálů.
5. **Zámek nese následek v textu.** Jantarová je příznak, ne nosič; rám
   1 dp `vystraha` na `zvyrazneni` = 5,72:1.

## Co je špatně

### 1. V tmavé sadě je hlavní akce nečitelná — 2,35:1

- **Nález.** Makety mají popis i obrys ikony napevno `#ffffff` na `voda`
  (`navrh/Main.dc.html`, `Fronta.dc.html`, `Dvoubod.dc.html`). Ve světlé
  sadě `voda` = `#1f6f8b` → bílá 5,67:1, v pořádku. V tmavé je `voda` =
  `#6bb3cc` → bílá **2,35:1**. To padá i pod mez 3:1 pro velké písmo
  a grafiku, tedy pod obě možné meze. Tmavé písmo (`dark.pozadi`
  `#14171a`) dává na téže ploše **7,66:1**.
- **Proč to vadí.** Pravidlo 6 návrhu z téhle plochy dělá **jediný**
  barevný prvek obrazovky — celá nová hierarchie visí na ní. V tmavém
  režimu tedy nejde o jeden slabý prvek, ale o to, že obrazovka přijde
  o kotvu. A appka tuhle chybu už jednou měla a opravila: `app/src/lib/
  kontrast.ts:66` (`pismoNaVyplni`) vznikl 30. 10. 2026 přesně proto, že
  bílá ležela napevno na `jede` (2,07:1) a `vystraha` (2,75:1). Maketa ten
  vzorec obchází.
- **Návrh.** Popis i `stroke` ikony brát z `pismoNaVyplni(t, t.voda)`, ne
  z konstanty. Ikona je grafika a platí pro ni táž mez.

### 2. Obě stavové barvy návrhu jsou pro barvoslepého jedna barva

- **Nález.** Pravidlo 6 říká „červená = stojí, oranžová = pozor". Měřeno:
  `vystraha` `#8a5000` a `stavZruseny` `#a8433a` mají mezi sebou **1,09:1**
  při normálním vidění, **1,00:1** při protanopii (simulace: `#625600` vs.
  `#5d5639`) a 1,14:1 při deuteranopii. Trojice tečky v proužku stavu je
  ještě horší: `jede`/`vystraha` = **1,03:1**. V tmavé sadě totéž:
  `vystraha`/`stavZruseny` 1,11:1, při deuteranopii 1,06:1.
- **Proč to vadí.** Ve světlé sadě **neexistuje token**, který by od
  `vystraha` (jas 0,1114) držel 3:1 na tmavé straně — vyžadovalo by to jas
  ≤ 0,0038, a nic takového v sadě není. Odstín tedy tenhle stav nemůže
  nést nikdy, ani po přebarvení. Dnes to nic nehlídá:
  `app/testy/kontrast.test.ts` měří jen proužky znamení na panelu odpočtu.
- **Návrh.** Tečka nese stav **znakem**, ne odstínem: plný disk = čerstvá,
  vykřičník = slabý signál, kříž = žádná poloha. Na znak je 12 dp málo —
  zvětšit na 20 dp. Odstín zůstává, ale jako druhý kanál.

### 3. Karta nemá viditelnou hranu, a nový řád stojí právě na ní

- **Nález.** `papir` `#ffffff` proti `pozadi` `#fbfaf8` = **1,04:1**; jediné,
  co kartu ohraničuje, je 1 dp `linka` `#e2e0dc` = **1,32:1** na papíru
  a **1,26:1** na pozadí. V tmavé sadě totéž: `papir`/`pozadi` 1,09:1,
  `linka`/`papir` 1,28:1. Mez SC 1.4.11 pro grafiku je 3:1.
- **Proč to vadí.** Nález 6 návrhu správně pojmenuje, že „všechno má týž rám
  o jednom pixelu" — a jeho vlastní řešení („volby bílé s tenkým rámem",
  „informace bez rámu") si makety popřou: v `Main.dc.html` má 1 dp `linka`
  každý řádek seznamu, proužek stavu i karta vzdálenosti. Při 1,26:1 to na
  slunci není tenká linka, je to nic — takže obrazovka nemá čtyři skupiny,
  má jednu plochu s textem.
- **Návrh.** Informační řádky bez rámu, oddělené mezerou 8 dp a návěstím
  skupiny zvětšeným z 13 dp na 15 dp. Rám nechat **jen** tam, kde nese stav
  (2 dp `jede` / `vystraha` / `stavZruseny`, všechny ≥ 5,4:1 v obou sadách)
  — tím se z rámu stane znak, a ne tapeta.

### 4. Barvy bójí si půjčují cizí tokeny a jedna z nich není vidět

- **Nález.** Makety barví bóje `pripravaZnameni` `#f2c14e` (token
  **přípravného znamení**) a `stavZruseny` `#a8433a` (token **zrušené
  rozjížďky**). Žlutá bóje na papíru má 1,68:1, s rámem `#c9922f` 2,75:1 —
  pod 3:1, tedy v světlé sadě **neviditelná**; v tmavé 9,88:1, takže týž
  prvek je jednou silný a jednou žádný. Dvoubarevná ikona brány staví
  `#a8433a` proti `#1f6f8b` = **1,05:1** (tmavá sada 1,31:1), takže se čte
  jako jeden 29×22 dp flek, ne jako dva konce.
- **Proč to vadí.** Můj obor stojí na tom, že barva znamená pořád totéž.
  `stavZruseny` je v appce „rozjížďka zrušena" a tady levý konec brány;
  `jede` je „rozjížďka běží" a tady „odesláno". Obrazovka přitom vzniká
  vedle cílové obrazovky, kde `tridaRace` a spol. **dostaly vlastní tokeny**
  právě ve chvíli, kdy barva dostala novou roli (komentář v `theme.ts`).
- **Návrh.** Barvu z ikon vypustit a prvek odlišit tvarem (plný kruh,
  kroužek, dvojice, S, C). Pokud má barva bóje nést skutečnou barvu bóje na
  vodě, musí dostat vlastní token a projít na web — `tools/kontrola-tokenu.py`
  jinak nasazení zastaví.

### 5. Destruktivní akce je druhá plná barevná plocha, a v tmavé padá

- **Nález.** `navrh/Fronta.dc.html` má dvě plné plochy: „Zahodit prvek 5"
  (`stavZruseny`, bílé 17 dp/700) a modrou hlavní akci. Bílá na
  `light.stavZruseny` = 5,95:1 projde; na `dark.stavZruseny` `#e2726a` =
  **3,07:1**, a 17 dp/700 je pod mezí velkého písma (18,66 dp), takže platí
  4,5:1 — propadá.
- **Proč to vadí.** Pravidlo 6 říká „jedna plná barevná plocha na
  obrazovku". Druhá plocha ten zápis ruší a navíc dává zahození stejnou
  váhu jako jediné akci, kterou stavitel dělá pořád.
- **Návrh.** Zahození jako obrysové tlačítko: text `stavZruseny` + 2 dp rám
  na `papir` (5,95:1 světlá, 5,41:1 tmavá). Plnou plochu si drží jen pípnutí.

### 6. Na rozestavěné bráně je váha obrácená

- **Nález.** „63 m" má 34 dp/800, ale slovo **„roste"** — tedy to, co říká,
  jestli stavitel popojíždí správným směrem — je 14 dp v `tlumeny`. Trvalý
  stav polohy má přitom 17 dp/700, zatímco pomíjivá vzdálenost 34 dp.
- **Proč to vadí.** Nález 4 návrhu říká, že vzdálenost je zpětná vazba,
  kterou stavitel dnes nemá odnikud. Typografie z ní dělá poznámku pod
  čarou a směr změny — jediné, co se v pohybu čte — schová do nejmenšího
  stupně na obrazovce.
- **Návrh.** Jedna řádka 34 dp/800 se znakem směru v témž stupni: `↑ 63 m`.
  Slovní „roste" zrušit; `tlumeny` nechat jen čerstvosti.

## Co bych potřeboval vědět

- **Zadavateli (Filip).** Jede telefon ráno na vodě v tmavém režimu? Celá
  tmavá polovina tohohle posudku je odvozená z tokenů; kdyby byla obrazovka
  natvrdo světlá, nálezy 1 a 5 padají. A mají barvy bójí na Orlíku
  skutečný význam (žlutá otočná, červený/modrý konec brány), nebo jsou
  v maketě ozdoba? Na tom visí nález 4.
- **Ergonomii (1).** Unese tečka 20 dp znak, nebo je na paži v rukavicích
  čitelnější prázdná barevná ploška a stav patří jen do slov?
- **Rizikům (9).** Je přípustné, aby `pripravaZnameni` — token znamení —
  barvil bóji? Obrazovka znamení a obrazovka stavby budou vedle sebe.
- **UX (3).** Má být proužek stavu polohy klepací? Pokud ano, dostává
  rozměr klepacího cíle a moje „bez rámu" se na něj nevztahuje.

## Čeho se nedotýkám

- Počet kroků, pořadí otázek a sloučení typu s předpisem — obor 1.
- Formulace textů, prázdné stavy a chování při chybě — obor 3.
- Jestli je „pípnutá, ale nepopsaná" bezpečný stav — obory 7 a 9.
- Jestli se smí rozdělit `packages/stavba/` — obory 1 a 9.
- Klepací rozměry nad 44 pt — hlídá `tools/kontrola-dotyku.py`.
- Věcná správnost jmen prvků a souřadnic v maketách.

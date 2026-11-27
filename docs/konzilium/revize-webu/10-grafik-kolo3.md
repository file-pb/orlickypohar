# 10-grafik — kolo 3

## Rozhodnutí

- **δ — na fotce stojí stavová věta. Hlas: 1.** V 19,2 px / 700 má váhu,
  kterou text na obraze potřebuje, a ve dvou ze čtyř zkoušených znění je na
  jednom řádku (238 a 313 px v 335); věta pro cizího má 16 px a je vždycky
  na dva řádky (445 px) — drobný dvouřádkový text patří na čisté pozadí.
- **ε — tlačítka se jmenují podle cíle a fáze. Hlas: 2.** Měním stranu:
  „Chci závodit" jsem převzal od 8-pr a on ho sám pustil. Z mého oboru stačí,
  že se popisek vejde na jeden řádek: tlačítko má 161 px, na text zbývá
  126 px, nejdelší „Konečné pořadí" má 118 px (16 px / 600, změřeno na 375).
  Tvar a místo se s fází nemění, mění se jen slovo.
- **ζ1 — výstraha mimo den regaty pruh nelepí. Hlas: 1.** Ustupuju ze své
  dvojky: „týká-li se plavby" chce třídění výstrah, které nikdo nenapsal,
  a jedno pravidlo (den regaty) je to, co udrží rám lehčí než obraz.
  Výstraha zůstává čitelná v bloku počasí na stránce.
- **ζ2 — v den regaty lepí na všech veřejných stránkách. Hlas: 1.** Rám se
  během jedné návštěvy nemá měnit podle stránky; pruh, který mezi regatou
  a pořadím mizí a vrací se, je horší než pruh, který ten den prostě je.
- **κ — Orlický pohár. Hlas: 1.** Adresa i appka to jméno ponesou tak jako
  tak, takže „Orlická série" by jméno nenahradila, jen přidala. Kresba
  nápisu existuje pro obě (`znacka-loga.ts`, `znacka-napis.ts`), z mého oboru
  tedy žádná nestojí víc. Vyhraje-li dvojka, platí totéž: jedno jméno všude,
  „Orlik Yacht Series" jen uvnitř kruhu.

## Co nesmí spadnout pod stůl

Tokeny dřív než obrazovky: pět kroků písma, tři poloměry a poloha výřezu
zvlášť pro každou fotku patří do `globals.css` před první opravou, jinak
každá oprava přidá další hodnotu. A čtyři věci z kola 1, které nikdo
nenapadl a nejsou v žádném seznamu: vodoznak jen na veřejných stránkách od
1180 px, rozsypaný sloupec „Novinky" na 1280 px (`boky.tsx`), uříznutý štítek
„potvrzená" na přihláškách (375 px) a novinka bez fotky jako karta jen
s textem.

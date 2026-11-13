# Listing v Google Play

Texty a grafika pro stránku appky v obchodě. Leží to tady, aby se to
nevymýšlelo v konzoli v jedenáct večer a aby bylo v diffu vidět, co se
změnilo — stejný důvod, proč se značka kreslí kódem.

**Grafiku nedělej ručně.** `ikona-512.png` i `feature-1024x500.png` kreslí
`scripts/ikona.py` ze stejné značky jako ikonu appky; po každé úpravě
značky stačí skript pustit znovu:

```bash
cd app && python3 scripts/ikona.py
```

## Než se dá nahrát cokoliv

Účet. Ověřeno 13. 11. 2026 ze stránek nápovědy Play, odkazy u každého bodu.

| Co | Jak to je |
|---|---|
| Kde | `play.google.com/console/signup` (nápověda `answer/6112435` odkazuje na starší `play.google.com/apps/publish/signup`; obojí vede do téhož) |
| Kolik | **25 $ jednorázově**, kartou Visa, Mastercard nebo Amex. **Předplacené karty obchod nebere.** Když Google vyhodnotí údaje jako neplatné, poplatek nevrací (`answer/6112435`) |
| Jaký typ | **Osobní**, ne organizace. Organizace vyžaduje číslo D-U-N-S, jehož přidělení trvá až 30 dní, a je povinná jen pro finanční, zdravotní, VPN a vládní aplikace (`answer/13634885`, `answer/13628312`) |
| Co bude veřejně vidět | Jméno vývojáře, právní jméno, **země** a e-mail vývojáře. **Celou adresu zveřejní Google jen tehdy, když na appce vyděláváš** — u bezplatné zůstane jen země (`answer/13628312`) |
| Ověření | Úřední doklad totožnosti, právní jméno a adresa z platebního profilu, jednorázové kódy na e-mail i telefon. Navíc se ověřuje **přístup ke skutečnému Androidu** přes aplikaci Play Console Mobile. Ověření platební metody až 5 dní; celkovou dobu nápověda neuvádí (`answer/10841920`, `answer/13628312`) |
| Jméno vývojáře | Veřejné jméno vydavatele, **oddělené pole od právního jména** a jde ho **kdykoliv změnit** („can be changed any time", `answer/13628312`). Právní jméno se na Play zobrazí tak jako tak, takže se jím nic neschová. Konzole u „Filip Burda" hlásí, že jméno existuje — **proč, nápověda neříká**, o unikátnosti jmen v ní není ani slovo (hledáno 13. 11. 2026 v `answer/13628312`, `13634888`, `10841920`, `6112435`) |
| Vlastnictví účtu | **Nepřevádí se.** FAQ `answer/13634888`: „account ownership can't be transferred. If the wrong account owner has been verified, a new account must be created." Pod kterým Google účtem se registruješ, je tedy rozhodnutí na jednou. Další lidi jde k účtu pozvat jako Admin nebo User a **ti už 25 $ neplatí** (`answer/9844686`) |
| Ověření zařízení | Kromě dokladu se ověřuje i **přístup k telefonu s Androidem** — přihlášením v aplikaci Play Console, která je jen pro Android. Musí to být **fyzické, nerootované zařízení s Androidem 10+**; trvá to pod minutu a jedno zařízení může ověřit víc účtů (`answer/14316361`) |
| Lhůty | Ověření identity má **individuální termín a jeho datum je vidět jen v konzoli** — nápověda uvádí jen to, že ověření jde dokončit 60 dní před ním (`answer/10841920`). Ověření zařízení žádnou lhůtu uvedenou nemá. Neaktivní účet se ruší nejdřív rok po založení, s upozorněním 60, 30 a 7 dní předem (`answer/11605267`). Jestli se poplatek vrací při zmeškané lhůtě, nápověda neříká |
| Dvanáct testerů na 14 dní | Platí pro osobní účty založené po 13. 11. 2023, a **jen pro produkci**. U interního testování je v tabulce „Requirements to access track: None“ (`answer/14151465`) |

**Pod kterým Google účtem se registruješ, si rozmysli předem.** Jestli se
účet dá později převést na jiný, nápověda na přečtených stránkách neříká —
nenašel jsem o tom ani slovo, tak s tím nepočítej.

## Název

Nejvýš 30 znaků.

```
Orlický pohár
```

## Krátký popis

Nejvýš 80 znaků. Zobrazuje se nad tlačítkem Instalovat, takže je to ta
jediná věta, kterou si přečte každý.

```
Výsledky, kalendář a průběžné pořadí seriálu závodů plachetnic na Orlíku.
```

## Dlouhý popis

Nejvýš 4000 znaků.

```
Orlický pohár je seriál závodů plachetnic na Orlické přehradě. Tahle appka je jeho program, výsledková tabule a lodní deník v jednom — totéž co na orlickypohar.klihovka.cz, jen po ruce na břehu.

Co v ní najdeš

• Kalendář ročníku: kdy a kde se jede, co je potvrzený termín a co teprve vypsaný závod.
• Výsledky rozjížděk a body za každou zastávku, včetně kódů závodních pravidel jako DNF nebo OCS.
• Průběžné pořadí seriálu i se škrty, takže je vidět, jak ročník stojí po každém závodě.
• Lodě a posádky: kdo s kým jede a v jaké kategorii.
• Moje regata — co se dnes jede, v jakém stavu je rozjížďka a jaké pokyny dala závodní komise. Pro posádku, která stojí na vodě a potřebuje vědět, co se děje teď.
• Upozornění na start, když si je zapneš.
• Zvukové znamení k odpočtu startovní procedury.

Pro posádky

Appka umí zaznamenat trasu lodi během závodu. Záznam si pouští posádka sama a sama ho ukončí. Běží i se zhasnutým displejem, protože závod trvá hodiny a telefon leží v kapse nebo pod plachtou — proto si appka řekne o oprávnění k poloze „Vždy". Zaznamenaná trasa je podklad pro rozhodčího a k protestu; divákům se ukáže jen tehdy, když rozhodčí živý přenos povolí. Dokud záznam nespustíš, appka polohu nečte.

Co v ní není

Žádná reklama, žádné měření návštěvnosti, žádné sledovací skripty. Ke čtení výsledků se nemusíš přihlašovat a appka je zdarma.

Co se sbírá, komu se to ukáže a jak dlouho to zůstane, je popsané na orlickypohar.klihovka.cz/osobni-udaje.
```

**Do textu nepatří** superlativy typu „nejlepší", odkazy na jiné obchody,
prázdná klíčová slova ani slíbené funkce, které appka nemá — na tohle Play
listing odmítá.

## Ostatní pole

| Pole | Co tam dát |
|---|---|
| Kategorie | Sport |
| Zásady ochrany osobních údajů | `https://orlickypohar.klihovka.cz/osobni-udaje` |
| Kontaktní e-mail | **Tvoje volba, a bude veřejný.** Nevyplňoval jsem ho za tebe; osobní adresa na stránce appky zůstane každému na očích |
| Web | `https://orlickypohar.klihovka.cz` |

## Co ještě chybí a odsud se to udělat nedá

- **Snímky obrazovky**, 2 až 8 kusů z telefonu. Nejlíp Ročníky, průběžné
  pořadí, Moje regata a Záznam trasy — tedy to, co popisuje dlouhý text.
- **Video do 30 sekund** k deklaraci polohy na pozadí. Musí ukázat zapnutí
  funkce, sdělení o poloze a systémový dotaz za ním. Podrobnosti v
  `docs/PLAN.md`, oddíl *Co z licencí plyne za práci*.

Obojí chce telefon s nainstalovaným APK ze stránky `/appka`.

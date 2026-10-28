# Příručka: jak si Miloš přeinstaluje appku (28. 10. 2026)

Text níž je **pro rozhodčího, ne pro vývojáře** — píše se tak, aby šel
poslat do WhatsAppu beze změny. Vzniknul proto, že od 28. 10. 2026 se
appka umí aktualizovat sama, ale **jednou se musí přeinstalovat ručně**:
stará verze v telefonu tu schopnost v sobě nemá.

Proč to nejde říct jen „stáhni si novou verzi": instalace mimo obchod
Androidu je pro laika past na třech místech — prohlížeč se zeptá, jestli
soubor opravdu chce, systém se zeptá, jestli věří zdroji, a Samsung to
rovnou zakáže hláškou, která zní jako virová výstraha. Kdo to nečeká,
skončí u druhého kroku.

---

## Text k poslání

> Ahoj Miloši, mám pro tebe novou verzi appky. Je v ní všechno, co jsme
> spolu minulý týden probírali.
>
> **Tohle je naposled, co ji musíš instalovat ručně.** Od téhle verze se
> už bude aktualizovat sama — příště jen otevřeš appku a bude nová.
>
> Co udělat:
>
> 1. V telefonu otevři **orlickypohar.klihovka.cz/appka**
> 2. Klepni na tlačítko ke stažení. Telefon se zeptá, jestli soubor chceš
>    — dej **Stáhnout**.
> 3. Až se stáhne, klepni na něj (nebo na oznámení o stažení).
> 4. Telefon se zeptá, jestli chceš nahradit stávající aplikaci —
>    dej **ano**. Nic nepřijdeš: tvoje lodě i rozepsané věci zůstanou.
>
> **Jestli to telefon zablokuje:** napíše něco jako „Neznámá aplikace je
> blokována" nebo se zeptá, jestli tomuhle zdroji věříš. To je normální,
> protože appka není z obchodu Google Play. Stačí v té hlášce klepnout na
> **Nastavení** a povolení zapnout; telefon tě tam sám navede. Na
> Samsungu to bývá v *Nastavení → Zabezpečení a soukromí → Automatické
> blokování*. Po instalaci se to dá vrátit zpátky.
>
> Jestli to někde zaseknu, zavolej mi a projdeme to spolu.

---

## Co k tomu vědět (pro Filipa, neposílat)

- **Aktualizace se stahují při startu appky** a projeví se při dalším
  otevření — ne okamžitě uprostřed používání.
- **Samy se přenesou jen změny v appce**, ne nová oprávnění nebo
  knihovny. Když přijde taková změna, bude potřeba nové APK znovu —
  appka si o něj ale neřekne sama, takže to pozná jen ten, kdo to staví.
- **Dokud Miloš nepřeinstaluje, nic z toho pro něj neplatí.** Jeho
  současná verze aktualizace neumí a tváří se stejně.
- Stránka `/appka` nabízí vždycky poslední postavené APK; adresa se do ní
  zapisuje ručně (`deploy/docker-compose.yml`, `APK_URL`), takže když se
  na to zapomene, nabízí tiše starý build. Stalo se to mezi 8. 9. a
  28. 10. 2026.

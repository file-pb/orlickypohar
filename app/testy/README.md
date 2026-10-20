# Testy záznamu trasy

```
npm run testy
```

Běží na Node, ne v telefonu: `expo-sqlite`, `expo-file-system` a `expo-sharing`
jsou nahrazené (`nahrady/`), SQLite dělá vestavěné `node:sqlite`. Testuje se
tím **naše** SQL, dotazy a výpočty — ne knihovna.

## Co prokazují

| Přejímací podmínka pilotu | Co test ověří |
|---|---|
| 2 — systém zabil appku v půlce závodu | zapsaná část a stav „běží" přežijí **konec procesu**: dva samostatné procesy nad jedním souborem |
| 5 — posádka zapomene záznam ukončit | ostříhání smaže body po hranici a dřívější nechá; smazané jsou fyzicky pryč |
| čas je z telefonu a dá se přestavit | skok hodin se pozná a **žádný bod se nezahodí** |
| „musí být způsob, jak se na výsledek podívat" | přehled dá počet, rozsah, délku, vzorkování; GPX nic nedomýšlí |

## Co neprokazují

- **Podmínku 1** (zamčený telefon, spotřeba) ani druhou polovinu podmínky 2
  (záznam **pokračuje** po zabití appky). To umí jedině úloha na pozadí
  v APK na skutečném telefonu — tady se zkouší jen persistence zápisu.
- **Podmínky 3 a 4** (výpadek, doposlání, přerušené nahrání). Pilot zatím
  nahrávání nemá, takže není co testovat.
- Chování `expo-sqlite`. Časy z testu dlouhého záznamu vypovídají o našem
  SQL, ne o výkonu na telefonu.

## Co ověřit na telefonu

Na vývojovém Macu není Xcode ani Android SDK (20. 10. 2026), takže appka
se nativně nespustí a tohle se musí projít v APK (`npm run apk`). Postup je
tu proto, aby se příště nevymýšlel znovu.

**Podmínka 2 — systém zabil appku v půlce závodu.** To je ta, kvůli které
pilot začal tímhle.

1. Spustit záznam (`Trasa` → jméno lodi → *Spustit záznam trasy*). Oprávnění
   k poloze musí být **Vždy**, ne „jen při používání".
2. Nechat chvíli jet a zapsat si počet bodů.
3. V přehledu úloh appku **odsunout** (swipe) — tím ji Android zabije.
   Oznámení služby na popředí musí zůstat.
4. Počkat pár minut a appku otevřít znovu.
5. Záznam musí být **pořád ve stavu „běží"**, počet bodů **vyšší** než
   v bodě 2 a mezera v časech nejvýš jedno vzorkování. Tím je prokázané obojí:
   zapsaná část přežila **a** záznam pokračoval.

Když oznámení po odsunutí zmizí, je chyba v `killServiceOnDestroy` nebo
v oprávnění na pozadí — ne v zápisu.

**Podmínka 1 — zamčený telefon a spotřeba.** Záznam spustit, telefon zamknout
a nechat ležet; na začátku a na konci si opsat procenta baterky. Hodinu stačí
na odhad, pro dvacetičtyřhodinovku se spotřeba vynásobí. Vzorkování je dnes
5 s (`INTERVAL_MS` v `src/lib/tracker/uloha.ts`) — pokud to baterku snědlo,
je to ten knoflík, kterým se to řeší.

**Simulovaná plavba** (*Spustit simulovanou plavbu*) nepotřebuje oprávnění ani
signál a projde zápis, přehled, ostříhání i GPX. Prokázat podmínku 1 a 2
ale neumí: běží v kontextu obrazovky, takže se zabitím appky skončí.

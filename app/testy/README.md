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

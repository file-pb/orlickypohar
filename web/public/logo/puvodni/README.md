# Původní logo Orlického poháru

Plachty s obloukem a nápisem „Orlický pohár". Na webu bylo do 22. 9. 2026,
pak ho nahradilo logo Orlik Yacht Series od rozhodčího seriálu
(`../orlik-yacht-series/`).

Zůstalo schválně: Filip tušil, že se ještě bude hodit. Appka ho má pořád
jako ikonu i splash.

| Soubor | Co to je |
|---|---|
| `orlicky-pohar-monitor.svg`, `-tmave.svg` | široká verze s nápisem, světlý a tmavý podklad |
| `orlicky-pohar-mobil.svg`, `-tmave.svg` | čtvercová značka s nápisem jako vodoznakem |
| `logo.png` | značka 512 × 512, průhledné pozadí (dřív `/logo.png`) |
| `icon.png` | favicon webu 512 × 512 na světlé podložce (dřív `app/icon.png`) |

**Zdroj je kód, ne tyhle soubory.** Tvary kreslí `app/scripts/ikona.py`
a do webu zapisuje `app/znacka-loga.ts`; komponenta je
`web/app/logo-puvodni.tsx`. Pozor: skript pořád zapisuje i do starých cest
(`web/public/logo.png`, `web/app/icon.png`, `web/public/logo/orlicky-pohar-*.svg`),
takže po jeho spuštění je potřeba ty tři věci vrátit, dokud se neupraví.

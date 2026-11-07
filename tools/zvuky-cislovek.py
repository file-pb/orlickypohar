#!/usr/bin/env python3
"""Nahraje číslovky odpočtu do zvukových souborů pro appku.

<b>Proč nahrávka a ne syntéza za běhu.</b> Do 7. 11. 2026 appka každou
číslovku vyslovovala přes `expo-speech` v okamžiku, kdy měla zaznít.
Mezi naplánovaným okamžikem a začátkem zvuku stálo probuzení zvukové
relace a režie syntetizátoru, takže odpočet nešel jako metronom (Filip,
7. 11. 2026: *„odpočet je nepravidelný, někdy není sekunda jako
sekunda"*). Navíc každá číslovka byla samostatná jednoslovná věta
a syntetizátor na konci věty prodlužuje — nejvíc to bylo slyšet na
*„tři"* (*„tři dost často hlas divně prodlouží"*).

Nahrávka obojí řeší: `seekTo(0)` + `play` začne hrát hned a délka slova
je pevná. Navíc zazní i na telefonu, který český hlas nemá — appka
dosud uměla jen varovat, že hlášení bude k nepoznání.

<b>Co to nestojí.</b> `app/assets/zvuky` nečte `@expo/fingerprint` —
do otisku jdou jen soubory, na které ukazuje `app.json` (ikony, splash).
Ověřeno 7. 11. 2026 na výstupu `expo-updates fingerprint:generate`:
`assets/zvuky` v něm není ani jednou. Nové číslovky se tedy dostanou do
vydaných buildů aktualizací po síti, bez nového APK.

    python3 tools/zvuky-cislovek.py

Vyrábí `app/assets/zvuky/cislovka-*.wav`. Hlas je macOS Zuzana
(cs_CZ) — týž syntetizátor, jaký by appka použila na iOS, takže se
nahrávka od zbytku hlášení nepozná.

<b>Ticho na začátku se ořezává</b>, a je to to podstatné: `say` dává
před slovo desítky milisekund ticha a bez ořezu by každá číslovka
zazněla o tu chvíli později. Ořez je to, co z nahrávek dělá metronom.
"""
from __future__ import annotations

import os
import struct
import subprocess
import sys
import wave

KOREN = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
CIL = f"{KOREN}/app/assets/zvuky"

HLAS = "Zuzana"

# Slova a jména souborů. Pořadí je pořadí odpočtu; jména bez diakritiky,
# protože se na ně v kódu ukazuje `require`.
CISLOVKY = [
    ("pět", "pet"),
    ("čtyři", "ctyri"),
    ("tři", "tri"),
    ("dva", "dva"),
    ("jedna", "jedna"),
]

# Slov za minutu. Odpočet má na číslovku vteřinu, takže se musí vejít
# s rezervou; 190 drží i to nejdelší („čtyři") pod 600 ms.
TEMPO_WPM = 190

# Pod touhle hladinou se vzorek počítá za ticho. 16bitové PCM má rozsah
# ±32768, takže je to zhruba −52 dBFS — dost nízko, aby to neukouslo
# nádech do „pět", a dost vysoko, aby to utnulo šum.
TICHO = 80

# Kolik ticha nechat před slovem. Nula by ukousla náběh první hlásky.
NABEH_MS = 8


def rekni(slovo: str, kam: str) -> None:
    """Vysloví slovo do WAV: `say` do AIFF, `afconvert` do 16bitového PCM."""
    aiff = f"{kam}.aiff"
    subprocess.run(
        ["say", "-v", HLAS, "-r", str(TEMPO_WPM), "-o", aiff, slovo],
        check=True,
    )
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", "LEI16@22050", "-c", "1", aiff, kam],
        check=True,
    )
    os.remove(aiff)


def orez_ticho(cesta: str) -> tuple[int, int]:
    """Ustřihne ticho na začátku i na konci. Vrací (uříznuto ms, délka ms)."""
    with wave.open(cesta, "rb") as f:
        kanalu, sirka, rychlost, snimku = f.getnchannels(), f.getsampwidth(), f.getframerate(), f.getnframes()
        data = f.readframes(snimku)

    if sirka != 2 or kanalu != 1:
        raise SystemExit(f"{cesta}: čekal jsem mono 16 bitů, je {kanalu}×{sirka * 8} b")

    vzorky = struct.unpack(f"<{len(data) // 2}h", data)

    prvni = next((i for i, v in enumerate(vzorky) if abs(v) > TICHO), 0)
    posledni = next(
        (i for i in range(len(vzorky) - 1, -1, -1) if abs(vzorky[i]) > TICHO),
        len(vzorky) - 1,
    )
    od = max(0, prvni - rychlost * NABEH_MS // 1000)
    # Doznění se nechává celé; useknutý konec slova je slyšet víc než
    # o pár milisekund delší soubor.
    do = min(len(vzorky), posledni + rychlost // 20)

    orezane = vzorky[od:do]
    with wave.open(cesta, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rychlost)
        f.writeframes(struct.pack(f"<{len(orezane)}h", *orezane))

    return round(od * 1000 / rychlost), round(len(orezane) * 1000 / rychlost)


def main() -> None:
    if sys.platform != "darwin":
        raise SystemExit("`say` je macOS; na jiném systému se číslovky nenahrají.")

    os.makedirs(CIL, exist_ok=True)
    nejdelsi = 0
    for slovo, jmeno in CISLOVKY:
        cesta = f"{CIL}/cislovka-{jmeno}.wav"
        rekni(slovo, cesta)
        uriznuto, delka = orez_ticho(cesta)
        nejdelsi = max(nejdelsi, delka)
        print(f"  {jmeno:6s} {delka:4d} ms (ticho na začátku {uriznuto} ms)")

    # Číslovka delší než vteřina by přetekla do té další a odpočet by se
    # slil. Je to mez, ne odhad — proto se tu kontroluje.
    if nejdelsi >= 1000:
        raise SystemExit(f"nejdelší číslovka má {nejdelsi} ms, vteřina nestačí")
    print(f"  nejdelší {nejdelsi} ms, do vteřiny se vejde")


if __name__ == "__main__":
    main()

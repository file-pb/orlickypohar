#!/usr/bin/env python3
"""Nahraje číslovky odpočtu do zvukových souborů pro appku.

<b>Proč nahrávka a ne syntéza za běhu.</b> Do 7. 11. 2026 appka každou
číslovku vyslovovala přes `expo-speech` v okamžiku, kdy měla zaznít.
Mezi naplánovaným okamžikem a začátkem zvuku stálo probuzení zvukové
relace a režie syntetizátoru, takže odpočet nešel jako metronom (Filip,
7. 11. 2026: *„odpočet je nepravidelný, někdy není sekunda jako
sekunda"*). Nahrávka začne hrát hned (`seekTo(0)` + `play`) a má pevnou
délku.

<b>Proč mají všechna slova totéž tempo, i když nejsou stejně dlouhá.</b> Syntetizátor protahuje konec
fráze a každá číslovka je fráze sama pro sebe — ať stojí samostatně,
za čárkou, nebo za vloženým tichem `[[slnc]]`. Změřeno 8. 11. 2026:
„tři" vyšlo ve všech třech případech na 444–496 ms, zatímco táž věta
bez jakýchkoliv oddělovačů měla 1269 ms na pět slov, tedy ~254 ms na
slovo. Interpunkcí se to tedy obejít nedá a rozstříhat souvislou větu
taky ne: nejsou v ní mezery, na kterých by se dalo řezat (zkoušeno pět
prahů × čtyři délky mezery, ani jedna kombinace nedala pět kusů).

Co protažení umenšuje, je <b>tempo</b>: při 190 slovech za minutu má
„tři" 496 ms, při 310 jen 351. Tím se odpočet zkrátí, ale vyrovnat
délky to nedokáže — „dva" je proti „pět" o polovinu delší, protože tak
ta slova prostě znějí.

<b>Dotahovat je na stejnou délku se zkusilo a bylo to horší.</b> Každé
slovo si tempo hledalo samo, aby vyšlo na 250 ms; délky se srovnaly na
rozptyl 12 ms, ale „dva" pak mluvilo 480 slov za minutu proti 319
u „pět" a odpočet se rozjížděl (Filip, 8. 11. 2026: *„jen se to
počítání i zkracuje a zrychluje"*). Je to přesně to, co dělá
`mstts:audioduration` v Azure — a jeho dokumentace u toho varuje, že
velká změna tempa zhorší kvalitu. Tudy cesta nevede.

<b>Co by ji vyřešilo, a proč to tu není.</b> Výrobci hlasových hlášek
nahrávají číslovku <b>uprostřed nosné fráze</b> a vystřihnou ji; mimo
konec fráze se neprotahuje. `say` na macOS ale neumí říct, kde slovo
končí, a slova slepuje — zkoušeny čtyři nosné věty, ani jedna nedala
najít řezy. Produkční linky na to berou enginy s hranicemi slov
(Azure, Polly) nebo rovnou hlas živého člověka. Filip, 8. 11. 2026:
*„asi to necháme v šuplíku, necháme syntézu a třeba časem pošlu"* —
takže se tu drží jedno tempo pro všechna slova a nerovnost délek se
bere, jak je. Na čem u vody záleží, je, že číslovka padne přesně na
vteřinu; to drží appka, ne nahrávka.

<b>Navíc zazní i bez českého hlasu v telefonu.</b> Appka dosud uměla
jen varovat, že hlášení bude k nepoznání; odpočet, na kterém u vody
záleží nejvíc, teď na tom hlasu nestojí.

<b>Co to nestojí.</b> `app/assets/zvuky` nečte `@expo/fingerprint` —
do otisku jdou jen soubory, na které ukazuje `app.json` (ikony, splash).
Ověřeno 7. 11. 2026 na výstupu `expo-updates fingerprint:generate`:
`assets/zvuky` v něm není ani jednou. Nové číslovky se tedy dostanou do
vydaných buildů aktualizací po síti, bez nového APK.

    python3 tools/zvuky-cislovek.py

Vyrábí `app/assets/zvuky/cislovka-*.wav`. Hlas je macOS Zuzana
(cs_CZ) — týž syntetizátor, jaký by appka použila na iOS, takže se
nahrávka od zbytku hlášení nepozná.
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

# Slova a jména souborů, v pořadí odpočtu. Jména bez diakritiky, protože
# se na ně v kódu ukazuje `require`.
# Třetí hodnota je <b>strop délky</b>, nebo `None`. Používá ho jediné
# slovo: „tři" vychází i při zpomaleném tempu o půl decky delší než
# sousedi, protože mu syntetizátor nechá dozvučet samohlásku. Filip,
# 8. 11. 2026: *„u té trojky to prostě neumí a jen to trochu usekni."*
# Useknutí je tedy vědomá pomoc syntéze, ne obecné pravidlo — a drží se
# na jednom slově, aby se z něj nestalo plošné zkracování, které už se
# jednou neosvědčilo.
CISLOVKY = [
    ("pět", "pet", None),
    ("čtyři", "ctyri", None),
    ("tři", "tri", 370),
    ("dva", "dva", None),
    ("jedna", "jedna", None),
]

# Slov za minutu, jednotně pro všech pět. Vybráno poslechem ze tří
# variant (Filip, 8. 11. 2026): 310 bylo uspěchané, 270 pořád rychlé,
# 230 sedí. Číslovky pak mají 349 až 471 ms.
TEMPO_WPM = 230

# Pod touhle hladinou se vzorek počítá za ticho. 16bitové PCM má rozsah
# ±32768, takže je to zhruba −52 dBFS — dost nízko, aby to neukouslo
# nádech do „pět", a dost vysoko, aby to utnulo šum.
TICHO = 80

# Kolik ticha nechat kolem slova. Nula by ukousla náběh první hlásky
# a doznění poslední.
LEM_MS = 25

# Jak dlouhé je ztišení na useknutém konci. Rovný řez uprostřed
# samohlásky lupne; dvanáct milisekund stačí, aby to lupnutí zmizelo,
# a je kratší, než ucho pozná jako doznívání.
USEK_MS = 12


def nahraj(text: str, wpm: int, kam: str) -> None:
    """Vysloví text do WAV: `say` do AIFF, `afconvert` do 16bitového PCM."""
    aiff = f"{kam}.aiff"
    subprocess.run(["say", "-v", HLAS, "-r", str(wpm), "-o", aiff, text], check=True)
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", "LEI16@22050", "-c", "1", aiff, kam],
        check=True,
    )
    os.remove(aiff)


def nacti(cesta: str) -> tuple[list[int], int]:
    with wave.open(cesta, "rb") as f:
        kanalu, sirka, rychlost = f.getnchannels(), f.getsampwidth(), f.getframerate()
        data = f.readframes(f.getnframes())
    if sirka != 2 or kanalu != 1:
        raise SystemExit(f"{cesta}: čekal jsem mono 16 bitů, je {kanalu}×{sirka * 8} b")
    return list(struct.unpack(f"<{len(data) // 2}h", data)), rychlost


def usekni(vzorky: list[int], rychlost: int, strop_ms: int) -> list[int]:
    """Zkrátí slovo na strop a konec ztiší, aby řez nelupl."""
    nejvic = rychlost * strop_ms // 1000
    if len(vzorky) <= nejvic:
        return vzorky
    kratsi = vzorky[:nejvic]
    fade = rychlost * USEK_MS // 1000
    for i in range(min(fade, len(kratsi))):
        kratsi[-1 - i] = int(kratsi[-1 - i] * i / fade)
    return kratsi


def orez(vzorky: list[int], rychlost: int) -> list[int]:
    """Ustřihne ticho před slovem i za ním.

    <b>Ticho na začátku je to podstatné:</b> `say` ho dává před slovo
    desítky milisekund a bez ořezu by číslovka zazněla o tu chvíli
    později — a právě z toho se skládá nepravidelnost, kvůli které se
    nahrávky dělají. Lem se nechává, aby se neukousl náběh první hlásky
    a doznění poslední.
    """
    prvni = next((i for i, v in enumerate(vzorky) if abs(v) > TICHO), 0)
    posledni = next(
        (i for i in range(len(vzorky) - 1, -1, -1) if abs(vzorky[i]) > TICHO),
        len(vzorky) - 1,
    )
    lem = rychlost * LEM_MS // 1000
    return vzorky[max(0, prvni - lem) : min(len(vzorky), posledni + lem)]


def uloz(vzorky: list[int], rychlost: int, cesta: str) -> None:
    with wave.open(cesta, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(rychlost)
        f.writeframes(struct.pack(f"<{len(vzorky)}h", *vzorky))


def main() -> None:
    if sys.platform != "darwin":
        raise SystemExit("`say` je macOS; na jiném systému se číslovky nenahrají.")

    os.makedirs(CIL, exist_ok=True)
    delky = []
    for slovo, jmeno, strop in CISLOVKY:
        cesta = f"{CIL}/cislovka-{jmeno}.wav"
        nahraj(slovo, TEMPO_WPM, cesta)
        vzorky, rychlost = nacti(cesta)
        hotove = orez(vzorky, rychlost)
        pred = round(len(hotove) * 1000 / rychlost)
        if strop is not None:
            hotove = usekni(hotove, rychlost, strop)
        uloz(hotove, rychlost, cesta)
        delka = round(len(hotove) * 1000 / rychlost)
        delky.append(delka)
        useknuto = f"  (useknuto z {pred} ms)" if delka < pred else ""
        print(f"  {jmeno:6s} {delka:4d} ms{useknuto}")

    # <b>Mez, ne odhad.</b> Číslovka delší než vteřina by přetekla do té
    # další a odpočet by se slil.
    if max(delky) >= 1000:
        raise SystemExit(f"nejdelší číslovka má {max(delky)} ms, vteřina nestačí")
    print(f"  nejdelší {max(delky)} ms, do vteřiny se vejde")


if __name__ == "__main__":
    main()

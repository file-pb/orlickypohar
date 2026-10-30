"""Vyrobí oba klaksony u startu z naměřených hodnot.

    python3 scripts/klakson.py assets/zvuky/klakson-kratky.wav 1.0
    python3 scripts/klakson.py assets/zvuky/klakson-dlouhy.wav 4.0

<b>Proč syntéza a ne nahrávka.</b> Zvuk, který appka rozdává rozhodčímu
a posádkám, musí mít čistou licenci. Nahrávka z internetu ji většinou
nemá a u videa ji nemá nikdy. Tenhle soubor bere ze skutečné houkačky
jen *čísla* — výšku tónu nikdo nevlastní.

Předloha: ruční plynová houkačka Lalizas 380 ml, kterou se na poháru
troubí; nahrávku pořídil Filip 30. 10. 2026 a čísla níž jsou změřená
z ní (Goertzel po půlvteřinových úsecích).

<b>Délky „krátce" a „dlouze" ZPJ v sekundách neurčuje</b> — pravidlo 26
mluví o zvukových znameních, ne o jejich délce. Vteřina a čtyři jsou
volba podle toho, jak se troubí na vodě.

Naměřeno (Goertzel na 0,5 s úsecích): základ 574 Hz klesá k ~556 Hz,
druhá harmonická 1144 Hz během troubení převezme vedení nad základem,
třetí je slabá. Obojí je vlastnost membránové píšťaly, jak ubývá tlak —
a právě ta nehybnost chyběla dřívější syntéze.
"""
import math, random, struct, sys, wave

VZ = 22050
F0, F1 = 574.0, 556.0          # výška na začátku a na konci
SUM = 0.015                     # proud plynu
PRECHOD_S = 1.0                 # za jak dlouho převezme vedení dvojnásobek


def uloz(cesta, delka):
    nabeh, dobeh = int(VZ * 0.015), int(VZ * 0.05)
    celkem = int(VZ * delka)
    nahoda = random.Random(574)
    faze = [0.0, 0.0, 0.0]
    data = []
    for i in range(celkem):
        p = i / celkem
        hz = F0 + (F1 - F0) * p   # tlak ubývá po celou dobu troubení
        # <b>Těžiště přechází ze základu do dvojnásobku zhruba za vteřinu</b>
        # — tak je to v nahrávce vidět. Vázat to na podíl délky by dlouhý
        # klakson přelomilo až na konci, což skutečná houkačka nedělá.
        q = min(1.0, i / VZ / PRECHOD_S)
        a = [max(0.0, 1.0 - 1.1 * q), 0.5 + 0.5 * min(1.0, 1.4 * q), 0.12 + 0.08 * q]
        s = 0.0
        for k in range(3):
            faze[k] += 2 * math.pi * hz * (k + 1) / VZ
            s += a[k] * math.sin(faze[k])
        s = s / 1.6 + nahoda.uniform(-SUM, SUM)
        if i < nabeh:
            o = i / nabeh
        elif i > celkem - dobeh:
            o = (celkem - i) / dobeh
        else:
            o = 1.0
        data.append(int(max(-1, min(1, s * o)) * 0.82 * 32767))
    with wave.open(cesta, 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(VZ)
        f.writeframes(b''.join(struct.pack('<h', v) for v in data))


uloz(sys.argv[1], float(sys.argv[2]))

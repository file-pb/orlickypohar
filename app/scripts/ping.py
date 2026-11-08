"""Vyrobí ping, kterým se ohlašuje odklad a všeobecné odvolání.

    python3 scripts/ping.py

<b>Proč ping, a ne klakson</b> (Filip, 8. 11. 2026: *„jestli ne, tak
nějaký ping drobný a slovně oznámit hlasem. Jinak by se to pletlo
s oficiálním signálem"*).

Zvuková znamení u startu jsou **vyhlášená**: plachetní směrnice poháru
vypisuje jediné — *„Zrušení rozjížďky: dva dlouhé zvuky"* (nález R23).
Odklad ani odvolání v ní nejsou, takže klakson u nich by vyhlašoval
znamení, které nikdo nevyhlásil, a na vodě by se pletl s tím, které
platí. Ping tuhle roli nemá a mít nesmí: je to upozornění pro
rozhodčího, že úkon prošel — totéž, co dělá věta po něm.

<b>Proto je syntetický, a to je tady přednost.</b> U klaksonu stála
věrnost za oklikou přes nahrávku skutečné houkačky
(`scripts/klakson.py`); ping má znít naopak **jako z telefonu**. Dva
čisté tóny vzhůru, krátké, s měkkým doběhem — výš, než kam houkačka
dosáhne, a o řád kratší než krátký klakson (1,72 s).

Délka musí sedět s `DELKA_PINGU_MS` v `src/lib/hlaseni.ts`, protože
hlášení po pingu čeká přesně tu dobu. Hlídá to `testy/zvuky.test.ts`,
který ji čte rovnou ze souboru.
"""
import math
import pathlib
import struct
import wave

APP = pathlib.Path(__file__).resolve().parent.parent
ZVUKY = APP / 'assets' / 'zvuky'

# Táž vzorkovací frekvence jako u klaksonů — jeden přehrávač, jedna sada.
VZORKOVANI = 22_050

# Dva tóny vzhůru: A6 a E7. Kvinta nahoru zní jako dotaz „vzato na
# vědomí", ne jako povel; a obojí leží nad pásmem houkačky (574 Hz),
# takže se s ní nedá splést ani přes vodu.
TONY_HZ = (1760.0, 2637.0)

# Délka jednoho tónu i mezery mezi nimi. Celek vyjde na 0,30 s.
TON_S = 0.12
MEZERA_S = 0.06

# Špička hlasitosti. Níž než klakson schválně: ping nemá přehlušit
# dění na lodi, má se jen ozvat.
HLASITOST = 0.45


def ton(hz: float) -> list[int]:
    """Jeden tón s měkkým náběhem i doběhem — ostrá hrana lupne."""
    n = int(TON_S * VZORKOVANI)
    hrana = int(0.010 * VZORKOVANI)
    out = []
    for i in range(n):
        obalka = 1.0
        if i < hrana:
            obalka = i / hrana
        elif i > n - hrana:
            obalka = (n - i) / hrana
        # Doběh přes celou délku, aby tón dozněl a neutnul se.
        obalka *= math.exp(-3.0 * i / n)
        out.append(int(32767 * HLASITOST * obalka * math.sin(2 * math.pi * hz * i / VZORKOVANI)))
    return out


def main() -> None:
    vzorky: list[int] = []
    for i, hz in enumerate(TONY_HZ):
        if i:
            vzorky += [0] * int(MEZERA_S * VZORKOVANI)
        vzorky += ton(hz)

    cesta = ZVUKY / 'ping.wav'
    with wave.open(str(cesta), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(VZORKOVANI)
        f.writeframes(b''.join(struct.pack('<h', max(-32768, min(32767, v))) for v in vzorky))
    print(f'ping.wav: {len(vzorky) / VZORKOVANI:.2f} s')


main()

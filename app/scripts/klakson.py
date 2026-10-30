"""Vyrobí oba klaksony u startu ze zdrojové nahrávky.

    python3 scripts/klakson.py

<b>Odkud zvuk je.</b> `scripts/zdroje/airhorn-freesound-64476-cc0.wav` je
*airhorn.wav* od uživatele `guitarguy1985` z Freesoundu
(<https://freesound.org/people/guitarguy1985/sounds/64476/>), licence
**Creative Commons 0** — volné dílo: kopírovat, upravovat i šířit
komerčně, bez svolení a bez uvádění autora. Uvádíme ho přesto, protože
původ zvuku, který appka rozdává dál, má být dohledatelný. Soubor tady
je převod náhledu na mono 22,05 kHz; originál je 44,1 kHz stereo.

<b>Proč nahrávka a ne syntéza.</b> První pokus skládal čisté sinusovky
a Filip o něm řekl, že je to *„taková houkačka pro děti"*. Rozdíl nedělá
výška tónu — změřeno, že skutečná houkačka během troubení klesá
a překlápí se do dvojnásobku — ale to, že se zvuk pořád hýbe. Nahrávka
to má zadarmo.

<b>Jak se z třinácti vteřin dělá klakson.</b> Oba zvuky jsou
<b>začátek nahrávky uříznutý na potřebnou délku a zakončený jejím
vlastním doběhem</b> (Filip, 30. 10. 2026: *„ber jejich od začátku
a zakonči ho tím jejich koncem, tím to bude vypadat věrně"*). Umělý
fade-out zněl jako vypnutí, tenhle doběh jako puštěné tlačítko.

<b>Délky „krátce" a „dlouze" ZPJ v sekundách neurčuje</b> — pravidlo 26
mluví o zvukových znameních, ne o jejich délce. Čísla níž jsou volba
podle toho, jak se troubí na vodě, a dají se změnit bez dalšího zásahu;
pak je ale potřeba srovnat `DELKA_TROUBENI_MS` v `src/lib/hlaseni.ts`,
což hlídá `testy/zvuky.test.ts`.
"""
import pathlib
import struct
import wave

APP = pathlib.Path(__file__).resolve().parent.parent
ZDROJ = APP / 'scripts' / 'zdroje' / 'airhorn-freesound-64476-cc0.wav'
ZVUKY = APP / 'assets' / 'zvuky'

# Kolik se bere od začátku. Výsledek je o doběh delší.
ZACATEK_S = {'kratky': 0.80, 'dlouhy': 3.20}

# Doběh: kde v nahrávce troubení slábne a dozní (změřeno po čtvrtvteřinách).
KONEC_OD_S, KONEC_DO_S = 8.40, 9.40

# Na spoji se krátce prolíná, jinak cvakne.
PREKRYTI_S = 0.08


def nacti(cesta):
    with wave.open(str(cesta), 'rb') as f:
        n = f.getnframes()
        return f.getframerate(), list(struct.unpack(f'<{n}h', f.readframes(n)))


def zapis(cesta, vz, vzorky):
    with wave.open(str(cesta), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(vz)
        f.writeframes(b''.join(
            struct.pack('<h', max(-32768, min(32767, v))) for v in vzorky))


def sloz(vz, zdroj, zacatek_s):
    zacatek = zdroj[:int(zacatek_s * vz)]
    konec = zdroj[int(KONEC_OD_S * vz):int(KONEC_DO_S * vz)]
    p = int(PREKRYTI_S * vz)

    out = zacatek[:-p]
    for i in range(p):
        q = i / p
        out.append(int(zacatek[len(zacatek) - p + i] * (1 - q) + konec[i] * q))
    return out + konec[p:]


def main():
    vz, zdroj = nacti(ZDROJ)
    for jmeno, zacatek_s in ZACATEK_S.items():
        vzorky = sloz(vz, zdroj, zacatek_s)
        zapis(ZVUKY / f'klakson-{jmeno}.wav', vz, vzorky)
        print(f'klakson-{jmeno}.wav: {len(vzorky) / vz:.2f} s')


main()

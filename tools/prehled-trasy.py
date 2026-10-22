#!/usr/bin/env python3
"""
Přehled záznamu trasy z databáze, kterou appka drží v telefonu.

Po zkušební jízdě je první otázka vždycky stejná: kolik bodů, jak hustě
a jak dlouho. Opisovat to z obrazovky telefonu je pomalé a čísla se při
tom komolí, takže se databáze stáhne a změří tady.

Stáhnout ji z připojeného iPhonu:

    xcrun devicectl device copy from --device <UDID> \\
        --domain-type appDataContainer \\
        --domain-identifier cz.klihovka.orlickypohar \\
        --source Documents/SQLite/trasy.db --destination .

Pak:  python3 tools/prehled-trasy.py trasy.db

Databáze se **jen čte** (otevírá se v režimu ro), takže stažená kopie
zůstane tím, čím je: důkazem toho, co telefon zapsal.
"""
import math
import sqlite3
import sys
from datetime import datetime, timezone


def cas(ms):
    return datetime.fromtimestamp(ms / 1000, timezone.utc).astimezone()


def trvani(ms):
    s = int(ms / 1000)
    h, s = divmod(s, 3600)
    m, s = divmod(s, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def vzdalenost(a, b):
    """Haversine, v metrech."""
    r = 6371000
    f1, f2 = math.radians(a[0]), math.radians(b[0])
    df = math.radians(b[0] - a[0])
    dl = math.radians(b[1] - a[1])
    h = math.sin(df / 2) ** 2 + math.cos(f1) * math.cos(f2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def prehled(db, zaznam):
    body = db.execute(
        "SELECT sirka, delka, presnost, rychlost, cas_gps, podvrzeny"
        " FROM bod WHERE zaznam_id = ? ORDER BY id", (zaznam["id"],)).fetchall()
    if not body:
        print("  (bez bodů)")
        return

    delka = sum(vzdalenost((body[i - 1][0], body[i - 1][1]), (body[i][0], body[i][1]))
                for i in range(1, len(body)))
    rozestupy = sorted(body[i][4] - body[i - 1][4] for i in range(1, len(body)))
    prostredni = rozestupy[len(rozestupy) // 2] / 1000 if rozestupy else 0
    nejvetsi = rozestupy[-1] / 1000 if rozestupy else 0
    rychlosti = [b[3] for b in body if b[3] is not None]
    presnosti = [b[2] for b in body if b[2] is not None]
    od, do = body[0][4], body[-1][4]

    print(f"  bodů:        {len(body)}")
    print(f"  od:          {cas(od):%d. %m. %H:%M:%S}")
    print(f"  do:          {cas(do):%d. %m. %H:%M:%S}  ({trvani(do - od)})")
    # Prostřední rozestup říká, jak hustě se doopravdy vzorkovalo — průměr
    # by rozmazala jedna dlouhá mezera, a právě ta je zajímavá zvlášť.
    print(f"  rozestup:    {prostredni:.1f} s (prostřední), největší {nejvetsi:.0f} s")
    print(f"  délka:       {delka / 1000:.2f} km")
    if rychlosti:
        print(f"  rychlost:    max {max(rychlosti) * 1.94384:.1f} uzlu "
              f"({max(rychlosti) * 3.6:.0f} km/h)")
    if presnosti:
        print(f"  přesnost:    nejhorší {max(presnosti):.0f} m, "
              f"prostřední {sorted(presnosti)[len(presnosti) // 2]:.0f} m")
    podvrzene = sum(1 for b in body if b[5])
    if podvrzene:
        print(f"  podvržených: {podvrzene}")


def main(cesta):
    db = sqlite3.connect(f"file:{cesta}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row

    zaznamy = db.execute("SELECT * FROM zaznam ORDER BY zacatek").fetchall()
    if not zaznamy:
        print("Databáze je prázdná.")
        return

    for z in zaznamy:
        print(f"\n{z['lod'] or '(bez lodi)'} — {z['stav']}"
              f"{' · ' + z['regata'] if z['regata'] else ''}")
        prehled(db, z)
        ceka = db.execute(
            "SELECT count(*) FROM bod WHERE zaznam_id = ? AND id > ?",
            (z["id"], z["potvrzeno_do"])).fetchone()[0]
        if ceka:
            print(f"  nenahráno:   {ceka} bodů")

    print(f"\n{len(zaznamy)} {_zaznamu(len(zaznamy))} celkem.")


def _zaznamu(n):
    return "záznam" if n == 1 else "záznamy" if n < 5 else "záznamů"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

#!/usr/bin/env python3
"""Vyrobí snímek pro ukázkový režim appky.

<b>Proč snímek a ne server.</b> Filip, 7. 11. 2026: *„když si to bude
někdo chtít prohlídnout, tam mu to nechci pouštět na serveru po telefonu
a musíme mít nějaký demo mód."* Přibalený snímek je jediná z možností,
která tu větu splní doopravdy — appka v ukázce na síť nesáhne vůbec.

Data se <b>nevymýšlejí</b>, berou se z mocku (`tools/fake-api.py`), tedy
z týchž dat, na kterých se zkouší web. Ručně psaný snímek by se tvarem
rozešel se schématem a nikdo by si toho nevšiml, dokud by se v appce
neukázalo prázdno.

Kdo je v ukázce u vesla, je <b>rozhodnutí</b>, ne data: mock zná
pojmenované účty (`Bearer milos`) a bere se ten, kdo někde velí — jinak
by ukázka neukázala to, kvůli čemu appka vznikla, tedy start a cíl.

    python3 app/scripts/ukazka.py            # přepíše snímek
    python3 app/scripts/ukazka.py --kontrola # jen řekne, jestli sedí

Návratový kód 0 = hotovo (nebo snímek sedí), 1 = snímek se rozešel
(jen u `--kontrola`), 2 = nepovedlo se ho vyrobit.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent.parent
MOCK = KOREN / "tools" / "fake-api.py"
SNIMEK = KOREN / "app" / "src" / "ukazka" / "snimek.json"
PORT = int(os.environ.get("PORT_UKAZKA", "8791"))

# Účet, za který se snímek pořizuje. Mock zná jména; `milos` je ten,
# kdo v mocku někde velí, takže ukázka otevře rovnou start a cíl.
UCET = os.environ.get("UCET_UKAZKA", "milos")


def nactiJson(cesta: str):
    pozadavek = urllib.request.Request(
        f"http://127.0.0.1:{PORT}{cesta}",
        headers={"accept": "application/json", "authorization": f"Bearer {UCET}"},
    )
    with urllib.request.urlopen(pozadavek, timeout=10) as o:
        return json.load(o)


def posbirej() -> dict:
    """Projde to, co appka doopravdy čte, a stáhne odpovědi."""
    snimek: dict[str, object] = {}
    serie = nactiJson("/serie")
    snimek["/serie"] = serie

    for s in serie:
        slug = s["slug"]
        detail = nactiJson(f"/serie/{slug}")
        snimek[f"/serie/{slug}"] = detail
        try:
            snimek[f"/serie/{slug}/poradi"] = nactiJson(f"/serie/{slug}/poradi")
        except urllib.error.HTTPError:
            pass  # ročník bez pořadí — v appce se to pozná a nic se nedomýšlí
        for z in detail.get("zavody", []):
            cesta = f"/serie/{slug}/zavody/{z['slug']}"
            snimek[cesta] = nactiJson(cesta)

    ja = nactiJson("/ja")
    snimek["/ja"] = ja
    snimek["/ja/lode"] = nactiJson("/ja/lode")

    # Správa jen té regaty, které ten účet velí: cílová obrazovka z ní
    # čte rozepsaný zápis. Zbytek správy se do ukázky netahá — appka ho
    # nečte a snímek by zbytečně ztloustl.
    for o in ja.get("opravneni", []):
        if not o.get("zavod"):
            continue
        zaklad = f"/sprava/serie/{o['serie']}/vysledky/{o['zavod']}/rozjizdky"
        try:
            rozjizdky = nactiJson(zaklad)
        except urllib.error.HTTPError:
            continue
        snimek[zaklad] = rozjizdky
        for r in rozjizdky if isinstance(rozjizdky, list) else rozjizdky.get("rozjizdky", []):
            cislo = r.get("cislo")
            if cislo is None:
                continue
            try:
                snimek[f"{zaklad}/{cislo}"] = nactiJson(f"{zaklad}/{cislo}")
            except urllib.error.HTTPError:
                pass

    return snimek


def vyrob() -> dict:
    if not MOCK.is_file():
        print(f"nenašel jsem {MOCK}", file=sys.stderr)
        sys.exit(2)

    proces = subprocess.Popen(
        [sys.executable, str(MOCK)],
        cwd=str(KOREN),
        env={**os.environ, "PORT": str(PORT)},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(50):
            try:
                nactiJson("/serie")
                break
            except Exception:
                time.sleep(0.2)
        else:
            print("mock se nerozběhl", file=sys.stderr)
            sys.exit(2)
        return posbirej()
    finally:
        proces.terminate()
        proces.wait(timeout=10)


def main() -> int:
    novy = vyrob()
    text = json.dumps(novy, ensure_ascii=False, indent=1, sort_keys=True) + "\n"

    if "--kontrola" in sys.argv:
        if not SNIMEK.is_file():
            print(f"snímek chybí: {SNIMEK}", file=sys.stderr)
            return 1
        if SNIMEK.read_text() != text:
            print("snímek se rozešel s mockem — spusť ukazka.py bez přepínače", file=sys.stderr)
            return 1
        print(f"snímek sedí · {len(novy)} cest")
        return 0

    SNIMEK.parent.mkdir(parents=True, exist_ok=True)
    SNIMEK.write_text(text)
    print(f"{SNIMEK.relative_to(KOREN)} · {len(novy)} cest · {len(text) // 1024} kB")
    return 0


if __name__ == "__main__":
    sys.exit(main())

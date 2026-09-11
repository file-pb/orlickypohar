#!/usr/bin/env python3
"""Zátěžový test veřejného čtení.

Jen standardní knihovna — schválně. Nový balíček by znamenal `pip install`
přes firemní síť, tedy přesně tu věc, která se pokaždé zvrtne; a nástroj,
který jde pustit jen když je všechno ostatní v pořádku, se nepustí nikdy.

**Čte, nikdy nezapisuje.** Metody jiné než GET tenhle skript neumí a umět
nemá: zátěž na importu nebo na workflow by měnila skutečná data.

Co se měří: doba do poslední bajtu jedné odpovědi, rozdělená po
endpointech. Zajímavé je tu jediné číslo — **průběžné pořadí**, které se
počítá z celého ročníku při každém dotazu (31 lodí × 7 zastávek × rozjížďky)
a je zdaleka nejdražší ze všeho, co API vydává.

    tools/zatez.py                          # proti falešnému API na 8080
    tools/zatez.py --cil https://orlickypohar-api.klihovka.cz --rps 20 --doba 30

POZOR NA STROP, KTERÝ NENÍ NÁŠ. Před API stojí Traefik s
`ratelimit-standard`: **30 dotazů za vteřinu v průměru, špička 100**, a
počítá se podle `Cf-Connecting-Ip`, tedy podle jedné adresy — tvojí. Nad
třicet dotazů za vteřinu z jednoho stroje tedy neměříš aplikaci, ale
Traefikův limiter, a poznáš to podle 429 ve výpisu. Chceš-li výš, je to
vědomá změna limitu, ne parametr testu.

A ještě jeden strop před tím: Cloudflare. Odpovědi z jeho cache se do API
vůbec nedostanou, takže čísla pak měří jeho, ne nás.
"""
import argparse
import statistics
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict

# Co se měří. Pořadí je schválně první: je to nejdražší čtení, jaké API má.
CESTY = [
    "/serie/{serie}/poradi",
    "/serie/{serie}",
    "/serie/{serie}/zavody/{zavod}",
    "/serie",
    "/health/ready",
]


def jeden_dotaz(adresa, timeout):
    """Vrátí (stav, sekundy). Stav 0 znamená, že spojení vůbec nevzniklo."""
    zacatek = time.perf_counter()
    try:
        with urllib.request.urlopen(adresa, timeout=timeout) as odpoved:
            odpoved.read()
            return odpoved.status, time.perf_counter() - zacatek
    except urllib.error.HTTPError as chyba:
        # Chybová odpověď je taky odpověď a 429 je tu ta nejzajímavější.
        chyba.read()
        return chyba.code, time.perf_counter() - zacatek
    except Exception:
        return 0, time.perf_counter() - zacatek


def behej(adresy, konec, rps, vysledky, zamek, timeout):
    """Jedno vlákno. Drží si vlastní tempo, součet dělá volající."""
    rozestup = 1.0 / rps if rps else 0
    dalsi = time.perf_counter()
    i = 0

    while time.perf_counter() < konec:
        adresa = adresy[i % len(adresy)]
        i += 1

        stav, doba = jeden_dotaz(adresa, timeout)
        with zamek:
            vysledky[adresa].append((stav, doba))

        if rozestup:
            dalsi += rozestup
            # Když zaostáváme, netempujeme do minulosti — jinak by se po
            # pomalé odpovědi spustila salva a naměřili bychom špičku,
            # kterou jsme si sami vyrobili.
            spanek = dalsi - time.perf_counter()
            if spanek > 0:
                time.sleep(spanek)
            else:
                dalsi = time.perf_counter()


def percentil(hodnoty, p):
    serazene = sorted(hodnoty)
    misto = min(int(len(serazene) * p / 100), len(serazene) - 1)
    return serazene[misto]


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--cil", default="http://127.0.0.1:8080", help="adresa API")
    p.add_argument("--serie", default="2026-nanecisto", help="slug ročníku")
    p.add_argument("--zavod", default="jarni-vitr", help="slug zastávky")
    p.add_argument("--rps", type=float, default=5,
                   help="dotazů za vteřinu celkem (výchozí 5; nad 30 měříš Traefik)")
    p.add_argument("--doba", type=float, default=15, help="jak dlouho, v sekundách")
    p.add_argument("--vlaken", type=int, default=4, help="souběžných vláken")
    p.add_argument("--timeout", type=float, default=10)
    args = p.parse_args()

    adresy = [args.cil.rstrip("/") + c.format(serie=args.serie, zavod=args.zavod)
              for c in CESTY]

    if args.rps > 30:
        print("POZOR: nad 30 dotazů/s odpovídá Traefikův limiter, ne aplikace.\n",
              file=sys.stderr)

    vysledky = defaultdict(list)
    zamek = threading.Lock()
    konec = time.perf_counter() + args.doba
    na_vlakno = args.rps / args.vlaken

    print(f"Zátěž na {args.cil}: {args.rps} dotazů/s po {args.doba:g} s "
          f"v {args.vlaken} vláknech")

    vlakna = [threading.Thread(target=behej,
                               args=(adresy, konec, na_vlakno, vysledky, zamek, args.timeout))
              for _ in range(args.vlaken)]
    zacatek = time.perf_counter()
    for v in vlakna:
        v.start()
    for v in vlakna:
        v.join()
    celkem = time.perf_counter() - zacatek

    print(f"\n{'cesta':<44}{'n':>6}{'p50 ms':>9}{'p90 ms':>9}{'p99 ms':>9}{'max ms':>9}  stavy")
    print("-" * 100)

    vsechny_stavy = Counter()
    for adresa in adresy:
        mereni = vysledky[adresa]
        if not mereni:
            continue

        doby = [d * 1000 for _, d in mereni]
        stavy = Counter(s for s, _ in mereni)
        vsechny_stavy.update(stavy)
        cesta = adresa[len(args.cil.rstrip("/")):]

        print(f"{cesta:<44}{len(mereni):>6}"
              f"{statistics.median(doby):>9.0f}{percentil(doby, 90):>9.0f}"
              f"{percentil(doby, 99):>9.0f}{max(doby):>9.0f}  "
              + " ".join(f"{s}×{n}" for s, n in sorted(stavy.items())))

    n = sum(vsechny_stavy.values())
    print(f"\nCelkem {n} dotazů za {celkem:.1f} s = {n / celkem:.1f}/s")

    if vsechny_stavy.get(429):
        print(f"{vsechny_stavy[429]}× 429: narazilo se na limit Traefiku, ne na strop API.")
    if vsechny_stavy.get(0):
        print(f"{vsechny_stavy[0]}× spojení nevzniklo. Z firemní sítě to znamená "
              "FortiGate, ne výpadek — postup je v POUCENI.md.")

    # Nenulový návratový kód, když něco nebylo 200: v CI ani v runbooku se
    # nemá výsledek číst očima.
    return 0 if set(vsechny_stavy) <= {200} else 1


if __name__ == "__main__":
    sys.exit(main())

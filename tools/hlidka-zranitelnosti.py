#!/usr/bin/env python3
"""Hlídka odmítnutých zranitelností v appce.

**Proč to existuje:** 23. 10. 2026 byla dvě hlášení Dependabota odmítnuta
jako `tolerable_risk` (`zod` #25, `decode-uri-component` #2), 28. 10. 2026
přibylo třetí (`deepmerge` #26). Odmítnuté
hlášení už GitHub **sám neotevře**, i když mezitím vyjde záplata nebo se
riziko zhorší. Bez hlídky by „přijali jsme riziko" tiše přešlo v „nevíme,
co se s tím stalo".

Odmítnutí stálo na dvou tvrzeních. Každé má podmínku, která se dá změřit:

| Hlášení | Odmítnuto proto, že | Hlídá se |
|---|---|---|
| `zod` | `@expo/cli` chce `^3.25.76`, záplata je až ve 4.6.6 | pustí expo zod 4? |
| `decode-uri-component` | `query-string@7` volá opravenou ESM-only 0.5 přes `require` | odešel expo-router od `query-string@7`? |
| `deepmerge` | **záplata neexistuje** a balíček se tahá jen přes `@expo/config`, tedy stavěcí nástroje | vyšla záplata? je `deepmerge` pořád jen pod `@expo/config`? |

A obě stála na tom, že je to **vyčerpání paměti**, tedy dopad jen na
dostupnost. Proto se hlídá i třetí věc: nepřišlo na tyhle balíčky hlášení,
které sahá i na důvěrnost nebo integritu? Tím by důvod odmítnutí padl.

**Čte se lockfile, neinstaluje se.** `app/package-lock.json` drží u každého
balíčku i rozsahy, které si vyžádal (ověřeno 23. 10. 2026: u `@expo/cli`
je `dependencies.zod` = `^3.25.76`, u `query-string` je
`dependencies['decode-uri-component']` = `^0.2.2`). Instalace by na totéž
spálila minuty Actions, kterých je v hračkárně nejmíň.

**Co neumím přečíst, nahlásím.** Rozsah v neznámém tvaru, nenalezený
balíček ani nedostupné API nesmí vyjít jako „nic se nestalo" — to je přesně
ta kontrola, která měří sebe a ne svět. Konec: 0 = klid, 1 = podívej se.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

# Verze, od které je dané hlášení zaplátované. Z advisory, ne z odhadu.
ZAPLATY = {"zod": (4, 6, 6), "decode-uri-component": (0, 5, 0)}

ADVISORY = "https://api.github.com/advisories?ecosystem=npm&per_page=100&affects="

# Hlášení, kvůli kterému vzniklo #26. Sahá na integritu a přijali jsme to
# i s tím, takže se na něj hlídka dopadu neptá — ptá se, jestli nepřišlo
# něco dalšího.
PRIJATE_DEEPMERGE = "GHSA-gcqx-w48m-w2h4"


def verze(text):
    """`1.2.3` → (1, 2, 3). Nic jiného; předverze nás nezajímají."""
    m = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?", text.strip())
    return tuple(int(g) for g in m.groups()) if m else None


NEKONECNO = (10**9, 0, 0)
NULA = (0, 0, 0)


def rozsahy(rozsah):
    """Rozsah → seznam intervalů `[od, do)`. `None` = tvar, kterému nerozumím.

    Umí `^x.y.z`, `~x.y.z`, `>=`/`>`/`<=`/`<`/`=`, `*` a sjednocení přes
    `||`; podmínky za sebou (`>=1.0.0 <2.0.0`) se protnou.
    """
    if rozsah is None:
        return None
    casti = []
    for cast in rozsah.split("||"):
        i = _interval(cast.strip())
        if i is None:
            return None
        if i[0] < i[1]:
            casti.append(i)
    return casti


def _interval(cast):
    if cast in ("*", ""):
        return (NULA, NEKONECNO)
    kusy = re.findall(r"(\^|~|>=|<=|>|<|=)?\s*(v?\d+\.\d+\.\d+(?:[-+][\w.]+)?)", cast)
    zbytek = re.sub(r"(\^|~|>=|<=|>|<|=)?\s*v?\d+\.\d+\.\d+(?:[-+][\w.]+)?", "", cast)
    if not kusy or zbytek.strip(" ,"):
        return None  # zbylo něco, co jsem nepřečetl
    od, do = NULA, NEKONECNO
    for znak, text in kusy:
        v = verze(text)
        if v is None:
            return None
        if znak == "^":
            # ^0.2.2 drží nulový major i minor — tím padá přechod na 0.5.
            h = (v[0] + 1, 0, 0) if v[0] else (0, v[1] + 1, 0)
            od, do = max(od, v), min(do, h)
        elif znak == "~":
            od, do = max(od, v), min(do, (v[0], v[1] + 1, 0))
        elif znak == ">=":
            od = max(od, v)
        elif znak == ">":
            od = max(od, (v[0], v[1], v[2] + 1))
        elif znak == "<=":
            do = min(do, (v[0], v[1], v[2] + 1))
        elif znak == "<":
            do = min(do, v)
        else:
            od, do = max(od, v), min(do, (v[0], v[1], v[2] + 1))
    return (od, do)


def pousti(rozsah, cil):
    """Pouští rozsah právě verzi `cil`? `None` = nerozumím mu."""
    r = rozsahy(rozsah)
    if r is None:
        return None
    return any(od <= cil < do for od, do in r)


def pousti_od(rozsah, podlaha):
    """Pouští rozsah **nějakou** verzi od `podlaha` výš? `None` = nerozumím.

    Tohle je ta správná otázka u záplaty: `^0.5.1` zaplátovanou verzi pouští,
    i když přesně `0.5.0` ne. Dřívější znění se ptalo na `0.5.0` a tím by
    zvednutou závislost prohlásilo za pořád blokovanou.
    """
    r = rozsahy(rozsah)
    if r is None:
        return None
    return any(do > podlaha for _, do in r)


def zapis(lock, konec):
    """Záznam z lockfilu, jehož cesta končí na `konec`. Nejkratší cesta
    vyhrává — `node_modules/zod` před `node_modules/a/node_modules/zod`."""
    nalezene = [k for k in lock["packages"] if k == konec or k.endswith("/" + konec)]
    if not nalezene:
        return None
    return lock["packages"][min(nalezene, key=len)]


def hlidej_zod(lock):
    cli = zapis(lock, "@expo/cli")
    if cli is None:
        return ["`@expo/cli` v lockfilu není. Buď odešel, nebo se změnilo jméno — podívej se, čím se zod teď tahá."]
    rozsah = cli.get("dependencies", {}).get("zod")
    if rozsah is None:
        return ["`@expo/cli` už na `zod` nezávisí. Důvod odmítnutí padl — zkontroluj, jestli zod v appce vůbec zbyl."]
    pusti = pousti_od(rozsah, ZAPLATY["zod"])
    if pusti is None:
        return [f"Rozsah `zod` u `@expo/cli` je `{rozsah}` a tomu tvaru nerozumím. Přečti ho ručně."]
    if pusti:
        return [f"`@expo/cli` už pouští zod od 4.6.6 výš (`{rozsah}`). **Záplata je dosažitelná** — zvedni zod a otevři hlášení #25."]
    return []


def hlidej_duc(lock):
    router = zapis(lock, "expo-router")
    if router is None:
        return ["`expo-router` v lockfilu není. Podívej se, odkud se `decode-uri-component` tahá teď."]
    if "query-string" not in router.get("dependencies", {}):
        return ["`expo-router` už nezávisí na `query-string`. Důvod odmítnutí padl — zkontroluj `decode-uri-component` a otevři hlášení #2."]
    qs = zapis(lock, "query-string")
    if qs is None:
        return ["`query-string` v lockfilu není, i když ho `expo-router` žádá. Lockfile nesedí — podívej se na něj."]
    rozsah = qs.get("dependencies", {}).get("decode-uri-component")
    if rozsah is None:
        return ["`query-string` už `decode-uri-component` nežádá. Důvod odmítnutí padl — otevři hlášení #2."]
    pusti = pousti_od(rozsah, ZAPLATY["decode-uri-component"])
    if pusti is None:
        return [f"Rozsah `decode-uri-component` u `query-string` je `{rozsah}` a tomu tvaru nerozumím. Přečti ho ručně."]
    if pusti:
        return [f"`query-string` už pouští `decode-uri-component` od 0.5 výš (`{rozsah}`). **Záplata je dosažitelná** — zvedni ji a otevři hlášení #2."]
    return []


def hlidej_deepmerge(lock):
    """`deepmerge` #26: odmítnuto, protože **záplata neexistuje**.

    Tenhle případ je jiný než ty dva starší — tam šlo o to, jestli závislý
    balíček pustí novější verzi. Tady není co pustit, takže se hlídá, jestli
    záplata vůbec vyšla, a jestli balíček pořád visí jen na stavěcích
    nástrojích (`@expo/config`), ne na kódu appky.
    """
    dm = zapis(lock, "deepmerge")
    if dm is None:
        return ["`deepmerge` v lockfilu není. Buď odešel — a pak se dá hlášení #26 zavřít — nebo se přejmenoval."]

    nase = verze(dm.get("version", ""))
    if nase is None:
        return [f"Verzi `deepmerge` z lockfilu nepřečtu (`{dm.get('version')}`)."]

    # Kdo si ho žádá. Odmítnutí stálo na tom, že jen `@expo/config` —
    # kdyby přibyl někdo jiný, může to být kód, který jede v telefonu.
    zadatele = sorted({
        cesta.rsplit("node_modules/", 1)[-1]
        for cesta, zapis_ in (lock.get("packages") or {}).items()
        if "deepmerge" in (zapis_.get("dependencies") or {})
    })
    cizi = [z for z in zadatele if z not in ("@expo/config",)]
    nalezy = []
    if cizi:
        nalezy.append(
            "`deepmerge` si žádá i " + ", ".join(f"`{z}`" for z in cizi)
            + " — odmítnutí stálo na tom, že ho tahá jen `@expo/config` "
            "(stavěcí nástroje). Ověř, jestli se nedostal do běhu appky.")

    # Vyšla záplata? Advisory ji vydává jako `first_patched_version`.
    try:
        with urllib.request.urlopen(ADVISORY + "deepmerge", timeout=30) as o:
            data = json.load(o)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        return nalezy + [f"Hlášení pro `deepmerge` se nepodařilo načíst ({e}). Nevím, jestli už nevyšla záplata."]

    for a in data:
        for v in a.get("vulnerabilities") or []:
            if (v.get("package") or {}).get("name") != "deepmerge":
                continue
            if pousti(v.get("vulnerable_version_range"), nase) is False:
                continue
            zaplata = (v.get("first_patched_version") or {}).get("identifier")
            if zaplata:
                nalezy.append(
                    f"`deepmerge` {dm.get('version')}: {a.get('ghsa_id')} už má záplatu "
                    f"`{zaplata}`. **Důvod odmítnutí padl** — zvedni ji a otevři hlášení #26.")

    # To jedno hlášení, kvůli kterému #26 vzniklo, sahá na integritu
    # (`I:L`) — a přijali jsme ho i s tím. Hlídá se proto, jestli nepřijde
    # něco dalšího a těžšího, ne tohle pořád dokola.
    return nalezy + hlidej_dopad("deepmerge", nase, krome=(PRIJATE_DEEPMERGE,))


def hlidej_dopad(balicek, nase, krome=()):
    """Nepřišlo hlášení, které sahá dál než na dostupnost?

    Odmítli jsme `zod` i `decode-uri-component` s tím, že je to vyčerpání
    paměti. Jakmile se objeví hlášení s dopadem na důvěrnost nebo integritu,
    ten důvod neplatí.

    `krome` jsou hlášení, u kterých **už víme**, že dál sahají, a přijali
    jsme to vědomě — u `deepmerge` je to zrovna to jedno. Bez téhle výjimky
    by hlídka hlásila pokaždé totéž a za měsíc by si jí nikdo nevšímal.
    """
    try:
        with urllib.request.urlopen(ADVISORY + balicek, timeout=30) as o:
            data = json.load(o)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        return [f"Hlášení pro `{balicek}` se nepodařilo načíst ({e}). Nevím, jestli se riziko nezhoršilo."]

    nalezy = []
    for a in data:
        if a.get("ghsa_id") in krome:
            continue
        vektor = (a.get("cvss") or {}).get("vector_string") or ""
        tezke = a.get("severity") == "critical"
        siri = re.search(r"/(C|I):(L|H)", vektor) is not None
        if not (tezke or siri):
            continue
        # Dotýká se verze, kterou máme? Co nepřečtu, beru jako „ano".
        rozsahy = [
            v.get("vulnerable_version_range")
            for v in a.get("vulnerabilities") or []
            if (v.get("package") or {}).get("name") == balicek
        ]
        nasich = [pousti(r, nase) for r in rozsahy] or [None]
        if all(v is False for v in nasich):
            continue
        nalezy.append(
            f"`{balicek}` {nase[0]}.{nase[1]}.{nase[2]}: **{a.get('severity')}** "
            f"{a.get('ghsa_id')} sahá dál než na dostupnost (`{vektor or 'bez vektoru'}`) — "
            f"důvod odmítnutí padl. {a.get('html_url')}"
        )
    return nalezy


def main():
    koren = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cesta = os.path.join(koren, "app", "package-lock.json")
    with open(cesta, encoding="utf-8") as f:
        lock = json.load(f)

    nalezy = hlidej_zod(lock) + hlidej_duc(lock) + hlidej_deepmerge(lock)

    for balicek in ZAPLATY:
        z = zapis(lock, balicek)
        if z is None:
            nalezy.append(f"`{balicek}` v lockfilu není. Buď odešel — a pak se dá hlášení zavřít — nebo se přejmenoval.")
            continue
        v = verze(z.get("version", ""))
        if v is None:
            nalezy.append(f"Verzi `{balicek}` z lockfilu nepřečtu (`{z.get('version')}`).")
            continue
        if v >= ZAPLATY[balicek]:
            nalezy.append(f"`{balicek}` je už na {z['version']}, tedy zaplátovaný. Hlášení se dá zavřít jako vyřešené.")
            continue
        nalezy += hlidej_dopad(balicek, v)

    if not nalezy:
        print("Klid: všechny důvody odmítnutí pořád platí a nic těžšího nepřišlo.")
        return 0
    print("Podívej se na odmítnutá hlášení, něco se změnilo:\n")
    for n in nalezy:
        print(f"- {n}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Zkouška úsudku hlídky. Bez sítě, bez lockfilu, do sekundy.

**Proč to existuje:** 6. 11. 2026 vypsala hlídka nad skutečným lockem „Klid"
(kód 0), přestože na `decode-uri-component` viselo otevřené **high**
CVE-2026-118664 (#27). Dvě vady, obě tiché:

1. prah záplaty byl `0.5.0`, ale `<= 0.5.0` je zranitelný rozsah, takže nad
   lockem s 0.5.0 hlídka doporučila *zavřít hlášení o zranitelné verzi*;
2. kontrola dopadu čítala jen `cvss.vector_string`, které je u hlášení
   ohodnocených jen CVSS 4.0 `null`, a regulár neznal předpony `VC:`/`VI:`.

Třetí přibyla 7. 11. 2026: oprava prahu nechala v textu zprávy původní
„od 0.5 výš“, tedy to číslo, které bylo špatně — a člověk čte zprávu, ne
`ZAPLATY`.

`zkouska` v `hlidka-zranitelnosti.yml` ověřuje **cestu hlášení**, ne úsudek —
vynutí nález a podívá se, že vznikne issue. Že hlídka pozná, *co* hlásit,
nekontrolovalo nic. Tohle to kontroluje: sabotáž, ne přečtení kódu.

Pustí se bez argumentů. 0 = v pořádku, 1 = podívej se.
"""

import importlib.util
import os
import sys

KOREN = os.path.dirname(os.path.abspath(__file__))


def hlidka():
    cesta = os.path.join(KOREN, "hlidka-zranitelnosti.py")
    spec = importlib.util.spec_from_file_location("hlidka", cesta)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


def v4(telo):
    """Hlášení ohodnocené **jen** CVSS 4.0 — `cvss` je u nich `null`."""
    return {
        "cvss": {"vector_string": None, "score": 0.0},
        "cvss_severities": {
            "cvss_v3": {"vector_string": None, "score": 0.0},
            "cvss_v4": {"vector_string": "CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/" + telo},
        },
    }


def v31(telo):
    return {"cvss": {"vector_string": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/" + telo}}


def main():
    h = hlidka()
    chyby = []

    def saha(advisory):
        return any(h.SAHA_DAL.search(x) for x in h.vektory_z(advisory))

    # --- 1. prah zaplaty odpovida advisory, ne opravene verzi stareho CVE ---
    # CVE-2026-118664 ma rozsah `<= 0.5.0` a first_patched_version 0.5.1.
    if h.ZAPLATY.get("decode-uri-component") != (0, 5, 1):
        chyby.append(
            f"prah `decode-uri-component` je {h.ZAPLATY.get('decode-uri-component')}, "
            "čekáno (0, 5, 1) — `<= 0.5.0` je zranitelný rozsah CVE-2026-118664"
        )

    # --- 2. kontrola dopadu pozna duvernost a integritu v obou zapisech ---
    pripady = [
        # (jméno, čekáno, hlášení)
        ("v4 jen dostupnost (skutečné #27)", False, v4("VC:N/VI:N/VA:H/SC:N/SI:N/SA:N")),
        ("v4 důvěrnost zranitelného systému", True, v4("VC:H/VI:N/VA:N/SC:N/SI:N/SA:N")),
        ("v4 integrita zranitelného systému", True, v4("VC:N/VI:L/VA:N/SC:N/SI:N/SA:N")),
        ("v4 důvěrnost navazujícího systému", True, v4("VC:N/VI:N/VA:N/SC:H/SI:N/SA:N")),
        ("v4 integrita navazujícího systému", True, v4("VC:N/VI:N/VA:N/SC:N/SI:L/SA:N")),
        ("v3.1 s C:H", True, v31("C:H/I:N/A:N")),
        ("v3.1 s I:L", True, v31("C:N/I:L/A:N")),
        ("v3.1 jen dostupnost", False, v31("C:N/I:N/A:H")),
        ("bez vektoru vůbec", False, {"cvss": None, "cvss_severities": None}),
        ("prázdné hlášení", False, {}),
    ]
    for jmeno, cekano, advisory in pripady:
        skutecnost = saha(advisory)
        if skutecnost != cekano:
            chyby.append(f"dopad u „{jmeno}“: hlásí {skutecnost}, čekáno {cekano}")

    # --- 3. vektor se najde i tam, kde ho stara verze neprecetla ---
    jen_ctyrka = v4("VC:H/VI:H/VA:H/SC:N/SI:N/SA:N")
    if not h.vektory_z(jen_ctyrka):
        chyby.append(
            "u hlášení ohodnoceného jen CVSS 4.0 nevidí hlídka žádný vektor — "
            "to byla ta vada, kvůli které #27 prošlo jako „Klid“"
        )

    # --- 4. zprava o dosazitelne zaplate jmenuje prah, ne pevne cislo ---
    # Do 7. 11. 2026 v ní stálo „od 0.5 výš“, přestože prah už byl 0.5.1.
    # Číslo ve zprávě je to jediné, co člověk uvidí, takže se **odvozuje**
    # z `ZAPLATY`. Sabotáž: posuň prah a zpráva se musí posunout s ním.
    lock = {"packages": {
        "node_modules/expo-router": {"dependencies": {"query-string": "^7.1.3"}},
        # Rozsah smí vyjít jen z `^0.6.0`: kdyby v něm stálo `0.5.1`, zpráva by
        # prošla i s pevně zapsaným „0.5“, protože to číslo echuje rozsah.
        "node_modules/query-string": {"dependencies": {"decode-uri-component": "^0.6.0"}},
    }}
    zpravy = h.hlidej_duc(lock)
    if len(zpravy) != 1 or "0.5.1" not in zpravy[0]:
        chyby.append(f"zpráva o dosažitelné záplatě nejmenuje prah 0.5.1: {zpravy}")
    puvodni = h.ZAPLATY["decode-uri-component"]
    try:
        h.ZAPLATY["decode-uri-component"] = (9, 9, 9)
        sabotovane = h.hlidej_duc(lock)
    finally:
        h.ZAPLATY["decode-uri-component"] = puvodni
    if sabotovane:
        chyby.append(
            "po posunu prahu na 9.9.9 pořád tvrdí, že je záplata dosažitelná "
            f"z `^0.6.0`: {sabotovane}")

    if chyby:
        print("Hlídka soudí špatně:\n")
        for c in chyby:
            print(f"- {c}")
        return 1
    print(f"Hlídka soudí správně: prah, {len(pripady)} případů dopadu i text zprávy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

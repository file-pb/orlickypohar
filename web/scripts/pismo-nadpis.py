#!/usr/bin/env python3
"""Podmnožina písma Inter Black pro nadpis na tabuli.

Nápis „Orlická série" vedle loga jsou hotové křivky z `napis.py`, protože
se nikdy nemění. Název závodu se mění s každou regatou, takže ho nejde
předgenerovat — kreslí se jako živý text toutéž Inter Black a týmiž
proužky, aby to byla stejná grafika.

Celé písmo má 335 kB a kvůli jednomu nadpisu by se nevyplatilo. Tahle
podmnožina drží jen znaky, které se v názvu závodu můžou objevit.

    python3 web/scripts/pismo-nadpis.py      (z kořene repozitáře, potřebuje fonttools a brotli)
"""
import os, sys
from fontTools.subset import main as subset

koren = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
zdroj = os.path.join(koren, "app", "scripts", "pismo", "Inter-Black.ttf")
cil = os.path.join(koren, "web", "public", "pismo", "inter-black.woff2")

# Česká abeceda včetně verzálek s diakritikou, číslice a interpunkce, která
# se v názvu závodu reálně objeví. Němčina kvůli jménům lodí a tratí.
ZNAKY = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    "ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž"
    "ÄÖÜäöüß"
    " .,:;!?-–—'’\"„“()/&+%"
)

subset([
    zdroj, f"--text={ZNAKY}", "--flavor=woff2",
    "--layout-features=kern,liga", f"--output-file={cil}",
])
print(f"{cil}  {os.path.getsize(cil)} B", file=sys.stderr)

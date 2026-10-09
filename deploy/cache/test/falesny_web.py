"""Falešný web pro test cache: každá odpověď nese pořadové číslo vykreslení.

Test tak pozná, jestli odpověď přišla z cache (číslo se nezměnilo), nebo
ji web vykreslil znovu. V těle je i to, co by skutečný web podle cookie
ukázal — vzhled a jestli je někdo přihlášený —, aby šlo ověřit, že se
stránka přihlášeného nikdy nedostane k nikomu jinému.

Běží ve dvou kopiích, jako v produkci: `REPLIKA` říká, která odpověděla.
Bez toho by se rozdělení podle cookie sezení nedalo ověřit výsledkem —
jen čtením konfigurace.
"""

import os
import threading
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

zamek = threading.Lock()
pocet = 0
REPLIKA = os.environ.get("REPLIKA", "anonym")


class Web(BaseHTTPRequestHandler):
    def _odpovez(self):
        global pocet
        if self.path == "/health":
            # Přesně "Healthy", jako skutečný web — kontrakt platformy.
            # Která replika odpověděla, říká hlavička `X-Replika` níž.
            return self._posli(200, b"Healthy")
        with zamek:
            pocet += 1
            cislo = pocet
        # Vykreslení něco trvá — jinak by souběžné požadavky nezkoušely zámek.
        time.sleep(0.3)
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        rezim = cookie["op_rezim"].value if "op_rezim" in cookie else ""
        prihlaseny = any(k.startswith("op_tok") for k in cookie)
        telo = (
            f"vykresleni={cislo} replika={REPLIKA} cesta={self.path} "
            f"rezim={rezim} prihlaseny={int(prihlaseny)}\n"
        )
        if self.path.startswith("/chyba"):
            return self._posli(500, telo.encode())
        if self.path.startswith("/neni"):
            return self._posli(404, telo.encode())
        dalsi = {}
        if self.path.startswith("/nastav-cookie"):
            dalsi["Set-Cookie"] = "op_rezim=tmavy; Path=/"
        self._posli(200, telo.encode(), dalsi)

    def _posli(self, stav, telo, dalsi=None):
        self.send_response(stav)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        # Kdo odpověděl. V hlavičce, ne jen v těle, aby se dala ověřit
        # i cesta bez těla ke čtení (`/health`).
        self.send_header("X-Replika", REPLIKA)
        # Stejně jako Next u dynamické stránky.
        self.send_header("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate")
        self.send_header("Vary", "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Accept-Encoding")
        for k, v in (dalsi or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(telo)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(telo)

    do_GET = _odpovez
    do_HEAD = _odpovez
    do_POST = _odpovez

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Web).serve_forever()

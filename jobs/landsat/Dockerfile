# Plánovaná úloha: teplota hladiny Orlíku z Landsatu. Nemá HTTP ani port,
# jen jednou denně počítá a posílá čísla do API (README.md).
# Základní obraz z našeho zrcadla v GHCR, ne přímo z Docker Hubu:
# anonymní stahování z Hubu má limit na IP runneru a ta je sdílená, takže
# ho vyčerpá kdokoliv jiný (9. 10. 2026 nám tím spadl build i integrace).
# Zrcadlo plní `.github/workflows/zrcadlo.yml`, kde je i cena toho řešení.
ARG ZRCADLO=ghcr.io/file-pb/orlickypohar/zrcadlo
# Datovaná značka ve zrcadle, ne pohyblivá. Pohyblivá by znamenala, že
# měsíční přesyn tiše změní základ: tentýž commit by se před ním a po něm
# postavil z jiného obrazu. Datum přepisuje přesyn sám — ohlásí
# `::notice::`, které soubory se mají změnit (platform/docs/KVOTY.md, K7).
ARG ZRCADLO_ZNACKA=2026-10
FROM ${ZRCADLO}/python:3.13-slim-${ZRCADLO_ZNACKA}

# Kola rasterio nesou GDAL, ale libexpat berou ze systému a slim image
# ji nemá (import padal na libexpat.so.1, zachytil to build v CI).
RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /uloha
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY uloha.py .
# Selže už build, ne až první běh na serveru, kdyby kola nesedla na Python.
RUN python -c "import uloha"

# GDAL čte z katalogu jen okna kolem bodů. Bez tohohle by při otevření
# každého souboru nejdřív vypisoval adresář, který na blobu neexistuje.
ENV GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR \
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS=.TIF \
    GDAL_CACHEMAX=64 \
    PYTHONUNBUFFERED=1

# Stejné UID jako aplikace: tajemství v /run/secrets patří jemu.
USER 1654
CMD ["python", "uloha.py"]

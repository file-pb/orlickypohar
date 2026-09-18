# Plánovaná úloha: teplota hladiny Orlíku z Landsatu. Nemá HTTP ani port,
# jen jednou denně počítá a posílá čísla do API (README.md).
FROM python:3.13-slim

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

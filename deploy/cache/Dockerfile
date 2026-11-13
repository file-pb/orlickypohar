# Mikrocache před webem — konfigurace a důvody jsou v default.conf.
#
# Varianta bez roota: poslouchá na 8080 (kontrakt platformy) a běží pod
# uživatelem nginx. Značka drží stabilní řadu 1.30; opravy dojedou samy
# při dalším buildu.
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
FROM ${ZRCADLO}/nginx-unprivileged:1.30-alpine-${ZRCADLO_ZNACKA}

COPY default.conf /etc/nginx/conf.d/default.conf

# Chyba v konfiguraci má shodit build, ne nasazení.
RUN nginx -t

# Z jakého commitu je tahle image (bod 7 kontraktu platformy). Cizí základ,
# ale `default.conf` je zapečená dovnitř, ne připojená zvenčí — takže
# commit tady říká právě to, z jaké verze té konfigurace mikrocache běží.
# Přehled platformy hodnotu čte z `docker inspect`, proto `ENV`, a stejně
# jako u API až na konci, aby neshazovala vrstvy nad sebou z cache.
ARG VERZE=neznama
ENV VERZE=$VERZE

EXPOSE 8080

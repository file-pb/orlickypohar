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
FROM ${ZRCADLO}/nginx-unprivileged:1.30-alpine

COPY default.conf /etc/nginx/conf.d/default.conf

# Chyba v konfiguraci má shodit build, ne nasazení.
RUN nginx -t

EXPOSE 8080

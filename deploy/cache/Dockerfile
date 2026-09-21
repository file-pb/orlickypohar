# Mikrocache před webem — konfigurace a důvody jsou v default.conf.
#
# Varianta bez roota: poslouchá na 8080 (kontrakt platformy) a běží pod
# uživatelem nginx. Značka drží stabilní řadu 1.30; opravy dojedou samy
# při dalším buildu.
FROM nginxinc/nginx-unprivileged:1.30-alpine

COPY default.conf /etc/nginx/conf.d/default.conf

# Chyba v konfiguraci má shodit build, ne nasazení.
RUN nginx -t

EXPOSE 8080

# Web se staví ve dvou krocích: v prvním se instaluje a sestavuje,
# ve druhém zůstane jen to, co běží.

FROM node:22-alpine AS build
WORKDIR /src

# Závislosti zvlášť, aby se vrstva nepřestavovala při každé změně kódu.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Ne jako root. Kontrakt platformy to nevyžaduje, ale je to zadarmo.
RUN addgroup -g 1001 web && adduser -u 1001 -G web -D web

COPY --from=build --chown=web:web /src/.next/standalone ./
COPY --from=build --chown=web:web /src/.next/static ./.next/static
# Statické soubory (fotka na úvodní stránce, značka). Dřív tu tenhle řádek
# nebyl, protože web žádné neměl — a když přibyly, byly na produkci 404,
# zatímco lokálně fungovaly. Vývojový server servíruje public/ přímo
# z disku, kdežto v image je jen to, co se zkopíruje.
COPY --from=build --chown=web:web /src/public ./public

USER web
EXPOSE 8080

# Kontrakt platformy chce /health. Next ho sám nemá, takže ho obslouží
# stránka — a to zároveň ověřuje, že server umí renderovat, ne jen naslouchat.
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["node", "server.js"]

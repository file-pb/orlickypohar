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
# public/ tu schválně není: web žádné statické soubory nemá a git prázdný
# adresář nesleduje, takže by COPY na prázdné složce padal.

USER web
EXPOSE 8080

# Kontrakt platformy chce /health. Next ho sám nemá, takže ho obslouží
# stránka — a to zároveň ověřuje, že server umí renderovat, ne jen naslouchat.
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["node", "server.js"]

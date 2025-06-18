# Multi-stage build für optimierte Produktions-Image
FROM node:18-alpine AS builder

# Setze Arbeitsverzeichnis
WORKDIR /usr/src/app

# Kopiere package.json und package-lock.json zuerst für besseres Caching
COPY package*.json ./

# Installiere alle Dependencies (inkl. devDependencies für Build)
RUN npm ci

# Kopiere Prisma Schema und Migrationen
COPY prisma ./prisma/

# Generiere Prisma Client
RUN npx prisma generate

# Kopiere Source Code
COPY . .

# Build der Anwendung
RUN npm run build

# Debug: Zeige den Inhalt des dist Verzeichnisses
RUN ls -la dist/

# Produktions-Image
FROM node:18-alpine AS production

# Installiere dumb-init für bessere Signal-Behandlung
RUN apk add --no-cache dumb-init

# Erstelle non-root User für Sicherheit
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Setze Arbeitsverzeichnis
WORKDIR /usr/src/app

# Kopiere package.json und package-lock.json
COPY package*.json ./

# Installiere nur Produktions-Dependencies
RUN npm ci --only=production && npm cache clean --force

# Kopiere Prisma Schema und Migrationen
COPY prisma ./prisma/

# Generiere Prisma Client im Produktions-Image
RUN npx prisma generate

# Kopiere gebaute Anwendung vom Builder-Stage
COPY --from=builder --chown=nestjs:nodejs /usr/src/app/dist ./dist

# Debug: Zeige den Inhalt des dist Verzeichnisses im Produktions-Image
RUN ls -la dist/

# Wechsle zu non-root User
USER nestjs

# Exponiere Port
EXPOSE 3000

# Health Check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Starte Anwendung mit dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main"] 
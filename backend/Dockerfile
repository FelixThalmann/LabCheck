# Stage 1: Build die Anwendung
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Kopiere package.json und package-lock.json (oder yarn.lock)
COPY package*.json ./

# Installiere Abhängigkeiten
# In einer Produktivumgebung eher 'npm ci' verwenden, wenn package-lock.json vorhanden ist
RUN npm install

# Kopiere den Rest des Anwendungscodes
COPY . .

# Prisma Client generieren (optional hier, besser nach dem Build des Codes)
# RUN npx prisma generate

# Baue die Anwendung
RUN npm run build

# Stage 2: Erstelle das finale Image für die Produktion
FROM node:20-alpine

WORKDIR /usr/src/app

# Kopiere nur die notwendigen Artefakte aus dem Builder-Stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./

# Kopiere das Prisma-Schema für die Generierung zur Laufzeit, falls erforderlich,
# oder besser: generiere den Client im Builder-Stage und kopiere ihn.
# Für TimescaleDB und potenzielle manuelle Migrationen nach dem Deployment
# ist es oft besser, prisma generate nicht zur Laufzeit auszuführen, sondern den generierten Client mitzuliefern.
COPY --from=builder /usr/src/app/prisma ./prisma

# Stelle sicher, dass der Prisma Client im Produktionsimage vorhanden ist (bereits durch node_modules Kopie, aber doppelt hält besser für Klarheit)
# Wenn der Client nicht Teil der node_modules ist (z.B. anderer output path in schema.prisma)
# RUN npm install @prisma/client # oder npx prisma generate, falls schema kopiert wurde

# Die Anwendung hört standardmäßig auf Port 3000 (oder was in .env steht)
# Dieser Port muss über Umgebungsvariable PORT gesetzt werden können
EXPOSE 3000

# Kommando zum Starten der Anwendung
# Node direkt aufzurufen ist oft effizienter als 'npm start' in Produktion
CMD [ "node", "dist/main.js" ] 
# --- Stage de build ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage runtime ---
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
# La migration (ts-node) a besoin des sources TypeScript, pas seulement du build Nest.
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json

RUN addgroup -S goodfood && adduser -S goodfood -G goodfood
USER goodfood

EXPOSE 3003

# La migration s'exécute avant le lancement de l'application (synchronize: false).
CMD ["sh", "-c", "npm run migration:run && node dist/main.js"]

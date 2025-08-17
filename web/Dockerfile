# Build the Vite React+TS app and serve the static site
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
# Ensure Vite picks up the env var at build time
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env.production
RUN npm run build

FROM node:18-alpine AS prod
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
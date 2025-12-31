# ---------- 1) Build React (Vite) ----------
FROM node:18-alpine AS web-build
WORKDIR /src/web

# install deps
COPY web/package.json web/package-lock.json* ./
RUN npm ci

# copy web source and build
COPY web/ ./

# Build-time env for Vite
# Render (API serves UI): VITE_API_URL=/api and VITE_BASE=/
ARG VITE_API_URL=/api
ARG VITE_BASE=/

# ✅ Demo envs (add these)
ARG VITE_DEMO_ENABLED=false
ARG VITE_DEMO_USERNAME=parent1
ARG VITE_DEMO_PASSWORD=ChangeMe123
ARG VITE_DEMO_PARENT_PIN=1234

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_BASE=${VITE_BASE}

# ✅ expose demo envs to the build
ENV VITE_DEMO_ENABLED=${VITE_DEMO_ENABLED}
ENV VITE_DEMO_USERNAME=${VITE_DEMO_USERNAME}
ENV VITE_DEMO_PASSWORD=${VITE_DEMO_PASSWORD}
ENV VITE_DEMO_PARENT_PIN=${VITE_DEMO_PARENT_PIN}

# Vite reads env vars at build time
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env.production \
    && echo "VITE_BASE=${VITE_BASE}" >> .env.production \
    && echo "VITE_DEMO_ENABLED=${VITE_DEMO_ENABLED}" >> .env.production \
    && echo "VITE_DEMO_USERNAME=${VITE_DEMO_USERNAME}" >> .env.production \
    && echo "VITE_DEMO_PASSWORD=${VITE_DEMO_PASSWORD}" >> .env.production \
    && echo "VITE_DEMO_PARENT_PIN=${VITE_DEMO_PARENT_PIN}" >> .env.production

RUN npm run build

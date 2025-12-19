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
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_BASE=${VITE_BASE}

# Vite reads env vars at build time
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env.production \
    && echo "VITE_BASE=${VITE_BASE}" >> .env.production

RUN npm run build




# ---------- 2) Build & publish .NET API ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS api-build
WORKDIR /src

# copy API csproj first for better caching
COPY api/*.csproj ./api/
RUN dotnet restore ./api/MsFullstackSample.Api.csproj

# copy the rest of the API source
COPY api/ ./api/

# copy built React dist into api/wwwroot
COPY --from=web-build /src/web/dist ./api/wwwroot/

# publish (SPECIFY THE PROJECT FILE)
RUN dotnet publish ./api/MsFullstackSample.Api.csproj -c Release -o /app/publish



# ---------- 3) Runtime image ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=api-build /app/publish ./

# Render sets PORT; ASP.NET must listen on it
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
EXPOSE 10000

CMD ["dotnet", "api.dll"]

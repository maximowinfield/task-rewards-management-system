# Microsoft-Style Fullstack Sample: React + TypeScript + C# Minimal API

This is a compact portfolio to show skills aligned with Microsoft fullstack roles:
I will continue to work on it throughout the month. - 8/17/2025

- **Front end**: React + TypeScript (Vite)
- **Back end**: C# .NET 8 minimal API
- **DevOps**: Dockerfiles for both, `docker-compose.yml`, and a simple GitHub Actions CI

<img width="815" height="319" alt="image" src="https://github.com/user-attachments/assets/e45c6371-5544-4454-a0e5-7c320f5a4fda" />


## Quick start (local without Docker)

### API

```bash
cd api
dotnet run
# serves on http://localhost:5000 by default if launched via `dotnet run`
# this image config uses 8080; if needed, set ASPNETCORE_URLS=http://localhost:8080
```

### Web

```bash
cd web
echo "VITE_API_URL=http://localhost:8080" > .env.local   # match your API port
npm install
npm run dev
# open http://localhost:5173
```

## Quick start with Docker

```bash
docker compose up --build
# Web: http://localhost:5173  |  API: http://localhost:8080
```

## Endpoints

- `GET /api/health` -> `{ "status": "ok" }`
- `GET /api/todos` -> list todos
- `POST /api/todos` -> create todo `{ title, isDone }`
- `PUT /api/todos/{id}` -> update todo
- `DELETE /api/todos/{id}` -> delete todo

## Highlights

- TypeScript + React UI that consumes a REST API
- C# minimal API design and CORS
- Containerization for both services and Compose for local orchestration
- CI workflow that builds both sides

## Ideas for next commits

- Replace in-memory store with SQLite using EF Core
- Add unit tests (xUnit for API, Vitest + React Testing Library for web)
- Add GitHub Actions job to build and push Docker images
- Deploy the API to Azure App Service and the web to Azure Static Web Apps

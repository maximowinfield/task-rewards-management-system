# ✨ Microsoft Full-Stack Sample
## React + TypeScript + .NET 8 Minimal API + EF Core + Docker

A modern full-stack application demonstrating Microsoft’s ecosystem end-to-end.  
This project evolved from a simple todo app into a **persistent kids task and rewards system**, showcasing real-world frontend routing, backend persistence, and cloud deployment.

### User: parent1
### Password: ChangeMe123!

---

## 🚀 Live Demo

| Component | URL |
|---------|-----|
| **Frontend (GitHub Pages)** | https://maximowinfield.github.io/Microsoft-Fullstack-Sample/ |
| **Backend API (Render)** | https://microsoft-fullstack-sample.onrender.com |

> ⚠️ The API may take 3–5 seconds to wake up on first request (Render free tier).

---

## 🧰 Tech Stack

### Frontend
- React 18 + TypeScript
- Vite build tooling
- React Router (multi-page SPA)
- Axios for API communication
- GitHub Pages (subpath deployment)

### Backend
- .NET 8 Minimal API
- Entity Framework Core
- SQLite database with migrations
- Persistent domain models:
  - Kids
  - Tasks
  - Rewards
  - Redemptions
  - Todos
- Automatic database initialization and seeding

### DevOps / Hosting
- Docker Compose for local full-stack development
- CI/CD with GitHub Actions
- Deployed to:
  - GitHub Pages → Frontend
  - Render → API

---

## 🧩 Architecture Overview

This project demonstrates a clean, production-style separation of concerns:

- React frontend deployed independently
- .NET 8 Minimal API serving as a REST backend
- EF Core handling persistence and migrations
- SQLite used for lightweight relational storage
- GitHub Pages SPA routing configured for deep-link refresh
- CI/CD pipelines automate builds and deployments

The architecture mirrors common Microsoft full-stack patterns used in real-world applications.

---

## 📸 Screenshot

<img width="2542" height="1267" alt="image" src="https://github.com/user-attachments/assets/db191f34-5569-453c-99e6-e1e99682ef37" />

---

## 🧠 Features

- Fully deployed frontend and backend
- Persistent data storage using EF Core + SQLite
- Kids task system with point tracking
- Parent-managed tasks and rewards
- Reward redemption with point validation
- Todo list with full CRUD support
- Client-side routing with GitHub Pages refresh support
- JWT-based authentication with parent and kid roles
- Clean, extensible Microsoft-based full-stack design

---

## 🛠️ Running Locally

### 1️⃣ Clone the repository

```bash
git clone https://github.com/maximowinfield/Microsoft-Fullstack-Sample.git
cd Microsoft-Fullstack-Sample
```
### 2️⃣ Run using Docker Compose
docker compose up --build


Once running:

Frontend → http://localhost:5173

API health → http://localhost:5000/api/health

### 3️⃣ Run manually (without Docker)

Start backend:

cd api
dotnet run


Start frontend:

cd web
npm install
npm run dev


Then access:

Frontend → http://localhost:5173

API → http://localhost:5000

###🔌 API Endpoints

The API exposes endpoints for kids, tasks, rewards, points, redemptions, and todos.
Below are the core endpoints used by the demo UI.

Method	Route	Description
GET	/api/health	Health check
GET	/api/todos	Fetch todos
POST	/api/todos	Create a todo
PUT	/api/todos/{id}	Update a todo
DELETE	/api/todos/{id}	Delete a todo
```
┌────────────┐      HTTP       ┌───────────────┐
│  React UI  │ <------------> │ .NET 8 API    │
└────────────┘                └───────────────┘
        ▲                             ▲
        │ Docker Compose (local)      │
        └──────────────┬──────────────┘
                       ▼
                  CI/CD Pipeline
                       ▼
     Deploy Web → GitHub Pages
     Deploy API → Render
```

##🔐 Authentication & Deployment Notes (JWT + CORS)

This project implements JWT-based authentication for a parent/kid workflow and is deployed with the frontend and backend hosted separately. During deployment, several real-world issues were addressed and resolved.

## JWT Token Generation

The backend uses HMAC SHA-256 (HS256) for signing JSON Web Tokens (JWTs).
This algorithm requires a minimum 256-bit secret (32+ characters).

In production (Render), the JWT_SECRET is provided via environment variables.

Locally, the same requirement applies when running the API.

If the secret is too short, the API will throw a runtime exception during login token creation, resulting in a 500 Internal Server Error.

## Required Environment Variable


Backend:
```

JWT_SECRET=your-secure-secret-at-least-32-characters-long
```

This variable must be set:

Locally (via environment variables or configuration)

In Render’s Environment settings for production

## CORS & Cross-Origin Requests

Because the frontend and backend are hosted on different origins:

Frontend: GitHub Pages

Backend: Render

Cross-Origin Resource Sharing (CORS) is explicitly configured in the API.
All /api/* routes are grouped and protected with a consistent CORS policy to ensure:

Successful preflight (OPTIONS) requests

Proper headers on authenticated requests

Compatibility with both local development and production hosting

## Key Takeaway

This deployment mirrors real-world full-stack environments where:

Frontend and backend are deployed independently

Authentication relies on environment-specific configuration

CORS and security settings must be carefully coordinated

Resolving these issues ensured the application works reliably in both local development and production.

### 🚀 Future Enhancements

Role-based authorization refinements

Cloud-hosted database (Azure SQL or PostgreSQL)

Logging, telemetry, and observability

Automated frontend and API testing (Playwright / xUnit)

Optional Azure deployment with Microsoft Identity

### 👤 Author

Maximo Winfield
Full-Stack Developer

GitHub:
https://github.com/maximowinfield

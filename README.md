# 🎯 Task Rewards Management System

## React + TypeScript + .NET 8 Minimal API + Entity Framework Core (EF Core) + Docker

The **Task Rewards Management System** is a full-stack web application designed to help parents manage tasks, track progress, and reward kids for completed responsibilities.

The system supports a **parent–child workflow** where parents create and manage tasks and rewards, while kids complete tasks to earn points that can be redeemed. The project demonstrates real-world full-stack architecture, authentication, persistence, and cloud deployment using Microsoft-based technologies.

---

## 🚀 Live Demo

| Component | URL |
|---------|-----|
| **Web Application** | https://task-rewards-management-system-1.onrender.com/ |

> ⚠️ The backend is hosted on Render (free tier). The first request may take a few seconds to wake up.

**Demo Credentials**
- **User:** `parent1`
- **Password:** `ChangeMe123`
- **Parent Mode Pin:** `1234`

---

## 🧰 Tech Stack

### Frontend
- React 18 with TypeScript
- Vite build tooling
- React Router (multi-page SPA)
- Axios for API communication
- Deployed as a static single-page application

### Backend
- .NET 8 Minimal API
- Entity Framework Core (EF Core)
- SQLite database with migrations
- JWT-based authentication
- Domain-driven models for:
  - Kids
  - Tasks
  - Rewards
  - Redemptions
  - Todos

### DevOps & Hosting
- Docker Compose for local full-stack development
- CI/CD with GitHub Actions
- Production deployment:
  - Frontend → Render
  - Backend API → Render

---

## 🧩 Architecture Overview

The application follows a **clean, production-style architecture**:

- A React single-page application (SPA) for the user interface
- A RESTful .NET 8 Minimal API backend
- EF Core managing persistence, migrations, and domain models
- JWT authentication securing parent and kid workflows
- Environment-specific configuration for local and cloud deployment

This architecture mirrors patterns commonly used in modern Microsoft-based full-stack applications.

``` bash
┌────────────┐ HTTP ┌───────────────┐
│ React UI │ <------------> │ .NET 8 API │
└────────────┘ └───────────────┘
▲ ▲
│ Docker Compose (local) │
└──────────────┬──────────────┘
▼
CI/CD Pipeline
▼
Deploy Frontend → Render
Deploy API → Render
```


---

## 🧠 Core Features

- Parent-managed task and reward system
- Kids earn points by completing assigned tasks
- Reward redemption with point validation
- Persistent data storage using EF Core + SQLite
- Todo list with full Create, Read, Update, and Delete (CRUD) support
- JWT-based authentication with parent and kid roles
- Secure API endpoints with authorization and role awareness
- Clean separation between frontend, backend, and persistence layers

---

## 🛠️ Running the Project Locally

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/maximowinfield/Microsoft-Fullstack-Sample.git
cd Microsoft-Fullstack-Sample
```

### 2️⃣ Run with Docker (Recommended)
Start the backend
``` bash
cd api
dotnet run
```
Start the frontend
```bash
cd web
npm install
npm run dev
```
Access locally:

Frontend → http://localhost:5173

API → http://localhost:5000

### 🔌 API Overview
The backend exposes REST endpoints to manage tasks, rewards, redemptions, kids, and todos.

Example endpoints:

| Method | Route             | Description   |
| ------ | ----------------- | ------------- |
| GET    | `/api/health`     | Health check  |
| GET    | `/api/todos`      | Fetch todos   |
| POST   | `/api/todos`      | Create a todo |
| PUT    | `/api/todos/{id}` | Update a todo |
| DELETE | `/api/todos/{id}` | Delete a todo |

### 🔐 Authentication & Deployment Notes
## JWT Authentication
Tokens are signed using HMAC SHA-256 (HS256)

A minimum 256-bit secret (32+ characters) is required

Tokens secure all protected API routes

Required Environment Variable (Backend)
``` env
JWT_SECRET=your-secure-secret-at-least-32-characters-long
```
This must be configured:

Locally (environment variables)

In Render’s environment settings for production

## CORS Configuration

Because the frontend and backend are deployed separately, Cross-Origin Resource Sharing (CORS) is explicitly configured to allow:

Authenticated API requests

Proper preflight (OPTIONS) handling

Compatibility with both local development and cloud hosting

## 🎯 Key Takeaways
This project reflects real-world full-stack development challenges, including:

Independent frontend and backend deployments

Secure authentication across environments

Coordinated CORS and JWT configuration

Persistent data modeling with EF Core

Clean separation of concerns and extensibility

## 🚀 Future Enhancements
Finer-grained role-based authorization

Cloud-hosted database (Azure SQL or PostgreSQL)

Logging, telemetry, and observability

Automated frontend and backend testing

Optional Azure deployment with Microsoft Identity

👤 Author

Maximo Winfield
Full-Stack Developer

GitHub:
https://github.com/maximowinfield


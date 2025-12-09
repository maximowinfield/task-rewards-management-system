✨ Microsoft Full-Stack Sample
React + TypeScript + .NET 8 Minimal API + Docker

A clean full-stack implementation using modern Microsoft technologies — hosted for real-world deployment demonstration.

🚀 Live Demo
Component	Link
Frontend (GitHub Pages)	🔗 https://maximowinfield.github.io/Microsoft-Fullstack-Sample/

Backend API (Render)	🔗 https://microsoft-fullstack-sample.onrender.com/api/todos

📌 The backend may take 3–5 seconds to wake up due to the free Render tier.

🧰 Tech Stack
Frontend

⚛️ React (TypeScript + Vite)

🎨 Modern, minimal UI

🔌 Axios fetch to API

🎯 State management with hooks

Backend

🧩 .NET 8 Minimal API

🔄 RESTful endpoints

🧪 In-memory persistence (upgrade path to EF Core / SQL)

DevOps / Deployment

🐳 Docker multi-service structure (api + web)

🔄 GitHub Actions CI/CD for web deploy

🌐 Host split:

API → Render

Frontend → GitHub Pages

![App Screenshot](<img width="2554" height="450" alt="image" src="https://github.com/user-attachments/assets/bd8d7c40-5a9e-4d8b-a8c0-62347377b97c" />)

🧠 Features

✔ Real API + real UI with persistent actions
✔ Add / toggle / delete todos
✔ Production deployment example using Microsoft tools
✔ Scalable architecture ready for:

Authentication

Database migration

Cloud infra (Azure App Service / Static Web Apps)

🛠️ Run Locally
1️⃣ Clone the repo
git clone https://github.com/maximowinfield/Microsoft-Fullstack-Sample.git
cd Microsoft-Fullstack-Sample

2️⃣ Run using Docker Compose
docker compose up --build


App available at:
➡️ http://localhost:5173

API available at:
➡️ http://localhost:8080/api/health

3️⃣ Or run manually (no Docker)
Start API
cd api
dotnet run

Start Web
cd web
npm install
npm run dev

🔌 API Endpoints
Method	Route	Description
GET	/api/health	Health check
GET	/api/todos	Fetch todos
POST	/api/todos	Add todo
PUT	/api/todos/{id}	Update status
DELETE	/api/todos/{id}	Delete todo
🧩 Architecture Overview

┌────────────┐       HTTP        ┌───────────┐
│  React UI  │ <----------------> │ .NET API │
└────────────┘                   └───────────┘
        │ Docker Compose (local)
        ▼
GitHub Actions CI  ➜  GitHub Pages (web)
Render (api)

🧪 Future Enhancements

🔐 JWT Authentication + Microsoft Identity

🗄️ SQL Database with EF Core

☁️ Azure DevOps CI/CD

🔥 Logging + diagnostics + telemetry

👤 Author

Maximo Winfield
📌 Full-Stack Developer
🔗 GitHub: https://github.com/maximowinfield

🔗 LinkedIn: (Add link here if you want — great for networking!)

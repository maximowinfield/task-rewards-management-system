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

<img width="785" height="349" alt="image" src="https://github.com/user-attachments/assets/797f227f-d941-4238-b129-af58c6c286c0" />


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

<img width="1378" height="569" alt="image" src="https://github.com/user-attachments/assets/ce5ffc41-df75-4dca-9c49-52d13fef48f2" />


🧩 Architecture Overview

<img width="696" height="334" alt="image" src="https://github.com/user-attachments/assets/5c3325d1-dccc-4aaa-933a-f08caee93287" />


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

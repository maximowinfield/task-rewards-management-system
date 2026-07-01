# Task Rewards Management System

Task Rewards Management System is a full-stack web application designed to help users create tasks, track completion, and connect completed work to a reward-based system. The application combines task management with progress tracking, giving users a structured way to stay motivated and organize personal goals.

This project was built to demonstrate real-world software engineering skills, including full-stack application development, RESTful API design, CRUD operations, frontend state management, backend integration, and persistent data storage.

Tech Stack:
Task Rewards Management System is a full-stack application with a React frontend and an ASP.NET Core backend. The backend exposes RESTful endpoints and handles business logic, task/reward data management, and persistence, while the frontend provides an interactive user interface for managing tasks and reward progress.

# Task Rewards Management System – Tech Stack

## Frontend
- **React** – Component-based user interface
- **JavaScript / TypeScript** – Frontend logic
- **HTML / CSS** – Page structure and styling
- **State Management** – UI updates for task and reward workflows

## Backend
- **ASP.NET Core** – Backend framework
- **C#** – Backend application logic
- **RESTful API Design** – Resource-based endpoints using standard HTTP methods
- **CRUD Operations** – Create, read, update, and delete task/reward records

## Database
- **SQL / SQLite / PostgreSQL** – Persistent data storage
- **Entity Framework Core** – Data modeling and database access layer

## Development & Tooling
- **Git & GitHub** – Version control
- **Environment Variables** – Configuration and secrets management
- **REST API Testing** – Endpoint validation during development

## Architecture & Practices
- Client–Server Architecture
- **RESTful Design Principles**
  - Client–Server Separation
  - Statelessness
  - Resource-Based Design
  - Standard HTTP Methods
  - Meaningful HTTP Status Codes
  - Uniform Interface
  - Layered System
- Layered Backend Structure
- Separation of Concerns
- Reusable Frontend Components


## 🚀 Features

* ✅ **Task Management**

  * Create, edit, and delete tasks
  * Track task status and completion
  * Organize tasks with clear user-facing workflows

* 🎯 **Reward Tracking**

  * Connect completed tasks to reward progress
  * Track progress toward user-defined rewards
  * Encourage consistent task completion through goal-based motivation

* 📋 **CRUD Functionality**

  * Add new task and reward records
  * Update task details and completion status
  * Delete outdated or completed records
  * Retrieve saved task/reward data from the backend

* 🔄 **Frontend and Backend Integration**

  * React frontend communicates with backend REST API endpoints
  * API responses update the user interface dynamically
  * Clear separation between presentation logic and backend business logic

* 💾 **Persistent Storage**

  * Stores task and reward data using a database-backed API
  * Maintains records across user sessions
  * Uses structured models for reliable data management

---

## 🧠 Technical Highlights

### Frontend

* React component-based architecture
* Reusable UI components for tasks and rewards
* Controlled forms for creating and editing records
* Dynamic UI updates after API requests
* User-focused task completion and progress workflows

### Backend

* ASP.NET Core backend
* RESTful endpoint design
* C# business logic
* Entity Framework Core data access
* Structured models for tasks, rewards, and completion tracking

### Database

* Relational database structure
* Data models for tasks and rewards
* Persistent storage for user-created records
* Database-backed CRUD operations

---

## 🏗️ System Architecture High Level

```text
React Frontend
   ↓ REST API JSON
ASP.NET Core API
   ↓ Entity Framework Core
SQL Database
🐛 Real-World Debugging Example
```

During development, task and reward state needed to stay consistent between the frontend interface and the backend database.

Challenge: UI changes could appear successful on the frontend before confirming that the backend had saved the update correctly.

Fix: Improved the API request flow so task updates, completion changes, and reward progress were synchronized with backend responses before finalizing the visible UI state.

This highlights the importance of reliable client-server communication, error handling, and keeping frontend state aligned with persisted backend data.

🧪 Local Development
Prerequisites
Node.js 18+ recommended
.NET 8 SDK
SQL database or SQLite depending on configuration
Backend
dotnet restore
dotnet ef database update
dotnet run
Frontend
npm install
npm run dev

Set environment variables as needed:

VITE_API_URL
Database connection string
Any backend configuration values required for local development
🎯 What This Project Demonstrates
Full-stack application design
RESTful API development
CRUD functionality
Frontend and backend integration
Database-backed persistence
Component-based UI development
Practical software architecture
User-focused feature development
🔑 Key Files to Review

This project is structured to separate frontend components, API communication, backend business logic, and database models. The files below highlight the most important engineering decisions and features.

🖥️ Frontend Application Logic
src/App.jsx / src/App.tsx
Main application structure
Routes or primary page layout
Connects core task and reward features
src/components/TaskForm.jsx / TaskForm.tsx
Task creation and editing form
Controlled inputs and validation logic
src/components/TaskList.jsx / TaskList.tsx
Displays task records
Handles task completion and delete actions
Updates UI based on API responses
src/components/RewardCard.jsx / RewardCard.tsx
Displays reward progress
Shows reward-related task completion information
🔌 API Integration
src/api/tasks.js / tasks.ts
Frontend API calls for task records
Handles GET, POST, PUT/PATCH, and DELETE requests
src/api/rewards.js / rewards.ts
Frontend API calls for reward data
Connects reward UI to backend endpoints
🔎 Backend Core API
Controllers/TasksController.cs
REST API endpoints for task management
Handles create, read, update, and delete operations
Controllers/RewardsController.cs
REST API endpoints for reward tracking
Handles reward progress and reward data operations
Models/TaskItem.cs
Task domain model
Defines task fields, completion status, and related data
Models/Reward.cs
Reward domain model
Defines reward structure and progress-related data
Data/AppDbContext.cs
Entity Framework Core database context
Defines database tables and relationships
⭐ Recommended Entry Point

If reviewing only one area of the project, start with:

Frontend task management page/component
TasksController.cs
TaskItem.cs
AppDbContext.cs

These files demonstrate the full flow from user interaction to API request, backend processing, and database persistence.

📌 Future Enhancements
User authentication and account-based task tracking
Reward categories and priority levels
Task deadlines and reminders
Progress analytics and completion history
Mobile-responsive dashboard improvements
Deployment improvements and live demo restoration

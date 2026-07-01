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

---

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

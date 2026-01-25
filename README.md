# Task & Rewards Management System

## Overview

The **Task & Rewards Management System** is a full-stack web application designed to help parents manage household responsibilities by assigning tasks to kids, tracking completion, and rewarding progress through a points-based system.

The system supports **two distinct roles** — Parent and Kid — each with tailored permissions, views, and authentication flows. Parents define tasks and rewards, while kids complete tasks and redeem rewards using earned points. All critical validation and state changes are enforced server-side to ensure consistency and security.

This project was intentionally built to demonstrate **real-world full-stack architecture**, including role-based authentication, RESTful APIs, transactional state updates, and a clean separation of concerns across frontend and backend layers.

**Resume**  
https://github.com/maximowinfield/maximowinfield/blob/main/Maximo_Winfield_Resume31.pdf

---

## Tech Stack

### Backend
- .NET 8 Minimal API
- Entity Framework Core (ORM)
- SQLite (local) / PostgreSQL (production-ready)
- JWT Authentication (Parent and Kid roles)
- RESTful API design

### Frontend
- React + TypeScript
- Vite
- Axios (centralized API client)
- React Router
- React Context API (authentication and session state)

### Architecture & Patterns
- Role-based access control (RBAC)
- Ledger pattern for points tracking
- RESTful resource modeling
- Database provider abstraction
- Centralized authentication and API layers

---

## Core Features

- Parent authentication with JWT
- Kid session switching authorized by parent
- Task creation, editing, and deletion (Parent)
- Task completion (Kid)
- Reward creation and management (Parent)
- Reward redemption with server-side validation (Kid)
- Points balance tracking
- Immutable points transaction ledger
- Persistent authentication across refreshes

---

## Authentication & Roles

The system separates **UI mode** from **authenticated role**:

- **Parent**
  - Manages kids, tasks, and rewards
  - Can start kid sessions
- **Kid**
  - Completes tasks
  - Redeems rewards
  - Cannot modify system data

JWT tokens determine the **activeRole**, which controls API authorization.  
The UI may switch modes, but API access always follows the authenticated role.

---

## Points & Ledger Design

- Each kid has a `PointsBalance` stored for fast reads
- Every earn or spend action creates a `PointTransaction`
- Transactions act as an immutable audit log
- Balance updates and ledger writes occur together

This mirrors real-world financial systems where performance and auditability are both required.

---

## Interview Talking Points (with Answers)

### How does the frontend talk to the backend?

The frontend uses a centralized API client (`api.ts`) built on Axios. All HTTP requests go through this layer, which automatically attaches the correct JWT based on the active role. This keeps authentication logic out of UI components and ensures consistency across requests.

---

### Why do you have a service or API layer on the frontend?

It enforces separation of concerns. UI components focus on rendering and user interaction, while the API layer handles HTTP configuration, authentication headers, and request logic. This improves maintainability and makes the system easier to reason about during interviews.

---

### How do you handle authentication and role switching?

I use JWT-based stateless authentication. Parents authenticate first, then can start a kid session which issues a separate kid JWT. The app tracks `activeRole` for security and `uiMode` for UI behavior, ensuring the correct token is always used for API calls.

---

### How are tasks completed and points awarded?

When a kid completes a task, the request hits a protected backend endpoint. The server marks the task as completed, updates the kid’s point balance, and records the action in the points ledger. This prevents client-side manipulation.

---

### How do you prevent invalid reward redemptions?

Validation always happens server-side. Before redeeming a reward, the backend verifies the kid has sufficient points. If validation passes, points are deducted atomically and logged in the ledger.

---

### Why did you choose Entity Framework Core?

Entity Framework Core provides strongly typed data access, relationship handling, and database provider abstraction. This allows me to use SQLite locally and PostgreSQL in production without changing query logic, which reflects real production workflows.

---

### Why is Program.cs not a feature file?

Program.cs is infrastructure, not business logic. It configures middleware, authentication, and dependency injection. Feature logic lives in endpoints and services, keeping responsibilities clearly separated.

---

### What would you improve next?

I would add pagination for history views, optimistic UI updates for better responsiveness, and potentially event-driven processing if the system scaled further.

---

## Why This Project Matters

This project demonstrates:
- Practical full-stack system design
- Secure role-based authorization
- Real-world REST API patterns
- Thoughtful state management
- Interview-ready architectural decisions

It was built to be **explained**, not just run.

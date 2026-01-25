Task & Rewards Management System
Overview

The Task & Rewards Management System is a full-stack web application designed to help parents manage household responsibilities by assigning tasks to kids, tracking completion, and rewarding progress through a points-based system.

The system supports two distinct roles—Parent and Kid—each with tailored permissions, views, and authentication flows. Parents define tasks and rewards, while kids complete tasks and redeem rewards using earned points. All critical validation and state changes are enforced server-side to ensure consistency and security.

This project was intentionally built to demonstrate real-world full-stack architecture, including role-based authentication, RESTful APIs, transactional state updates, and a clean separation of concerns across frontend and backend layers.

🔗 Resume:
https://github.com/maximowinfield/maximowinfield/blob/main/Maximo_Winfield_Resume31.pdf

Tech Stack
Backend

.NET 8 Minimal API

Entity Framework Core (ORM)

SQLite (local) / PostgreSQL (production-ready)

JWT Authentication (Parent & Kid roles)

RESTful API design

Frontend

React + TypeScript

Vite

Axios (centralized API client)

React Router

Context API (Auth state management)

Architecture & Patterns

Role-based access control (RBAC)

Ledger pattern for points tracking

RESTful resource modeling

Provider abstraction for database portability

Centralized auth + API layers

Core Features

Parent login with JWT authentication

Kid session switching (parent-authorized)

Task creation, editing, deletion (Parent)

Task completion (Kid)

Reward creation and management (Parent)

Reward redemption with server-side validation (Kid)

Points ledger with audit history

Persistent auth state across refreshes

Authentication & Roles

The system separates UI mode from authenticated role:

Parent

Can manage kids, tasks, rewards

Can start kid sessions

Kid

Can complete tasks

Can redeem rewards

Cannot modify system data

JWT tokens determine the activeRole, which drives API authorization.
The UI may switch modes, but API access always follows the authenticated role.

Points & Ledger Design

Each kid has a PointsBalance for fast reads

Every earn/spend action creates a PointTransaction

Transactions are immutable history records

Balance updates and ledger writes happen together

This mirrors real financial systems where performance and auditability both matter.

Interview Talking Points (with Answers)
1. How does the frontend talk to the backend?

The frontend uses a centralized API client (api.ts) built on Axios.
All HTTP calls go through this layer, which automatically attaches the correct JWT based on the active role. This keeps authentication logic out of UI components and ensures consistency across requests.

2. Why do you have a service / API layer on the frontend?

It separates concerns. UI components focus on rendering and interaction, while the API layer handles HTTP, auth headers, and request structure. This makes the code easier to test, maintain, and explain in interviews.

3. How do you handle authentication and role switching?

I use JWTs for stateless authentication. Parents authenticate first, and can optionally start a kid session, which issues a separate kid JWT. The app tracks activeRole for security and uiMode for display, ensuring the correct token is always used.

4. How are tasks completed and points awarded?

When a kid completes a task, the request hits a protected backend endpoint. The server marks the task complete, updates the kid’s point balance, and inserts a transaction into the ledger. This ensures points can’t be manipulated client-side.

5. How do you prevent invalid reward redemptions?

All validation happens server-side. Before redeeming a reward, the backend checks the kid’s current balance. If there aren’t enough points, the request fails. If it succeeds, points are deducted atomically and logged in the ledger.

6. Why use Entity Framework Core?

EF Core gives me strongly-typed data access, relationship handling, and database provider abstraction. I can use SQLite locally and PostgreSQL in production without changing query logic, which mirrors real production workflows.

7. Why is Program.cs not a “feature” file?

Program.cs is infrastructure, not business logic. It configures middleware, authentication, and dependency injection. Features live in endpoints and services, which keeps responsibilities clear and scalable.

8. What would you improve next?

I’d add pagination for history views, optimistic UI updates for better UX, and possibly event-driven processing for points if the system scaled further.

Why This Project Matters

This project demonstrates:

Practical full-stack system design

Secure role-based authorization

Real-world REST API patterns

Thoughtful state management

Interview-ready architecture decisions

It’s built to be explained, not just run.

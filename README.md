# Joineazy

A role-based web application for managing student groups and assignment submissions.

Professors post assignments and share OneDrive submission links. Students form their own groups, add members, and each member confirms once their group has uploaded the work. Professors then follow every group's progress, and every student's confirmation, from a single dashboard.

Assignment files are never uploaded to this application. Work is submitted externally through the professor's OneDrive link; the app records who has confirmed submission and derives group progress from those confirmations.

## Tech Stack

| Layer    | Choice                                                    |
| -------- | --------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4                |
| Backend  | Node.js 22, Express 5, TypeScript, Zod                    |
| Database | PostgreSQL, Prisma ORM 7 (`@prisma/adapter-pg`)           |
| Tooling  | Docker Compose, Vitest + Supertest, ESLint, Prettier      |
| Hosting  | Vercel (frontend + API as one project), Neon (PostgreSQL) |

## Project Structure

```text
.
├── api/                  # Vercel entry point that re-exports the Express app
├── backend/
│   ├── prisma/           # schema.prisma and migrations
│   ├── src/
│   │   ├── config/       # validated environment configuration
│   │   ├── lib/          # shared clients (Prisma)
│   │   ├── middleware/   # authentication, role checks, origin check, errors
│   │   ├── modules/      # feature modules (routes, services)
│   │   └── utils/
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/   # shared UI (shell, buttons, form fields)
│       ├── features/     # auth, dashboard
│       └── lib/          # typed API client
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── vercel.json
```

## Getting Started

### Prerequisites

- Node.js 22
- npm 10+
- Docker Desktop (for the local PostgreSQL container)

### 1. Install dependencies

From the repository root:

```powershell
npm install
```

This installs both workspaces and generates the Prisma client.

### 2. Configure the environment

```powershell
Copy-Item .env.example .env
```

The defaults in `.env.example` work with the Docker database below. `.env` is ignored by Git.

### 3. Start the database

```powershell
npm run db:up
```

This starts PostgreSQL on `localhost:5433`.

### 4. Apply migrations

```powershell
npm run db:migrate
```

### 5. Run the app

In two terminals, from the repository root:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

The frontend runs at http://localhost:5173 and proxies `/api` to the backend on port 4000.

### Running everything in Docker

```powershell
docker compose up --build
```

Before the first run, create the initial migration with `npm run db:migrate`. Docker Compose then starts PostgreSQL, applies the migration history, seeds the admin account, and runs the backend (http://localhost:4000) and frontend (http://localhost:5173).

## Scripts

Run from the repository root.

| Script                 | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `npm run dev:backend`  | Start the API with file watching             |
| `npm run dev:frontend` | Start the Vite dev server                    |
| `npm run build`        | Type-check and build the frontend            |
| `npm run typecheck`    | Type-check backend and frontend              |
| `npm run lint`         | Run ESLint                                   |
| `npm run format:check` | Check formatting with Prettier               |
| `npm test`             | Run backend tests                            |
| `npm run db:up`        | Start the local PostgreSQL container         |
| `npm run db:migrate`   | Create/apply migrations in development       |
| `npm run db:deploy`    | Apply committed migrations (production-safe) |

## Environment Variables

| Variable       | Required | Description                                                                  |
| -------------- | -------- | ---------------------------------------------------------------------------- |
| `NODE_ENV`     | No       | `development`, `test` or `production`. Defaults to `development`.            |
| `PORT`         | No       | Port for the local API server. Defaults to `4000`.                           |
| `DATABASE_URL` | Yes      | PostgreSQL connection string used by the application at runtime.             |
| `DIRECT_URL`   | No       | Direct (non-pooled) connection used only by Prisma migrations. Used on Neon. |

Variables prefixed with `VITE_` would be public in the browser bundle, so no secrets are ever placed behind that prefix.

## Authentication

Sessions use a signed JWT stored in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production), so the token is never readable from JavaScript. Every protected request re-reads the user from the database, which means a changed role or removed account takes effect immediately. State-changing requests are also checked against the request origin as a second CSRF defence.

- Public registration always creates a **Student**; a `role` field in the request is rejected.
- The **Admin** (professor) account is created by `npm run db:seed` from the `ADMIN_*` variables and cannot be registered through the API.
- Passwords are hashed with bcrypt. Login returns the same error for an unknown email and a wrong password.
- Student IDs are the official institution-issued ID, stored trimmed and uppercased. The application checks that the ID is present, at most 64 characters and unique; it does not verify it against institution records.

## API

All endpoints live under `/api` and respond with JSON. Successful responses use `{ "data": ... }`; failures use `{ "error": { "code", "message", "details" } }`.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Liveness check |
| GET | `/api/health/ready` | Public | Readiness check; verifies the database responds |
| POST | `/api/auth/register` | Public | Register a student and start a session |
| POST | `/api/auth/login` | Public | Sign in and start a session |
| POST | `/api/auth/logout` | Public | Clear the session cookie |
| GET | `/api/auth/me` | Signed in | Current user |
| POST | `/api/groups` | Student | Create a group; creator becomes its leader and first member |
| GET | `/api/groups/me` | Student | Retrieve the current student's group and members |
| GET | `/api/students/search?q=` | Student group leader | Search students who are not already in a group |
| POST | `/api/groups/:groupId/members` | Group leader | Add a registered student by email or student ID |
| GET | `/api/assignments` | Student | List assignments available to the student's group (or all-student assignments before joining a group) |
| GET | `/api/assignments/:assignmentId` | Eligible student | Retrieve an assignment available to the student's group |
| GET | `/api/admin/groups` | Admin | List groups for assignment targeting |
| GET | `/api/admin/assignments` | Admin | List assignments and confirmation counts |
| GET | `/api/admin/assignments/:assignmentId` | Admin | Retrieve an assignment for editing |
| POST | `/api/admin/assignments` | Admin | Create an assignment for all students or selected groups |
| PATCH | `/api/admin/assignments/:assignmentId` | Admin | Edit assignment details and targeting (targeting locks after the first confirmation) |
| POST | `/api/submissions/:assignmentId/confirm` | Eligible student | Record the current student’s individual submission confirmation; retries are idempotent |

## Submission confirmations and progress

A student must belong to an eligible group before confirming an assignment. The confirmation endpoint records the authenticated student's ID, current group ID and server-generated timestamp; the client cannot submit those values. A repeated confirmation for the same assignment returns the existing record rather than creating a duplicate.

Group progress is derived from the group's current membership and its individual confirmations. It is not stored as a percentage. A member added later therefore changes the denominator and can reduce the displayed percentage. The status is `PENDING` (no confirmations), `IN_PROGRESS` (some confirmations before the deadline), `OVERDUE` (the deadline passed while at least one member remains unconfirmed), `COMPLETED` (everyone confirmed by the deadline), or `COMPLETED_LATE` (everyone confirmed after the deadline). Late confirmations are still accepted and recorded.

## Database

The schema is defined in `backend/prisma/schema.prisma` and covers users, groups, group memberships, assignments, assignment targets and submission confirmations. Prisma Migrate manages the migration history under `backend/prisma/migrations`; create the initial migration with `npm run db:migrate` before using `npm run db:deploy` or the Docker Compose startup flow.

```powershell
npm run db:migrate
```

## Deployment

The app is deployed as a single Vercel project: the React build is served as static output, and every `/api/*` request is rewritten to one Express serverless function (`api/index.ts`). PostgreSQL runs on Neon. Keeping the frontend and API on one origin avoids cross-site cookie and CORS configuration.

1. **Neon:** create a project and copy both connection strings from the dashboard: the pooled one (for `DATABASE_URL`) and the direct one (for `DIRECT_URL`).
2. **Migrate:** from your machine, apply the migrations to Neon using the direct connection:

   ```powershell
   $env:DIRECT_URL = "<neon direct connection string>"
   npm run db:deploy
   Remove-Item Env:DIRECT_URL
   ```

3. **Seed the admin:** with `DIRECT_URL`, `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` set in the same way, run `npm run db:seed`.
4. **Vercel:** import the repository, leave the framework preset on **Other** (build settings come from `vercel.json`), and add `DATABASE_URL` (the pooled string) and `JWT_SECRET` under Production environment variables.
5. **Verify:** open `/api/health` and `/api/health/ready` on the deployed URL.

Neon's free compute suspends when idle, so the first request after a quiet period can take a few seconds longer.

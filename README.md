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
│   │   ├── middleware/   # error handling, not-found
│   │   ├── modules/      # feature modules (routes, services)
│   │   └── utils/
│   └── tests/
├── frontend/
│   └── src/
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

This starts PostgreSQL, applies the committed migrations, and runs the backend (http://localhost:4000) and frontend (http://localhost:5173).

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

## API

All endpoints live under `/api` and respond with JSON. Successful responses use `{ "data": ... }`; failures use `{ "error": { "code", "message", "details" } }`.

| Method | Path                | Access | Description                                     |
| ------ | ------------------- | ------ | ----------------------------------------------- |
| GET    | `/api/health`       | Public | Liveness check                                  |
| GET    | `/api/health/ready` | Public | Readiness check; verifies the database responds |

## Database

The schema is defined in `backend/prisma/schema.prisma` and covers users, groups, group memberships, assignments, assignment targets and submission confirmations. Migrations are committed under `backend/prisma/migrations`.

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

3. **Vercel:** import the repository, leave the framework preset on **Other** (build settings come from `vercel.json`), and add `DATABASE_URL` (the pooled string) under Production environment variables.
4. **Verify:** open `/api/health` and `/api/health/ready` on the deployed URL.

Neon's free compute suspends when idle, so the first request after a quiet period can take a few seconds longer.

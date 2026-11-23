# System Design

## 1. Purpose and scope

Joineazy is a focused group assignment management and submission tracking application. It is not a learning management system and does not receive assignment files. Professors create assignments and share OneDrive upload links. Students form groups, access eligible assignments and individually confirm that the group has uploaded its work. Professors monitor assignment completion at group and student level.

The application has two roles:

- **Student:** register, manage one group as its leader (or participate as a member), access eligible assignments, open the external submission link and confirm individually.
- **Admin / Professor:** manage assignments, distribute them to all students or selected groups, inspect group/student confirmations and review operational analytics.

The application uses a modular monolith: one React client and one Express API backed by a single PostgreSQL database.

## 2. Technology choices

| Concern | Choice | Reason |
| --- | --- | --- |
| Client | React 19 + TypeScript 5.9 | Typed component-based UI. |
| Build and development | Vite 7 | Fast local development and static production output. |
| Client routing | React Router 7 | Role-guarded student and admin route trees. |
| Styling | Tailwind CSS 4 | Consistent utility-based responsive styling. |
| API | Express 5 + TypeScript 5.9 | Small, explicit HTTP service with modular route boundaries. |
| Input validation | Zod 4 | Runtime validation at API boundaries and typed parsed input. |
| ORM | Prisma 7 | Relational schema, typed queries and migration workflow. |
| PostgreSQL driver | `pg` with `@prisma/adapter-pg` | Explicit PostgreSQL adapter. |
| Authentication | `jose` JWT + HttpOnly cookie | Browser session token is not exposed to JavaScript. |
| Password hashing | `bcryptjs` | Pure-JavaScript bcrypt implementation avoids native build requirements. |
| Hosting | Vercel + Neon (free tiers, subject to terms) | One-origin static frontend/API deployment and managed PostgreSQL. |

Exact dependency versions are pinned in the package manifests and root lockfile.

## 3. High-level architecture

```mermaid
flowchart TD
    Browser[Browser]
    subgraph Vercel[Single Vercel project]
        Static[React static build<br/>frontend/dist]
        Function[Express serverless function<br/>api/index.ts]
    end
    subgraph Express[Express application]
        Security[Helmet, JSON parser,<br/>cookie parser, origin check]
        Auth[Authentication and role middleware]
        Modules[Auth | Groups | Assignments<br/>Submissions | Admin monitoring | Health]
    end
    Prisma[Prisma 7 + PostgreSQL adapter]
    DB[(PostgreSQL / Neon)]
    Browser --> Static
    Browser -->|same-origin /api/*| Function
    Function --> Security --> Auth --> Modules
    Modules --> Prisma --> DB
```

### Local development

- Vite serves the React application.
- The Vite development server proxies `/api` to the local Express server.
- Express listens on the configured `PORT` (default `4000`).
- The browser uses the Vite origin, so cookies remain same-origin in local development.
- PostgreSQL can be started through the repository's Docker Compose configuration. The local database is published on host port `5433` to avoid a common conflict with an existing local PostgreSQL service on `5432`.

### Production deployment layout

- Vercel builds the React application into `frontend/dist`.
- `vercel.json` rewrites `/api/*` requests to the single function entry at `api/index.ts`.
- `api/index.ts` imports the Express application from `backend/src/app.ts`.
- Non-API paths fall back to `index.html` for client-side routing.
- The browser and API share one origin, so the session cookie is first-party and CORS configuration is not needed for the main application flow.
- Neon provides PostgreSQL. Runtime uses the pooled `DATABASE_URL`; migration and seed commands use the direct connection when configured as `DIRECT_URL`.

## 4. Backend module boundaries

The backend follows feature-oriented modules. Each feature owns its routes, validation schemas and service-level business rules.

| Module | Responsibility |
| --- | --- |
| `auth` | Student registration, credential verification, session creation and logout. |
| `groups` | Group creation, current group retrieval, available student search and leader-only member addition. |
| `assignments` | Admin assignment CRUD (without deletion), distribution rules and student eligibility queries. |
| `submissions` | Individual confirmations and shared group progress derivation. |
| `admin-monitoring` | Professor overview metrics, eligible group-assignment pairs, filters and student-level monitoring. |
| `health` | Liveness and database readiness endpoints. |

Shared infrastructure is kept outside feature modules:

- `config/` validates environment variables at process startup.
- `lib/` creates the Prisma client, hashes/verifies passwords and signs/verifies session JWTs.
- `middleware/` handles authentication, role authorization, origin checks, errors and unmatched routes.
- `utils/` contains input parsing, identifier normalization and application errors.

The API uses a consistent success envelope (`data`) and error envelope (`error.code`, `error.message`, optional `error.details`). Zod validation occurs at request boundaries; services receive parsed inputs.

## 5. Request and security flow

### Authenticated browser request

1. The frontend calls the same-origin `/api` endpoint with `credentials: "same-origin"`.
2. The browser includes the session cookie when present.
3. Express applies Helmet, JSON parsing, cookie parsing and the state-changing request origin check.
4. `authenticate` verifies the JWT signature and expiry, then reloads the user from PostgreSQL.
5. `authorizeRole` enforces the current database role for protected endpoints.
6. The route validates its path, query or body using Zod and calls a feature service.
7. The service uses Prisma and returns data; the route sends the standard response envelope.

### Authentication controls

- Public registration always creates a `STUDENT`. The registration schema is strict and rejects a caller-supplied role.
- The admin/professor account is created by the idempotent database seed script; there is no public admin registration path.
- Passwords are hashed with bcrypt. The accepted password length is at least eight characters and at most 72 UTF-8 bytes (bcrypt's input limit).
- Unknown email and incorrect password produce the same login error; an unknown email is compared against a decoy hash to reduce user-enumeration timing differences.
- Session JWT uses HS256, a subject user ID, role claim, issued-at and expiry claims. The token is stored in an HttpOnly, SameSite=Lax cookie; Secure is enabled in production.
- Every protected request reloads the user, so a changed role or deleted account takes effect immediately. The database role is authoritative; the token role is not used as the final authorization decision.
- All state-changing `/api` requests are checked against the configured local origin or the request's own forwarded host. SameSite cookie policy is an additional browser-side CSRF defense.
- JWT secret configuration is validated at startup and must be at least 32 characters. The example placeholder is rejected.

### Known security limitation

Login and registration do not currently use a distributed rate limiter. An in-memory limiter would not enforce a global limit across serverless instances and has intentionally not been added because the project does not provision additional infrastructure. A production-scale deployment would need a shared rate-limiting mechanism.

## 6. Core business flows

### Group creation and membership

- A student creates a group.
- The database transaction creates the group and the leader's membership together.
- Unique database constraints enforce one active group membership per student and at most one led group per user.
- A group leader can search registered students who are not already in a group and add one using email or normalized student ID.
- The service checks leader ownership and student eligibility inside a transaction. Unique constraints remain the final protection against concurrent membership races.
- Membership removal, group dissolution and transfers are intentionally outside the scope.

### Assignment distribution and access

- An admin creates an assignment with title, description, due date, HTTPS OneDrive URL and target type.
- `ALL_STUDENTS` assignments are eligible for every group, including groups created after the assignment was posted.
- `SELECTED_GROUPS` assignments are eligible only for their linked groups.
- Student endpoints apply the eligibility condition server-side. An ineligible student receives the same not-found response as an unknown assignment ID.
- An assignment's targeting cannot be changed once a student confirmation exists, preserving the meaning of historical progress.
- Assignment deletion is not part of the product scope.

### Individual confirmation and group progress

- After external upload, each student confirms individually through the two-step UI.
- The API derives the student and group from the authenticated session and membership record; it does not accept them from the request body.
- The server records `confirmedAt`. A unique `(assignment_id, student_id)` constraint prevents duplicate confirmations.
- Repeating a confirmation is idempotent and returns the already-recorded confirmation.
- The progress service derives the denominator from current group membership and the numerator from the current members' confirmations for that assignment.
- Progress is not persisted as a percentage. A newly added member can lower the percentage until that member confirms.
- The same status derivation is reused by student assignment responses and professor monitoring/analytics.

### Professor monitoring and metrics

- The overview endpoint reports student, ungrouped student, group and assignment counts.
- It also aggregates all eligible group-assignment pairs into status counts.
- The overall completion metric is completed pairs (both on-time and late) divided by all eligible group-assignment pairs. A pair exists when a group is eligible under the assignment's distribution rule.
- Monitoring returns every eligible group for each selected assignment, with member count, confirmation count, percentage, status and per-member timestamp.
- Assignment and status filters are applied server-side.
- An ungrouped student contributes to the student and ungrouped-student counts, but not to group-assignment completion pairs because the assignment progress denominator is defined at group level.

## 7. Error handling and validation

- Route inputs are parsed through strict Zod schemas to reject unknown properties and malformed identifiers.
- Application errors use explicit HTTP status and stable error codes.
- The centralized error handler returns a consistent envelope and does not expose stack traces or database internals to clients.
- Duplicate registration, group membership and confirmation operations are protected by database uniqueness constraints and mapped to conflict or idempotent outcomes where applicable.
- OneDrive URLs must be valid HTTPS URLs.
- Readiness (`/api/health/ready`) is separate from liveness (`/api/health`) so a process can be live while its database dependency is unavailable.

## 8. Frontend organization and accessibility

The frontend groups pages by feature: authentication, groups, assignments and dashboards. Shared layout, buttons and form fields live under `components/`; a typed API client centralizes response/error parsing.

The UI intentionally uses a simple responsive dashboard layout rather than a complex design system. Semantic landmarks and headings, labelled form controls, visible keyboard focus, skip navigation, native disclosure elements, progress text equivalents and a focus-managed confirmation dialog provide a baseline keyboard and screen-reader experience. Reduced-motion preferences are respected.

## 9. Operational and deployment considerations

- Keep secrets in local `.env` or deployment environment settings; never add secrets to `VITE_` variables or commit them.
- Runtime database access uses the Neon pooled connection string. Prisma CLI migrations and seeding should use the direct connection string.
- Generate the first Prisma migration against a local database at the end-of-development database setup, review it and commit the migration directory before deployment.
- Apply committed migrations with the production-safe deploy command, then seed the admin account.
- Vercel Hobby is subject to personal/non-commercial use restrictions. Confirm current terms and free-tier eligibility before deployment. No paid trials, upgrades, custom domains or paid add-ons are permitted for this assignment.
- Neon can suspend compute after inactivity on a free plan; the first request after quiet time can take longer.
- A deployment is not considered verified until health/readiness endpoints and the full end-to-end workflow have been exercised against the live URL.

## 10. Deliberate non-goals

The application does not implement file storage, OneDrive API integration, chat, messaging, WebSockets, AI features, email notifications, payments, institution-directory integration, multi-institution tenancy, microservices or advanced reporting. These do not improve coverage of the supplied assignment enough to justify their extra operational and implementation cost.

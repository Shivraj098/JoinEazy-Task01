# Database Design

## 1. Design goals

The PostgreSQL model supports the required student/group/assignment workflow with explicit relational constraints. The design prioritizes data integrity and understandable relationships over additional infrastructure.

The schema is defined in `backend/prisma/schema.prisma`. Prisma maps application model names to snake_case PostgreSQL table and column names. Primary keys are UUIDs. Timestamps use timezone-aware PostgreSQL `timestamptz` columns.

## 2. Entity relationship diagram

```mermaid
erDiagram
    USERS ||--o| GROUPS : leads
    USERS ||--o| GROUP_MEMBERSHIPS : has
    GROUPS ||--o{ GROUP_MEMBERSHIPS : contains
    USERS ||--o{ ASSIGNMENTS : creates
    ASSIGNMENTS ||--o{ ASSIGNMENT_GROUPS : targets
    GROUPS ||--o{ ASSIGNMENT_GROUPS : receives
    ASSIGNMENTS ||--o{ SUBMISSION_CONFIRMATIONS : records
    GROUPS ||--o{ SUBMISSION_CONFIRMATIONS : aggregates
    USERS ||--o{ SUBMISSION_CONFIRMATIONS : confirms

    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar student_id UK
        varchar password_hash
        enum role
        timestamptz created_at
        timestamptz updated_at
    }
    GROUPS {
        uuid id PK
        varchar name
        uuid leader_id FK_UK
        timestamptz created_at
        timestamptz updated_at
    }
    GROUP_MEMBERSHIPS {
        uuid id PK
        uuid group_id FK
        uuid student_id FK_UK
        timestamptz joined_at
    }
    ASSIGNMENTS {
        uuid id PK
        varchar title
        text description
        timestamptz due_at
        text one_drive_url
        enum target_type
        uuid created_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    ASSIGNMENT_GROUPS {
        uuid id PK
        uuid assignment_id FK
        uuid group_id FK
        timestamptz created_at
    }
    SUBMISSION_CONFIRMATIONS {
        uuid id PK
        uuid assignment_id FK
        uuid group_id FK
        uuid student_id FK
        timestamptz confirmed_at
    }
```

`UK` marks a unique constraint; `FK` marks a foreign key. A student with a null `student_id` is permitted only for the seeded admin account by application convention; public registration requires a student ID. The database column remains nullable because both roles share the `users` table.

## 3. Tables and columns

### `users`

| Column | Type | Rules / purpose |
| --- | --- | --- |
| `id` | UUID | Primary key, generated UUID. |
| `name` | `varchar(100)` | Display name. |
| `email` | `varchar(254)` | Unique; normalized to lowercase by the application. |
| `student_id` | `varchar(64)`, nullable | Unique official student identifier; trimmed and uppercased on registration. Null for admin. |
| `password_hash` | String | bcrypt password hash; never returned by API serializers. |
| `role` | Enum `STUDENT`, `ADMIN` | Defaults to `STUDENT`; public registration cannot choose the role. |
| `created_at`, `updated_at` | `timestamptz(3)` | Record lifecycle timestamps. |

Relationships: a user can lead at most one group, can have at most one group membership, can create multiple assignments and can create multiple submission confirmations.

### `groups`

| Column | Type | Rules / purpose |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `name` | `varchar(60)` | Group display name. |
| `leader_id` | UUID | Required FK to `users.id`; unique so a user leads at most one group. |
| `created_at`, `updated_at` | `timestamptz(3)` | Record lifecycle timestamps. |

The group creator is assigned as leader and receives a matching membership row in the same database transaction.

### `group_memberships`

| Column | Type | Rules / purpose |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `group_id` | UUID | Required FK to `groups.id`. |
| `student_id` | UUID | Required FK to `users.id`; unique, enforcing one group per student. |
| `joined_at` | `timestamptz(3)` | Membership creation time. |

An index on `group_id` supports group membership retrieval. This table is the source of truth for current group membership and the group-progress denominator.

### `assignments`

| Column | Type | Rules / purpose |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `title` | `varchar(150)` | Assignment title. |
| `description` | Text | Assignment instructions. |
| `due_at` | `timestamptz(3)` | Assignment deadline. |
| `one_drive_url` | Text | HTTPS link supplied by the professor; files remain external. |
| `target_type` | Enum `ALL_STUDENTS`, `SELECTED_GROUPS` | Describes the assignment distribution rule. |
| `created_by_id` | UUID | Required FK to the admin user. |
| `created_at`, `updated_at` | `timestamptz(3)` | Record lifecycle timestamps. |

Indexes on `due_at` support deadline-oriented ordering and on `created_by_id` support creator lookups.

### `assignment_groups`

| Column | Type | Rules / purpose |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `assignment_id` | UUID | Required FK to `assignments.id`. |
| `group_id` | UUID | Required FK to `groups.id`. |
| `created_at` | `timestamptz(3)` | Link creation time. |

A unique composite constraint on `(assignment_id, group_id)` prevents a selected group from being linked to the same assignment more than once. An index on `group_id` supports group assignment lookups.

`ALL_STUDENTS` assignments do not need one row per group. They are eligible for every group by the assignment's `target_type`. `SELECTED_GROUPS` assignments use rows in this join table.

### `submission_confirmations`

| Column | Type | Rules / purpose |
| --- | --- | --- |
| `id` | UUID | Primary key. |
| `assignment_id` | UUID | Required FK to `assignments.id`. |
| `group_id` | UUID | Required FK to the group at confirmation time. |
| `student_id` | UUID | Required FK to the confirming user. |
| `confirmed_at` | `timestamptz(3)` | Server-generated confirmation timestamp. |

A unique composite constraint on `(assignment_id, student_id)` allows one confirmation per student per assignment. An index on `(assignment_id, group_id)` supports monitoring an assignment's group confirmations.

## 4. Relationships and cardinality

| Relationship | Cardinality | Enforcement |
| --- | --- | --- |
| User to led group | One user to zero or one group | Unique `groups.leader_id`. |
| User to membership | One user to zero or one membership | Unique `group_memberships.student_id`. |
| Group to memberships | One group to many students | FK `group_memberships.group_id`. |
| Admin user to assignments | One creator to many assignments | FK `assignments.created_by_id`. |
| Assignment to selected groups | Many-to-many | `assignment_groups` join table. |
| Assignment to confirmations | One assignment to many confirmations | FK `submission_confirmations.assignment_id`. |
| Group to confirmations | One group to many confirmations | FK `submission_confirmations.group_id`. |
| User to confirmations | One student to many confirmations | FK `submission_confirmations.student_id`. |

## 5. Integrity rules and indexes

### Uniqueness

- `users.email` is unique.
- `users.student_id` is unique when not null; PostgreSQL permits multiple nulls in a standard unique constraint.
- `groups.leader_id` is unique.
- `group_memberships.student_id` is unique, enforcing one active group membership per student.
- `(assignment_groups.assignment_id, assignment_groups.group_id)` is unique.
- `(submission_confirmations.assignment_id, submission_confirmations.student_id)` is unique.

These constraints are the final defense against duplicate or concurrent writes. Service-level checks provide clear user-facing errors but are not the sole integrity mechanism.

### Foreign keys and deletion behavior

All declared relations use restrictive deletion behavior (`onDelete: Restrict`). Deleting a user, group or assignment cannot silently cascade away the history needed for submission monitoring. The application does not expose group, membership or assignment deletion workflows.

### Indexes

- `group_memberships(group_id)` supports member listing.
- `assignments(due_at)` supports deadline sorting and reporting.
- `assignments(created_by_id)` supports creator filtering.
- `assignment_groups(group_id)` supports group-to-assignment lookup.
- `submission_confirmations(assignment_id, group_id)` supports assignment/group confirmation lookups.
- Unique indexes also accelerate lookups by email, student ID, leader, membership student, assignment/group pair and assignment/student confirmation pair.

## 6. Derived progress model

Group progress is not stored as a percentage or status column. It is calculated from:

- the current membership rows for the group (denominator);
- confirmation rows matching the assignment and current members (numerator);
- the assignment deadline; and
- the latest confirmation timestamp.

The progress service returns `memberCount`, `confirmedCount`, `progressPercentage`, `status`, `latestConfirmedAt` and per-member confirmation state. Both student-facing assignment views and admin monitoring use the same status derivation function.

Status rules:

- `PENDING`: zero members confirmed, deadline not passed.
- `IN_PROGRESS`: one or more but not all current members have confirmed, deadline not passed.
- `OVERDUE`: deadline passed and at least one current member remains unconfirmed.
- `COMPLETED`: all current members have confirmed by the deadline.
- `COMPLETED_LATE`: all current members have confirmed, but the latest confirmation is after the deadline.

Adding a member after other students have confirmed increases the denominator and may reduce the progress percentage. The current-member rule is deliberate; membership removal/transfer is not supported, so confirmation history is not recalculated against an alternate former membership.

The professor's overall completion metric is:

\[
\text{Completion} = \frac{\text{COMPLETED pairs} + \text{COMPLETED\_LATE pairs}}{\text{All eligible group-assignment pairs}} \times 100
\]

A pair is eligible when the assignment targets all students or its `assignment_groups` relation includes that group. Ungrouped students are counted in workspace student totals but are not group-assignment pairs.

## 7. Transaction boundaries

- **Group creation:** group row and leader membership are inserted in one transaction, preserving the creator/leader/member invariant.
- **Adding a member:** the service verifies group leader and student eligibility inside a transaction. Serializable isolation and unique constraints handle concurrent attempts.
- **Assignment creation/editing:** assignment and selected-group links are written together. Target changes are rejected after a confirmation exists so historical progress retains its intended audience.
- **Submission confirmation:** membership, assignment eligibility, duplicate lookup and confirmation creation execute in a transaction. Unique constraints and conflict handling make retries idempotent.

## 8. Migration workflow

The Prisma schema is the source model for database migration generation. The first migration is created on the developer's machine once a local PostgreSQL instance is available:

```powershell
npm run db:up
npm run db:migrate --workspace=backend -- --name init
```

Review and commit the generated `backend/prisma/migrations/` directory. Use `npm run db:deploy` to apply committed migrations in an environment. Do not use `prisma migrate dev` as a production deployment command.

For Neon, `DATABASE_URL` should be the pooled connection string for runtime and `DIRECT_URL` the direct string for migrations and seeding. The migration history must be committed before deploying an empty hosted database.

## 9. Deliberate constraints and future considerations

- Student ID presence and normalization are enforced by application registration validation. The current schema leaves the column nullable because admin users share the `users` table; the external institution registry is not consulted.
- Group membership is intentionally limited to one group per student. There is no transfer, leave or removal workflow.
- The group leader is unique and cannot lead a second group.
- Assignments can be edited but not deleted; the target audience cannot be changed after confirmation begins.
- Submission metadata is stored, not submitted files. OneDrive remains the external file destination.
- The schema avoids a persisted progress percentage because it can become stale when group membership changes.
- Any future change to membership lifecycle, confirmation history, deletion policy or institution-level tenancy should begin with an explicit data migration and a review of the related invariants.

# Multi-Tenant CRM System — Backend

Built with **NestJS**, **TypeScript**, **PostgreSQL**, and **TypeORM**.

---

## Setup

for locally setup
```bash
npm install
cp .env.example .env   # fill in your values
npm run start:dev
```

migration: npm run migration:run
---

## Architecture Decisions

### Folder Structure

Each domain (organizations, users, customers, notes, activity-logs) lives in its own NestJS module with a strict separation between controller, service, entity, and DTOs. No business logic lives in controllers — they only parse input and delegate to services.

### Multi-Tenancy Isolation

Every domain entity (`User`, `Customer`, `Note`, `ActivityLog`) carries an `organizationId` column. Every database query scopes results by `organizationId` derived from the authenticated user's JWT token — never from the request body. This means:

- A user cannot query another organization's data even if they know the UUID
- `organizationId` is never trusted from the client — it is always taken from the verified JWT payload
- Cascading deletes from `Organization` ensure orphaned data cannot exist

### Authentication

Authentication is email-only (no password). `POST /auth/login` accepts an email, looks up the user, and returns a signed JWT containing `id`, `email`, `role`, and `organizationId`. The `JwtAuthGuard` verifies the token on every protected route and populates `request.user` directly from the payload — no database call on every request. This keeps the guard stateless and dependency-free.

### Role-Based Access

Two roles exist: `admin` and `member`.

| Capability | Admin | Member |
|---|---|---|
| Create users | ✅ (own org only) | ❌ |
| View customers | All organizations | Own organization only |
| View activity logs | All organizations | Own organization only |
| Delete notes | Any in org | Own notes only |

Role is embedded in the JWT and checked in service methods — not in controllers.

---

## Concurrency-Safe Assignment

### The Problem

Each user may have at most **5 active customers** assigned. Without locking, a race condition exists:

1. Request A reads: user has 4 active customers → passes check
2. Request B reads: user has 4 active customers → passes check
3. Both proceed → user ends up with 6 active customers

### The Solution: Pessimistic Row-Level Locking

When assigning a customer (on create or reassign), the service opens a PostgreSQL transaction and immediately acquires a `SELECT ... FOR UPDATE` lock on the target user row:

```sql
BEGIN;
SELECT id FROM users WHERE id = $1 FOR UPDATE;  -- blocks concurrent assigners
SELECT COUNT(*) FROM customers WHERE user_id = $1 AND deleted_at IS NULL;
-- if count < 5: insert/update customer
-- if count >= 5: raise error, ROLLBACK
COMMIT;
```

The `FOR UPDATE` lock means the second concurrent request **blocks at the lock acquisition step** until the first transaction commits. After unblocking, it re-reads the count against the now-committed state and correctly sees 5 — then rejects.

This approach:
- Requires no external infrastructure (no Redis, no queues)
- Uses a feature PostgreSQL already provides
- Adds minimal latency (lock contention only occurs when two requests target the same user simultaneously)
- Is correct under any level of concurrency

The lock is applied in two places:
- `create` — customer is auto-assigned to the creating user
- `update` — only when `userId` is changing to a different user

---

## Performance Strategy

### Indexing

Indexes are chosen based on actual query patterns, not speculatively:


**Why no index on `name` for search?**
The customer search uses `ILIKE '%keyword%'` (substring match). B-tree indexes cannot satisfy substring searches — only prefix searches (`LIKE 'keyword%'`). Adding an index on `name` would give false confidence without any query benefit. For production-scale full-text search, a `pg_trgm` GIN index on `name` and `email` would be the correct solution.

### Pagination

All list endpoints use `skip/take` (LIMIT/OFFSET) with a default page size of 20 and a maximum of 100. The `(organizationId, createdAt)` composite index allows PostgreSQL to satisfy both the filter and the `ORDER BY createdAt DESC` from the same index scan, making deep pagination efficient at 100k+ rows.

### Avoiding N+1 Queries

Relations (`user`, `notes`, `organization`) are loaded eagerly using TypeORM's `relations` option in a single JOIN query — never in a loop. Notes are always returned nested inside the customer response, so no second round-trip is needed to fetch them.

---

## Soft Delete Integrity

Customers are soft-deleted by setting `deletedAt`. TypeORM's `@DeleteDateColumn` automatically appends `WHERE deletedAt IS NULL` to all standard queries — soft-deleted customers never appear in normal results without any extra filtering code.

When a customer is soft-deleted:
- Their notes remain in the database untouched
- Their activity logs remain in the database untouched
- `POST /customers/:id/restore` clears `deletedAt`, restoring full visibility

---

## Production Improvement: Rate Limiting

Rate limiting is applied globally using `@nestjs/throttler` as an `APP_GUARD`, meaning every route in the system is protected without needing to decorate individual controllers.

**Configuration:**

| Scope | Limit | Window |
|---|---|---|
| All routes (global) | 100 requests | per minute per IP |
| `POST /auth/login` | 10 requests | per minute per IP |

**Why rate limiting?**

Without it, any endpoint is open to abuse:
- The login endpoint can be enumerated to discover valid emails
- Write endpoints (create customer, add note) can be spammed to pollute data
- Read endpoints can be scraped to extract the entire customer database

The login endpoint gets a tighter limit (10/min) because it is unauthenticated and is the most sensitive surface — an attacker can probe it without a valid token.

When the limit is exceeded, the API returns `429 Too Many Requests`. The client must wait for the time window to reset before retrying.

**Why this over other options?**

Rate limiting is infrastructure that protects every other feature. Logging, caching, and tracing add value but do not prevent abuse. For a multi-tenant CRM where one tenant's abuse could affect another's availability, rate limiting is the highest-priority production addition.

---

## Production Improvement: Activity Logging

Every significant action in the system is recorded in the `activity_logs` table:

| Event | Trigger |
|---|---|
| `created` | Customer created |
| `updated` | Customer fields updated |
| `assigned` | Customer assigned to a different user |
| `deleted` | Customer soft-deleted |
| `restored` | Customer restored |
| `note_added` | Note created on a customer |

Logs are written by the service layer after the main operation succeeds — not inline in controllers. This keeps controllers thin and makes the logging concerns easy to modify independently. Logs are immutable (no update/delete endpoints) and are never soft-deleted, preserving a permanent audit trail.

Admins can view logs across all organizations. Members see only their own organization's logs. Logs can be filtered by `entityType` and `entityId` (e.g., view all history for a specific customer).

---




### Rate Limiting
Add `@nestjs/throttler` globally to prevent abuse. Per-user rate limits are more appropriate than per-IP for an authenticated API.

---

## Scaling This System

The current architecture is designed to scale incrementally. Below are the key areas and the strategies to address them as load grows.

### Database

| Concern | Strategy |
|---|---|
| Read-heavy traffic | Add PostgreSQL read replicas. Route all `SELECT` queries to a replica; keep writes on the primary. TypeORM supports multiple connections. |
| Full-text search at scale | Replace `ILIKE` with a `pg_trgm` GIN index, or migrate search to Elasticsearch/OpenSearch for sub-10ms latency at 10M+ records. |
| Connection exhaustion | Add a connection pooler (PgBouncer) in front of PostgreSQL. Each NestJS instance holds its own pool; PgBouncer multiplexes them to stay within PostgreSQL's `max_connections`. |
| Vertical limits | Partition the `customers` and `activity_logs` tables by `organization_id` (PostgreSQL declarative partitioning). Each tenant's data lands in its own partition, keeping index sizes manageable. |

### Application Layer

| Concern | Strategy |
|---|---|
| Stateless scaling | The app is already stateless (JWT, no server-side sessions). Add multiple instances behind a load balancer (Nginx, AWS ALB) immediately. |
| Activity log write latency | Decouple log writes from the request path using a message queue (BullMQ + Redis). The service publishes an event; a background worker persists the log. This reduces p99 latency on write endpoints. |
| Rate limiting across instances | The current `@nestjs/throttler` in-memory store does not share state between instances. Replace the storage backend with Redis (`ThrottlerStorageRedis`) so limits are enforced correctly across all pods. |
| Caching | Cache frequently-read, rarely-changing data (organization details, user lookups) in Redis with a short TTL. Reduces repeated PostgreSQL hits on hot paths. |

### Infrastructure

| Concern | Strategy |
|---|---|
| Zero-downtime deploys | TypeORM migrations run as a pre-deploy step. Ensure all migrations are backward-compatible (add columns as nullable, never drop columns in the same deploy that removes the code). |
| Observability | Add structured logging (Winston/Pino with JSON output) and export traces (OpenTelemetry) to Datadog or Grafana. Without this, debugging performance issues across multiple instances is guesswork. |
| Secrets management | Move `JWT_SECRET` and database credentials out of `.env` files into a secrets manager (AWS Secrets Manager, HashiCorp Vault) with automatic rotation. |

---

## Trade-offs

| Decision | Trade-off |
|---|---|
| JWT payload contains role + orgId | Role/org changes don't take effect until token expiry (7 days). Acceptable for this scale; mitigate with shorter expiry or a token blocklist. |
| Pessimistic locking for assignment | Slightly slower than optimistic locking under low contention, but simpler and guaranteed correct. No retry logic needed in the client. |
| OFFSET-based pagination | Suffers from page drift on fast-changing datasets. Cursor-based pagination would be more stable but adds frontend complexity. |
| No password auth | Simplifies the system as specified. Production would require at minimum email OTP or OAuth. |
| Activity logs written synchronously | Adds a small latency to every write operation. A message queue (BullMQ) would decouple this but adds infrastructure overhead. |

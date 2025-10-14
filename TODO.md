# STRATUM Project TODO / Roadmap (Living Document)

Retain original quick items at top:
1. Offline sync (see Mobile & Sync section)
2. Improve UI (see Frontend UX section)
3. Add light mode (theme toggle)

---

## 🔄 Data & Sync
- [ ] Design offline data model (conflict resolution strategy: last-write-wins vs CRDT for notes/projects)
- [ ] Implement local persistence (Expo SQLite or WatermelonDB)
- [ ] Background sync queue (retry with exponential backoff)
- [ ] Delta sync endpoints on backend (ETag / updated_at filtering)
- [ ] Conflict resolution rules doc
- [ ] Asset (images / 3D models) lazy sync & placeholder rendering

## 🗃 Backend Core
- [ ] Migrate DB creation from `Base.metadata.create_all` to Alembic migrations
- [ ] Add unique constraints & indexes (projects.slug, notes.project_id + created_at)
- [ ] Implement pagination & filtering (projects, notes) with query params
- [ ] Soft delete for notes/projects (deleted_at column)
- [ ] Add audit log table (who changed what & when)
- [ ] Rate limiting (per IP / token) on write-heavy endpoints
- [ ] Health & readiness endpoints (`/health`, `/ready` including DB & MinIO checks)
- [ ] Service layer abstraction (decouple routes from ORM logic)

## 🔐 Security & Auth
- [ ] Token refresh flow (short-lived access, longer-lived refresh)
- [ ] Cookie based access
- [ ] Role-based access expansion (field-level permissions for confidential finds)
- [ ] Add JWT signature rotation mechanism
- [ ] Secret management (move .env secrets to Docker secrets / Vault for production)
- [ ] Input validation hardening (length limits, mime type whitelist for uploads)
- [ ] Add CORS config validation tests
- [ ] Security headers middleware (Content-Security-Policy, X-Frame-Options)

## 📦 Object Storage / Media
- [ ] Folder structure convention in MinIO (projects/{id}/notes/{id}/)
- [ ] File extension detection and adaptation to it (png files show preview of image/lead to a page with just the png file)
- [ ] Image derivative generation (thumbnail + medium size)
- [ ] 3D model preview pipeline (convert to glTF if needed)
- [ ] Checksum verification on upload & store hash in DB
- [ ] Add signed URL expiration policy (configurable via env)

## 🌐 API Enhancements
- [ ] OpenAPI tags & descriptions cleanup
- [ ] Add versioning (prefix /v1; future /v2)
- [ ] Error response standardization (problem+json schema)
- [ ] Add search endpoint (projects/notes by keyword, basic full-text) using PostgreSQL tsvector
- [ ] Bulk operations (batch create notes)
- [ ] GraphQL read-only explorer (optional)

## 🧪 Testing & Quality
- [ ] Set up pytest fixtures for temp MinIO & Postgres (testcontainers or local docker)
- [ ] Unit tests coverage target 70% -> 85%
- [ ] Integration tests for auth guard paths
- [ ] Performance baseline (locust / k6 scenario: 100 concurrent note uploads)
- [ ] Add lint & format pre-commit hooks (black, flake8, isort)
- [ ] CI pipeline (GitHub Actions) for backend & frontend (lint + test)
- [ ] Security scanning (pip-audit / bandit)

## 📱 Frontend UX (Expo)
- [ ] Implement global theme switch (dark/light + system) & persist setting
- [ ] Improve navigation hierarchy (deep links to specific notes/projects)
- [ ] Skeleton loaders while fetching projects & notes
- [ ] Optimistic UI for note create/edit
- [ ] Error boundary & toast notification system
- [ ] Accessibility pass (contrast, VoiceOver / TalkBack labels)
- [ ] Unified form components (input, textarea, file picker) with validation states
- [ ] Image & 3D asset preview component

## 🗺 Archaeology-Specific Features
- [ ] GIS / geotagging for finds (lat/long, site code)
- [ ] Layered stratigraphy visualization component
- [ ] 3D point cloud viewer integration refinement (potree-core usage audit)
- [ ] Annotation system on images / point clouds (pin + comment)
- [ ] Provenance tracking (chain of custody metadata fields)
- [ ] Controlled vocabulary / taxonomy (artifact types) reference table

## 💾 Data Model Improvements
- [ ] Add `slug` to Project (human-friendly URLs)
- [ ] Add `updated_at` triggers (Postgres ON UPDATE) or SQLAlchemy event listener
- [ ] Separate table for attachments (notes_attachments) vs embedding paths in notes
- [ ] Tagging system (many-to-many note_tags)
- [ ] Add `visibility` enum (public, team, restricted)

## ⚙ Dev Experience
- [ ] Docker Compose setup (postgres, minio, backend, optional pgadmin)
- [ ] Makefile / task runner (setup, migrate, start)
- [ ] VS Code recommended extensions settings file
- [ ] Local seed script (sample projects & notes)
- [ ] Hot reload for Alembic migrations in dev (script)

## 📊 Observability
- [ ] Structured logging (JSON) with request IDs
- [ ] Centralized error handling & Sentry integration (or OpenTelemetry)
- [ ] Metrics endpoint (Prometheus style; requests/sec, upload durations)
- [ ] Slow query logging & index suggestions

## 🚀 Deployment / Infra
- [ ] Containerize backend with multi-stage Dockerfile
- [ ] CI build & push images
- [ ] Staging environment with seed data
- [ ] Infrastructure as Code sketch (Terraform modules outline)
- [ ] HTTPS & reverse proxy (Traefik or Nginx) config docs
- [ ] Backup strategy (daily pg_dump + MinIO snapshots)

## 🔄 Migrations from current state
- [ ] Replace direct metadata create_all with Alembic revision baseline
- [ ] Introduce indexing migration
- [ ] Data backfill script for any new columns (e.g., slug, visibility)

## 🧯 Risk / Tech Debt Items
- [ ] Python 3.14 compatibility warning (pin to 3.12 in runtime until upstream stable)
- [ ] Secrets rotation process doc
- [ ] MinIO credentials currently default (improve for production)
- [ ] Missing retry logic on MinIO upload failures

## 📄 Documentation
- [ ] Architecture overview diagram
- [ ] Data flow for asset upload
- [ ] Sync conflict resolution guide
- [ ] Contribution guide (coding standards, branching, commit messages)
- [ ] API usage examples (curl + JS + Python)

## ✅ Immediate Next High-Impact (Top 5)
1. Docker Compose environment (accelerates all dev)
2. Alembic baseline & remove create_all bootstrap
3. Theme toggle (completes original TODO item #3)
4. Offline data model decision document
5. Structured logging + request IDs for debugging

---
Legend: [ ] not started / [x] done. Keep this file updated as tasks progress.

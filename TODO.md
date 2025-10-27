# STRATUM Project TODO / Roadmap (Living Document)

This file uses priority tags and per-task notes to help plan work:

- Priority tags: [P0] critical, [P1] high, [P2] normal, [P3] nice-to-have
- Every task has a checkbox and an optional Notes field for developers
- Categories are ordered from most viable/impactful to least

Template for tasks:

- [ ] [P1] Short task title — concise purpose
	- Notes: …

---

## ✅ Recently Completed (last few weeks)

- [x] Web PDF preview in data-preview via Chromium iframe ([`PdfPanel.web`](frontend/stratum-app/src/components/data/PdfPanel.web.tsx), [`data-preview`](frontend/stratum-app/app/data-preview.tsx)); Edit/Save hidden for PDFs
	- Notes: Routed from Files overlay and Gallery; object URL lifecycle handled on unmount
- [x] Files UX: red-styled Download/Move and red "\root" header link ([`app/project/[id].tsx`](frontend/stratum-app/app/project/%5Bid%5D.tsx), [`FilesOverlay`](frontend/stratum-app/src/components/project/FilesOverlay.tsx))
	- Notes: Aligns with LOCKED badge styling
- [x] Move safety: 409 conflict on duplicate sibling names; client alert ([`backend/app/routes/files.py`](backend/app/routes/files.py))
- [x] Gallery: PDF icon and routing to data-preview ([`FileGallery.tsx`](frontend/stratum-app/src/components/project/FileGallery.tsx))
- [x] Markdown preview upgrades (math/HTML via [`MarkdownView`](frontend/stratum-app/src/components/common/MarkdownView.tsx))
- [x] Artefact creation flow: folder, image uploads, note uploads, QR generation, artefact.json manifest ([`ArtefactsTab.tsx`](frontend/stratum-app/src/components/project/ArtefactsTab.tsx))
- [x] Data-preview panels for CSV/Excel/Text/Markdown
- [x] Fix JSX fragment bug in project screen file rows

---

## P0 — Immediate, High-Impact

### Dev Environment & Core

- [ ] [P0] Docker Compose environment (Postgres, MinIO, backend, optional pgAdmin)
	- Notes: One-command spin-up for onboarding and CI reproducibility
- [ ] [P0] Alembic baseline & remove create_all bootstrap
	- Notes: Create initial revision from current schema; document migration workflow
- [ ] [P0] CI pipeline (GitHub Actions) for backend & frontend (lint + test)
	- Notes: Reuse Testing & Quality checklist below

### Files & Gallery

- [ ] [P0] Multi-select in FilesOverlay (bulk move/delete/download)
	- Notes: Keyboard modifiers on web; long-press on mobile; server batch endpoints
- [ ] [P1] File search/filter within current folder
	- Notes: Client-side first; server-side query params later
- [ ] [P1] Persist breadcrumbs and last-opened folder across sessions
	- Notes: AsyncStorage key per project
- [ ] [P1] Thumbnails for images (server derivative pipeline)
	- Notes: Generate on upload with background job; store sizes in DB
- [ ] [P2] Drag & drop upload (web)
	- Notes: Overlay drop zone + hover feedback

### Data Preview

- [ ] [P0] JSON viewer with collapsible tree
	- Notes: Web-only first with lightweight viewer; native later
- [ ] [P1] Native PDF viewing fallback (WebView or open-in external)
	- Notes: Use `react-native-webview` or share intent if blocked
- [ ] [P2] Column type inference/formatting for CSV (numbers, dates)
	- Notes: Guard performance on large files

### UX & Feedback

- [ ] [P1] Toast notifications for success/error (non-blocking)
	- Notes: Reusable hook; respect platform
- [ ] [P1] Skeleton loaders (projects, notes, files)
	- Notes: Match STRATUM theme
- [ ] [P2] Global theme switch (dark/light + system) & persist setting
	- Notes: Keep dark as default

---

## P1 — Next Sprint Candidates

### Backend Core

- [ ] [P1] Pagination & filtering for file listings
	- Notes: Cursor-based to support large folders
- [ ] [P1] Health & readiness endpoints (`/health`, `/ready`)
	- Notes: Include DB and MinIO checks
- [ ] [P1] Service layer abstraction (decouple routes from ORM logic)
	- Notes: Improves testability

### Security & Auth

- [ ] [P1] Token refresh flow (short-lived access, longer-lived refresh)
	- Notes: Keep mobile/token storage best practices
- [ ] [P1] Security headers middleware (CSP, X-Frame-Options)
	- Notes: Web-only; document CSP for blob/object URLs

### Notes & Artefacts

- [ ] [P1] Markdown editor toolbar (bold/italic/code/headers)
	- Notes: Non-invasive toolbar for TextFilePanel
- [ ] [P1] Edit artefact metadata UI (name, number, previewFileId)
	- Notes: Write back to artefact.json manifest

---

## P2 — Roadmap / Enhancements

### Data & Sync

- [ ] [P2] Design offline data model (LWW vs CRDT)
	- Notes: Begin with notes/files metadata
- [ ] [P2] Local persistence (Expo SQLite or WatermelonDB)
	- Notes: Abstraction layer to mirror API
- [ ] [P2] Background sync queue (retry with backoff)
	- Notes: Tag per project
- [ ] [P2] Delta sync endpoints on backend (ETag / updated_at filtering)
	- Notes: Work with pagination design

### API & Media

- [ ] [P2] OpenAPI tags/descriptions cleanup
	- Notes: Group by domain (auth, projects, files)
- [ ] [P2] Signed URL expiration policy (env-configurable)
	- Notes: Short-lived; refresh flow in UI
- [ ] [P2] Image derivative generation (thumbnail + medium) — server jobs
	- Notes: Shared with P1 thumbnails task

### Observability & Perf

- [ ] [P2] Structured logging (JSON) with request IDs
	- Notes: Correlate UI actions to backend
- [ ] [P2] Metrics endpoint (Prometheus)
	- Notes: Requests/sec, upload durations
- [ ] [P2] Virtualize large file lists and galleries
	- Notes: react-window/react-virtualized; avoid layout thrash

---

## P3 — Nice-to-have / Longer-term

- [ ] [P3] GIS / geotagging for finds
	- Notes: Map display and site code annotations
- [ ] [P3] Stratigraphy visualization component
	- Notes: Requires domain modeling work
- [ ] [P3] 3D point cloud viewer integration refinement
	- Notes: Audit potree-core usage
- [ ] [P3] Annotation system on images/point clouds
	- Notes: Pins + comments; versioning later

---

## File Gallery: Implementation Tasks

- [x] [P1] Grid/List toggle (icons on web)
	- Notes: `react-icons` web-only dynamic imports
- [x] [P1] Day/Week/Month grouping and sorting stability
	- Notes: Use persisted timestamps; avoid Date.now for grouping
- [x] [P1] PDF recognition and routing to data-preview
	- Notes: Keep Edit/Save hidden for PDFs
- [ ] [P1] Search/filter by name and type
	- Notes: Client-only with debounce; server later
- [ ] [P2] Improve icons per filetype (CSV, Excel, Markdown, PDF)
	- Notes: Keep emoji fallback for native
- [ ] [P2] Performance pass for large galleries
	- Notes: Measure and virtualize if needed

---

## Reference: Quality & Workflow (from Roadmap)

### Code Quality Checklist

- [ ] Small, focused functions; meaningful names
- [ ] Comments for complex logic
- [ ] Consistent style (Black/Flake8/Isort or ESLint/Prettier)
- [ ] Meaningful commit messages
- [ ] Add/update API docs for endpoints changed

### Testing Checklist

- [ ] Code runs without errors
- [ ] No console warnings
- [ ] Tested on iOS/Android/Web as applicable
- [ ] API endpoints verified
- [ ] Error handling paths exercised
- [ ] Loading/skeleton states visible
- [ ] Component tests (panels/overlays)
- [ ] Integration tests (file move/rename flows)
- [ ] E2E smoke: open project → upload → preview CSV → preview PDF

### Git Workflow (commands)

```bash
# Create a feature branch
git checkout -b feature/file-gallery-improvements

# Stage & commit changes
git add .
git commit -m "feat(files): add gallery search and grid/list toggle"

# Push and open PR
git push origin feature/file-gallery-improvements
```

---

Legend: [ ] not started / [x] done. Use Notes lines to track context or decisions.

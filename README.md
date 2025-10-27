# STRATUM - Archaeological Site Management Platform

![Phase 1 - Foundation](https://img.shields.io/badge/Phase-1%20Foundation-blue)
![FLL 2025-2026](https://img.shields.io/badge/FLL-UNEARTHED-orange)

**STRATUM** is a comprehensive digital platform designed to help archaeologists plan expeditions, take notes during excavations, collaborate with team members, and export data efficiently. This Innovation Project for FLL 2025-2026 UNEARTHED addresses the lack of standardization in archaeological documentation.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Phase 1 Features](#phase-1-features)
- [Setup Instructions](#setup-instructions)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)

---

## 🎯 Project Overview

STRATUM solves the critical problem of unorganized paper-based note-taking in archaeology by providing:

1. **Digital Note-Taking**: Structured, searchable, and organized documentation
2. **Team Collaboration**: Role-based access control (Leader, Researcher, Guest)
3. **Expedition Planning**: Project management for archaeological sites
4. **Data Export**: Standardized data formats for analysis and reporting
5. **Offline Support**: Local data syncing with cloud backup

---

## 🛠 Tech Stack

### Backend
- **Framework**: Python with FastAPI
- **Database**: PostgreSQL (structured data)
- **Object Storage**: MinIO (photos and files)
- **Authentication**: Firebase Admin SDK
- **ORM**: SQLAlchemy

### Frontend
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Storage**: AsyncStorage

---

## 📁 Project Structure

```
QuantumBitsFLL2025-2026/
├── backend/
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # Database connection
│   │   ├── firebase_config.py # Firebase setup
│   │   ├── minio_client.py  # Object storage
│   │   ├── models.py        # Database models
│   │   ├── schemas.py       # API schemas
│   │   └── main.py          # App entry point
│   ├── .env                 # Environment variables
│   └── requirements.txt     # Dependencies
│
├── frontend/
│   └── stratum-app/
│       ├── app/             # Expo Router pages
│       │   ├── (auth)/      # Auth screens
│       │   └── (tabs)/      # Main app tabs
│       ├── src/
│       │   ├── contexts/    # React contexts
│       │   ├── services/    # API services
│       │   └── config/      # Configuration
│       └── .env             # Environment variables
│
└── resources/               # Documentation
```

---

## ✨ Phase 1 Features

### 1. Authentication System ✅
- Firebase-based user authentication
- Login and registration screens
- JWT token management

### 2. Project Creation ✅
- Create archaeological site projects
- Project metadata management
- Ownership and access control

### 3. Collaboration ✅
- Invite team members
- Role-based permissions (Leader, Researcher, Guest)
- Member management

### 4. Basic Notes System ✅
- Create and edit notes
- Upload photos to notes
- Link notes to projects

### 5. Files & Previews ✅
- File tree with folders and breadcrumbs
- Upload and download files
- Move files with conflict detection (HTTP 409) and UI feedback
- Previews:
  - CSV (table) and Excel (grid) via data-preview
  - Text and Markdown (with KaTeX) via [`MarkdownView`](frontend/stratum-app/src/components/common/MarkdownView.tsx)
  - Images
  - PDF (Web only, view-only) via [`PdfPanel.web`](frontend/stratum-app/src/components/data/PdfPanel.web.tsx) in [`data-preview`](frontend/stratum-app/app/data-preview.tsx)

### 6. File Gallery ✅

- Unified gallery across the project with two views: Grid and List
- Time-based grouping: Day, Week, Month
- File-type aware icons and quick open actions
- Deep-link routing to specialized preview screens (image-preview, data-preview)
- PDF files route to data-preview and open inline (Chromium, view-only)
- Source: [`FileGallery.tsx`](frontend/stratum-app/src/components/project/FileGallery.tsx) and integration in [`app/project/[id].tsx`](frontend/stratum-app/app/project/%5Bid%5D.tsx)

### 7. UX & UI Improvements ✅

- Consistent STRATUM dark theme with better contrast
- Files overlay with breadcrumbs, locked folders, and action rows (download/move)
- Safer moves with backend conflict detection surfaced to the user
- Markdown rendering with math (KaTeX) and sanitized HTML
- Autofill-safe inputs styling on web
- Password show/hide toggles in auth screens

---

## 🚀 Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 18+ and npm
- PostgreSQL 14+
- MinIO (or Docker)
- Firebase Project

### Backend Setup

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up PostgreSQL:**
   ```bash
   createdb stratum_db
   ```

5. **Set up MinIO (Docker):**
   ```bash
   docker run -d -p 9000:9000 -p 9001:9001 \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin" \
     minio/minio server /data --console-address ":9001"
   ```

6. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

7. **Run backend:**
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   
   Access at: http://localhost:8000

### Frontend Setup

1. **Navigate to frontend:**
   ```bash
   cd frontend/stratum-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with Firebase and API config
   ```

4. **Start app:**
   ```bash
   npm start
   ```

5. **Run on platform:**
   ```bash
   npm run ios      # iOS (Mac only)
   npm run android  # Android
   npm run web      # Web browser
   ```

---

## 🔐 Environment Configuration

### Backend `.env`

```env
# Firebase (get from Firebase Console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_CLIENT_ID=your-client-id

# PostgreSQL
DATABASE_URL=postgresql://stratum_user:password@localhost:5432/stratum_db

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=stratum-files

# App
APP_SECRET_KEY=your-random-secret-key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
```

### Frontend `.env`

```env
# API
API_BASE_URL=http://localhost:8000/api

# Firebase Web Config (get from Firebase Console → Project Settings → Web App)
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_APP_ID=your-app-id
```

**Note**: Also update `app.json` with Firebase config in the `extra` section.

---

## 🎮 Running the Application

### Start Backend
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload
```

### Start Frontend
```bash
cd frontend/stratum-app
npm start
```

### Access Points
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001

---

## 📚 API Documentation

Visit http://localhost:8000/docs for interactive API documentation.

### Key Endpoints

**Authentication**
- `GET /auth/me` - Current user info
- `GET /auth/users/search` - Search users

**Projects**
- `POST /projects` - Create project
- `GET /projects` - List projects
- `GET /projects/{id}` - Project details
- `POST /projects/{id}/members` - Add member

**Notes**
- `POST /notes` - Create note
- `GET /notes/project/{project_id}` - Project notes
- `POST /notes/{id}/attachments` - Upload photo

---

## 🗺 Roadmap

- [x] **Phase 1**: Foundation (Auth, Projects, Notes, Collaboration)
- [ ] **Phase 2**: Site Planning (GPS, Tasks, Artifacts)
- [ ] **Phase 3**: Expedition & AI (LiDAR, AI summaries)
- [ ] **Phase 4**: Professional Features (Cloud, Advanced collaboration)

---

## 🆕 What’s New (Last Few Weeks)

- Web PDF preview in data-preview (view-only; Edit/Save hidden) using [`frontend/stratum-app/src/components/data/PdfPanel.web.tsx`](frontend/stratum-app/src/components/data/PdfPanel.web.tsx) and [`frontend/stratum-app/app/data-preview.tsx`](frontend/stratum-app/app/data-preview.tsx)
- Files UX polish: red-styled Download/Move actions and red “\root” header link in [`frontend/stratum-app/app/project/[id].tsx`](frontend/stratum-app/app/project/%5Bid%5D.tsx) and [`frontend/stratum-app/src/components/project/FilesOverlay.tsx`](frontend/stratum-app/src/components/project/FilesOverlay.tsx)
- Safer moves: backend returns 409 on name collisions in [`app.routes.files.move_node`](backend/app/routes/files.py); surfaced as alerts in UI
- Artefacts: QR generation + artefact.json manifest builder in [`frontend/stratum-app/src/components/project/ArtefactsTab.tsx`](frontend/stratum-app/src/components/project/ArtefactsTab.tsx); uploads images/notes and updates manifest
- Markdown rendering upgraded with math and raw HTML support via [`MarkdownView`](frontend/stratum-app/src/components/common/MarkdownView.tsx)
- Gallery: PDF recognized (📑) and routed to data-preview in [`frontend/stratum-app/src/components/project/FileGallery.tsx`](frontend/stratum-app/src/components/project/FileGallery.tsx)

---

**Built with ❤️ by QuantumBits FLL Team 2025-2026**

# Environment Variables Guide

This guide explains all environment variables needed for STRATUM.

---

## 🔙 Backend Environment Variables

### Firebase Configuration

These credentials allow the backend to verify user authentication tokens.

**Where to get them:** Firebase Console → Project Settings → Service Accounts → Generate New Private Key

```env
# Your Firebase project identifier
FIREBASE_PROJECT_ID=your-project-id

# Unique identifier for your service account's private key
FIREBASE_PRIVATE_KEY_ID=abc123def456...

# The private key used to authenticate with Firebase
# IMPORTANT: Keep the quotes and \n characters intact
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n"

# Email address of your Firebase service account
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Client ID for your service account
FIREBASE_CLIENT_ID=123456789012345678901

# OAuth authentication URI (usually doesn't change)
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth

# Token URI (usually doesn't change)
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# Certificate provider URL (usually doesn't change)
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs

# Your service account's certificate URL
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com
```

### PostgreSQL Configuration

Database for storing structured data (users, projects, notes, etc.)

```env
# PostgreSQL username
POSTGRES_USER=stratum_user

# PostgreSQL password - use a strong password in production!
POSTGRES_PASSWORD=your-secure-password-here

# Database name
POSTGRES_DB=stratum_db

# Database host (localhost for local development)
POSTGRES_HOST=localhost

# Database port (5432 is PostgreSQL default)
POSTGRES_PORT=5432

# Full database connection URL
# Format: postgresql://username:password@host:port/database
DATABASE_URL=postgresql://stratum_user:your-secure-password-here@localhost:5432/stratum_db
```

### MinIO Configuration

Object storage for files (photos, attachments, etc.)

```env
# MinIO server endpoint (without http://)
MINIO_ENDPOINT=localhost:9000

# MinIO access key (username)
MINIO_ACCESS_KEY=minioadmin

# MinIO secret key (password)
MINIO_SECRET_KEY=minioadmin

# Bucket name where files will be stored
MINIO_BUCKET_NAME=stratum-files

# Use SSL/TLS? (false for local development)
MINIO_USE_SSL=false
```

### Application Configuration

General app settings

```env
# Secret key for signing JWT tokens and other security features
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
APP_SECRET_KEY=your-random-secret-key-here

# Enable debug mode? (true for development, false for production)
APP_DEBUG=True

# Host to bind to (0.0.0.0 allows external connections)
APP_HOST=0.0.0.0

# Port for the API server
APP_PORT=8000

# Allowed origins for CORS (comma-separated)
# Add your frontend URLs here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006,http://localhost:8081

# Environment name
ENVIRONMENT=development
```

---

## 📱 Frontend Environment Variables

### API Configuration

```env
# Backend API base URL
# For local development: http://localhost:8000/api
# For physical device: http://YOUR_COMPUTER_IP:8000/api (e.g., http://192.168.1.100:8000/api)
API_BASE_URL=http://localhost:8000/api
```

### Firebase Web Configuration

These credentials allow the frontend to authenticate users.

**Where to get them:** Firebase Console → Project Settings → General → Your apps → Web app

```env
# Web API key for Firebase
FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Auth domain for your project
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com

# Firebase project ID (same as backend)
FIREBASE_PROJECT_ID=your-project-id

# Storage bucket for Firebase Storage
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Messaging sender ID for push notifications
FIREBASE_MESSAGING_SENDER_ID=123456789012

# Firebase app ID
FIREBASE_APP_ID=1:123456789012:web:abcdef0123456789abcdef
```

### App Configuration

```env
# App name
APP_NAME=STRATUM

# App version
APP_VERSION=1.0.0
```

---

## 🔧 app.json Configuration

The `app.json` file also needs Firebase configuration in the `extra` section:

```json
{
  "expo": {
    ...
    "extra": {
      "apiBaseUrl": "http://localhost:8000/api",
      "firebaseApiKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "firebaseAuthDomain": "your-project-id.firebaseapp.com",
      "firebaseProjectId": "your-project-id",
      "firebaseStorageBucket": "your-project-id.appspot.com",
      "firebaseMessagingSenderId": "123456789012",
      "firebaseAppId": "1:123456789012:web:abcdef0123456789abcdef"
    }
  }
}
```

---

## 🔐 Security Best Practices

### For Development
- ✅ Use `.env` files (already in `.gitignore`)
- ✅ Use default MinIO credentials (minioadmin/minioadmin)
- ✅ Use simple PostgreSQL passwords locally

### For Production
- ❌ **NEVER** commit `.env` files to Git
- ✅ Use strong, random passwords for all services
- ✅ Enable SSL/TLS for MinIO (`MINIO_USE_SSL=true`)
- ✅ Use environment variables from your hosting platform
- ✅ Rotate secrets regularly
- ✅ Restrict CORS origins to your actual domains
- ✅ Use a secret manager (AWS Secrets Manager, Azure Key Vault, etc.)

---

## 🔍 How to Get Firebase Credentials

### Backend (Service Account)

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the ⚙️ gear icon → **Project Settings**
4. Navigate to **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. Download the JSON file
7. Open the JSON and extract values:
   ```json
   {
     "project_id": "→ FIREBASE_PROJECT_ID",
     "private_key_id": "→ FIREBASE_PRIVATE_KEY_ID",
     "private_key": "→ FIREBASE_PRIVATE_KEY",
     "client_email": "→ FIREBASE_CLIENT_EMAIL",
     "client_id": "→ FIREBASE_CLIENT_ID",
     "client_x509_cert_url": "→ FIREBASE_CLIENT_CERT_URL"
   }
   ```

### Frontend (Web App)

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the ⚙️ gear icon → **Project Settings**
4. Navigate to **General** tab
5. Scroll to **"Your apps"** section
6. If no web app exists, click **"Add app"** → Select **Web** (</>) icon
7. Register your app with a nickname
8. Copy the configuration object:
   ```javascript
   const firebaseConfig = {
     apiKey: "→ FIREBASE_API_KEY",
     authDomain: "→ FIREBASE_AUTH_DOMAIN",
     projectId: "→ FIREBASE_PROJECT_ID",
     storageBucket: "→ FIREBASE_STORAGE_BUCKET",
     messagingSenderId: "→ FIREBASE_MESSAGING_SENDER_ID",
     appId: "→ FIREBASE_APP_ID"
   };
   ```

### Enable Authentication

Don't forget to enable Email/Password authentication:

1. Firebase Console → **Authentication**
2. Click **"Get Started"** (if first time)
3. Go to **"Sign-in method"** tab
4. Click **"Email/Password"**
5. **Enable** the first option (Email/Password)
6. Click **"Save"**

---

## 📋 Quick Copy Templates

### Backend .env Template
```env
# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_CLIENT_ID=
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=

# PostgreSQL
POSTGRES_USER=stratum_user
POSTGRES_PASSWORD=changeme
POSTGRES_DB=stratum_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://stratum_user:changeme@localhost:5432/stratum_db

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=stratum-files
MINIO_USE_SSL=false

# App
APP_SECRET_KEY=generate-random-secret-here
APP_DEBUG=True
APP_HOST=0.0.0.0
APP_PORT=8000
ALLOWED_ORIGINS=http://localhost:19006,http://localhost:8081

# Environment
ENVIRONMENT=development
```

### Frontend .env Template
```env
# API
API_BASE_URL=http://localhost:8000/api

# Firebase
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# App
APP_NAME=STRATUM
APP_VERSION=1.0.0
```

---

## ✅ Verification Checklist

Before running the app, verify:

**Backend:**
- [ ] All Firebase variables filled
- [ ] DATABASE_URL matches your PostgreSQL setup
- [ ] MinIO credentials match your MinIO installation
- [ ] APP_SECRET_KEY is set (not empty)
- [ ] ALLOWED_ORIGINS includes your frontend URL

**Frontend:**
- [ ] API_BASE_URL points to your running backend
- [ ] All Firebase variables filled
- [ ] Same values copied to `app.json` under `extra`

**Services:**
- [ ] PostgreSQL is running
- [ ] MinIO is running (Docker container or standalone)
- [ ] Firebase Authentication is enabled in console

---

Need help? Check the [QUICKSTART.md](QUICKSTART.md) guide!

# STRATUM - Quick Start Guide

Get STRATUM up and running in minutes!

## 🚀 Prerequisites

Before you begin, make sure you have:
- [ ] Python 3.9+ installed
- [ ] Node.js 18+ and npm installed
- [ ] PostgreSQL 14+ installed
- [ ] Docker installed (for MinIO)
- [ ] A Firebase project created

---

## 📦 1. Clone the Repository

```bash
git clone <your-repo-url>
cd QuantumBitsFLL2025-2026
```

---

## 🔧 2. Backend Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Setup Databases

**PostgreSQL:**
```bash
createdb stratum_db
```

**MinIO (using Docker):**
```bash
docker run -d -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  --name minio \
  minio/minio server /data --console-address ":9001"
```

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `backend/.env` and fill in **at minimum**:

```env
# Get these from Firebase Console
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=your-cert-url

# Database
DATABASE_URL=postgresql://stratum_user:yourpassword@localhost:5432/stratum_db

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# App
APP_SECRET_KEY=generate-a-random-secret-key-here
ALLOWED_ORIGINS=http://localhost:19006,http://localhost:3000
```

### Step 4: Start Backend

```bash
python -m uvicorn app.main:app --reload
```

✅ Backend running at: **http://localhost:8000**
📚 API Docs at: **http://localhost:8000/docs**

---

## 📱 3. Frontend Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd ../frontend/stratum-app
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `frontend/stratum-app/.env`:

```env
# API
API_BASE_URL=http://localhost:8000/api

# Get these from Firebase Console → Project Settings → Web App
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
```

### Step 3: Update app.json

Edit `app.json` and update the `extra` section with your Firebase config:

```json
"extra": {
  "apiBaseUrl": "http://localhost:8000/api",
  "firebaseApiKey": "your-api-key",
  "firebaseAuthDomain": "your-project.firebaseapp.com",
  "firebaseProjectId": "your-project-id",
  "firebaseStorageBucket": "your-project.appspot.com",
  "firebaseMessagingSenderId": "your-sender-id",
  "firebaseAppId": "your-app-id"
}
```

### Step 4: Start Frontend

```bash
npm start
```

Then:
- Press `w` for web
- Press `a` for Android (requires Android Studio)
- Press `i` for iOS (requires Mac + Xcode)
- Scan QR code with Expo Go app on your phone

✅ Frontend running!

---

## 🔑 4. Firebase Configuration

### Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one)
3. Enable **Authentication** → **Email/Password** sign-in method

### Backend Credentials (Service Account)

1. Go to **Project Settings** → **Service Accounts**
2. Click **"Generate New Private Key"**
3. Download the JSON file
4. Copy values to `backend/.env`

### Frontend Credentials (Web App)

1. Go to **Project Settings** → **General**
2. Scroll to **"Your apps"**
3. Click **"Add app"** → Select **Web** (if not already added)
4. Copy the config values to `frontend/.env` and `app.json`

---

## ✅ 5. Verify Installation

### Check Backend
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

### Check MinIO
- Visit: http://localhost:9001
- Login with: `minioadmin` / `minioadmin`

### Test Frontend
- Create an account in the app
- Login
- See the projects screen

---

## 🐛 Troubleshooting

### Backend Issues

**"Connection refused" to PostgreSQL:**
```bash
# Make sure PostgreSQL is running
brew services start postgresql  # Mac
sudo service postgresql start   # Linux
```

**"Firebase initialization failed":**
- Check your Firebase credentials in `.env`
- Make sure the private key is properly formatted with `\n` for newlines

**"MinIO bucket error":**
```bash
# Restart MinIO container
docker restart minio
```

### Frontend Issues

**"Network request failed":**
- Make sure backend is running on port 8000
- Check `API_BASE_URL` in `.env`
- For physical device, use your computer's local IP instead of localhost

**"Firebase auth error":**
- Verify Firebase config in `.env` and `app.json`
- Enable Email/Password authentication in Firebase Console

**Metro bundler cache issues:**
```bash
npx expo start --clear
```

---

## 📝 Next Steps

1. **Create your first project** - Add an archaeological site
2. **Invite team members** - Test collaboration features
3. **Create notes** - Document findings with text and photos
4. **Explore API docs** - Visit http://localhost:8000/docs

---

## 🆘 Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review Firebase setup guides
- Check the `resources/` folder for project details

---

## 🎯 Quick Commands Reference

### Backend
```bash
# Start backend
cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload

# View logs
# Logs appear in terminal

# Stop backend
# Ctrl+C
```

### Frontend
```bash
# Start frontend
cd frontend/stratum-app && npm start

# Clear cache
npx expo start --clear

# Run on specific platform
npm run ios
npm run android
npm run web
```

### Database
```bash
# Access PostgreSQL
psql -U postgres stratum_db

# Access MinIO Console
open http://localhost:9001
```

---

**Ready to document archaeology! 🏺✨**

# STRATUM Backend

Python backend for the STRATUM archaeological site management platform.

## Setup

1. Install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase credentials
   - Configure PostgreSQL connection
   - Configure MinIO credentials

3. Set up PostgreSQL:
```bash
# Install PostgreSQL if not already installed
# Create database
createdb stratum_db
```

4. Set up MinIO:
```bash
# Install MinIO or use Docker
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=your-minio-access-key" \
  -e "MINIO_ROOT_PASSWORD=your-minio-secret-key" \
  minio/minio server /data --console-address ":9001"
```

5. Run the application:
```bash
python -m uvicorn app.main:app --reload
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── firebase_config.py   # Firebase setup
│   ├── minio_client.py      # MinIO client
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── dependencies.py      # FastAPI dependencies
│   └── routes/
│       ├── __init__.py
│       ├── auth.py          # Authentication routes
│       ├── projects.py      # Project management
│       └── notes.py         # Notes and attachments
├── .env                     # Environment variables (not in git)
├── .env.example             # Example environment variables
├── .gitignore
└── requirements.txt
```

## Phase 1 Features

✓ Authentication system with Firebase
✓ Project creation and management
✓ Collaboration with role-based permissions (Leader, Researcher, Guest)
✓ Basic notes system with photo uploads
✓ Data storage with PostgreSQL and MinIO

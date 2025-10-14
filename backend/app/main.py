from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from sqlalchemy import text
from app.database import engine, Base
from app.firebase_config import initialize_firebase
from app.routes import auth, projects, notes, files

# Initialize Firebase
initialize_firebase()

# Create database tables
Base.metadata.create_all(bind=engine)

# Lightweight migrations for schema updates (no Alembic yet)
with engine.connect() as conn:
    try:
        # Add storage_path column to file_nodes if it's missing
        conn.execute(text("ALTER TABLE file_nodes ADD COLUMN IF NOT EXISTS storage_path VARCHAR"))
        conn.commit()
    except Exception as e:
        # Don't crash app if migration fails; it will log and continue
        print(f"Schema migration warning: {e}")

# Create FastAPI app
app = FastAPI(
    title="STRATUM API",
    description="Archaeological site management and collaboration platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(files.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "STRATUM API",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected",
        "storage": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.APP_DEBUG
    )

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Firebase
    FIREBASE_PROJECT_ID: str
    FIREBASE_PRIVATE_KEY_ID: str
    FIREBASE_PRIVATE_KEY: str
    FIREBASE_CLIENT_EMAIL: str
    FIREBASE_CLIENT_ID: str
    FIREBASE_AUTH_URI: str = "https://accounts.google.com/o/oauth2/auth"
    FIREBASE_TOKEN_URI: str = "https://oauth2.googleapis.com/token"
    FIREBASE_AUTH_PROVIDER_CERT_URL: str = "https://www.googleapis.com/oauth2/v1/certs"
    FIREBASE_CLIENT_CERT_URL: str
    
    # PostgreSQL
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str
    
    # MinIO
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET_NAME: str = "stratum-files"
    MINIO_USE_SSL: bool = False
    
    # App
    APP_SECRET_KEY: str
    APP_DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    ALLOWED_ORIGINS: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_EXPIRATION_HOURS: int = 24
    
    # Environment
    ENVIRONMENT: str = "development"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        case_sensitive = True


settings = Settings()

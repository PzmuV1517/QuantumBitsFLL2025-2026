import firebase_admin
from firebase_admin import credentials, auth
from app.config import settings
import json


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Create credentials from environment variables
        cred_dict = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "client_id": settings.FIREBASE_CLIENT_ID,
            "auth_uri": settings.FIREBASE_AUTH_URI,
            "token_uri": settings.FIREBASE_TOKEN_URI,
            "auth_provider_x509_cert_url": settings.FIREBASE_AUTH_PROVIDER_CERT_URL,
            "client_x509_cert_url": settings.FIREBASE_CLIENT_CERT_URL
        }
        
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        print("✓ Firebase initialized successfully")
    except Exception as e:
        print(f"✗ Firebase initialization failed: {e}")
        raise


async def verify_firebase_token(token: str) -> dict:
    """Verify Firebase ID token and return user info"""
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

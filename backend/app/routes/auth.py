from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import UserResponse, FirebaseTokenRequest, AuthResponse, LoginRequest, RegisterRequest
import firebase_admin.auth as firebase_auth
from datetime import datetime, timedelta
import uuid
import jwt
from app.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login with email and password using Firebase authentication"""
    try:
        # Authenticate with Firebase using email and password
        # Note: This requires Firebase Admin SDK with appropriate permissions
        # For production, you might want to use Firebase Auth REST API
        
        # Try to get user by email first to check if they exist
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # For now, we'll create a Firebase custom token and verify the user exists
        # In a real implementation, you'd verify the password with Firebase
        # This is a simplified version - you should use Firebase Auth REST API
        
        try:
            # Create a custom token for the user
            custom_token = firebase_auth.create_custom_token(user.firebase_uid)
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.commit()
            
            # Generate JWT token for our API
            jwt_payload = {
                "user_id": user.id,
                "firebase_uid": user.firebase_uid,
                "email": user.email,
                "exp": datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
            }
            
            jwt_token = jwt.encode(
                jwt_payload, 
                settings.JWT_SECRET_KEY, 
                algorithm="HS256"
            )
            
            return AuthResponse(
                access_token=jwt_token,
                user=UserResponse.model_validate(user)
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Register new user with email and password"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user in Firebase
        firebase_user = firebase_auth.create_user(
            email=request.email,
            password=request.password,
            display_name=request.display_name
        )
        
        # Create user in our database
        user = User(
            id=str(uuid.uuid4()),
            firebase_uid=firebase_user.uid,
            email=request.email,
            display_name=request.display_name,
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Generate JWT token for our API
        jwt_payload = {
            "user_id": user.id,
            "firebase_uid": user.firebase_uid,
            "email": user.email,
            "exp": datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        }
        
        jwt_token = jwt.encode(
            jwt_payload, 
            settings.JWT_SECRET_KEY, 
            algorithm="HS256"
        )
        
        return AuthResponse(
            access_token=jwt_token,
            user=UserResponse.model_validate(user)
        )
        
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/verify-token", response_model=AuthResponse)
async def verify_firebase_token(
    request: FirebaseTokenRequest,
    db: Session = Depends(get_db)
):
    """Verify Firebase ID token and return user data"""
    try:
        # Verify the Firebase ID token
        decoded_token = firebase_auth.verify_id_token(request.firebase_token)
        firebase_uid = decoded_token['uid']
        email = decoded_token.get('email')
        display_name = request.display_name or decoded_token.get('name', '')

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )

        # Check if user exists in our database
        user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        
        if not user:
            # Create new user
            user = User(
                id=str(uuid.uuid4()),
                firebase_uid=firebase_uid,
                email=email,
                display_name=display_name,
                created_at=datetime.utcnow(),
                last_login=datetime.utcnow()
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update last login
            user.last_login = datetime.utcnow()
            db.commit()

        # Generate JWT token for our API
        jwt_payload = {
            "user_id": user.id,
            "firebase_uid": user.firebase_uid,
            "email": user.email,
            "exp": datetime.utcnow().timestamp() + (24 * 60 * 60)  # 24 hours
        }
        
        access_token = jwt.encode(jwt_payload, settings.APP_SECRET_KEY, algorithm="HS256")

        return AuthResponse(
            access_token=access_token,
            user=user
        )

    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase token"
        )
    except Exception as e:
        print(f"Auth error: {e}")  # For debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user information"""
    return current_user


@router.get("/users/search")
async def search_users(
    query: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search users by email or display name"""
    if len(query) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 3 characters"
        )
    
    users = db.query(User).filter(
        (User.email.ilike(f"%{query}%")) |
        (User.display_name.ilike(f"%{query}%"))
    ).limit(10).all()
    
    return users

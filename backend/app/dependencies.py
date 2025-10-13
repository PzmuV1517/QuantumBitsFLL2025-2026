from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.firebase_config import verify_firebase_token
from app.models import User
from datetime import datetime

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get the current authenticated user"""
    token = credentials.credentials
    
    # Verify Firebase token
    decoded_token = await verify_firebase_token(token)
    if not decoded_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    firebase_uid = decoded_token.get('uid')
    email = decoded_token.get('email')
    
    # Get or create user in database
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    
    if not user:
        # Create new user
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            display_name=decoded_token.get('name'),
            photo_url=decoded_token.get('picture')
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
    
    return user


def check_project_permission(
    project_id: str,
    user: User,
    db: Session,
    required_role: str = None
) -> bool:
    """Check if user has permission to access a project"""
    from app.models import Project, project_members
    from sqlalchemy import select
    
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Owner has all permissions
    if project.owner_id == user.id:
        return True
    
    # Check if user is a member
    stmt = select(project_members).where(
        project_members.c.project_id == project_id,
        project_members.c.user_id == user.id
    )
    result = db.execute(stmt).first()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    # If specific role is required, check it
    if required_role:
        user_role = result.role
        role_hierarchy = {'leader': 3, 'researcher': 2, 'guest': 1}
        
        if role_hierarchy.get(user_role.value, 0) < role_hierarchy.get(required_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role or higher"
            )
    
    return True

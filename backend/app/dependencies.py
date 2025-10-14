from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.config import settings
import jwt
from datetime import datetime

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get the current authenticated user"""
    token = credentials.credentials
    
    try:
        # Verify our JWT token
        payload = jwt.decode(token, settings.APP_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


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

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])


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

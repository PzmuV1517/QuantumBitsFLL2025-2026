from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.dependencies import get_current_user, check_project_permission
from app.models import User, Project, project_members, FileNode, FileNodeType
from app.schemas import (
    ProjectCreate, ProjectResponse, ProjectWithMembers,
    ProjectMemberAdd, ProjectMemberUpdate, UserResponse
)
from sqlalchemy import select

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new archaeological site project"""
    project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Add the owner as a member with leader role
    project.members.append(current_user)
    db.commit()

    # Create default Files root folders: Notes (locked)
    notes_folder = FileNode(
        project_id=project.id,
        parent_id=None,
        name="Notes",
        type=FileNodeType.FOLDER,
        is_locked=True,
    )
    db.add(notes_folder)
    db.commit()
    
    return project


@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects the user has access to"""
    # Get owned projects
    owned = db.query(Project).filter(Project.owner_id == current_user.id).all()
    
    # Get projects where user is a member
    stmt = select(Project).join(project_members).where(
        project_members.c.user_id == current_user.id
    )
    member_projects = db.execute(stmt).scalars().all()
    
    # Combine and deduplicate
    all_projects = {p.id: p for p in owned + list(member_projects)}
    
    return list(all_projects.values())


@router.get("/{project_id}", response_model=ProjectWithMembers)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project details with members"""
    from sqlalchemy.orm import joinedload
    
    check_project_permission(project_id, current_user, db)
    
    project = db.query(Project).options(joinedload(Project.members)).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project details (owner only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can update project details"
        )
    
    project.name = project_data.name
    project.description = project_data.description
    
    db.commit()
    db.refresh(project)
    
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a project (owner only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    if project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project owner can delete the project"
        )
    
    db.delete(project)
    db.commit()
    
    return None


@router.post("/{project_id}/members", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: str,
    member_data: ProjectMemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to the project (leader/owner only)"""
    check_project_permission(project_id, current_user, db, required_role="leader")
    
    # Check if user exists
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if already a member
    stmt = select(project_members).where(
        project_members.c.project_id == project_id,
        project_members.c.user_id == member_data.user_id
    )
    existing = db.execute(stmt).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )
    
    # Add member
    stmt = project_members.insert().values(
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role
    )
    db.execute(stmt)
    db.commit()
    
    return user


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from the project (leader/owner only)"""
    check_project_permission(project_id, current_user, db, required_role="leader")
    
    stmt = project_members.delete().where(
        project_members.c.project_id == project_id,
        project_members.c.user_id == user_id
    )
    result = db.execute(stmt)
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in project"
        )
    
    return None


@router.put("/{project_id}/members/{user_id}/role")
async def update_member_role(
    project_id: str,
    user_id: str,
    role_data: ProjectMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a member's role (leader/owner only)"""
    check_project_permission(project_id, current_user, db, required_role="leader")
    
    stmt = project_members.update().where(
        project_members.c.project_id == project_id,
        project_members.c.user_id == user_id
    ).values(role=role_data.role)
    
    result = db.execute(stmt)
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in project"
        )
    
    return {"message": "Role updated successfully"}

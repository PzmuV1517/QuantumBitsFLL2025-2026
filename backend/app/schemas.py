from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    LEADER = "leader"
    RESEARCHER = "researcher"
    GUEST = "guest"


# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class FirebaseTokenRequest(BaseModel):
    firebase_token: str
    display_name: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    user: 'UserResponse'


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    photo_url: Optional[str] = None


class UserCreate(UserBase):
    firebase_uid: str


class UserResponse(UserBase):
    id: str
    firebase_uid: str
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class ProjectWithMembers(ProjectResponse):
    members: List[UserResponse] = []


# Project Member Schemas
class ProjectMemberAdd(BaseModel):
    user_id: str
    role: UserRole = UserRole.GUEST


class ProjectMemberUpdate(BaseModel):
    role: UserRole


# Note Schemas
class NoteBase(BaseModel):
    title: str
    content: Optional[str] = None


class NoteCreate(NoteBase):
    project_id: str


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class NoteAttachmentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: Optional[str] = None
    uploaded_at: datetime
    url: Optional[str] = None  # Presigned URL
    
    class Config:
        from_attributes = True


class NoteResponse(NoteBase):
    id: str
    project_id: str
    author_id: str
    created_at: datetime
    updated_at: datetime
    last_synced: Optional[datetime] = None
    attachments: List[NoteAttachmentResponse] = []
    
    class Config:
        from_attributes = True


# Sync Schemas
class SyncConflict(BaseModel):
    resource_type: str  # "note", "attachment", etc.
    resource_id: str
    local_updated_at: datetime
    cloud_updated_at: datetime
    resolution: str  # "overwrite_cloud" or "overwrite_local"


class SyncRequest(BaseModel):
    conflicts: List[SyncConflict]


# Authentication Schemas
class TokenData(BaseModel):
    firebase_uid: str
    email: str


# File System Schemas
class FileNodeType(str, Enum):
    folder = "folder"
    file = "file"
    note = "note"


class FileNodeBase(BaseModel):
    id: str
    project_id: str
    parent_id: Optional[str] = None
    name: str
    type: FileNodeType
    mime_type: Optional[str] = None
    size: Optional[str] = None
    is_locked: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FileNodeCreateFolder(BaseModel):
    name: str
    parent_id: Optional[str] = None


class FileNodeRenameRequest(BaseModel):
    name: str


class FileNodeMoveRequest(BaseModel):
    new_parent_id: Optional[str] = None

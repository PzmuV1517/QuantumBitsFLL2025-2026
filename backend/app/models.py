from sqlalchemy import Column, String, DateTime, ForeignKey, Table, Enum as SQLEnum, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    LEADER = "leader"
    RESEARCHER = "researcher"
    GUEST = "guest"


# Association table for project members
project_members = Table(
    'project_members',
    Base.metadata,
    Column('project_id', String, ForeignKey('projects.id', ondelete='CASCADE')),
    Column('user_id', String, ForeignKey('users.id', ondelete='CASCADE')),
    Column('role', SQLEnum(UserRole), default=UserRole.GUEST),
    Column('joined_at', DateTime, default=datetime.utcnow)
)


class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    firebase_uid = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    owned_projects = relationship('Project', back_populates='owner', cascade='all, delete-orphan')
    notes = relationship('Note', back_populates='author', cascade='all, delete-orphan')
    projects = relationship('Project', secondary=project_members, back_populates='members')


class Project(Base):
    __tablename__ = 'projects'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    owner = relationship('User', back_populates='owned_projects')
    members = relationship('User', secondary=project_members, back_populates='projects')
    notes = relationship('Note', back_populates='project', cascade='all, delete-orphan')


class Note(Base):
    __tablename__ = 'notes'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    project_id = Column(String, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    author_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_synced = Column(DateTime, nullable=True)
    
    # Relationships
    project = relationship('Project', back_populates='notes')
    author = relationship('User', back_populates='notes')
    attachments = relationship('NoteAttachment', back_populates='note', cascade='all, delete-orphan')


class NoteAttachment(Base):
    __tablename__ = 'note_attachments'
    
    id = Column(String, primary_key=True, default=generate_uuid)
    note_id = Column(String, ForeignKey('notes.id', ondelete='CASCADE'), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # Path in MinIO
    file_type = Column(String, nullable=False)  # image/jpeg, image/png, etc.
    file_size = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    note = relationship('Note', back_populates='attachments')

from sqlalchemy import Column, String, DateTime, ForeignKey, Table, Enum as SQLEnum, Boolean, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship, backref
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
    files = relationship('FileNode', back_populates='project', cascade='all, delete-orphan')


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


class FileNodeType(str, enum.Enum):
    FOLDER = "folder"
    FILE = "file"
    NOTE = "note"


class FileNode(Base):
    __tablename__ = 'file_nodes'

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    parent_id = Column(String, ForeignKey('file_nodes.id', ondelete='CASCADE'), nullable=True, index=True)
    name = Column(String, nullable=False)
    type = Column(SQLEnum(FileNodeType), nullable=False, default=FileNodeType.FILE)
    mime_type = Column(String, nullable=True)
    size = Column(String, nullable=True)
    storage_path = Column(String, nullable=True)  # object key/path in MinIO for uploaded files
    is_locked = Column(Boolean, default=False)  # for non-deletable/non-movable nodes like Notes folder or note nodes
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship('Project', back_populates='files')
    parent = relationship('FileNode', remote_side='FileNode.id', backref=backref('children', cascade='all, delete-orphan'))

    __table_args__ = (
        UniqueConstraint('project_id', 'parent_id', 'name', name='uq_file_nodes_sibling_name'),
        Index('ix_file_nodes_project_parent', 'project_id', 'parent_id'),
    )


class NoteFileLink(Base):
    __tablename__ = 'note_file_links'

    note_id = Column(String, ForeignKey('notes.id', ondelete='CASCADE'), primary_key=True)
    file_node_id = Column(String, ForeignKey('file_nodes.id', ondelete='CASCADE'), nullable=False, unique=True)

    # Relationships
    note = relationship('Note', backref=backref('file_link', uselist=False, cascade='all, delete-orphan'))
    file_node = relationship('FileNode', backref=backref('note_link', uselist=False, cascade='all, delete-orphan'))


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

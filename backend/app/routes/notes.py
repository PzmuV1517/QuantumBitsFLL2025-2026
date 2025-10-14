from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.dependencies import get_current_user, check_project_permission
from app.models import User, Note, NoteAttachment, FileNode, FileNodeType, NoteFileLink
from app.schemas import NoteCreate, NoteUpdate, NoteResponse
from app.minio_client import minio_client
from datetime import datetime
import uuid

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new note in a project"""
    check_project_permission(note_data.project_id, current_user, db)
    
    note = Note(
        title=note_data.title,
        content=note_data.content,
        project_id=note_data.project_id,
        author_id=current_user.id
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    # Ensure Notes folder exists and create a locked file node representing this note under it
    notes_folder = db.query(FileNode).filter(
        FileNode.project_id == note.project_id,
        FileNode.parent_id == None,
        FileNode.name == "Notes",
        FileNode.type == FileNodeType.FOLDER
    ).first()
    if not notes_folder:
        notes_folder = FileNode(
            project_id=note.project_id,
            parent_id=None,
            name="Notes",
            type=FileNodeType.FOLDER,
            is_locked=True,
        )
        db.add(notes_folder)
        db.commit()
        db.refresh(notes_folder)

    note_node = FileNode(
        project_id=note.project_id,
        parent_id=notes_folder.id,
        name=note.title,
        type=FileNodeType.NOTE,
        is_locked=True,
    )
    db.add(note_node)
    db.commit()
    db.refresh(note_node)

    link = NoteFileLink(note_id=note.id, file_node_id=note_node.id)
    db.add(link)
    db.commit()
    
    return note


@router.get("/project/{project_id}", response_model=List[NoteResponse])
async def get_project_notes(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all notes for a project"""
    check_project_permission(project_id, current_user, db)
    
    notes = db.query(Note).filter(Note.project_id == project_id).order_by(Note.updated_at.desc()).all()
    
    # Add presigned URLs to attachments
    for note in notes:
        for attachment in note.attachments:
            attachment.url = minio_client.get_presigned_url(attachment.file_path)
    
    return notes


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    check_project_permission(note.project_id, current_user, db)
    
    # Add presigned URLs to attachments
    for attachment in note.attachments:
        attachment.url = minio_client.get_presigned_url(attachment.file_path)
    
    return note


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    note_data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    check_project_permission(note.project_id, current_user, db)
    
    # Update fields
    if note_data.title is not None:
        note.title = note_data.title
        # Reflect title change in file node, if exists
        if note.file_link and note.file_link.file_node:
            note.file_link.file_node.name = note.title
            note.file_link.file_node.updated_at = datetime.utcnow()
    if note_data.content is not None:
        note.content = note_data.content
    
    note.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(note)
    
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    check_project_permission(note.project_id, current_user, db)
    
    # Only author or project leader can delete
    if note.author_id != current_user.id:
        check_project_permission(note.project_id, current_user, db, required_role="leader")
    
    # Delete attachments from MinIO
    for attachment in note.attachments:
        await minio_client.delete_file(attachment.file_path)
    
    # Delete associated file node if present
    if note.file_link and note.file_link.file_node:
        db.delete(note.file_link.file_node)
    
    db.delete(note)
    db.commit()
    
    return None


@router.post("/{note_id}/attachments", status_code=status.HTTP_201_CREATED)
async def add_note_attachment(
    note_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an attachment (photo) to a note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    check_project_permission(note.project_id, current_user, db)
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/heic"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Generate unique file path
    file_extension = file.filename.split('.')[-1]
    file_path = f"notes/{note_id}/{uuid.uuid4()}.{file_extension}"
    
    # Upload to MinIO
    await minio_client.upload_file(file_content, file_path, file.content_type)
    
    # Create attachment record
    attachment = NoteAttachment(
        note_id=note_id,
        filename=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        file_size=str(file_size)
    )
    
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    # Add presigned URL
    attachment.url = minio_client.get_presigned_url(file_path)
    
    return attachment


@router.delete("/{note_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note_attachment(
    note_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an attachment from a note"""
    note = db.query(Note).filter(Note.id == note_id).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    check_project_permission(note.project_id, current_user, db)
    
    attachment = db.query(NoteAttachment).filter(
        NoteAttachment.id == attachment_id,
        NoteAttachment.note_id == note_id
    ).first()
    
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )
    
    # Delete from MinIO
    await minio_client.delete_file(attachment.file_path)
    
    # Delete from database
    db.delete(attachment)
    db.commit()
    
    return None

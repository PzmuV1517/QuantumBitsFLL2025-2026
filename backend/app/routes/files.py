from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.dependencies import get_current_user, check_project_permission
from app.models import User, FileNode, FileNodeType, Note, NoteFileLink
from app.schemas import FileNodeBase, FileNodeCreateFolder, FileNodeMoveRequest, FileNodeRenameRequest
from app.minio_client import minio_client
from datetime import datetime
import uuid
import mimetypes
import re

router = APIRouter(prefix="/files", tags=["files"])

def _infer_media_type(name: Optional[str], mime_type: Optional[str]) -> str:
    n = (name or "").lower()
    mt = (mime_type or "").lower()
    if n.endswith((".md", ".markdown")) or "markdown" in mt:
        return "text/markdown; charset=utf-8"
    if n.endswith(".txt"):
        return "text/plain; charset=utf-8"  
    if n.endswith(".json"):
        return "application/json; charset=utf-8"
    if n.endswith(".csv"):
        return "text/csv; charset=utf-8"
    if n.endswith((".yaml", ".yml")):
        return "text/yaml; charset=utf-8"
    if n.endswith(".xml"):
        return "application/xml; charset=utf-8"
    if mt.startswith("text/"):
        return mt if "charset" in mt else f"{mt}; charset=utf-8"
    return mt or "application/octet-stream"

def _content_disposition(name: Optional[str]) -> str:
    filename = (name or "download").replace('\n', '').replace('\r', '')
    try:
        filename.encode('ascii')
        return f'attachment; filename="{filename}"'
    except Exception:
        return f"attachment; filename*=UTF-8''{filename}"

def _ensure_project_access(project_id: str, current_user, db: Session) -> None:
    # Minimal protection; replace with your real permission check if available
    # Verifies that at least one node or note exists for the project to avoid leaking project IDs
    exists = (
        db.query(FileNode.id)
        .filter(FileNode.project_id == project_id)
        .first()
    )
    if not exists:
        note_exists = (
            db.query(Note.id)
            .filter(Note.project_id == project_id)
            .first()
        )
        if not note_exists:
            # If project truly has no entries, still allow listing as empty
            return

# List root nodes for project
@router.get("/project/{project_id}", response_model=List[FileNodeBase])
async def list_root(project_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_permission(project_id, current_user, db)
    nodes = (
        db.query(FileNode)
        .filter(FileNode.project_id == project_id, FileNode.parent_id == None)  # noqa: E711
        .order_by(FileNode.type.asc(), FileNode.name.asc())
        .all()
    )
    return nodes

# List children
@router.get("/{node_id}/children", response_model=List[FileNodeBase])
async def list_children(node_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Folder not found")
    check_project_permission(node.project_id, current_user, db)
    if node.type != FileNodeType.FOLDER:
        raise HTTPException(status_code=400, detail="Node is not a folder")
    children = (
        db.query(FileNode)
        .filter(FileNode.parent_id == node_id)
        .order_by(FileNode.type.asc(), FileNode.name.asc())
        .all()
    )
    return children

# Create folder
@router.post("/project/{project_id}/folders", response_model=FileNodeBase)
async def create_folder(project_id: str, payload: FileNodeCreateFolder, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_permission(project_id, current_user, db)
    parent_id = payload.parent_id
    name = payload.name
    if parent_id:
        parent = db.query(FileNode).filter(FileNode.id == parent_id, FileNode.project_id == project_id).first()
        if not parent or parent.type != FileNodeType.FOLDER:
            raise HTTPException(status_code=400, detail="Invalid parent folder")
        if parent.is_locked:
            raise HTTPException(status_code=403, detail="Folder is locked")
    exists = (
        db.query(FileNode)
        .filter(FileNode.project_id == project_id, FileNode.parent_id == parent_id, FileNode.name == name)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="A node with this name already exists here")
    node = FileNode(
        project_id=project_id,
        parent_id=parent_id,
        name=name,
        type=FileNodeType.FOLDER,
        is_locked=False,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node

# Upload file
@router.post("/project/{project_id}/upload", response_model=FileNodeBase)
async def upload_file(project_id: str, file: UploadFile = File(...), parent_id: Optional[str] = Form(None), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    check_project_permission(project_id, current_user, db)

    if parent_id:
        parent = db.query(FileNode).filter(FileNode.id == parent_id, FileNode.project_id == project_id).first()
        if not parent or parent.type != FileNodeType.FOLDER:
            raise HTTPException(status_code=400, detail="Invalid parent folder")
        if getattr(parent, "is_locked", False):
            raise HTTPException(status_code=403, detail="Destination folder is locked")

    data = await file.read()
    if data is None:
        raise HTTPException(status_code=400, detail="Empty file")

    key = f"uploads/{project_id}/{uuid.uuid4()}_{file.filename}"
    await minio_client.upload_file(  # type: ignore[attr-defined]
        file_data=data,
        object_name=key,
        content_type=file.content_type or "application/octet-stream",
    )

    node = FileNode(
        project_id=project_id,
        parent_id=parent_id,
        name=file.filename or "upload",
        type=FileNodeType.FILE,
        mime_type=file.content_type or None,
        size=str(len(data)),
        storage_path=key,
        is_locked=False,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node

# Rename
@router.put("/{node_id}/rename", response_model=FileNodeBase)
async def rename_node(node_id: str, payload: FileNodeRenameRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Not found")
    check_project_permission(node.project_id, current_user, db)
    if node.is_locked:
        raise HTTPException(status_code=403, detail="Locked item cannot be renamed")
    conflict = (
        db.query(FileNode)
        .filter(FileNode.project_id == node.project_id, FileNode.parent_id == node.parent_id, FileNode.name == payload.name, FileNode.id != node.id)
        .first()
    )
    if conflict:
        raise HTTPException(status_code=400, detail="A node with this name already exists here")
    node.name = payload.name
    db.commit()
    db.refresh(node)
    return node

# Move
@router.put("/{node_id}/move", response_model=FileNodeBase)
async def move_node(node_id: str, payload: FileNodeMoveRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Not found")
    check_project_permission(node.project_id, current_user, db)
    # Allow moving NOTE nodes even if locked (notes-produced files),
    # but keep the lock restriction for other node types
    if node.is_locked and node.type != FileNodeType.NOTE:
        raise HTTPException(status_code=403, detail="Locked item cannot be moved")
    if payload.new_parent_id:
        parent = db.query(FileNode).filter(FileNode.id == payload.new_parent_id, FileNode.project_id == node.project_id).first()
        if not parent or parent.type != FileNodeType.FOLDER:
            raise HTTPException(status_code=400, detail="Invalid destination")
        if parent.is_locked:
            raise HTTPException(status_code=403, detail="Destination folder is locked")
    node.parent_id = payload.new_parent_id
    db.commit()
    db.refresh(node)
    return node

# Delete
@router.delete("/{node_id}", status_code=204)
async def delete_node(node_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Not found")
    check_project_permission(node.project_id, current_user, db)
    if node.is_locked:
        raise HTTPException(status_code=403, detail="Locked item cannot be deleted")
    if node.type == FileNodeType.FILE and node.storage_path:
        try:
            await minio_client.delete_file(node.storage_path)
        except Exception:
            pass
    db.delete(node)
    db.commit()
    return None

def _infer_text_mime(name: Optional[str], default: str = "text/plain") -> str:
    # ensure .md -> text/markdown for frontend detection
    if not name:
        return default
    lower = name.lower()
    if lower.endswith((".md", ".markdown")):
        return "text/markdown"
    if lower.endswith(".json"):
        return "application/json"
    if lower.endswith(".csv"):
        return "text/csv"
    if lower.endswith((".yml", ".yaml")):
        return "text/yaml"
    if lower.endswith(".xml"):
        return "application/xml"
    guessed, _ = mimetypes.guess_type(lower)
    return guessed or default

@router.get("/{node_id}/text")
async def get_text(
    node_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return text preview payload for both:
    - File nodes stored in MinIO (decode UTF-8 with replacement)
    - Note-backed nodes (content from DB)
    """
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    check_project_permission(node.project_id, current_user, db)
    filename = node.name or "file.txt"

    # Note-backed text (no storage_path)
    if node.type == FileNodeType.NOTE and not getattr(node, "storage_path", None):
        link = db.query(NoteFileLink).filter(NoteFileLink.file_node_id == node.id).first()
        if not link:
            raise HTTPException(status_code=404, detail="Linked note not found")
        note = db.query(Note).filter(Note.id == link.note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        content_type = _infer_text_mime(filename, "text/plain")
        return JSONResponse({"text": note.content or "", "content_type": content_type, "filename": filename})

    # File node in MinIO
    if node.type != FileNodeType.FILE or not getattr(node, "storage_path", None):
        raise HTTPException(status_code=400, detail="Not a text file node")

    data = await minio_client.get_file(node.storage_path)
    if data is None:
        raise HTTPException(status_code=404, detail="Stored object not found")

    try:
        text = data.decode("utf-8")
    except Exception:
        text = data.decode("utf-8", errors="replace")
    content_type = _infer_text_mime(filename, node.mime_type or "text/plain")
    return JSONResponse({"text": text, "content_type": content_type, "filename": filename})

@router.put("/{node_id}/content", response_model=FileNodeBase)
async def replace_file_content(
    node_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Replace content for:
    - File nodes → upload new bytes to MinIO and update metadata.
    - Note-backed nodes (no storage_path) → update Note.content in DB.
    """
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    check_project_permission(node.project_id, current_user, db)
    if node.is_locked:
        raise HTTPException(status_code=400, detail="This node cannot be modified")

    form = await request.form()
    new_file: Optional[UploadFile] = None
    for key, value in form.items():
        if hasattr(value, "file"):
            new_file = value  # type: ignore[assignment]
            break
    if not new_file:
        raise HTTPException(status_code=422, detail="No file provided")

    data = await new_file.read()

    # Note-backed node: update Note.content (decode UTF-8)
    if node.type == FileNodeType.NOTE and not getattr(node, "storage_path", None):
        link = db.query(NoteFileLink).filter(NoteFileLink.file_node_id == node.id).first()
        if not link:
            raise HTTPException(status_code=404, detail="Linked note not found")
        note = db.query(Note).filter(Note.id == link.note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        try:
            text = data.decode("utf-8")
        except Exception:
            text = data.decode("utf-8", errors="replace")
        note.content = text
        node.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(node)
        return node

    # Regular file node in MinIO
    if node.type != FileNodeType.FILE:
        raise HTTPException(status_code=400, detail="Only FILE or NOTE nodes can be replaced")

    # Ensure a storage_path exists
    if not getattr(node, "storage_path", None):
        node.storage_path = f"files/{node.project_id}/{uuid.uuid4()}_{new_file.filename or node.name or 'file'}"

    # Upload new bytes (overwrite key)
    await minio_client.upload_file(
        file_data=data,
        object_name=node.storage_path,
        content_type=new_file.content_type or node.mime_type or "application/octet-stream"
    )

    node.mime_type = new_file.content_type or node.mime_type
    node.size = str(len(data))
    node.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(node)
    return node

@router.get("/{node_id}/download")
async def download_file(node_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="File not found")
    check_project_permission(node.project_id, current_user, db)

    # Note-backed text fallback
    if node.type == FileNodeType.NOTE and not getattr(node, "storage_path", None):
        link = db.query(NoteFileLink).filter(NoteFileLink.file_node_id == node_id).first()
        if not link:
            raise HTTPException(status_code=404, detail="Linked note not found")
        note = db.query(Note).filter(Note.id == link.note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        data = (note.content or "").encode("utf-8")
        media_type = _infer_media_type(node.name, node.mime_type or "text/plain")
        headers = {
            "Content-Disposition": _content_disposition(node.name or f"{note.title or 'note'}.txt"),
            "Content-Length": str(len(data)),
        }
        return StreamingResponse(iter([data]), media_type=media_type, headers=headers)

    if not getattr(node, "storage_path", None):
        raise HTTPException(status_code=404, detail="File content not found")

    data = await minio_client.get_file(node.storage_path)
    if data is None:
        raise HTTPException(status_code=404, detail="Storage object not found")

    media_type = _infer_media_type(node.name, node.mime_type)
    headers = {
        "Content-Disposition": _content_disposition(node.name),
        "Content-Length": str(len(data)),
    }
    return StreamingResponse(iter([data]), media_type=media_type, headers=headers)

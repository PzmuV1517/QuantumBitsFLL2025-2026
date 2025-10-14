from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.dependencies import get_current_user, check_project_permission
from app.models import User, Project, FileNode, FileNodeType, Note, NoteFileLink
from app.schemas import FileNodeBase, FileNodeCreateFolder, FileNodeMoveRequest, FileNodeRenameRequest
from app.minio_client import minio_client
from datetime import datetime
import uuid

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/project/{project_id}", response_model=List[FileNodeBase])
async def list_project_root(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List root-level file nodes for a project"""
    check_project_permission(project_id, current_user, db)
    nodes = db.query(FileNode).filter(FileNode.project_id == project_id, FileNode.parent_id == None).order_by(FileNode.type.desc(), FileNode.name.asc()).all()
    return nodes


@router.get("/{node_id}/children", response_model=List[FileNodeBase])
async def list_children(
    node_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Folder not found")
    check_project_permission(node.project_id, current_user, db)
    children = db.query(FileNode).filter(FileNode.parent_id == node_id).order_by(FileNode.type.desc(), FileNode.name.asc()).all()
    return children


@router.post("/project/{project_id}/folders", response_model=FileNodeBase, status_code=status.HTTP_201_CREATED)
async def create_folder(
    project_id: str,
    folder: FileNodeCreateFolder,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_project_permission(project_id, current_user, db)
    parent = None
    if folder.parent_id:
        parent = db.query(FileNode).filter(FileNode.id == folder.parent_id, FileNode.project_id == project_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")
        if parent.type != FileNodeType.FOLDER:
            raise HTTPException(status_code=400, detail="Parent must be a folder")

    node = FileNode(
        project_id=project_id,
        parent_id=folder.parent_id,
        name=folder.name,
        type=FileNodeType.FOLDER,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.put("/{node_id}/move", response_model=FileNodeBase)
async def move_node(
    node_id: str,
    move: FileNodeMoveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    check_project_permission(node.project_id, current_user, db)
    if node.is_locked:
        raise HTTPException(status_code=400, detail="This node cannot be moved")

    new_parent = None
    if move.new_parent_id:
        new_parent = db.query(FileNode).filter(FileNode.id == move.new_parent_id, FileNode.project_id == node.project_id).first()
        if not new_parent:
            raise HTTPException(status_code=404, detail="New parent not found")
        if new_parent.type != FileNodeType.FOLDER:
            raise HTTPException(status_code=400, detail="New parent must be a folder")

    node.parent_id = move.new_parent_id
    node.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(node)
    return node


@router.put("/{node_id}/rename", response_model=FileNodeBase)
async def rename_node(
    node_id: str,
    payload: FileNodeRenameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    check_project_permission(node.project_id, current_user, db)
    if node.is_locked:
        raise HTTPException(status_code=400, detail="This node cannot be renamed")

    node.name = payload.name
    node.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(node)
    return node


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    check_project_permission(node.project_id, current_user, db)
    if node.is_locked:
        raise HTTPException(status_code=400, detail="This node cannot be deleted")

    # Recursively delete subtree and storage objects
    async def _delete_subtree(n: FileNode):
        # delete children first
        children = db.query(FileNode).filter(FileNode.parent_id == n.id).all()
        for c in children:
            await _delete_subtree(c)
        # delete storage if file
        if n.type == FileNodeType.FILE and n.storage_path:
            await minio_client.delete_file(n.storage_path)
        db.delete(n)

    await _delete_subtree(node)
    db.commit()
    return None


@router.post("/project/{project_id}/upload", response_model=FileNodeBase, status_code=status.HTTP_201_CREATED)
async def upload_file(
    project_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_project_permission(project_id, current_user, db)
    
    # Parse form manually to be more tolerant
    form = await request.form()
    print(f"DEBUG: Received form keys: {list(form.keys())}")
    
    parent_id = form.get('parent_id')
    file = None
    
    # Find the file in the form
    for key, value in form.items():
        print(f"DEBUG: Form field '{key}' type: {type(value)}, value preview: {str(value)[:100] if not isinstance(value, UploadFile) else 'UploadFile'}")
        if hasattr(value, 'file'):  # UploadFile check
            file = value
            print(f"DEBUG: Found file in field '{key}': {file.filename}, content_type: {file.content_type}")
            break
    
    if file is None:
        raise HTTPException(status_code=422, detail=f"No file uploaded. Received keys: {list(form.keys())}")
    
    parent = None
    if parent_id:
        parent = db.query(FileNode).filter(FileNode.id == parent_id, FileNode.project_id == project_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")
        if parent.type != FileNodeType.FOLDER:
            raise HTTPException(status_code=400, detail="Parent must be a folder")

    data = await file.read()
    object_name = f"files/{project_id}/{uuid.uuid4()}"
    await minio_client.upload_file(data, object_name, file.content_type)

    node = FileNode(
        project_id=project_id,
        parent_id=parent_id,
    name=file.filename or "file",
        type=FileNodeType.FILE,
        mime_type=file.content_type,
        size=str(len(data)),
        storage_path=object_name,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.get("/{node_id}/download")
async def download_file(
    node_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a file node's content.

    Returns a streaming response with appropriate Content-Type and Content-Disposition.
    Notes and folders are not downloadable.
    """
    node = db.query(FileNode).filter(FileNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    if node.type != FileNodeType.FILE:
        raise HTTPException(status_code=400, detail="Only file nodes can be downloaded")
    check_project_permission(node.project_id, current_user, db)
    if not node.storage_path:
        raise HTTPException(status_code=404, detail="Stored object missing")

    # Stream file from MinIO to avoid loading entire content in memory for large files
    try:
        # Get object to stream and its stat for size
        stat = minio_client.client.stat_object(minio_client.bucket_name, node.storage_path)
        obj = minio_client.client.get_object(minio_client.bucket_name, node.storage_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve object")

    def iterfile():
        try:
            for data in obj.stream(32 * 1024):
                yield data
        finally:
            obj.close()
            obj.release_conn()

    filename = node.name or "download"
    media_type = node.mime_type or "application/octet-stream"
    headers = {
        "Content-Disposition": f"attachment; filename=\"{filename}\"",
        "Content-Length": str(getattr(stat, 'size', '') or '')
    }
    return StreamingResponse(iterfile(), media_type=media_type, headers=headers)
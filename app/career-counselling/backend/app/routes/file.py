"""
File Routes

This module provides routes for serving uploaded files.
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.managers.file import FileManager
from app.core.auth_utils import require_user, require_admin
import io

router = APIRouter()
file_manager = FileManager()

@router.get("/files/{file_id}")
async def get_file(file_id: str):
    """
    Get a file by ID and serve it
    
    Args:
        file_id: The ID of the file to get
        
    Returns:
        The file content with appropriate content type
    """
    file = await file_manager.get_file(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Create a streaming response with the file data
    return StreamingResponse(
        io.BytesIO(file["data"]),
        media_type=file["content_type"],
        headers={
            "Content-Disposition": f"inline; filename={file['filename']}"
        }
    )

@router.delete("/files/{file_id}", status_code=204)
async def delete_file(file_id: str, admin_data: dict = Depends(require_admin)):
    """
    Delete a file by ID (admin only)
    
    Args:
        file_id: The ID of the file to delete
        
    Returns:
        204 No Content if successful
    """
    success = await file_manager.delete_file(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="File not found or could not be deleted")
    
    return Response(status_code=204)
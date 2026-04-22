"""
File Manager

This module provides functionality for managing file uploads and retrievals.
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import gridfs
import motor.motor_asyncio
import pymongo

from app.core.database import get_database


class FileManager:
    """Manager for file uploads and retrievals"""
    
    def __init__(self):
        self.db: AsyncIOMotorDatabase = get_database()
        
        # We need to use motor's gridfs support for async operations
        self.fs = motor.motor_asyncio.AsyncIOMotorGridFSBucket(self.db)
    
    async def upload_file(
        self, 
        file: UploadFile, 
        folder: str = "uploads",
        allowed_types: Optional[List[str]] = None,
        max_size: Optional[int] = None
    ) -> str:
        """
        Upload a file to GridFS
        
        Args:
            file: The file to upload
            folder: The folder to save the file in (for organizational purposes)
            allowed_types: List of allowed MIME types
            max_size: Maximum file size in bytes
            
        Returns:
            The ID of the uploaded file
            
        Raises:
            HTTPException: If the file type is not allowed or the file is too large
        """
        # Check file type if allowed_types is specified
        if allowed_types and file.content_type not in allowed_types:
            allowed_types_str = ", ".join(allowed_types)
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file.content_type} not allowed. Allowed types: {allowed_types_str}"
            )
        
        # Read file content
        contents = await file.read()
        
        # Check file size if max_size is specified
        if max_size and len(contents) > max_size:
            max_size_mb = max_size / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {max_size_mb:.1f} MB"
            )
        
        # Generate a unique filename
        filename = f"{folder}/{uuid.uuid4()}_{file.filename}"
        
        # Store file metadata
        metadata = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(contents),
            "upload_date": datetime.utcnow(),
            "folder": folder
        }
        
        # Use AsyncIO GridFS to save the file
        file_id = await self.fs.upload_from_stream(
            filename,
            contents,
            metadata=metadata
        )
        
        # Reset file position for potential reuse
        await file.seek(0)
        
        return str(file_id)
    
    async def get_file(self, file_id: str) -> Optional[dict]:
        """
        Get a file by ID
        
        Args:
            file_id: The ID of the file to get
            
        Returns:
            A dictionary containing the file data and metadata if found, None otherwise
        """
        try:
            # Convert string ID to ObjectId
            obj_id = ObjectId(file_id)
            
            # Check if file exists and get file info
            grid_out = await self.fs.open_download_stream(obj_id)
            
            # Read the file content
            data = await grid_out.read()
            
            # Get metadata
            file_metadata = grid_out.metadata
            
            # Get filename
            filename = grid_out.filename
            
            return {
                "id": str(obj_id),
                "data": data,
                "filename": filename,
                "metadata": file_metadata,
                "content_type": file_metadata.get("content_type", "application/octet-stream")
            }
        except Exception as e:
            print(f"Error getting file: {e}")
            return None
    
    async def delete_file(self, file_id: str) -> bool:
        """
        Delete a file by ID
        
        Args:
            file_id: The ID of the file to delete
            
        Returns:
            True if the file was deleted, False otherwise
        """
        try:
            # Convert string ID to ObjectId
            obj_id = ObjectId(file_id)
            
            # Delete the file
            await self.fs.delete(obj_id)
            return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
"""
Expert Application Routes

This module provides routes for submitting and managing expert applications.
"""

from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from typing import Optional, List

from app.core.auth_utils import require_user, require_admin
from app.managers.expert_application import ExpertApplicationManager
from app.managers.file import FileManager
from app.managers.user import UserManager
from app.models.expert_application import (
    ExpertApplicationCreate,
    ExpertApplicationResponse,
    ExpertApplicationStatusUpdate,
    ExpertApplicationStatus
)

router = APIRouter()
application_manager = ExpertApplicationManager()
file_manager = FileManager()
user_manager = UserManager()


@router.post("/expert-applications", response_model=ExpertApplicationResponse)
async def submit_application(
    currentPosition: str = Form(...),
    organization: str = Form(...),
    education: str = Form(...),
    bio: str = Form(...),
    specialization: str = Form(...),
    meetingCost: float = Form(...),
    file: UploadFile = File(...),
    user_data: dict = Depends(require_user)
):
    """
    Submit an expert application

    Args:
        currentPosition: The applicant's current job position
        organization: The applicant's current organization or institution
        education: The applicant's highest education qualification
        bio: A professional bio of the applicant
        specialization: The applicant's area of expertise
        meetingCost: The proposed cost for sessions with the applicant
        file: A PDF document containing credentials proof
        user_data: The authenticated user's data

    Returns:
        The created expert application
    """
    try:
        # Get full user details from database
        user = await user_manager.get_user(user_data["id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Validate and upload the file
        allowed_types = ["application/pdf"]
        max_size = 5 * 1024 * 1024  # 5MB limit

        file_id = await file_manager.upload_file(
            file,
            folder="expert_credentials",
            allowed_types=allowed_types,
            max_size=max_size
        )

        # Create the application
        application_data = ExpertApplicationCreate(
            userId=user_data["id"],
            firstName=user.firstName if hasattr(user, "firstName") else "",
            lastName=user.lastName if hasattr(user, "lastName") else "",
            email=user.email,
            currentPosition=currentPosition,
            organization=organization,
            education=education,
            bio=bio,
            specialization=specialization,
            meetingCost=meetingCost,
            fileId=file_id
        )

        application = await application_manager.create_application(application_data)
        return application
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to submit application: {str(e)}")


@router.post("/experts/apply", response_model=ExpertApplicationResponse)
async def apply_expert(
    currentPosition: str = Form(...),
    organization: str = Form(...),
    education: str = Form(...),
    bio: str = Form(...),
    specialization: str = Form(...),
    meetingCost: float = Form(...),
    # Changed from 'file' to match frontend's field name
    proofDocument: UploadFile = File(...),
    user_data: dict = Depends(require_user)
):
    """
    Submit an expert application (alternative endpoint)

    This is an alternative endpoint for submitting expert applications that matches
    the expected frontend endpoint.

    Args:
        currentPosition: The applicant's current job position
        organization: The applicant's current organization or institution
        education: The applicant's highest education qualification
        bio: A professional bio of the applicant
        specialization: The applicant's area of expertise
        meetingCost: The proposed cost for sessions with the applicant
        proofDocument: A PDF document containing credentials proof
        user_data: The authenticated user's data

    Returns:
        The created expert application
    """
    # Reuse the same implementation as submit_application
    try:
        # Get full user details from database
        user = await user_manager.get_user(user_data["id"])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Validate and upload the file
        allowed_types = ["application/pdf"]
        max_size = 5 * 1024 * 1024  # 5MB limit

        file_id = await file_manager.upload_file(
            proofDocument,  # Using proofDocument instead of file
            folder="expert_credentials",
            allowed_types=allowed_types,
            max_size=max_size
        )

        # Create the application
        application_data = ExpertApplicationCreate(
            userId=user_data["id"],
            firstName=user.firstName if hasattr(user, "firstName") else "",
            lastName=user.lastName if hasattr(user, "lastName") else "",
            email=user.email,
            currentPosition=currentPosition,
            organization=organization,
            education=education,
            bio=bio,
            specialization=specialization,
            meetingCost=meetingCost,
            fileId=file_id
        )

        application = await application_manager.create_application(application_data)
        return application
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to submit application: {str(e)}")


@router.get("/expert-applications/me", response_model=ExpertApplicationResponse)
async def get_my_application(user_data: dict = Depends(require_user)):
    """
    Get the current user's expert application

    Returns:
        The user's expert application if found, 404 otherwise
    """
    application = await application_manager.get_user_application(user_data["id"])
    if not application:
        raise HTTPException(status_code=404, detail="No application found")

    return application


@router.get("/experts/my-application", response_model=ExpertApplicationResponse)
async def get_my_expert_application(user_data: dict = Depends(require_user)):
    """
    Get the current user's expert application (alternative endpoint)

    This is an alternative endpoint that matches the expected frontend endpoint.

    Returns:
        The user's expert application if found, 404 otherwise
    """
    # Reuse the same implementation as get_my_application
    application = await application_manager.get_user_application(user_data["id"])
    if not application:
        raise HTTPException(status_code=404, detail="No application found")

    return application


@router.get("/admin/expert-applications", response_model=List[ExpertApplicationResponse])
async def get_all_applications(
    status: Optional[ExpertApplicationStatus] = None,
    admin_data: dict = Depends(require_admin)
):
    """
    Get all expert applications, optionally filtered by status

    Admin access only

    Args:
        status: Optional filter for application status

    Returns:
        List of expert applications
    """
    applications = await application_manager.get_all_applications(status)
    return applications


@router.get("/admin/expert-applications/{application_id}", response_model=ExpertApplicationResponse)
async def get_application_by_id(
    application_id: str,
    admin_data: dict = Depends(require_admin)
):
    """
    Get an expert application by ID

    Admin access only

    Args:
        application_id: The ID of the application to get

    Returns:
        The expert application if found, 404 otherwise
    """
    application = await application_manager.get_application(application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    return application


@router.put("/admin/expert-applications/{application_id}/status", response_model=ExpertApplicationResponse)
async def update_application_status(
    application_id: str,
    status_update: ExpertApplicationStatusUpdate,
    admin_data: dict = Depends(require_admin)
):
    """
    Update the status of an expert application

    Admin access only

    Args:
        application_id: The ID of the application to update
        status_update: The status update data

    Returns:
        The updated expert application
    """
    # Check if status is rejected but no reason is provided
    if status_update.status == ExpertApplicationStatus.REJECTED and not status_update.rejectionReason:
        raise HTTPException(
            status_code=400, detail="Rejection reason is required when rejecting an application")

    application = await application_manager.update_application_status(
        application_id,
        status_update,
        admin_data["id"]
    )

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    return application

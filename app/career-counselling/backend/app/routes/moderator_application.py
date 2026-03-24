from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth_utils import get_current_user
from app.managers.moderator_application import ModeratorApplicationManager
from app.managers.user import UserManager
from app.models.moderator_application import (
    ApplicationStatus,
    ModeratorApplicationCreate,
    ModeratorApplicationResponse,
    ModeratorApplicationUpdate,
)

router = APIRouter()
application_manager = ModeratorApplicationManager()
user_manager = UserManager()


@router.post("/moderator-applications", response_model=ModeratorApplicationResponse)
async def submit_moderator_application(
    application_data: ModeratorApplicationCreate,
    user_data: dict = Depends(get_current_user),
):
    try:
        current_user = await user_manager.get_user_by_email(user_data["email"])
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        return await application_manager.submit_application(application_data, current_user.id)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to submit application")


@router.get("/my-moderator-applications", response_model=List[ModeratorApplicationResponse])
async def get_my_moderator_applications(user_data: dict = Depends(get_current_user)):
    try:
        current_user = await user_manager.get_user_by_email(user_data["email"])
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        return await application_manager.get_user_applications(current_user.id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch applications")


@router.get(
    "/communities/{community_id}/moderator-applications/pending",
    response_model=List[ModeratorApplicationResponse],
)
async def get_pending_moderator_applications_for_community(
    community_id: str,
    user_data: dict = Depends(get_current_user),
):
    try:
        current_user = await user_manager.get_user_by_email(user_data["email"])
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")

        community = await application_manager.community_manager.get_community(community_id)
        if not community:
            raise HTTPException(status_code=404, detail="Community not found")
        if community.createdBy != current_user.id:
            raise HTTPException(status_code=403, detail="Community creator access required")

        return await application_manager.get_community_applications_by_status(
            community.communityId, ApplicationStatus.PENDING
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch applications")


@router.put(
    "/communities/{community_id}/moderator-applications/{application_id}/review",
    response_model=ModeratorApplicationResponse,
)
async def review_moderator_application_by_creator(
    community_id: str,
    application_id: str,
    review_data: ModeratorApplicationUpdate,
    user_data: dict = Depends(get_current_user),
):
    try:
        current_user = await user_manager.get_user_by_email(user_data["email"])
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")

        community = await application_manager.community_manager.get_community(community_id)
        if not community:
            raise HTTPException(status_code=404, detail="Community not found")
        if community.createdBy != current_user.id:
            raise HTTPException(status_code=403, detail="Community creator access required")

        application = await application_manager.get_application(application_id)
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        if application.communityId != community.communityId:
            raise HTTPException(status_code=400, detail="Application does not belong to this community")

        updated = await application_manager.review_application_by_creator(
            application_id, current_user.id, review_data
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Application not found")
        return updated
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to review application")

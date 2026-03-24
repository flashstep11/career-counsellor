from fastapi import APIRouter, HTTPException, Depends, status, Response
from typing import List, Optional
from app.models.expert import Expert, ExpertResponse, ExpertUpdate
from app.managers.expert import ExpertManager
from app.managers.video import VideoManager
from app.core.auth_utils import get_current_user

router = APIRouter()
expert_manager = ExpertManager()
video_manager = VideoManager()


@router.post("/experts", response_model=Expert)
async def create_expert(expert: Expert):
    """Create a new expert profile"""
    return await expert_manager.create_expert(expert)


@router.get("/experts", response_model=dict)
async def list_experts(
    page: int = 1,
    limit: int = 10,
    sortBy: Optional[str] = None,
    available: Optional[bool] = None
):
    """
    Get a list of experts with pagination, sorting and filtering
    
    - **page**: Page number (starts at 1)
    - **limit**: Number of items per page
    - **sortBy**: Sort experts by "meetingCost", "rating", or "studentsGuided"
    - **available**: Filter to show only available experts if true
    """
    # Calculate skip based on page number and limit
    skip = (page - 1) * limit

    # Get paginated experts with sorting and filtering
    experts, total = await expert_manager.get_experts(
        skip=skip, 
        limit=limit, 
        sortBy=sortBy, 
        available=available
    )

    # Calculate total pages
    total_pages = (total + limit - 1) // limit

    return {
        "experts": experts,
        "total": total,
        "totalPages": total_pages,
        "page": page,
        "limit": limit
    }


@router.get("/experts/{expert_id}", response_model=ExpertResponse)
async def get_expert_profile(expert_id: str):
    """Get a specific expert's profile by ID"""
    expert = await expert_manager.get_expert(expert_id)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
    return expert


@router.put("/experts/{expert_id}", response_model=ExpertResponse)
async def update_expert_profile(
    expert_id: str,
    expert_update: ExpertUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an expert's profile. Only the expert themselves or an admin can update the profile.
    """
    # Get current expert profile
    expert = await expert_manager.get_expert(expert_id)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")

    # Security check: only the expert themselves or admins can update
    if expert.userId != current_user["id"] and not current_user.get("isAdmin", False):
        raise HTTPException(
            status_code=403, detail="You don't have permission to update this profile")

    print("INCOMING EXPERT UPDATE DUMP:")
    print(expert_update.model_dump(exclude_none=True))

    updated_expert = await expert_manager.update_expert(expert_id, expert_update)
    if not updated_expert:
        raise HTTPException(
            status_code=500, detail="Failed to update expert profile")

    return updated_expert


@router.get("/by-user/{user_id}", response_model=dict)
async def get_expert_by_user_id(user_id: str):
    """
    Get expert ID for a specific user ID if the user is an expert.
    """
    try:
        # Find the expert entry associated with this user ID
        expert = await expert_manager.get_expert_by_user_id(user_id)
        if not expert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No expert found for this user ID"
            )

        return {
            "expertId": expert.expertID,
            "name": f"{expert.userDetails.firstName} {expert.userDetails.lastName}",
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving expert by user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve expert information"
        )


@router.get("/experts/{expert_id}/profile-video")
async def get_expert_profile_video(expert_id: str):
    """
    Get the profile video for an expert.

    Returns the expert's explicitly chosen profile video if set,
    otherwise returns their most-viewed video.
    Returns 204 No Content if the expert has no videos.
    """
    try:
        video = await video_manager.get_profile_video_for_expert(expert_id)
        if video is None:
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        return video
    except Exception as e:
        print(f"Error retrieving profile video for expert {expert_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile video"
        )


@router.put("/experts/{expert_id}/profile-video")
async def set_expert_profile_video(
    expert_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Set or clear the profile video for an expert.

    Body: { "video_id": "<video_id>" }  — pass null/empty to clear.
    Only the expert themselves can call this endpoint.
    """
    try:
        # Verify the caller owns this expert profile
        expert = await expert_manager.get_expert(expert_id)
        if not expert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expert not found"
            )

        if expert.userId != current_user["id"] and not current_user.get("isAdmin", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this profile"
            )

        video_id: Optional[str] = payload.get("video_id") or None

        # If a video_id is provided, verify it belongs to this expert
        if video_id:
            video = await video_manager.get_video_without_view_increment(video_id)
            if not video or video.get("userId") != expert.userId:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Video not found or does not belong to this expert"
                )

        success = await expert_manager.set_profile_video(expert_id, video_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile video"
            )

        return {"message": "Profile video updated successfully", "video_id": video_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error setting profile video: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile video"
        )

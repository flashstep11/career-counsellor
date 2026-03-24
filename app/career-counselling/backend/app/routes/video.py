from fastapi import APIRouter, HTTPException, Query, Depends, Body, status
from typing import List, Optional, Dict
from app.models.video import VideoBase, VideoResponse, VideoCreate
from app.managers.video import VideoManager
from app.managers.notification import NotificationManager
from app.core.auth_utils import require_user, require_expert, require_admin
import traceback

router = APIRouter()
video_manager = VideoManager()
notification_manager = NotificationManager()


@router.post("/videos", response_model=VideoBase)
async def create_video(video: VideoCreate, user_data: dict = Depends(require_expert)):
    """
    Create a new video entry.

    Returns the created video with generated ID and timestamps.
    """
    try:
        result = await video_manager.create_video(video, user_data["id"])
        # Notify followers
        video_id = result.videoID if hasattr(result, "videoID") else ""
        await notification_manager.create_video_notification_for_followers(
            expert_user_id=user_data["id"],
            video_id=video_id,
            video_title=video.title,
        )
        return result
    except ValueError as e:
        print(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Handle other errors
        print(f"Error in create_video: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid video data: {str(e)}"
        )


@router.put("/videos/{video_id}", response_model=VideoResponse)
async def update_video(
    video_id: str,
    video_update: Dict = Body(...),
    user_data: dict = Depends(require_user)
):
    """
    Update a video entry. Only the owner or an admin can update videos.

    Returns the updated video if successful.
    """
    # Make sure tags are properly handled
    if "tags" not in video_update:
        video_update["tags"] = []

    # Check if user is admin
    is_admin = user_data.get("isAdmin", False)

    # If user is admin, update without user_id check
    if is_admin:
        updated_video = await video_manager.update_video(
            video_id=video_id,
            video_update=video_update,
            user_id=None  # Admin can edit any video
        )
    else:
        # Regular user - only update their own videos
        updated_video = await video_manager.update_video(
            video_id=video_id,
            video_update=video_update,
            user_id=user_data["id"]
        )

    if not updated_video:
        raise HTTPException(
            status_code=404,
            detail="Video not found or you don't have permission to edit it"
        )

    return updated_video


@router.get("/videos", response_model=dict)
async def list_videos(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=50, description="Items per page"),
    category: Optional[str] = Query(None, description="Filter by video category"),
    sortBy: str = Query("recent", description="Sort videos by: recent, views, likes"),
    typeId: Optional[str] = Query(None, description="ID of college or branch for specific videos"),
    refType: Optional[str] = Query(None, description="Type of reference (college or collegebranch)")
):
    """Get a list of videos with pagination and filtering"""
    # Calculate skip based on page number and limit
    skip = (page - 1) * limit

    # Get paginated videos with filters
    videos = await video_manager.get_videos_with_filters(
        skip=skip,
        limit=limit,
        category=category,
        sort_by=sortBy,
        type_id=typeId,
        ref_type=refType
    )

    # Get total count of videos with filters
    total = await video_manager.count_videos_with_filters(
        category=category
    )

    # Calculate total pages
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return {
        "videos": videos,
        "total": total,
        "totalPages": total_pages,
        "page": page,
        "limit": limit
    }


@router.get("/experts/{expert_id}/videos", response_model=dict)
async def get_expert_videos(
    expert_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=50, description="Items per page")
):
    """
    Get videos published by a specific expert with pagination.

    Args:
        expert_id: The ID of the expert
        page: Page number for pagination
        limit: Maximum number of records per page

    Returns:
        Dictionary with videos and pagination metadata
    """
    # Calculate skip based on page number and limit
    skip = (page - 1) * limit

    # Get paginated videos
    videos = await video_manager.get_videos_by_expert_id(expert_id, skip, limit)

    # Get total count of videos for this expert
    total = await video_manager.count_videos(expert_id=expert_id)

    # Calculate total pages
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return {
        "videos": videos,
        "total": total,
        "totalPages": total_pages,
        "page": page,
        "limit": limit
    }


@router.get("/videos/{video_id}", response_model=VideoResponse)
async def get_video(video_id: str):
    """
    Get a single video by ID.

    Returns the video details if found.
    """
    video = await video_manager.get_video(video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.delete("/videos/{video_id}")
async def delete_video(
    video_id: str,
    user_data: dict = Depends(require_user)
):
    """
    Delete a video. Only the owner or an admin can delete videos.

    Args:
        video_id: The ID of the video to delete
        user_data: Authentication data of the current user

    Returns:
        A message indicating success or failure
    """
    # Get user ID from multiple possible keys
    user_id = user_data.get("_id") or user_data.get("id") or user_data.get("userId")
    is_admin = user_data.get("isAdmin", False)

    if not user_id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot identify user ID from authentication data"
        )

    # If user is admin, delete without checking ownership
    if is_admin:
        success = await video_manager.delete_video(video_id)
    else:
        # Regular user - only delete their own videos
        success = await video_manager.delete_video(
            video_id=video_id,
            user_id=user_id
        )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found or you don't have permission to delete it"
        )

    return {"message": "Video deleted successfully"}


@router.delete("/admin/videos/{video_id}")
async def admin_delete_video(
    video_id: str,
    user_data: dict = Depends(require_admin)
):
    """
    Admin endpoint to delete any video regardless of ownership.

    Args:
        video_id: The ID of the video to delete
        user_data: Authentication data of the admin user

    Returns:
        A message indicating success or failure
    """
    try:
        # For admin deletion, we directly use the delete_video method without checking ownership
        success = await video_manager.delete_video(video_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found"
            )

        return {"message": "Video deleted successfully by admin"}
    except Exception as e:
        print(f"Error in admin_delete_video: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete video: {str(e)}"
        )


@router.post("/videos/{video_id}/like", response_model=VideoResponse)
async def like_video(video_id: str, user_data: dict = Depends(require_user)):
    """
    Like or unlike a video.

    If the user has already liked the video, this endpoint will remove the like.
    If the user has not liked the video yet, it will add a like.

    Args:
        video_id: The ID of the video to like or unlike
        user_data: Authentication data of the current user

    Returns:
        Updated video with updated like count
    """
    try:
        # Get user ID from multiple possible keys
        user_id = user_data.get("_id") or user_data.get("id") or user_data.get("userId")

        if not user_id:
            raise ValueError("Cannot identify user ID from authentication data")

        updated_video = await video_manager.like_video(video_id, user_id)
        if not updated_video:
            raise HTTPException(
                status_code=404,
                detail="Video not found"
            )
        return updated_video
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error liking video: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update like status"
        )


@router.get("/videos/{video_id}/like/check")
async def check_video_like(video_id: str, user_data: dict = Depends(require_user)):
    """
    Check if the current user has liked a specific video.

    Args:
        video_id: The ID of the video to check
        user_data: Authentication data of the current user

    Returns:
        Dictionary with the like status
    """
    try:
        # Get user ID from multiple possible keys
        user_id = user_data.get("_id") or user_data.get("id") or user_data.get("userId")

        if not user_id:
            raise ValueError("Cannot identify user ID from authentication data")

        like_status = await video_manager.check_video_like(video_id, user_id)
        return like_status
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Error checking video like status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to check like status"
        )


@router.get("/experts/options")
async def get_expert_options():
    """Get a list of experts for the filter dropdown"""
    experts = await video_manager.get_expert_options()
    return experts


@router.get("/videos/{video_id}/related", response_model=dict)
async def get_related_videos(
    video_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(3, ge=1, le=20, description="Items per page")
):
    """
    Get videos related to the specified video with pagination.

    Args:
        video_id: The ID of the video to find related content for
        page: Page number for pagination
        limit: Maximum number of records per page

    Returns:
        Dictionary with related videos and pagination metadata
    """
    # Calculate skip based on page number and limit
    skip = (page - 1) * limit

    # Get paginated related videos
    videos = await video_manager.get_related_videos(video_id, skip, limit)

    # Get total count of related videos
    total = await video_manager.count_related_videos(video_id)

    # Calculate total pages
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return {
        "videos": videos,
        "total": total,
        "totalPages": total_pages,
        "page": page,
        "limit": limit
    }

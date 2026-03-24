from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth_utils import get_current_user
from app.managers.expert_analytics import ExpertAnalyticsManager
from app.managers.expert import ExpertManager
from app.schemas.analytics import ExpertAnalytics

router = APIRouter()
analytics_manager = ExpertAnalyticsManager()
expert_manager = ExpertManager()


@router.get("/experts/{expert_id}/analytics", response_model=ExpertAnalytics)
async def get_expert_analytics(expert_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get comprehensive analytics data for an expert.
    Only the expert themselves or an admin can access this data.
    """
    # Check if user is the expert or admin
    expert = await expert_manager.get_expert(expert_id)
    if not expert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Expert not found")

    # Only allow the expert to view their own analytics or admins
    if expert.userId != current_user["id"] and not current_user.get("isAdmin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access")

    # Use the analytics manager to get the data
    analytics_data = await analytics_manager.get_expert_analytics(expert_id)

    if not analytics_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analytics data"
        )

    return analytics_data


@router.post("/posts/{post_id}/view")
async def track_post_view(post_id: str):
    """
    Track a view event for a post.
    """
    success = await analytics_manager.track_post_view(post_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found or view tracking failed"
        )

    return {"message": "View tracked successfully"}


@router.post("/blogs/{blog_id}/view")
async def track_blog_view(blog_id: str):
    """
    Track a view event for a blog.
    """
    success = await analytics_manager.track_blog_view(blog_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found or view tracking failed"
        )

    return {"message": "View tracked successfully"}


@router.post("/videos/{video_id}/view")
async def track_video_view(video_id: str):
    """
    Track a view event for a video.
    """
    success = await analytics_manager.track_video_view(video_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found or view tracking failed"
        )

    return {"message": "View tracked successfully"}


@router.post("/experts/{expert_id}/profile-view")
async def track_profile_view(expert_id: str):
    """
    Track a view event for an expert profile.
    """
    success = await analytics_manager.track_profile_view(expert_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expert not found or view tracking failed"
        )

    return {"message": "View tracked successfully"}

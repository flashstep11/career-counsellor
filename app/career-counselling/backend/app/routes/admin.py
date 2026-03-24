from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path
from typing import List, Optional
from pydantic import BaseModel
from app.core.auth_utils import require_admin
from app.managers.user import UserManager
from app.managers.blog import BlogManager
from app.managers.expert import ExpertManager
from app.managers.video import VideoManager
from app.managers.expert_application import ExpertApplicationManager
from app.schemas.admin import (
    UsersListResponse,
    ExpertsListResponse,
    BlogsListResponse,
    VideosListResponse,
    ExpertApprovalRequest,
    DashboardStats
)
from app.models.expert_application import ExpertApplicationResponse
from bson import ObjectId
from datetime import datetime

router = APIRouter()
user_manager = UserManager()
blog_manager = BlogManager()
expert_manager = ExpertManager()
video_manager = VideoManager()
expert_application_manager = ExpertApplicationManager()


@router.post("/initialize-wallets")
async def initialize_wallets(user_data: dict = Depends(require_admin)):
    """
    Initialize wallets for all existing users who don't have one.
    Only accessible by admins.
    """
    modified_count = await user_manager.initialize_wallet_for_existing_users()
    return {"message": f"Initialized wallets for {modified_count} users"}


@router.get("/dashboard", response_model=DashboardStats)
async def admin_dashboard(user_data: dict = Depends(require_admin)):
    """
    Get admin dashboard statistics data.
    Only accessible by admins.
    """
    stats = await user_manager.get_dashboard_stats()
    return stats


@router.get("/users", response_model=UsersListResponse)
async def get_users(
    search: Optional[str] = Query(None),
    user_data: dict = Depends(require_admin)
):
    """
    Get all users with optional search filtering.
    Only accessible by admins.
    """
    users = await user_manager.get_all_users(search)
    return {"users": users}


@router.get("/experts", response_model=ExpertsListResponse)
async def get_experts(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(
        None, enum=["pending", "approved", "rejected"]),
    user_data: dict = Depends(require_admin)
):
    """
    Get all experts with optional search filtering and status filtering.
    Only accessible by admins.
    """
    experts = await expert_manager.get_all_experts(search, status)
    return {"experts": experts}


@router.put("/experts/{expert_id}/approve", response_model=dict)
async def approve_expert(
    expert_id: str = Path(...),
    approval_data: ExpertApprovalRequest = Body(...),
    user_data: dict = Depends(require_admin)
):
    """
    Approve or reject an expert.
    Only accessible by admins.
    """
    success = await expert_manager.update_expert_approval(expert_id, approval_data.status)
    if not success:
        raise HTTPException(status_code=404, detail="Expert not found")

    return {"success": True, "message": f"Expert {approval_data.status}"}


@router.post("/make-expert/{user_id}", response_model=dict)
async def make_user_expert(
    user_id: str = Path(...),
    user_data: dict = Depends(require_admin)
):
    """
    Convert a regular user into an expert (pending approval).
    Only accessible by admins.
    """
    success = await expert_manager.make_user_expert(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    return {"success": True, "message": "User marked as expert (pending approval)"}


@router.get("/blogs", response_model=BlogsListResponse)
async def get_blogs(
    search: Optional[str] = Query(None),
    user_data: dict = Depends(require_admin)
):
    """
    Get all blogs with optional search filtering.
    Only accessible by admins.
    """
    # Use get_blogs_with_filters instead of get_all_blogs
    blogs = await blog_manager.get_blogs_with_filters(
        skip=0,
        limit=100,  # Use a reasonably large limit for admin view
        expert_id=None,
        ref_type=None,
        type_id=None,
        sort_by="recent"
    )
    return {"blogs": blogs}


@router.put("/blogs/{blog_id}", response_model=dict)
async def update_blog(
    blog_id: str = Path(...),
    blog_data: dict = Body(...),
    user_data: dict = Depends(require_admin)
):
    """
    Update a blog.
    Only accessible by admins.
    """
    success = await blog_manager.update_blog_admin(blog_id, blog_data)
    if not success:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"success": True, "message": "Blog updated successfully"}


@router.delete("/blogs/{blog_id}", response_model=dict)
async def delete_blog(
    blog_id: str = Path(...),
    user_data: dict = Depends(require_admin)
):
    """
    Delete a blog.
    Only accessible by admins.
    """
    success = await blog_manager.delete_blog(blog_id)
    if not success:
        raise HTTPException(status_code=404, detail="Blog not found")

    return {"success": True, "message": "Blog deleted successfully"}


@router.get("/videos", response_model=VideosListResponse)
async def get_videos(
    search: Optional[str] = Query(None),
    user_data: dict = Depends(require_admin)
):
    """
    Get all videos with optional search filtering.
    Only accessible by admins.
    """
    videos = await video_manager.get_all_videos(search)
    return {"videos": videos}


@router.get("/recent-activities", response_model=dict)
async def get_recent_activities(
    limit: int = Query(5),
    user_data: dict = Depends(require_admin)
):
    """
    Get recent activities on the platform.
    Only accessible by admins.
    """
    activities = await user_manager.get_recent_activities(limit)
    return {"activities": activities}


@router.get("/expert-applications", response_model=List[ExpertApplicationResponse])
async def get_expert_applications(
    status: Optional[str] = Query(
        None, enum=["pending", "approved", "rejected"]),
    user_data: dict = Depends(require_admin)
):
    """
    Get all expert applications with optional status filtering.
    Only accessible by admins.
    """
    applications = await expert_application_manager.get_all_applications(status)
    return applications


@router.get("/admin/videos")
async def get_admin_videos(user_data: dict = Depends(require_admin)):
    """
    Get all videos for admin dashboard
    """
    try:
        videos = await video_manager.get_admin_videos()
        return {"videos": videos}
    except Exception as e:
        print(f"Error fetching admin videos: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch videos: {str(e)}"
        )


@router.get("/admin/users")
async def get_admin_users(
    search: Optional[str] = Query(None, description="Search term for user name or email"),
    user_data: dict = Depends(require_admin)
):
    """
    Get all users for admin dashboard
    """
    try:
        users = await user_manager.get_all_users(search)
        return {"users": users}
    except Exception as e:
        print(f"Error fetching admin users: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch users: {str(e)}"
        )


@router.get("/admin/experts")
async def get_admin_experts(user_data: dict = Depends(require_admin)):
    """
    Get all experts for admin dashboard
    """
    try:
        experts = await expert_manager.get_all_experts()
        return {"experts": experts}
    except Exception as e:
        print(f"Error fetching admin experts: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch experts: {str(e)}"
        )


@router.get("/admin/blogs")
async def get_admin_blogs(user_data: dict = Depends(require_admin)):
    """
    Get all blogs for admin dashboard
    """
    try:
        blogs = await blog_manager.get_all_blogs()
        return {"blogs": blogs}
    except Exception as e:
        print(f"Error fetching admin blogs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch blogs: {str(e)}"
        )


@router.get("/admin/recent-activities")
async def get_admin_activities(
    limit: int = Query(10, ge=1, le=100, description="Number of activities to return"),
    user_data: dict = Depends(require_admin)
):
    """
    Get recent activities for admin dashboard
    """
    try:
        activities = await user_manager.get_recent_activities(limit)
        return {"activities": activities}
    except Exception as e:
        print(f"Error fetching admin activities: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch activities: {str(e)}"
        )



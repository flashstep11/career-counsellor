from fastapi import APIRouter, HTTPException, Query, Depends, Body, status
from typing import List, Dict, Optional
from datetime import datetime
from app.models.blog import Blog, BlogResponse, BlogBase
from app.managers.blog import BlogManager
from app.managers.user import UserManager
from app.managers.notification import NotificationManager
from app.core.auth_utils import require_user, require_expert

router = APIRouter()

blog_manager = BlogManager()
notification_manager = NotificationManager()


@router.get("/blogs", response_model=dict)
async def list_blogs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=50, description="Items per page"),
    expert: Optional[str] = Query(None, description="Filter blogs by expert ID"),
    refType: Optional[str] = Query(None, description="Filter by reference type (NA, college, collegebranch)"),
    typeId: Optional[str] = Query(None, description="Filter by specific college or branch ID"),
    sortBy: str = Query("recent", description="Sort blogs by: recent, views, likes")
):
    """Get a list of blogs with pagination and filtering"""
    # Calculate skip based on page number and limit
    skip = (page - 1) * limit

    # Get paginated blogs with filters
    blogs = await blog_manager.get_blogs_with_filters(
        skip=skip, 
        limit=limit, 
        expert_id=expert,
        ref_type=refType,
        type_id=typeId,
        sort_by=sortBy
    )

    # Get total count of blogs with filters
    total = await blog_manager.count_blogs_with_filters(
        expert_id=expert,
        ref_type=refType,
        type_id=typeId
    )

    # Calculate total pages
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return {
        "blogs": blogs,
        "total": total,
        "totalPages": total_pages,
        "page": page,
        "limit": limit
    }


@router.get("/experts/{expert_id}/blogs", response_model=dict)
async def get_expert_blogs(
    expert_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=50, description="Items per page")
):
    """
    Get blogs published by a specific expert with pagination.

    Args:
        expert_id: The ID of the expert
        page: Page number for pagination
        limit: Maximum number of records per page

    Returns:
        Dictionary with blogs and pagination metadata
    """
    # Calculate skip based on page number and limit
    skip = (page - 1) * limit

    # Get paginated blogs
    blogs = await blog_manager.get_blogs_by_expert_id(expert_id, skip, limit)

    # Get total count of blogs for this expert
    total = await blog_manager.count_blogs(expert_id=expert_id)

    # Calculate total pages
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return {
        "blogs": blogs,
        "total": total,
        "totalPages": total_pages,
        "page": page,
        "limit": limit
    }


@router.get("/blogs/{blog_id}", response_model=BlogResponse)
async def get_single_blog(blog_id: str):
    blog = await blog_manager.get_blog(blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    return blog


@router.post("/blogs", response_model=Blog)
async def create_blog(blog_data: BlogBase, user_data: dict = Depends(require_expert)):
    # Create a full Blog object from the BlogBase data
    # and add the server-side fields
    blog = Blog(
        **blog_data.dict(),
        userID=user_data["id"],
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )

    result = await blog_manager.create_blog(blog)
    
    # Log the activity for admin dashboard
    user_manager = UserManager()
    await user_manager.log_activity(
        activity_type="blog_creation",
        description=f"New blog created: {blog_data.heading}",
        user_id=user_data["id"]
    )

    # Notify followers
    blog_id = result.blogID if hasattr(result, "blogID") and result.blogID else ""
    await notification_manager.create_blog_notification_for_followers(
        expert_user_id=user_data["id"],
        blog_id=blog_id,
        blog_heading=blog_data.heading,
    )
    
    return result


@router.put("/blogs/{blog_id}", response_model=BlogResponse)
async def update_blog(
    blog_id: str,
    blog_update: Dict = Body(...),
    user_data: dict = Depends(require_user)
):
    """
    Update a blog post. Only the author can update their own blog.

    Returns the updated blog if successful.
    """
    updated_blog = await blog_manager.update_blog(
        blog_id=blog_id,
        blog_update=blog_update,
        user_id=user_data["id"]
    )

    if not updated_blog:
        raise HTTPException(
            status_code=404,
            detail="Blog not found or you don't have permission to edit it"
        )
        
    # Log the activity for admin dashboard
    user_manager = UserManager()
    await user_manager.log_activity(
        activity_type="blog_update",
        description=f"Blog updated: {updated_blog.heading}",
        user_id=user_data["id"]
    )

    return updated_blog


@router.delete("/blogs/{blog_id}")
async def delete_blog(
    blog_id: str,
    user_data: dict = Depends(require_user)
):
    """
    Delete a blog post. Only the author can delete their own blog.

    Args:
        blog_id: The ID of the blog to delete
        user_data: Authentication data of the current user

    Returns:
        A message indicating success or failure
    """
    # First get the blog to log its title before deletion
    blog = await blog_manager.get_blog(blog_id)
    if not blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found"
        )
    
    blog_title = blog.heading
    
    success = await blog_manager.delete_blog(
        blog_id=blog_id,
        user_id=user_data["id"]
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog not found or you don't have permission to delete it"
        )
        
    # Log the activity for admin dashboard
    user_manager = UserManager()
    await user_manager.log_activity(
        activity_type="blog_deletion",
        description=f"Blog deleted: {blog_title}",
        user_id=user_data["id"]
    )

    return {"message": "Blog deleted successfully"}


@router.post("/blogs/{blog_id}/like", response_model=BlogResponse)
async def like_blog(blog_id: str, user_data: dict = Depends(require_user)):
    """
    Like or unlike a blog post.

    If the user has already liked the blog, this endpoint will remove the like.
    If the user has not liked the blog yet, it will add a like.

    Args:
        blog_id: The ID of the blog to like or unlike
        user_data: Authentication data of the current user

    Returns:
        Updated blog post with updated like count
    """
    try:
        updated_blog = await blog_manager.like_blog(blog_id, user_data["id"])
        if not updated_blog:
            raise HTTPException(
                status_code=404,
                detail="Blog not found"
            )
        return updated_blog
    except Exception as e:
        print(f"Error liking blog: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update like status"
        )


@router.get("/blogs/{blog_id}/like/check")
async def check_blog_like(blog_id: str, user_data: dict = Depends(require_user)):
    """
    Check if the current user has liked a specific blog.

    Args:
        blog_id: The ID of the blog to check
        user_data: Authentication data of the current user

    Returns:
        Dictionary with the like status
    """
    try:
        like_status = await blog_manager.check_blog_like(blog_id, user_data["id"])
        return like_status
    except Exception as e:
        print(f"Error checking blog like status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to check like status"
        )

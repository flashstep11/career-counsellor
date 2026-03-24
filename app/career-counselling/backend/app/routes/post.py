from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from app.models.post import PostResponse
from app.models.comment import Comment, CommentCreate, CommentResponse
from app.managers.post import PostManager
from app.managers.comment import CommentManager
from app.managers.connection import ConnectionManager
from app.core.auth_utils import get_current_user, require_user, get_optional_user
from datetime import datetime

router = APIRouter()
post_manager = PostManager()
comment_manager = CommentManager()
connection_manager = ConnectionManager()


class PostCommentCreate(BaseModel):
    content: str
    parent_id: Optional[str] = None


class PostEditData(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


@router.get("/posts", response_model=List[PostResponse])
async def list_posts(community_id: Optional[str] = None, skip: int = 0, limit: int = 50):
    """List posts, optionally scoped to a community."""
    if community_id:
        return await post_manager.get_posts_by_community(community_id, skip, limit)
    return await post_manager.get_all_posts(skip, limit)

@router.get("/posts/feed", response_model=List[PostResponse])
async def get_feed(skip: int = 0, limit: int = 30, user_data: Optional[dict] = Depends(get_optional_user)):
    """Get posts from communities the current user has joined."""
    try:
        if user_data:
            return await post_manager.get_feed_posts(user_data["id"], skip, limit)
        return []
    except Exception as e:
        print(f"get_feed error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get feed")


@router.get("/posts/network-feed", response_model=List[PostResponse])
async def get_network_feed(
    skip: int = 0,
    limit: int = 30,
    user_data: dict = Depends(get_current_user),
):
    """Get posts authored by the current user's connections."""
    try:
        connected_ids = await connection_manager.get_connected_user_ids(user_data["id"])
        return await post_manager.get_posts_by_authors(list(connected_ids), skip, limit)
    except Exception as e:
        print(f"get_network_feed error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get network feed")


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: str):
    """Get a single post by ID."""
    post = await post_manager.get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/posts/{post_id}/like", response_model=PostResponse)
async def like_post(post_id: str, user_data: dict = Depends(require_user)):
    """Like or unlike a post."""
    updated = await post_manager.like_post(post_id, user_data["id"])
    if not updated:
        raise HTTPException(status_code=404, detail="Post not found")
    return updated


@router.post("/posts/{post_id}/comment", response_model=CommentResponse)
async def comment_on_post(
    post_id: str,
    comment_data: PostCommentCreate,
    user_data: dict = Depends(require_user),
):
    """Add a comment to a post."""
    comment = Comment(
        content=comment_data.content,
        type="post",
        page_id=post_id,
        parent_id=comment_data.parent_id,
        userID=user_data["email"],
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow(),
    )
    return await comment_manager.create_comment(comment)


@router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_post_comments(post_id: str, skip: int = 0, limit: int = 50):
    """Get all comments for a post."""
    result = await comment_manager.get_comments(post_id, "post", skip, limit)
    return result.get("comments", [])


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, community_id: Optional[str] = None, user_data: dict = Depends(require_user)):
    """Delete a post. Author or community moderator can delete."""
    success = await post_manager.delete_post(post_id, user_data["id"], community_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Post not found or you don't have permission to delete it",
        )
    return {"message": "Post deleted successfully"}


@router.put("/posts/{post_id}", response_model=PostResponse)
async def edit_post(post_id: str, edit_data: PostEditData, user_data: dict = Depends(require_user)):
    """Edit a post's title, content, or tags. Only the author can edit."""
    updated = await post_manager.edit_post(post_id, user_data["id"], edit_data.dict(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Post not found or you don't have permission to edit it")
    return updated


@router.post("/posts/{post_id}/view")
async def track_post_view(post_id: str):
    """Track a view event for a post."""
    success = await post_manager.increment_view(post_id)
    if not success:
        raise HTTPException(status_code=404, detail="Post not found or view tracking failed")
    return {"message": "View tracked successfully"}
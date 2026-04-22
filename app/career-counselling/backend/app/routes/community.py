from fastapi import APIRouter, HTTPException, Depends, UploadFile, File as FastAPIFile
from typing import List, Optional
from pydantic import BaseModel
from bson import ObjectId
from app.models.community import CommunityCreate, CommunityResponse
from app.managers.community import CommunityManager
from app.managers.post import PostManager
from app.managers.file import FileManager
from app.managers.notification import NotificationManager
from app.managers.report import ReportManager
from app.models.report import ReportCreate
from app.core.auth_utils import get_current_user, require_user, get_optional_user

router = APIRouter()
community_manager = CommunityManager()
post_manager = PostManager()
file_manager = FileManager()
notification_manager = NotificationManager()
report_manager = ReportManager()


# ── Community endpoints ───────────────────────────────────────────────────────

@router.get("/communities", response_model=List[CommunityResponse])
async def list_communities(
    skip: int = 0,
    limit: int = 50,
    user_data: Optional[dict] = Depends(get_optional_user),
):
    """List all communities (public). Includes isJoined status if authenticated."""
    try:
        user_id = user_data["id"] if user_data else None
        return await community_manager.list_communities(skip, limit, user_id)
    except Exception as e:
        print(f"list_communities error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list communities")


@router.post("/communities", response_model=CommunityResponse)
async def create_community(data: CommunityCreate, user_data: dict = Depends(require_user)):
    """Create a new community. Requires login. Creator auto-joins."""
    try:
        return await community_manager.create_community(data, user_data["id"])
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        print(f"create_community error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create community")


@router.get("/communities/user/joined", response_model=List[CommunityResponse])
async def get_user_joined_communities(user_data: dict = Depends(require_user)):
    """Get all communities the current user has joined."""
    try:
        return await community_manager.get_user_communities(user_data["id"])
    except Exception as e:
        print(f"get_user_joined_communities error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get joined communities")


@router.get("/communities/{community_id}", response_model=CommunityResponse)
async def get_community(
    community_id: str,
    user_data: Optional[dict] = Depends(get_optional_user),
):
    """Get a single community by ID or slug."""
    try:
        user_id = user_data["id"] if user_data else None
        community = await community_manager.get_community(community_id, user_id)
        if not community:
            raise HTTPException(status_code=404, detail="Community not found")
        return community
    except HTTPException:
        raise
    except Exception as e:
        print(f"get_community error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get community")


@router.post("/communities/{community_id}/join")
async def join_community(community_id: str, user_data: dict = Depends(require_user)):
    """Join a community."""
    success = await community_manager.join_community(community_id, user_data["id"])
    if not success:
        raise HTTPException(status_code=400, detail="Could not join community")
    return {"message": "Joined community successfully"}


@router.post("/communities/{community_id}/leave")
async def leave_community(community_id: str, user_data: dict = Depends(require_user)):
    """Leave a community."""
    success = await community_manager.leave_community(community_id, user_data["id"])
    if not success:
        raise HTTPException(status_code=400, detail="Could not leave community")
    return {"message": "Left community successfully"}


# ── Post endpoints scoped to a community ─────────────────────────────────────

@router.get("/communities/{community_id}/posts")
async def get_community_posts(
    community_id: str,
    skip: int = 0,
    limit: int = 30,
):
    """Get all posts for a specific community (supports ID or slug)."""
    try:
        # Resolve slug or ID to the actual ObjectId string
        community = await community_manager.get_community(community_id)
        actual_id = community.communityId if community else community_id
        posts = await post_manager.get_posts_by_community(actual_id, skip, limit)
        return posts
    except Exception as e:
        print(f"get_community_posts error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve posts")


class MediaItem(BaseModel):
    url: str
    type: str
    fileId: str

class CommunityPostCreate(BaseModel):
    title: str
    content: str
    tags: Optional[List[str]] = []
    media: Optional[List[MediaItem]] = []


@router.post("/communities/{community_id}/posts")
async def create_community_post(
    community_id: str,
    post_data: CommunityPostCreate,
    user_data: dict = Depends(require_user),
):
    """Create a new post within a community (supports ID or slug)."""
    try:
        # Verify community exists (supports both ObjectId and slug)
        community = await community_manager.get_community(community_id)
        if not community:
            raise HTTPException(status_code=404, detail="Community not found")

        # Always use the resolved ObjectId for DB operations
        actual_community_id = community.communityId

        # Reject banned users
        comm_doc_raw = await community_manager.collection.find_one({"_id": ObjectId(actual_community_id)})
        if comm_doc_raw and user_data["id"] in comm_doc_raw.get("bannedUsers", []):
            raise HTTPException(status_code=403, detail="You have been banned from this community")

        # Verify user is a member (auto-join for c/general)
        community_doc = await community_manager.collection.find_one(
            {"_id": ObjectId(actual_community_id), "members": user_data["id"]}
        )
        if not community_doc:
            if community.name == "general":
                # Auto-join general community
                await community_manager.join_community(actual_community_id, user_data["id"])
            else:
                raise HTTPException(status_code=403, detail="You must join this community before posting")

        post = await post_manager.create_community_post(
            community_id=actual_community_id,
            author_id=user_data["id"],
            title=post_data.title,
            content=post_data.content,
            tags=post_data.tags or [],
            media=[m.dict() for m in (post_data.media or [])],
        )

        # Update post count on community
        await community_manager.increment_post_count(actual_community_id)

        # Notify ALL community members about the new post
        import asyncio
        asyncio.create_task(
            notification_manager.create_community_post_for_all_members(
                poster_id=user_data["id"],
                post_id=post.postId,
                community_id=actual_community_id,
                community_display_name=community.displayName,
            )
        )

        # Also batch-notify followers if poster is an expert
        if user_data.get("role") == "expert":
            comm_doc = community_doc or await community_manager.collection.find_one(
                {"_id": ObjectId(actual_community_id)}
            )
            if comm_doc:
                from app.core.database import get_database
                db = get_database()
                expert_doc = await db.users.find_one(
                    {"_id": ObjectId(user_data["id"])},
                    {"followers": 1},
                )
                expert_followers = set(expert_doc.get("followers", [])) if expert_doc else set()
                member_ids = comm_doc.get("members", [])
                target_ids = [m for m in member_ids if m in expert_followers]
                if target_ids:
                    await notification_manager.create_community_post_notification_for_members(
                        expert_user_id=user_data["id"],
                        post_id=post.postId,
                        member_ids=target_ids,
                    )

        return post
    except HTTPException:
        raise
    except Exception as e:
        print(f"create_community_post error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create post")


ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
MAX_IMAGE_SIZE = 5 * 1024 * 1024   # 5 MB
MAX_VIDEO_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/communities/upload-media")
async def upload_post_media(
    file: UploadFile = FastAPIFile(...),
    user_data: dict = Depends(require_user),
):
    """Upload an image or short video for a community post."""
    content_type = file.content_type or ""

    if content_type in ALLOWED_IMAGE_TYPES:
        media_type = "image"
        max_size = MAX_IMAGE_SIZE
    elif content_type in ALLOWED_VIDEO_TYPES:
        media_type = "video"
        max_size = MAX_VIDEO_SIZE
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM."
        )

    file_id = await file_manager.upload_file(
        file,
        folder="post-media",
        allowed_types=ALLOWED_IMAGE_TYPES + ALLOWED_VIDEO_TYPES,
        max_size=max_size,
    )

    return {
        "fileId": file_id,
        "url": f"/api/files/{file_id}",
        "type": media_type,
    }


# ── Moderation endpoints ──────────────────────────────────────────────────────

class ModActionBody(BaseModel):
    userId: str


@router.post("/communities/{community_id}/promote")
async def promote_to_moderator(
    community_id: str,
    body: ModActionBody,
    user_data: dict = Depends(require_user),
):
    """Promote a member to moderator (mod-only)."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    ok = await community_manager.promote_to_moderator(community.communityId, user_data["id"], body.userId)
    if not ok:
        raise HTTPException(status_code=403, detail="Not authorised or user not found")
    return {"message": "User promoted to moderator"}


@router.post("/communities/{community_id}/demote")
async def demote_moderator(
    community_id: str,
    body: ModActionBody,
    user_data: dict = Depends(require_user),
):
    """Demote a moderator back to member (creator-only)."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    ok = await community_manager.demote_moderator(community.communityId, user_data["id"], body.userId)
    if not ok:
        raise HTTPException(status_code=403, detail="Not authorised")
    return {"message": "Moderator demoted"}


@router.post("/communities/{community_id}/ban")
async def ban_user(
    community_id: str,
    body: ModActionBody,
    user_data: dict = Depends(require_user),
):
    """Ban a user from the community (mod-only)."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    ok = await community_manager.ban_user(community.communityId, user_data["id"], body.userId)
    if not ok:
        raise HTTPException(status_code=403, detail="Not authorised")
    return {"message": "User banned from community"}


@router.post("/communities/{community_id}/unban")
async def unban_user(
    community_id: str,
    body: ModActionBody,
    user_data: dict = Depends(require_user),
):
    """Lift a ban (mod-only)."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    ok = await community_manager.unban_user(community.communityId, user_data["id"], body.userId)
    if not ok:
        raise HTTPException(status_code=403, detail="Not authorised")
    return {"message": "User unbanned"}


@router.post("/communities/{community_id}/posts/{post_id}/pin")
async def pin_post(
    community_id: str,
    post_id: str,
    user_data: dict = Depends(require_user),
):
    """Pin a post to the top of the community feed (mod-only)."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    ok = await community_manager.pin_post(community.communityId, user_data["id"], post_id)
    if not ok:
        raise HTTPException(status_code=403, detail="Not authorised or pin limit reached (max 5)")
    return {"message": "Post pinned"}


@router.post("/communities/{community_id}/posts/{post_id}/unpin")
async def unpin_post(
    community_id: str,
    post_id: str,
    user_data: dict = Depends(require_user),
):
    """Unpin a post (mod-only)."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    ok = await community_manager.unpin_post(community.communityId, user_data["id"], post_id)
    if not ok:
        raise HTTPException(status_code=403, detail="Not authorised")
    return {"message": "Post unpinned"}


@router.get("/communities/{community_id}/search")
async def search_community_posts(
    community_id: str,
    q: str,
    skip: int = 0,
    limit: int = 20,
):
    """Search posts within a specific community by title/content/tags."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    results = await community_manager.search_posts(community.communityId, q, skip, limit)
    return results


# ── Report endpoints (community-scoped) ──────────────────────────────────────

@router.post("/communities/{community_id}/reports")
async def create_report(
    community_id: str,
    data: ReportCreate,
    user_data: dict = Depends(require_user),
):
    """Submit a report for a post or comment in a community."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    data.communityId = community.communityId
    report = await report_manager.create_report(data, user_data["id"])
    return report


@router.get("/communities/{community_id}/reports")
async def get_community_reports(
    community_id: str,
    skip: int = 0,
    limit: int = 50,
    user_data: dict = Depends(require_user),
):
    """Get all open reports for a community (mod-only)."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    if not await community_manager.is_moderator(community.communityId, user_data["id"]):
        raise HTTPException(status_code=403, detail="Moderators only")
    return await report_manager.get_community_reports(community.communityId, skip, limit)


@router.post("/communities/{community_id}/reports/{report_id}/resolve")
async def resolve_report(
    community_id: str,
    report_id: str,
    user_data: dict = Depends(require_user),
):
    """Mark a report as resolved (mod-only)."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    if not await community_manager.is_moderator(community.communityId, user_data["id"]):
        raise HTTPException(status_code=403, detail="Moderators only")
    report = await report_manager.resolve_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


# ── Credential management (community mod) ────────────────────────────────────

ALLOWED_CREDENTIALS = ["Verified", "Career Counselor", "Professor", "Industry Expert", "Alumni"]


class CredentialBody(BaseModel):
    credentials: List[str]


@router.put("/communities/{community_id}/members/{user_id}/credentials")
async def set_member_credentials(
    community_id: str,
    user_id: str,
    body: CredentialBody,
    user_data: dict = Depends(require_user),
):
    """Assign verification credential badges to a community member (mod-only)."""
    community = await community_manager.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    if not await community_manager.is_moderator(community.communityId, user_data["id"]):
        raise HTTPException(status_code=403, detail="Moderators only")
    invalid = [c for c in body.credentials if c not in ALLOWED_CREDENTIALS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid credentials: {invalid}")
    from app.core.database import get_database
    db = get_database()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"credentials": body.credentials}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Credentials updated", "credentials": body.credentials}

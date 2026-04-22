from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel

from app.managers.activity import ActivityManager
from app.core.auth_utils import require_user, get_optional_user

router = APIRouter()
activity_manager = ActivityManager()


@router.get("/activity/trending")
async def get_trending(limit: int = 6):
    """Return top posts + videos + blogs by engagement score (views + likes)."""
    try:
        return await activity_manager.get_trending(limit)
    except Exception as e:
        print(f"get_trending error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch trending content")


class ViewPayload(BaseModel):
    type: str   # "post" | "video" | "blog"
    itemId: str
    title: str


@router.post("/activity/view")
async def record_view(payload: ViewPayload, user_data: dict = Depends(require_user)):
    """Record that the current user viewed an item. Stored in users.recently_viewed."""
    try:
        await activity_manager.record_view(
            user_id=user_data["id"],
            item_type=payload.type,
            item_id=payload.itemId,
            title=payload.title,
        )
        return {"ok": True}
    except Exception as e:
        print(f"record_view error: {e}")
        raise HTTPException(status_code=500, detail="Failed to record view")


@router.get("/activity/recent")
async def get_recent_views(user_data: dict = Depends(require_user)):
    """Return the current user's 20 most recently viewed items."""
    try:
        return await activity_manager.get_recent_views(user_data["id"])
    except Exception as e:
        print(f"get_recent_views error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent views")

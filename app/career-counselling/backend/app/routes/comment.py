from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any
from app.models.comment import Comment, CommentCreate, CommentResponse
from app.managers.comment import CommentManager
from app.managers.notification import NotificationManager
from app.core.auth_utils import get_current_user
from app.core.database import get_database
from datetime import datetime

router = APIRouter()

comment_manager = CommentManager()
notification_manager = NotificationManager()

@router.post("/comments", response_model=CommentResponse)
async def create_comment(comment_data: CommentCreate, user_data: dict = Depends(get_current_user)):
    # Create a new comment object with all required fields
    comment = Comment(
        content=comment_data.content,
        type=comment_data.type,
        page_id=comment_data.page_id,
        parent_id=comment_data.parent_id,  # Include parent_id for replies
        userID=user_data["email"],
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )
    result = await comment_manager.create_comment(comment)

    # Send reply notification if this is a reply to another comment
    if comment_data.parent_id:
        try:
            db = get_database()
            from bson import ObjectId
            parent_doc = await db.comments.find_one({"_id": ObjectId(comment_data.parent_id)})
            if parent_doc:
                # parent_comment stores author by email; look up their userId
                parent_author_email = parent_doc.get("userID", "")
                if parent_author_email:
                    parent_user = await db.users.find_one({"email": parent_author_email}, {"_id": 1})
                    if parent_user:
                        parent_author_id = str(parent_user["_id"])
                        post_id = comment_data.page_id if comment_data.type == "post" else ""
                        await notification_manager.create_reply_notification(
                            replier_id=user_data["id"],
                            parent_author_id=parent_author_id,
                            comment_id=str(result.commentId) if result.commentId else "",
                            post_id=post_id,
                        )
        except Exception as e:
            print(f"Reply notification error (non-fatal): {e}")

    return result

@router.get("/comments", response_model=Dict[str, Any])
async def list_comments(
    page_id: str,
    type: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of records per page"),
):
    skip = (page - 1) * limit
    return await comment_manager.get_comments(page_id=page_id, type=type, skip=skip, limit=limit)

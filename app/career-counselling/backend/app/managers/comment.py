from typing import List, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.models.comment import Comment, CommentResponse
from app.core.database import get_database


async def _get_comment_user(db, email: str) -> dict:
    """Fetch user name, avatar and userId directly from the db by email."""
    try:
        user = await db.users.find_one({"email": email})
        if user:
            fn = user.get("firstName") or ""
            ln = user.get("lastName") or ""
            return {
                "name": f"{fn} {ln}".strip() or "Unknown",
                "avatar": user.get("avatar") or "/default-avatar.png",
                "userId": str(user["_id"]),
            }
    except Exception:
        pass
    return {"name": "Unknown", "avatar": "/default-avatar.png", "userId": ""}


class CommentManager:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.comments

    async def create_comment(self, comment: Comment) -> CommentResponse:
        comment_dict = comment.model_dump()

        # Remove commentID if it's None
        if comment_dict.get("commentID") is None:
            comment_dict.pop("commentID", None)

        result = await self.collection.insert_one(comment_dict)
        comment_dict["commentID"] = str(result.inserted_id)

        # Get the user data to include in the response
        comment_dict['user'] = await _get_comment_user(self.db, comment.userID)

        comment_dict['replies'] = []  # Initialize with empty replies array
        return CommentResponse(**comment_dict)

    async def get_comments(self, page_id: str, type: str, skip: int = 0, limit: int = 10) -> Dict[str, Any]:
        # First get only parent comments (those with no parent_id)
        cursor = self.collection.find(
            {"page_id": page_id, "type": type, "parent_id": None})
        cursor.sort("createdAt", -1)  # Sort by most recent first
        cursor.skip(skip).limit(limit)

        comments = []
        comment_ids = []
        async for comment in cursor:
            comment["commentID"] = str(comment["_id"])
            comment_ids.append(comment["commentID"])

            # Get user by email
            comment['user'] = await _get_comment_user(self.db, comment['userID'])

            comment['replies'] = []  # Initialize with empty replies
            comments.append(comment)

        # Now get all replies to these comments
        if comment_ids:
            replies_cursor = self.collection.find(
                {"parent_id": {"$in": comment_ids}})
            # Sort by oldest to newest for replies
            replies_cursor.sort("createdAt", 1)

            # Create a dictionary for quick lookup of parent comments
            comments_dict = {comment["commentID"]                             : comment for comment in comments}

            async for reply in replies_cursor:
                reply["commentID"] = str(reply["_id"])

                # Get user for the reply
                reply['user'] = await _get_comment_user(self.db, reply['userID'])

                # Add the reply to its parent's replies array
                parent_id = reply.get("parent_id")
                if parent_id and parent_id in comments_dict:
                    comments_dict[parent_id]["replies"].append(reply)

        # Count total parent comments for pagination
        total_count = await self.collection.count_documents({"page_id": page_id, "type": type, "parent_id": None})

        # Convert to CommentResponse objects
        comment_responses = [CommentResponse(
            **comment) for comment in comments]

        return {
            "comments": comment_responses,
            "total": total_count
        }

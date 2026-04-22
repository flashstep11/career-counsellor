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
        # Load all comments for this page to build a nested tree
        cursor = self.collection.find({"page_id": page_id, "type": type})
        all_comments = []
        async for comment in cursor:
            comment["commentID"] = str(comment["_id"])
            comment["replies"] = []
            comment["user"] = await _get_comment_user(self.db, comment["userID"])
            all_comments.append(comment)

        # Build lookup map
        by_id = {c["commentID"]: c for c in all_comments}
        roots = []

        for comment in all_comments:
            parent_id = comment.get("parent_id")
            if parent_id and parent_id in by_id:
                by_id[parent_id]["replies"].append(comment)
            else:
                roots.append(comment)

        # Sort roots by most recent first
        roots.sort(key=lambda c: c.get("createdAt"), reverse=True)

        # Sort replies (oldest first) recursively
        def _sort_replies(node: Dict[str, Any]):
            replies = node.get("replies", [])
            replies.sort(key=lambda c: c.get("createdAt"))
            for child in replies:
                _sort_replies(child)

        for root in roots:
            _sort_replies(root)

        total_count = len(roots)
        paged_roots = roots[skip: skip + limit]

        comment_responses = [CommentResponse(**comment) for comment in paged_roots]
        return {"comments": comment_responses, "total": total_count}

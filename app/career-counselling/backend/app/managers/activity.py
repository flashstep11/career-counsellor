"""
ActivityManager — handles:
  • trending()        top posts + videos by (views + likes) score
  • record_view()     push an item into the user's recently_viewed array (max 20)
  • recent_views()    return that user's recently_viewed list enriched with DB titles
"""

from datetime import datetime
from typing import Optional, List
from bson import ObjectId

from app.core.database import get_database


class ActivityManager:
    def __init__(self):
        self.db = get_database()

    # ─── Trending ───────────────────────────────────────────────────────────

    async def get_trending(self, limit: int = 6) -> List[dict]:
        """
        Return a unified list of top posts and videos ordered by (views + likes).
        Each item has: id, type, title, excerpt/description, authorName, views, likes, url
        """
        results = []

        # -- top posts --------------------------------------------------------
        try:
            post_cursor = (
                self.db.posts
                .find({}, {"_id": 1, "title": 1, "content": 1, "authorId": 1,
                           "authorName": 1, "views": 1, "likes": 1, "communityName": 1})
                .sort([("views", -1), ("likes", -1)])
                .limit(limit)
            )
            async for doc in post_cursor:
                item_id = str(doc["_id"])
                author_name = doc.get("authorName") or await self._get_user_name(doc.get("authorId", ""))
                results.append({
                    "id": item_id,
                    "type": "post",
                    "title": doc.get("title", ""),
                    "excerpt": (doc.get("content") or "")[:120],
                    "authorName": author_name,
                    "views": doc.get("views", 0),
                    "likes": doc.get("likes", 0),
                    "url": f"/posts/{item_id}",
                    "score": doc.get("views", 0) + doc.get("likes", 0),
                })
        except Exception as e:
            print(f"activity.get_trending posts error: {e}")

        # -- top videos -------------------------------------------------------
        try:
            video_cursor = (
                self.db.videos
                .find({}, {"_id": 1, "title": 1, "description": 1, "userId": 1,
                           "views": 1, "likes": 1, "youtubeUrl": 1})
                .sort([("views", -1), ("likes", -1)])
                .limit(limit)
            )
            async for doc in video_cursor:
                item_id = str(doc["_id"])
                author_name = await self._get_user_name(doc.get("userId", ""))
                results.append({
                    "id": item_id,
                    "type": "video",
                    "title": doc.get("title", ""),
                    "excerpt": (doc.get("description") or "")[:120],
                    "authorName": author_name,
                    "views": doc.get("views", 0),
                    "likes": doc.get("likes", 0),
                    "url": f"/videos/{item_id}",
                    "score": doc.get("views", 0) + doc.get("likes", 0),
                })
        except Exception as e:
            print(f"activity.get_trending videos error: {e}")

        # -- top blogs --------------------------------------------------------
        try:
            blog_cursor = (
                self.db.blogs
                .find({}, {"_id": 1, "heading": 1, "body": 1, "userID": 1,
                           "views": 1, "likes": 1})
                .sort([("views", -1), ("likes", -1)])
                .limit(limit)
            )
            async for doc in blog_cursor:
                item_id = str(doc["_id"])
                author_name = await self._get_user_name(doc.get("userID", ""))
                results.append({
                    "id": item_id,
                    "type": "blog",
                    "title": doc.get("heading", ""),
                    "excerpt": (doc.get("body") or "")[:120],
                    "authorName": author_name,
                    "views": doc.get("views", 0),
                    "likes": doc.get("likes", 0),
                    "url": f"/blogs/{item_id}",
                    "score": doc.get("views", 0) + doc.get("likes", 0),
                })
        except Exception as e:
            print(f"activity.get_trending blogs error: {e}")

        # sort combined list by score, return top `limit`
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    # ─── Recently Viewed (per user) ─────────────────────────────────────────

    async def record_view(self, user_id: str, item_type: str, item_id: str, title: str) -> None:
        """
        Prepend an item to users.recently_viewed, keeping only the 20 most recent.
        Deduplicates by itemId so re-visiting doesn't create duplicates.
        """
        entry = {
            "type": item_type,
            "itemId": item_id,
            "title": title,
            "viewedAt": datetime.utcnow().isoformat(),
        }
        try:
            # Remove any existing entry for this itemId first (dedup)
            await self.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$pull": {"recently_viewed": {"itemId": item_id}}},
            )
            # Prepend + slice to max 20
            await self.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$push": {"recently_viewed": {"$each": [entry], "$position": 0, "$slice": 20}}},
            )
        except Exception as e:
            print(f"activity.record_view error: {e}")

    async def get_recent_views(self, user_id: str) -> List[dict]:
        """Return the user's recently_viewed array (already stored enriched)."""
        try:
            user = await self.db.users.find_one(
                {"_id": ObjectId(user_id)},
                {"recently_viewed": 1}
            )
            if not user:
                return []
            return user.get("recently_viewed") or []
        except Exception as e:
            print(f"activity.get_recent_views error: {e}")
            return []

    # ─── helpers ────────────────────────────────────────────────────────────

    async def _get_user_name(self, user_id: str) -> str:
        if not user_id:
            return "Unknown"
        try:
            user = await self.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                return f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or "Unknown"
        except Exception:
            pass
        return "Unknown"

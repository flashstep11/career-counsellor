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

        # Keep personal history bounded to avoid unbounded user documents.
        # Spec: 20-50. Using 50 for a bit more room.
        self._max_recent_items = 50

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
        """Record a view into the current user's personal recent-history queues."""
        viewed_at = datetime.utcnow().isoformat()

        legacy_entry = {
            "type": item_type,
            "itemId": item_id,
            "title": title,
            "viewedAt": viewed_at,
        }

        per_type_field = {
            "post": "recent_posts",
            "blog": "recent_blogs",
            "video": "recent_videos",
        }.get(item_type)

        per_type_entry = {
            "itemId": item_id,
            "title": title,
            "viewedAt": viewed_at,
        }
        try:
            # Update per-type queue (preferred)
            if per_type_field:
                await self.db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$pull": {per_type_field: {"itemId": item_id}}},
                )
                await self.db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$push": {per_type_field: {"$each": [per_type_entry], "$position": 0, "$slice": self._max_recent_items}}},
                )

            # Also maintain legacy unified list for backwards compatibility
            await self.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$pull": {"recently_viewed": {"itemId": item_id}}},
            )
            await self.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$push": {"recently_viewed": {"$each": [legacy_entry], "$position": 0, "$slice": self._max_recent_items}}},
            )
        except Exception as e:
            print(f"activity.record_view error: {e}")

    async def get_recent_views(self, user_id: str) -> List[dict]:
        """Return the user's recent views as a unified list.

        Prefers the per-type queues (recent_posts/recent_blogs/recent_videos) and
        falls back to the legacy recently_viewed if those aren't present.
        """
        try:
            user = await self.db.users.find_one(
                {"_id": ObjectId(user_id)},
                {"recent_posts": 1, "recent_blogs": 1, "recent_videos": 1, "recently_viewed": 1}
            )
            if not user:
                return []

            recent_posts = user.get("recent_posts") or []
            recent_blogs = user.get("recent_blogs") or []
            recent_videos = user.get("recent_videos") or []

            if recent_posts or recent_blogs or recent_videos:
                unified: List[dict] = []
                unified.extend([{**e, "type": "post"} for e in recent_posts])
                unified.extend([{**e, "type": "blog"} for e in recent_blogs])
                unified.extend([{**e, "type": "video"} for e in recent_videos])
                unified.sort(key=lambda x: x.get("viewedAt", ""), reverse=True)
                return unified

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

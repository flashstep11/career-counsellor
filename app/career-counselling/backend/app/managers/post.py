from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.post import Post, PostResponse
from app.core.database import get_database


class PostManager:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.posts

    # ── Create ────────────────────────────────────────────────────────────────

    async def create_community_post(
        self,
        community_id: str,
        author_id: str,
        title: str,
        content: str,
        tags: List[str] = [],
        media: List[dict] = [],
    ) -> PostResponse:
        now = datetime.utcnow()
        post_dict = {
            "communityId": community_id,
            "authorId": author_id,
            "title": title,
            "content": content,
            "tags": tags,
            "media": media,
            "likes": 0,
            "likedBy": [],
            "views": 0,
            "createdAt": now,
            "updatedAt": now,
        }

        result = await self.collection.insert_one(post_dict)
        post_dict["postId"] = str(result.inserted_id)

        # Enrich with author / community info
        await self._enrich(post_dict, author_id, community_id)
        return PostResponse(**post_dict)

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_post(self, post_id: str) -> Optional[PostResponse]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(post_id)})
            if not doc:
                return None
            doc["postId"] = str(doc["_id"])
            await self._enrich(doc, doc.get("authorId", ""), doc.get("communityId", ""))
            # Comment count
            doc["commentsCount"] = await self.db.comments.count_documents(
                {"page_id": doc["postId"], "type": "post"}
            )
            return PostResponse(**doc)
        except Exception as e:
            print(f"get_post error: {e}")
            return None

    async def get_posts_by_community(
        self, community_id: str, skip: int = 0, limit: int = 30
    ) -> List[PostResponse]:
        cursor = (
            self.collection.find({"communityId": community_id})
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )
        posts = []
        async for doc in cursor:
            doc["postId"] = str(doc["_id"])
            await self._enrich(doc, doc.get("authorId", ""), community_id)
            doc["commentsCount"] = await self.db.comments.count_documents(
                {"page_id": doc["postId"], "type": "post"}
            )
            try:
                posts.append(PostResponse(**doc))
            except Exception as e:
                print(f"PostResponse parse error: {e}")
        return posts

    async def get_all_posts(self, skip: int = 0, limit: int = 50) -> List[PostResponse]:
        """Kept for backward compat — returns newest posts globally."""
        cursor = self.collection.find().sort("createdAt", -1).skip(skip).limit(limit)
        posts = []
        async for doc in cursor:
            doc["postId"] = str(doc["_id"])
            await self._enrich(doc, doc.get("authorId", ""), doc.get("communityId", ""))
            doc["commentsCount"] = await self.db.comments.count_documents(
                {"page_id": doc["postId"], "type": "post"}
            )
            try:
                posts.append(PostResponse(**doc))
            except Exception as e:
                print(f"PostResponse parse error: {e}")
        return posts

    async def get_posts_by_authors(self, author_ids: List[str], skip: int = 0, limit: int = 30) -> List[PostResponse]:
        """Return posts authored by any of the given user IDs, newest first."""
        if not author_ids:
            return []
        cursor = (
            self.collection.find({"authorId": {"$in": author_ids}})
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )
        posts = []
        async for doc in cursor:
            doc["postId"] = str(doc["_id"])
            await self._enrich(doc, doc.get("authorId", ""), doc.get("communityId", ""))
            doc["commentsCount"] = await self.db.comments.count_documents(
                {"page_id": doc["postId"], "type": "post"}
            )
            try:
                posts.append(PostResponse(**doc))
            except Exception as e:
                print(f"PostResponse parse error: {e}")
        return posts

    async def get_feed_posts(self, user_id: str, skip: int = 0, limit: int = 30) -> List[PostResponse]:
        """Return posts from communities the user has joined, sorted with followed-expert posts first."""
        # Get community IDs the user has joined
        community_docs = self.db.communities.find(
            {"members": user_id}, {"_id": 1}
        )
        community_ids = [str(doc["_id"]) async for doc in community_docs]
        if not community_ids:
            # Fall back to c/general so new/unjoined users always see something
            general = await self.db.communities.find_one({"name": "general"}, {"_id": 1})
            if not general:
                return []
            community_ids = [str(general["_id"])]

        # Get IDs of experts this user follows (for ranking boost)
        user_doc = await self.db.users.find_one({"_id": ObjectId(user_id)}, {"following": 1})
        followed_ids = set(user_doc.get("following", [])) if user_doc else set()

        cursor = (
            self.collection.find({"communityId": {"$in": community_ids}})
            .sort("createdAt", -1)
            .limit(skip + limit)
        )
        raw_posts = []
        async for doc in cursor:
            raw_posts.append(doc)

        # Stable-sort: followed-expert posts first, then the rest
        raw_posts.sort(key=lambda d: 0 if d.get("authorId") in followed_ids else 1)

        raw_posts = raw_posts[skip:skip + limit]

        posts = []
        for doc in raw_posts:
            doc["postId"] = str(doc["_id"])
            await self._enrich(doc, doc.get("authorId", ""), doc.get("communityId", ""))
            doc["commentsCount"] = await self.db.comments.count_documents(
                {"page_id": doc["postId"], "type": "post"}
            )
            try:
                posts.append(PostResponse(**doc))
            except Exception as e:
                print(f"PostResponse parse error: {e}")
        return posts

    # ── Like ──────────────────────────────────────────────────────────────────

    async def like_post(self, post_id: str, user_id: str) -> Optional[PostResponse]:
        try:
            doc = await self.collection.find_one({"_id": ObjectId(post_id)})
            if not doc:
                return None

            already_liked = user_id in doc.get("likedBy", [])
            if already_liked:
                update = {
                    "$pull": {"likedBy": user_id},
                    "$inc": {"likes": -1},
                    "$set": {"updatedAt": datetime.utcnow()},
                }
            else:
                update = {
                    "$addToSet": {"likedBy": user_id},
                    "$inc": {"likes": 1},
                    "$set": {"updatedAt": datetime.utcnow()},
                }

            result = await self.collection.update_one({"_id": ObjectId(post_id)}, update)
            if result.modified_count:
                # Send POST_LIKED notification to author (only on new like, not unlike)
                if not already_liked:
                    author_id = doc.get("authorId", "")
                    if author_id and author_id != user_id:
                        try:
                            from app.managers.notification import NotificationManager
                            from app.models.notification import Notification, NotificationType
                            nm = NotificationManager()
                            # increment author's reputation
                            await self.db.users.update_one(
                                {"_id": ObjectId(author_id)},
                                {"$inc": {"reputation": 1}},
                            )
                            liker_doc = await self.db.users.find_one(
                                {"_id": ObjectId(user_id)}, {"firstName": 1, "lastName": 1}
                            )
                            liker_name = f"{liker_doc.get('firstName','')} {liker_doc.get('lastName','')}".strip() if liker_doc else "Someone"
                            notif = Notification(
                                targetUserId=author_id,
                                sourceUserId=user_id,
                                type=NotificationType.POST_LIKED,
                                content=f"{liker_name} liked your post",
                                referenceId=post_id,
                                referenceType="post",
                                read=False,
                                createdAt=datetime.utcnow(),
                                updatedAt=datetime.utcnow(),
                            )
                            await nm.create_notification(notif)
                        except Exception as notif_err:
                            print(f"like notification error (non-fatal): {notif_err}")
                return await self.get_post(post_id)
            return None
        except Exception as e:
            print(f"like_post error: {e}")
            return None

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete_post(self, post_id: str, author_id: str, community_id: Optional[str] = None) -> bool:
        """Author or community moderator can delete a post."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(post_id)})
            if not doc:
                return False
            # allow if author OR if caller is a community moderator
            is_author = doc.get("authorId") == author_id
            if not is_author:
                from app.managers.community import CommunityManager
                cid = community_id or doc.get("communityId", "")
                if cid:
                    cm = CommunityManager()
                    if not await cm.is_moderator(cid, author_id):
                        return False
                else:
                    return False
            result = await self.collection.delete_one({"_id": ObjectId(post_id)})
            return result.deleted_count > 0
        except Exception as e:
            print(f"delete_post error: {e}")
            return False

    async def edit_post(self, post_id: str, author_id: str, updates: dict) -> Optional[PostResponse]:
        """Edit a post's title, content, or tags. Only the author can edit."""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(post_id)})
            if not doc or doc.get("authorId") != author_id:
                return None
            updates["updatedAt"] = datetime.utcnow()
            await self.collection.update_one(
                {"_id": ObjectId(post_id)},
                {"$set": updates},
            )
            return await self.get_post(post_id)
        except Exception as e:
            print(f"edit_post error: {e}")
            return None

    # ── View ──────────────────────────────────────────────────────────────────

    async def increment_view(self, post_id: str) -> bool:
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(post_id)},
                {"$inc": {"views": 1}},
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"increment_view error: {e}")
            return False

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _enrich(self, doc: dict, author_id: str, community_id: str) -> None:
        """Attach author name, credentials, pinned status, and community name to a post dict in-place."""
        # Author info
        try:
            if author_id:
                user = await self.db.users.find_one({"_id": ObjectId(author_id)})
                if user:
                    fn = user.get("firstName", "")
                    ln = user.get("lastName", "")
                    doc["authorName"] = f"{fn} {ln}".strip() or "Anonymous"
                    doc["authorInitials"] = (
                        (fn[0] if fn else "") + (ln[0] if ln else "")
                    ).upper() or "U"
                    doc["authorCredentials"] = user.get("credentials", [])
                else:
                    doc["authorName"] = "Anonymous"
                    doc["authorInitials"] = "U"
                    doc["authorCredentials"] = []
            else:
                doc["authorName"] = "Anonymous"
                doc["authorInitials"] = "U"
                doc["authorCredentials"] = []
        except Exception:
            doc["authorName"] = "Anonymous"
            doc["authorInitials"] = "U"
            doc["authorCredentials"] = []

        # Community info + pinned status
        try:
            if community_id:
                comm = await self.db.communities.find_one({"_id": ObjectId(community_id)})
                if comm:
                    doc["communityName"] = comm.get("name", "")
                    doc["communityDisplayName"] = comm.get("displayName", "")
                    post_id = doc.get("postId", "")
                    doc["isPinned"] = post_id in comm.get("pinnedPosts", []) if post_id else False
                else:
                    doc["communityName"] = ""
                    doc["communityDisplayName"] = ""
                    doc["isPinned"] = False
        except Exception:
            doc["communityName"] = ""
            doc["communityDisplayName"] = ""
            doc["isPinned"] = False

        # Top comment (most recent parent comment)
        try:
            post_id = doc.get("postId")
            if post_id:
                top_comment_doc = await self.db.comments.find_one(
                    {"page_id": post_id, "type": "post", "parent_id": None},
                    sort=[("createdAt", -1)],
                )
                if top_comment_doc:
                    commenter_email = top_comment_doc.get("userID", "")
                    commenter = await self.db.users.find_one({"email": commenter_email}) if commenter_email else None
                    if commenter:
                        fn = commenter.get("firstName") or ""
                        ln = commenter.get("lastName") or ""
                        c_name = f"{fn} {ln}".strip() or "Anonymous"
                        c_initials = ((fn[0] if fn else "") + (ln[0] if ln else "")).upper() or "U"
                    else:
                        c_name = "Anonymous"
                        c_initials = "U"
                    doc["topComment"] = {
                        "content": top_comment_doc.get("content", ""),
                        "authorName": c_name,
                        "authorInitials": c_initials,
                    }
                else:
                    doc["topComment"] = None
        except Exception:
            doc["topComment"] = None

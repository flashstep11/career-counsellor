import asyncio
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from bson import ObjectId

from app.models.notification import (
    Notification, NotificationResponse, NotificationUpdate, NotificationType,
    NotificationBatch, NotificationBatchResponse, BATCH_WINDOW_MINUTES,
)
from app.core.database import get_database
from app.managers.user import UserManager
from app.core.socket_manager import sio


class NotificationManager:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.notifications
        self.user_manager = UserManager()

    async def create_notification(self, notification: Notification) -> NotificationResponse:
        """
        Create a new notification.

        Args:
            notification (Notification): Notification data

        Returns:
            NotificationResponse: Created notification with response details
        """
        notification_dict = notification.model_dump()

        # Set timestamps
        current_time = datetime.utcnow()
        notification_dict["createdAt"] = current_time
        notification_dict["updatedAt"] = current_time

        # Insert the notification
        result = await self.collection.insert_one(notification_dict)
        notification_dict["notificationId"] = str(result.inserted_id)
        # Ensure _id is also a string
        notification_dict["_id"] = str(result.inserted_id)

        # Get source user details
        source_user = await self.user_manager.get_user(notification.sourceUserId)
        if source_user:
            notification_dict["sourceUserDetails"] = {
                "name": f"{source_user.firstName} {source_user.lastName}".strip(),
                "avatar": source_user.avatar if hasattr(source_user, "avatar") else "/default-avatar.png"
            }

        response = NotificationResponse(**notification_dict)

        # Push to the target user's socket room in real time
        try:
            await sio.emit(
                "notification",
                response.model_dump(mode="json"),
                room=notification.targetUserId,
            )
        except Exception as emit_err:
            print(f"Socket emit error (non-fatal): {emit_err}")

        return response

    async def get_notification(self, notification_id: str) -> Optional[NotificationResponse]:
        """
        Get a notification by ID.

        Args:
            notification_id (str): ID of the notification

        Returns:
            Optional[NotificationResponse]: Notification if found, None otherwise
        """
        try:
            notification = await self.collection.find_one({"_id": ObjectId(notification_id)})
            if notification:
                notification["notificationId"] = str(notification["_id"])
                # Convert _id to string
                notification["_id"] = str(notification["_id"])

                # Get source user details
                source_user = await self.user_manager.get_user(notification['sourceUserId'])
                if source_user:
                    notification["sourceUserDetails"] = {
                        "name": f"{source_user.firstName} {source_user.lastName}".strip(),
                        "avatar": source_user.avatar if hasattr(source_user, "avatar") else "/default-avatar.png"
                    }

                return NotificationResponse(**notification)
            return None
        except Exception as e:
            print(f"Error retrieving notification: {e}")
            return None

    async def get_user_notifications(
        self, user_id: str, skip: int = 0, limit: int = 10, unread_only: bool = False
    ) -> List[NotificationResponse]:
        """
        Get notifications for a specific user.

        Args:
            user_id (str): ID of the user
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            unread_only (bool): If True, return only unread notifications

        Returns:
            List[NotificationResponse]: List of notifications
        """
        query = {"targetUserId": user_id}

        if unread_only:
            query["read"] = False

        cursor = self.collection.find(query)
        cursor.sort("createdAt", -1)  # Sort by creation time, newest first
        cursor.skip(skip).limit(limit)

        # Collect all docs first so we can batch-fetch source users in one query
        raw_docs = []
        async for notification in cursor:
            notification["notificationId"] = str(notification["_id"])
            notification["_id"] = str(notification["_id"])
            raw_docs.append(notification)

        # Batch-fetch all unique source users — 1 query instead of N
        user_ids = list({doc["sourceUserId"] for doc in raw_docs if doc.get("sourceUserId")})
        user_map: dict = {}
        if user_ids:
            try:
                user_cursor = self.db.users.find(
                    {"_id": {"$in": [ObjectId(uid) for uid in user_ids]}},
                    {"_id": 1, "firstName": 1, "lastName": 1, "avatar": 1},
                )
                async for u in user_cursor:
                    user_map[str(u["_id"])] = {
                        "name": f"{u.get('firstName', '')} {u.get('lastName', '')}".strip(),
                        "avatar": u.get("avatar") or "/default-avatar.png",
                    }
            except Exception as e:
                print(f"Batch user fetch error (non-fatal): {e}")

        notifications = []
        for doc in raw_docs:
            if doc.get("sourceUserId") in user_map:
                doc["sourceUserDetails"] = user_map[doc["sourceUserId"]]
            notifications.append(NotificationResponse(**doc))

        return notifications

    async def update_notification(
        self, notification_id: str, update_data: NotificationUpdate
    ) -> Optional[NotificationResponse]:
        """
        Update a notification.

        Args:
            notification_id (str): ID of the notification to update
            update_data (NotificationUpdate): Data to update

        Returns:
            Optional[NotificationResponse]: Updated notification if successful, None otherwise
        """
        try:
            update_dict = update_data.model_dump(exclude_none=True)
            update_dict["updatedAt"] = datetime.utcnow()

            # Update the notification
            result = await self.collection.update_one(
                {"_id": ObjectId(notification_id)},
                {"$set": update_dict}
            )

            if result.modified_count or result.matched_count:
                return await self.get_notification(notification_id)
            return None
        except Exception as e:
            print(f"Error updating notification: {e}")
            return None

    async def mark_as_read(self, notification_id: str) -> Optional[NotificationResponse]:
        """
        Mark a notification as read.

        Args:
            notification_id (str): ID of the notification

        Returns:
            Optional[NotificationResponse]: Updated notification if successful, None otherwise
        """
        update_data = NotificationUpdate(read=True)
        return await self.update_notification(notification_id, update_data)

    async def mark_all_as_read(self, user_id: str) -> int:
        """
        Mark all notifications for a user as read.

        Args:
            user_id (str): ID of the user

        Returns:
            int: Number of notifications updated
        """
        try:
            result = await self.collection.update_many(
                {"targetUserId": user_id, "read": False},
                {"$set": {"read": True, "updatedAt": datetime.utcnow()}}
            )
            return result.modified_count
        except Exception as e:
            print(f"Error marking notifications as read: {e}")
            return 0

    # ------------------------------------------------------------------
    # Batched fan-out helpers
    # ------------------------------------------------------------------

    async def upsert_follower_batch(
        self,
        target_user_id: str,
        actor_id: str,
        actor_name: str,
        actor_expert_id: Optional[str],
        event_type: NotificationType,
        entity_id: str,
        reference_type: str,
    ) -> Tuple[NotificationBatchResponse, bool]:
        """
        Upsert a batch notification for one follower.
        Returns (batch, is_new) where is_new=True means a fresh batch was created
        (frontend should show a toast), False means an existing batch was updated
        (frontend should silently update the count).
        """
        now = datetime.utcnow()
        batch_key = f"{actor_id}:{event_type.value}"

        # Look for an open batch within the current window
        existing = await self.db.notification_batches.find_one({
            "targetUserId": target_user_id,
            "batchKey": batch_key,
            "isOpen": True,
            "windowExpiresAt": {"$gt": now},
        })

        if existing:
            # Append entity_id (avoid duplicates) and bump updatedAt
            await self.db.notification_batches.update_one(
                {"_id": existing["_id"]},
                {
                    "$addToSet": {"entityIds": entity_id},
                    "$set": {"updatedAt": now},
                },
            )
            existing["entityIds"] = list(set(existing["entityIds"] + [entity_id]))
            existing["updatedAt"] = now
            existing["batchId"] = str(existing["_id"])
            existing["_id"] = str(existing["_id"])
            return NotificationBatchResponse(**existing), False
        else:
            # Create a new batch for this window
            window_expires = now + timedelta(minutes=BATCH_WINDOW_MINUTES)
            doc = {
                "targetUserId": target_user_id,
                "actorId": actor_id,
                "actorName": actor_name,
                "actorExpertId": actor_expert_id,
                "eventType": event_type.value,
                "entityIds": [entity_id],
                "referenceType": reference_type,
                "batchKey": batch_key,
                "isRead": False,
                "isOpen": True,
                "windowExpiresAt": window_expires,
                "createdAt": now,
                "updatedAt": now,
            }
            result = await self.db.notification_batches.insert_one(doc)
            doc["batchId"] = str(result.inserted_id)
            doc["_id"] = str(result.inserted_id)
            return NotificationBatchResponse(**doc), True

    async def _fan_out_batch(
        self,
        expert_user_id: str,
        entity_id: str,
        event_type: NotificationType,
        reference_type: str,
    ) -> int:
        """Generic parallel fan-out for batched follower notifications."""
        try:
            expert = await self.user_manager.get_user(expert_user_id)
            if not expert or not expert.followers:
                return 0
            expert_id = expert.expertId if hasattr(expert, "expertId") else None
            actor_name = f"{expert.firstName} {expert.lastName}"

            tasks = [
                self.upsert_follower_batch(
                    target_user_id=follower_id,
                    actor_id=expert_user_id,
                    actor_name=actor_name,
                    actor_expert_id=expert_id,
                    event_type=event_type,
                    entity_id=entity_id,
                    reference_type=reference_type,
                )
                for follower_id in expert.followers
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, Exception):
                    print(f"Batch upsert error (non-fatal): {result}")
                    continue
                batch, is_new = result
                event_name = "notification_batch_new" if is_new else "notification_batch_updated"
                try:
                    await sio.emit(
                        event_name,
                        batch.model_dump(mode="json"),
                        room=batch.targetUserId,
                    )
                except Exception as emit_err:
                    print(f"Socket emit error (non-fatal): {emit_err}")

            return len(expert.followers)
        except Exception as e:
            print(f"Fan-out error: {e}")
            return 0

    async def create_video_notification_for_followers(
        self, expert_user_id: str, video_id: str, video_title: str
    ) -> int:
        """Batch NEW_VIDEO notifications for all followers."""
        return await self._fan_out_batch(
            expert_user_id=expert_user_id,
            entity_id=video_id,
            event_type=NotificationType.NEW_VIDEO,
            reference_type="video",
        )

    async def create_blog_notification_for_followers(
        self, expert_user_id: str, blog_id: str, blog_heading: str
    ) -> int:
        """Batch NEW_BLOG notifications for all followers."""
        return await self._fan_out_batch(
            expert_user_id=expert_user_id,
            entity_id=blog_id,
            event_type=NotificationType.NEW_BLOG,
            reference_type="blog",
        )

    async def create_community_post_notification_for_members(
        self,
        expert_user_id: str,
        post_id: str,
        member_ids: List[str],
    ) -> int:
        """Batch NEW_POST notifications for all community members when an expert posts."""
        try:
            expert = await self.user_manager.get_user(expert_user_id)
            if not expert:
                return 0
            expert_profile_id = expert.expertId if hasattr(expert, "expertId") else None
            actor_name = f"{expert.firstName} {expert.lastName}"

            targets = [m for m in member_ids if m != expert_user_id]
            if not targets:
                return 0

            tasks = [
                self.upsert_follower_batch(
                    target_user_id=member_id,
                    actor_id=expert_user_id,
                    actor_name=actor_name,
                    actor_expert_id=expert_profile_id,
                    event_type=NotificationType.NEW_POST,
                    entity_id=post_id,
                    reference_type="post",
                )
                for member_id in targets
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            for result in results:
                if isinstance(result, Exception):
                    print(f"Community post batch upsert error (non-fatal): {result}")
                    continue
                batch, is_new = result
                event_name = "notification_batch_new" if is_new else "notification_batch_updated"
                try:
                    await sio.emit(
                        event_name,
                        batch.model_dump(mode="json"),
                        room=batch.targetUserId,
                    )
                except Exception as emit_err:
                    print(f"Socket emit error (non-fatal): {emit_err}")

            return len(targets)
        except Exception as e:
            print(f"Community post fan-out error: {e}")
            return 0

    # ------------------------------------------------------------------
    # Batch CRUD helpers (used by routes)
    # ------------------------------------------------------------------

    async def get_user_batches(
        self, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[NotificationBatchResponse]:
        """Return all batches for a user (lazily closes expired ones)."""
        now = datetime.utcnow()
        # Lazily mark expired-open batches as closed
        await self.db.notification_batches.update_many(
            {"targetUserId": user_id, "isOpen": True, "windowExpiresAt": {"$lte": now}},
            {"$set": {"isOpen": False}},
        )
        cursor = (
            self.db.notification_batches
            .find({"targetUserId": user_id})
            .sort("updatedAt", -1)
            .skip(skip)
            .limit(limit)
        )
        batches = []
        async for doc in cursor:
            doc["batchId"] = str(doc["_id"])
            doc["_id"] = str(doc["_id"])
            batches.append(NotificationBatchResponse(**doc))
        return batches

    async def mark_batch_as_read(self, batch_id: str) -> Optional[NotificationBatchResponse]:
        try:
            await self.db.notification_batches.update_one(
                {"_id": ObjectId(batch_id)},
                {"$set": {"isRead": True}},
            )
            doc = await self.db.notification_batches.find_one({"_id": ObjectId(batch_id)})
            if doc:
                doc["batchId"] = str(doc["_id"])
                doc["_id"] = str(doc["_id"])
                return NotificationBatchResponse(**doc)
            return None
        except Exception as e:
            print(f"Error marking batch as read: {e}")
            return None

    async def mark_all_batches_as_read(self, user_id: str) -> int:
        try:
            result = await self.db.notification_batches.update_many(
                {"targetUserId": user_id, "isRead": False},
                {"$set": {"isRead": True}},
            )
            return result.modified_count
        except Exception as e:
            print(f"Error marking all batches as read: {e}")
            return 0

    async def delete_notification(self, notification_id: str) -> bool:
        """
        Delete a notification.

        Args:
            notification_id (str): ID of the notification to delete

        Returns:
            bool: True if deleted successfully, False otherwise
        """
        try:
            result = await self.collection.delete_one({"_id": ObjectId(notification_id)})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting notification: {e}")
            return False

    # ------------------------------------------------------------------
    # Community / social notification helpers
    # ------------------------------------------------------------------

    async def create_reply_notification(
        self,
        replier_id: str,
        parent_author_id: str,
        comment_id: str,
        post_id: str,
    ) -> None:
        """Notify the author of a comment that someone replied to them."""
        if replier_id == parent_author_id:
            return
        try:
            replier = await self.user_manager.get_user(replier_id)
            name = f"{replier.firstName} {replier.lastName}".strip() if replier else "Someone"
            notif = Notification(
                targetUserId=parent_author_id,
                sourceUserId=replier_id,
                type=NotificationType.COMMENT_REPLY,
                content=f"{name} replied to your comment",
                referenceId=post_id,
                referenceType="post",
                read=False,
                createdAt=datetime.utcnow(),
                updatedAt=datetime.utcnow(),
            )
            await self.create_notification(notif)
        except Exception as e:
            print(f"create_reply_notification error (non-fatal): {e}")

    async def create_community_post_for_all_members(
        self,
        poster_id: str,
        post_id: str,
        community_id: str,
        community_display_name: str,
    ) -> int:
        """Notify all community members (except poster) about a new post."""
        try:
            from app.core.database import get_database
            db = get_database()
            comm_doc = await db.communities.find_one({"_id": ObjectId(community_id)}, {"members": 1})
            if not comm_doc:
                return 0
            members = [m for m in comm_doc.get("members", []) if m != poster_id]
            if not members:
                return 0
            poster = await self.user_manager.get_user(poster_id)
            name = f"{poster.firstName} {poster.lastName}".strip() if poster else "Someone"
            now = datetime.utcnow()
            notifs = [
                {
                    "targetUserId": m,
                    "sourceUserId": poster_id,
                    "type": NotificationType.COMMUNITY_POST.value,
                    "content": f"{name} posted in {community_display_name}",
                    "referenceId": post_id,
                    "referenceType": "post",
                    "read": False,
                    "createdAt": now,
                    "updatedAt": now,
                }
                for m in members
            ]
            if notifs:
                await self.collection.insert_many(notifs)
            return len(notifs)
        except Exception as e:
            print(f"create_community_post_for_all_members error (non-fatal): {e}")
            return 0

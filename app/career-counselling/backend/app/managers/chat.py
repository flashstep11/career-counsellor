from datetime import datetime
from typing import Dict, List, Optional

from bson import ObjectId

from app.core.database import get_database
from app.managers.connection import ConnectionManager
from app.models.chat import (
    ChatConversationResponse,
    ChatMessageResponse,
    ChatUserSummary,
)


class ChatManager:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.chat_messages
        self.connection_manager = ConnectionManager()

    @staticmethod
    def conversation_key(user_a: str, user_b: str) -> str:
        return ":".join(sorted([str(user_a), str(user_b)]))

    async def _ensure_connected(self, user_a: str, user_b: str) -> None:
        if user_a == user_b:
            raise ValueError("self_chat")
        connected = await self.connection_manager.are_connected(user_a, user_b)
        if not connected:
            raise ValueError("not_connected")

    @staticmethod
    def _format_message(doc: dict) -> ChatMessageResponse:
        doc["_id"] = str(doc["_id"])
        doc["messageId"] = doc["_id"]
        return ChatMessageResponse(**doc)

    async def create_message(
        self,
        sender_id: str,
        recipient_id: str,
        content: str,
    ) -> ChatMessageResponse:
        content = content.strip()
        if not content:
            raise ValueError("empty_message")
        if len(content) > 2000:
            raise ValueError("message_too_long")

        await self._ensure_connected(sender_id, recipient_id)

        now = datetime.utcnow()
        doc = {
            "senderId": sender_id,
            "recipientId": recipient_id,
            "content": content,
            "conversationKey": self.conversation_key(sender_id, recipient_id),
            "participants": [sender_id, recipient_id],
            "readBy": [sender_id],
            "createdAt": now,
            "updatedAt": now,
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return self._format_message(doc)

    async def get_messages(
        self,
        current_user_id: str,
        other_user_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ChatMessageResponse]:
        await self._ensure_connected(current_user_id, other_user_id)

        cursor = (
            self.collection.find(
                {"conversationKey": self.conversation_key(current_user_id, other_user_id)}
            )
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )

        docs = []
        async for doc in cursor:
            docs.append(doc)

        docs.reverse()
        return [self._format_message(doc) for doc in docs]

    async def mark_conversation_read(self, current_user_id: str, other_user_id: str) -> int:
        await self._ensure_connected(current_user_id, other_user_id)
        result = await self.collection.update_many(
            {
                "conversationKey": self.conversation_key(current_user_id, other_user_id),
                "recipientId": current_user_id,
                "readBy": {"$ne": current_user_id},
            },
            {
                "$addToSet": {"readBy": current_user_id},
                "$set": {"updatedAt": datetime.utcnow()},
            },
        )
        return result.modified_count

    async def _get_user_summaries(self, user_ids: List[str]) -> Dict[str, ChatUserSummary]:
        object_ids = []
        for uid in user_ids:
            try:
                object_ids.append(ObjectId(uid))
            except Exception:
                continue

        summaries: Dict[str, ChatUserSummary] = {}
        if object_ids:
            cursor = self.db.users.find(
                {"_id": {"$in": object_ids}},
                {
                    "_id": 1,
                    "firstName": 1,
                    "lastName": 1,
                    "profile_picture_url": 1,
                    "profilePicture": 1,
                    "isExpert": 1,
                    "type": 1,
                },
            )
            async for user in cursor:
                uid = str(user["_id"])
                summaries[uid] = ChatUserSummary(
                    userId=uid,
                    firstName=user.get("firstName"),
                    lastName=user.get("lastName"),
                    profilePicture=user.get("profile_picture_url") or user.get("profilePicture"),
                    isExpert=bool(user.get("isExpert", False)),
                    type=user.get("type"),
                )

        for uid in user_ids:
            summaries.setdefault(uid, ChatUserSummary(userId=uid))

        return summaries

    async def list_conversations(self, current_user_id: str) -> List[ChatConversationResponse]:
        connected_ids: List[str] = []
        connection_dates: Dict[str, datetime] = {}
        cursor = self.db.connections.find(
            {
                "$or": [{"requester_id": current_user_id}, {"target_id": current_user_id}],
                "status": "accepted",
            },
            {"requester_id": 1, "target_id": 1, "updatedAt": 1, "createdAt": 1},
        ).sort("updatedAt", -1)
        async for connection in cursor:
            other_id = (
                connection["target_id"]
                if connection["requester_id"] == current_user_id
                else connection["requester_id"]
            )
            connected_ids.append(other_id)
            connection_dates[other_id] = (
                connection.get("updatedAt")
                or connection.get("createdAt")
                or datetime.utcnow()
            )

        if not connected_ids:
            return []

        user_summaries = await self._get_user_summaries(connected_ids)
        conversations: List[ChatConversationResponse] = []
        now = datetime.utcnow()

        for other_id in connected_ids:
            key = self.conversation_key(current_user_id, other_id)
            last_doc = await self.collection.find_one(
                {"conversationKey": key},
                sort=[("createdAt", -1)],
            )
            unread_count = await self.collection.count_documents(
                {
                    "conversationKey": key,
                    "recipientId": current_user_id,
                    "readBy": {"$ne": current_user_id},
                }
            )

            last_message: Optional[ChatMessageResponse] = None
            updated_at = connection_dates.get(other_id, now)
            if last_doc:
                updated_at = last_doc.get("createdAt") or last_doc.get("updatedAt") or now
                last_message = self._format_message(last_doc)

            conversations.append(
                ChatConversationResponse(
                    conversationId=key,
                    otherUser=user_summaries[other_id],
                    lastMessage=last_message,
                    unreadCount=unread_count,
                    updatedAt=updated_at,
                )
            )

        conversations.sort(key=lambda convo: convo.updatedAt, reverse=True)
        return conversations

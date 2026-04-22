from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.models.connection import Connection, ConnectionResponse
from app.models.notification import Notification, NotificationType
from app.core.database import get_database


class ConnectionManager:
    def __init__(self):
        self.db = get_database()
        self.col = self.db.connections

    async def send_request(self, requester_id: str, target_id: str) -> ConnectionResponse:
        """Send a connection request. Raises ValueError on duplicates or self-connection."""
        if requester_id == target_id:
            raise ValueError("self_connection")

        existing = await self.col.find_one({
            "requester_id": {"$in": [requester_id, target_id]},
            "target_id": {"$in": [requester_id, target_id]},
        })
        if existing:
            raise ValueError("duplicate")

        now = datetime.utcnow()
        doc = {
            "requester_id": requester_id,
            "target_id": target_id,
            "relationship_type": "connect",
            "status": "pending",
            "createdAt": now,
            "updatedAt": now,
        }
        result = await self.col.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        doc["connectionId"] = doc["_id"]
        return ConnectionResponse(**doc)

    async def respond(self, connection_id: str, actor_id: str, accept: bool) -> Optional[ConnectionResponse]:
        """Accept or decline a pending request. Only the target may respond."""
        try:
            conn = await self.col.find_one({"_id": ObjectId(connection_id)})
        except Exception:
            return None
        if not conn or conn["target_id"] != actor_id or conn["status"] != "pending":
            return None

        new_status = "accepted" if accept else "declined"
        now = datetime.utcnow()
        await self.col.update_one(
            {"_id": ObjectId(connection_id)},
            {"$set": {"status": new_status, "updatedAt": now}},
        )
        conn["status"] = new_status
        conn["updatedAt"] = now
        conn["_id"] = str(conn["_id"])
        conn["connectionId"] = conn["_id"]
        return ConnectionResponse(**conn)

    async def get_connections(self, user_id: str, status: str = "accepted") -> List[ConnectionResponse]:
        """Return connections for a user filtered by status."""
        cursor = self.col.find({
            "$or": [{"requester_id": user_id}, {"target_id": user_id}],
            "status": status,
        })
        out = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            doc["connectionId"] = doc["_id"]
            out.append(ConnectionResponse(**doc))
        return out

    async def get_pending_received(self, user_id: str) -> List[ConnectionResponse]:
        """Return pending requests where this user is the target."""
        cursor = self.col.find({"target_id": user_id, "status": "pending"})
        out = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            doc["connectionId"] = doc["_id"]
            out.append(ConnectionResponse(**doc))
        return out

    async def get_status(self, user_id: str, other_id: str) -> Optional[str]:
        """Return relationship status between two users, or None if none exists."""
        doc = await self.col.find_one({
            "requester_id": {"$in": [user_id, other_id]},
            "target_id": {"$in": [user_id, other_id]},
        })
        return doc["status"] if doc else None

    async def are_connected(self, user_a: str, user_b: str) -> bool:
        doc = await self.col.find_one({
            "requester_id": {"$in": [user_a, user_b]},
            "target_id": {"$in": [user_a, user_b]},
            "status": "accepted",
        })
        return doc is not None

    async def remove_connection(self, user_id: str, other_id: str) -> bool:
        result = await self.col.delete_one({
            "requester_id": {"$in": [user_id, other_id]},
            "target_id": {"$in": [user_id, other_id]},
            "status": "accepted",
        })
        return result.deleted_count > 0

    async def get_connected_user_ids(self, user_id: str) -> set:
        """Return set of user IDs that are accepted connections of user_id."""
        ids = set()
        async for doc in self.col.find(
            {"$or": [{"requester_id": user_id}, {"target_id": user_id}], "status": "accepted"},
            {"requester_id": 1, "target_id": 1},
        ):
            other = doc["target_id"] if doc["requester_id"] == user_id else doc["requester_id"]
            ids.add(other)
        return ids

    async def get_mutual_connections(self, user_id_a: str, user_id_b: str) -> List[str]:
        """Return list of user IDs that are accepted connections of BOTH users."""
        ids_a = await self.get_connected_user_ids(user_id_a)
        ids_b = await self.get_connected_user_ids(user_id_b)
        return list(ids_a & ids_b)

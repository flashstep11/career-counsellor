from typing import Optional, Literal
from pydantic import BaseModel
from app.models.base import DBModelMixin


class ConnectionBase(BaseModel):
    requester_id: str
    target_id: str
    relationship_type: Literal["connect"] = "connect"
    status: Literal["pending", "accepted", "declined"] = "pending"


class Connection(ConnectionBase, DBModelMixin):
    pass


class ConnectionResponse(Connection):
    connectionId: str


class ConnectionRequest(BaseModel):
    target_id: str

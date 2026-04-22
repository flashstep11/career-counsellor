from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.base import DBModelMixin


class ChatMessageBase(BaseModel):
    senderId: str
    recipientId: str
    content: str = Field(min_length=1, max_length=2000)
    conversationKey: str
    participants: List[str]
    readBy: List[str] = Field(default_factory=list)


class ChatMessage(ChatMessageBase, DBModelMixin):
    pass


class ChatMessageCreate(BaseModel):
    recipientId: str
    content: str = Field(min_length=1, max_length=2000)


class ChatMessageResponse(ChatMessage):
    messageId: str


class ChatUserSummary(BaseModel):
    userId: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    profilePicture: Optional[str] = None
    isExpert: bool = False
    type: Optional[str] = None


class ChatConversationResponse(BaseModel):
    conversationId: str
    otherUser: ChatUserSummary
    lastMessage: Optional[ChatMessageResponse] = None
    unreadCount: int = 0
    updatedAt: datetime

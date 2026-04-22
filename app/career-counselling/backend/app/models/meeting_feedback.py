from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.base import DBModelMixin


class MeetingFeedback(DBModelMixin):
    meetingId: str
    reviewerId: str  # User who is leaving the feedback (always the student)
    revieweeId: str  # User who is receiving the feedback (usually the expert)
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    isAnonymous: bool = False
    createdAt: datetime = datetime.utcnow()
    updatedAt: datetime = datetime.utcnow()

    @classmethod
    async def find(cls, query):
        from app.core.database import get_database
        db = get_database()
        return await db.meeting_feedbacks.find(query)

    @classmethod
    async def find_one(cls, query):
        from app.core.database import get_database
        db = get_database()
        return await db.meeting_feedbacks.find_one(query)

class MeetingFeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    isAnonymous: bool = False

class MeetingFeedbackResponse(BaseModel):
    id: str
    meetingId: str
    reviewerId: str
    revieweeId: str
    rating: int
    comment: Optional[str] = None
    isAnonymous: bool = False
    createdAt: datetime
    updatedAt: datetime

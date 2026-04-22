from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime
from enum import Enum


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MeetingBase(BaseModel):
    expertId: str
    userId: str
    startTime: datetime
    endTime: datetime
    costInfo: float
    status: MeetingStatus = MeetingStatus.SCHEDULED
    jitsiRoomUrl: Optional[str] = None
    jitsiRoomName: Optional[str] = None


class MeetingCreate(MeetingBase):
    pass


class Meeting(MeetingBase):
    createdAt: datetime
    updatedAt: datetime


class MeetingResponse(Meeting):
    meetingId: str

class MeetingUpdate(BaseModel):
    status: Optional[MeetingStatus] = None
    jitsiRoomUrl: Optional[str] = None
    jitsiRoomName: Optional[str] = None
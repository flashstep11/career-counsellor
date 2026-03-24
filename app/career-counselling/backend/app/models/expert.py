from pydantic import BaseModel
from typing import List, Optional
from app.models.user import UserBase, UserSearchResponse
from datetime import datetime


class TimeSlot(BaseModel):
    startTime: str  # Format: "HH:MM" (24-hour)
    endTime: str    # Format: "HH:MM" (24-hour)

class DayAvailability(BaseModel):
    isAvailable: bool = False
    slots: List[TimeSlot] = []

class ExpertAvailability(BaseModel):
    monday: DayAvailability = DayAvailability()
    tuesday: DayAvailability = DayAvailability()
    wednesday: DayAvailability = DayAvailability()
    thursday: DayAvailability = DayAvailability()
    friday: DayAvailability = DayAvailability()
    saturday: DayAvailability = DayAvailability()
    sunday: DayAvailability = DayAvailability()

class ExpertBase(BaseModel):
    calendarEmbedUrl: str = "" # Making it optional/empty by default since we use native
    meetingCost: float
    currentPosition: str
    organization: str
    bio: str
    education: List[dict]  # List of { degree, institution, year }
    socialLinks: dict  # { linkedin, twitter, etc }
    userId: str
    rating: float = 0
    available: bool = True
    studentsGuided: int = 0  # Default to 0 students guided
    profile_video_id: Optional[str] = None  # Expert's chosen profile video ID
    availability: Optional[ExpertAvailability] = None # Native scheduling availability
    sessionDurationMinutes: int = 60  # Duration of each bookable slot in minutes

class Expert(ExpertBase):
    createdAt: datetime

class ExpertResponse(Expert):
    expertID: str
    userDetails: UserBase


class ExpertSearchResponse(BaseModel):
    expertID: str
    userDetails: UserSearchResponse


class ExpertUpdate(BaseModel):
    """Model for updating expert profiles - all fields are optional for partial updates"""
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    calendarEmbedUrl: Optional[str] = None
    meetingCost: Optional[float] = None
    currentPosition: Optional[str] = None
    organization: Optional[str] = None
    bio: Optional[str] = None
    available: Optional[bool] = None
    studentsGuided: Optional[int] = None
    profile_video_id: Optional[str] = None  # Expert's chosen profile video ID
    availability: Optional[ExpertAvailability] = None
    sessionDurationMinutes: Optional[int] = None  # 30, 45, 60, 90, 120

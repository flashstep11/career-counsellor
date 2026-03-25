from pydantic import BaseModel, Field, ConfigDict, field_validator, AliasChoices
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class UserResponse(BaseModel):
    id: str = Field(..., alias="_id")
    firstName: str
    lastName: str
    email: str
    isAdmin: bool
    isExpert: bool
    createdAt: datetime
    status: str = "active"  # Default status

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class UsersListResponse(BaseModel):
    users: List[UserResponse]


class ExpertApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ExpertResponse(BaseModel):
    id: str = Field(..., alias="_id")
    firstName: str
    lastName: str
    email: str
    specialization: Optional[str] = None
    bio: Optional[str] = None
    rating: float = 0.0
    # Stored in DB as `expertStatus`. Some older records may have `status: "active"`.
    status: ExpertApprovalStatus = Field(
        default=ExpertApprovalStatus.PENDING,
        validation_alias=AliasChoices("expertStatus", "status"),
        serialization_alias="status",
    )
    createdAt: datetime

    @field_validator("status", mode="before")
    @classmethod
    def _coerce_status(cls, value):
        if value is None:
            return ExpertApprovalStatus.PENDING
        if isinstance(value, ExpertApprovalStatus):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized == "active":
                return ExpertApprovalStatus.APPROVED
            if normalized in {"pending", "approved", "rejected"}:
                return ExpertApprovalStatus(normalized)
        return ExpertApprovalStatus.PENDING

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class ExpertsListResponse(BaseModel):
    experts: List[ExpertResponse]


class ExpertApprovalRequest(BaseModel):
    status: ExpertApprovalStatus


class BlogResponse(BaseModel):
    id: str = Field(..., alias="_id")
    title: str
    author: str
    content: Optional[str] = None
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    views: int = 0

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class BlogsListResponse(BaseModel):
    blogs: List[BlogResponse]


class VideoResponse(BaseModel):
    id: str = Field(..., alias="_id")
    title: str
    creator: str
    description: Optional[str] = None
    url: str
    createdAt: datetime
    views: int = 0

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class VideosListResponse(BaseModel):
    videos: List[VideoResponse]


class ActivityResponse(BaseModel):
    id: str = Field(..., alias="_id")
    activityType: str  # e.g., "user_registration", "blog_creation", "expert_approval", etc.
    description: str
    timestamp: datetime
    userId: Optional[str] = None
    userName: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse]


class DashboardStats(BaseModel):
    totalUsers: int
    totalExperts: int
    totalBlogs: int
    totalVideos: int
    pendingExpertApprovals: int
    activities: List[ActivityResponse]


class WeeklyGoal(BaseModel):
    id: int
    title: str
    completed: bool


class UserDashboardStats(BaseModel):
    profileStrength: int  # Percentage 0-100
    unreadReplies: int  # Count of unread notifications
    upcomingMeetingsToday: int  # Count of meetings scheduled for today
    weeklyGoals: List[WeeklyGoal]
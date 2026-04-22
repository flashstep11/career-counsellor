from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.base import DBModelMixin


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ModeratorApplicationCreate(BaseModel):
    communityId: str
    motivation: str
    experience: Optional[str] = None
    availability: Optional[str] = None
    supportingDocumentUrl: Optional[str] = None


class ModeratorApplicationUpdate(BaseModel):
    status: ApplicationStatus
    adminNotes: Optional[str] = None
    rejectionReason: Optional[str] = None


class ModeratorApplication(DBModelMixin):
    userId: str
    communityId: str
    motivation: str
    experience: Optional[str] = None
    availability: Optional[str] = None
    supportingDocumentUrl: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.PENDING
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[datetime] = None
    adminNotes: Optional[str] = None
    rejectionReason: Optional[str] = None
    routedTo: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda dt: dt.isoformat()},
    )


class ModeratorApplicationResponse(ModeratorApplication):
    userName: Optional[str] = None
    userEmail: Optional[str] = None
    communityName: Optional[str] = None
    communityDisplayName: Optional[str] = None
    reviewerName: Optional[str] = None
    userProfile: Optional[Dict[str, str | int | bool]] = None


class ApplicationListResponse(BaseModel):
    applications: List[ModeratorApplicationResponse]
    total: int
    page: int
    limit: int

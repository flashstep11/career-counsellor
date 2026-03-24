from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ReportCreate(BaseModel):
    targetId: str        # post or comment ObjectId
    targetType: str      # "post" | "comment"
    reason: str
    communityId: Optional[str] = None


class Report(BaseModel):
    reportId: Optional[str] = None
    targetId: str
    targetType: str
    reason: str
    reporterId: str
    communityId: Optional[str] = None
    status: str = "open"  # "open" | "resolved"
    createdAt: datetime
    updatedAt: datetime


class ReportResponse(Report):
    pass

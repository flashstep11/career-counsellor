"""
Expert Application Model

This module defines the Expert Application model for storing and validating expert applications.
"""

from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ExpertApplicationStatus(str, Enum):
    """Status of an expert application"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ExpertApplicationCreate(BaseModel):
    """Model for creating a new expert application"""
    userId: str
    firstName: str
    lastName: str
    email: str
    currentPosition: str
    organization: str
    bio: str
    education: str
    specialization: str
    meetingCost: float
    fileId: str


class ExpertApplicationStatusUpdate(BaseModel):
    """Model for updating an expert application status"""
    status: ExpertApplicationStatus
    rejectionReason: Optional[str] = None


class ExpertApplicationResponse(BaseModel):
    """Model for expert application responses"""
    id: str
    userId: str
    firstName: str
    lastName: str
    email: str
    currentPosition: str
    organization: str
    bio: str
    education: str
    specialization: str
    meetingCost: float
    fileId: str
    applicationDate: datetime
    status: ExpertApplicationStatus
    reviewDate: Optional[datetime] = None
    reviewedBy: Optional[str] = None
    rejectionReason: Optional[str] = None
    
    class Config:
        from_attributes = True
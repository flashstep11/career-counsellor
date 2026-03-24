from typing import Optional, List, Union
from pydantic import BaseModel, HttpUrl, Field, validator
from datetime import datetime
from app.models.expert import ExpertResponse


class VideoCreate(BaseModel):
    title: str
    description: str
    youtubeUrl: str  # Changed from HttpUrl to str for more flexibility
    previewDuration: int = 120  # Preview duration in seconds for free users
    tags: List[str] = []
    refType: str = Field(..., pattern="^(college|collegebranch|NA)$")
    typeId: Optional[str] = None  # Will contain collegeId or collegeBranchId based on refType
    
    # Add validators
    @validator('youtubeUrl')
    def validate_url(cls, v):
        if not v:
            raise ValueError('YouTube URL is required')
        if not (v.startswith('http://') or v.startswith('https://')):
            v = f'https://{v}'
        return v
    
    @validator('typeId')
    def validate_type_id(cls, v, values):
        ref_type = values.get('refType')
        if ref_type in ['college', 'collegebranch'] and not v:
            raise ValueError(f'typeId is required when refType is {ref_type}')
        if ref_type == 'NA':
            return None
        return v


class VideoBase(BaseModel):
    title: str
    userId: str
    description: str
    youtubeUrl: HttpUrl  # For now, using YouTube URLs
    previewDuration: int = 120  # Preview duration in seconds for free users
    tags: List[str] = []
    views: int = 0
    likes: int = 0
    likedBy: List[str] = []
    refType: str = Field(..., pattern="^(college|collegebranch|NA)$")
    typeId: Optional[str] = None  # Will contain collegeId or collegeBranchId based on refType
    transcript: Optional[str] = None  # Full transcript of the video


class Video(VideoBase):
    videoID: str
    createdAt: datetime


class VideoResponse(Video):
    expertDetails: ExpertResponse


class VideoSearchResponse(BaseModel):
    videoID: str
    title: str

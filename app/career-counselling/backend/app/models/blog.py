from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class BlogBase(BaseModel):
    heading: str
    body: str
    refType: str = Field(..., pattern="^(college|collegebranch|NA)$")
    typeId: Optional[str] = None


class Blog(BlogBase):
    blogID: Optional[str] = None
    userID: str
    createdAt: datetime
    updatedAt: datetime
    views: int = 0
    likes: int = 0
    likedBy: List[str] = []


class Author(BaseModel):
    userID: str
    firstName: str
    middleName: Optional[str] = None
    lastName: str


class BlogResponse(Blog):
    author: Author
    # Add expert userId to make it accessible on the frontend
    expertId: str = None  # This will store the author's userID for the follow button


class BlogSearchResponse(BaseModel):
    blogID: str
    heading: str

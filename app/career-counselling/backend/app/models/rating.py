from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.base import DBModelMixin


class Rating(DBModelMixin):
    expertId: str  # ID of the expert being rated
    userId: str  # ID of the user giving the rating
    rating: int = Field(..., ge=1, le=5)  # Rating from 1-5
    comment: Optional[str] = None
    isAnonymous: bool = False  # Flag to determine if the rating should be anonymous
    createdAt: datetime = datetime.utcnow()
    updatedAt: datetime = datetime.utcnow()

    @classmethod
    async def find(cls, query):
        """Provides MongoDB-like query functionality"""
        from app.core.database import get_database
        db = get_database()
        return await db.ratings.find(query)

    @classmethod
    async def find_one(cls, query):
        """Find a single rating document"""
        from app.core.database import get_database
        db = get_database()
        return await db.ratings.find_one(query)


class RatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    isAnonymous: bool = False


class RatingUpdate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    isAnonymous: Optional[bool] = None


class RatingResponse(BaseModel):
    id: str
    expertId: str
    userId: str
    rating: int
    comment: Optional[str] = None
    isAnonymous: bool = False
    createdAt: datetime
    updatedAt: datetime

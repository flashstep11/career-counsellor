from pydantic import BaseModel
from typing import List, Dict, Optional, Union


class RatingDistribution(BaseModel):
    rating: int
    count: int


class RatingsData(BaseModel):
    average: float
    distribution: List[RatingDistribution]


class MeetingsData(BaseModel):
    completed: int
    upcoming: int
    cancellationRate: float


class EarningsData(BaseModel):
    total: float
    thisMonth: float
    previousMonth: float
    growth: float


class MonthlyView(BaseModel):
    month: str
    views: int


class ContentEngagement(BaseModel):
    type: str
    count: int


class PerformanceData(BaseModel):
    followersCount: int
    ratings: RatingsData
    meetings: MeetingsData
    earnings: EarningsData
    monthlyViews: List[MonthlyView]
    contentEngagement: List[ContentEngagement]


class ViewsData(BaseModel):
    profileViews: int
    videoViews: int
    blogReads: int
    postViews: int
    totalEngagement: int


class ContentData(BaseModel):
    videosCount: int
    blogsCount: int
    postsCount: int


class ExpertAnalytics(BaseModel):
    views: ViewsData
    content: ContentData
    performance: PerformanceData

from typing import Dict, List, Optional, Tuple, Any
from pydantic import BaseModel, Field, HttpUrl


class Person(BaseModel):
    """Base model for people (alumni and faculty)"""
    name: str
    link: str


class CollegeBase(BaseModel):
    """College model representing educational institution details."""
    name: str
    address: str
    state: str
    nirfRanking: int
    type: str = Field(..., pattern="^(private|public|other)$")
    locality_type: str = Field(..., pattern="^(rural|urban)$")
    gender_ratio: float
    descriptionBlogID: Optional[str]
    website: HttpUrl
    email: str
    phone: Optional[str] = None
    yearOfEstablishment: int
    landArea: float
    placement: float
    placementMedian: float
    placementOther: Optional[dict] = None
    notableAlumni: List[Person] = []
    notableFaculty: List[Person] = []
    latitude: Optional[float] = None  # Add latitude coordinate
    longitude: Optional[float] = None  # Add longitude coordinate
    h_index: Optional[int] = None  # Add h-index field


class College(CollegeBase):
    pass


class CollegeResponse(CollegeBase):
    """College model with additional metadata."""
    collegeID: str
    createdAt: str
    updatedAt: str


class CollegeDescriptionResponse(CollegeResponse):
    """College model with additional metadata."""
    description: str


class CollegeSearchResponse(BaseModel):
    name: str
    collegeID: str


class UserLocation(BaseModel):
    latitude: float
    longitude: float


class DistanceFilter(BaseModel):
    min_distance: float
    max_distance: float
    user_location: UserLocation


class CollegePredictRequest(BaseModel):
    exam_ranks: Dict[str, int]
    preferred_state: Optional[str] = None
    locality: Optional[str] = None
    preferred_branches: Optional[str] = None
    placement_range: Optional[Tuple[float, float]] = None
    gender_ratio_range: Optional[Tuple[float, float]] = None
    nirf_ranking_range: Optional[Tuple[int, int]] = None
    h_index_range: Optional[Tuple[int, int]] = None  # Add h-index range filter
    distance_range: Optional[DistanceFilter] = None
    skip: int = 0
    limit: int = 30

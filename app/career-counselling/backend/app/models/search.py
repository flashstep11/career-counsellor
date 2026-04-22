from enum import Enum
from typing import List, Optional
from pydantic import BaseModel
from app.models.blog import BlogSearchResponse
from app.models.college import CollegeSearchResponse
from app.models.expert import ExpertSearchResponse
from app.models.video import VideoSearchResponse


class SearchType(str, Enum):
    ALL = "all"
    BLOG = "blog"
    VIDEO = "video"
    EXPERT = "expert"
    COLLEGE = "college"


class SearchResult(BaseModel):
    type: SearchType
    blogs: Optional[List[BlogSearchResponse]] = None
    colleges: Optional[List[CollegeSearchResponse]] = None
    experts: Optional[List[ExpertSearchResponse]] = None
    videos: Optional[List[VideoSearchResponse]] = None
    total_count: int

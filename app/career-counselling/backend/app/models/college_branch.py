from enum import Enum
from typing import List, Optional
from app.models.base import DBModelMixin
from app.models.branch import Branch
from app.models.college import College  # Add this import

from pydantic import BaseModel


class CutoffQuota(str, Enum):
    AI = "ai"
    HS = "hs"
    OS = "os"


class CutoffSeatType(str, Enum):
    OPEN = "open"
    EWS = "ews"
    OBC_NCL = "obc-ncl"
    SC = "sc"
    ST = "st"
    OPEN_PWD = "open-pwd"
    EWS_PWD = "ews-pwd"
    OBC_NCL_PWD = "obc-ncl-pwd"
    SC_PWD = "sc-pwd"
    ST_PWD = "st-pwd"


class CutoffGender(str, Enum):
    NEUTRAL = "neutral"
    FEMALE_ONLY = "female-only"


class CutoffType(str, Enum):
    RANK = "rank"
    PERCENTILE = "percentile"
    SCORE = "score"


class CutoffExam(str, Enum):
    JEE_MAINS = "jee-mains"
    JEE_ADVANCED = "jee-advanced"
    BITSAT = "bitsat"
    MHT_CET = "mht-cet"
    COMEDK = "comedk"
    SRMJEE = "srmjee"
    VITEEE = "viteee"
    WBJEE = "wbjee"


class CutoffCategory(BaseModel):
    quota: CutoffQuota
    seat_type: CutoffSeatType
    gender: CutoffGender
    exam: CutoffExam
    co_type: CutoffType


class Cutoff(BaseModel):
    year: int
    counselling_round: int
    category: CutoffCategory
    opening_rank: int
    closing_rank: int

class AvgCutoff(BaseModel):
    category: CutoffCategory
    opening_rank: int
    closing_rank: int

class CollegeBranchPlacement(BaseModel):
    year: int
    average_package: Optional[float] = None
    highest_package: Optional[float] = None
    median_package: Optional[float] = None
    companies_visited: List[str] = []


class CollegeBranchBase(BaseModel):
    """Base model for creating a college branch without system fields."""
    college_id: str
    branch_id: str
    seats: Optional[int] = None
    fees_per_year: Optional[float] = None
    cutoffs: List[Cutoff] = []
    avg_cutoffs: List[AvgCutoff]
    avg_placement: float
    placements: List[CollegeBranchPlacement] = []


class CollegeBranch(CollegeBranchBase, DBModelMixin):
    """Complete college branch model with system fields."""
    pass


class CollegeBranchResponse(CollegeBranch):
    branch: Branch
    college: Optional[College] = None  # Add this field

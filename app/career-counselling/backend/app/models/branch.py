from typing import Optional
from enum import Enum
from pydantic import BaseModel
from app.models.base import DBModelMixin


class DegreeType(str, Enum):
    UG = "ug"
    PG = "pg"
    PHD = "phd"


class BranchBase(BaseModel):
    """Base model for creating a branch without system fields."""
    name: str
    degree_name: str
    # degree_type: DegreeType
    duration: int
    # description: Optional[str] = None
    # eligibility_criteria: Optional[str] = None


class Branch(BranchBase, DBModelMixin):
    """Complete branch model with system fields."""
    pass

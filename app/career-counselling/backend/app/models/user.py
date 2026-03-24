from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from enum import Enum
from bson import ObjectId


class Grade(str, Enum):
    GRADE_9 = "Grade 9"
    GRADE_10 = "Grade 10"
    GRADE_11 = "Grade 11"
    GRADE_12 = "Grade 12"


class Stream(str, Enum):
    SCIENCE_PCM = "Science (PCM)"
    SCIENCE_PCB = "Science (PCB)"
    COMMERCE = "Commerce"
    ARTS = "Arts / Humanities"
    UNSPECIFIED = ""


class Category(str, Enum):
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
    UNSPECIFIED = ""


class UserBase(BaseModel):
    firstName: Optional[str] = None
    middleName: Optional[str] = None
    lastName: Optional[str] = None
    email: EmailStr
    gender: Optional[str] = None
    category: Optional[Category] = Category.UNSPECIFIED
    home_state: Optional[str] = None
    mobileNo: Optional[str] = None
    type: str = "free"
    isExpert: bool = False
    expertId: Optional[str] = None
    isAdmin: bool = False
    wallet: int = 200  # Default wallet balance of 200 coins
    following: list[str] = []
    followers: list[str] = []
    # Onboarding fields
    grade: Optional[Grade] = None
    preferred_stream: Optional[Stream] = None
    target_college: Optional[str] = None
    interests: List[str] = []
    career_goals: Optional[str] = None
    onboarding_completed: bool = False
    recently_viewed: List[Dict[str, Any]] = []  # [{type, itemId, title, viewedAt}]
    credentials: List[str] = []  # admin-assigned verification badges e.g. ["Verified", "Professor"]
    reputation: int = 0          # engagement score (incremented on post likes received)


class User(UserBase):
    # Change ObjectId to str
    id: Optional[str] = Field(alias="_id", default=None)
    # Override to Optional so routes can strip sensitive fields for non-connections
    email: Optional[EmailStr] = None
    mobileNo: Optional[str] = None
    password: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        validate_assignment = True


class UserCreate(BaseModel):
    email: str
    password: str
    firstName: str
    lastName: str
    gender: str
    category: str
    mobileNo: str


class UserSearchResponse(BaseModel):
    firstName: str
    lastName: str


class UserWithPassword(UserBase):
    hashedPassword: str


class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str
    middleName: Optional[str] = None
    verification_token: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    firstName: Optional[str] = None
    middleName: Optional[str] = None
    lastName: Optional[str] = None
    gender: Optional[str] = None
    category: Optional[str] = None
    home_state: Optional[str] = None
    mobileNo: Optional[str] = None
    wallet: Optional[int] = None
    status: Optional[str] = None  # Add status field to support user status updates


class OnboardingUpdate(BaseModel):
    grade: Optional[str] = None
    preferred_stream: Optional[str] = None
    target_college: Optional[str] = None
    interests: Optional[List[str]] = None
    career_goals: Optional[str] = None


class UserInDB(User):
    password: str

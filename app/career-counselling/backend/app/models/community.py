from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime


class CommunityCreate(BaseModel):
    name: str          # URL-safe slug, e.g. "career-advice"
    displayName: str   # Human-readable title
    description: str
    iconColor: Optional[str] = "#6366f1"  # Tailwind indigo-500 hex


class Community(CommunityCreate):
    communityId: Optional[str] = None
    createdBy: str                        # userId of creator
    memberCount: int = 1
    postCount: int = 0
    members: List[str] = []              # list of userIds
    community_roles: Dict[str, str] = {}  # {userId: "moderator"|"member"}
    pinnedPosts: List[str] = []           # list of post IDs pinned to top
    bannedUsers: List[str] = []           # list of banned userIds
    createdAt: datetime
    updatedAt: datetime


class CommunityResponse(Community):
    creatorName: Optional[str] = None
    isJoined: Optional[bool] = False     # whether the requesting user has joined
    isModerator: Optional[bool] = False  # whether the requesting user is a moderator

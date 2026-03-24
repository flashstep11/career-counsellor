from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


class PostMedia(BaseModel):
    url: str           # e.g. /api/files/{fileId}
    type: str          # "image" or "video"
    fileId: str        # GridFS file ID


class PostBase(BaseModel):
    title: Optional[str] = ""
    content: str
    communityId: Optional[str] = ""     # all posts now belong to a community
    authorId: Optional[str] = ""        # userId of the post author


class Post(PostBase):
    postId: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    likes: int = 0
    likedBy: List[str] = []
    views: int = 0
    tags: List[str] = []
    media: List[PostMedia] = []


class PostResponse(Post):
    authorName: Optional[str] = None
    authorInitials: Optional[str] = None
    communityName: Optional[str] = None
    communityDisplayName: Optional[str] = None
    commentsCount: Optional[int] = 0
    topComment: Optional[dict] = None
    authorCredentials: List[str] = []  # verification badges from user profile
    isPinned: bool = False             # pinned in community


class PostCreate(BaseModel):
    title: str
    content: str
    communityId: str
    tags: Optional[List[str]] = []
    media: Optional[List[PostMedia]] = []


class PostLike(BaseModel):
    postId: str
    userId: str


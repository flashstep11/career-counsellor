from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class CommentBase(BaseModel):
    content: str
    type: str  # "blog", "video", "expert", "post"
    page_id: str  # ID of the blog, video, expert page, or post
    parent_id: Optional[str] = None  # ID of parent comment (if this is a reply)

class CommentCreate(BaseModel):
    content: str
    type: str
    page_id: str
    parent_id: Optional[str] = None  # Added to support replies

class Comment(CommentBase):
    commentID: Optional[str] = None
    userID: str
    createdAt: datetime
    updatedAt: datetime

class CommentResponse(Comment):
    user: dict  # User details like name, avatar, etc.
    replies: Optional[List['CommentResponse']] = []  # List of replies

from typing import Optional, List
from pydantic import BaseModel
from enum import Enum
from datetime import datetime
from app.models.base import DBModelMixin

# How long (minutes) a batch stays open for new events from the same actor+type
BATCH_WINDOW_MINUTES = 5


class NotificationType(str, Enum):
    NEW_POST = "new_post"
    NEW_VIDEO = "new_video"
    NEW_BLOG = "new_blog"
    LIKE_POST = "like_post"
    COMMENT = "comment"
    FOLLOW = "follow"
    MEETING_SCHEDULED = "meeting_scheduled"
    MEETING_REMINDER = "meeting_reminder"
    REFUND = "refund"
    CONNECTION_REQUEST = "connection_request"
    CONNECTION_ACCEPTED = "connection_accepted"
    CONNECTION_ACTIVITY = "connection_activity"
    COMMENT_REPLY = "comment_reply"    # reply to your comment
    POST_LIKED = "post_liked"          # someone liked your post
    COMMUNITY_POST = "community_post"  # new post in a joined community
    MENTION = "mention"                # mentioned via @username


class NotificationBase(BaseModel):
    """Base notification model with essential fields."""
    targetUserId: str  # ID of user who should receive the notification
    sourceUserId: str  # ID of user/entity who triggered the notification
    type: NotificationType
    content: str  # Brief notification message
    # ID of related entity (post, comment, etc.)
    referenceId: Optional[str] = None
    # Type of referenced entity (post, comment, etc.)
    referenceType: Optional[str] = None
    read: bool = False
    # ID of expert involved in the notification (if applicable)
    expertId: Optional[str] = None


class Notification(NotificationBase, DBModelMixin):
    """Complete notification model with system fields."""
    pass


class NotificationCreate(NotificationBase):
    """Model for creating a new notification."""
    pass


class NotificationResponse(Notification):
    """Notification model for responses with additional fields."""
    notificationId: str
    createdAt: datetime
    # Additional info about source user
    sourceUserDetails: Optional[dict] = None


class NotificationUpdate(BaseModel):
    """Model for updating notification fields."""
    read: Optional[bool] = None


class NotificationBatch(DBModelMixin):
    """
    Groups multiple fan-out events (new_video, new_blog) from the same expert
    into a single visible entry per follower within a BATCH_WINDOW_MINUTES window.
    """
    targetUserId: str
    actorId: str                  # expert's user ID
    actorName: str
    actorExpertId: Optional[str] = None
    eventType: NotificationType   # NEW_VIDEO | NEW_BLOG
    entityIds: List[str] = []     # video/blog IDs accumulated in this batch
    referenceType: str            # "video" | "blog"
    batchKey: str                 # "{actorId}:{eventType.value}"
    isRead: bool = False
    isOpen: bool = True           # False once window expires
    windowExpiresAt: datetime
    createdAt: datetime
    updatedAt: datetime


class NotificationBatchResponse(NotificationBatch):
    """NotificationBatch with a resolved batchId field."""
    batchId: str
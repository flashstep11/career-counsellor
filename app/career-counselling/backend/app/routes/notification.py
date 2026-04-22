from fastapi import APIRouter, HTTPException, Query, Depends, status
from typing import List
from app.models.notification import NotificationResponse, NotificationUpdate, NotificationBatchResponse
from app.managers.notification import NotificationManager
from app.core.auth_utils import require_user

router = APIRouter()
notification_manager = NotificationManager()


@router.get("/notifications", response_model=List[NotificationResponse])
async def get_user_notifications(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        10, ge=1, le=50, description="Maximum number of records to return"),
    unread_only: bool = Query(
        False, description="If True, return only unread notifications"),
    user_data: dict = Depends(require_user)
):
    """
    Get notifications for the currently authenticated user.
    """
    try:
        notifications = await notification_manager.get_user_notifications(
            user_data["id"], skip=skip, limit=limit, unread_only=unread_only
        )
        return notifications
    except Exception as e:
        print(f"Error retrieving notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notifications"
        )


@router.get("/notifications/count", response_model=dict)
async def get_unread_notification_count(user_data: dict = Depends(require_user)):
    """
    Get the count of unread notifications for the currently authenticated user.
    """
    try:
        notifications = await notification_manager.get_user_notifications(
            user_data["id"], unread_only=True
        )
        return {"count": len(notifications)}
    except Exception as e:
        print(f"Error counting notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to count notifications"
        )


@router.put("/notifications/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: str,
    update_data: NotificationUpdate,
    user_data: dict = Depends(require_user)
):
    """
    Update a notification (e.g., mark as read).
    """
    try:
        # First check if the notification belongs to the user
        notification = await notification_manager.get_notification(notification_id)
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )

        if notification.targetUserId != user_data["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this notification"
            )

        updated_notification = await notification_manager.update_notification(
            notification_id, update_data
        )

        if not updated_notification:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update notification"
            )

        return updated_notification
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification"
        )


@router.put("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(notification_id: str, user_data: dict = Depends(require_user)):
    """
    Mark a notification as read.
    """
    try:
        # First check if the notification belongs to the user
        notification = await notification_manager.get_notification(notification_id)
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )

        if notification.targetUserId != user_data["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this notification"
            )

        updated_notification = await notification_manager.mark_as_read(notification_id)

        if not updated_notification:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to mark notification as read"
            )

        return updated_notification
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking notification as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )


@router.post("/notifications/read-all", response_model=dict)
async def mark_all_notifications_as_read_post(user_data: dict = Depends(require_user)):
    """
    Mark all notifications for the current user as read (POST method).
    """
    try:
        updated_count = await notification_manager.mark_all_as_read(user_data["id"])
        return {"message": f"Marked {updated_count} notifications as read"}
    except Exception as e:
        print(f"Error marking all notifications as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read"
        )


@router.delete("/notifications/{notification_id}", response_model=dict)
async def delete_notification(notification_id: str, user_data: dict = Depends(require_user)):
    """
    Delete a notification.
    """
    try:
        # First check if the notification belongs to the user
        notification = await notification_manager.get_notification(notification_id)
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )

        if notification.targetUserId != user_data["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this notification"
            )

        success = await notification_manager.delete_notification(notification_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete notification"
            )

        return {"message": "Notification deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )


# ---------------------------------------------------------------------------
# Batched notification endpoints
# ---------------------------------------------------------------------------

@router.get("/notifications/batches", response_model=List[NotificationBatchResponse])
async def get_user_notification_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_data: dict = Depends(require_user),
):
    """Return all batched notifications for the current user (lazily expires old windows)."""
    try:
        return await notification_manager.get_user_batches(user_data["id"], skip=skip, limit=limit)
    except Exception as e:
        print(f"Error retrieving notification batches: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notification batches")


@router.put("/notifications/batches/{batch_id}/read", response_model=NotificationBatchResponse)
async def mark_batch_as_read(batch_id: str, user_data: dict = Depends(require_user)):
    """Mark a specific notification batch as read."""
    try:
        batch = await notification_manager.mark_batch_as_read(batch_id)
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if batch.targetUserId != user_data["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        return batch
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error marking batch as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark batch as read")


@router.post("/notifications/batches/read-all", response_model=dict)
async def mark_all_batches_as_read(user_data: dict = Depends(require_user)):
    """Mark all notification batches for the current user as read."""
    try:
        count = await notification_manager.mark_all_batches_as_read(user_data["id"])
        return {"message": f"Marked {count} batches as read"}
    except Exception as e:
        print(f"Error marking all batches as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark all batches as read")

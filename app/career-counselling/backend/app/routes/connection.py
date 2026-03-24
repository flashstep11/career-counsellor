from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.models.connection import ConnectionResponse, ConnectionRequest
from app.models.notification import Notification, NotificationType
from app.managers.connection import ConnectionManager
from app.managers.notification import NotificationManager
from app.managers.user import UserManager
from app.core.auth_utils import get_current_user

router = APIRouter()
connection_manager = ConnectionManager()
notification_manager = NotificationManager()
user_manager = UserManager()


def _make_notification(
    target_id: str,
    source_id: str,
    ntype: NotificationType,
    content: str,
    ref_id: str = "",
    ref_type: str = "connection",
) -> Notification:
    return Notification(
        targetUserId=target_id,
        sourceUserId=source_id,
        type=ntype,
        content=content,
        referenceId=ref_id,
        referenceType=ref_type,
        read=False,
    )


@router.post("/connections/request", response_model=ConnectionResponse, status_code=201)
async def send_connection_request(
    body: ConnectionRequest,
    user_data: dict = Depends(get_current_user),
):
    """Send a connection request to another user."""
    requester_id = user_data["id"]
    try:
        conn = await connection_manager.send_request(requester_id, body.target_id)
    except ValueError as e:
        detail_map = {
            "self_connection": "You cannot connect with yourself.",
            "duplicate": "A connection request already exists between these users.",
        }
        raise HTTPException(status_code=409, detail=detail_map.get(str(e), str(e)))

    # Notify the target
    requester = await user_manager.get_user(requester_id)
    name = f"{requester.firstName} {requester.lastName}".strip() if requester else "Someone"
    notif = _make_notification(
        target_id=body.target_id,
        source_id=requester_id,
        ntype=NotificationType.CONNECTION_REQUEST,
        content=f"{name} sent you a connection request.",
        ref_id=conn.connectionId,
    )
    await notification_manager.create_notification(notif)

    return conn


@router.post("/connections/{connection_id}/accept", response_model=ConnectionResponse)
async def accept_connection(
    connection_id: str,
    user_data: dict = Depends(get_current_user),
):
    """Accept a pending connection request."""
    conn = await connection_manager.respond(connection_id, user_data["id"], accept=True)
    if not conn:
        raise HTTPException(status_code=404, detail="Request not found or not authorised.")

    # Notify the original requester
    actor = await user_manager.get_user(user_data["id"])
    name = f"{actor.firstName} {actor.lastName}".strip() if actor else "Someone"
    notif = _make_notification(
        target_id=conn.requester_id,
        source_id=user_data["id"],
        ntype=NotificationType.CONNECTION_ACCEPTED,
        content=f"{name} accepted your connection request.",
        ref_id=conn.connectionId,
    )
    await notification_manager.create_notification(notif)

    return conn


@router.post("/connections/{connection_id}/decline", response_model=ConnectionResponse)
async def decline_connection(
    connection_id: str,
    user_data: dict = Depends(get_current_user),
):
    """Decline a pending connection request."""
    conn = await connection_manager.respond(connection_id, user_data["id"], accept=False)
    if not conn:
        raise HTTPException(status_code=404, detail="Request not found or not authorised.")
    return conn


@router.delete("/connections/{other_user_id}", status_code=204)
async def remove_connection(
    other_user_id: str,
    user_data: dict = Depends(get_current_user),
):
    """Remove an accepted connection."""
    removed = await connection_manager.remove_connection(user_data["id"], other_user_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Connection not found.")


@router.get("/connections", response_model=List[ConnectionResponse])
async def list_connections(
    status: str = "accepted",
    user_data: dict = Depends(get_current_user),
):
    """List connections for the current user. Pass ?status=pending for incoming requests."""
    if status == "pending":
        return await connection_manager.get_pending_received(user_data["id"])
    return await connection_manager.get_connections(user_data["id"], status=status)


@router.get("/connections/status/{other_user_id}")
async def connection_status(
    other_user_id: str,
    user_data: dict = Depends(get_current_user),
):
    """Return relationship status with another user."""
    s = await connection_manager.get_status(user_data["id"], other_user_id)
    return {"status": s or "none"}


@router.get("/connections/mutual/{other_user_id}")
async def mutual_connections(
    other_user_id: str,
    user_data: dict = Depends(get_current_user),
):
    """Return list of mutual connection user IDs and their count."""
    mutual_ids = await connection_manager.get_mutual_connections(user_data["id"], other_user_id)
    return {"count": len(mutual_ids), "user_ids": mutual_ids}

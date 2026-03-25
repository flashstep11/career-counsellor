"""
Socket.IO server instance and connection management.
Clients authenticate by passing their JWT as the `token` query parameter.
Each authenticated user joins a personal room named after their user ID,
so notifications can be pushed with sio.emit("notification", data, room=user_id).
"""

import socketio
import jwt as pyjwt
from app.config import settings

# Single async Socket.IO server — CORS is inherited from FastAPI middleware,
# but we must list origins here too so the Socket.IO handshake doesn't get blocked.
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
)


@sio.event
async def connect(sid, environ, auth):
    """
    Called when a client connects.
    Expects auth={'token': '<jwt>'} from the client.
    Joins the user to their personal room on success.
    """
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")

    if not token:
        # Also try query string fallback (?token=...)
        query = environ.get("QUERY_STRING", "")
        for part in query.split("&"):
            if part.startswith("token="):
                token = part[len("token="):]
                break

    if not token:
        print(f"Socket connection rejected (no token): sid={sid}")
        return False  # reject

    try:
        payload = pyjwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("id") or payload.get("sub")
        if not user_id:
            return False
        await sio.enter_room(sid, user_id)
        await sio.save_session(sid, {"user_id": user_id})
        print(f"Socket connected: sid={sid}, user_id={user_id}")
    except pyjwt.ExpiredSignatureError:
        print(f"Socket connection rejected (expired token): sid={sid}")
        return False
    except pyjwt.PyJWTError as e:
        print(f"Socket connection rejected (invalid token): sid={sid}, error={e}")
        return False


@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else "unknown"
    print(f"Socket disconnected: sid={sid}, user_id={user_id}")


async def broadcast_to_users(user_ids: list, event: str, data: dict) -> None:
    """Emit *event* with *data* to each user's personal socket room (best-effort)."""
    for uid in user_ids:
        try:
            await sio.emit(event, data, room=uid)
        except Exception as e:
            print(f"broadcast_to_users error (uid={uid}): {e}")


# ---------------------------------------------------------------------------
# Extension approval flow
# ---------------------------------------------------------------------------
# Pending requests: { meeting_id -> { studentUserId, durationMinutes, extensionCost } }
_pending_extensions: dict = {}


@sio.event
async def extension_request(sid, data):
    """
    Student emits this to request an extension.
    Backend validates, then relays the request to the expert's socket room.
    data: { meetingId: str, durationMinutes: int }
    """
    from bson import ObjectId
    from app.core.database import get_database
    from app.managers.meeting import MeetingManager
    from app.models.meeting import MeetingStatus

    session = await sio.get_session(sid)
    student_user_id = session.get("user_id")
    meeting_id = data.get("meetingId")
    duration_minutes = int(data.get("durationMinutes", 30))

    print(f"[EXT_REQ] Received: meeting={meeting_id}, student_sid={sid}, student_user_id={student_user_id}")

    mm = MeetingManager()
    meeting = await mm.get_meeting(meeting_id)
    if not meeting:
        print(f"[EXT_REQ] ERROR: Meeting {meeting_id} not found")
        await sio.emit("extension_error", {"meetingId": meeting_id, "reason": "Meeting not found"}, to=sid)
        return

    print(f"[EXT_REQ] Meeting userId={meeting['userId']} (type={type(meeting['userId']).__name__}), student_user_id={student_user_id} (type={type(student_user_id).__name__})")
    print(f"[EXT_REQ] Meeting status={meeting.get('status')} (type={type(meeting.get('status')).__name__})")

    # Compare as strings to avoid type mismatch
    if str(meeting["userId"]) != str(student_user_id):
        print(f"[EXT_REQ] ERROR: userId mismatch: {meeting['userId']} != {student_user_id}")
        await sio.emit("extension_error", {"meetingId": meeting_id, "reason": "Not authorised"}, to=sid)
        return

    # Accept both string values and enum values for status
    meeting_status = meeting.get("status")
    allowed_statuses = {MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS, "scheduled", "in_progress"}
    if meeting_status not in allowed_statuses:
        print(f"[EXT_REQ] ERROR: Meeting status '{meeting_status}' is not active")
        await sio.emit("extension_error", {"meetingId": meeting_id, "reason": "Meeting is not active"}, to=sid)
        return

    db = get_database()
    expert = await db.experts.find_one({"_id": ObjectId(meeting["expertId"])})
    if not expert:
        print(f"[EXT_REQ] ERROR: Expert {meeting['expertId']} not found")
        await sio.emit("extension_error", {"meetingId": meeting_id, "reason": "Expert not found"}, to=sid)
        return

    expert_user_id = expert["userId"]
    hourly_rate = expert.get("meetingCost", 0)
    extension_cost = int(hourly_rate * (duration_minutes / 60.0))

    print(f"[EXT_REQ] Expert userId={expert_user_id} (type={type(expert_user_id).__name__}), cost={extension_cost}")

    # Store pending request (overwrite any previous request for this meeting)
    _pending_extensions[meeting_id] = {
        "studentUserId": student_user_id,
        "durationMinutes": duration_minutes,
        "extensionCost": extension_cost,
    }

    # Check which rooms the expert is in
    print(f"[EXT_REQ] Emitting extension_request_incoming to room={str(expert_user_id)}")

    # Relay to expert
    await sio.emit("extension_request_incoming", {
        "meetingId": meeting_id,
        "durationMinutes": duration_minutes,
        "extensionCost": extension_cost,
    }, room=str(expert_user_id))
    print(f"[EXT_REQ] Extension request relayed: meeting={meeting_id} student={student_user_id} → expert_room={expert_user_id}")


@sio.event
async def extension_respond(sid, data):
    """
    Expert emits this to approve or deny an extension request.
    data: { meetingId: str, approved: bool }
    """
    from bson import ObjectId
    from app.core.database import get_database
    from app.managers.meeting import MeetingManager

    session = await sio.get_session(sid)
    meeting_id = data.get("meetingId")
    approved = bool(data.get("approved", False))

    pending = _pending_extensions.pop(meeting_id, None)
    if not pending:
        # Request expired or already handled
        return

    student_user_id = pending["studentUserId"]
    duration_minutes = pending["durationMinutes"]

    if not approved:
        await sio.emit("extension_denied", {
            "meetingId": meeting_id,
            "reason": "Expert declined the extension request.",
        }, room=str(student_user_id))
        return

    # Execute the actual extension
    mm = MeetingManager()
    success, msg = await mm.extend_meeting(meeting_id, student_user_id, duration_minutes)

    if success:
        meeting = await mm.get_meeting(meeting_id)
        end_time = meeting.get("endTime")
        end_iso = end_time.isoformat() if hasattr(end_time, "isoformat") else str(end_time)

        db = get_database()
        user = await db.users.find_one({"_id": ObjectId(student_user_id)})
        new_wallet = user.get("wallet", 0) if user else 0

        await sio.emit("extension_approved", {
            "meetingId": meeting_id,
            "newEndTime": end_iso,
            "newWalletBalance": new_wallet,
        }, room=str(student_user_id))
        print(f"Extension approved: meeting={meeting_id} new_end={end_iso}")
    else:
        await sio.emit("extension_denied", {
            "meetingId": meeting_id,
            "reason": msg,
        }, room=str(student_user_id))

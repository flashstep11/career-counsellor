from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth_utils import get_current_user
from app.core.socket_manager import chat_room, sio, user_room
from app.managers.chat import ChatManager
from app.models.chat import (
    ChatConversationResponse,
    ChatMessageCreate,
    ChatMessageResponse,
)

router = APIRouter()
chat_manager = ChatManager()


def _chat_error(exc: ValueError) -> HTTPException:
    detail = str(exc)
    if detail == "not_connected":
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only chat with accepted connections.",
        )
    if detail == "self_chat":
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot start a chat with yourself.",
        )
    if detail == "empty_message":
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )
    if detail == "message_too_long":
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is too long.",
        )
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


@router.get("/chat/conversations", response_model=List[ChatConversationResponse])
async def list_conversations(user_data: dict = Depends(get_current_user)):
    return await chat_manager.list_conversations(user_data["id"])


@router.get("/chat/messages/{other_user_id}", response_model=List[ChatMessageResponse])
async def get_messages(
    other_user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_data: dict = Depends(get_current_user),
):
    try:
        messages = await chat_manager.get_messages(user_data["id"], other_user_id, skip, limit)
        await chat_manager.mark_conversation_read(user_data["id"], other_user_id)
        return messages
    except ValueError as exc:
        raise _chat_error(exc)


@router.post("/chat/messages", response_model=ChatMessageResponse, status_code=201)
async def send_message(
    body: ChatMessageCreate,
    user_data: dict = Depends(get_current_user),
):
    try:
        message = await chat_manager.create_message(
            user_data["id"],
            body.recipientId,
            body.content,
        )
    except ValueError as exc:
        raise _chat_error(exc)

    payload = message.model_dump(mode="json")
    room = chat_room(user_data["id"], body.recipientId)
    await sio.emit(
        "receive_message",
        {
            "message_id": payload.get("messageId"),
            "sender_id": user_data["id"],
            "receiver_id": body.recipientId,
            "content": payload["content"],
            "timestamp": payload["createdAt"],
            "room": room,
            "message": payload,
        },
        room=room,
    )
    await sio.emit("chat:message", payload, room=user_room(user_data["id"]))
    await sio.emit("chat:message", payload, room=user_room(body.recipientId))
    return message


@router.put("/chat/messages/{other_user_id}/read")
async def mark_messages_read(
    other_user_id: str,
    user_data: dict = Depends(get_current_user),
):
    try:
        modified_count = await chat_manager.mark_conversation_read(user_data["id"], other_user_id)
    except ValueError as exc:
        raise _chat_error(exc)

    await sio.emit(
        "chat:read",
        {"readerId": user_data["id"], "otherUserId": other_user_id},
        room=user_room(other_user_id),
    )
    return {"updated": modified_count}

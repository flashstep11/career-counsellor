from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from app.managers.chatbot import ChatbotManager
from app.core.auth_utils import get_current_user
from app.core.database import get_database
from typing import Optional
from pydantic import BaseModel
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
chatbot_manager = ChatbotManager()


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class EnhanceContentRequest(BaseModel):
    content: str


@router.post("/create-session")
async def create_session(background_tasks: BackgroundTasks, current_user=Depends(get_current_user)):
    """Create a new chat session - processes system prompt asynchronously"""
    try:
        db = get_database()
        user_id = current_user["id"]

        # Create the session immediately
        chat_session = {
            "user_id": user_id,
            "created_at": datetime.now(),
            "history": [],
            "system_prompts": []
        }

        result = await db.chatbot_sessions.insert_one(chat_session)
        session_id = str(result.inserted_id)

        # Process the system prompt and generate the initial response in the background
        background_tasks.add_task(
            chatbot_manager.send_initial_system_prompt, session_id, user_id)

        # Return immediately with the session ID
        return {"session_id": session_id}
    except Exception as e:
        logger.error(f"Error creating chat session: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to create chat session")


@router.get("/history/{session_id}")
async def get_history(session_id: str, current_user=Depends(get_current_user)):
    """Get chat history for a session"""
    try:
        history = await chatbot_manager.get_chat_history(session_id)
        return {"history": history}
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        return {"history": []}


@router.post("/chat")
async def chat(chat_message: ChatMessage, current_user=Depends(get_current_user)):
    """Chat with the AI model - non-streaming version"""
    try:
        user_id = current_user["id"]

        response = await chatbot_manager.send_message(
            chat_message.message,
            chat_message.session_id,
            user_id
        )

        return response
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to process chat message")


@router.post("/enhance-content")
async def enhance_content(request: EnhanceContentRequest, current_user=Depends(get_current_user)):
    """Enhance content to make it more professional using AI"""
    try:
        # Use the dedicated enhance_content method instead of send_message with is_system=True
        enhanced_content = await chatbot_manager.enhance_content(request.content)

        # Return just the enhanced content
        return {"enhanced_content": enhanced_content}
    except Exception as e:
        logger.error(f"Error enhancing content: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to enhance content")


@router.post("/system-prompt")
async def send_system_prompt(chat_message: ChatMessage, current_user=Depends(get_current_user)):
    """Send a system prompt to the AI model - non-streaming version"""
    try:
        user_id = current_user["id"]

        response = await chatbot_manager.send_message(
            f"SYSTEM: {chat_message.message}",
            chat_message.session_id,
            user_id,
            is_system=True
        )

        return response
    except Exception as e:
        logger.error(f"Error sending system prompt: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Failed to send system prompt")

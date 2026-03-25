"""
Main FastAPI application configuration
"""

import os
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import blog, branch, college_branch, college, expert, search, user, video, auth, comment, post, admin, expert_analytics, notification, rating, expert_application, file, chatbot, meeting, community, activity, connection, moderator_application, refund
from app.managers.user import UserManager
from app.config import settings
from app.core.socket_manager import sio

_fastapi_app = FastAPI(title="AlumNiti API")

# CORS configuration
_fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOW_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
_fastapi_app.include_router(refund.router, tags=["refund"], prefix="/api")
_fastapi_app.include_router(blog.router, tags=["blogs"], prefix="/api")
_fastapi_app.include_router(branch.router, tags=["branch"], prefix="/api")
_fastapi_app.include_router(college_branch.router, tags=[
                   "college_branch"], prefix="/api")
_fastapi_app.include_router(college.router, tags=["college"], prefix="/api")
_fastapi_app.include_router(expert.router, tags=["expert"], prefix="/api")
_fastapi_app.include_router(expert_application.router, tags=[
                   "expert_application"], prefix="/api")
_fastapi_app.include_router(file.router, tags=["file"], prefix="/api")
_fastapi_app.include_router(search.router, tags=["search"], prefix="/api")
_fastapi_app.include_router(user.router, tags=["user"], prefix="/api")
_fastapi_app.include_router(video.router, tags=["video"], prefix="/api")
_fastapi_app.include_router(auth.router, tags=["auth"], prefix="/api")
_fastapi_app.include_router(comment.router, tags=["comment"], prefix="/api")
_fastapi_app.include_router(post.router, tags=["post"], prefix="/api")
_fastapi_app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
_fastapi_app.include_router(expert_analytics.router, tags=[
                   "expert_analytics"], prefix="/api")
_fastapi_app.include_router(notification.router, tags=["notification"], prefix="/api")
_fastapi_app.include_router(rating.router, tags=["rating"], prefix="/api")
_fastapi_app.include_router(chatbot.router, tags=["chatbot"], prefix="/api/chatbot")
_fastapi_app.include_router(meeting.router, tags=["meeting"], prefix="/api")
_fastapi_app.include_router(community.router, tags=["community"], prefix="/api")
_fastapi_app.include_router(activity.router, tags=["activity"], prefix="/api")
_fastapi_app.include_router(connection.router, tags=["connection"], prefix="/api")
_fastapi_app.include_router(moderator_application.router, tags=["moderator_application"], prefix="/api")

# Wrap FastAPI with Socket.IO ASGI middleware.
# Socket.IO handles /socket.io/* paths; everything else goes to FastAPI.
app = socketio.ASGIApp(sio, other_asgi_app=_fastapi_app)


from app.managers.community import CommunityManager

@_fastapi_app.on_event("startup")
async def startup_db_client():
    """Initialize database on startup"""
    # Ensure all users have a wallet
    user_manager = UserManager()
    await user_manager.initialize_wallet_for_existing_users()
    
    # Seed default communities
    community_manager = CommunityManager()
    await community_manager.seed_default_communities()


@_fastapi_app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@_fastapi_app.get("/")
async def root():
    return {"message": "AlumNiti API"}

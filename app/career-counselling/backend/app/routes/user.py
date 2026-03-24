from fastapi import APIRouter, HTTPException, Query, Depends, status, UploadFile, File, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from app.models.user import User, UserProfileUpdate, OnboardingUpdate
from app.managers.expert import ExpertManager
from app.managers.user import UserManager
from app.managers.file import FileManager
from app.managers.connection import ConnectionManager
from app.core.auth_utils import require_admin, require_expert, require_user, get_current_user, get_optional_user
from app.core.database import get_database

router = APIRouter()
user_manager = UserManager()
expert_manager = ExpertManager()
file_manager = FileManager()
connection_manager = ConnectionManager()


@router.post("/users", response_model=User)
async def create_user(user: User):
    """
    Create a new user.

    Returns the created user with generated ID and timestamps.
    """
    # Check if user with email already exists
    existing_user = await user_manager.get_user_by_email(user.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )

    return await user_manager.create_user(user)


@router.get("/users", response_model=List[User])
async def list_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        10, ge=1, le=50, description="Maximum number of records to return"),
    is_expert: Optional[bool] = Query(
        None, description="Filter by expert status")
):
    """
    Get a list of users with optional filtering and pagination.

    Returns a list of users matching the filter criteria.
    """
    return await user_manager.get_users(
        skip=skip,
        limit=limit,
        is_expert=is_expert
    )


@router.get("/users/email/{email}", response_model=User)
async def get_user_by_email(email: str):
    """
    Get a specific user by email.

    Returns the user if found, raises 404 if not found.
    """
    user = await user_manager.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    return user


@router.get("/profile", response_model=User)
async def get_profile(user_data: dict = Depends(require_user)):
    """
    Get user profile - accessible to any authenticated user
    """
    user = await user_manager.get_user_by_email(user_data["email"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Remove sensitive information
    user_dict = user.dict()
    if "hashedPassword" in user_dict:
        del user_dict["hashedPassword"]
    if "_id" in user_dict:
        # Ensure _id is converted to string
        user_dict["id"] = str(user_dict["_id"])
        del user_dict["_id"]

    # if expert, fetch expert id
    if user.isExpert:
        expert = await expert_manager.get_expert_by_user_id(user.id)
        if expert:
            user_dict["expertId"] = str(expert.expertID)
        else:
            user_dict["expertId"] = None

    return User(**user_dict)


@router.put("/onboarding", response_model=User)
async def complete_onboarding(
    onboarding_data: OnboardingUpdate,
    user_data: dict = Depends(require_user)
):
    """
    Save onboarding information for the authenticated user.
    Marks onboarding_completed = True after saving.
    """
    existing_user = await user_manager.get_user_by_email(user_data["email"])
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {k: v for k, v in onboarding_data.model_dump().items() if v is not None}
    update_data["onboarding_completed"] = True

    updated_user = await user_manager.update_user(existing_user.id, update_data)
    if not updated_user:
        raise HTTPException(status_code=500, detail="Failed to save onboarding data")

    return updated_user


@router.put("/profile", response_model=User)
async def update_profile(user_update: UserProfileUpdate, user_data: dict = Depends(require_user)):
    """
    Update the authenticated user's profile information.

    Returns the updated user if found, raises 404 if not found.
    """
    # First check if user exists
    existing_user = await user_manager.get_user_by_email(user_data["email"])
    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Filter out None values to only update provided fields
    update_data = {k: v for k, v in user_update.model_dump().items()
                   if v is not None}

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No valid update fields provided"
        )

    # Change from "_id" to "id"
    updated_user = await user_manager.update_user(existing_user.id, update_data)
    if not updated_user:
        raise HTTPException(
            status_code=500,
            detail="Failed to update user"
        )

    return updated_user


@router.post("/profile/picture", response_model=User)
async def upload_profile_picture(
    file: UploadFile = File(...),
    user_data: dict = Depends(require_user)
):
    """
    Upload a profile picture for the authenticated user.
    Accepts JPEG or PNG images up to 5 MB.
    Returns the updated user with the new profile_picture_url.
    """
    existing_user = await user_manager.get_user_by_email(user_data["email"])
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Upload file via FileManager (GridFS)
    file_id = await file_manager.upload_file(
        file,
        folder="profile_pictures",
        allowed_types=["image/jpeg", "image/png", "image/webp"],
        max_size=5 * 1024 * 1024,  # 5 MB
    )

    profile_picture_url = f"/api/files/{file_id}"

    updated_user = await user_manager.update_user(
        existing_user.id,
        {"profile_picture_url": profile_picture_url}
    )
    if not updated_user:
        raise HTTPException(status_code=500, detail="Failed to update profile picture")

    return updated_user


@router.get("/users/{user_id}", response_model=User)
async def get_user_profile(
    user_id: str,
    requester: Optional[dict] = Depends(get_optional_user),
):
    """
    Get a specific user's profile information by user ID.
    Email and mobileNo are only included when the requester is self or a connection.
    """
    try:
        user = await user_manager.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_dict = user.model_dump()
        user_dict.pop("hashedPassword", None)
        user_dict.pop("password", None)

        # Determine if requester may see private contact fields
        requester_id = requester["id"] if requester else None
        if requester_id != user_id:
            is_connected = (
                await connection_manager.are_connected(requester_id, user_id)
                if requester_id
                else False
            )
            if not is_connected:
                user_dict["email"] = None
                user_dict["mobileNo"] = None

        return User(**user_dict)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user profile: {str(e)}")


@router.get("/users/{user_id}/posts")
async def get_user_posts(user_id: str, skip: int = 0, limit: int = 20):
    """
    Get posts created by a specific user.
    
    Returns a list of posts by the user.
    """
    try:
        # Get user to verify they exist
        user = await user_manager.get_user(user_id)
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        # Get posts from database
        db = get_database()
        print(f"Fetching posts for user {user_id}, database: {db}")
        
        # Try to access posts collection
        posts_collection = db.posts
        posts_cursor = posts_collection.find(
            {"authorId": user_id}
        ).sort("createdAt", -1).skip(skip).limit(limit)
        
        posts = []
        async for post in posts_cursor:
            # Convert ObjectId to string
            post["_id"] = str(post["_id"])
            post["postId"] = str(post["_id"])
            posts.append(post)
        
        print(f"Found {len(posts)} posts for user {user_id}")
        return posts
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"Error getting user posts: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve user posts: {str(e)}"
        )


@router.get("/expert-info")
async def get_expert_info(user_data: dict = Depends(require_expert)):
    """
    Expert-only endpoint - only accessible to experts and admins
    """
    return {
        "message": "You have access to expert information",
        "role": user_data["role"],
        "email": user_data["email"]
    }


@router.get("/admin-dashboard")
async def admin_dashboard(user_data: dict = Depends(require_admin)):
    """
    Admin-only endpoint - provides dashboard statistics and recent activities
    """
    try:
        # Get dashboard stats using the UserManager
        stats = await user_manager.get_dashboard_stats()
        
        # Add current admin info
        stats["adminInfo"] = {
            "role": user_data["role"],
            "email": user_data["email"]
        }
        
        return stats
    except Exception as e:
        print(f"Error fetching admin dashboard data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load admin dashboard: {str(e)}"
        )


@router.get("/profile-minimal")
async def get_profile_minimal(user_data: dict = Depends(require_user)):
    """
    Return minimal profile fields (category, gender, homeState).
    If any field is null, return 'Not available' for that field.
    """
    user = await user_manager.get_user_by_email(user_data["email"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "category": user.category if user.category else "Not available",
        "gender": user.gender if user.gender else "Not available",
        "homeState": user.home_state if user.home_state else "Not available",
    }


@router.get("/dashboard-stats")
async def get_user_dashboard_stats(user_data: dict = Depends(require_user)):
    """
    Get dashboard statistics for the current user including:
    - Profile strength percentage
    - Unread notifications count
    - Upcoming meetings today count
    - Weekly goals with completion status
    """
    try:
        stats = await user_manager.get_user_dashboard_stats(user_data["email"])
        return stats
    except Exception as e:
        print(f"Error fetching user dashboard stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load dashboard stats: {str(e)}"
        )


@router.post("/admin/initialize-wallets", dependencies=[Depends(require_admin)])
async def admin_initialize_wallets():
    """
    Initialize wallets for all existing users who don't have one.
    Only accessible by admins.
    """
    modified_count = await user_manager.initialize_wallet_for_existing_users()
    return {"message": f"Initialized wallets for {modified_count} users"}


@router.post("/users/follow")
async def follow_user(
    target_id: str = Query(..., description="ID of the user to follow"),
    user_data: dict = Depends(require_user)
):
    """
    Follow a user - requires authentication.

    Args:
        target_id: ID of the user to follow (query parameter)

    Returns:
        Success message if operation completed
    """
    # Get current user from auth token
    current_user = await user_manager.get_user_by_email(user_data["email"])
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current user not found"
        )

    # Check if target user exists
    target_user = await user_manager.get_user(target_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )

    # Enforce expert-only follow
    if not target_user.isExpert:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only follow expert users"
        )

    # Prevent following yourself
    if current_user.id == target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot follow yourself"
        )

    # Check if already following
    if await user_manager.is_following(current_user.id, target_id):
        return {"message": "Already following this user"}

    # Follow the user
    success = await user_manager.follow_user(current_user.id, target_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to follow user"
        )

    return {"message": f"You are now following {target_user.firstName} {target_user.lastName}"}


@router.post("/users/unfollow")
async def unfollow_user(
    target_id: str = Query(..., description="ID of the user to unfollow"),
    user_data: dict = Depends(require_user)
):
    """
    Unfollow a user - requires authentication.

    Args:
        target_id: ID of the user to unfollow (query parameter)

    Returns:
        Success message if operation completed
    """
    # Get current user from auth token
    current_user = await user_manager.get_user_by_email(user_data["email"])
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current user not found"
        )

    # Check if target user exists
    target_user = await user_manager.get_user(target_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )

    # Check if not following
    if not await user_manager.is_following(current_user.id, target_id):
        return {"message": "You are not following this user"}

    # Unfollow the user
    success = await user_manager.unfollow_user(current_user.id, target_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unfollow user"
        )

    return {"message": f"You have unfollowed {target_user.firstName} {target_user.lastName}"}


@router.get("/users/following/status")
async def check_following_status(
    target_id: str = Query(...,
                           description="ID of the user to check if following"),
    user_data: dict = Depends(require_user)
):
    """
    Check if the authenticated user is following another user.

    Args:
        target_id: ID of the user to check if following (query parameter)

    Returns:
        Boolean indicating whether the authenticated user follows target_id
    """
    # Get current user from auth token
    current_user = await user_manager.get_user_by_email(user_data["email"])
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Current user not found"
        )

    try:
        # Check if target user exists
        target_user = await user_manager.get_user(target_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found"
            )

        is_following = await user_manager.is_following(current_user.id, target_id)
        return {"is_following": is_following}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )


@router.put("/users/{user_id}", response_model=User)
async def update_user_profile(user_id: str, user_update: UserProfileUpdate):
    """
    Update a user's profile information.

    Returns the updated user if found, raises 404 if not found.
    """
    # First check if user exists
    existing_user = await user_manager.get_user(user_id)
    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Filter out None values to only update provided fields
    update_data = {k: v for k, v in user_update.model_dump().items()
                   if v is not None}

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No valid update fields provided"
        )

    updated_user = await user_manager.update_user(user_id, update_data)
    if not updated_user:
        raise HTTPException(
            status_code=500,
            detail="Failed to update user"
        )

    return updated_user


@router.get("/role")
async def get_role(user_data: dict = Depends(get_current_user)):
    """
    Get the role of the currently authenticated user.
    """
    return {"role": user_data["role"]}


@router.post("/users/subscribe")
async def subscribe(user_data: dict = Depends(require_user)):
    """
    Subscribe the current user by deducting 10000 coins from their wallet
    and changing their type from 'free' to 'paid'.
    
    Returns:
        Subscription result with success status and message
    """
    try:
        # Get current user from auth token
        current_user = await user_manager.get_user_by_email(user_data["email"])
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Current user not found"
            )
        
        result = await user_manager.subscribe_user(current_user.id)
        
        # If not successful, return error
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )
                # Return the result directly (success, message, and user data if available)
        return {
            "success": True,
            "message": "Subscription successful"
        }
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Unexpected error in subscribe endpoint: {e}")
        # Return a proper response even on unexpected errors
        return {
            "success": False,
            "message": "An error occurred during subscription process"
        }

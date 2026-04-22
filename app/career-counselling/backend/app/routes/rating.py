from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional, Dict

from app.models.rating import RatingCreate, RatingResponse, RatingUpdate
from app.managers.rating import RatingManager
from app.core.auth_utils import require_user, get_current_user

router = APIRouter()
rating_manager = RatingManager()

@router.post("/experts/{expert_id}/ratings", response_model=Dict)
async def create_rating(
    expert_id: str,
    rating_data: RatingCreate,
    user_data: dict = Depends(require_user)
):
    """
    Create a new rating for an expert.
    Returns the created rating.
    """
    try:
        # Check if the user is rating themselves
        if user_data.get("isExpert", False):
            # Get the expert's info
            from app.managers.expert import ExpertManager
            expert_manager = ExpertManager()
            expert = await expert_manager.get_expert_by_user_id(user_data["id"])

            if expert and expert.expertID == expert_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Experts cannot rate themselves"
                )

        rating = await rating_manager.create_rating(
            expertId=expert_id,
            userId=user_data["id"],
            rating=rating_data.rating,
            comment=rating_data.comment,
            isAnonymous=rating_data.isAnonymous
        )

        # Get the updated average rating for the expert
        from app.managers.expert import ExpertManager
        expert_manager = ExpertManager()
        expert = await expert_manager.get_expert(expert_id)

        # Return both the rating and the new average
        return {
            "rating": rating,
            "newAverageRating": expert.rating if expert else None
        }
    except Exception as e:
        print(f"Error creating rating: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create rating"
        )

@router.put("/experts/{expert_id}/ratings", response_model=Dict)
async def update_rating(
    expert_id: str,
    rating_data: RatingUpdate,
    user_data: dict = Depends(require_user)
):
    """
    Update a user's existing rating for an expert.
    """
    try:
        # First, check if the user has already rated this expert
        existing_rating = await rating_manager.get_user_rating_for_expert(
            expertId=expert_id,
            userId=user_data["id"]
        )

        if not existing_rating:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No existing rating found to update"
            )

        # Update the rating
        updated_rating = await rating_manager.update_rating(
            rating_id=existing_rating.id,
            rating=rating_data.rating,
            comment=rating_data.comment,
            isAnonymous=rating_data.isAnonymous
        )

        if not updated_rating:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update rating"
            )

        # Get the updated average rating for the expert
        from app.managers.expert import ExpertManager
        expert_manager = ExpertManager()
        expert = await expert_manager.get_expert(expert_id)

        # Return both the rating and the new average
        return {
            "rating": updated_rating,
            "newAverageRating": expert.rating if expert else None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating rating: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update rating"
        )

@router.get("/experts/{expert_id}/ratings", response_model=List[RatingResponse])
async def get_expert_ratings(
    expert_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """
    Get all ratings for a specific expert.
    """
    return await rating_manager.get_expert_ratings(
        expertId=expert_id,
        skip=skip,
        limit=limit
    )

@router.get("/experts/{expert_id}/ratings/with-user-info")
async def get_expert_ratings_with_user_info(
    expert_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """
    Get all ratings for a specific expert with user information.
    Anonymous ratings will show "Anonymous User" instead of the user's name.
    """
    return await rating_manager.get_expert_ratings_with_user_info(
        expertId=expert_id,
        skip=skip,
        limit=limit
    )

@router.get("/experts/{expert_id}/ratings/user", response_model=Dict)
async def get_user_rating(
    expert_id: str,
    user_data: dict = Depends(require_user)
):
    """
    Get the current user's rating for a specific expert.
    """
    rating = await rating_manager.get_user_rating_for_expert(
        expertId=expert_id,
        userId=user_data["id"]
    )

    if rating:
        return {"rating": rating.rating, "id": rating.id}
    else:
        return {"rating": None, "id": None}

@router.get("/ratings/{rating_id}", response_model=RatingResponse)
async def get_rating_by_id(
    rating_id: str,
    user_data: dict = Depends(require_user)
):
    """
    Get a rating by ID. Users can only fetch their own ratings or ratings for experts they represent.
    """
    rating = await rating_manager.get_rating(rating_id)
    
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found"
        )
    
    # Check if the user is authorized to see this rating
    # Either the user created the rating or the user is the expert being rated
    if rating.userId != user_data["id"]:
        # Check if user is the expert
        if user_data.get("isExpert", False):
            from app.managers.expert import ExpertManager
            expert_manager = ExpertManager()
            expert = await expert_manager.get_expert_by_user_id(user_data["id"])
            
            if not expert or expert.expertID != rating.expertId:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorized to view this rating"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this rating"
            )
    
    return rating
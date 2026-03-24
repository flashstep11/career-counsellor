from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.rating import Rating, RatingResponse
from app.core.database import get_database


class RatingManager:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.ratings
        self.experts_collection = self.db.experts
        self.users_collection = self.db.users

    async def create_rating(self, expertId: str, userId: str, rating: int, comment: Optional[str] = None, isAnonymous: bool = False) -> RatingResponse:
        """
        Create a new rating for an expert.

        Args:
            expertId (str): ID of the expert being rated
            userId (str): ID of the user giving the rating
            rating (int): Rating value (1-5)
            comment (Optional[str]): Optional comment with the rating
            isAnonymous (bool): Whether the rating should be anonymous

        Returns:
            RatingResponse: Created rating with response details
        """
        # Check if user has already rated this expert
        existing_rating = await self.collection.find_one({
            "expertId": expertId,
            "userId": userId
        })

        if existing_rating:
            return await self.update_rating(str(existing_rating["_id"]), rating, comment, isAnonymous)

        # Create new rating
        rating_obj = Rating(
            expertId=expertId,
            userId=userId,
            rating=rating,
            comment=comment,
            isAnonymous=isAnonymous,
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )

        rating_dict = rating_obj.model_dump()

        # Insert the rating
        result = await self.collection.insert_one(rating_dict)
        rating_dict["id"] = str(result.inserted_id)

        # Update the expert's average rating
        await self._update_expert_average_rating(expertId)

        return RatingResponse(**rating_dict)

    async def update_rating(self, rating_id: str, rating: int, comment: Optional[str] = None, isAnonymous: Optional[bool] = None) -> Optional[RatingResponse]:
        """
        Update an existing rating.

        Args:
            rating_id (str): ID of the rating to update
            rating (int): New rating value
            comment (Optional[str]): New comment
            isAnonymous (Optional[bool]): Whether the rating should be anonymous

        Returns:
            Optional[RatingResponse]: Updated rating if successful, None otherwise
        """
        try:
            # Get the current rating to find the expert ID
            current_rating = await self.collection.find_one({"_id": ObjectId(rating_id)})
            if not current_rating:
                return None

            expertId = current_rating["expertId"]

            # Update the rating
            update_data = {
                "rating": rating,
                "updatedAt": datetime.utcnow()
            }

            if comment is not None:
                update_data["comment"] = comment
                
            if isAnonymous is not None:
                update_data["isAnonymous"] = isAnonymous

            result = await self.collection.update_one(
                {"_id": ObjectId(rating_id)},
                {"$set": update_data}
            )

            if result.modified_count:
                # Update the expert's average rating
                await self._update_expert_average_rating(expertId)

                # Return updated rating
                updated_rating = await self.collection.find_one({"_id": ObjectId(rating_id)})
                updated_rating["id"] = str(updated_rating["_id"])
                return RatingResponse(**updated_rating)

            return None
        except Exception as e:
            print(f"Error updating rating: {e}")
            return None

    async def get_rating(self, rating_id: str) -> Optional[RatingResponse]:
        """
        Get a rating by ID.

        Args:
            rating_id (str): ID of the rating to retrieve

        Returns:
            Optional[RatingResponse]: Rating if found, None otherwise
        """
        try:
            rating = await self.collection.find_one({"_id": ObjectId(rating_id)})
            if rating:
                rating["id"] = str(rating["_id"])
                return RatingResponse(**rating)
            return None
        except Exception as e:
            print(f"Error retrieving rating: {e}")
            return None

    async def get_user_rating_for_expert(self, expertId: str, userId: str) -> Optional[RatingResponse]:
        """
        Get a user's rating for a specific expert.

        Args:
            expertId (str): ID of the expert
            userId (str): ID of the user

        Returns:
            Optional[RatingResponse]: Rating if found, None otherwise
        """
        try:
            rating = await self.collection.find_one({
                "expertId": expertId,
                "userId": userId
            })

            if rating:
                rating["id"] = str(rating["_id"])
                return RatingResponse(**rating)
            return None
        except Exception as e:
            print(f"Error retrieving user rating for expert: {e}")
            return None

    async def get_expert_ratings(self, expertId: str, skip: int = 0, limit: int = 10) -> List[RatingResponse]:
        """
        Get all ratings for a specific expert.

        Args:
            expertId (str): ID of the expert
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return

        Returns:
            List[RatingResponse]: List of ratings for the expert
        """
        cursor = self.collection.find({"expertId": expertId})
        cursor.sort("createdAt", -1)  # Sort by creation time, newest first
        cursor.skip(skip).limit(limit)

        ratings = []
        async for rating in cursor:
            rating["id"] = str(rating["_id"])
            ratings.append(RatingResponse(**rating))

        return ratings

    async def get_expert_ratings_with_user_info(self, expertId: str, skip: int = 0, limit: int = 10) -> List[dict]:
        """
        Get all ratings for a specific expert with user information.

        Args:
            expertId (str): ID of the expert
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return

        Returns:
            List[dict]: List of ratings with user info for the expert
        """
        cursor = self.collection.find({"expertId": expertId})
        cursor.sort("createdAt", -1)  # Sort by creation time, newest first
        cursor.skip(skip).limit(limit)

        ratings_with_user_info = []
        async for rating in cursor:
            rating_id = str(rating["_id"])
            user_id = rating["userId"]
            is_anonymous = rating.get("isAnonymous", False)
            
            rating_with_user = {
                "id": rating_id,
                "expertId": rating["expertId"],
                "rating": rating["rating"],
                "comment": rating.get("comment"),
                "createdAt": rating.get("createdAt"),
                "updatedAt": rating.get("updatedAt"),
                "isAnonymous": is_anonymous
            }
            
            if is_anonymous:
                rating_with_user["userName"] = "Anonymous User"
                rating_with_user["userAvatar"] = None  # Default avatar for anonymous users
            else:
                # Fetch user info
                user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
                if user:
                    rating_with_user["userName"] = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()
                    rating_with_user["userAvatar"] = user.get("avatar")
                else:
                    rating_with_user["userName"] = "Unknown User"
                    rating_with_user["userAvatar"] = None
            
            ratings_with_user_info.append(rating_with_user)

        return ratings_with_user_info

    async def _update_expert_average_rating(self, expertId: str) -> bool:
        """
        Calculate and update the average rating for an expert.

        Args:
            expertId (str): ID of the expert

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Calculate average rating
            pipeline = [
                {"$match": {"expertId": expertId}},
                {"$group": {"_id": None, "averageRating": {"$avg": "$rating"}}}
            ]

            result = await self.collection.aggregate(pipeline).to_list(length=1)

            if not result:
                # No ratings yet, don't update
                return False

            average_rating = result[0]["averageRating"]

            # Update the expert's rating
            await self.experts_collection.update_one(
                {"_id": ObjectId(expertId)},
                {"$set": {"rating": round(average_rating, 1)}}
            )

            return True
        except Exception as e:
            print(f"Error updating expert average rating: {e}")
            return False
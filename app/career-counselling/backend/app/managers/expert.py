from typing import List, Optional, Dict, Tuple
from datetime import datetime
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
from app.models.expert import Expert, ExpertResponse, ExpertUpdate
from app.core.database import get_database


class ExpertManager:
    def __init__(self):
        """Initialize ExpertManager with database connection."""
        self.db = get_database()
        self.collection = self.db.experts

    @staticmethod
    async def get_expert_by_id(expert_id: str) -> Optional[ExpertResponse]:
        """
        Static method to retrieve an expert by ID.

        Args:
            expert_id (str): ID of the expert to retrieve

        Returns:
            Optional[ExpertResponse]: Expert if found, None otherwise
        """
        db = get_database()
        try:
            expert = await db.experts.find_one({"_id": ObjectId(expert_id)})
            if expert:
                expert["expertID"] = str(expert["_id"])
                user = await db.users.find_one({"_id": ObjectId(expert["userId"])})
                expert["userDetails"] = user
                return ExpertResponse(**expert)
            return None
        except Exception as e:
            print(f"Error retrieving expert by ID: {e}")
            return None

    async def create_expert(self, expert: Expert) -> Expert:
        """
        Create a new expert profile.

        Args:
            expert (Expert): Expert object containing profile details

        Returns:
            Expert: Created expert profile with generated ID
        """
        expert_dict = expert.model_dump()
        expert_dict["createdAt"] = datetime.utcnow()
        expert_dict["updatedAt"] = expert_dict["createdAt"]

        await self.db.users.update_one(
            {"_id": ObjectId(expert_dict["userId"])},
            {"$set": {"isExpert": True}}
        )

        result = await self.collection.insert_one(expert_dict)
        expert_dict["_id"] = str(result.inserted_id)

        return Expert(**expert_dict)

    async def get_expert(self, expert_id: str) -> Optional[ExpertResponse]:
        """
        Retrieve an expert profile by ID.

        Args:
            expert_id (str): ID of the expert to retrieve

        Returns:
            Optional[Expert]: Expert profile if found, None otherwise
        """
        try:
            expert = await self.collection.find_one(
                {"_id": ObjectId(expert_id)}
            )
            if expert:
                expert["expertID"] = str(expert["_id"])
                user = await self.db.users.find_one(
                    {"_id": ObjectId(expert["userId"])}
                )
                expert["userDetails"] = user
                return ExpertResponse(**expert)
            return None
        except Exception as e:
            print(f"Error retrieving expert: {e}")
            return None

    async def get_experts(self,
                          skip: int = 0,
                          limit: int = 10,
                          sortBy: str = None,
                          available: bool = None
                          ) -> Tuple[List[ExpertResponse], int]:
        """
        Retrieve a list of expert profiles with pagination, sorting and filtering.

        Args:
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            sortBy (str): Field to sort by (meetingCost, rating, studentsGuided)
            available (bool): Filter by availability if True

        Returns:
            Tuple[List[ExpertResponse], int]: List of expert profiles and total count
        """
        # Build filter query
        query = {}
        if available is not None:
            query["available"] = available
        
        # Build sort options with secondary sorting
        sort_options = []
        if sortBy == "meetingCost":
            sort_options.append(("meetingCost", ASCENDING))
            # Secondary sort by rating when meeting costs are equal
            sort_options.append(("rating", DESCENDING))
        elif sortBy == "rating":
            sort_options.append(("rating", DESCENDING))
            # Secondary sort by students guided when ratings are equal
            sort_options.append(("studentsGuided", DESCENDING))
        elif sortBy == "studentsGuided":
            sort_options.append(("studentsGuided", DESCENDING))
            # Secondary sort by rating when students guided are equal
            sort_options.append(("rating", DESCENDING))
            
        # Always add a tertiary sort by creation date for consistency
        sort_options.append(("createdAt", DESCENDING))
        
        # Count total matching documents for pagination
        total_count = await self.collection.count_documents(query)
        
        # Execute the query with pagination and sorting
        cursor = self.collection.find(query)
        if sort_options:
            cursor = cursor.sort(sort_options)
            
        cursor = cursor.skip(skip).limit(limit)

        experts = []
        async for expert in cursor:
            expert["expertID"] = str(expert["_id"])
            # fetch user details
            user = await self.db.users.find_one(
                {"_id": ObjectId(expert["userId"])}
            )
            expert["userDetails"] = user
            experts.append(ExpertResponse(**expert))

        return experts, total_count

    async def get_expert_by_user_id(self, user_id: str) -> Optional[ExpertResponse]:
        """
        Get an expert by their user ID.

        Args:
            user_id (str): The ID of the user who is an expert

        Returns:
            Optional[ExpertResponse]: The expert if found, None otherwise
        """
        try:
            expert = await self.collection.find_one({"userId": user_id})
            if expert:
                # Required by ExpertResponse model
                expert["expertID"] = str(expert["_id"])
                # Convert ObjectId to string
                expert["_id"] = str(expert["_id"])

                # Fetch the user details as required by ExpertResponse model
                user = await self.db.users.find_one({"_id": ObjectId(user_id)})
                if user:
                    # Convert ObjectId to string
                    user["_id"] = str(user["_id"])
                    expert["userDetails"] = user
                else:
                    # If we can't get user details, provide empty object
                    expert["userDetails"] = {}

                return ExpertResponse(**expert)
            return None
        except Exception as e:
            print(f"Error retrieving expert by user ID: {e}")
            return None

    async def update_expert(self, expert_id: str, expert_update: ExpertUpdate) -> Optional[ExpertResponse]:
        """
        Update an expert profile.

        Args:
            expert_id (str): ID of the expert to update
            expert_update (ExpertUpdate): Data to update

        Returns:
            Optional[ExpertResponse]: Updated expert profile if successful, None otherwise
        """
        try:
            # Get current expert profile
            expert = await self.collection.find_one({"_id": ObjectId(expert_id)})
            if not expert:
                return None

            update_data = expert_update.model_dump(exclude_none=True)

            # Separate user data (firstName, lastName) from expert data
            user_update = {}
            if "firstName" in update_data:
                user_update["firstName"] = update_data.pop("firstName")
            if "lastName" in update_data:
                user_update["lastName"] = update_data.pop("lastName")

            # Update expert data if there are fields to update
            expert_updated = False
            if update_data:
                # Add updatedAt timestamp
                update_data["updatedAt"] = datetime.utcnow()

                result = await self.collection.update_one(
                    {"_id": ObjectId(expert_id)},
                    {"$set": update_data}
                )
                expert_updated = result.modified_count > 0 or result.matched_count > 0

            # Update user data if there are user fields to update
            user_updated = False
            if user_update:
                user_result = await self.db.users.update_one(
                    {"_id": ObjectId(expert["userId"])},
                    {"$set": user_update}
                )
                user_updated = user_result.modified_count > 0 or user_result.matched_count > 0

            if expert_updated or user_updated:
                # Return the updated expert profile
                return await self.get_expert(expert_id)

            # No updates were made but the record exists
            return await self.get_expert(expert_id)

        except Exception as e:
            print(f"Error updating expert: {e}")
            return None

    async def count_experts(self) -> int:
        """
        Count the total number of experts in the database.

        Returns:
            int: Total number of experts
        """
        return await self.collection.count_documents({})

    async def get_all_experts(self, search: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
        query = {"isExpert": True}

        if search:
            query["$or"] = [
                {"firstName": {"$regex": search, "$options": "i"}},
                {"lastName": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"specialization": {"$regex": search, "$options": "i"}}
            ]

        if status:
            query["expertStatus"] = status

        experts = await self.db.users.find(query).to_list(None)
        for expert in experts:
            expert["_id"] = str(expert["_id"])
        return experts

    async def update_expert_approval(self, expert_id: str, status: str) -> bool:
        try:
            result = await self.db.users.update_one(
                {"_id": ObjectId(expert_id), "isExpert": True},
                {
                    "$set": {
                        "expertStatus": status,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                # Get the expert details for activity logging
                expert = await self.db.users.find_one({"_id": ObjectId(expert_id)})
                if expert:
                    # Get UserManager to log activity
                    from app.managers.user import UserManager
                    user_manager = UserManager()

                    expert_name = f"{expert.get('firstName', '')} {expert.get('lastName', '')}"
                    await user_manager.log_activity(
                        activity_type="expert_approval",
                        description=f"Expert {expert_name} was {status}",
                        user_id=str(expert["_id"])
                    )
                return True
            return False
        except Exception as e:
            print(f"Error updating expert approval: {e}")
            return False

    async def make_user_expert(self, user_id: str) -> bool:
        """
        Convert a regular user into an expert (pending approval).
        Returns True if successful, False if user not found.
        """
        try:
            result = await self.db.users.update_one(
                {"_id": ObjectId(user_id), "isExpert": False},
                {
                    "$set": {
                        "isExpert": True,
                        "expertStatus": "pending",
                        "updatedAt": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error making user expert: {e}")
            return False

    async def create_from_application(self, application) -> Optional[ExpertResponse]:
        """
        Create a new expert profile from an approved application

        Args:
            application: The approved application data

        Returns:
            Optional[ExpertResponse]: The created expert profile if successful, None otherwise
        """
        try:
            # Convert education string to expected list format
            education_list = [
                {
                    "degree": application.education,
                    "institution": application.organization,
                    "year": datetime.utcnow().year  # Default to current year
                }
            ]

            # Construct expert data with all required fields
            expert_data = {
                "userId": application.userId,
                "specialization": application.specialization,
                "bio": application.bio,
                "meetingCost": float(application.meetingCost),
                "education": education_list,
                "organization": application.organization,
                # Updated from "position" to "currentPosition"
                "currentPosition": application.currentPosition,
                "rating": 0.0,
                "ratingCount": 0,
                "available": True,
                "calendarEmbedUrl": "",  # Empty string for required field
                "socialLinks": {},  # Empty dict for required field
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }

            # Insert expert record
            result = await self.collection.insert_one(expert_data)
            expert_id = str(result.inserted_id)

            # Update user to be an expert
            await self.db.users.update_one(
                {"_id": ObjectId(application.userId)},
                {
                    "$set": {
                        "isExpert": True,
                        "expertId": expert_id,
                        "expertStatus": "approved",
                        "updatedAt": datetime.utcnow()
                    }
                }
            )

            # Log activity
            from app.managers.user import UserManager
            user_manager = UserManager()
            user = await user_manager.get_user(application.userId)

            if user:
                expert_name = f"{user.firstName} {user.lastName}"
                await user_manager.log_activity(
                    activity_type="expert_creation",
                    description=f"New expert {expert_name} created from application",
                    user_id=application.userId
                )

            # Return the created expert profile
            return await self.get_expert(expert_id)

        except Exception as e:
            print(f"Error creating expert from application: {e}")
            return None

    async def increment_students_guided(self, expert_id: str) -> bool:
        """
        Increment the studentsGuided counter for an expert.
        
        Args:
            expert_id (str): ID of the expert whose counter should be incremented
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(expert_id)},
                {"$inc": {"studentsGuided": 1}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error incrementing students guided count: {e}")
            return False

    async def set_profile_video(self, expert_id: str, video_id: Optional[str]) -> bool:
        """
        Set (or clear) the profile_video_id for an expert.

        Args:
            expert_id (str): ID of the expert to update
            video_id (Optional[str]): ID of the video to set as profile video,
                                      or None to clear the selection

        Returns:
            bool: True if the update was successful, False otherwise
        """
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(expert_id)},
                {"$set": {"profile_video_id": video_id, "updatedAt": datetime.utcnow()}}
            )
            return result.matched_count > 0
        except Exception as e:
            print(f"Error setting profile video for expert {expert_id}: {e}")
            return False

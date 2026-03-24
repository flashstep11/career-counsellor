from typing import List, Optional, Dict
from datetime import datetime
from bson import ObjectId
from app.models.user import User, UserProfileUpdate
from app.core.database import get_database
from app.models.notification import Notification, NotificationType


class UserManager:
    def __init__(self):
        """Initialize UserManager with database connection."""
        self.db = get_database()
        self.collection = self.db.users
        # Delay import to avoid circular imports
        self._notification_manager = None

    @property
    def notification_manager(self):
        """Lazy load the NotificationManager to avoid circular imports"""
        if self._notification_manager is None:
            from app.managers.notification import NotificationManager
            self._notification_manager = NotificationManager()
        return self._notification_manager

    async def create_user(self, user: User) -> User:
        """
        Create a new user.

        Args:
            user (User): User object containing profile details

        Returns:
            User: Created user with generated ID
        """
        user_dict = user.model_dump()
        user_dict["createdAt"] = datetime.utcnow()
        user_dict["updatedAt"] = user_dict["createdAt"]

        result = await self.collection.insert_one(user_dict)
        user_dict["uid"] = str(result.inserted_id)

        return User(**user_dict)

    async def get_user(self, user_id: str) -> Optional[User]:
        """
        Retrieve a user by ID.

        Args:
            user_id (str): ID of the user to retrieve

        Returns:
            Optional[User]: User if found, None otherwise
        """
        try:
            user = await self.collection.find_one({"_id": ObjectId(user_id)})
            if user:
                # Convert ObjectId to string and use "id"
                user["id"] = str(user["_id"])
                # Ensure _id is also converted to string
                user["_id"] = str(user["_id"])
                return User(**user)
            return None
        except Exception as e:
            print(f"Error retrieving user: {e}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Retrieve a user by email.

        Args:
            email (str): Email of the user to retrieve

        Returns:
            Optional[User]: User if found, None otherwise
        """
        try:
            user = await self.collection.find_one({"email": email})
            if user:
                # Convert ObjectId to string and use "id"
                user["id"] = str(user["_id"])
                # Ensure _id is also converted to string
                user["_id"] = str(user["_id"])
                return User(**user)
            return None
        except Exception as e:
            print(f"Error retrieving user by email: {e}")
            return None

    async def update_user(self,
                          user_id: str,
                          update_data: dict) -> Optional[User]:
        """
        Update a user's profile information.

        Args:
            user_id (str): ID of the user to update
            update_data (dict): Dictionary containing fields to update

        Returns:
            Optional[User]: Updated user if found and updated, None otherwise
        """
        try:
            # Set the updated timestamp
            update_data["updatedAt"] = datetime.utcnow()

            # Ensure the update only modifies allowed fields
            allowed_fields = {
                "firstName", "middleName", "lastName", "gender",
                "category", "home_state", "mobileNo", "type", "updatedAt",
                "role", "wallet", "status",
                # Onboarding fields
                "grade", "preferred_stream", "target_college",
                "interests", "career_goals", "onboarding_completed",
                # Profile picture
                "profile_picture_url",
            }
            filtered_update = {k: v for k,
                               v in update_data.items() if k in allowed_fields}

            # Execute the update
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": filtered_update}
            )

            if result.modified_count:
                return await self.get_user(user_id)
            elif result.matched_count:
                # Document was found but no changes were made
                return await self.get_user(user_id)

            return None
        except Exception as e:
            print(f"Error updating user: {e}")
            return None

    async def get_users(
        self,
        skip: int = 0,
        limit: int = 10,
        is_expert: Optional[bool] = None
    ) -> List[User]:
        """
        Retrieve a list of users with optional filtering and pagination.

        Args:
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            is_expert (Optional[bool]): Filter by expert status

        Returns:
            List[User]: List of users matching the criteria
        """
        query = {}
        if is_expert is not None:
            query["isExpert"] = is_expert

        cursor = self.collection.find(query)
        cursor.skip(skip).limit(limit).sort("createdAt", -1)

        users = []
        async for user in cursor:
            user["_id"] = str(user["_id"])
            users.append(User(**user))

        return users

    async def follow_user(self, follower_id: str, target_id: str) -> bool:
        """
        Make a user follow another user.

        Args:
            follower_id (str): ID of the user who wants to follow
            target_id (str): ID of the user to be followed

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Prevent following yourself
            if follower_id == target_id:
                return False

            # Check if both users exist
            follower = await self.get_user(follower_id)
            target = await self.get_user(target_id)
            if not follower or not target:
                return False

            # Enforce that the target user is an expert
            if not target.isExpert:
                return False

            # Add target_id to follower's following list if not already following
            await self.collection.update_one(
                {"_id": ObjectId(follower_id)},
                {"$addToSet": {"following": target_id}}
            )

            # Add follower_id to target's followers list
            await self.collection.update_one(
                {"_id": ObjectId(target_id)},
                {"$addToSet": {"followers": follower_id}}
            )

            # Write a persistent follow record (prevent duplicates)
            existing = await self.db.follows.find_one(
                {"followerId": follower_id, "followedId": target_id}
            )
            if not existing:
                from datetime import datetime as _dt
                await self.db.follows.insert_one({
                    "followerId": follower_id,
                    "followedId": target_id,
                    "relationship_type": "follow",
                    "status": "accepted",
                    "createdAt": _dt.utcnow(),
                    "updatedAt": _dt.utcnow(),
                })

            # Create a notification for the target user (expert) that they gained a new follower
            if target.isExpert:
                # Create notification content
                notification_content = f"{follower.firstName} {follower.lastName} started following you"

                notification = Notification(
                    targetUserId=target_id,
                    sourceUserId=follower_id,
                    type=NotificationType.FOLLOW,
                    content=notification_content,
                    read=False
                )

                await self.notification_manager.create_notification(notification)

            return True
        except Exception as e:
            print(f"Error following user: {e}")
            return False

    async def unfollow_user(self, follower_id: str, target_id: str) -> bool:
        """
        Make a user unfollow another user.

        Args:
            follower_id (str): ID of the user who wants to unfollow
            target_id (str): ID of the user to be unfollowed

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Check if both users exist
            follower = await self.get_user(follower_id)
            target = await self.get_user(target_id)
            if not follower or not target:
                return False

            # Remove target_id from follower's following list
            await self.collection.update_one(
                {"_id": ObjectId(follower_id)},
                {"$pull": {"following": target_id}}
            )

            # Remove follower_id from target's followers list
            await self.collection.update_one(
                {"_id": ObjectId(target_id)},
                {"$pull": {"followers": follower_id}}
            )

            # Remove the follow record from db.follows
            await self.db.follows.delete_one(
                {"followerId": follower_id, "followedId": target_id}
            )

            return True
        except Exception as e:
            print(f"Error unfollowing user: {e}")
            return False

    async def is_following(self, follower_id: str, target_id: str) -> bool:
        """
        Check if a user is following another user.

        Args:
            follower_id (str): ID of the potential follower
            target_id (str): ID of the potential target

        Returns:
            bool: True if follower is following target, False otherwise
        """
        try:
            follower = await self.get_user(follower_id)
            if not follower:
                return False

            return target_id in follower.following
        except Exception as e:
            print(f"Error checking following status: {e}")
            return False

    async def initialize_wallet_for_existing_users(self) -> int:
        result = await self.db.users.update_many(
            {"wallet": {"$exists": False}},
            {"$set": {"wallet": 200}}  # Default wallet amount is 200
        )
        return result.modified_count

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[User]:
        """
        Static method to retrieve a user by ID.

        Args:
            user_id (str): ID of the user to retrieve

        Returns:
            Optional[User]: User if found, None otherwise
        """
        db = get_database()
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                # Convert ObjectId to string
                user["id"] = str(user["_id"])
                user["_id"] = str(user["_id"])
                return User(**user)
            return None
        except Exception as e:
            print(f"Error retrieving user by ID: {e}")
            return None

    @staticmethod
    async def update_wallet(user_id: str, amount_change: float) -> bool:
        """
        Update a user's wallet balance.

        Args:
            user_id (str): ID of the user whose wallet to update
            amount_change (float): Amount to add (positive) or subtract (negative)

        Returns:
            bool: True if successful, False otherwise
        """
        db = get_database()
        try:
            # First, get the current wallet balance
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return False

            current_balance = user.get("wallet", 0)
            new_balance = current_balance + amount_change

            # Ensure balance doesn't go negative
            if new_balance < 0:
                return False

            # Update the wallet balance
            result = await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"wallet": new_balance}}
            )

            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating wallet: {e}")
            return False

    async def get_all_users(self, search: Optional[str] = None) -> List[Dict]:
        query = {}
        if search:
            query = {
                "$or": [
                    {"firstName": {"$regex": search, "$options": "i"}},
                    {"lastName": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}}
                ]
            }
        users = await self.db.users.find(query).to_list(None)
        for user in users:
            user["_id"] = str(user["_id"])
        return users

    async def get_dashboard_stats(self) -> Dict:
        total_users = await self.db.users.count_documents({})
        total_experts = await self.db.users.count_documents({"isExpert": True})
        total_blogs = await self.db.blogs.count_documents({})
        total_videos = await self.db.videos.count_documents({})
        pending_experts = await self.db.users.count_documents({
            "isExpert": True,
            "expertStatus": "pending"
        })

        recent_activities = await self.get_recent_activities(5)

        return {
            "totalUsers": total_users,
            "totalExperts": total_experts,
            "totalBlogs": total_blogs,
            "totalVideos": total_videos,
            "pendingExpertApprovals": pending_experts,
            "activities": recent_activities
        }

    async def get_user_dashboard_stats(self, user_email: str) -> Dict:
        """Calculate dashboard stats for a specific user"""
        from datetime import datetime, timedelta
        
        # Get user to calculate profile strength
        user = await self.get_user_by_email(user_email)
        if not user:
            return {
                "profileStrength": 0,
                "unreadReplies": 0,
                "upcomingMeetingsToday": 0,
                "weeklyGoals": []
            }
        
        # Calculate profile strength (out of 100)
        profile_fields = [
            user.firstName,
            user.lastName,
            user.email,
            user.gender,
            user.category and user.category != "unspecified",
            user.home_state,
            user.mobileNo
        ]
        filled_fields = sum(1 for field in profile_fields if field)
        profile_strength = int((filled_fields / len(profile_fields)) * 100)
        
        # Count unread notifications
        user_id_str = str(user.id) if hasattr(user, 'id') else None
        unread_count = 0
        if user_id_str:
            unread_count = await self.db.notifications.count_documents({
                "targetUserId": user_id_str,
                "read": False
            })
        
        # Count meetings scheduled for today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        meetings_today = 0
        if user_id_str:
            meetings_today = await self.db.meetings.count_documents({
                "userId": user_id_str,
                "status": "scheduled",
                "startTime": {"$gte": today_start, "$lt": today_end}
            })
        
        # Weekly goals (static for now, can be made dynamic later)
        weekly_goals = [
            {"id": 1, "title": "Connect with 1 Mentor", "completed": False},
            {"id": 2, "title": "Read 2 Articles", "completed": False},
            {"id": 3, "title": "Update Profile", "completed": profile_strength >= 80},
            {"id": 4, "title": "Join a Discussion", "completed": False}
        ]
        
        # Check if user has any posts (for "Join a Discussion" goal)
        if user_id_str:
            user_posts = await self.db.posts.count_documents({"userId": user_id_str})
            if user_posts > 0:
                weekly_goals[3]["completed"] = True
        
        return {
            "profileStrength": profile_strength,
            "unreadReplies": unread_count,
            "upcomingMeetingsToday": meetings_today,
            "weeklyGoals": weekly_goals
        }

    async def get_recent_activities(self, limit: int = 5) -> List[Dict]:
        activities = await self.db.activities.find({}).sort("timestamp", -1).limit(limit).to_list(None)
        for activity in activities:
            activity["_id"] = str(activity["_id"])
            if "userId" in activity:
                activity["userId"] = str(activity["userId"])
        return activities

    async def log_activity(self, activity_type: str, description: str, user_id: Optional[str] = None):
        activity = {
            "activityType": activity_type,
            "description": description,
            "timestamp": datetime.utcnow(),
        }
        if user_id:
            activity["userId"] = ObjectId(user_id)
            user = await self.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                activity["userName"] = f"{user.get('firstName', '')} {user.get('lastName', '')}"

        await self.db.activities.insert_one(activity)

    async def update_to_expert(self, user_id: str, expert_id: str) -> bool:
        """
        Update a user to expert status after their application is approved

        Args:
            user_id (str): ID of the user to update
            expert_id (str): ID of the newly created expert profile

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "isExpert": True,
                        "expertId": expert_id,
                        "expertStatus": "approved",
                        "updatedAt": datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                # Get user details for notification and activity logging
                user = await self.get_user(user_id)
                if user:
                    # Create a notification for the user that their application was approved
                    notification = Notification(
                        targetUserId=user_id,
                        sourceUserId=None,  # System notification
                        type=NotificationType.EXPERT_APPROVAL,
                        content="Congratulations! Your expert application has been approved.",
                        read=False
                    )

                    await self.notification_manager.create_notification(notification)

                    # Log activity
                    user_name = f"{user.firstName} {user.lastName}"
                    await self.log_activity(
                        activity_type="expert_approval",
                        description=f"User {user_name} was approved as an expert",
                        user_id=user_id
                    )

                return True

            return False

        except Exception as e:
            print(f"Error updating user to expert: {e}")
            return False

    async def subscribe_user(self, user_id: str) -> Dict:
        """
        Subscribe a user by deducting coins and changing user type to paid.
        
        Args:
            user_id (str): ID of the user to subscribe
            
        Returns:
            Dict: Result with success status, message and updated user data if successful
        """
        try:
            subscription_cost = 10000
            
            # Get current user data
            user = await self.get_user(user_id)
            if not user:
                return {"success": False, "message": "User not found"}
                
            # Check if already subscribed
            if user.type == "paid":
                return {"success": False, "message": "User is already subscribed"}
                
            # Check wallet balance
            if user.wallet < subscription_cost:
                return {"success": False, "message": f"Insufficient funds. Required: {subscription_cost}, Available: {user.wallet}"}
                
            # Deduct coins and update user type
            current_balance = user.wallet
            new_balance = current_balance - subscription_cost
            
            result = await self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "wallet": new_balance,
                    "type": "paid",
                    "updatedAt": datetime.utcnow()
                }}
            )
            
            if result.modified_count > 0:
                # Log activity
                await self.log_activity(
                    activity_type="subscription",
                    description=f"User {user.firstName} {user.lastName} purchased a subscription",
                    user_id=user_id
                )
                
                # Create notification - in a separate try-except block to ensure it doesn't break the subscription process
                try:
                    from app.models.notification import Notification, NotificationType
                    # Check if SUBSCRIPTION type is available in the enum, if not use a safe fallback
                    notification_type = getattr(NotificationType, "SUBSCRIPTION", NotificationType.SYSTEM)
                    
                    notification = Notification(
                        targetUserId=user_id,
                        sourceUserId=None,  # System notification
                        type=notification_type,
                        content="Thank you for subscribing! You now have full access to all videos.",
                        read=False
                    )
                    await self.notification_manager.create_notification(notification)
                except Exception as notification_error:
                    # Log the notification error but don't fail the subscription
                    print(f"Error creating subscription notification: {notification_error}")
                    # Continue with the subscription process
                
                # Return updated user
                updated_user = await self.get_user(user_id)
                
                return {
                    "success": True,
                    "message": "Subscription successful",
                    "user": updated_user.model_dump() if updated_user else None
                }
            else:
                return {"success": False, "message": "Failed to update subscription status"}
        except Exception as e:
            print(f"Error subscribing user: {e}")
            return {"success": False, "message": str(e)}

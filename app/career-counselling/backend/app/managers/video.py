from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.video import VideoBase, Video, VideoResponse, VideoCreate
from app.models.expert import ExpertResponse
from app.core.database import get_database


class VideoManager:
    def __init__(self):
        """Initialize VideoManager with database connection."""
        self.db = get_database()
        self.collection = self.db.videos

    async def create_video(self, video: VideoCreate, user_id: str) -> VideoBase:
        """
        Create a new video entry.

        Args:
            video (VideoCreate): Video object containing details without userId
            user_id (str): ID of the user creating the video

        Returns:
            VideoBase: Created video entry with generated ID
        """
        video_dict = video.model_dump()
        video_dict["userId"] = user_id
        video_dict["createdAt"] = datetime.utcnow()
        video_dict["updatedAt"] = video_dict["createdAt"]
        video_dict["views"] = 0
        video_dict["likes"] = 0
        video_dict["likedBy"] = []

        # Ensure tags exist
        if "tags" not in video_dict or video_dict["tags"] is None:
            video_dict["tags"] = []

        # If refType is NA, set typeId to None
        if video_dict.get("refType") == "NA":
            video_dict["typeId"] = None

        result = await self.collection.insert_one(video_dict)
        video_dict["_id"] = str(result.inserted_id)
        video_dict["videoID"] = str(result.inserted_id)

        return Video(**video_dict)

    async def update_video(self, video_id: str, video_update: dict, user_id: Optional[str] = None):
        """
        Update a video. If user_id is None, it's an admin update (no ownership check).
        Otherwise, check that the user owns the video.
        """
        video_collection = await self.get_video_collection()

        # If user_id is provided (non-admin), check that the user owns the video
        if user_id:
            video = await video_collection.find_one({"_id": video_id, "userId": user_id})
            if not video:
                return None  # Video not found or user doesn't have permission
        else:
            # Admin mode - just check if the video exists
            video = await video_collection.find_one({"_id": video_id})
            if not video:
                return None  # Video not found

        # Update the video document
        update_data = {
            "$set": {
                "title": video_update.get("title", video.get("title")),
                "description": video_update.get("description", video.get("description")),
                "youtubeUrl": video_update.get("youtubeUrl", video.get("youtubeUrl")),
                "tags": video_update.get("tags", video.get("tags", [])),
                "previewDuration": video_update.get("previewDuration", video.get("previewDuration")),
                "refType": video_update.get("refType", video.get("refType")),
                "typeId": video_update.get("typeId", video.get("typeId")),
                "updatedAt": datetime.utcnow(),
            }
        }

        await video_collection.update_one({"_id": video_id}, update_data)

        # Return the updated video
        return await self.get_video(video_id)

    async def update_video_admin(self, video_id: str, video_data: dict) -> bool:
        """
        Update a video's details. Admin version that allows updating any field.
        Returns True if successful, False if video not found.
        """
        try:
            video_data["updatedAt"] = datetime.utcnow()
            result = await self.db.videos.update_one(
                {"_id": ObjectId(video_id)},
                {"$set": video_data}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating video: {e}")
            return False

    async def get_video(self, video_id: str) -> Optional[VideoResponse]:
        """
        Retrieve a video by ID.

        Args:
            video_id (str): ID of the video to retrieve

        Returns:
            Optional[VideoResponse]: Video if found, None otherwise
        """
        try:
            video = await self.collection.find_one({"_id": ObjectId(video_id)})
            if video:
                video["videoID"] = str(video["_id"])
                expert = await self.db.experts.find_one({"userId": video["userId"]})
                if expert:
                    expert["expertID"] = str(expert["_id"])
                    user = await self.db.users.find_one({"_id": ObjectId(expert["userId"])})
                    user["userID"] = str(user["_id"])
                    expert["userDetails"] = user
                    video["expertDetails"] = ExpertResponse(**expert)
                await self.collection.update_one(
                    {"_id": ObjectId(video_id)},
                    {"$inc": {"views": 1}}
                )
                video["views"] += 1
                return VideoResponse(**video)
            return None
        except Exception as e:
            print(f"Error retrieving video: {e}")
            return None

    async def get_videos_by_expert_id(self, expert_id: str, skip: int = 0, limit: int = 10) -> List[VideoResponse]:
        """
        Retrieve a list of videos by expert ID with pagination.

        Args:
            expert_id (str): ID of the expert whose videos to retrieve
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return

        Returns:
            List[VideoResponse]: List of videos by the expert
        """
        try:
            # Get the expert to find their user ID
            expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
            if not expert:
                return []

            # Get the user ID of the expert
            user_id = expert["userId"]

            # Find videos by this user ID
            query = {"userId": user_id}
            cursor = self.collection.find(query)
            cursor.skip(skip).limit(limit).sort("createdAt", -1)

            videos = []
            async for video in cursor:
                video["videoID"] = str(video["_id"])
                # Since we already have the expert, attach it directly
                expert_copy = expert.copy()
                expert_copy["expertID"] = str(expert_copy["_id"])
                user = await self.db.users.find_one({"_id": ObjectId(expert_copy["userId"])})
                if user:
                    user["userID"] = str(user["_id"])
                    expert_copy["userDetails"] = user
                    video["expertDetails"] = ExpertResponse(**expert_copy)
                    videos.append(VideoResponse(**video))

            return videos
        except Exception as e:
            print(f"Error retrieving videos by expert ID: {e}")
            return []

    async def get_videos(
        self,
        skip: int = 0,
        limit: int = 10,
        user_id: Optional[str] = None,
        college_branch_id: Optional[str] = None,
        expert_id: Optional[str] = None
    ) -> List[VideoResponse]:
        """
        Retrieve a list of videos with optional filtering and pagination.

        Args:
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            user_id (Optional[str]): Filter by user ID
            college_branch_id (Optional[str]): Filter by college branch ID
            expert_id (Optional[str]): Filter by expert ID

        Returns:
            List[VideoResponse]: List of videos matching the criteria
        """
        # If expert_id is provided, use the specialized method
        if expert_id:
            return await self.get_videos_by_expert_id(expert_id, skip, limit)

        query = {}
        if user_id:
            query["userId"] = user_id
        if college_branch_id:
            # Changed to filter by typeId when refType is collegebranch
            query["typeId"] = college_branch_id
            query["refType"] = "collegebranch"

        cursor = self.collection.find(query)
        cursor.skip(skip).limit(limit).sort("createdAt", -1)

        videos = []
        async for video in cursor:
            video["videoID"] = str(video["_id"])
            expert = await self.db.experts.find_one({"userId": video["userId"]})
            if expert:
                expert["expertID"] = str(expert["_id"])
                user = await self.db.users.find_one({"_id": ObjectId(expert["userId"])})
                if not user:
                    continue
                user["userID"] = str(user["_id"])
                expert["userDetails"] = user
                video["expertDetails"] = ExpertResponse(**expert)
            videos.append(VideoResponse(**video))

        return videos

    async def delete_video(self, video_id: str, user_id: Optional[str] = None) -> bool:
        """
        Delete a video from the database.
        If user_id is provided, checks that the user owns the video.
        If user_id is None, deletes the video without ownership check (admin mode).

        Args:
            video_id (str): ID of the video to delete
            user_id (Optional[str]): ID of the user attempting to delete the video

        Returns:
            bool: True if deletion was successful, False if video not found or unauthorized
        """
        try:
            # If user_id is provided, check ownership
            if user_id:
                # First check if video exists and belongs to the user
                video = await self.collection.find_one({"_id": ObjectId(video_id)})
                if not video:
                    return False

                # Check if the requesting user is the owner
                if video["userId"] != user_id:
                    return False

            # Delete the video (either after ownership check or directly for admin)
            result = await self.collection.delete_one(
                {"_id": ObjectId(video_id)}
            )
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting video: {e}")
            return False

    async def count_videos(
    self,
    user_id: Optional[str] = None,
    college_branch_id: Optional[str] = None,
    expert_id: Optional[str] = None
    ) -> int:
        """
        Count the total number of videos matching the criteria.

        Args:
            user_id (Optional[str]): Filter by user ID
            college_branch_id (Optional[str]): Filter by college branch ID
            expert_id (Optional[str]): Filter by expert ID

        Returns:
            int: Total number of videos
        """
        query = {}

        # If filtering by expert, first get their user ID
        if expert_id:
            try:
                expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
                if expert:
                    # Get the user ID of the expert
                    query["userId"] = expert["userId"]
            except Exception as e:
                print(f"Error finding expert for count: {e}")
                return 0

        # Add other filters
        if user_id and not expert_id:  # Only add if not already set by expert_id
            query["userId"] = user_id
        if college_branch_id:
            # Changed to filter by typeId when refType is collegebranch
            query["typeId"] = college_branch_id
            query["refType"] = "collegebranch"

        return await self.collection.count_documents(query)

    async def like_video(self, video_id: str, user_id: str) -> Optional[VideoResponse]:
        """
        Like or unlike a video.

        Args:
            video_id (str): ID of the video to like/unlike
            user_id (str): ID of the user performing the action

        Returns:
            Optional[VideoResponse]: Updated video if successful, None otherwise
        """
        try:
            # Get the video first to check if user has already liked it
            video = await self.collection.find_one({"_id": ObjectId(video_id)})
            if not video:
                return None

            liked_by = video.get("likedBy", [])

            if user_id in liked_by:
                # User has already liked the video, so unlike it
                result = await self.collection.update_one(
                    {"_id": ObjectId(video_id)},
                    {
                        "$pull": {"likedBy": user_id},
                        "$inc": {"likes": -1},
                        "$set": {"updatedAt": datetime.utcnow()}
                    }
                )
            else:
                # User hasn't liked the video yet, so like it
                result = await self.collection.update_one(
                    {"_id": ObjectId(video_id)},
                    {
                        "$addToSet": {"likedBy": user_id},
                        "$inc": {"likes": 1},
                        "$set": {"updatedAt": datetime.utcnow()}
                    }
                )

            if result.modified_count:
                return await self.get_video(video_id)
            return None
        except Exception as e:
            print(f"Error liking/unliking video: {e}")
            return None

    async def check_video_like(self, video_id: str, user_id: str) -> dict:
        """
        Check if a user has liked a specific video.

        Args:
            video_id (str): ID of the video to check
            user_id (str): ID of the user

        Returns:
            dict: Dictionary containing the like status
        """
        try:
            video = await self.collection.find_one({"_id": ObjectId(video_id)})
            if not video:
                return {"liked": False, "likes": 0}

            liked_by = video.get("likedBy", [])
            likes = video.get("likes", 0)

            return {
                "liked": user_id in liked_by,
                "likes": likes
            }
        except Exception as e:
            print(f"Error checking video like status: {e}")
            return {"liked": False, "likes": 0}

    async def get_videos_with_filters(
        self,
        skip: int = 0,
        limit: int = 10,
        category: Optional[str] = None,
        sort_by: str = "recent",
        type_id: Optional[str] = None,
        ref_type: Optional[str] = None
    ) -> List[VideoResponse]:
        """
        Retrieve a list of videos with pagination and filtering.

        Args:
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            category (Optional[str]): Filter by video category
            sort_by (str): Sort videos by: recent, views, popular/likes
            type_id (Optional[str]): ID of college or branch for college/branch specific videos
            ref_type (Optional[str]): Type of reference (college or collegebranch)

        Returns:
            List[VideoResponse]: List of videos
        """
        # Build the query
        query = {}

        # Add category filter if provided and not 'all'
        if category and category != "all":
            if category == "NA":
                query["refType"] = "NA"
            else:
                query["refType"] = category

            # If category is college or collegebranch and typeId is provided
            if type_id and type_id != "all" and (ref_type == "college" or ref_type == "collegebranch"):
                query["typeId"] = type_id

        # Determine sort order
        sort_field = "createdAt"  # default sort by date
        sort_order = -1  # default descending

        if sort_by == "views":
            sort_field = "views"
        elif sort_by == "likes" or sort_by == "popular":
            sort_field = "likes"

        # Execute query
        cursor = self.collection.find(query)
        cursor.skip(skip).limit(limit).sort(sort_field, sort_order)

        videos = []
        async for video in cursor:
            try:
                video["videoID"] = str(video["_id"])
                # Get expert information
                expert = await self.db.experts.find_one({"userId": video.get("userId")})
                if expert:
                    expert["expertID"] = str(expert["_id"])
                    user = await self.db.users.find_one({"_id": ObjectId(expert["userId"])})
                    if user:
                        user["userID"] = str(user["_id"])
                        expert["userDetails"] = user
                        video["expertDetails"] = ExpertResponse(**expert)
                        videos.append(VideoResponse(**video))
            except Exception as e:
                print(f"Error processing video {video.get('_id')}: {e}")
                continue

        return videos

    async def count_videos_with_filters(
        self,
        category: Optional[str] = None
    ) -> int:
        """
        Count the total number of videos that match the given filters.

        Args:
            category (Optional[str]): Filter by video category

        Returns:
            int: Total number of videos
        """
        # Build the query
        query = {}

        # Add category filter if provided
        if category and category != "all":
            if category == "NA":
                query["refType"] = "NA"
            else:
                query["refType"] = category

        return await self.collection.count_documents(query)

    async def get_all_videos(self, search: Optional[str] = None) -> List[dict]:
        """
        Get all videos for admin dashboard with optional search filtering.

        Args:
            search (Optional[str]): Search term to filter videos by title

        Returns:
            List[dict]: List of videos with admin-friendly format
        """
        try:
            query = {}
            if search:
                query["title"] = {"$regex": search, "$options": "i"}

            cursor = self.collection.find(query).sort("createdAt", -1)

            videos = []
            async for video in cursor:
                # Format for admin dashboard
                video_dict = {
                    "_id": str(video["_id"]),
                    "title": video.get("title", ""),
                    "description": video.get("description", ""),
                    "url": video.get("youtubeUrl", ""),
                    "views": video.get("views", 0),
                    "createdAt": video.get("createdAt", datetime.utcnow())
                }

                # Get creator name
                user = await self.db.users.find_one({"_id": ObjectId(video.get("userId", ""))})
                if user:
                    video_dict["creator"] = f"{user.get('firstName', '')} {user.get('lastName', '')}"
                else:
                    video_dict["creator"] = "Unknown Creator"

                videos.append(video_dict)

            return videos
        except Exception as e:
            print(f"Error getting all videos: {e}")
            return []

    async def get_expert_options(self) -> List[dict]:
        """
        Get list of experts for the filter dropdown.

        Returns:
            List[dict]: List of experts with id and name
        """
        try:
            # Get all experts
            cursor = self.db.experts.find({"status": "approved"})

            options = []
            async for expert in cursor:
                # Get user details for name
                user = await self.db.users.find_one({"_id": ObjectId(expert.get("userId", ""))})
                if user:
                    options.append({
                        "id": str(expert["_id"]),
                        "name": f"{user.get('firstName', '')} {user.get('lastName', '')}"
                    })

            return options
        except Exception as e:
            print(f"Error getting expert options: {e}")
            return []

    async def get_related_videos(
        self,
        video_id: str,
        skip: int = 0,
        limit: int = 3
    ) -> List[VideoResponse]:
        """
        Get videos related to the specified video.

        Args:
            video_id (str): ID of the video to find related content for
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return

        Returns:
            List[VideoResponse]: List of related videos
        """
        try:
            # Get the current video to find its properties
            video = await self.collection.find_one({"_id": ObjectId(video_id)})
            if not video:
                return []

            # Create query based on video properties:
            # 1. Same category (refType/typeId) or
            # 2. Same expert (userId) or
            # 3. Similar tags
            query = {
                "_id": {"$ne": ObjectId(video_id)},  # Exclude the current video
                "$or": []
            }

            # Add category-based criteria
            if video.get("refType") and video.get("refType") != "NA":
                query["$or"].append({
                    "refType": video.get("refType"),
                    "typeId": video.get("typeId")
                })

            # Add expert-based criteria
            if video.get("userId"):
                query["$or"].append({"userId": video.get("userId")})

            # Add tag-based criteria if tags exist
            if video.get("tags") and len(video.get("tags", [])) > 0:
                query["$or"].append({"tags": {"$in": video.get("tags")}})

            # If no suitable criteria, fallback to most popular videos
            if len(query["$or"]) == 0:
                # Remove the empty $or clause
                del query["$or"]
                # Just exclude the current video

            # Execute the query with pagination
            cursor = self.collection.find(query)
            cursor.sort("views", -1).skip(skip).limit(limit)

            videos = []
            async for related_video in cursor:
                related_video["videoID"] = str(related_video["_id"])
                # Get expert information
                expert = await self.db.experts.find_one({"userId": related_video.get("userId")})
                if expert:
                    expert["expertID"] = str(expert["_id"])
                    user = await self.db.users.find_one({"_id": ObjectId(expert["userId"])})
                    if user:
                        user["userID"] = str(user["_id"])
                        expert["userDetails"] = user
                        related_video["expertDetails"] = ExpertResponse(**expert)
                        videos.append(VideoResponse(**related_video))

            return videos
        except Exception as e:
            print(f"Error getting related videos: {e}")
            return []

    async def count_related_videos(self, video_id: str) -> int:
        """
        Count the number of videos related to the specified video.

        Args:
            video_id (str): ID of the video to find related content for

        Returns:
            int: Number of related videos
        """
        try:
            # Get the current video to find its properties
            video = await self.collection.find_one({"_id": ObjectId(video_id)})
            if not video:
                return 0

            # Create query based on same criteria as get_related_videos
            query = {
                "_id": {"$ne": ObjectId(video_id)},  # Exclude the current video
                "$or": []
            }

            # Add category-based criteria
            if video.get("refType") and video.get("refType") != "NA":
                query["$or"].append({
                    "refType": video.get("refType"),
                    "typeId": video.get("typeId")
                })

            # Add expert-based criteria
            if video.get("userId"):
                query["$or"].append({"userId": video.get("userId")})

            # Add tag-based criteria if tags exist
            if video.get("tags") and len(video.get("tags", [])) > 0:
                query["$or"].append({"tags": {"$in": video.get("tags")}})

            # If no suitable criteria, fallback to all videos except current
            if len(query["$or"]) == 0:
                # Remove the empty $or clause
                del query["$or"]
                # Just exclude the current video

            return await self.collection.count_documents(query)
        except Exception as e:
            print(f"Error counting related videos: {e}")
            return 0

    async def get_admin_videos(self):
        """
        Get all videos for admin dashboard with detailed information.
        
        Returns:
            List[dict]: List of videos with all necessary details for admin dashboard
        """
        try:
            # Get all videos
            cursor = self.collection.find({})
            
            videos = []
            async for video in cursor:
                # Format the video for admin dashboard
                video_dict = {
                    "_id": str(video["_id"]),
                    "videoID": str(video["_id"]),
                    "title": video.get("title", ""),
                    "heading": video.get("title", ""),  # Add heading field for frontend compatibility
                    "description": video.get("description", ""),
                    "youtubeUrl": video.get("youtubeUrl", ""),
                    "views": video.get("views", 0),
                    "likes": video.get("likes", 0),
                    "createdAt": video.get("createdAt", datetime.utcnow()),
                    "updatedAt": video.get("updatedAt", datetime.utcnow())
                }
                
                # Get creator details
                if "userId" in video:
                    # Try to get expert info first
                    expert = await self.db.experts.find_one({"userId": video["userId"]})
                    if expert:
                        # If it's an expert, get their user info
                        user = await self.db.users.find_one({"_id": ObjectId(video["userId"])})
                        if user:
                            video_dict["creator"] = {
                                "firstName": user.get("firstName", ""),
                                "middleName": user.get("middleName", ""),
                                "lastName": user.get("lastName", ""),
                                "email": user.get("email", "")
                            }
                    else:
                        # Not an expert, just get user info
                        user = await self.db.users.find_one({"_id": ObjectId(video["userId"])})
                        if user:
                            video_dict["creator"] = {
                                "firstName": user.get("firstName", ""),
                                "middleName": user.get("middleName", ""),
                                "lastName": user.get("lastName", ""),
                                "email": user.get("email", "")
                            }
                
                videos.append(video_dict)
                
            return videos
        except Exception as e:
            print(f"Error getting admin videos: {e}")
            return []

    async def get_profile_video_for_expert(self, expert_id: str) -> Optional[VideoResponse]:
        """
        Get the profile video for an expert.

        Logic:
          1. If the expert has a profile_video_id set, return that video.
          2. Otherwise, return the most-viewed video uploaded by that expert.
          3. If the expert has no videos at all, return None.

        Args:
            expert_id (str): ID of the expert

        Returns:
            Optional[VideoResponse]: The profile video, or None if no videos exist
        """
        try:
            # Fetch the expert document to check for an explicit profile_video_id
            expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
            if not expert:
                return None

            user_id = expert["userId"]
            profile_video_id = expert.get("profile_video_id")

            # 1. Try the explicitly chosen profile video
            if profile_video_id:
                try:
                    video = await self.collection.find_one(
                        {"_id": ObjectId(profile_video_id), "userId": user_id}
                    )
                    if video:
                        video["videoID"] = str(video["_id"])
                        expert_copy = dict(expert)
                        expert_copy["expertID"] = str(expert_copy["_id"])
                        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
                        if user:
                            user["userID"] = str(user["_id"])
                            expert_copy["userDetails"] = user
                            video["expertDetails"] = ExpertResponse(**expert_copy)
                            return VideoResponse(**video)
                except Exception:
                    pass  # profile_video_id may be invalid; fall through to most-viewed

            # 2. Fall back to the most-viewed video by this expert
            video = await self.collection.find_one(
                {"userId": user_id},
                sort=[("views", -1)]
            )
            if not video:
                return None

            video["videoID"] = str(video["_id"])
            expert_copy = dict(expert)
            expert_copy["expertID"] = str(expert_copy["_id"])
            user = await self.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user["userID"] = str(user["_id"])
                expert_copy["userDetails"] = user
                video["expertDetails"] = ExpertResponse(**expert_copy)
                return VideoResponse(**video)

            return None
        except Exception as e:
            print(f"Error getting profile video for expert {expert_id}: {e}")
            return None

    async def get_video_without_view_increment(self, video_id: str) -> Optional[dict]:
        """
        Fetch a raw video document by ID without incrementing the view counter.
        Used for ownership checks.
        """
        try:
            video = await self.collection.find_one({"_id": ObjectId(video_id)})
            if video:
                video["videoID"] = str(video["_id"])
            return video
        except Exception as e:
            print(f"Error fetching video (no view increment): {e}")
            return None

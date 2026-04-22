from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.blog import Blog, Author, BlogResponse
from app.core.database import get_database


def _build_author(user_doc: dict) -> Author:
    """Safely build an Author from a MongoDB user document, handling None name fields."""
    return Author(
        userID=str(user_doc["_id"]),
        firstName=user_doc.get("firstName") or "",
        middleName=user_doc.get("middleName"),
        lastName=user_doc.get("lastName") or "",
    )


class BlogManager:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.blogs

    async def create_blog(self, blog: Blog) -> Blog:
        """
        Create a new blog post.

        Args:
            blog (Blog): Blog object containing the post details

        Returns:
            Blog: Created blog post with generated ID
        """
        blog_dict = blog.model_dump()
        blog_dict["createdAt"] = datetime.utcnow()
        blog_dict["updatedAt"] = blog_dict["createdAt"]
        blog_dict["views"] = 0
        blog_dict["likes"] = 0
        blog_dict["likedBy"] = []

        result = await self.collection.insert_one(blog_dict)
        blog_dict["blogID"] = str(result.inserted_id)

        return Blog(**blog_dict)

    async def update_blog(self, blog_id: str, blog_update: dict, user_id: str) -> Optional[BlogResponse]:
        """
        Update an existing blog post if the user is the author.

        Args:
            blog_id (str): ID of the blog to update
            blog_update (dict): Fields to update
            user_id (str): ID of the user making the request

        Returns:
            Optional[BlogResponse]: Updated blog post if found and user is authorized, None otherwise
        """
        try:
            # First check if the blog exists and belongs to the user
            existing_blog = await self.collection.find_one({"_id": ObjectId(blog_id)})
            if not existing_blog:
                return None

            # Check if the requesting user is the author
            if existing_blog["userID"] != user_id:
                return None

            # Prepare update data
            update_data = {}
            for key, value in blog_update.items():
                if key in ["heading", "body", "refType", "typeId"]:
                    update_data[key] = value

            # Add update timestamp
            update_data["updatedAt"] = datetime.utcnow()

            # Perform update
            await self.collection.update_one(
                {"_id": ObjectId(blog_id)},
                {"$set": update_data}
            )

            # Return updated blog
            return await self.get_blog(blog_id)
        except Exception as e:
            print(f"Error updating blog: {e}")
            return None

    async def get_blog(self, blog_id: str) -> Optional[BlogResponse]:
        """
        Retrieve a blog post by its ID.

        Args:
            blog_id (str): ID of the blog post to retrieve

        Returns:
            Optional[Blog]: Blog post if found, None otherwise
        """
        try:
            blog = await self.collection.find_one({"_id": ObjectId(blog_id)})
            if blog:
                blog["blogID"] = str(blog["_id"])
                author = await self.db.users.find_one(
                    {"_id": ObjectId(blog['userID'])}
                )
                if not author:
                    print(f"Author not found for blog {blog_id}, userID={blog.get('userID')}")
                    return None
                blog['author'] = _build_author(author)

                # fetch expert id
                expert = await self.db.experts.find_one(
                    {"userId": blog['userID']}
                )
                if expert:
                    blog['expertId'] = str(expert['_id'])
                else:
                    blog['expertId'] = None

                # update the view count
                await self.collection.update_one(
                    {"_id": ObjectId(blog_id)},
                    {"$inc": {"views": 1}}
                )
                blog["views"] += 1
                return BlogResponse(**blog)
        except Exception as e:
            print(f"Error retrieving blog: {e}")
            return None

    async def get_blogs_by_expert_id(self, expert_id: str, skip: int = 0, limit: int = 10) -> List[BlogResponse]:
        """
        Retrieve a list of blog posts by expert ID with pagination.

        Args:
            expert_id (str): ID of the expert whose blogs to retrieve
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return

        Returns:
            List[BlogResponse]: List of blog posts by the expert
        """
        try:
            # Find the expert to get their user ID
            expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
            if not expert:
                return []

            # Get the user ID of the expert
            user_id = expert["userId"]

            # Find blogs by this user ID
            query = {"userID": user_id}
            cursor = self.collection.find(query)
            cursor.skip(skip).limit(limit).sort("createdAt", -1)

            blogs = []
            async for blog in cursor:
                blog["blogID"] = str(blog["_id"])
                author = await self.db.users.find_one(
                    {"_id": ObjectId(blog['userID'])}
                )
                if not author:
                    continue
                blog['author'] = _build_author(author)

                # Set expertId to the author's userID for the follow button
                blog['expertId'] = str(author['_id'])

                blogs.append(BlogResponse(**blog))

            return blogs
        except Exception as e:
            print(f"Error retrieving blogs by expert ID: {e}")
            return []

    async def get_blogs(self, skip: int = 0, limit: int = 10, expert_id: Optional[str] = None) -> List[BlogResponse]:
        """
        Retrieve a list of blog posts with pagination and optional expert filtering.

        Args:
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            expert_id (Optional[str]): Filter by expert ID

        Returns:
            List[BlogResponse]: List of blog posts
        """
        # If expert_id is provided, use the specialized method
        if expert_id:
            return await self.get_blogs_by_expert_id(expert_id, skip, limit)

        cursor = self.collection.find()
        cursor.skip(skip).limit(limit).sort("createdAt", -1)

        blogs = []
        async for blog in cursor:
            try:
                blog["blogID"] = str(blog["_id"])
                author = await self.db.users.find_one(
                    {"_id": ObjectId(blog['userID'])}
                )
                if not author:
                    continue
                blog['author'] = _build_author(author)

                # Set expertId to the author's userID for the follow button
                blog['expertId'] = str(author['_id'])

                blogs.append(BlogResponse(**blog))
            except Exception as e:
                print(f"Error processing blog {blog.get('_id')}: {e}")
                continue

        return blogs

    async def delete_blog(self, blog_id: str, user_id: str) -> bool:
        """
        Delete a blog post if the user is the author.

        Args:
            blog_id (str): ID of the blog to delete
            user_id (str): ID of the user making the request

        Returns:
            bool: True if blog was deleted, False otherwise
        """
        try:
            # First check if the blog exists and belongs to the user
            existing_blog = await self.collection.find_one({"_id": ObjectId(blog_id)})
            if not existing_blog:
                return False

            # Check if the requesting user is the author
            if existing_blog["userID"] != user_id:
                return False

            # Delete the blog
            result = await self.collection.delete_one({"_id": ObjectId(blog_id)})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting blog: {e}")
            return False

    async def count_blogs(self, expert_id: Optional[str] = None) -> int:
        """
        Count the total number of blogs in the database, optionally filtered by expert ID.

        Args:
            expert_id (Optional[str]): Filter by expert ID

        Returns:
            int: Total number of blogs
        """
        query = {}

        # If filtering by expert, first get their user ID
        if expert_id:
            try:
                expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
                if expert:
                    # Get the user ID of the expert
                    query["userID"] = expert["userId"]
            except Exception as e:
                print(f"Error finding expert for count: {e}")
                return 0

        return await self.collection.count_documents(query)

    async def like_blog(self, blog_id: str, user_id: str) -> Optional[BlogResponse]:
        """
        Like or unlike a blog post.

        Args:
            blog_id (str): ID of the blog to like/unlike
            user_id (str): ID of the user performing the action

        Returns:
            Optional[BlogResponse]: Updated blog if successful, None otherwise
        """
        try:
            # Get the blog first to check if user has already liked it
            blog = await self.collection.find_one({"_id": ObjectId(blog_id)})
            if not blog:
                return None

            liked_by = blog.get("likedBy", [])

            if user_id in liked_by:
                # User has already liked the blog, so unlike it
                result = await self.collection.update_one(
                    {"_id": ObjectId(blog_id)},
                    {
                        "$pull": {"likedBy": user_id},
                        "$inc": {"likes": -1},
                        "$set": {"updatedAt": datetime.utcnow()}
                    }
                )
            else:
                # User hasn't liked the blog yet, so like it
                result = await self.collection.update_one(
                    {"_id": ObjectId(blog_id)},
                    {
                        "$addToSet": {"likedBy": user_id},
                        "$inc": {"likes": 1},
                        "$set": {"updatedAt": datetime.utcnow()}
                    }
                )

            if result.modified_count:
                return await self.get_blog(blog_id)
            return None
        except Exception as e:
            print(f"Error liking/unliking blog: {e}")
            return None

    async def check_blog_like(self, blog_id: str, user_id: str) -> dict:
        """
        Check if a user has liked a specific blog.

        Args:
            blog_id (str): ID of the blog to check
            user_id (str): ID of the user

        Returns:
            dict: Dictionary containing the like status
        """
        try:
            blog = await self.collection.find_one({"_id": ObjectId(blog_id)})
            if not blog:
                return {"liked": False, "likes": 0}

            liked_by = blog.get("likedBy", [])
            likes = blog.get("likes", 0)

            return {
                "liked": user_id in liked_by,
                "likes": likes
            }
        except Exception as e:
            print(f"Error checking blog like status: {e}")
            return {"liked": False, "likes": 0}

    async def get_blogs_with_filters(
        self, 
        skip: int = 0, 
        limit: int = 10, 
        expert_id: Optional[str] = None,
        ref_type: Optional[str] = None,
        type_id: Optional[str] = None,
        sort_by: str = "recent"
    ) -> List[BlogResponse]:
        """
        Retrieve a list of blog posts with pagination and filtering.

        Args:
            skip (int): Number of records to skip
            limit (int): Maximum number of records to return
            expert_id (Optional[str]): Filter by expert ID
            ref_type (Optional[str]): Filter by reference type (NA, college, collegebranch)
            type_id (Optional[str]): Filter by specific college or branch ID
            sort_by (str): Sort blogs by: recent, views, likes

        Returns:
            List[BlogResponse]: List of blog posts
        """
        # Build the query
        query = {}
        
        # Add expert filter if provided
        if expert_id:
            try:
                expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
                if expert:
                    query["userID"] = expert["userId"]
            except Exception as e:
                print(f"Error finding expert for filter: {e}")
        
        # Add ref_type filter if provided
        if ref_type:
            query["refType"] = ref_type
            
            # Add type_id filter if provided and ref_type is not NA
            if type_id and ref_type != "NA":
                query["typeId"] = type_id
        
        # Determine sort order
        sort_field = "createdAt"  # default sort by date
        sort_order = -1  # default descending
        
        if sort_by == "views":
            sort_field = "views"
        elif sort_by == "likes":
            sort_field = "likes"
            
        # Execute query
        cursor = self.collection.find(query)
        cursor.skip(skip).limit(limit).sort(sort_field, sort_order)
        
        blogs = []
        async for blog in cursor:
            try:
                blog["blogID"] = str(blog["_id"])
                author = await self.db.users.find_one(
                    {"_id": ObjectId(blog['userID'])}
                )
                if not author:
                    continue
                blog['author'] = _build_author(author)

                # Set expertId to the author's userID for the follow button
                blog['expertId'] = str(author['_id'])

                blogs.append(BlogResponse(**blog))
            except Exception as e:
                print(f"Error processing blog {blog.get('_id')}: {e}")
                continue

        return blogs
        
    async def count_blogs_with_filters(
        self, 
        expert_id: Optional[str] = None,
        ref_type: Optional[str] = None,
        type_id: Optional[str] = None
    ) -> int:
        """
        Count the total number of blogs that match the given filters.

        Args:
            expert_id (Optional[str]): Filter by expert ID
            ref_type (Optional[str]): Filter by reference type (NA, college, collegebranch)
            type_id (Optional[str]): Filter by specific college or branch ID

        Returns:
            int: Total number of blogs
        """
        # Build the query
        query = {}
        
        # Add expert filter if provided
        if expert_id:
            try:
                expert = await self.db.experts.find_one({"_id": ObjectId(expert_id)})
                if expert:
                    query["userID"] = expert["userId"]
            except Exception as e:
                print(f"Error finding expert for count: {e}")
        
        # Add ref_type filter if provided
        if ref_type:
            query["refType"] = ref_type
            
            # Add type_id filter if provided and ref_type is not NA
            if type_id and ref_type != "NA":
                query["typeId"] = type_id
                
        return await self.collection.count_documents(query)

    async def update_blog_admin(self, blog_id: str, blog_data: dict) -> bool:
        """
        Admin-specific method to update a blog post without user restrictions.
        
        Args:
            blog_id (str): ID of the blog to update
            blog_data (dict): Fields to update
            
        Returns:
            bool: True if update was successful, False otherwise
        """
        try:
            # Check if the blog exists
            existing_blog = await self.collection.find_one({"_id": ObjectId(blog_id)})
            if not existing_blog:
                return False
                
            # Prepare update data - admins can update more fields than regular users
            update_data = {}
            for key, value in blog_data.items():
                if key in ["heading", "body", "refType", "typeId", "views", "likes"]:
                    update_data[key] = value
                    
            # Add update timestamp
            update_data["updatedAt"] = datetime.utcnow()
            
            # Perform update
            result = await self.collection.update_one(
                {"_id": ObjectId(blog_id)},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating blog as admin: {e}")
            return False

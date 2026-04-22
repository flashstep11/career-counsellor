from app.core.database import get_database
from app.models.search import SearchType, SearchResult
from app.models.blog import BlogSearchResponse
from app.models.college import CollegeSearchResponse
from app.models.expert import ExpertSearchResponse
from app.models.user import UserSearchResponse
from app.models.video import VideoSearchResponse
from typing import Optional, Set
import random
import re


class SearchManager:
    def __init__(self):
        """Initialize SearchManager with database connection."""
        self.db = get_database()

    def _create_name_query(self, query: str) -> dict:
        """
        Create a sophisticated name search query.
        Handles full names, partial names, and case-insensitive matching.
        """
        name_parts = query.strip().split()
        if len(name_parts) >= 2:
            # If multiple words, try matching as first name + last name in different combinations
            name_conditions = [
                # Exact match for first name + last name
                {
                    "firstName": {"$regex": f"^{name_parts[0]}$", "$options": "i"},
                    "lastName": {"$regex": f"^{name_parts[-1]}$", "$options": "i"}
                },
                # Reverse order (last name + first name)
                {
                    "firstName": {"$regex": f"^{name_parts[-1]}$", "$options": "i"},
                    "lastName": {"$regex": f"^{name_parts[0]}$", "$options": "i"}
                },
                # Partial matches
                {
                    "firstName": {"$regex": f"{name_parts[0]}", "$options": "i"},
                    "lastName": {"$regex": f"{name_parts[-1]}", "$options": "i"}
                }
            ]
            return {"$or": name_conditions}
        else:
            # Single word - match against either first name or last name
            return {
                "$or": [
                    {"firstName": {"$regex": query, "$options": "i"}},
                    {"lastName": {"$regex": query, "$options": "i"}}
                ]
            }

    def _create_text_search_query(self, query: str, fields: list) -> dict:
        """
        Create an improved text search query with multiple matching strategies.
        """
        # Split query into words for multi-word search
        words = query.strip().split()

        # Create different matching conditions
        conditions = []

        # Exact phrase match (highest priority)
        exact_match = {
            "$or": [{field: {"$regex": f"^{query}$", "$options": "i"}} for field in fields]
        }
        conditions.append(exact_match)

        # Contains whole phrase
        contains_phrase = {
            "$or": [{field: {"$regex": query, "$options": "i"}} for field in fields]
        }
        conditions.append(contains_phrase)

        # Match all words in any order
        if len(words) > 1:
            word_matches = []
            for word in words:
                word_conditions = {
                    "$or": [{field: {"$regex": word, "$options": "i"}} for field in fields]
                }
                word_matches.append(word_conditions)
            conditions.append({"$and": word_matches})

        return {"$or": conditions}

    async def search(
        self,
        query: str,
        search_type: SearchType = SearchType.ALL,
        skip: int = 0,
        limit: int = 10,
        connected_ids: Optional[Set[str]] = None,
    ) -> SearchResult:
        """
        Perform an improved search across specified content types.
        Connected users / authors are surfaced first when connected_ids is provided.
        """
        results = SearchResult(type=search_type, total_count=0)
        random_limit = 1 if search_type == SearchType.ALL else 5

        try:
            if search_type in [SearchType.ALL, SearchType.BLOG]:
                if query.strip():
                    blog_query = self._create_text_search_query(
                        query, ["heading", "body", "tags"]
                    )
                else:
                    blog_query = {}

                all_blogs = []
                async for blog in self.db.blogs.find(blog_query):
                    blog["blogID"] = str(blog["_id"])
                    all_blogs.append(blog)

                selected_blogs = random.sample(
                    all_blogs,
                    min(random_limit if not query.strip()
                        else limit, len(all_blogs))
                )
                results.blogs = [BlogSearchResponse(
                    **blog) for blog in selected_blogs]
                results.total_count += len(results.blogs)

            if search_type in [SearchType.ALL, SearchType.VIDEO]:
                if query.strip():
                    video_query = self._create_text_search_query(
                        query, ["title", "description", "tags"]
                    )
                else:
                    video_query = {}

                all_videos = []
                async for video in self.db.videos.find(video_query):
                    video["videoID"] = str(video["_id"])
                    all_videos.append(video)

                selected_videos = random.sample(
                    all_videos,
                    min(random_limit if not query.strip()
                        else limit, len(all_videos))
                )
                results.videos = [VideoSearchResponse(
                    **video) for video in selected_videos]
                results.total_count += len(results.videos)

            if search_type in [SearchType.ALL, SearchType.EXPERT]:
                if query.strip():
                    name_query = self._create_name_query(query)
                    bio_query = {"bio": {"$regex": query, "$options": "i"}}
                    specialty_query = {"specialties": {
                        "$regex": query, "$options": "i"}}

                    user_query = {
                        "isExpert": True,
                        "$or": [name_query, bio_query, specialty_query]
                    }
                else:
                    user_query = {"isExpert": True}

                all_experts = []
                async for user_details in self.db.users.find(user_query):
                    user_details["_id"] = str(user_details["_id"])
                    expert_details = await self.db.experts.find_one(
                        {"userId": user_details["_id"]}
                    )
                    if not expert_details:
                        continue
                    expert_details["expertID"] = str(expert_details["_id"])
                    expert_details["userDetails"] = UserSearchResponse(
                        **user_details)
                    all_experts.append(expert_details)

                selected_experts = random.sample(
                    all_experts,
                    min(random_limit if not query.strip()
                        else limit, len(all_experts))
                )
                # Boost connected experts to the top
                if connected_ids:
                    selected_experts.sort(
                        key=lambda e: 0 if e.get("userId") in connected_ids else 1
                    )
                results.experts = [ExpertSearchResponse(
                    **expert) for expert in selected_experts]
                results.total_count += len(results.experts)

            if search_type in [SearchType.ALL, SearchType.COLLEGE]:
                if query.strip():
                    college_query = self._create_text_search_query(
                        query,
                        ["name", "address", "city", "state", "courses"]
                    )
                else:
                    college_query = {}

                all_colleges = []
                async for college in self.db.colleges.find(college_query):
                    college["collegeID"] = str(college["_id"])
                    all_colleges.append(college)

                selected_colleges = random.sample(
                    all_colleges,
                    min(random_limit if not query.strip()
                        else limit, len(all_colleges))
                )
                results.colleges = [CollegeSearchResponse(
                    **college) for college in selected_colleges]
                results.total_count += len(results.colleges)

            return results

        except Exception as e:
            print(f"Error performing search: {e}")
            return SearchResult(type=search_type, total_count=0)

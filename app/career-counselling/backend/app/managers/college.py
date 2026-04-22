from typing import List, Optional, Dict
from datetime import datetime
import math
import os
from bson import ObjectId
from app.models.college import CollegeResponse, CollegeDescriptionResponse
from app.core.database import get_database
from app.managers.branch import BranchManager

branch_manager = BranchManager()

BRANCH_CATEGORIES = {
    "Computer Science & IT": ["computer", "computing", "data science", "artificial intelligence", " ai ", "machine learning", "cyber", "information technology", " it "],
    "Electrical & Electronics": ["electrical", "electronics", "communication", "vlsi", "instrumentation", "power", "ic design"],
    "Mechanical & Manufacturing": ["mechanical", "manufacturing", "production", "industrial", "mechatronics", "robotics", "automation"],
    "Civil & Infrastructure": ["civil", "infrastructure", "construction", "structural", "environmental", "transportation"],
    "Materials & Metallurgy": ["material", "metallurgy", "ceramic"],
    "Chemical & Process": ["chemical", "food", "petroleum", "process", "pharmaceutical"],
    "Biotechnology & Life Sciences": ["bio", "life science", "biological", "biochemical"],
    "Mathematics & Physics": ["mathematics", "physics", "computational", "statistics"],
    "Interdisciplinary": ["aerospace", "aeronautical", "ocean", "naval", "mining", "geophysics", "geology", "agricultur", "design", "energy", "textile", "dairy"],
    "Integrated & Dual Degrees": ["mba", "m.tech", "integrated", "dual"]
}


class CollegeManager:
    def __init__(self):
        """Initialize CollegeManager with database connection."""
        self.db = get_database()
        self.collection = self.db.colleges
        self.branch_categories = BRANCH_CATEGORIES
        # Create a persistent cache for distances
        self.distance_cache: Dict[str, Optional[float]] = {}

    async def create_college(self, college: CollegeResponse) -> CollegeResponse:
        """Create a new college entry."""
        college_dict = college.model_dump(exclude={"collegeID"})
        college_dict["createdAt"] = datetime.utcnow().isoformat()
        college_dict["updatedAt"] = college_dict["createdAt"]

        result = await self.collection.insert_one(college_dict)
        college_dict["collegeID"] = str(result.inserted_id)

        if college_dict["descriptionBlogID"] is None:
            college_dict["description"] = ""
        else:
            from app.managers.blog import BlogManager
            blog_manager = BlogManager()
            blog = await blog_manager.get_blog(college_dict["descriptionBlogID"])
            if blog:
                college_dict["description"] = blog.body
            else:
                college_dict["description"] = ""

        return CollegeResponse(**college_dict)

    async def get_college(self, college_id: str) -> Optional[CollegeDescriptionResponse]:
        """Retrieve a college by ID."""
        try:
            college = await self.collection.find_one({"_id": ObjectId(college_id)})
            if college:
                college["collegeID"] = str(college.pop("_id"))
                if college["descriptionBlogID"] is None:
                    college["description"] = ""
                else:
                    from app.managers.blog import BlogManager
                    blog_manager = BlogManager()
                    blog = await blog_manager.get_blog(college["descriptionBlogID"])
                    if blog:
                        college["description"] = blog.body
                    else:
                        college["description"] = ""
                return CollegeDescriptionResponse(**college)
            return None
        except Exception as e:
            return None

    async def get_colleges(
        self,
        skip: int = 0,
        limit: int = 10,
        landArea: Optional[float] = None,
        placement: Optional[float] = None,
        locality_type: Optional[str] = None,
        college_type: Optional[str] = None,
        state: Optional[str] = None,
        course_category: Optional[str] = None,
        sort: Optional[str] = None
    ) -> List[CollegeResponse]:
        """Retrieve a list of colleges with optional filtering and sorting."""
        try:
            query = {}
            if locality_type:
                query["locality_type"] = locality_type
            if college_type:
                query["type"] = college_type
            if landArea is not None:
                query["landArea"] = {"$gte": landArea}
            if placement is not None:
                query["placement"] = {"$gte": placement}
            if state is not None:
                query["state"] = state

            if course_category and course_category in self.branch_categories:
                keywords = self.branch_categories[course_category]
                branch_conditions = [
                    {"name": {"$regex": keyword, "$options": "i"}} for keyword in keywords]
                if not branch_conditions:
                    return []

                branch_query = {"$or": branch_conditions}
                matching_branches = await branch_manager.collection.find(branch_query).to_list(length=None)
                branch_ids = [branch.get("_id") for branch in matching_branches]
                if not branch_ids:
                    return []

                from app.managers.college_branch import CollegeBranchManager
                cb_manager = CollegeBranchManager()
                cb_query = {"branch_id": {"$in": [str(bid) for bid in branch_ids]}}
                matching_cbs = await cb_manager.collection.find(cb_query).to_list(length=None)
                college_ids = [ObjectId(cb.get("college_id"))
                            for cb in matching_cbs if cb.get("college_id")]
                if not college_ids:
                    return []

                query["_id"] = {"$in": college_ids}

            # Parse sorting parameters
            sort_params = []
            if sort:
                try:
                    sort_fields = sort.split(',')
                    for sort_field in sort_fields:
                        if ':' in sort_field:
                            field, order = sort_field.split(':')
                            # Convert to MongoDB sort parameter (1 for asc, -1 for desc)
                            sort_direction = 1 if order.lower() == 'asc' else -1
                            sort_params.append((field, sort_direction))
                except Exception as e:
                    pass
            
            # Default sort by name if no sort params
            if not sort_params:
                sort_params = [("name", 1)]
            
            # Apply query and fetch all matching documents
            cursor = self.collection.find(query)
            all_colleges = await cursor.to_list(length=None)
            
            # Convert to College objects
            college_objects = []
            for college in all_colleges:
                college["collegeID"] = str(college.pop("_id"))
                college_objects.append(college)
            
            # Apply custom sorting with proper priority handling
            if sort_params:
                def multi_key_sort(colleges):
                    # Custom sort function to handle multiple sort keys with proper priority
                    def get_sort_key(college):
                        keys = []
                        for field, direction in sort_params:
                            # Handle missing fields gracefully
                            if field in college:
                                # Reverse the order for descending sorts (-1)
                                if direction == -1:
                                    # For numeric fields, negate; for strings, reverse sort
                                    value = college[field]
                                    if isinstance(value, (int, float)):
                                        keys.append(-value if value is not None else float('inf'))
                                    else:
                                        # For strings or other objects, use a very large string for None
                                        # and reverse for non-None
                                        keys.append("" if value is None else chr(0x10FFFF) - str(value))
                                else:
                                    # For ascending sorts, use the value directly
                                    keys.append(college[field] if college[field] is not None else float('-inf'))
                            else:
                                # If field doesn't exist, use the minimum possible value
                                keys.append(float('-inf') if direction == 1 else float('inf'))
                        return tuple(keys)
                    
                    return sorted(colleges, key=get_sort_key)
                
                # Apply our custom multi-key sorting
                college_objects = multi_key_sort(college_objects)
            
            # Handle pagination
            paginated_colleges = college_objects[skip:skip + limit]
            
            # Convert to CollegeResponse objects
            result_colleges = []
            for college in paginated_colleges:
                result_colleges.append(CollegeResponse(**college))
            
            return result_colleges
            
        except Exception as e:
            raise

    async def count_colleges(
        self,
        landArea: Optional[float] = None,
        placement: Optional[float] = None,
        locality_type: Optional[str] = None,
        college_type: Optional[str] = None,
        state: Optional[str] = None,
        course_category: Optional[str] = None
    ) -> int:
        """Count the total number of colleges matching the given filters."""
        query = {}
        if locality_type:
            query["locality_type"] = locality_type
        if college_type:
            query["type"] = college_type
        if landArea is not None:
            query["landArea"] = {"$gte": landArea}
        if placement is not None:
            query["placement"] = {"$gte": placement}
        if state is not None:
            query["state"] = state

        # Special handling for course category filtering
        if course_category and course_category in self.branch_categories:
            # Get the keywords for this category
            keywords = self.branch_categories[course_category]

            # Step 1: Find all branches with names matching our keywords
            branch_conditions = []
            for keyword in keywords:
                branch_conditions.append(
                    {"name": {"$regex": keyword, "$options": "i"}})

            if not branch_conditions:
                return 0  # No matching branches, return 0

            # Find branches matching any keyword
            branch_query = {"$or": branch_conditions}
            matching_branches = await branch_manager.collection.find(branch_query).to_list(length=None)

            # Extract branch IDs as ObjectId objects (not strings)
            branch_ids = [branch.get("_id") for branch in matching_branches]
            if not branch_ids:
                return 0  # No matching branches, return 0

            # Step 2: Find college-branch relationships that use these branches
            from app.managers.college_branch import CollegeBranchManager
            cb_manager = CollegeBranchManager()
            cb_query = {"branch_id": {"$in": [str(bid) for bid in branch_ids]}}
            matching_cbs = await cb_manager.collection.find(cb_query).to_list(length=None)

            # Extract college IDs from these relationships
            college_ids = [ObjectId(cb.get("college_id"))
                           for cb in matching_cbs if cb.get("college_id")]
            if not college_ids:
                return 0  # No matching colleges, return 0

            # Add college ID filter to our main query
            query["_id"] = {"$in": college_ids}

        return await self.collection.count_documents(query)

    def _calculate_haversine_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate the great circle distance between two points on the earth (specified in decimal degrees)
        """
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * \
            math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371
        return c * r

    async def predict_colleges(
        self,
        # e.g. {"jee-mains": 15000, "jee-advanced": 5000}
        exam_ranks: dict[str, int],
        preferred_state: Optional[str] = None,
        locality: Optional[str] = None,
        preferred_branches: Optional[str] = None,
        placement_range: Optional[tuple[float, float]] = None,
        gender_ratio_range: Optional[tuple[float, float]] = None,
        nirf_ranking_range: Optional[tuple[int, int]] = None,
        h_index_range: Optional[tuple[int, int]] = None,
        # Expected to have attributes: user_location (with latitude, longitude), min_distance, max_distance
        distance_range: Optional[object] = None,
        user_home_state: Optional[str] = None,
        user_gender: Optional[str] = None,
        user_category: Optional[str] = None,
        skip: int = 0,
        limit: int = 30,
    ) -> List[dict]:
        """
        Predict college-branch combinations based on filters and return a list of 
        dictionaries with:
          - college_name
          - branch_name
          - openingRank (from the cutoff for year 2024, counselling_round 5 matching the eligible cutoff's category)
          - closingRank (from that cutoff)
          - distance (if distance_range is provided)
          - h_index (if available)

        This implementation uses the haversine formula for distance calculations.
        """
        results = []
        if placement_range is not None:
            query = {"avg_placement": {
                "$gte": placement_range[0], "$lte": placement_range[1]}}
        else:
            query = {}

        from app.managers.college_branch import CollegeBranchManager
        cb_manager = CollegeBranchManager()
        cursor = cb_manager.collection.find(query)
        docs = await cursor.to_list(length=None)

        import asyncio

        async def process_doc(cb_doc: dict) -> Optional[dict]:
            college_id = cb_doc.get("college_id")
            if not college_id:
                return None

            # Get the college document directly
            college_doc = await self.collection.find_one({"_id": ObjectId(college_id)})
            if not college_doc:
                return None

            cutoffs = cb_doc.get("avg_cutoffs", [])
            cutoffs2 = cb_doc.get("cutoffs", [])
            eligible_cutoff = None
            for cutoff in cutoffs:
                if self._get_eligible_cutoff(
                    cutoff,
                    exam_ranks,
                    user_gender,
                    user_category,
                    user_home_state,
                    college_doc.get("state")
                ):
                    eligible_cutoff = cutoff
                    break
            if eligible_cutoff is None:
                return None

            openingRank_for_sorting = self._get_valid_cutoff_opening_rank(
                cutoffs)
            if openingRank_for_sorting is None:
                return None

            target_category = eligible_cutoff.get("category")
            if target_category is None:
                return None

            specific_cutoff = self._get_specific_cutoff_rank(
                cutoffs2, target_category)
            if specific_cutoff is None:
                return None

            openingRank = specific_cutoff[0]
            closingRank = specific_cutoff[1]

            branch_doc = None
            branch_id = cb_doc.get("branch_id")
            if branch_id:
                branch_doc = await branch_manager.collection.find_one({"_id": ObjectId(branch_id)})
            if preferred_branches and branch_doc:
                keywords = BRANCH_CATEGORIES.get(preferred_branches)
                if keywords:
                    branch_name = branch_doc.get("name", "").lower()
                    if not any(keyword.strip().lower() in branch_name for keyword in keywords):
                        return None

            if preferred_state and college_doc.get("state") != preferred_state:
                return None
            if locality and college_doc.get("locality_type") != locality:
                return None
            if gender_ratio_range is not None:
                gr = college_doc.get("gender_ratio")
                if gr is None or not (gender_ratio_range[0] <= gr <= gender_ratio_range[1]):
                    return None
            if nirf_ranking_range is not None:
                nirf = college_doc.get("nirfRanking")
                if nirf is None or not (nirf_ranking_range[0] <= nirf <= nirf_ranking_range[1]):
                    return None
            if h_index_range is not None:
                h_index = college_doc.get("h_index")
                if h_index is None or not (h_index_range[0] <= h_index <= h_index_range[1]):
                    return None

            college_name = college_doc.get("name")
            branch_name = branch_doc.get("name") if branch_doc else None
            h_index = college_doc.get("h_index")

            # Return intermediate result without distance calculation.
            return {
                "college_id": college_id,
                "college_doc": college_doc,
                "college_name": college_name,
                "branch_name": branch_name,
                "openingRank_for_sorting": openingRank_for_sorting,
                "openingRank": openingRank,
                "closingRank": closingRank,
                "h_index": h_index
            }

        tasks = [process_doc(doc) for doc in docs]
        processed_without_distance = await asyncio.gather(*tasks)
        valid_results_no_distance = [
            res for res in processed_without_distance if res is not None]

        final_results_with_distance = []
        if distance_range is not None and valid_results_no_distance:
            user_lat = distance_range.user_location.latitude
            user_lon = distance_range.user_location.longitude
            min_distance = distance_range.min_distance
            max_distance = distance_range.max_distance

            # Calculate distances using haversine formula
            for res in valid_results_no_distance:
                college_doc = res["college_doc"]
                college_lat = college_doc.get("latitude")
                college_lon = college_doc.get("longitude")

                if college_lat is None or college_lon is None:
                    continue

                # Use cache if available
                college_name = res["college_name"]
                if college_name in self.distance_cache:
                    distance_km = self.distance_cache[college_name]
                else:
                    distance_km = round(self._calculate_haversine_distance(
                        user_lat, user_lon, college_lat, college_lon
                    ), 1)
                    self.distance_cache[college_name] = distance_km

                if min_distance <= distance_km <= max_distance:
                    res["distance"] = distance_km
                    del res["college_doc"]
                    final_results_with_distance.append(res)
        else:
            for res in valid_results_no_distance:
                del res["college_doc"]
                final_results_with_distance.append(res)

        sorted_results = sorted(
            final_results_with_distance,
            key=lambda r: (r["openingRank_for_sorting"],
                           r.get("distance", float('inf')))
        )

        final_results = [
            {
                "college_name": r["college_name"],
                "branch_name": r["branch_name"],
                "openingRank": r["openingRank"],
                "closingRank": r["closingRank"],
                "distance": r.get("distance"),
                "h_index": r.get("h_index")
            }
            for r in sorted_results
        ]

        return final_results[skip: skip + limit]

    def _get_eligible_cutoff(
        self,
        cutoff: dict,
        exam_ranks: dict[str, int],
        user_gender: Optional[str],
        user_category: Optional[str],
        user_home_state: Optional[str],
        college_state: Optional[str],
    ) -> Optional[dict]:
        """
        Returns the cutoff object if it qualifies the user, otherwise returns None.
        """
        category_info = cutoff.get("category", {})
        cutoff_exam = category_info.get("exam")
        if cutoff_exam not in exam_ranks:
            return None

        user_rank = exam_ranks[cutoff_exam]
        opening = cutoff.get("opening_rank")
        closing = cutoff.get("closing_rank")
        if opening is None or closing is None:
            return None

        if not (user_rank <= (closing + 200)):
            return None

        if category_info.get("gender") == "female-only":
            if not user_gender or user_gender.lower() != "female":
                return None

        if user_category and category_info.get("seat_type") != user_category and user_category != "open":
            return None

        if category_info.get("quota") == "hs":
            if not user_home_state or not college_state:
                return None
            if user_home_state != college_state:
                return None

        return cutoff

    def _get_specific_cutoff_rank(
        self,
        cutoffs: List[dict],
        target_category: dict
    ) -> Optional[tuple[int, int]]:
        """
        Among the list of cutoffs, find the one with year 2024 and counselling_round 5
        that has the same category as target_category.
        Return its (opening_rank, closing_rank).
        """
        for cutoff in cutoffs:
            if cutoff.get("year") == 2024 and cutoff.get("counselling_round") == 5:
                cat = cutoff.get("category")
                if (
                    cat.get("quota") == target_category.get("quota") and
                    cat.get("seat_type") == target_category.get("seat_type") and
                    cat.get("gender") == target_category.get("gender") and
                    cat.get("exam") == target_category.get("exam") and
                    cat.get("co_type") == target_category.get("co_type")
                ):
                    opening = cutoff.get("opening_rank")
                    closing = cutoff.get("closing_rank")
                    if opening is not None and closing is not None:
                        return (opening, closing)
        return None

    def _get_valid_cutoff_opening_rank(
        self,
        cutoffs: List[dict],
    ) -> Optional[int]:
        min_or = 10000000
        for cutoff in cutoffs:
            opening = cutoff.get("opening_rank")
            closing = cutoff.get("closing_rank")
            if opening is None or closing is None:
                continue
            min_or = min(min_or, opening)
        return min_or

    async def get_college_with_branches(self, college_id: str) -> Optional[dict]:
        college = await self.get_college(college_id)
        if college:
            from app.managers.college_branch import CollegeBranchManager
            branch_manager = CollegeBranchManager()
            branches = await branch_manager.get_branches_by_college(college_id)
            return {"college": college, "branches": branches}
        return None

    async def get_colleges_by_state(self) -> List[dict]:
        """
        Get count of colleges grouped by state.
        Returns a list of dictionaries with state name and count.
        """
        try:
            pipeline = [
                {"$match": {"state": {"$ne": None}}},  # Only include records with state
                {"$group": {"_id": "$state", "count": {"$sum": 1}}},  # Group by state and count
                {"$project": {"state": "$_id", "count": 1, "_id": 0}},  # Rename _id to state and keep count
                {"$sort": {"state": 1}}  # Sort by state name
            ]
            
            result = await self.collection.aggregate(pipeline).to_list(length=None)
            return result
        except Exception as e:
            return []


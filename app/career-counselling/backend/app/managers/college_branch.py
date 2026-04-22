from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.managers.branch import BranchManager
from app.models.college_branch import CollegeBranchBase, CollegeBranchResponse
from app.core.database import get_database

# Remove the top-level import of CollegeManager
# from app.managers.college import CollegeManager

class CollegeBranchManager:
    def __init__(self):
        """Initialize CollegeBranchManager with database connection."""
        self.db = get_database()
        self.collection = self.db.college_branches

    async def create_college_branch(
        self, college_branch: CollegeBranchBase
    ) -> CollegeBranchResponse:
        """Create a new college branch entry."""
        branch_dict = college_branch.model_dump()
        branch_dict["createdAt"] = datetime.utcnow().isoformat()
        branch_dict["updatedAt"] = branch_dict["createdAt"]

        result = await self.collection.insert_one(branch_dict)
        branch_dict["id"] = str(result.inserted_id)
        branch_dict.pop("_id")

        # Fetch the branch details to include in response
        branch_manager = BranchManager()
        branch = await branch_manager.get_branch(college_branch.branch_id)

        return CollegeBranchResponse(**branch_dict, branch=branch)

    async def get_college_branch(
        self, college_branch_id: str
    ) -> Optional[CollegeBranchResponse]:
        """Retrieve a college branch by ID."""
        try:
            college_branch = await self.collection.find_one(
                {"_id": ObjectId(college_branch_id)}
            )
            if college_branch:
                college_branch["id"] = str(college_branch.pop("_id"))

                # Fetch the branch details
                from app.managers.branch import BranchManager
                branch_manager = BranchManager()
                branch = await branch_manager.get_branch(
                    college_branch["branch_id"]
                )
                
                # Fetch the college details directly from database instead of using CollegeManager
                # to avoid circular import
                college = await self.db.colleges.find_one(
                    {"_id": ObjectId(college_branch["college_id"])}
                )
                
                if college:
                    college["id"] = str(college.pop("_id"))

                return CollegeBranchResponse(**college_branch, branch=branch, college=college)

            return None
        except Exception as e:
            print(f"Error retrieving college branch: {e}")
            return None

    async def get_college_branches(
        self,
        skip: int = 0,
        limit: int = 10,
        college_id: Optional[str] = None,
        branch_id: Optional[str] = None,
    ) -> List[CollegeBranchResponse]:
        """Retrieve a list of college branches with optional filtering."""
        query = {}
        if college_id:
            query["college_id"] = college_id
        if branch_id:
            query["branch_id"] = branch_id

        cursor = self.collection.find(query)
        cursor.skip(skip).limit(limit).sort("createdAt", -1)

        # Create a branch manager to fetch branch details
        from app.managers.branch import BranchManager
        branch_manager = BranchManager()
        
        # Get college details directly from database if needed
        college = None
        if college_id:
            college = await self.db.colleges.find_one(
                {"_id": ObjectId(college_id)}
            )
            if college:
                college["id"] = str(college.pop("_id"))

        college_branches = []
        async for college_branch in cursor:
            college_branch["id"] = str(college_branch.pop("_id"))

            # Fetch the branch details
            branch = await branch_manager.get_branch(
                college_branch["branch_id"]
            )
            
            # Include college in the response
            response_data = {**college_branch, "branch": branch}
            if college:
                response_data["college"] = college
            else:
                # If college_id wasn't provided as a filter, fetch individual college details
                college_data = await self.db.colleges.find_one(
                    {"_id": ObjectId(college_branch["college_id"])}
                )
                if college_data:
                    college_data["id"] = str(college_data.pop("_id"))
                    response_data["college"] = college_data
                
            college_branches.append(CollegeBranchResponse(**response_data))

        return college_branches

    async def get_branches_by_college(
        self, college_id: str, skip: int = 0, limit: int = 20
    ) -> List[CollegeBranchResponse]:
        """Get all branches for a specific college."""
        return await self.get_college_branches(
            skip=skip, limit=limit, college_id=college_id
        )

    async def get_colleges_by_branch(
        self, branch_id: str, skip: int = 0, limit: int = 20
    ) -> List[CollegeBranchResponse]:
        """Get all colleges offering a specific branch."""
        return await self.get_college_branches(
            skip=skip, limit=limit, branch_id=branch_id
        )

    async def update_cutoffs(
        self, college_branch_id: str, cutoffs: List
    ) -> Optional[CollegeBranchResponse]:
        """Update cutoffs for a college branch."""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(college_branch_id)},
                {"$set": {
                    "cutoffs": cutoffs,
                    "updatedAt": datetime.utcnow().isoformat()
                }}
            )

            if result.modified_count:
                return await self.get_college_branch(college_branch_id)
            return None
        except Exception as e:
            print(f"Error updating cutoffs: {e}")
            return None

    async def update_placements(
        self, college_branch_id: str, placements: List
    ) -> Optional[CollegeBranchResponse]:
        """Update placement data for a college branch."""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(college_branch_id)},
                {"$set": {"placements": placements,
                          "updatedAt": datetime.utcnow().isoformat()}}
            )

            if result.modified_count:
                return await self.get_college_branch(college_branch_id)
            return None
        except Exception as e:
            print(f"Error updating placements: {e}")
            return None

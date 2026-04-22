from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.branch import BranchBase, Branch
from app.core.database import get_database


class BranchManager:
    def __init__(self):
        """Initialize BranchManager with database connection."""
        self.db = get_database()
        self.collection = self.db.branches

    async def create_branch(self, branch: BranchBase) -> Branch:
        """
        Create a new branch entry.

        Args:
            branch: Branch object with details

        Returns:
            Branch object with generated ID
        """
        branch_dict = branch.model_dump()
        branch_dict["createdAt"] = datetime.utcnow().isoformat()
        branch_dict["updatedAt"] = branch_dict["createdAt"]

        result = await self.collection.insert_one(branch_dict)
        branch_dict["id"] = str(result.inserted_id)
        branch_dict.pop("_id")

        print(f"Created branch: {branch_dict}")

        return Branch(**branch_dict)

    async def get_branch(self, branch_id: str) -> Optional[Branch]:
        """
        Retrieve a branch by ID.

        Args:
            branch_id: ID of the branch to retrieve

        Returns:
            Branch if found, None otherwise
        """
        try:
            branch = await self.collection.find_one(
                {"_id": ObjectId(branch_id)}
            )
            if branch:
                branch["id"] = str(branch.pop("_id"))
                return Branch(**branch)
            return None
        except Exception as e:
            print(f"Error retrieving branch: {e}")
            return None

    async def get_branches(
        self,
        skip: int = 0,
        limit: int = 20,
        degree_type: Optional[str] = None,
        search_term: Optional[str] = None
    ) -> List[Branch]:
        """
        Retrieve a list of branches with optional filtering.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            degree_type: Filter by degree type (ug, pg, phd)
            search_term: Search in name and description

        Returns:
            List of Branch objects
        """
        query = {}
        if degree_type:
            query["degree_type"] = degree_type

        if search_term:
            query["$or"] = [
                {"name": {"$regex": search_term, "$options": "i"}},
                {"description": {"$regex": search_term, "$options": "i"}}
            ]

        cursor = self.collection.find(query)
        cursor.skip(skip).limit(limit).sort("name", 1)

        branches = []
        async for branch in cursor:
            branch["id"] = str(branch.pop("_id"))
            branches.append(Branch(**branch))

        return branches

    async def update_branch(
            self,
            branch_id: str,
            branch_data: dict
    ) -> Optional[Branch]:
        """
        Update a branch with new data.

        Args:
            branch_id: ID of the branch to update
            branch_data: Dictionary of fields to update

        Returns:
            Updated Branch if successful, None otherwise
        """
        try:
            # Add updated timestamp
            branch_data["updatedAt"] = datetime.utcnow().isoformat()

            result = await self.collection.update_one(
                {"_id": ObjectId(branch_id)},
                {"$set": branch_data}
            )

            if result.modified_count:
                return await self.get_branch(branch_id)
            return None
        except Exception as e:
            print(f"Error updating branch: {e}")
            return None

    async def delete_branch(self, branch_id: str) -> bool:
        """
        Delete a branch by ID.

        Args:
            branch_id: ID of the branch to delete

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            result = await self.collection.delete_one(
                {"_id": ObjectId(branch_id)}
            )
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting branch: {e}")
            return False

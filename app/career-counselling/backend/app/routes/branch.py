from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from app.models.branch import BranchBase, Branch
from app.managers.branch import BranchManager

router = APIRouter()
branch_manager = BranchManager()


@router.post("/branches/", response_model=Branch)
async def create_branch(branch: BranchBase):
    """Create a new branch entry"""
    return await branch_manager.create_branch(branch)


@router.get("/branches/options", response_model=List[dict])
async def get_branch_options():
    """Get a list of branches for dropdown options"""
    try:
        branches = []
        cursor = branch_manager.db.branches.find({}, {"name": 1}).sort("name", 1)
        
        async for branch in cursor:
            branches.append({
                "value": str(branch["_id"]),
                "label": branch["name"]
            })
            
        return branches
    except Exception as e:
        print(f"Error getting branch options: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch branch options")


@router.get("/branches/{branch_id}", response_model=Branch)
async def get_branch(branch_id: str):
    """Get a specific branch by ID"""
    branch = await branch_manager.get_branch(branch_id)
    if branch is None:
        raise HTTPException(
            status_code=404,
            detail="Branch not found"
        )
    return branch


@router.get("/branches/", response_model=List[Branch])
async def list_branches(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of records to return"),
    degree_type: Optional[str] = Query(
        None, description="Filter by degree type (ug, pg, phd)"),
    search_term: Optional[str] = Query(
        None, description="Search in name and description")
):
    """Get a list of branches with optional filtering and search"""
    return await branch_manager.get_branches(
        skip=skip,
        limit=limit,
        degree_type=degree_type,
        search_term=search_term
    )


@router.put("/branches/{branch_id}", response_model=Branch)
async def update_branch(
    branch_id: str,
    branch_data: dict = Body(...)
):
    """Update a branch with new data"""
    branch = await branch_manager.update_branch(branch_id, branch_data)
    if branch is None:
        raise HTTPException(
            status_code=404,
            detail="Branch not found or update failed"
        )
    return branch


@router.delete("/branches/{branch_id}", status_code=204)
async def delete_branch(branch_id: str):
    """Delete a branch by ID"""
    success = await branch_manager.delete_branch(branch_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Branch not found or deletion failed"
        )
    # Return no content on successful deletion
    return None

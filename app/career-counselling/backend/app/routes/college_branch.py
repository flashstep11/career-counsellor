from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from app.models.college_branch import CollegeBranchBase, CollegeBranchResponse
from app.managers.college_branch import CollegeBranchManager

router = APIRouter()
college_branch_manager = CollegeBranchManager()


@router.post("/college-branches/", response_model=CollegeBranchResponse)
async def create_college_branch(college_branch: CollegeBranchBase):
    """Create a new college branch entry"""
    return await college_branch_manager.create_college_branch(college_branch)


@router.get("/college-branches/{branch_id}", response_model=CollegeBranchResponse)
async def get_college_branch(branch_id: str):
    """Get a specific college branch by ID"""
    college_branch = await college_branch_manager.get_college_branch(branch_id)
    if college_branch is None:
        raise HTTPException(
            status_code=404,
            detail="College branch not found"
        )
    return college_branch


@router.get("/college-branches/", response_model=List[CollegeBranchResponse])
async def list_college_branches(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        10, ge=1, le=50, description="Maximum number of records to return"),
    college_id: Optional[str] = Query(
        None, description="Filter by college ID"),
    branch_id: Optional[str] = Query(None, description="Filter by branch ID")
):
    """Get a list of college branches with optional filtering"""
    return await college_branch_manager.get_college_branches(
        skip=skip,
        limit=limit,
        college_id=college_id,
        branch_id=branch_id
    )


@router.get("/colleges/{college_id}/branches/", response_model=List[CollegeBranchResponse])
async def get_branches_by_college(
    college_id: str,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of records to return")
):
    """Get all branches for a specific college"""
    return await college_branch_manager.get_branches_by_college(
        college_id=college_id,
        skip=skip,
        limit=limit
    )


@router.get("/branches/{branch_id}/colleges/", response_model=List[CollegeBranchResponse])
async def get_colleges_by_branch(
    branch_id: str,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of records to return")
):
    """Get all colleges offering a specific branch"""
    return await college_branch_manager.get_colleges_by_branch(
        branch_id=branch_id,
        skip=skip,
        limit=limit
    )


@router.put("/college-branches/{branch_id}/cutoffs", response_model=CollegeBranchResponse)
async def update_cutoffs(
    branch_id: str,
    cutoffs: List = Body(...)
):
    """Update cutoffs for a college branch"""
    college_branch = await college_branch_manager.update_cutoffs(branch_id, cutoffs)
    if college_branch is None:
        raise HTTPException(
            status_code=404,
            detail="College branch not found or update failed"
        )
    return college_branch


@router.put("/college-branches/{branch_id}/placements", response_model=CollegeBranchResponse)
async def update_placements(
    branch_id: str,
    placements: List = Body(...)
):
    """Update placement data for a college branch"""
    college_branch = await college_branch_manager.update_placements(branch_id, placements)
    if college_branch is None:
        raise HTTPException(
            status_code=404,
            detail="College branch not found or update failed"
        )
    return college_branch

from fastapi import APIRouter, HTTPException, Query, Request
from typing import List, Optional
from app.models.college import College, CollegeResponse, CollegeDescriptionResponse, CollegePredictRequest
from app.managers.college import CollegeManager
from app.managers.user import UserManager
from app.core.auth_utils import verify_token

router = APIRouter()
college_manager = CollegeManager()
user_manager = UserManager()


@router.post("/colleges/", response_model=CollegeResponse)
async def create_college(college: College):
    """Create a new college entry"""
    return await college_manager.create_college(college)


@router.get("/colleges/options", response_model=List[dict])
async def get_college_options():
    """Get a list of colleges for dropdown options"""
    try:
        colleges = []
        cursor = db = college_manager.db.colleges.find(
            {}, {"name": 1}).sort("name", 1)

        async for college in cursor:
            colleges.append({
                "value": str(college["_id"]),
                "label": college["name"]
            })

        return colleges
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch college options")


@router.get("/colleges/{college_id}", response_model=CollegeDescriptionResponse)
async def get_college(college_id: str):
    """Get a specific college by ID"""
    college = await college_manager.get_college(college_id)
    if college is None:
        raise HTTPException(
            status_code=404,
            detail="College not found"
        )
    return college


@router.get("/colleges/", response_model=dict)
async def list_colleges(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=50, description="Items per page"),
    landArea: Optional[float] = Query(
        None, description="Filter by min land area and above"),
    placement: Optional[float] = Query(
        None, description="Filter by min placement percentage and above"),
    locality_type: Optional[str] = Query(
        None, description="Filter by locality type"),
    college_type: Optional[str] = Query(
        None, description="Filter by college type"),
    state: Optional[str] = Query(None, description="Filter by state"),
    course_category: Optional[str] = Query(
        None, description="Filter by course category"),
    sort: Optional[str] = Query(
        None, description="Sorting criteria in format: field:order,field:order")
):
    """Get a list of colleges with optional filtering and pagination metadata"""
    try:
        # Calculate skip based on page number and limit
        skip = (page - 1) * limit

        # Get paginated colleges
        colleges = await college_manager.get_colleges(
            skip=skip,
            limit=limit,
            landArea=landArea,
            placement=placement,
            locality_type=locality_type,
            college_type=college_type,
            state=state,
            course_category=course_category,
            sort=sort
        )

        # Get total count of colleges matching the filters
        total = await college_manager.count_colleges(
            landArea=landArea,
            placement=placement,
            locality_type=locality_type,
            college_type=college_type,
            state=state,
            course_category=course_category
        )

        # Calculate total pages
        total_pages = (total + limit - 1) // limit if total > 0 else 1

        return {
            "colleges": colleges,
            "total": total,
            "totalPages": total_pages,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch colleges: {str(e)}")


@router.post("/colleges/predict")
async def predict_colleges(
    request_data: CollegePredictRequest,
    request: Request
):
    """
    Predict colleges based on exam ranks and other filters.

    The user's home_state, gender, and category are extracted from the token.
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    obj = await verify_token(token)
    email = obj.get("email") if obj else None

    if not email:
        raise HTTPException(status_code=404, detail="Invalid Token")

    user = await user_manager.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_home_state = user.home_state
    user_gender = user.gender
    user_category = user.category

    # Validate ranks
    if request_data.exam_ranks:
        for exam, rank in request_data.exam_ranks.items():
            if rank < 1:
                raise HTTPException(
                    status_code=400,
                    detail="Please enter valid ranks"
                )

    predictions = await college_manager.predict_colleges(
        exam_ranks=request_data.exam_ranks,
        preferred_state=request_data.preferred_state,
        locality=request_data.locality,
        preferred_branches=request_data.preferred_branches,
        placement_range=request_data.placement_range,
        gender_ratio_range=request_data.gender_ratio_range,
        nirf_ranking_range=request_data.nirf_ranking_range,
        h_index_range=request_data.h_index_range,  # Add h-index range
        distance_range=request_data.distance_range,
        user_home_state=user_home_state,
        user_gender=user_gender,
        user_category=user_category,
    )
    return predictions


@router.get("/colleges-by-state", response_model=List[dict])
async def get_colleges_by_state():
    """
    Get count of colleges grouped by state.
    Returns a list of dictionaries with state name and count.
    """
    try:
        state_counts = await college_manager.get_colleges_by_state()
        return state_counts
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch college counts by state")

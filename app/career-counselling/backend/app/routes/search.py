from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.models.search import SearchType, SearchResult
from app.managers.search import SearchManager
from app.managers.connection import ConnectionManager
from app.core.auth_utils import get_optional_user

router = APIRouter()
search_manager = SearchManager()
connection_manager = ConnectionManager()


@router.get("/search", response_model=SearchResult)
async def search(
    q: str = Query(..., min_length=1, description="Search query string"),
    type: SearchType = Query(SearchType.ALL, description="Type of content to search"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of records to return"),
    user_data: Optional[dict] = Depends(get_optional_user),
):
    """
    Search across different types of content.
    Connected experts / authors are surfaced first for authenticated users.
    """
    connected_ids = None
    if user_data:
        connected_ids = await connection_manager.get_connected_user_ids(user_data["id"])

    return await search_manager.search(
        query=q,
        search_type=type,
        skip=skip,
        limit=limit,
        connected_ids=connected_ids,
    )

from fastapi import APIRouter, Depends
from typing import List, Dict

router = APIRouter(
    prefix="/refunds",
    tags=["Refunds"]
)

@router.get("/expert", response_model=List[Dict])
async def get_expert_refunds():
    """
    Temporary mock endpoint to prevent 404 proxy errors
    until full refund logic is integrated with the database.
    """
    return []

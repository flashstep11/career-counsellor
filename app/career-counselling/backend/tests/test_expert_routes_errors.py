import asyncio
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.routes import expert as expert_route
from app.models.expert import ExpertUpdate


def test_update_expert_profile_raises_404_if_missing(monkeypatch):
    expert_id = str(ObjectId())
    expert_update = ExpertUpdate()

    # Mock get_expert to return None
    monkeypatch.setattr(
        expert_route.expert_manager,
        "get_expert",
        AsyncMock(return_value=None),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            expert_route.update_expert_profile(
                expert_id=expert_id,
                expert_update=expert_update,
                current_user={"id": "owner-1", "isAdmin": False},
            )
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Expert not found"

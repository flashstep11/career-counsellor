import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.routes import expert_analytics as analytics_route


def test_get_expert_analytics_allows_owner(monkeypatch):
    expert_id = str(ObjectId())
    analytics_payload = {"views": {}, "content": {}, "performance": {}}

    monkeypatch.setattr(
        analytics_route.expert_manager,
        "get_expert",
        AsyncMock(return_value=SimpleNamespace(userId="owner-1")),
    )
    monkeypatch.setattr(
        analytics_route.analytics_manager,
        "get_expert_analytics",
        AsyncMock(return_value=analytics_payload),
    )

    result = asyncio.run(
        analytics_route.get_expert_analytics(
            expert_id=expert_id,
            current_user={"id": "owner-1", "isAdmin": False},
        )
    )

    assert result == analytics_payload


def test_get_expert_analytics_allows_admin(monkeypatch):
    expert_id = str(ObjectId())
    analytics_payload = {"views": {}, "content": {}, "performance": {}}

    monkeypatch.setattr(
        analytics_route.expert_manager,
        "get_expert",
        AsyncMock(return_value=SimpleNamespace(userId="owner-1")),
    )
    monkeypatch.setattr(
        analytics_route.analytics_manager,
        "get_expert_analytics",
        AsyncMock(return_value=analytics_payload),
    )

    result = asyncio.run(
        analytics_route.get_expert_analytics(
            expert_id=expert_id,
            current_user={"id": "admin-1", "isAdmin": True},
        )
    )

    assert result == analytics_payload


def test_get_expert_analytics_rejects_non_owner(monkeypatch):
    expert_id = str(ObjectId())

    monkeypatch.setattr(
        analytics_route.expert_manager,
        "get_expert",
        AsyncMock(return_value=SimpleNamespace(userId="owner-1")),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            analytics_route.get_expert_analytics(
                expert_id=expert_id,
                current_user={"id": "random-user", "isAdmin": False},
            )
        )

    assert exc.value.status_code == 403


def test_get_expert_analytics_404_for_missing_expert(monkeypatch):
    expert_id = str(ObjectId())

    monkeypatch.setattr(
        analytics_route.expert_manager,
        "get_expert",
        AsyncMock(return_value=None),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            analytics_route.get_expert_analytics(
                expert_id=expert_id,
                current_user={"id": "owner-1", "isAdmin": False},
            )
        )

    assert exc.value.status_code == 404

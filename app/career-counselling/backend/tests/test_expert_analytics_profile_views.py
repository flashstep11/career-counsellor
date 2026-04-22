import asyncio
import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from fastapi import HTTPException
from starlette.requests import Request

from app.managers.expert_analytics import ExpertAnalyticsManager
from app.routes import expert_analytics as analytics_route


class _FakeProfileViewEventsCollection:
    def __init__(self):
        self.events = []

    async def find_one(self, query):
        expert_id = query.get("expertId")
        viewer_key = query.get("viewerKey")
        viewed_at_filter = query.get("viewedAt", {})
        gte = viewed_at_filter.get("$gte")

        for event in self.events:
            if (
                event["expertId"] == expert_id
                and event["viewerKey"] == viewer_key
                and (gte is None or event["viewedAt"] >= gte)
            ):
                return event
        return None

    async def insert_one(self, doc):
        self.events.append(doc)
        return SimpleNamespace(inserted_id=len(self.events))


class _FakeExpertsCollection:
    def __init__(self, existing_ids):
        self.existing_ids = set(existing_ids)
        self.profile_views = {eid: 0 for eid in existing_ids}

    async def update_one(self, filter_query, update_query):
        oid = filter_query.get("_id")
        oid_str = str(oid)
        if oid_str not in self.existing_ids:
            return SimpleNamespace(matched_count=0, modified_count=0)

        inc_amount = update_query.get("$inc", {}).get("profileViews", 0)
        self.profile_views[oid_str] += inc_amount
        return SimpleNamespace(matched_count=1, modified_count=1)


def test_track_profile_view_dedupes_same_viewer_within_window():
    expert_id = str(ObjectId())
    manager = ExpertAnalyticsManager()
    manager.experts_collection = _FakeExpertsCollection([expert_id])
    manager.profile_view_events_collection = _FakeProfileViewEventsCollection()

    async def _run():
        ok_first = await manager.track_profile_view(
            expert_id=expert_id,
            viewer_key="user:viewer-1",
            dedupe_hours=24,
        )
        ok_second = await manager.track_profile_view(
            expert_id=expert_id,
            viewer_key="user:viewer-1",
            dedupe_hours=24,
        )
        return ok_first, ok_second

    ok_first, ok_second = asyncio.run(_run())

    assert ok_first is True
    assert ok_second is True
    assert manager.experts_collection.profile_views[expert_id] == 1
    assert len(manager.profile_view_events_collection.events) == 1


def test_track_profile_view_counts_different_viewers():
    expert_id = str(ObjectId())
    manager = ExpertAnalyticsManager()
    manager.experts_collection = _FakeExpertsCollection([expert_id])
    manager.profile_view_events_collection = _FakeProfileViewEventsCollection()

    async def _run():
        ok_first = await manager.track_profile_view(
            expert_id=expert_id,
            viewer_key="user:viewer-1",
            dedupe_hours=24,
        )
        ok_second = await manager.track_profile_view(
            expert_id=expert_id,
            viewer_key="user:viewer-2",
            dedupe_hours=24,
        )
        return ok_first, ok_second

    ok_first, ok_second = asyncio.run(_run())

    assert ok_first is True
    assert ok_second is True
    assert manager.experts_collection.profile_views[expert_id] == 2
    assert len(manager.profile_view_events_collection.events) == 2


def test_route_profile_view_uses_authenticated_viewer_key(monkeypatch):
    expert_id = str(ObjectId())
    mock_track = AsyncMock(return_value=True)
    monkeypatch.setattr(analytics_route.analytics_manager, "track_profile_view", mock_track)

    scope = {
        "type": "http",
        "method": "POST",
        "path": f"/api/experts/{expert_id}/profile-view",
        "headers": [],
        "client": ("127.0.0.1", 53210),
        "query_string": b"",
    }
    request = Request(scope)

    async def _run():
        return await analytics_route.track_profile_view(
            expert_id=expert_id,
            request=request,
            current_user={"id": "abc123", "email": "user@example.com", "role": "user"},
        )

    response = asyncio.run(_run())

    assert response == {"message": "View tracked successfully"}
    mock_track.assert_awaited_once_with(
        expert_id,
        viewer_key="user:abc123",
        dedupe_hours=24,
    )


def test_route_profile_view_raises_404_when_tracking_fails(monkeypatch):
    expert_id = str(ObjectId())
    mock_track = AsyncMock(return_value=False)
    monkeypatch.setattr(analytics_route.analytics_manager, "track_profile_view", mock_track)

    scope = {
        "type": "http",
        "method": "POST",
        "path": f"/api/experts/{expert_id}/profile-view",
        "headers": [(b"user-agent", b"pytest-agent")],
        "client": ("127.0.0.1", 53210),
        "query_string": b"",
    }
    request = Request(scope)

    async def _run():
        return await analytics_route.track_profile_view(
            expert_id=expert_id,
            request=request,
            current_user=None,
        )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(_run())

    assert exc.value.status_code == 404
    assert "view tracking failed" in exc.value.detail.lower()


def test_route_profile_view_uses_anonymous_viewer_key(monkeypatch):
    expert_id = str(ObjectId())
    mock_track = AsyncMock(return_value=True)
    monkeypatch.setattr(analytics_route.analytics_manager, "track_profile_view", mock_track)

    # Use a mock request that provides a valid client IP and user_agent
    scope = {
        "type": "http",
        "method": "POST",
        "path": f"/api/experts/{expert_id}/profile-view",
        "headers": [(b"user-agent", b"anonymous-agent")],
        "client": ("192.168.1.1", 12345),
        "query_string": b"",
    }
    request = Request(scope)

    async def _run():
        return await analytics_route.track_profile_view(
            expert_id=expert_id,
            request=request,
            current_user=None,
        )

    response = asyncio.run(_run())

    assert response == {"message": "View tracked successfully"}
    mock_track.assert_awaited_once()
    
    # Assert that a fingerprint string is generated and passed as viewer_key
    args, kwargs = mock_track.call_args
    assert args[0] == expert_id
    assert kwargs["viewer_key"].startswith("anon:")
    assert kwargs["dedupe_hours"] == 24

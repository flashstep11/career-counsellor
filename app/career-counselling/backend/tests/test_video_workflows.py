import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.models.video import VideoCreate
from app.routes import video as video_route


def test_list_videos_paginates_and_total_pages(monkeypatch):
    monkeypatch.setattr(
        video_route.video_manager,
        "get_videos_with_filters",
        AsyncMock(return_value=[{"videoID": "v1"}]),
    )
    monkeypatch.setattr(video_route.video_manager, "count_videos_with_filters", AsyncMock(return_value=0))

    result = asyncio.run(video_route.list_videos(page=1, limit=10, category=None, sortBy="recent", typeId=None, refType=None))

    assert result["videos"] == [{"videoID": "v1"}]
    assert result["total"] == 0
    assert result["totalPages"] == 1

    call = video_route.video_manager.get_videos_with_filters.await_args
    assert call.kwargs["skip"] == 0
    assert call.kwargs["limit"] == 10


def test_create_video_notifies_followers(monkeypatch):
    async def _create_video_side_effect(video, user_id):
        return {
            "videoID": "v-created",
            "title": video.title,
            "description": video.description,
            "youtubeUrl": "https://youtube.com/x",
            "tags": video.tags,
            "refType": video.refType,
            "typeId": video.typeId,
            "userId": user_id,
        }

    monkeypatch.setattr(video_route.video_manager, "create_video", AsyncMock(side_effect=_create_video_side_effect))
    monkeypatch.setattr(
        video_route.notification_manager,
        "create_video_notification_for_followers",
        AsyncMock(return_value=None),
    )

    payload = VideoCreate(
        title="T",
        description="D",
        youtubeUrl="https://youtube.com/watch?v=x",
        tags=["a"],
        refType="NA",
        typeId=None,
    )

    res = asyncio.run(video_route.create_video(video=payload, user_data={"id": "expert-1"}))
    assert res["videoID"] == "v-created"

    video_route.notification_manager.create_video_notification_for_followers.assert_awaited_once()


def test_update_video_injects_tags_and_allows_admin(monkeypatch):
    updated_box = {}

    async def _update_side_effect(video_id, video_update, user_id=None):
        updated_box["args"] = (video_id, video_update, user_id)
        return {"videoID": video_id, **video_update}

    monkeypatch.setattr(video_route.video_manager, "update_video", AsyncMock(side_effect=_update_side_effect))

    res = asyncio.run(
        video_route.update_video(
            video_id="v1",
            video_update={"title": "New"},
            user_data={"id": "admin-1", "isAdmin": True},
        )
    )

    assert res["videoID"] == "v1"
    # tags should be injected if missing
    assert updated_box["args"][1]["tags"] == []
    # admin path should pass user_id=None
    assert updated_box["args"][2] is None


def test_delete_video_requires_user_id_when_not_admin(monkeypatch):
    monkeypatch.setattr(video_route.video_manager, "delete_video", AsyncMock(return_value=True))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(video_route.delete_video(video_id="v1", user_data={"isAdmin": False}))

    assert exc.value.status_code == 400


def test_like_video_returns_400_when_user_id_missing(monkeypatch):
    monkeypatch.setattr(video_route.video_manager, "like_video", AsyncMock(return_value=None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(video_route.like_video(video_id="v1", user_data={}))

    assert exc.value.status_code == 400


def test_like_video_returns_404_when_video_missing(monkeypatch):
    monkeypatch.setattr(video_route.video_manager, "like_video", AsyncMock(return_value=None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(video_route.like_video(video_id="missing", user_data={"id": "u1"}))

    assert exc.value.status_code == 404


def test_check_video_like_returns_status(monkeypatch):
    monkeypatch.setattr(video_route.video_manager, "check_video_like", AsyncMock(return_value={"liked": False}))

    res = asyncio.run(video_route.check_video_like(video_id="v1", user_data={"id": "u1"}))
    assert res == {"liked": False}

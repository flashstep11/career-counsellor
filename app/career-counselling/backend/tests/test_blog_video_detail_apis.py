import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.models.video import VideoCreate
from app.routes import blog as blog_route
from app.routes import expert_analytics as analytics_route
from app.routes import video as video_route


def test_get_single_blog_raises_404_when_missing(monkeypatch):
    monkeypatch.setattr(blog_route.blog_manager, "get_blog", AsyncMock(return_value=None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(blog_route.get_single_blog(blog_id="missing"))

    assert exc.value.status_code == 404


def test_get_single_blog_returns_blog_when_found(monkeypatch):
    blog = {"blogID": "b1", "heading": "Hello"}
    monkeypatch.setattr(blog_route.blog_manager, "get_blog", AsyncMock(return_value=blog))

    res = asyncio.run(blog_route.get_single_blog(blog_id="b1"))

    assert res == blog


def test_update_blog_logs_activity_on_success(monkeypatch):
    updated = SimpleNamespace(blogID="b1", heading="New")
    monkeypatch.setattr(blog_route.blog_manager, "update_blog", AsyncMock(return_value=updated))

    fake_user_manager = SimpleNamespace(log_activity=AsyncMock())
    monkeypatch.setattr(blog_route, "UserManager", lambda: fake_user_manager)

    res = asyncio.run(blog_route.update_blog(blog_id="b1", blog_update={"heading": "New"}, user_data={"id": "u1"}))

    assert res is updated
    fake_user_manager.log_activity.assert_awaited_once()


def test_delete_blog_logs_activity_on_success(monkeypatch):
    blog = SimpleNamespace(blogID="b1", heading="Old")
    monkeypatch.setattr(blog_route.blog_manager, "get_blog", AsyncMock(return_value=blog))
    monkeypatch.setattr(blog_route.blog_manager, "delete_blog", AsyncMock(return_value=True))

    fake_user_manager = SimpleNamespace(log_activity=AsyncMock())
    monkeypatch.setattr(blog_route, "UserManager", lambda: fake_user_manager)

    res = asyncio.run(blog_route.delete_blog(blog_id="b1", user_data={"id": "u1"}))

    assert res == {"message": "Blog deleted successfully"}
    fake_user_manager.log_activity.assert_awaited_once()


def test_report_blog_raises_404_when_blog_missing(monkeypatch):
    monkeypatch.setattr(blog_route.blog_manager, "get_blog", AsyncMock(return_value=None))

    body = blog_route.BlogReportBody(reason="spam")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(blog_route.report_blog(blog_id="missing", body=body, user_data={"id": "u1"}))

    assert exc.value.status_code == 404


def test_get_video_raises_404_when_missing(monkeypatch):
    monkeypatch.setattr(video_route.video_manager, "get_video", AsyncMock(return_value=None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(video_route.get_video(video_id="missing", user_data={"id": "u1"}))

    assert exc.value.status_code == 404


def test_get_video_returns_video_when_found(monkeypatch):
    video = {"videoID": "v1", "title": "T"}
    monkeypatch.setattr(video_route.video_manager, "get_video", AsyncMock(return_value=video))

    res = asyncio.run(video_route.get_video(video_id="v1", user_data={"id": "u1"}))

    assert res == video


def test_get_related_videos_paginates(monkeypatch):
    monkeypatch.setattr(video_route.video_manager, "get_related_videos", AsyncMock(return_value=[{"videoID": "v2"}]))
    monkeypatch.setattr(video_route.video_manager, "count_related_videos", AsyncMock(return_value=7))

    res = asyncio.run(
        video_route.get_related_videos(
            video_id="v1",
            page=2,
            limit=3,
            user_data={"id": "u1"},
        )
    )

    assert res["videos"] == [{"videoID": "v2"}]
    assert res["total"] == 7
    assert res["totalPages"] == 3
    assert res["page"] == 2
    assert res["limit"] == 3

    call = video_route.video_manager.get_related_videos.await_args
    assert call.args[0] == "v1"
    assert call.args[1] == 3
    assert call.args[2] == 3


def test_create_video_returns_400_on_validation_error(monkeypatch):
    async def _raise_value_error(*_args, **_kwargs):
        raise ValueError("bad")

    monkeypatch.setattr(video_route.video_manager, "create_video", AsyncMock(side_effect=_raise_value_error))

    payload = VideoCreate(
        title="T",
        description="D",
        youtubeUrl="https://youtube.com/watch?v=x",
        tags=[],
        refType="NA",
        typeId=None,
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(video_route.create_video(video=payload, user_data={"id": "expert-1"}))

    assert exc.value.status_code == 400


def test_track_blog_view_returns_message_on_success(monkeypatch):
    monkeypatch.setattr(analytics_route.analytics_manager, "track_blog_view", AsyncMock(return_value=True))

    res = asyncio.run(analytics_route.track_blog_view(blog_id="b1"))

    assert res == {"message": "View tracked successfully"}


def test_track_blog_view_raises_404_when_tracking_fails(monkeypatch):
    monkeypatch.setattr(analytics_route.analytics_manager, "track_blog_view", AsyncMock(return_value=False))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(analytics_route.track_blog_view(blog_id="missing"))

    assert exc.value.status_code == 404

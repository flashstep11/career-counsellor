import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.models.blog import BlogBase
from app.routes import blog as blog_route


def test_list_blogs_paginates_and_calculates_total_pages(monkeypatch):
    monkeypatch.setattr(
        blog_route.blog_manager,
        "get_blogs_with_filters",
        AsyncMock(return_value=[{"blogID": "b1"}]),
    )
    monkeypatch.setattr(
        blog_route.blog_manager,
        "count_blogs_with_filters",
        AsyncMock(return_value=21),
    )

    result = asyncio.run(blog_route.list_blogs(page=2, limit=10, expert=None, refType=None, typeId=None, sortBy="recent"))

    assert result["blogs"] == [{"blogID": "b1"}]
    assert result["total"] == 21
    assert result["totalPages"] == 3
    assert result["page"] == 2
    assert result["limit"] == 10

    call = blog_route.blog_manager.get_blogs_with_filters.await_args
    assert call.kwargs["skip"] == 10
    assert call.kwargs["limit"] == 10


def test_create_blog_logs_activity_and_notifies_followers(monkeypatch):
    created_blog_box = {}

    async def _create_blog_side_effect(blog):
        # The route creates the Blog instance and passes it to the manager.
        created_blog_box["blog"] = blog
        blog.blogID = "b-created"
        return blog

    monkeypatch.setattr(blog_route.blog_manager, "create_blog", AsyncMock(side_effect=_create_blog_side_effect))

    fake_user_manager = SimpleNamespace(log_activity=AsyncMock())
    monkeypatch.setattr(blog_route, "UserManager", lambda: fake_user_manager)

    monkeypatch.setattr(
        blog_route.notification_manager,
        "create_blog_notification_for_followers",
        AsyncMock(return_value=None),
    )

    blog_base = BlogBase(heading="H", body="B", refType="NA", typeId=None)

    result = asyncio.run(blog_route.create_blog(blog_data=blog_base, user_data={"id": "expert-1"}))

    assert result.blogID == "b-created"
    assert created_blog_box["blog"].userID == "expert-1"

    fake_user_manager.log_activity.assert_awaited()
    blog_route.notification_manager.create_blog_notification_for_followers.assert_awaited_once()


def test_update_blog_raises_404_when_manager_returns_none(monkeypatch):
    monkeypatch.setattr(blog_route.blog_manager, "update_blog", AsyncMock(return_value=None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(blog_route.update_blog(blog_id="missing", blog_update={}, user_data={"id": "u1"}))

    assert exc.value.status_code == 404


def test_delete_blog_raises_404_when_missing(monkeypatch):
    monkeypatch.setattr(blog_route.blog_manager, "get_blog", AsyncMock(return_value=None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(blog_route.delete_blog(blog_id="missing", user_data={"id": "u1"}))

    assert exc.value.status_code == 404


def test_report_blog_calls_report_manager(monkeypatch):
    monkeypatch.setattr(blog_route.blog_manager, "get_blog", AsyncMock(return_value={"blogID": "b1"}))
    monkeypatch.setattr(blog_route.report_manager, "create_report", AsyncMock(return_value={"ok": True}))

    body = blog_route.BlogReportBody(reason="spam")
    res = asyncio.run(blog_route.report_blog(blog_id="b1", body=body, user_data={"id": "u1"}))

    assert res == {"ok": True}
    blog_route.report_manager.create_report.assert_awaited_once()


def test_like_blog_returns_404_when_missing(monkeypatch):
    monkeypatch.setattr(blog_route.blog_manager, "like_blog", AsyncMock(return_value=None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(blog_route.like_blog(blog_id="missing", user_data={"id": "u1"}))

    assert exc.value.status_code == 404


def test_check_blog_like_returns_status(monkeypatch):
    monkeypatch.setattr(blog_route.blog_manager, "check_blog_like", AsyncMock(return_value={"liked": True}))

    res = asyncio.run(blog_route.check_blog_like(blog_id="b1", user_data={"id": "u1"}))

    assert res == {"liked": True}

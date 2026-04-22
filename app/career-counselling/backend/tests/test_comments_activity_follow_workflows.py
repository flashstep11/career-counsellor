import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.models.comment import CommentCreate, CommentResponse
from app.routes import activity as activity_route
from app.routes import comment as comment_route
from app.routes import user as user_route


class _FakeCommentsCollection:
    def __init__(self, docs_by_oid):
        self._docs_by_oid = dict(docs_by_oid)

    async def find_one(self, query):
        oid = query.get("_id")
        return self._docs_by_oid.get(oid)


class _FakeUsersCollection:
    def __init__(self, email_to_oid):
        self._email_to_oid = dict(email_to_oid)

    async def find_one(self, query, projection=None):
        email = query.get("email")
        oid = self._email_to_oid.get(email)
        return {"_id": oid} if oid else None


def test_create_comment_sets_userid_and_calls_manager(monkeypatch):
    captured = {}

    async def _create_side_effect(comment):
        captured["comment"] = comment
        return CommentResponse(
            commentID="c1",
            content=comment.content,
            type=comment.type,
            page_id=comment.page_id,
            parent_id=comment.parent_id,
            userID=comment.userID,
            createdAt=comment.createdAt,
            updatedAt=comment.updatedAt,
            user={"name": "U"},
            replies=[],
        )

    monkeypatch.setattr(comment_route, "get_database", lambda: SimpleNamespace(comments=_FakeCommentsCollection({}), users=_FakeUsersCollection({})))
    monkeypatch.setattr(comment_route.comment_manager, "create_comment", AsyncMock(side_effect=_create_side_effect))

    payload = CommentCreate(content="Hi", type="blog", page_id="b1", parent_id=None)
    res = asyncio.run(comment_route.create_comment(comment_data=payload, user_data={"email": "me@example.com", "id": "u1"}))

    assert res.commentID == "c1"
    assert captured["comment"].userID == "me@example.com"


def test_create_comment_reply_sends_notification(monkeypatch):
    parent_oid = ObjectId()
    parent_user_oid = ObjectId()

    fake_db = SimpleNamespace(
        comments=_FakeCommentsCollection({parent_oid: {"_id": parent_oid, "parent_id": None, "userID": "parent@example.com"}}),
        users=_FakeUsersCollection({"parent@example.com": parent_user_oid}),
    )

    monkeypatch.setattr(comment_route, "get_database", lambda: fake_db)

    async def _create_side_effect(comment):
        now = datetime.utcnow()
        return CommentResponse(
            commentID="new-comment",
            content=comment.content,
            type=comment.type,
            page_id=comment.page_id,
            parent_id=comment.parent_id,
            userID=comment.userID,
            createdAt=now,
            updatedAt=now,
            user={"name": "Replier"},
            replies=[],
        )

    monkeypatch.setattr(comment_route.comment_manager, "create_comment", AsyncMock(side_effect=_create_side_effect))
    monkeypatch.setattr(comment_route.notification_manager, "create_reply_notification", AsyncMock(return_value=None))

    payload = CommentCreate(content="Reply", type="blog", page_id="b1", parent_id=str(parent_oid))
    res = asyncio.run(comment_route.create_comment(comment_data=payload, user_data={"email": "me@example.com", "id": "u1"}))

    assert res.commentID == "new-comment"

    comment_route.notification_manager.create_reply_notification.assert_awaited_once()
    args = comment_route.notification_manager.create_reply_notification.await_args.kwargs
    assert args["replier_id"] == "u1"
    assert args["parent_author_id"] == str(parent_user_oid)
    assert args["comment_id"] == "new-comment"


def test_create_comment_enforces_max_nesting_depth(monkeypatch):
    # Chain of parents that pushes depth beyond MAX_NESTING_DEPTH (4)
    oid1 = ObjectId()
    oid2 = ObjectId()
    oid3 = ObjectId()
    oid4 = ObjectId()
    oid5 = ObjectId()

    fake_db = SimpleNamespace(
        comments=_FakeCommentsCollection(
            {
                oid1: {"_id": oid1, "parent_id": str(oid2)},
                oid2: {"_id": oid2, "parent_id": str(oid3)},
                oid3: {"_id": oid3, "parent_id": str(oid4)},
                oid4: {"_id": oid4, "parent_id": str(oid5)},
                # oid5 intentionally missing => breaks loop after depth increments
            }
        ),
        users=_FakeUsersCollection({}),
    )

    monkeypatch.setattr(comment_route, "get_database", lambda: fake_db)
    monkeypatch.setattr(comment_route.comment_manager, "create_comment", AsyncMock())

    payload = CommentCreate(content="Too deep", type="blog", page_id="b1", parent_id=str(oid1))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(comment_route.create_comment(comment_data=payload, user_data={"email": "me@example.com", "id": "u1"}))

    assert exc.value.status_code == 400
    assert "maximum reply nesting depth" in exc.value.detail.lower()


def test_list_comments_passes_skip_and_limit(monkeypatch):
    monkeypatch.setattr(comment_route.comment_manager, "get_comments", AsyncMock(return_value={"comments": [], "total": 0}))

    res = asyncio.run(comment_route.list_comments(page_id="b1", type="blog", page=2, limit=10))

    assert res == {"comments": [], "total": 0}
    comment_route.comment_manager.get_comments.assert_awaited_once_with(page_id="b1", type="blog", skip=10, limit=10)


def test_activity_record_view_calls_manager(monkeypatch):
    monkeypatch.setattr(activity_route.activity_manager, "record_view", AsyncMock(return_value=None))

    payload = activity_route.ViewPayload(type="blog", itemId="b1", title="Hello")
    res = asyncio.run(activity_route.record_view(payload=payload, user_data={"id": "u1"}))

    assert res == {"ok": True}
    activity_route.activity_manager.record_view.assert_awaited_once_with(user_id="u1", item_type="blog", item_id="b1", title="Hello")


def test_activity_recent_calls_manager(monkeypatch):
    monkeypatch.setattr(activity_route.activity_manager, "get_recent_views", AsyncMock(return_value=[{"type": "blog"}]))

    res = asyncio.run(activity_route.get_recent_views(user_data={"id": "u1"}))

    assert res == [{"type": "blog"}]


def test_follow_user_happy_path(monkeypatch):
    monkeypatch.setattr(user_route.user_manager, "get_user_by_email", AsyncMock(return_value=SimpleNamespace(id="u1")))
    monkeypatch.setattr(
        user_route.user_manager,
        "get_user",
        AsyncMock(return_value=SimpleNamespace(id="expert-1", firstName="Ex", lastName="Pert", isExpert=True)),
    )
    monkeypatch.setattr(user_route.user_manager, "is_following", AsyncMock(return_value=False))
    monkeypatch.setattr(user_route.user_manager, "follow_user", AsyncMock(return_value=True))

    res = asyncio.run(user_route.follow_user(target_id="expert-1", user_data={"email": "me@example.com"}))

    assert "now following" in res["message"].lower()


def test_follow_user_rejects_non_expert_target(monkeypatch):
    monkeypatch.setattr(user_route.user_manager, "get_user_by_email", AsyncMock(return_value=SimpleNamespace(id="u1")))
    monkeypatch.setattr(
        user_route.user_manager,
        "get_user",
        AsyncMock(return_value=SimpleNamespace(id="user-2", firstName="A", lastName="B", isExpert=False)),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(user_route.follow_user(target_id="user-2", user_data={"email": "me@example.com"}))

    assert exc.value.status_code == 403


def test_follow_user_returns_already_following(monkeypatch):
    monkeypatch.setattr(user_route.user_manager, "get_user_by_email", AsyncMock(return_value=SimpleNamespace(id="u1")))
    monkeypatch.setattr(
        user_route.user_manager,
        "get_user",
        AsyncMock(return_value=SimpleNamespace(id="expert-1", firstName="Ex", lastName="Pert", isExpert=True)),
    )
    monkeypatch.setattr(user_route.user_manager, "is_following", AsyncMock(return_value=True))

    res = asyncio.run(user_route.follow_user(target_id="expert-1", user_data={"email": "me@example.com"}))

    assert res == {"message": "Already following this user"}


def test_unfollow_user_returns_not_following(monkeypatch):
    monkeypatch.setattr(user_route.user_manager, "get_user_by_email", AsyncMock(return_value=SimpleNamespace(id="u1")))
    monkeypatch.setattr(
        user_route.user_manager,
        "get_user",
        AsyncMock(return_value=SimpleNamespace(id="expert-1", firstName="Ex", lastName="Pert", isExpert=True)),
    )
    monkeypatch.setattr(user_route.user_manager, "is_following", AsyncMock(return_value=False))

    res = asyncio.run(user_route.unfollow_user(target_id="expert-1", user_data={"email": "me@example.com"}))

    assert res == {"message": "You are not following this user"}


def test_check_following_status_returns_boolean(monkeypatch):
    monkeypatch.setattr(user_route.user_manager, "get_user_by_email", AsyncMock(return_value=SimpleNamespace(id="u1")))
    monkeypatch.setattr(
        user_route.user_manager,
        "get_user",
        AsyncMock(return_value=SimpleNamespace(id="expert-1", firstName="Ex", lastName="Pert", isExpert=True)),
    )
    monkeypatch.setattr(user_route.user_manager, "is_following", AsyncMock(return_value=True))

    res = asyncio.run(user_route.check_following_status(target_id="expert-1", user_data={"email": "me@example.com"}))

    assert res == {"is_following": True}


def test_get_role_returns_role_from_user_data():
    res = asyncio.run(user_route.get_role(user_data={"role": "user"}))
    assert res == {"role": "user"}

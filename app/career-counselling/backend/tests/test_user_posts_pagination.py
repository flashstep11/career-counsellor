import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routes import user as user_route


class _FakeCursor:
    def __init__(self, docs):
        self.docs = docs
        self._skip = 0
        self._limit = len(docs)

    def sort(self, _field, _direction):
        self.docs = sorted(self.docs, key=lambda d: d["createdAt"], reverse=True)
        return self

    def skip(self, n):
        self._skip = n
        return self

    def limit(self, n):
        self._limit = n
        return self

    def __aiter__(self):
        sliced = self.docs[self._skip : self._skip + self._limit]
        self._iter = iter(sliced)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class _FakePostsCollection:
    def __init__(self, docs):
        self.docs = docs

    async def count_documents(self, query):
        return len([d for d in self.docs if d["authorId"] == query["authorId"]])

    def find(self, query):
        filtered = [d.copy() for d in self.docs if d["authorId"] == query["authorId"]]
        return _FakeCursor(filtered)


class _FakeDb:
    def __init__(self, docs):
        self.posts = _FakePostsCollection(docs)


def test_get_user_posts_returns_paginated_payload(monkeypatch):
    posts = [
        {
            "_id": f"post-{i}",
            "authorId": "user-1",
            "title": f"Post {i}",
            "createdAt": f"2026-04-{10 + i:02d}T10:00:00",
        }
        for i in range(15)
    ]

    async def _mock_get_user(user_id):
        return SimpleNamespace(id=user_id)

    monkeypatch.setattr(user_route.user_manager, "get_user", _mock_get_user)
    monkeypatch.setattr(user_route, "get_database", lambda: _FakeDb(posts))

    result = asyncio.run(user_route.get_user_posts("user-1", page=2, limit=10))

    assert result["total"] == 15
    assert result["page"] == 2
    assert result["limit"] == 10
    assert result["totalPages"] == 2
    assert len(result["posts"]) == 5
    assert result["posts"][0]["postId"] == result["posts"][0]["_id"]


def test_get_user_posts_raises_404_for_unknown_user(monkeypatch):
    async def _mock_get_user(_user_id):
        return None

    monkeypatch.setattr(user_route.user_manager, "get_user", _mock_get_user)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(user_route.get_user_posts("missing-user", page=1, limit=10))

    assert exc.value.status_code == 404
    assert exc.value.detail == "User not found"

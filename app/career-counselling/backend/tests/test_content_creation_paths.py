import asyncio
import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.managers.blog import BlogManager
from app.managers.post import PostManager
from app.managers.video import VideoManager
from app.models.blog import Blog
from app.models.video import VideoCreate


class _FakeInsertCollection:
    def __init__(self):
        self.inserted_docs = []

    async def insert_one(self, doc):
        self.inserted_docs.append(doc)
        return SimpleNamespace(inserted_id=f"id-{len(self.inserted_docs)}")


def test_video_create_initializes_default_metrics():
    manager = VideoManager()
    fake_collection = _FakeInsertCollection()
    manager.collection = fake_collection

    payload = VideoCreate(
        title="Video A",
        description="Desc",
        youtubeUrl="https://youtube.com/watch?v=abc",
        refType="NA",
        typeId=None,
        tags=["career"],
    )

    created = asyncio.run(manager.create_video(payload, user_id="user-1"))

    assert created.userId == "user-1"
    assert created.views == 0
    assert created.likes == 0
    assert created.likedBy == []


def test_blog_create_initializes_default_metrics():
    manager = BlogManager()
    fake_collection = _FakeInsertCollection()
    manager.collection = fake_collection

    blog = Blog(
        heading="Blog A",
        body="Body",
        refType="NA",
        typeId=None,
        userID="user-1",
        createdAt=datetime.datetime.utcnow(),
        updatedAt=datetime.datetime.utcnow(),
    )

    created = asyncio.run(manager.create_blog(blog))

    assert created.userID == "user-1"
    assert created.views == 0
    assert created.likes == 0
    assert created.likedBy == []


def test_post_create_initializes_default_metrics_and_ids(monkeypatch):
    manager = PostManager()
    fake_collection = _FakeInsertCollection()
    manager.collection = fake_collection
    manager._enrich = AsyncMock(return_value=None)

    created = asyncio.run(
        manager.create_community_post(
            community_id="community-1",
            author_id="user-1",
            title="Post A",
            content="Post body",
            tags=["tag1"],
            media=[],
        )
    )

    assert created.authorId == "user-1"
    assert created.communityId == "community-1"
    assert created.views == 0
    assert created.likes == 0
    assert created.postId is not None

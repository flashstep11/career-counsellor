import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.routes import video as video_route


def test_get_my_videos_returns_frontend_friendly_shape(monkeypatch):
    mock_videos = [
        SimpleNamespace(
            videoID="vid-1",
            title="Career Tips",
            description="How to choose a branch",
            youtubeUrl="https://youtube.com/watch?v=abc",
            views=120,
            likes=15,
            createdAt=datetime(2026, 4, 1, 10, 0, 0),
            tags=["career", "engineering"],
        )
    ]

    monkeypatch.setattr(video_route.video_manager, "get_videos", AsyncMock(return_value=mock_videos))

    result = asyncio.run(video_route.get_my_videos(user_data={"id": "user-1"}))

    assert len(result) == 1
    item = result[0]
    assert item["id"] == "vid-1"
    assert item["videoUrl"] == "https://youtube.com/watch?v=abc"
    assert item["views"] == 120
    assert item["likes"] == 15
    assert item["comments"] == 0
    assert item["tags"] == ["career", "engineering"]

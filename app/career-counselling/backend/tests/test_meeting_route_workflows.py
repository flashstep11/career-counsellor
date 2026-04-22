import asyncio
from datetime import datetime, timedelta
from types import SimpleNamespace

import jwt
import pytest
from fastapi import HTTPException

from app.routes import meeting as meeting_route


class _FakeUserManager:
    def __init__(self, user):
        self._user = user

    async def get_user_by_email(self, _email):
        return self._user


async def _async_value(value):
    return value


class _FakeMeetingDB:
    def __init__(self):
        self.updated_calls = []

        class _Users:
            async def find_one(self, _query):
                return {"wallet": 0}

        class _Meetings:
            def __init__(self, outer):
                self.outer = outer

            async def update_one(self, query, update):
                self.outer.updated_calls.append((query, update))
                return SimpleNamespace(modified_count=1)

        self.users = _Users()
        self.meetings = _Meetings(self)


@pytest.fixture
def user_stub():
    return SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")


@pytest.fixture
def expert_stub():
    return SimpleNamespace(userId="expert-user-1", sessionDurationMinutes=60, meetingCost=600)


@pytest.fixture
def meeting_stub():
    return {
        "_id": "507f1f77bcf86cd799439013",
        "meetingId": "507f1f77bcf86cd799439013",
        "userId": "507f1f77bcf86cd799439011",
        "expertId": "expert-1",
        "status": "scheduled",
        "startTime": datetime(2099, 1, 1, 10, 0),
        "endTime": datetime(2099, 1, 1, 11, 0),
        "jitsiRoomName": "room-abc",
    }


@pytest.fixture(autouse=True)
def _patch_user_manager(monkeypatch, user_stub):
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(user_stub))


@pytest.fixture(autouse=True)
def _patch_jwt_and_key(monkeypatch):
    monkeypatch.setattr(jwt, "encode", lambda *args, **kwargs: "jwt-token")
    monkeypatch.setattr("pathlib.Path.read_text", lambda self: "PRIVATE_KEY")


@pytest.fixture(autouse=True)
def _patch_meeting_db(monkeypatch):
    monkeypatch.setattr(meeting_route.meeting_manager, "db", _FakeMeetingDB())


@pytest.fixture(autouse=True)
def _patch_settings():
    import app.config as config_module

    config_module.settings.JAAS_APP_ID = "APP123"
    config_module.settings.JAAS_KEY_ID = "KEY123"


def test_book_meeting_rejects_past_start_time(monkeypatch, user_stub):
    now = datetime(2099, 1, 1, 10, 0)
    monkeypatch.setattr(meeting_route, "now_app_naive", lambda: now)
    monkeypatch.setattr(meeting_route, "parse_app_naive", lambda value: datetime.fromisoformat(value))

    called = {"value": False}

    async def _book(*_args, **_kwargs):
        called["value"] = True
        return {"meetingId": "m-1"}

    monkeypatch.setattr(meeting_route.meeting_manager, "book_meeting", _book)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(meeting_route.book_meeting(
            meeting_route.BookMeetingRequest(
                expertId="expert-1",
                startTime=(now - timedelta(minutes=1)).isoformat(),
                endTime=(now + timedelta(hours=1)).isoformat(),
            ),
            user_data={"email": "student@example.com"},
        ))

    assert exc.value.status_code == 400
    assert "past" in exc.value.detail.lower()
    assert called["value"] is False


def test_book_meeting_allows_exact_now(monkeypatch, user_stub):
    now = datetime(2099, 1, 1, 10, 0)
    monkeypatch.setattr(meeting_route, "now_app_naive", lambda: now)
    monkeypatch.setattr(meeting_route, "parse_app_naive", lambda value: datetime.fromisoformat(value))

    seen = {}

    async def _book(*, expert_id, user_id, start_time, end_time):
        seen["expert_id"] = expert_id
        seen["user_id"] = user_id
        seen["start_time"] = start_time
        seen["end_time"] = end_time
        return {"meetingId": "m-1"}

    monkeypatch.setattr(meeting_route.meeting_manager, "book_meeting", _book)

    result = asyncio.run(meeting_route.book_meeting(
        meeting_route.BookMeetingRequest(
            expertId="expert-1",
            startTime=now.isoformat(),
            endTime=(now + timedelta(hours=1)).isoformat(),
        ),
        user_data={"email": "student@example.com"},
    ))

    assert result["success"] is True
    assert seen["user_id"] == user_stub.id
    assert seen["start_time"] == now


def test_join_token_rejects_more_than_ten_minutes_early(monkeypatch, meeting_stub, user_stub, expert_stub):
    now = datetime(2099, 1, 1, 9, 30)
    monkeypatch.setattr(meeting_route, "now_app_naive", lambda: now)
    monkeypatch.setattr(meeting_route.meeting_manager, "get_meeting", lambda _meeting_id: _async_value(dict(meeting_stub)))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _expert_id: _async_value(expert_stub))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(meeting_route.get_meeting_token(meeting_stub["meetingId"], user_data={"email": "student@example.com"}))

    assert exc.value.status_code == 400
    assert "10 minutes" in exc.value.detail


def test_join_token_rejects_cancelled_meeting(monkeypatch, meeting_stub, expert_stub):
    now = datetime(2099, 1, 1, 9, 50)
    meeting = dict(meeting_stub)
    meeting["status"] = "cancelled"
    meeting["startTime"] = now + timedelta(minutes=10)

    monkeypatch.setattr(meeting_route, "now_app_naive", lambda: now)
    monkeypatch.setattr(meeting_route.meeting_manager, "get_meeting", lambda _meeting_id: _async_value(meeting))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _meeting_id: _async_value(expert_stub))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            meeting_route.get_meeting_token(
                meeting_stub["meetingId"],
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 400
    assert "cancelled" in exc.value.detail.lower()


def test_join_token_allows_exactly_ten_minutes_before_start(monkeypatch, meeting_stub, expert_stub):
    now = datetime(2099, 1, 1, 9, 50)
    meeting = dict(meeting_stub)
    meeting["startTime"] = now + timedelta(minutes=10)
    monkeypatch.setattr(meeting_route, "now_app_naive", lambda: now)
    monkeypatch.setattr(meeting_route.meeting_manager, "get_meeting", lambda _meeting_id: _async_value(meeting))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _meeting_id: _async_value(expert_stub))

    result = asyncio.run(meeting_route.get_meeting_token(meeting_stub["meetingId"], user_data={"email": "student@example.com"}))

    assert result["roomName"].startswith("APP123/")
    assert result["walletBalance"] == 0
    assert result["isOwner"] is False


def test_join_token_allows_admin_without_participant_check(monkeypatch, meeting_stub, expert_stub):
    now = datetime(2099, 1, 1, 9, 50)
    meeting = dict(meeting_stub)
    meeting["startTime"] = now + timedelta(minutes=10)
    monkeypatch.setattr(meeting_route, "now_app_naive", lambda: now)
    monkeypatch.setattr(meeting_route.meeting_manager, "get_meeting", lambda _meeting_id: _async_value(meeting))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _meeting_id: _async_value(expert_stub))

    admin_user = SimpleNamespace(id="507f1f77bcf86cd799439012", firstName="Admin", lastName="User")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(admin_user))

    result = asyncio.run(meeting_route.get_meeting_token(meeting_stub["meetingId"], user_data={"email": "admin@example.com", "role": "admin"}))

    assert result["isOwner"] is False
    assert result["userName"] == "Admin User"


def test_join_token_regenerates_missing_room_slug(monkeypatch, meeting_stub, expert_stub):
    now = datetime(2099, 1, 1, 9, 50)
    meeting = dict(meeting_stub)
    meeting.pop("jitsiRoomName")
    meeting.pop("dailyRoomName", None)
    meeting["startTime"] = now + timedelta(minutes=10)

    fake_db = _FakeMeetingDB()
    import app.core.database as db_module

    monkeypatch.setattr(db_module, "get_database", lambda: fake_db)
    monkeypatch.setattr(meeting_route, "now_app_naive", lambda: now)
    monkeypatch.setattr(meeting_route.meeting_manager, "get_meeting", lambda _meeting_id: _async_value(meeting))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _meeting_id: _async_value(expert_stub))

    result = asyncio.run(meeting_route.get_meeting_token(meeting_stub["meetingId"], user_data={"email": "student@example.com"}))

    assert result["roomName"].startswith("APP123/")
    assert fake_db.updated_calls
    assert fake_db.updated_calls[0][1]["$set"]["jitsiRoomName"].startswith("alumniti-")

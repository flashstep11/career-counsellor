import asyncio
from datetime import datetime
from types import SimpleNamespace

import pytest
from bson import ObjectId

from app.managers import meeting as meeting_module
from app.managers.meeting import MeetingManager


class _FakeMeetingsFindResult:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _length):
        return self.docs


class _FakeMeetingsCollection:
    def __init__(self, docs=None):
        self.docs = docs or []

    def find(self, _query):
        return _FakeMeetingsFindResult(self.docs)

    async def find_one(self, _query):
        return None


class _FakeExpertsCollection:
    def __init__(self, expert_doc_by_id):
        self.expert_doc_by_id = expert_doc_by_id

    async def find_one(self, query):
        oid = str(query.get("_id"))
        return self.expert_doc_by_id.get(oid)


class _FakeDb:
    def __init__(self, expert_doc_by_id, meeting_docs=None):
        self.experts = _FakeExpertsCollection(expert_doc_by_id)
        self.meetings = _FakeMeetingsCollection(meeting_docs)


def test_get_available_slots_supports_non_hour_boundaries(monkeypatch):
    expert_id = str(ObjectId())
    expert_doc = {
        "_id": ObjectId(expert_id),
        "available": True,
        "availability": {
            "monday": {
                "isAvailable": True,
                "slots": [{"startTime": "05:34", "endTime": "07:34"}],
            }
        },
        "sessionDurationMinutes": 60,
    }

    manager = MeetingManager()
    manager.db = _FakeDb({expert_id: expert_doc})
    manager.collection = manager.db.meetings

    monkeypatch.setattr(meeting_module, "now_app_naive", lambda: datetime(2020, 1, 1, 0, 0, 0))

    slots = asyncio.run(manager.get_available_slots(expert_id, "2099-01-05"))

    assert len(slots) == 2
    assert slots[0]["startTime"].endswith("05:34:00")
    assert slots[0]["endTime"].endswith("06:34:00")
    assert slots[1]["startTime"].endswith("06:34:00")
    assert slots[1]["endTime"].endswith("07:34:00")


def test_book_meeting_rejects_when_expert_not_accepting_bookings():
    expert_id = str(ObjectId())
    manager = MeetingManager()
    manager.db = _FakeDb(
        {
            expert_id: {
                "_id": ObjectId(expert_id),
                "available": False,
                "meetingCost": 500,
            }
        }
    )
    manager.collection = manager.db.meetings

    with pytest.raises(ValueError) as exc:
        asyncio.run(
            manager.book_meeting(
                expert_id=expert_id,
                user_id=str(ObjectId()),
                start_time=datetime(2099, 1, 1, 5, 34),
                end_time=datetime(2099, 1, 1, 6, 34),
            )
        )

    assert "not accepting new bookings" in str(exc.value).lower()


def test_get_available_slots_returns_empty_when_expert_paused(monkeypatch):
    expert_id = str(ObjectId())
    expert_doc = {
        "_id": ObjectId(expert_id),
        "available": False,
        "availability": {
            "monday": {
                "isAvailable": True,
                "slots": [{"startTime": "09:00", "endTime": "11:00"}],
            }
        },
        "sessionDurationMinutes": 60,
    }

    manager = MeetingManager()
    manager.db = _FakeDb({expert_id: expert_doc})
    manager.collection = manager.db.meetings

    monkeypatch.setattr(meeting_module, "now_app_naive", lambda: datetime(2020, 1, 1, 0, 0, 0))

    slots = asyncio.run(manager.get_available_slots(expert_id, "2099-01-05"))

    assert slots == []

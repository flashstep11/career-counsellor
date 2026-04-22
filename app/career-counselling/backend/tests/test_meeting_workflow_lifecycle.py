import asyncio
from datetime import datetime, timedelta
from types import SimpleNamespace

from bson import ObjectId

from app.managers.meeting import MeetingManager
from app.models.meeting import MeetingStatus


def _matches_query(document, query):
    for key, value in query.items():
        if key == "$or":
            if not any(_matches_query(document, cond) for cond in value):
                return False
            continue

        if isinstance(value, dict):
            target = document.get(key)
            for op, operand in value.items():
                if op == "$ne" and target == operand:
                    return False
                if op == "$lt" and not (target < operand):
                    return False
                if op == "$lte" and not (target <= operand):
                    return False
                if op == "$gt" and not (target > operand):
                    return False
                if op == "$gte" and not (target >= operand):
                    return False
        else:
            if document.get(key) != value:
                return False
    return True


class _FakeUsersCollection:
    def __init__(self, users):
        self.users = users

    async def find_one(self, query):
        for user in self.users.values():
            if _matches_query(user, query):
                return dict(user)
        return None

    async def update_one(self, query, update):
        for user in self.users.values():
            if _matches_query(user, query):
                for key, value in update.get("$set", {}).items():
                    user[key] = value
                for key, value in update.get("$inc", {}).items():
                    user[key] = user.get(key, 0) + value
                return SimpleNamespace(modified_count=1, matched_count=1)
        return SimpleNamespace(modified_count=0, matched_count=0)


class _FakeExpertsCollection:
    def __init__(self, experts):
        self.experts = experts

    async def find_one(self, query):
        for expert in self.experts.values():
            if _matches_query(expert, query):
                return dict(expert)
        return None


class _FakeMeetingsFindResult:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _length):
        return list(self.docs)


class _FakeMeetingsCollection:
    def __init__(self, meetings=None):
        self.meetings = meetings or []

    async def find_one(self, query):
        for meeting in self.meetings:
            if _matches_query(meeting, query):
                return dict(meeting)
        return None

    def find(self, query):
        return _FakeMeetingsFindResult([m for m in self.meetings if _matches_query(m, query)])

    async def insert_one(self, doc):
        inserted_id = ObjectId()
        stored = dict(doc)
        stored["_id"] = inserted_id
        self.meetings.append(stored)
        return SimpleNamespace(inserted_id=inserted_id)

    async def update_one(self, query, update):
        for meeting in self.meetings:
            if _matches_query(meeting, query):
                for key, value in update.get("$set", {}).items():
                    meeting[key] = value
                for key, value in update.get("$inc", {}).items():
                    meeting[key] = meeting.get(key, 0) + value
                return SimpleNamespace(modified_count=1, matched_count=1)
        return SimpleNamespace(modified_count=0, matched_count=0)


class _FakeDb:
    def __init__(self, experts, users, meetings=None):
        self.experts = _FakeExpertsCollection(experts)
        self.users = _FakeUsersCollection(users)
        self.meetings = _FakeMeetingsCollection(meetings)
        self.meeting_feedbacks = SimpleNamespace(find_one=lambda *_args, **_kwargs: None)


def _build_manager(student_wallet=1200, meeting_cost=500):
    expert_id = str(ObjectId())
    student_id = str(ObjectId())
    expert_user_id = str(ObjectId())

    experts = {
        expert_id: {
            "_id": ObjectId(expert_id),
            "userId": expert_user_id,
            "meetingCost": meeting_cost,
            "available": True,
            "sessionDurationMinutes": 60,
            "availability": {
                "monday": {
                    "isAvailable": True,
                    "slots": [{"startTime": "09:00", "endTime": "11:00"}],
                }
            },
        }
    }
    users = {
        student_id: {
            "_id": ObjectId(student_id),
            "wallet": student_wallet,
            "firstName": "Student",
            "lastName": "One",
        },
        expert_user_id: {
            "_id": ObjectId(expert_user_id),
            "wallet": 0,
            "firstName": "Expert",
            "lastName": "One",
        },
    }

    manager = MeetingManager()
    manager.db = _FakeDb(experts=experts, users=users)
    manager.collection = manager.db.meetings
    return manager, expert_id, student_id


def test_student_booking_then_extension_then_cancellation_wallet_rules():
    manager, expert_id, student_id = _build_manager(student_wallet=1200, meeting_cost=500)

    start = datetime(2099, 1, 1, 10, 0)
    end = datetime(2099, 1, 1, 11, 0)

    meeting = asyncio.run(
        manager.book_meeting(
            expert_id=expert_id,
            user_id=student_id,
            start_time=start,
            end_time=end,
        )
    )

    user_after_booking = asyncio.run(manager.db.users.find_one({"_id": ObjectId(student_id)}))
    assert meeting is not None
    assert user_after_booking["wallet"] == 700

    extend_success, extend_msg = asyncio.run(
        manager.extend_meeting(
            meeting_id=meeting["meetingId"],
            user_id=student_id,
            duration_minutes=30,
        )
    )
    assert extend_success is True
    assert "extended successfully" in extend_msg.lower()

    user_after_extend = asyncio.run(manager.db.users.find_one({"_id": ObjectId(student_id)}))
    assert user_after_extend["wallet"] == 450

    cancel_success = asyncio.run(manager.cancel_meeting(meeting["meetingId"], student_id))
    assert cancel_success is True

    user_after_cancel = asyncio.run(manager.db.users.find_one({"_id": ObjectId(student_id)}))
    assert user_after_cancel["wallet"] == 950

    cancelled_meeting = asyncio.run(manager.get_meeting(meeting["meetingId"]))
    assert cancelled_meeting["status"] == MeetingStatus.CANCELLED


def test_booking_fails_with_insufficient_wallet_balance():
    manager, expert_id, student_id = _build_manager(student_wallet=100, meeting_cost=500)

    start = datetime(2099, 1, 1, 10, 0)
    end = datetime(2099, 1, 1, 11, 0)

    try:
        asyncio.run(
            manager.book_meeting(
                expert_id=expert_id,
                user_id=student_id,
                start_time=start,
                end_time=end,
            )
        )
        assert False, "Expected ValueError for insufficient balance"
    except ValueError as exc:
        assert "insufficient balance" in str(exc).lower()


def test_extension_fails_for_non_student_or_schedule_conflict():
    manager, expert_id, student_id = _build_manager(student_wallet=2000, meeting_cost=500)

    start = datetime(2099, 1, 1, 10, 0)
    end = datetime(2099, 1, 1, 11, 0)

    meeting = asyncio.run(
        manager.book_meeting(
            expert_id=expert_id,
            user_id=student_id,
            start_time=start,
            end_time=end,
        )
    )

    other_user_id = str(ObjectId())
    manager.db.users.users[other_user_id] = {
        "_id": ObjectId(other_user_id),
        "wallet": 1000,
        "firstName": "Other",
        "lastName": "User",
    }

    denied_success, denied_msg = asyncio.run(
        manager.extend_meeting(
            meeting_id=meeting["meetingId"],
            user_id=other_user_id,
            duration_minutes=30,
        )
    )
    assert denied_success is False
    assert "only the student" in denied_msg.lower()

    manager.collection.meetings.append(
        {
            "_id": ObjectId(),
            "expertId": expert_id,
            "userId": str(ObjectId()),
            "startTime": end + timedelta(minutes=10),
            "endTime": end + timedelta(minutes=40),
            "status": MeetingStatus.SCHEDULED,
        }
    )

    conflict_success, conflict_msg = asyncio.run(
        manager.extend_meeting(
            meeting_id=meeting["meetingId"],
            user_id=student_id,
            duration_minutes=30,
        )
    )
    assert conflict_success is False
    assert "expert has another meeting" in conflict_msg.lower()


def test_cancel_fails_for_unrelated_user():
    manager, expert_id, student_id = _build_manager(student_wallet=1200, meeting_cost=500)

    meeting = asyncio.run(
        manager.book_meeting(
            expert_id=expert_id,
            user_id=student_id,
            start_time=datetime(2099, 1, 1, 10, 0),
            end_time=datetime(2099, 1, 1, 11, 0),
        )
    )

    unrelated_user_id = str(ObjectId())
    manager.db.users.users[unrelated_user_id] = {
        "_id": ObjectId(unrelated_user_id),
        "wallet": 0,
        "firstName": "Random",
        "lastName": "Viewer",
    }

    success = asyncio.run(manager.cancel_meeting(meeting["meetingId"], unrelated_user_id))
    assert success is False


def test_cancel_fails_for_completed_meeting():
    manager, expert_id, student_id = _build_manager(student_wallet=1200, meeting_cost=500)

    meeting = asyncio.run(
        manager.book_meeting(
            expert_id=expert_id,
            user_id=student_id,
            start_time=datetime(2099, 1, 1, 10, 0),
            end_time=datetime(2099, 1, 1, 11, 0),
        )
    )

    manager.collection.meetings[0]["status"] = MeetingStatus.COMPLETED
    wallet_before = asyncio.run(manager.db.users.find_one({"_id": ObjectId(student_id)}))["wallet"]

    success = asyncio.run(manager.cancel_meeting(meeting["meetingId"], student_id))

    assert success is False
    wallet_after = asyncio.run(manager.db.users.find_one({"_id": ObjectId(student_id)}))["wallet"]
    assert wallet_after == wallet_before


def test_double_cancel_rejects_second_cancel():
    manager, expert_id, student_id = _build_manager(student_wallet=1200, meeting_cost=500)

    meeting = asyncio.run(
        manager.book_meeting(
            expert_id=expert_id,
            user_id=student_id,
            start_time=datetime(2099, 1, 1, 10, 0),
            end_time=datetime(2099, 1, 1, 11, 0),
        )
    )

    first = asyncio.run(manager.cancel_meeting(meeting["meetingId"], student_id))
    second = asyncio.run(manager.cancel_meeting(meeting["meetingId"], student_id))

    assert first is True
    assert second is False


def test_extend_allows_in_progress_but_not_completed():
    manager, expert_id, student_id = _build_manager(student_wallet=2000, meeting_cost=500)

    meeting = asyncio.run(
        manager.book_meeting(
            expert_id=expert_id,
            user_id=student_id,
            start_time=datetime(2099, 1, 1, 10, 0),
            end_time=datetime(2099, 1, 1, 11, 0),
        )
    )

    manager.collection.meetings[0]["status"] = MeetingStatus.IN_PROGRESS
    in_progress_success, in_progress_msg = asyncio.run(
        manager.extend_meeting(
            meeting_id=meeting["meetingId"],
            user_id=student_id,
            duration_minutes=30,
        )
    )
    assert in_progress_success is True
    assert "extended successfully" in in_progress_msg.lower()

    manager.collection.meetings[0]["status"] = MeetingStatus.COMPLETED
    completed_success, completed_msg = asyncio.run(
        manager.extend_meeting(
            meeting_id=meeting["meetingId"],
            user_id=student_id,
            duration_minutes=30,
        )
    )
    assert completed_success is False
    assert "active or scheduled" in completed_msg.lower()

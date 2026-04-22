import asyncio
from datetime import datetime
from types import SimpleNamespace

from bson import ObjectId

from app.managers.meeting import MeetingManager
from app.models.meeting import MeetingStatus


def _matches_query(document, query):
    for key, value in query.items():
        if isinstance(value, dict):
            target = document.get(key)
            for op, operand in value.items():
                if op == "$ne" and target == operand:
                    return False
                if op == "$gte" and not (target >= operand):
                    return False
                if op == "$lte" and not (target <= operand):
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


class _AtomicMeetingsCollection:
    def __init__(self):
        self.meetings = []
        self._lock = asyncio.Lock()

    async def find_one(self, query):
        for meeting in self.meetings:
            if _matches_query(meeting, query):
                return dict(meeting)
        return None

    async def insert_one(self, doc):
        async with self._lock:
            for existing in self.meetings:
                if (
                    existing.get("expertId") == doc.get("expertId")
                    and existing.get("startTime") == doc.get("startTime")
                    and existing.get("status") != MeetingStatus.CANCELLED
                ):
                    raise ValueError("duplicate slot")

            inserted_id = ObjectId()
            stored = dict(doc)
            stored["_id"] = inserted_id
            self.meetings.append(stored)
            return SimpleNamespace(inserted_id=inserted_id)


class _FakeDb:
    def __init__(self, experts, users):
        self.experts = _FakeExpertsCollection(experts)
        self.users = _FakeUsersCollection(users)
        self.meetings = _AtomicMeetingsCollection()


def _build_manager(meeting_cost=200, wallet=5000):
    expert_a = str(ObjectId())
    expert_b = str(ObjectId())
    student_id = str(ObjectId())

    experts = {
        expert_a: {
            "_id": ObjectId(expert_a),
            "userId": str(ObjectId()),
            "meetingCost": meeting_cost,
            "available": True,
        },
        expert_b: {
            "_id": ObjectId(expert_b),
            "userId": str(ObjectId()),
            "meetingCost": meeting_cost,
            "available": True,
        },
    }
    users = {
        student_id: {
            "_id": ObjectId(student_id),
            "wallet": wallet,
        }
    }

    manager = MeetingManager()
    manager.db = _FakeDb(experts=experts, users=users)
    manager.collection = manager.db.meetings
    return manager, expert_a, expert_b, student_id


def test_parallel_bookings_for_different_experts_succeed():
    manager, expert_a, expert_b, student_id = _build_manager()

    async def _run():
        await asyncio.gather(
            manager.book_meeting(
                expert_id=expert_a,
                user_id=student_id,
                start_time=datetime(2099, 1, 1, 10, 0),
                end_time=datetime(2099, 1, 1, 11, 0),
            ),
            manager.book_meeting(
                expert_id=expert_b,
                user_id=student_id,
                start_time=datetime(2099, 1, 1, 10, 0),
                end_time=datetime(2099, 1, 1, 11, 0),
            ),
        )

    asyncio.run(_run())

    assert len(manager.collection.meetings) == 2
    user_after = asyncio.run(manager.db.users.find_one({"_id": ObjectId(student_id)}))
    assert user_after["wallet"] == 4600


def test_parallel_competing_bookings_same_slot_result_in_single_meeting():
    manager, expert_a, _expert_b, student_id = _build_manager()
    competing_student = str(ObjectId())
    manager.db.users.users[competing_student] = {"_id": ObjectId(competing_student), "wallet": 5000}

    async def _book(user_id):
        try:
            await manager.book_meeting(
                expert_id=expert_a,
                user_id=user_id,
                start_time=datetime(2099, 1, 1, 10, 0),
                end_time=datetime(2099, 1, 1, 11, 0),
            )
            return "success"
        except Exception:
            return "failed"

    async def _run_competing():
        return await asyncio.gather(_book(student_id), _book(competing_student))

    results = asyncio.run(_run_competing())

    assert results.count("success") == 1
    assert results.count("failed") == 1
    assert len(manager.collection.meetings) == 1


def test_bulk_parallel_booking_smoke_non_functional():
    manager, expert_a, _expert_b, _student_id = _build_manager(wallet=20000)

    student_ids = [str(ObjectId()) for _ in range(10)]
    for student_id in student_ids:
        manager.db.users.users[student_id] = {"_id": ObjectId(student_id), "wallet": 2000}

    async def _run_bulk():
        tasks = []
        for index, student_id in enumerate(student_ids):
            tasks.append(
                manager.book_meeting(
                    expert_id=expert_a,
                    user_id=student_id,
                    start_time=datetime(2099, 1, 1, 9 + index, 0),
                    end_time=datetime(2099, 1, 1, 10 + index, 0),
                )
            )
        await asyncio.gather(*tasks)

    asyncio.run(_run_bulk())

    assert len(manager.collection.meetings) == 10
    remaining_wallets = [manager.db.users.users[sid]["wallet"] for sid in student_ids]
    assert all(wallet == 1800 for wallet in remaining_wallets)

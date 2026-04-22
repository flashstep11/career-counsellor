import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

from bson import ObjectId

from app.managers.expert import ExpertManager
from app.models.expert import ExpertUpdate


class _FakeExpertsCollection:
    def __init__(self, doc, delay_seconds=0.0):
        self.doc = doc
        self.delay_seconds = delay_seconds

    async def find_one(self, query):
        if str(query.get("_id")) == str(self.doc.get("_id")):
            return {**self.doc}
        return None

    async def update_one(self, query, update):
        if str(query.get("_id")) != str(self.doc.get("_id")):
            return SimpleNamespace(modified_count=0, matched_count=0)

        if self.delay_seconds:
            await asyncio.sleep(self.delay_seconds)

        before = dict(self.doc)
        self.doc.update(update.get("$set", {}))
        changed = before != self.doc
        return SimpleNamespace(modified_count=1 if changed else 0, matched_count=1)


class _FakeUsersCollection:
    def __init__(self, doc):
        self.doc = doc

    async def find_one(self, query):
        if str(query.get("_id")) == str(self.doc.get("_id")):
            return {**self.doc}
        return None

    async def update_one(self, query, update):
        if str(query.get("_id")) != str(self.doc.get("_id")):
            return SimpleNamespace(modified_count=0, matched_count=0)

        before = dict(self.doc)
        self.doc.update(update.get("$set", {}))
        changed = before != self.doc
        return SimpleNamespace(modified_count=1 if changed else 0, matched_count=1)


class _FakeDb:
    def __init__(self, expert_doc, user_doc, expert_delay=0.0):
        self.experts = _FakeExpertsCollection(expert_doc, delay_seconds=expert_delay)
        self.users = _FakeUsersCollection(user_doc)


def _build_manager(expert_delay=0.0):
    expert_id = str(ObjectId())
    user_id = str(ObjectId())
    expert_doc = {
        "_id": ObjectId(expert_id),
        "userId": user_id,
        "meetingCost": 500,
        "available": True,
        "updatedAt": datetime.utcnow(),
    }
    user_doc = {
        "_id": ObjectId(user_id),
        "firstName": "Jane",
        "lastName": "Doe",
    }

    manager = ExpertManager()
    manager.db = _FakeDb(expert_doc, user_doc, expert_delay=expert_delay)
    manager.collection = manager.db.experts
    manager.get_expert = AsyncMock(return_value={"expertID": expert_id})
    return manager, expert_id, manager.db.experts.doc, manager.db.users.doc


def test_parallel_disjoint_updates_preserve_both_changes():
    manager, expert_id, expert_doc, _user_doc = _build_manager(expert_delay=0.01)

    async def run_updates():
        await asyncio.gather(
            manager.update_expert(expert_id, ExpertUpdate(meetingCost=700)),
            manager.update_expert(expert_id, ExpertUpdate(available=False)),
        )

    asyncio.run(run_updates())

    assert expert_doc["meetingCost"] == 700
    assert expert_doc["available"] is False


def test_parallel_competing_updates_follow_last_completed_write():
    manager, expert_id, expert_doc, _user_doc = _build_manager(expert_delay=0.0)

    original_update_one = manager.collection.update_one

    async def delayed_update_one(query, update):
        payload = update.get("$set", {})
        if payload.get("meetingCost") == 400:
            await asyncio.sleep(0.02)
        return await original_update_one(query, update)

    manager.collection.update_one = delayed_update_one

    async def run_updates():
        await asyncio.gather(
            manager.update_expert(expert_id, ExpertUpdate(meetingCost=400)),
            manager.update_expert(expert_id, ExpertUpdate(meetingCost=900)),
        )

    asyncio.run(run_updates())

    assert expert_doc["meetingCost"] == 400


def test_parallel_user_and_expert_updates_apply_without_conflict():
    manager, expert_id, expert_doc, user_doc = _build_manager(expert_delay=0.01)

    async def run_updates():
        await asyncio.gather(
            manager.update_expert(expert_id, ExpertUpdate(firstName="Janet")),
            manager.update_expert(expert_id, ExpertUpdate(available=False)),
        )

    asyncio.run(run_updates())

    assert user_doc["firstName"] == "Janet"
    assert expert_doc["available"] is False

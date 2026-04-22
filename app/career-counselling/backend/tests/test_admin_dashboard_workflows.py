import asyncio
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.routes import admin as admin_route


class _FakeCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    async def to_list(self, _limit):
        return list(self._docs)


class _FakeUsersCollection:
    def __init__(self, initial=None):
        self._docs = {}
        for doc in (initial or []):
            oid = doc.get("_id") or ObjectId()
            doc["_id"] = oid
            self._docs[oid] = doc

    async def find_one(self, query):
        # Support a few query patterns used in admin routes.
        if "_id" in query and isinstance(query["_id"], ObjectId):
            return self._docs.get(query["_id"])

        email = query.get("email")
        if email is not None:
            ne_clause = query.get("_id", {}).get("$ne") if isinstance(query.get("_id"), dict) else None
            for oid, doc in self._docs.items():
                if doc.get("email") != email:
                    continue
                if ne_clause is not None and oid == ne_clause:
                    continue
                return doc
        return None

    def find(self, query, projection=None):
        ids = None
        if isinstance(query.get("_id"), dict) and "$in" in query["_id"]:
            ids = set(query["_id"]["$in"])
        docs = []
        for oid, doc in self._docs.items():
            if ids is not None and oid not in ids:
                continue
            docs.append(doc)
        return _FakeCursor(docs)

    async def insert_one(self, doc):
        oid = doc.get("_id") or ObjectId()
        doc = dict(doc)
        doc["_id"] = oid
        self._docs[oid] = doc
        return SimpleNamespace(inserted_id=oid)

    async def update_one(self, filter_query, update):
        oid = filter_query.get("_id")
        if not isinstance(oid, ObjectId) or oid not in self._docs:
            return SimpleNamespace(modified_count=0)
        if "$set" in update:
            self._docs[oid].update(update["$set"])
        return SimpleNamespace(modified_count=1)

    async def delete_one(self, filter_query):
        oid = filter_query.get("_id")
        if isinstance(oid, ObjectId) and oid in self._docs:
            del self._docs[oid]
            return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)


class _FakeMeetingsCollection:
    def __init__(self, meetings):
        self._meetings = list(meetings)

    def find(self, query):
        def _match(doc):
            # Time filters
            if "startTime" in query:
                cond = query["startTime"]
                if isinstance(cond, dict):
                    if "$lte" in cond and not (doc.get("startTime") <= cond["$lte"]):
                        return False
                    if "$lt" in cond and not (doc.get("startTime") < cond["$lt"]):
                        return False
                    if "$gte" in cond and not (doc.get("startTime") >= cond["$gte"]):
                        return False
                    if "$gt" in cond and not (doc.get("startTime") > cond["$gt"]):
                        return False

            if "endTime" in query:
                cond = query["endTime"]
                if isinstance(cond, dict):
                    if "$gte" in cond and not (doc.get("endTime") >= cond["$gte"]):
                        return False
                    if "$lte" in cond and not (doc.get("endTime") <= cond["$lte"]):
                        return False

            # Status filters
            if "status" in query:
                cond = query["status"]
                if isinstance(cond, dict):
                    if "$ne" in cond and doc.get("status") == cond["$ne"]:
                        return False
                    if "$in" in cond and doc.get("status") not in cond["$in"]:
                        return False
                else:
                    if doc.get("status") != cond:
                        return False

            return True

        return _FakeCursor([m for m in self._meetings if _match(m)])


def test_admin_create_user_and_toggle_verified(monkeypatch):
    users = _FakeUsersCollection()
    fake_db = SimpleNamespace(users=users)
    monkeypatch.setattr(admin_route, "user_manager", SimpleNamespace(db=fake_db))

    body = admin_route.AdminUserCreateRequest(
        firstName="A",
        lastName="B",
        email="ab@example.com",
        role="user",
        status="active",
        verified=True,
    )

    result = asyncio.run(admin_route.admin_create_user(body=body, user_data={"isAdmin": True}))

    assert "temporaryPassword" in result and isinstance(result["temporaryPassword"], str)
    created = result["user"]
    assert created["email"] == "ab@example.com"
    assert created["isAdmin"] is False
    assert created["isExpert"] is False
    assert any(c.lower() == "verified" for c in created.get("credentials", []))
    assert "hashedPassword" not in created

    user_id = created["_id"]

    # Toggle off verified
    updated = asyncio.run(
        admin_route.admin_update_user(
            user_id=user_id,
            body=admin_route.AdminUserUpdateRequest(verified=False),
            user_data={"isAdmin": True},
        )
    )["user"]

    assert not any(c.lower() == "verified" for c in updated.get("credentials", []))

    # Toggle on verified again
    updated2 = asyncio.run(
        admin_route.admin_update_user(
            user_id=user_id,
            body=admin_route.AdminUserUpdateRequest(verified=True),
            user_data={"isAdmin": True},
        )
    )["user"]
    assert any(c.lower() == "verified" for c in updated2.get("credentials", []))


def test_admin_update_user_role_sets_flags(monkeypatch):
    oid = ObjectId()
    users = _FakeUsersCollection(
        [
            {
                "_id": oid,
                "email": "x@example.com",
                "firstName": "X",
                "lastName": "Y",
                "isAdmin": False,
                "isExpert": True,
                "expertStatus": "approved",
                "credentials": [],
            }
        ]
    )
    fake_db = SimpleNamespace(users=users)
    monkeypatch.setattr(admin_route, "user_manager", SimpleNamespace(db=fake_db))

    result = asyncio.run(
        admin_route.admin_update_user(
            user_id=str(oid),
            body=admin_route.AdminUserUpdateRequest(role="admin"),
            user_data={"isAdmin": True},
        )
    )

    user = result["user"]
    assert user["isAdmin"] is True
    assert user["isExpert"] is False
    assert user.get("expertStatus") is None


def test_admin_delete_user_404_and_success(monkeypatch):
    users = _FakeUsersCollection()
    fake_db = SimpleNamespace(users=users)
    monkeypatch.setattr(admin_route, "user_manager", SimpleNamespace(db=fake_db))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(admin_route.admin_delete_user(user_id=str(ObjectId()), user_data={"isAdmin": True}))
    assert exc.value.status_code == 404

    created = asyncio.run(
        admin_route.admin_create_user(
            body=admin_route.AdminUserCreateRequest(
                firstName="Del",
                lastName="Me",
                email="delme@example.com",
                verified=False,
            ),
            user_data={"isAdmin": True},
        )
    )["user"]

    res = asyncio.run(admin_route.admin_delete_user(user_id=created["_id"], user_data={"isAdmin": True}))
    assert res["success"] is True


def test_admin_meetings_active_vs_upcoming_boundary(monkeypatch):
    fixed_now = datetime(2026, 4, 19, 10, 0, 0)
    monkeypatch.setattr(admin_route, "now_app_naive", lambda: fixed_now)

    user_oid = ObjectId()
    expert_oid = ObjectId()

    meetings = [
        {
            "_id": ObjectId(),
            "userId": str(user_oid),
            "expertId": str(expert_oid),
            "status": "scheduled",
            "startTime": fixed_now,
            "endTime": fixed_now + timedelta(minutes=30),
        },
        {
            "_id": ObjectId(),
            "userId": str(user_oid),
            "expertId": str(expert_oid),
            "status": "scheduled",
            "startTime": fixed_now + timedelta(minutes=1),
            "endTime": fixed_now + timedelta(minutes=31),
        },
    ]

    fake_meeting_manager = SimpleNamespace(collection=_FakeMeetingsCollection(meetings))

    users = _FakeUsersCollection(
        [
            {"_id": user_oid, "firstName": "Stu", "lastName": "Dent", "email": "stu@example.com"},
        ]
    )
    experts = _FakeUsersCollection(
        [
            {"_id": expert_oid, "firstName": "Ex", "lastName": "Pert", "email": "ex@example.com"},
        ]
    )

    fake_db = SimpleNamespace(users=users, experts=experts)
    monkeypatch.setattr(admin_route, "meeting_manager", fake_meeting_manager)
    monkeypatch.setattr(admin_route, "user_manager", SimpleNamespace(db=fake_db))

    active = asyncio.run(admin_route.get_active_meetings(user_data={"isAdmin": True}))
    upcoming = asyncio.run(admin_route.get_upcoming_meetings(user_data={"isAdmin": True}))

    assert len(active["meetings"]) == 1
    assert len(upcoming["meetings"]) == 1

    # The meeting that starts exactly at `now` must be active, not upcoming.
    assert active["meetings"][0]["startTime"] == fixed_now
    assert upcoming["meetings"][0]["startTime"] == fixed_now + timedelta(minutes=1)

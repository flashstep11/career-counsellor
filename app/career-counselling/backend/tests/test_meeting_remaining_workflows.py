import asyncio
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from bson import ObjectId
from fastapi import HTTPException

from app.managers.meeting import MeetingManager
from app.models.meeting import MeetingStatus
from app.routes import meeting as meeting_route


async def _async_value(value):
    return value


class _FakeUserManager:
    def __init__(self, user):
        self._user = user

    async def get_user_by_email(self, _email):
        return self._user


class _FakeUsersCollection:
    def __init__(self, users):
        self.users = users

    async def find_one(self, query):
        target = str(query.get("_id"))
        return self.users.get(target)


class _FakeExpertsCollection:
    def __init__(self, experts):
        self.experts = experts

    async def find_one(self, query):
        if "userId" in query:
            for expert in self.experts.values():
                if expert.get("userId") == query["userId"]:
                    return dict(expert)
            return None
        target = str(query.get("_id"))
        doc = self.experts.get(target)
        return dict(doc) if doc else None


class _FakeMeetingsResult:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _length):
        return list(self.docs)


class _FakeMeetingsCollection:
    def __init__(self, meetings=None):
        self.meetings = meetings or []

    def _matches(self, doc, query):
        for key, value in query.items():
            if key == "$or":
                if not any(self._matches(doc, cond) for cond in value):
                    return False
                continue

            if isinstance(value, dict):
                target = doc.get(key)
                for op, operand in value.items():
                    if op == "$ne" and target == operand:
                        return False
                    if op == "$gte" and not (target >= operand):
                        return False
                    if op == "$lte" and not (target <= operand):
                        return False
                    if op == "$lt" and not (target < operand):
                        return False
                    if op == "$in" and target not in operand:
                        return False
            else:
                if doc.get(key) != value:
                    return False
        return True

    async def find_one(self, query):
        for meeting in self.meetings:
            if self._matches(meeting, query):
                return dict(meeting)
        return None

    def find(self, query):
        return _FakeMeetingsResult([m for m in self.meetings if self._matches(m, query)])

    async def update_one(self, query, update):
        for meeting in self.meetings:
            if self._matches(meeting, query):
                for key, value in update.get("$set", {}).items():
                    meeting[key] = value
                for key, value in update.get("$inc", {}).items():
                    meeting[key] = meeting.get(key, 0) + value
                return SimpleNamespace(modified_count=1, matched_count=1)
        return SimpleNamespace(modified_count=0, matched_count=0)

    async def insert_one(self, doc):
        inserted_id = ObjectId()
        stored = dict(doc)
        stored["_id"] = inserted_id
        self.meetings.append(stored)
        return SimpleNamespace(inserted_id=inserted_id)


class _FakeDb:
    def __init__(self, experts, users, meetings=None):
        self.experts = _FakeExpertsCollection(experts)
        self.users = _FakeUsersCollection(users)
        self.meetings = _FakeMeetingsCollection(meetings)
        self.meeting_feedbacks = SimpleNamespace(find_one=lambda *_args, **_kwargs: None)


class _FakeNotificationManager:
    def __init__(self):
        self.created = []

    async def create_notification(self, notification):
        self.created.append(notification)
        return notification


@pytest.fixture(autouse=True)
def _patch_settings():
    import app.config as config_module

    config_module.settings.JAAS_APP_ID = "APP123"
    config_module.settings.JAAS_KEY_ID = "KEY123"


@pytest.fixture(autouse=True)
def _patch_jwt_and_key(monkeypatch):
    import jwt

    monkeypatch.setattr(jwt, "encode", lambda *args, **kwargs: "jwt-token")
    monkeypatch.setattr("pathlib.Path.read_text", lambda self: "PRIVATE_KEY")


def test_get_my_meetings_passes_status_filter(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))

    seen = {}

    async def _get_all_meetings_for_user(user_id, status_filter):
        seen["user_id"] = user_id
        seen["status_filter"] = status_filter
        return [{"meetingId": "m1"}]

    monkeypatch.setattr(meeting_route.meeting_manager, "get_all_meetings_for_user", _get_all_meetings_for_user)

    result = asyncio.run(meeting_route.get_my_meetings(status_filter="completed", user_data={"email": "student@example.com"}))

    assert seen["user_id"] == student.id
    assert seen["status_filter"] == "completed"
    assert result["meetings"] == [{"meetingId": "m1"}]


def test_get_my_earnings_requires_expert_profile(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert_by_user_id", lambda _user_id: _async_value(None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(meeting_route.get_my_earnings(user_data={"email": "student@example.com"}))

    assert exc.value.status_code == 403


def test_get_my_earnings_returns_breakdown(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert_by_user_id", lambda _user_id: _async_value(SimpleNamespace(expertID="expert-1")))

    seen = {}

    async def _earnings(expert_id):
        seen["expert_id"] = expert_id
        return {"totalEarnings": 1000, "baseEarnings": 700, "extensionEarnings": 300}

    monkeypatch.setattr(meeting_route.meeting_manager, "get_expert_earnings", _earnings)

    result = asyncio.run(meeting_route.get_my_earnings(user_data={"email": "student@example.com"}))

    assert seen["expert_id"] == "expert-1"
    assert result["totalEarnings"] == 1000


def test_get_my_earnings_rejects_missing_expert_profile(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert_by_user_id", lambda _user_id: _async_value(None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(meeting_route.get_my_earnings(user_data={"email": "student@example.com"}))

    assert exc.value.status_code == 403
    assert "expert profile" in exc.value.detail.lower()


def test_get_expert_meetings_blocks_non_owner(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    owner_user_id = "507f1f77bcf86cd799439012"
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _expert_id: _async_value(SimpleNamespace(userId=owner_user_id)))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            meeting_route.get_expert_meetings(
                expert_id="507f1f77bcf86cd799439099",
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 403


def test_get_expert_meetings_returns_404_for_missing_expert(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _expert_id: _async_value(None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            meeting_route.get_expert_meetings(
                expert_id="507f1f77bcf86cd799439099",
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 404
    assert "expert not found" in exc.value.detail.lower()


def test_get_expert_meetings_allows_owner(monkeypatch):
    owner_user = SimpleNamespace(id="507f1f77bcf86cd799439012", firstName="Expert", lastName="User")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(owner_user))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _expert_id: _async_value(SimpleNamespace(userId=owner_user.id)))

    async def _get_expert_meetings(expert_id, status_filter):
        return [{"meetingId": "m1", "status": status_filter}]

    monkeypatch.setattr(meeting_route.meeting_manager, "get_expert_meetings", _get_expert_meetings)

    result = asyncio.run(
        meeting_route.get_expert_meetings(
            expert_id="507f1f77bcf86cd799439099",
            status_filter="scheduled",
            user_data={"email": "expert@example.com"},
        )
    )

    assert result["meetings"][0]["status"] == "scheduled"


def test_get_meeting_returns_404_for_missing_meeting(monkeypatch):
    import app.managers.user as user_module

    monkeypatch.setattr(meeting_route.meeting_manager, "get_meeting", lambda _meeting_id: _async_value(None))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            meeting_route.get_meeting(
                meeting_id="507f1f77bcf86cd799439013",
                user_data={"email": "admin@example.com", "role": "admin"},
            )
        )

    assert exc.value.status_code == 404
    assert "meeting not found" in exc.value.detail.lower()


def test_get_meeting_returns_404_for_malformed_id():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            meeting_route.get_meeting(
                meeting_id="not-a-valid-objectid",
                user_data={"email": "admin@example.com", "role": "admin"},
            )
        )

    assert exc.value.status_code == 404
    assert "meeting not found" in exc.value.detail.lower()


def test_get_meeting_allows_admin_and_participant(monkeypatch):
    meeting = {"meetingId": "507f1f77bcf86cd799439013", "userId": "507f1f77bcf86cd799439011", "expertId": "507f1f77bcf86cd799439099"}
    monkeypatch.setattr(meeting_route.meeting_manager, "get_meeting", lambda _meeting_id: _async_value(dict(meeting)))

    admin_result = asyncio.run(
        meeting_route.get_meeting(
            meeting_id=meeting["meetingId"],
            user_data={"email": "admin@example.com", "role": "admin"},
        )
    )
    assert admin_result["meeting"]["meetingId"] == meeting["meetingId"]

    participant = SimpleNamespace(id=meeting["userId"], firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(participant))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _expert_id: _async_value(SimpleNamespace(userId="507f1f77bcf86cd799439099")))

    participant_result = asyncio.run(
        meeting_route.get_meeting(
            meeting_id=meeting["meetingId"],
            user_data={"email": "student@example.com"},
        )
    )
    assert participant_result["meeting"]["meetingId"] == meeting["meetingId"]


def test_get_meeting_blocks_unrelated_user(monkeypatch):
    meeting = {"meetingId": "507f1f77bcf86cd799439013", "userId": "507f1f77bcf86cd799439011", "expertId": "507f1f77bcf86cd799439099"}
    monkeypatch.setattr(meeting_route.meeting_manager, "get_meeting", lambda _meeting_id: _async_value(dict(meeting)))

    unrelated = SimpleNamespace(id="507f1f77bcf86cd799439014", firstName="Other", lastName="User")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(unrelated))
    monkeypatch.setattr(meeting_route.expert_manager, "get_expert", lambda _expert_id: _async_value(SimpleNamespace(userId="507f1f77bcf86cd799439099")))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            meeting_route.get_meeting(
                meeting_id=meeting["meetingId"],
                user_data={"email": "other@example.com"},
            )
        )

    assert exc.value.status_code == 403


def test_cancel_route_rejects_completed_meeting(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))
    monkeypatch.setattr(meeting_route.meeting_manager, "cancel_meeting", lambda *_args, **_kwargs: _async_value(False))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            meeting_route.cancel_meeting(
                meeting_id="507f1f77bcf86cd799439013",
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 400


def test_cancel_route_rejects_malformed_id(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            meeting_route.cancel_meeting(
                meeting_id="not-a-valid-objectid",
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 400
    assert "failed to cancel" in exc.value.detail.lower()


def test_extend_route_returns_wallet_and_end_time(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))

    class _Db:
        def __init__(self):
            self.meetings = SimpleNamespace(find_one=lambda _query: _async_value({"endTime": datetime(2099, 1, 1, 11, 30)}))
            self.users = SimpleNamespace(find_one=lambda _query: _async_value({"wallet": 900}))

    monkeypatch.setattr(meeting_route.meeting_manager, "db", _Db())
    monkeypatch.setattr(meeting_route.meeting_manager, "extend_meeting", lambda *args, **kwargs: _async_value((True, "Meeting extended successfully")))

    result = asyncio.run(
        meeting_route.extend_meeting(
            meeting_id="507f1f77bcf86cd799439013",
            request=meeting_route.ExtendMeetingRequest(durationMinutes=30),
            user_data={"email": "student@example.com"},
        )
    )

    assert result["success"] is True
    assert result["newWalletBalance"] == 900


def test_extend_route_rejects_malformed_id(monkeypatch):
    student = SimpleNamespace(id="507f1f77bcf86cd799439011", firstName="Student", lastName="One")
    import app.managers.user as user_module

    monkeypatch.setattr(user_module, "UserManager", lambda: _FakeUserManager(student))

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            meeting_route.extend_meeting(
                meeting_id="not-a-valid-objectid",
                request=meeting_route.ExtendMeetingRequest(durationMinutes=30),
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 400
    assert "failed to extend" in exc.value.detail.lower() or "not found" in exc.value.detail.lower()


class _ReminderExpertsCollection:
    def __init__(self, experts):
        self.experts = experts

    async def find_one(self, query):
        target = str(query.get("_id"))
        doc = self.experts.get(target)
        return dict(doc) if doc else None


class _ReminderMeetingsCollection:
    def __init__(self, meetings):
        self.meetings = meetings
        self.updated = []

    def _matches(self, doc, query):
        for key, value in query.items():
            if isinstance(value, dict):
                target = doc.get(key)
                for op, operand in value.items():
                    if op == "$gte" and not (target >= operand):
                        return False
                    if op == "$lte" and not (target <= operand):
                        return False
                    if op == "$ne" and target == operand:
                        return False
                    if op == "$in" and target not in operand:
                        return False
            else:
                if doc.get(key) != value:
                    return False
        return True

    def find(self, query):
        matches = [m for m in self.meetings if self._matches(m, query)]
        return SimpleNamespace(to_list=lambda _length: _async_value(matches))

    async def update_one(self, query, update):
        self.updated.append((query, update))
        for meeting in self.meetings:
            if str(meeting["_id"]) == str(query.get("_id")):
                meeting.update(update.get("$set", {}))
        return SimpleNamespace(modified_count=1)


def test_get_month_availability_marks_booked_day_false(monkeypatch):
    expert_id = str(ObjectId())
    expert_doc = {
        "_id": ObjectId(expert_id),
        "available": True,
        "availability": {
            day: {"isAvailable": True, "slots": [{"startTime": "09:00", "endTime": "11:00"}]}
            for day in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        "sessionDurationMinutes": 60,
    }
    booked_day = datetime(2099, 1, 10, 9, 0)
    booked_day_2 = datetime(2099, 1, 10, 10, 0)
    manager = MeetingManager()
    manager.db = SimpleNamespace(
        experts=_ReminderExpertsCollection({expert_id: expert_doc}),
        users=SimpleNamespace(find_one=lambda *_args, **_kwargs: None),
        meetings=_ReminderMeetingsCollection([
            {"_id": ObjectId(), "expertId": expert_id, "startTime": booked_day, "status": MeetingStatus.SCHEDULED},
            {"_id": ObjectId(), "expertId": expert_id, "startTime": booked_day_2, "status": MeetingStatus.SCHEDULED},
        ]),
    )
    manager.collection = manager.db.meetings

    import app.managers.meeting as meeting_module

    monkeypatch.setattr(meeting_module, "now_app_naive", lambda: datetime(2026, 1, 1, 0, 0))

    availability = asyncio.run(manager.get_month_availability(expert_id, 2099, 1))

    assert availability["2099-01-10"] is False
    assert any(value is True for value in availability.values())


def test_get_month_availability_returns_true_for_empty_schedule(monkeypatch):
    expert_id = str(ObjectId())
    expert_doc = {
        "_id": ObjectId(expert_id),
        "available": True,
        "availability": {
            day: {"isAvailable": True, "slots": [{"startTime": "09:00", "endTime": "11:00"}]}
            for day in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        "sessionDurationMinutes": 60,
    }

    manager = MeetingManager()
    manager.db = SimpleNamespace(
        experts=_ReminderExpertsCollection({expert_id: expert_doc}),
        users=SimpleNamespace(find_one=lambda *_args, **_kwargs: None),
        meetings=_ReminderMeetingsCollection([]),
    )
    manager.collection = manager.db.meetings

    import app.managers.meeting as meeting_module

    monkeypatch.setattr(meeting_module, "now_app_naive", lambda: datetime(2026, 1, 1, 0, 0))

    availability = asyncio.run(manager.get_month_availability(expert_id, 2099, 1))

    assert availability["2099-01-10"] is True
    assert all(isinstance(v, bool) for v in availability.values())


def test_complete_meeting_marks_status_completed():
    meeting_id = str(ObjectId())
    meeting = {"_id": ObjectId(meeting_id), "status": MeetingStatus.SCHEDULED}

    class _CompleteCollection:
        async def update_one(self, query, update):
            meeting.update(update.get("$set", {}))
            return SimpleNamespace(modified_count=1)

    manager = MeetingManager()
    manager.collection = _CompleteCollection()

    result = asyncio.run(manager.complete_meeting(meeting_id))

    assert result is True
    assert meeting["status"] == MeetingStatus.COMPLETED


def test_send_due_reminders_sends_two_notifications_and_marks_sent(monkeypatch):
    expert_id = str(ObjectId())
    student_id = str(ObjectId())
    expert_user_id = str(ObjectId())
    meeting_id = str(ObjectId())
    now = datetime(2099, 1, 1, 10, 0)
    meeting = {"_id": ObjectId(meeting_id), "expertId": expert_id, "userId": student_id, "startTime": now + timedelta(minutes=5), "status": MeetingStatus.SCHEDULED, "reminderSent": False}
    expert_doc = {"_id": ObjectId(expert_id), "userId": expert_user_id}
    fake_notifications = _FakeNotificationManager()

    class _FindResult:
        async def to_list(self, _length):
            return [meeting]

    class _ReminderCollection:
        def __init__(self):
            self.updated = []

        def find(self, query):
            return _FindResult()

        async def update_one(self, query, update):
            self.updated.append((query, update))
            meeting.update(update.get("$set", {}))
            return SimpleNamespace(modified_count=1)

    class _ReminderDb:
        def __init__(self):
            self.experts = _ReminderExpertsCollection({expert_id: expert_doc})
            self.meetings = _ReminderCollection()

    manager = MeetingManager()
    manager.db = _ReminderDb()
    manager.collection = manager.db.meetings

    import app.managers.notification as notification_module
    import app.core.time_utils as time_utils

    monkeypatch.setattr(notification_module, "NotificationManager", lambda: fake_notifications)
    monkeypatch.setattr(time_utils, "now_app_naive", lambda: now)

    count = asyncio.run(manager.send_due_reminders())

    assert count == 1
    assert len(fake_notifications.created) == 2
    assert meeting["reminderSent"] is True


def test_send_due_reminders_returns_zero_when_no_meetings(monkeypatch):
    class _EmptyCollection:
        def find(self, _query):
            return SimpleNamespace(to_list=lambda _length: _async_value([]))

    manager = MeetingManager()
    manager.collection = _EmptyCollection()

    import app.core.time_utils as time_utils

    monkeypatch.setattr(time_utils, "now_app_naive", lambda: datetime(2099, 1, 1, 10, 0))

    count = asyncio.run(manager.send_due_reminders())

    assert count == 0

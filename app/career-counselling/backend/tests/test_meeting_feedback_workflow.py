import asyncio
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models.meeting_feedback import MeetingFeedbackCreate
from app.routes import meeting_feedback as feedback_route


def _mock_user_manager(monkeypatch, user_id="student-1"):
    import app.managers.user as user_module

    class _FakeUserManager:
        async def get_user_by_email(self, _email):
            return SimpleNamespace(id=user_id)

    monkeypatch.setattr(user_module, "UserManager", _FakeUserManager)


def test_submit_feedback_success_for_completed_meeting(monkeypatch):
    _mock_user_manager(monkeypatch, user_id="student-1")

    monkeypatch.setattr(
        feedback_route.meeting_manager,
        "get_meeting",
        lambda _meeting_id: asyncio.sleep(0, result={"userId": "student-1", "status": "completed", "expertId": "exp-1"}),
    )
    monkeypatch.setattr(
        feedback_route.feedback_manager,
        "get_feedback_for_meeting",
        lambda _meeting_id: asyncio.sleep(0, result=None),
    )
    monkeypatch.setattr(
        feedback_route.expert_manager,
        "get_expert",
        lambda _expert_id: asyncio.sleep(0, result=SimpleNamespace(userId="expert-user-1")),
    )
    monkeypatch.setattr(
        feedback_route.feedback_manager,
        "create_feedback",
        lambda **_kwargs: asyncio.sleep(
            0,
            result=SimpleNamespace(
                id="fb-1",
                meetingId="meeting-1",
                reviewerId="student-1",
                revieweeId="expert-user-1",
                rating=5,
                comment="Great session",
                isAnonymous=False,
                createdAt=datetime.utcnow(),
                updatedAt=datetime.utcnow(),
            ),
        ),
    )

    result = asyncio.run(
        feedback_route.submit_meeting_feedback(
            meeting_id="meeting-1",
            feedback_data=MeetingFeedbackCreate(rating=5, comment="Great session", isAnonymous=False),
            user_data={"email": "student@example.com"},
        )
    )

    assert result.rating == 5
    assert result.reviewerId == "student-1"
    assert result.revieweeId == "expert-user-1"
    assert result.isAnonymous is False


def test_submit_feedback_forwards_anonymous_flag(monkeypatch):
    _mock_user_manager(monkeypatch, user_id="student-1")

    monkeypatch.setattr(
        feedback_route.meeting_manager,
        "get_meeting",
        lambda _meeting_id: asyncio.sleep(0, result={"userId": "student-1", "status": "completed", "expertId": "exp-1"}),
    )
    monkeypatch.setattr(
        feedback_route.feedback_manager,
        "get_feedback_for_meeting",
        lambda _meeting_id: asyncio.sleep(0, result=None),
    )
    monkeypatch.setattr(
        feedback_route.expert_manager,
        "get_expert",
        lambda _expert_id: asyncio.sleep(0, result=SimpleNamespace(userId="expert-user-1")),
    )

    seen = {}

    async def _create_feedback(**kwargs):
        seen.update(kwargs)
        return SimpleNamespace(
            id="fb-2",
            meetingId=kwargs["meeting_id"],
            reviewerId=kwargs["reviewer_id"],
            revieweeId=kwargs["reviewee_id"],
            rating=kwargs["rating"],
            comment=kwargs.get("comment"),
            isAnonymous=kwargs["is_anonymous"],
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow(),
        )

    monkeypatch.setattr(feedback_route.feedback_manager, "create_feedback", _create_feedback)

    result = asyncio.run(
        feedback_route.submit_meeting_feedback(
            meeting_id="meeting-2",
            feedback_data=MeetingFeedbackCreate(rating=4, comment="Anon", isAnonymous=True),
            user_data={"email": "student@example.com"},
        )
    )

    assert result.isAnonymous is True
    assert seen["is_anonymous"] is True


def test_submit_feedback_rejects_non_student(monkeypatch):
    _mock_user_manager(monkeypatch, user_id="other-user")

    monkeypatch.setattr(
        feedback_route.meeting_manager,
        "get_meeting",
        lambda _meeting_id: asyncio.sleep(0, result={"userId": "student-1", "status": "completed", "expertId": "exp-1"}),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            feedback_route.submit_meeting_feedback(
                meeting_id="meeting-1",
                feedback_data=MeetingFeedbackCreate(rating=4),
                user_data={"email": "other@example.com"},
            )
        )

    assert exc.value.status_code == 403
    assert "only the student" in exc.value.detail.lower()


def test_submit_feedback_requires_completed_meeting(monkeypatch):
    _mock_user_manager(monkeypatch, user_id="student-1")

    monkeypatch.setattr(
        feedback_route.meeting_manager,
        "get_meeting",
        lambda _meeting_id: asyncio.sleep(0, result={"userId": "student-1", "status": "scheduled", "expertId": "exp-1"}),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            feedback_route.submit_meeting_feedback(
                meeting_id="meeting-1",
                feedback_data=MeetingFeedbackCreate(rating=4),
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 400
    assert "must be completed" in exc.value.detail.lower()


def test_submit_feedback_rejects_duplicate_feedback(monkeypatch):
    _mock_user_manager(monkeypatch, user_id="student-1")

    monkeypatch.setattr(
        feedback_route.meeting_manager,
        "get_meeting",
        lambda _meeting_id: asyncio.sleep(0, result={"userId": "student-1", "status": "completed", "expertId": "exp-1"}),
    )
    monkeypatch.setattr(
        feedback_route.feedback_manager,
        "get_feedback_for_meeting",
        lambda _meeting_id: asyncio.sleep(0, result=SimpleNamespace(id="fb-1")),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            feedback_route.submit_meeting_feedback(
                meeting_id="meeting-1",
                feedback_data=MeetingFeedbackCreate(rating=4),
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 400
    assert "already been submitted" in exc.value.detail.lower()


def test_get_meeting_feedback_returns_404_when_absent(monkeypatch):
    _mock_user_manager(monkeypatch, user_id="student-1")
    monkeypatch.setattr(
        feedback_route.feedback_manager,
        "get_feedback_for_meeting",
        lambda _meeting_id: asyncio.sleep(0, result=None),
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            feedback_route.get_meeting_feedback(
                meeting_id="meeting-1",
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 404
    assert "no feedback found" in exc.value.detail.lower()


def test_get_meeting_feedback_returns_404_for_malformed_id(monkeypatch):
    _mock_user_manager(monkeypatch, user_id="student-1")

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            feedback_route.get_meeting_feedback(
                meeting_id="not-a-valid-objectid",
                user_data={"email": "student@example.com"},
            )
        )

    assert exc.value.status_code == 404
    assert "no feedback found" in exc.value.detail.lower()

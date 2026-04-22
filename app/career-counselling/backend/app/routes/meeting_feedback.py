from fastapi import APIRouter, HTTPException, Depends, status
from app.models.meeting_feedback import MeetingFeedbackCreate, MeetingFeedbackResponse
from app.managers.meeting_feedback import MeetingFeedbackManager
from app.managers.meeting import MeetingManager
from app.managers.expert import ExpertManager
from app.core.auth_utils import require_user

router = APIRouter()
feedback_manager = MeetingFeedbackManager()
meeting_manager = MeetingManager()
expert_manager = ExpertManager()

@router.post("/meetings/{meeting_id}/feedback", response_model=MeetingFeedbackResponse)
async def submit_meeting_feedback(
    meeting_id: str,
    feedback_data: MeetingFeedbackCreate,
    user_data: dict = Depends(require_user)
):
    from app.managers.user import UserManager
    user_manager = UserManager()
    reviewer = await user_manager.get_user_by_email(user_data["email"])
    if not reviewer:
        raise HTTPException(status_code=404, detail="User not found")
        
    reviewer_id = reviewer.id
    
    # 1. Fetch meeting
    meeting = await meeting_manager.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # 2. Eligibility: Must be the student
    if str(meeting["userId"]) != str(reviewer_id):
        raise HTTPException(status_code=403, detail="Only the student can rate this meeting")
        
    # 3. Timing: Must be completed
    if meeting["status"] not in ["completed", "COMPLETED", "completed"]:
        raise HTTPException(status_code=400, detail="Meeting must be COMPLETED to provide feedback")
        
    # 4. Idempotency: Has this meeting been reviewed already?
    existing = await feedback_manager.get_feedback_for_meeting(meeting_id)
    if existing:
        raise HTTPException(status_code=400, detail="Feedback has already been submitted for this meeting")
        
    # Figure out the revieweeId (the expert's userId)
    expert = await expert_manager.get_expert(meeting["expertId"])
    if not expert:
        raise HTTPException(status_code=404, detail="Expert for this meeting not found")
        
    reviewee_id = expert.userId
        
    feedback = await feedback_manager.create_feedback(
        meeting_id=meeting_id,
        reviewer_id=reviewer_id,
        reviewee_id=reviewee_id,
        rating=feedback_data.rating,
        comment=feedback_data.comment,
        is_anonymous=feedback_data.isAnonymous
    )
    
    return feedback

@router.get("/meetings/{meeting_id}/feedback", response_model=MeetingFeedbackResponse)
async def get_meeting_feedback(meeting_id: str, user_data: dict = Depends(require_user)):
    # Simply retrieve the feedback
    feedback = await feedback_manager.get_feedback_for_meeting(meeting_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="No feedback found for this meeting")
        
    return feedback

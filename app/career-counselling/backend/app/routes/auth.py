from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.models.user import UserSignUp, UserLogin
from app.managers.auth import AuthManager
from app.managers.user import UserManager
from app.managers import otp as otp_manager
from app.core.auth_utils import get_token, require_admin, require_expert, require_user, get_current_user

router = APIRouter()
auth_manager = AuthManager()
user_manager = UserManager()


class SendOTPRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


@router.post("/send-otp")
async def send_otp(payload: SendOTPRequest):
    """Send a 6-digit OTP via email to the given address."""
    try:
        result = await otp_manager.send_otp(payload.email)
        return {"message": "OTP sent successfully", "debug_otp": result.get("debug_otp")}
    except ValueError as e:
        if str(e) == "email_taken":
            raise HTTPException(status_code=409, detail="Email already registered")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOTPRequest):
    """Verify the OTP and return a one-time verification_token for signup."""
    try:
        token = await otp_manager.verify_otp(payload.email, payload.otp)
        return {"verification_token": token}
    except ValueError as e:
        msg_map = {
            "no_otp": "No OTP found for this email. Please request a new one.",
            "already_verified": "This OTP has already been used.",
            "otp_expired": "OTP has expired. Please request a new one.",
            "invalid_otp": "Invalid OTP.",
        }
        raise HTTPException(status_code=400, detail=msg_map.get(str(e), str(e)))


@router.post("/signup")
async def signup(user_data: UserSignUp):
    """
    Register a new user, hash their password, and return a JWT token.
    Requires email, password, first name, last name, and verification_token.
    """
    existing_user = await user_manager.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400, detail="User with this email already exists")

    token = await auth_manager.signup(user_data)
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired email verification. Please verify your email again.")
        
    # Log new user registration
    new_user = await user_manager.get_user_by_email(user_data.email)
    if new_user:
        await user_manager.log_activity(
            activity_type="user_registration",
            description=f"New user registered: {user_data.firstName} {user_data.lastName}",
            user_id=str(new_user.id)
        )

    return {"token": token}


@router.post("/login")
async def login(user_login: UserLogin):
    """
    Authenticate a user, verify credentials, and return a JWT token.
    Only requires email and password.
    """
    token = await auth_manager.login(user_login)
    if not token:
        raise HTTPException(
            status_code=401, detail="Invalid email or password")

    return {"token": token}


@router.get("/role")
async def get_user_role(user_data: dict = Depends(get_current_user)):
    """
    Get the role of the current user based on the JWT token.
    """
    return {"role": user_data["role"]}

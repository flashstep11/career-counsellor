import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Union, List
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.database import get_database

from app.config import settings

security = HTTPBearer()

async def get_token(email: str) -> str:
    """
    Generate a JWT token by signing the email and role.

    Args:
        email (str): User's email.

    Returns:
        str: JWT token.
    """
    # Get user role from database
    db = get_database()
    user = await db.users.find_one({"email": email})
    
    # Determine role based on user flags
    role = "admin" if user.get("isAdmin", False) else "expert" if user.get("isExpert", False) else "user"
    
    # Debug logging
    print(f"Token generation for {email}:")
    print(f"  User ID: {user['_id']}")
    print(f"  isAdmin: {user.get('isAdmin', False)}")
    print(f"  isExpert: {user.get('isExpert', False)}")
    print(f"  Determined role: {role}")
    
    # Find expertId by searching experts collection with userId
    expertId = ""
    if role == "expert" or role == "admin":
        expert = await db.experts.find_one({"userId": str(user["_id"])})
        if expert:
            expertId = str(expert["_id"])
    
    payload = {
        "email": email,
        "id": str(user["_id"]),  # Include user ID in the token
        "role": role,
        "expertId": expertId,  # Include expertId if found
        "wallet": user.get("wallet", 0),  # Include wallet balance
        "type": user.get("type", "free"),  # Include user type (free/paid)
        "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)  
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token

async def verify_token(token: str) -> Optional[Dict[str, str]]:
    """
    Verify and decode the JWT token, and check if the email exists in the database.

    Args:
        token (str): JWT token.

    Returns:
        Dict[str, str]: Dictionary containing email, id, and role if valid, None otherwise.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        email = payload.get("email")
        user_id = payload.get("id")
        role = payload.get("role", "user")  # Default to "user" if role is not in token
        
        if not email:
            return None
        
        # Check if email exists in database
        db = get_database()
        user = await db.users.find_one({"email": email})
        
        if user:
            return {"email": email, "id": user_id, "role": role, "expertId": payload.get("expertId", "")}
        else:
            return None

    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, str]:
    """
    Get the current user from the JWT token.
    
    Args:
        credentials: The HTTP Authorization credentials.
        
    Returns:
        Dict containing email and role.
    """
    token = credentials.credentials
    user_data = await verify_token(token)
    
    if user_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_data

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(HTTPBearer(auto_error=False))) -> Optional[Dict[str, str]]:
    """Like get_current_user, but returns None if no token is provided rather than raising an error."""
    if not credentials:
        return None
    token = credentials.credentials
    return await verify_token(token)

async def require_role(required_roles: Union[str, List[str]], user_data: Dict[str, str] = Depends(get_current_user)) -> Dict[str, str]:
    """
    Check if the user has the required role.
    
    Args:
        required_roles: The required role(s) to access the endpoint.
        user_data: User data from the JWT token.
        
    Returns:
        Dict containing email and role if authorized.
    """
    if isinstance(required_roles, str):
        required_roles = [required_roles]
    
    if user_data["role"] not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return user_data

# Common role-based dependencies
async def require_admin(user_data: Dict[str, str] = Depends(get_current_user)) -> Dict[str, str]:
    """Require admin role"""
    return await require_role("admin", user_data)

async def require_expert(user_data: Dict[str, str] = Depends(get_current_user)) -> Dict[str, str]:
    """Require expert role"""
    return await require_role(["admin", "expert"], user_data)

async def require_user(user_data: Dict[str, str] = Depends(get_current_user)) -> Dict[str, str]:
    """Require any authenticated user"""
    return user_data

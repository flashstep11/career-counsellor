from typing import Optional
from datetime import datetime
from bson import ObjectId
from app.models.user import User, UserSignUp, UserLogin
from app.core.database import get_database
from app.core.auth_utils import get_token, verify_token
from app.managers import otp as otp_manager
import bcrypt

class AuthManager:
    def __init__(self):
        """Initialize AuthManager with database connection."""
        self.db = get_database()
        self.collection = self.db.users

    async def signup(self, user_data: UserSignUp) -> Optional[str]:
        """
        Register a new user with info and return a JWT token.

        Args:
            user_data (UserSignUp): User object with email, password, first name, last name,
                                    and verification_token.

        Returns:
            Optional[str]: JWT token if successful, None otherwise.
        """
        try:
            # Validate the email verification token before creating the account
            token_valid = await otp_manager.consume_verification_token(
                user_data.email, user_data.verification_token
            )
            if not token_valid:
                print("Invalid or expired email verification token")
                return None

            # Hash password before storing
            hashed_password = bcrypt.hashpw(user_data.password.encode("utf-8"), bcrypt.gensalt())
            
            # Create user record with additional fields
            user_dict = {
                "email": user_data.email,
                "hashedPassword": hashed_password.decode("utf-8"),
                "firstName": user_data.firstName,
                "lastName": user_data.lastName,
                "middleName": user_data.middleName,
                "gender": "",
                "category": "",
                "mobileNo": "",
                "home_state": "",
                "type": "free",
                "isExpert": False,
                "isAdmin": False,
                "wallet": 200,  # Initialize wallet with 200 coins
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }

            result = await self.collection.insert_one(user_dict)
            user_id = str(result.inserted_id)
            user_dict["uid"] = user_id

            # Auto-join the new user into c/general
            try:
                general = await self.db.communities.find_one({"name": "general"})
                if general:
                    await self.db.communities.update_one(
                        {"_id": general["_id"]},
                        {
                            "$addToSet": {"members": user_id},
                            "$inc": {"memberCount": 1},
                            "$set": {"updatedAt": datetime.utcnow()},
                        },
                    )
            except Exception as e:
                print(f"Warning: could not auto-join user to general: {e}")

            # Generate JWT token with role
            token = await get_token(user_data.email)
            return token
        except Exception as e:
            print(f"Error signing up user: {e}")
            return None

    async def login(self, user_login: UserLogin) -> Optional[str]:
        """
        Authenticate user and return a JWT token if valid.

        Args:
            user_login (UserLogin): User login credentials with email and password.

        Returns:
            Optional[str]: JWT token if authentication is successful, None otherwise.
        """
        try:
            # Retrieve user from database
            user = await self.collection.find_one({"email": user_login.email})
            if user and "hashedPassword" in user:
                stored_hashed = user["hashedPassword"]

                # Verify password
                if bcrypt.checkpw(user_login.password.encode("utf-8"), stored_hashed.encode("utf-8")):
                    # Generate JWT token with role information
                    return await get_token(user_login.email)
            
            print(f"Invalid login attempt for email: {user_login.email}")
            return None
        except Exception as e:
            print(f"Error during login: {e}")
            return None

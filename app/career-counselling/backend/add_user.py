import asyncio
import bcrypt
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Ensure app is in path so we can import config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.config import settings

MONGODB_URL = settings.MONGODB_URL
DB_NAME = settings.DB_NAME

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

async def add_user():
    email = "user@example.com"
    password = "password123"
    
    # Check if already exists
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        print(f"User {email} already exists!")
        return
        
    # Create user
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    
    user_doc = {
        "email": email,
        "hashedPassword": hashed_password.decode("utf-8"),
        "firstName": "John",
        "lastName": "Doe",
        "middleName": "",
        "gender": "Male",
        "category": "open",
        "mobileNo": "+911234567890",
        "home_state": "Maharashtra",
        "type": "free",
        "isExpert": False,
        "isAdmin": False,
        "wallet": 200,
        "following": [],
        "followers": [],
        "onboarding_completed": False,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    print("==========================================")
    print("User created successfully!")
    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"User ID: {user_id}")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(add_user())

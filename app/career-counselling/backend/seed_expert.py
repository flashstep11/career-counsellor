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

async def seed_expert():
    email = "expert@example.com"
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
        "firstName": "Jane",
        "lastName": "Doe",
        "middleName": "",
        "gender": "Female",
        "category": "open",
        "mobileNo": "+919876543210",
        "home_state": "Delhi",
        "type": "free",
        "isExpert": True,
        "isAdmin": False,
        "wallet": 1000,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create expert profile
    expert_doc = {
        "calendarEmbedUrl": "https://calendly.com/example/30min",
        "meetingCost": 500.0,
        "currentPosition": "Senior Career Counselor",
        "organization": "Future Pathways",
        "bio": "Expert with 10 years of experience in guiding students to top engineering colleges.",
        "education": [
            {
                "degree": "M.A. Psychology",
                "institution": "Delhi University",
                "year": "2015"
            }
        ],
        "socialLinks": {
            "linkedin": "https://linkedin.com/in/janedoe"
        },
        "userId": user_id,
        "rating": 4.8,
        "available": True,
        "studentsGuided": 150,
        "profile_video_id": None,
        "createdAt": datetime.utcnow(),
    }
    
    expert_result = await db.experts.insert_one(expert_doc)
    expert_id = str(expert_result.inserted_id)
    
    # Update user with expertId (to be thorough, though core uses search)
    await db.users.update_one(
        {"_id": result.inserted_id},
        {"$set": {"expertId": expert_id}}
    )
    
    print("==========================================")
    print("Expert seeded successfully!")
    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"User ID: {user_id}")
    print(f"Expert ID: {expert_id}")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(seed_expert())

#!/usr/bin/env python3
"""
Script to seed an expert user to the database.
This script creates both a user record and an expert profile.
"""

import asyncio
import sys
import os
import bcrypt
from datetime import datetime
from bson import ObjectId

# Set required environment variables if not already set
if not os.getenv("MONGODB_URL"):
    os.environ["MONGODB_URL"] = "mongodb+srv://prabhavsai1:pass123@cc.8k6wm.mongodb.net/?appName=cc"
if not os.getenv("DB_NAME"):
    os.environ["DB_NAME"] = "career_counselling"
if not os.getenv("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "your_super_secret_key"
if not os.getenv("ALGORITHM"):
    os.environ["ALGORITHM"] = "HS256"
if not os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"):
    os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
if not os.getenv("CORS_ALLOW_ORIGINS"):
    os.environ["CORS_ALLOW_ORIGINS"] = "http://localhost:3000"

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.models.user import User, UserBase
from app.models.expert import Expert, ExpertBase
from app.managers.user import UserManager
from app.managers.expert import ExpertManager
from app.core.database import get_database


async def seed_expert():
    """Seed an expert user to the database."""
    
    # Hash the password
    password = "aaaaaaaa"
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    
    # Expert user data
    expert_user_data = {
        "firstName": "John",
        "lastName": "Doe",
        "email": "a@madeexpert.com",
        "gender": "male",
        "category": "open",
        "home_state": "California",
        "mobileNo": "+1234567890",
        "type": "expert",
        "isExpert": True,
        "isAdmin": False,
        "wallet": 500,
        "grade": None,
        "preferred_stream": None,
        "target_college": None,
        "interests": ["career guidance", "mentoring", "education"],
        "career_goals": "Help students achieve their career aspirations",
        "onboarding_completed": True,
        "following": [],
        "followers": [],
        "hashedPassword": hashed_password  # Store the hashed password
    }
    
    # Expert profile data
    expert_profile_data = {
        "calendarEmbedUrl": "https://calendly.com/john-doe/30min",
        "meetingCost": 50.0,
        "currentPosition": "Senior Career Counselor",
        "organization": "Career Guidance Institute",
        "bio": "Experienced career counselor with over 10 years of helping students find their perfect career path. Specialized in STEM fields and higher education guidance.",
        "education": [
            {
                "degree": "M.S. Counseling Psychology",
                "institution": "Stanford University",
                "year": "2012"
            },
            {
                "degree": "B.S. Psychology",
                "institution": "UC Berkeley",
                "year": "2010"
            }
        ],
        "socialLinks": {
            "linkedin": "https://linkedin.com/in/johndoe",
            "twitter": "https://twitter.com/johndoe",
            "website": "https://johndoe-expert.com"
        },
        "rating": 4.8,
        "available": True,
        "studentsGuided": 150
    }
    
    try:
        # Initialize managers
        user_manager = UserManager()
        expert_manager = ExpertManager()
        
        print("🌱 Starting expert seeding process...")
        
        # Check if expert user already exists and delete it to recreate with proper password
        existing_user = await user_manager.get_user_by_email(expert_user_data["email"])
        if existing_user:
            print(f"🗑️  Deleting existing expert user: {expert_user_data['email']}")
            await delete_expert(expert_user_data["email"])
        
        # Create the user with proper hashed password
        user_dict = expert_user_data.copy()
        user_dict["createdAt"] = datetime.utcnow()
        user_dict["updatedAt"] = user_dict["createdAt"]
        
        # Insert directly into database to avoid Pydantic ObjectId issues
        db = get_database()
        result = await db.users.insert_one(user_dict)
        user_id = str(result.inserted_id)
        print(f"✅ Created expert user with ID: {user_id}")
        
        # Check if expert profile already exists for this user
        db = get_database()
        existing_expert = await db.experts.find_one({"userId": user_id})
        
        if existing_expert:
            print(f"⚠️  Expert profile already exists for user {user_id}!")
            expert_id = str(existing_expert["_id"])
            print(f"✅ Using existing expert ID: {expert_id}")
        else:
            # Create the expert profile
            expert_base_data = {**expert_profile_data, "userId": user_id}
            expert_dict = expert_base_data.copy()
            expert_dict["createdAt"] = datetime.utcnow()
            
            # Insert expert directly into database
            expert_result = await db.experts.insert_one(expert_dict)
            expert_id = str(expert_result.inserted_id)
            print(f"✅ Created expert profile with ID: {expert_id}")
        
        # Update the user to reference the expert ID
        await user_manager.update_user(user_id, {"expertId": expert_id})
        print(f"✅ Updated user with expert ID reference")
        
        print("\n🎉 Expert seeding completed successfully!")
        print(f"📧 Email: {expert_user_data['email']}")
        print(f"🔑 Password: {password}")
        print(f"👤 Name: {expert_user_data['firstName']} {expert_user_data['lastName']}")
        print(f"🔑 User ID: {user_id}")
        print(f"🏆 Expert ID: {expert_id}")
        print(f"💰 Meeting Cost: ${expert_profile_data['meetingCost']}")
        print(f"⭐ Rating: {expert_profile_data['rating']}")
        
        return {
            "user_id": user_id,
            "expert_id": expert_id,
            "email": expert_user_data["email"],
            "password": password,
            "name": f"{expert_user_data['firstName']} {expert_user_data['lastName']}"
        }
        
    except Exception as e:
        print(f"❌ Error seeding expert: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


async def list_experts():
    """List all existing experts in the database."""
    try:
        db = get_database()
        experts = await db.experts.find({}).to_list(length=None)
        
        if not experts:
            print("📭 No experts found in the database.")
            return
        
        print(f"📋 Found {len(experts)} expert(s):")
        print("-" * 80)
        
        for expert in experts:
            expert_id = str(expert["_id"])
            user_id = expert.get("userId", "N/A")
            name = expert.get("userDetails", {}).get("firstName", "N/A")
            position = expert.get("currentPosition", "N/A")
            organization = expert.get("organization", "N/A")
            rating = expert.get("rating", 0)
            available = expert.get("available", False)
            
            print(f"🏆 Expert ID: {expert_id}")
            print(f"👤 User ID: {user_id}")
            print(f"📛 Name: {name}")
            print(f"💼 Position: {position}")
            print(f"🏢 Organization: {organization}")
            print(f"⭐ Rating: {rating}")
            print(f"🟢 Available: {'Yes' if available else 'No'}")
            print("-" * 80)
            
    except Exception as e:
        print(f"❌ Error listing experts: {str(e)}")


async def delete_expert(email: str):
    """Delete an expert by email."""
    try:
        user_manager = UserManager()
        expert_manager = ExpertManager()
        db = get_database()
        
        # Find the user by email
        user = await user_manager.get_user_by_email(email)
        if not user:
            print(f"❌ No user found with email: {email}")
            return False
        
        user_id = user.id
        
        # Delete expert profile
        expert_result = await db.experts.delete_one({"userId": user_id})
        if expert_result.deleted_count > 0:
            print(f"✅ Deleted expert profile for user: {email}")
        
        # Delete user
        user_result = await db.users.delete_one({"_id": ObjectId(user_id)})
        if user_result.deleted_count > 0:
            print(f"✅ Deleted user: {email}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error deleting expert: {str(e)}")
        return False


async def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python seed_expert.py seed    - Create a new expert")
        print("  python seed_expert.py list    - List all experts")
        print("  python seed_expert.py delete <email> - Delete expert by email")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "seed":
        await seed_expert()
    elif command == "list":
        await list_experts()
    elif command == "delete" and len(sys.argv) >= 3:
        email = sys.argv[2]
        await delete_expert(email)
    else:
        print("❌ Invalid command or missing arguments")
        print("Usage:")
        print("  python seed_expert.py seed    - Create a new expert")
        print("  python seed_expert.py list    - List all experts")
        print("  python seed_expert.py delete <email> - Delete expert by email")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

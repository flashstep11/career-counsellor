#!/usr/bin/env python3
"""
Script to seed test posts into the database
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
import random

# Add the backend app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app/career-counselling/backend'))

from app.db.mongodb import get_database_instance
from bson import ObjectId

async def seed_test_posts():
    """Seed test posts into the database"""
    db = await get_database_instance()
    
    # First, get some experts from the database
    experts = await db.experts.find().limit(5).to_list(length=5)
    
    if not experts:
        print("No experts found in database. Please create experts first.")
        return
    
    print(f"Found {len(experts)} experts")
    
    # Sample post contents
    post_contents = [
        "Just finished reviewing applications for this semester. Remember, your personal statement matters more than your grades!",
        "Tips for aspiring engineers: Start building projects early. Your GitHub portfolio speaks louder than your resume.",
        "Common mistake I see in interviews: Not asking questions. Always prepare thoughtful questions about the role and company.",
        "Career advice: Network authentically. Don't just collect contacts - build genuine relationships.",
        "For students preparing for placements: Practice coding daily, even if it's just 30 minutes. Consistency > Intensity.",
        "Hot take: Your first job doesn't define your career. Focus on learning and growth over salary.",
        "Transitioning to a new field? Start by learning the basics, then work on small projects. Experience beats theory.",
        "Interview prep tip: Use the STAR method (Situation, Task, Action, Result) for behavioral questions.",
        "If you're feeling overwhelmed with career choices, take a step back. Talk to people in different roles. Shadow them if possible.",
        "The best career advice I received: Don't wait for permission to start. If you want to do something, just begin.",
        "Mental health is crucial for career success. Take breaks, exercise, and don't burn out chasing goals.",
        "For college students: Join clubs, participate in hackathons, and attend workshops. These experiences matter!",
        "Changing careers at 30+ is completely normal. I've mentored several people who successfully made the switch.",
        "Stop comparing your Chapter 1 to someone else's Chapter 20. Everyone's journey is different.",
        "Soft skills like communication and teamwork are just as important as technical skills. Work on both!",
    ]
    
    # Create posts for each expert
    posts_to_insert = []
    
    for expert in experts:
        expert_id = str(expert["_id"])
        
        # Get expert name for display
        user = await db.users.find_one({"_id": ObjectId(expert["userId"])})
        if user:
            expert_name = f"{user.get('firstName', '')} {user.get('lastName', '')}".strip()
            expert_initials = f"{user.get('firstName', '')[:1]}{user.get('lastName', '')[:1]}".upper()
        else:
            expert_name = "Expert User"
            expert_initials = "EU"
        
        # Create 2-3 posts per expert
        num_posts = random.randint(2, 3)
        for i in range(num_posts):
            content = random.choice(post_contents)
            
            # Create post with varied timestamps
            days_ago = random.randint(0, 30)
            hours_ago = random.randint(0, 23)
            created_at = datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago)
            
            post = {
                "postId": str(ObjectId()),
                "content": content,
                "expertId": expert_id,
                "expertDetails": {
                    "name": expert_name,
                    "initials": expert_initials
                },
                "createdAt": created_at,
                "updatedAt": created_at,
                "likes": random.randint(0, 50),
                "likedBy": [],
                "views": random.randint(0, 200),
                "commentsCount": random.randint(0, 15)
            }
            
            posts_to_insert.append(post)
    
    # Insert all posts
    if posts_to_insert:
        result = await db.posts.insert_many(posts_to_insert)
        print(f"✅ Successfully inserted {len(result.inserted_ids)} test posts!")
        
        # Display summary
        print("\nPost Summary:")
        for post in posts_to_insert[:5]:  # Show first 5
            print(f"  - {post['expertDetails']['name']}: {post['content'][:60]}...")
            print(f"    Likes: {post['likes']}, Views: {post['views']}, Comments: {post['commentsCount']}")
    else:
        print("❌ No posts to insert")

async def clear_existing_posts():
    """Clear existing posts (optional)"""
    db = await get_database_instance()
    result = await db.posts.delete_many({})
    print(f"🗑️  Deleted {result.deleted_count} existing posts")

async def main():
    print("🌱 Seeding test posts...")
    
    # Ask if user wants to clear existing posts
    if len(sys.argv) > 1 and sys.argv[1] == "--clear":
        await clear_existing_posts()
    
    await seed_test_posts()
    print("\n✨ Done!")

if __name__ == "__main__":
    asyncio.run(main())

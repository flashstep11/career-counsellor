#!/usr/bin/env python3
"""
Clean non-essential data from MongoDB and re-seed communities, expert, and posts.
Keeps: colleges, branches, college_branches (structural/reference data).
Clears and re-seeds: communities, posts, users, experts.
Clears: comments, meetings, ratings, follows, connections, reports,
        notifications, activities, otp_verifications, expert_applications, videos, blogs.
"""

import asyncio
import sys
import os
import bcrypt
import random
from datetime import datetime, timezone, timedelta

# Set environment variables
if not os.getenv("MONGODB_URL"):
    os.environ["MONGODB_URL"] = "mongodb+srv://prabhavsai1:pass123@cc.8k6wm.mongodb.net/?appName=cc"
if not os.getenv("DB_NAME"):
    os.environ["DB_NAME"] = "career_counselling"
if not os.getenv("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "your_super_secret_key"
if not os.getenv("ALGORITHM"):
    os.environ["ALGORITHM"] = "HS256"
if not os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"):
    os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "1440"
if not os.getenv("CORS_ALLOW_ORIGINS"):
    os.environ["CORS_ALLOW_ORIGINS"] = "http://localhost:3000"
if not os.getenv("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = "dummy"

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.environ["MONGODB_URL"]
DB_NAME = os.environ["DB_NAME"]

# ── Collections to CLEAR (user-generated/transient data) ──
COLLECTIONS_TO_CLEAR = [
    "users",
    "experts",
    "posts",
    "comments",
    "meetings",
    "ratings",
    "follows",
    "connections",
    "reports",
    "notifications",
    "activities",
    "otp_verifications",
    "expert_applications",
    "videos",
    "blogs",
    "communities",  # will re-seed
]

# ── Collections to KEEP (structural/reference) ──
# colleges, branches, college_branches — NOT touched

# ── Community seed data ──
DEFAULT_COMMUNITIES = [
    {
        "name": "general",
        "displayName": "General",
        "description": "A place for all topics — career questions, introductions, and anything else that doesn't fit a specific community.",
        "iconColor": "#6366f1",
    },
    {
        "name": "career-guidance",
        "displayName": "Career Guidance",
        "description": "Get advice on choosing the right career path, skill development, and career transitions.",
        "iconColor": "#6366f1",
    },
    {
        "name": "engineering-students",
        "displayName": "Engineering Students",
        "description": "A community for engineering students to discuss academics, projects, and career opportunities.",
        "iconColor": "#ec4899",
    },
    {
        "name": "college-admissions",
        "displayName": "College Admissions",
        "description": "Tips, strategies, and discussions around college applications, entrance exams, and admissions.",
        "iconColor": "#10b981",
    },
    {
        "name": "interview-prep",
        "displayName": "Interview Prep",
        "description": "Share resources, mock interview tips, and success stories for technical and HR interviews.",
        "iconColor": "#f59e0b",
    },
    {
        "name": "study-abroad",
        "displayName": "Study Abroad",
        "description": "Discuss opportunities for studying abroad, scholarships, visa requirements, and university choices.",
        "iconColor": "#3b82f6",
    },
    {
        "name": "placements",
        "displayName": "Campus Placements",
        "description": "Discuss campus recruitment drives, placement strategies, and company experiences.",
        "iconColor": "#8b5cf6",
    },
    {
        "name": "entrepreneurship",
        "displayName": "Entrepreneurship",
        "description": "For budding entrepreneurs to discuss startups, business ideas, funding, and growth strategies.",
        "iconColor": "#ef4444",
    },
    {
        "name": "higher-education",
        "displayName": "Higher Education",
        "description": "Discussions about master's programs, PhD opportunities, and further education choices.",
        "iconColor": "#14b8a6",
    },
]

# ── Post seed data ──
SEED_POSTS = {
    "career-guidance": [
        {
            "title": "5 Skills Every Graduate Should Master Before Their First Job",
            "content": "Landing your first job can be daunting, but there are a few skills that make a huge difference. Communication, time management, basic data analysis, networking, and adaptability are the top five. I spent my final semester focusing on these and it paid off in interviews. What skills do you think are most underrated?",
            "tags": ["skills", "career-tips", "graduates"],
        },
        {
            "title": "How I Pivoted from Mechanical Engineering to Product Management",
            "content": "Three years after graduating in mechanical engineering, I realized my passion was in tech products. I started with online PM courses on Coursera, did two side projects, and networked at local meetups. Within 8 months I landed a junior PM role. The engineering mindset actually helps a lot in PM! Happy to answer questions.",
            "tags": ["career-switch", "product-management", "engineering"],
        },
        {
            "title": "Should I pursue an MBA right after undergrad or get work experience first?",
            "content": "I'm in my final year of B.Com and confused about whether to do an MBA immediately or work for 2-3 years first. My seniors have mixed opinions. Those who worked first say the MBA made more sense with experience, but some top programs do take freshers. What's your take?",
            "tags": ["mba", "career-advice", "education"],
        },
    ],
    "engineering-students": [
        {
            "title": "Best Resources for Learning DSA as a Second-Year Student",
            "content": "After trying multiple resources, here's what worked best for me: Start with Striver's SDE Sheet, use NeetCode for visualizations, and solve problems on LeetCode starting with Easy. Don't jump to Hard problems too early. Consistency of 2 problems/day beats cramming 20 before placements.",
            "tags": ["dsa", "coding", "resources"],
        },
        {
            "title": "My Experience at Google Summer of Code 2025",
            "content": "Got selected for GSoC 2025 with the Apache Software Foundation! The application process was intense — I started contributing to the project 3 months before the application deadline. My proposal focused on improving the query optimization module. The mentorship has been incredible. AMA!",
            "tags": ["gsoc", "open-source", "experience"],
        },
        {
            "title": "Mini Project Ideas That Actually Impressed Recruiters",
            "content": "Forget the generic to-do apps. Here are projects that got me noticed: 1) A real-time collaborative markdown editor 2) An ML-powered resume parser 3) A campus navigation app with indoor mapping. The key is solving a real problem you've personally faced.",
            "tags": ["projects", "placements", "resume"],
        },
    ],
    "interview-prep": [
        {
            "title": "Most Asked System Design Questions at FAANG Companies in 2025",
            "content": "After going through 15+ interviews at top tech companies, these system design questions came up the most: 1) Design a URL shortener 2) Design a chat system like WhatsApp 3) Design a news feed 4) Design a rate limiter 5) Design a notification system. Focus on trade-offs and scalability.",
            "tags": ["system-design", "faang", "interview"],
        },
        {
            "title": "I Failed 12 Interviews Before Getting My Dream Offer — Here's What Changed",
            "content": "After 12 rejections, I completely changed my approach. Instead of memorizing solutions, I started explaining my thought process out loud. I practiced with mock interviews on Pramp. I also started asking interviewers questions about the team culture. The 13th interview was at Microsoft, and I got the offer!",
            "tags": ["motivation", "interview-tips", "experience"],
        },
    ],
    "study-abroad": [
        {
            "title": "Complete Guide to GRE Preparation in 3 Months",
            "content": "Scored 328 on the GRE with 3 months of preparation. Here's the breakdown: Month 1 — Vocabulary (Magoosh flashcards + reading The Economist). Month 2 — Math concepts + official ETS problems. Month 3 — Full-length practice tests (take at least 5). Key tip: don't neglect the AWA section, many universities care about it.",
            "tags": ["gre", "study-abroad", "preparation"],
        },
        {
            "title": "MS in CS: USA vs Canada vs Germany — A Comparison",
            "content": "Having researched all three extensively and applied to universities in each country, here's my honest comparison. USA has the best opportunities but highest cost. Canada offers a great middle ground with easier PR pathways. Germany is nearly free but requires learning German eventually. Your choice depends on your priorities.",
            "tags": ["ms-cs", "comparison", "universities"],
        },
    ],
    "college-admissions": [
        {
            "title": "How to Write a Statement of Purpose That Stands Out",
            "content": "Read over 50 successful SOPs while helping friends apply. The pattern is clear: Start with a specific story (not 'since childhood'), explain your academic journey with concrete outcomes, show research alignment with the program, and end with clear goals. Avoid generic statements about 'passion for learning'.",
            "tags": ["sop", "applications", "tips"],
        },
        {
            "title": "JEE vs NEET vs CUET: Which Exam Should You Focus On?",
            "content": "The answer depends on your interests, not your parents' wishes! If you love math and physics, JEE is your path. If biology excites you, NEET it is. CUET is great for humanities and commerce. Don't fall for the pressure of choosing engineering just because everyone else is. Follow your genuine interest.",
            "tags": ["entrance-exams", "jee", "neet", "cuet"],
        },
    ],
    "placements": [
        {
            "title": "Placement Season Survival Guide: Day 0 to Final Offer",
            "content": "Just wrapped up placement season with an offer from a top product company. Here's my timeline: Started DSA prep 6 months before. Did 3 internships during summers. Built 2 strong projects. Practiced aptitude tests on PrepInsta. Mock interviews with friends every weekend in the last month. The preparation is a marathon, not a sprint.",
            "tags": ["placements", "guide", "preparation"],
        },
    ],
    "entrepreneurship": [
        {
            "title": "I Built a ₹2L MRR SaaS While Still in College — Lessons Learned",
            "content": "Started building a scheduling tool for local coaching centers in my 3rd year. Used Next.js + Firebase to keep costs low. Growth was entirely through WhatsApp groups and college fests. Hit ₹2L monthly recurring revenue in 8 months. Biggest lesson: Talk to customers before writing code. The first version of your product should embarrass you.",
            "tags": ["saas", "startup", "college"],
        },
        {
            "title": "Best Startup Competitions and Grants for Student Founders in India",
            "content": "Here's a curated list: 1) Smart India Hackathon 2) NASSCOM 10,000 Startups 3) Startup India Seed Fund 4) IIT Bombay E-Summit 5) BITS Spark. Most of these offer mentoring in addition to funding. Apply to multiple — each rejection teaches you something about your pitch.",
            "tags": ["funding", "competitions", "student-startups"],
        },
    ],
    "higher-education": [
        {
            "title": "PhD vs Industry: Making the Right Choice After Your Master's",
            "content": "Spent 6 months deliberating this after my M.Tech. Here's what helped me decide: If you love research and can handle uncertainty, PhD is rewarding. If you want financial stability sooner, industry is the way. Talk to PhD students in year 3+ for the real picture, not just year 1 students who are still in the honeymoon phase.",
            "tags": ["phd", "industry", "career-decision"],
        },
    ],
}


async def main():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]

    # ──────────────────────────────────────────────
    # STEP 1: Clear non-essential collections
    # ──────────────────────────────────────────────
    print("=" * 60)
    print("STEP 1: Clearing non-essential collections")
    print("=" * 60)

    for col_name in COLLECTIONS_TO_CLEAR:
        count = await db[col_name].count_documents({})
        result = await db[col_name].delete_many({})
        print(f"  🗑  {col_name}: deleted {result.deleted_count}/{count} documents")

    print()

    # ──────────────────────────────────────────────
    # STEP 2: Verify structural data is intact
    # ──────────────────────────────────────────────
    print("=" * 60)
    print("STEP 2: Verifying structural data is intact")
    print("=" * 60)

    for col_name in ["colleges", "branches", "college_branches"]:
        count = await db[col_name].count_documents({})
        print(f"  ✅ {col_name}: {count} documents (untouched)")

    print()

    # ──────────────────────────────────────────────
    # STEP 3: Seed communities
    # ──────────────────────────────────────────────
    print("=" * 60)
    print("STEP 3: Seeding communities")
    print("=" * 60)

    now = datetime.now(timezone.utc)
    for comm in DEFAULT_COMMUNITIES:
        doc = {
            **comm,
            "createdBy": "system",
            "memberCount": 0,
            "postCount": 0,
            "members": [],
            "createdAt": now,
            "updatedAt": now,
        }
        result = await db.communities.insert_one(doc)
        print(f"  ✅ Created community '{comm['name']}' → {result.inserted_id}")

    print()

    # ──────────────────────────────────────────────
    # STEP 4: Seed expert user
    # ──────────────────────────────────────────────
    print("=" * 60)
    print("STEP 4: Seeding expert user")
    print("=" * 60)

    password = "aaaaaaaa"
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    expert_user_doc = {
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
        "hashedPassword": hashed_password,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    user_result = await db.users.insert_one(expert_user_doc)
    user_id = str(user_result.inserted_id)
    print(f"  ✅ Created expert user → {user_id}")

    expert_profile_doc = {
        "calendarEmbedUrl": "https://calendly.com/john-doe/30min",
        "meetingCost": 50.0,
        "currentPosition": "Senior Career Counselor",
        "organization": "Career Guidance Institute",
        "bio": "Experienced career counselor with over 10 years of helping students find their perfect career path. Specialized in STEM fields and higher education guidance.",
        "education": [
            {
                "degree": "M.S. Counseling Psychology",
                "institution": "Stanford University",
                "year": "2012",
            },
            {
                "degree": "B.S. Psychology",
                "institution": "UC Berkeley",
                "year": "2010",
            },
        ],
        "socialLinks": {
            "linkedin": "https://linkedin.com/in/johndoe",
            "twitter": "https://twitter.com/johndoe",
            "website": "https://johndoe-expert.com",
        },
        "userId": user_id,
        "rating": 4.8,
        "available": True,
        "studentsGuided": 150,
        "profile_video_id": None,
        "createdAt": datetime.utcnow(),
    }

    expert_result = await db.experts.insert_one(expert_profile_doc)
    expert_id = str(expert_result.inserted_id)
    print(f"  ✅ Created expert profile → {expert_id}")

    # Link expert ID back to user
    await db.users.update_one(
        {"_id": user_result.inserted_id},
        {"$set": {"expertId": expert_id}},
    )
    print(f"  ✅ Linked expert ID to user")
    print(f"  📧 Expert login: a@madeexpert.com / {password}")

    print()

    # ──────────────────────────────────────────────
    # STEP 5: Seed posts across communities
    # ──────────────────────────────────────────────
    print("=" * 60)
    print("STEP 5: Seeding posts across communities")
    print("=" * 60)

    posts_created = 0
    for slug, posts in SEED_POSTS.items():
        community = await db.communities.find_one({"name": slug})
        if not community:
            print(f"  ⚠  Community '{slug}' not found — skipping its posts")
            continue

        community_id = str(community["_id"])

        for post_data in posts:
            hours_ago = random.randint(1, 72)
            created_at = now - timedelta(hours=hours_ago)

            doc = {
                "communityId": community_id,
                "authorId": "system",
                "title": post_data["title"],
                "content": post_data["content"],
                "tags": post_data.get("tags", []),
                "media": [],
                "likes": random.randint(5, 120),
                "likedBy": [],
                "views": random.randint(20, 500),
                "createdAt": created_at,
                "updatedAt": created_at,
            }
            result = await db.posts.insert_one(doc)
            print(f"  ✅ [{slug}] '{post_data['title'][:50]}...' → {result.inserted_id}")
            posts_created += 1

            # Increment postCount on the community
            await db.communities.update_one(
                {"_id": community["_id"]},
                {"$inc": {"postCount": 1}},
            )

    print(f"\n  Total posts created: {posts_created}")
    print()

    # ──────────────────────────────────────────────
    # SUMMARY
    # ──────────────────────────────────────────────
    print("=" * 60)
    print("DONE — Summary")
    print("=" * 60)
    print(f"  Communities: {await db.communities.count_documents({})}")
    print(f"  Users:       {await db.users.count_documents({})}")
    print(f"  Experts:     {await db.experts.count_documents({})}")
    print(f"  Posts:       {await db.posts.count_documents({})}")
    print(f"  Colleges:    {await db.colleges.count_documents({})} (untouched)")
    print(f"  Branches:    {await db.branches.count_documents({})} (untouched)")
    print(f"  ColBranches: {await db.college_branches.count_documents({})} (untouched)")
    print()
    print("  Expert credentials: a@madeexpert.com / aaaaaaaa")
    print("=" * 60)

    client.close()


if __name__ == "__main__":
    asyncio.run(main())

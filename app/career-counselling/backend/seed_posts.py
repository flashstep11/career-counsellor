#!/usr/bin/env python3
"""
Seed the MongoDB database with demo posts across communities.
Run once from the backend directory:
  python seed_posts.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from app.config import settings
import random

# Demo posts per community (keyed by community slug)
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


async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    communities_col = db.communities
    posts_col = db.posts

    now = datetime.now(timezone.utc)
    created_count = 0
    skipped_count = 0

    for slug, posts in SEED_POSTS.items():
        community = await communities_col.find_one({"name": slug})
        if not community:
            print(f"  ⚠  Community '{slug}' not found, skipping its posts")
            continue

        community_id = str(community["_id"])

        for post_data in posts:
            # Check if a post with this exact title already exists in this community
            existing = await posts_col.find_one({
                "communityId": community_id,
                "title": post_data["title"],
            })
            if existing:
                print(f"  ⏭  Skipping '{post_data['title'][:50]}...' (already exists)")
                skipped_count += 1
                continue

            # Vary the creation time so posts don't all show the same timestamp
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
            result = await posts_col.insert_one(doc)
            print(f"  ✅ Created '{post_data['title'][:50]}...' → {result.inserted_id}")
            created_count += 1

            # Increment post count on community
            await communities_col.update_one(
                {"_id": community["_id"]},
                {"$inc": {"postCount": 1}},
            )

    client.close()
    print(f"\nDone: {created_count} posts created, {skipped_count} skipped.")


if __name__ == "__main__":
    asyncio.run(seed())

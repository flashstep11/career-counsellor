from google import genai
import os
import re
from fastapi import HTTPException
import json
from app.core.database import get_database
from app.config import settings
from datetime import datetime
from bson import ObjectId
from app.managers.search import SearchManager
from app.managers.college import CollegeManager
from app.managers.expert import ExpertManager
from app.managers.branch import BranchManager


class ChatbotManager:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = genai.Client(api_key=self.api_key)
        self.model = "gemini-2.0-flash"
        self.search_manager = SearchManager()
        self.college_manager = CollegeManager()
        self.expert_manager = ExpertManager()
        self.branch_manager = BranchManager()

    async def handle_system_request(self, query: str):
        """Process a system request from the AI to search for information"""
        try:
            # Extract the query from the SYSTEM REQUEST format
            search_query = query.replace("SYSTEM REQUEST:", "").strip()

            # Perform search using our existing search functionality
            search_results = await self.search_manager.search(search_query)

            # If we have results, let's get more details about top items
            detailed_results = []

            # Process college results - colleges are CollegeSearchResponse objects
            if search_results.colleges and len(search_results.colleges) > 0:
                college_ids = [
                    college.collegeID for college in search_results.colleges[:3]]
                for college_id in college_ids:
                    try:
                        # The get_college method returns a CollegeDescriptionResponse object
                        college_details = await self.college_manager.get_college(college_id)
                        if college_details:
                            # Access attributes directly on the Pydantic model
                            detailed_results.append({
                                "type": "college",
                                "name": college_details.name,
                                "state": college_details.state,
                                "address": college_details.address,
                                "nirfRanking": college_details.nirfRanking,
                                "description": college_details.description,
                                "website": str(college_details.website),
                                "college_type": college_details.type,  # Renamed to avoid duplicate key
                                "locality_type": college_details.locality_type,
                                "gender_ratio": college_details.gender_ratio,
                                "yearOfEstablishment": college_details.yearOfEstablishment,
                                "placement": college_details.placement,
                                "placementMedian": college_details.placementMedian
                            })
                    except Exception as e:
                        print(
                            f"Error processing college {college_id}: {str(e)}")

            # Process experts results - experts are ExpertSearchResponse objects
            if search_results.experts and len(search_results.experts) > 0:
                expert_ids = [
                    expert.expertID for expert in search_results.experts[:3]]
                for expert_id in expert_ids:
                    try:
                        # The get_expert method returns an ExpertResponse object
                        expert = await self.expert_manager.get_expert(expert_id)
                        if expert:
                            # Extract user details from the ExpertResponse
                            expert_info = {
                                "type": "expert",
                                "name": f"{expert.userDetails.firstName} {expert.userDetails.lastName}",
                                "bio": expert.bio,
                                "specialization": getattr(expert, "specialization", ""),
                                "institution": getattr(expert, "organization", ""),
                                "rating": expert.rating
                            }

                            # Add expertise areas if available
                            if hasattr(expert, "expertise_areas"):
                                expert_info["expertise_areas"] = expert.expertise_areas

                            # Add education if available
                            if hasattr(expert, "education") and expert.education:
                                education_info = []
                                for edu in expert.education:
                                    education_info.append({
                                        "degree": edu.get("degree", ""),
                                        "institution": edu.get("institution", ""),
                                        "year": edu.get("year", "")
                                    })
                                expert_info["education"] = education_info

                            detailed_results.append(expert_info)
                    except Exception as e:
                        print(f"Error processing expert {expert_id}: {str(e)}")

            # Process branch results if they exist
            if hasattr(search_results, 'branches') and search_results.branches and len(search_results.branches) > 0:
                branch_ids = [
                    branch.branchID for branch in search_results.branches[:3]]
                for branch_id in branch_ids:
                    try:
                        branch_details = await self.branch_manager.get_branch(branch_id)
                        if branch_details:
                            # Check if branch_details is a dictionary or an object
                            if isinstance(branch_details, dict):
                                detailed_results.append({
                                    "type": "branch",
                                    "name": branch_details.get("name", ""),
                                    "description": branch_details.get("description", ""),
                                    "career_prospects": branch_details.get("career_prospects", ""),
                                    "required_skills": branch_details.get("required_skills", []),
                                    "job_roles": branch_details.get("job_roles", [])
                                })
                            else:
                                # Assume it's a Pydantic model
                                detailed_results.append({
                                    "type": "branch",
                                    "name": getattr(branch_details, "name", ""),
                                    "description": getattr(branch_details, "description", ""),
                                    "career_prospects": getattr(branch_details, "career_prospects", ""),
                                    "required_skills": getattr(branch_details, "required_skills", []),
                                    "job_roles": getattr(branch_details, "job_roles", [])
                                })
                    except Exception as e:
                        print(f"Error processing branch {branch_id}: {str(e)}")

            # Process blog results - blogs are BlogSearchResponse objects
            if search_results.blogs and len(search_results.blogs) > 0:
                blog_ids = [blog.blogID for blog in search_results.blogs[:3]]
                from app.managers.blog import BlogManager
                blog_manager = BlogManager()
                for blog_id in blog_ids:
                    try:
                        blog = await blog_manager.get_blog(blog_id)
                        if blog:
                            # Handle blog data based on its type
                            blog_info = {
                                "type": "blog",
                                "heading": getattr(blog, "heading", "") if hasattr(blog, "heading") else blog.get("heading", ""),
                                "author": ""
                            }

                            # Get blog body and truncate if needed
                            if hasattr(blog, "body"):
                                body = blog.body
                                blog_info["body"] = body[:500] + \
                                    "..." if len(body) > 500 else body
                            elif isinstance(blog, dict) and "body" in blog:
                                body = blog["body"]
                                blog_info["body"] = body[:500] + \
                                    "..." if len(body) > 500 else body

                            # Add tags if available
                            if hasattr(blog, "tags"):
                                blog_info["tags"] = blog.tags
                            elif isinstance(blog, dict) and "tags" in blog:
                                blog_info["tags"] = blog["tags"]

                            # Add author if available
                            if hasattr(blog, "author"):
                                # Get the author's name
                                if hasattr(blog.author, "firstName") and hasattr(blog.author, "lastName"):
                                    blog_info["author"] = f"{blog.author.firstName} {blog.author.lastName}"

                            detailed_results.append(blog_info)
                    except Exception as e:
                        print(f"Error processing blog {blog_id}: {str(e)}")

            # Process video results - videos are VideoSearchResponse objects
            if search_results.videos and len(search_results.videos) > 0:
                video_ids = [
                    video.videoID for video in search_results.videos[:3]]
                from app.managers.video import VideoManager
                video_manager = VideoManager()
                for video_id in video_ids:
                    try:
                        video = await video_manager.get_video(video_id)
                        if video:
                            # Handle video data based on its type
                            video_info = {
                                "type": "video",
                                "title": getattr(video, "title", ""),
                                "description": getattr(video, "description", ""),
                                "tags": getattr(video, "tags", []),
                                "duration": getattr(video, "duration", "Unknown")
                            }
                            
                            # Add transcript if available (for Pydantic models)
                            if hasattr(video, "transcript") and video.transcript:
                                video_info["transcript"] = video.transcript
                            
                            # Add transcript if it's a dictionary
                            if isinstance(video, dict) and "transcript" in video and video["transcript"]:
                                video_info["transcript"] = video["transcript"]
                            
                            detailed_results.append(video_info)
                    except Exception as e:
                        print(f"Error processing video {video_id}: {str(e)}")

            # Format the response for the AI
            response = {
                "query": search_query,
                "result_count": {
                    "colleges": len(search_results.colleges or []),
                    "experts": len(search_results.experts or []),
                    "branches": len(getattr(search_results, 'branches', []) or []),
                    "blogs": len(search_results.blogs or []),
                    "videos": len(search_results.videos or [])
                },
                "detailed_results": detailed_results
            }

            return json.dumps(response, indent=2)

        except Exception as e:
            print(f"Error in handle_system_request: {str(e)}")
            return f"Error processing search request: {str(e)}"

    async def get_user_details(self, user_id: str):
        """Helper method to get user details by ID"""
        db = get_database()
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user["id"] = str(user.pop("_id"))
                return user
            return None
        except Exception:
            return None

    async def create_chat_session(self, user_id: str):
        """Create a new chat session for a user"""
        db = get_database()

        # Create a new chat session
        chat_session = {
            "user_id": user_id,
            "created_at": datetime.now(),
            "history": [],
            "system_prompts": []
        }

        result = await db.chatbot_sessions.insert_one(chat_session)

        # After creating a session, send an initial system prompt with user details
        session_id = str(result.inserted_id)
        await self.send_initial_system_prompt(session_id, user_id)

        return session_id

    async def send_initial_system_prompt(self, session_id: str, user_id: str):
        """Send initial system prompt with comprehensive user details"""
        db = get_database()

        try:
            # Get user details
            user = await db.users.find_one({"_id": ObjectId(user_id)})

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # Get additional user data if available
            expert_data = None
            if user.get("isExpert", False):
                print("User is an expert, fetching expert data...")
                expert_data = await db.experts.find_one({"userId": user_id})
                print(f"Expert data: {expert_data}")

            # Get user's activities, followers, and following counts if available
            activity_count = 0
            following_count = len(user.get("following", []))
            followers_count = len(user.get("followers", []))

            # Get most recent activity if any
            recent_activity = None
            try:
                activities = await db.user_activities.find({"user_id": user_id}).sort("timestamp", -1).limit(5).to_list(5)
                activity_count = len(activities)
                if activities:
                    recent_activity = activities[0]
            except Exception:
                pass

            # Get user wallet information
            wallet_balance = user.get("wallet", 0)

            # Get user preferences if available
            preferences = user.get("preferences", {})
            interests = user.get("interests", [])
            education = user.get("education", {})

            # Gender, category, and location information
            gender = user.get("gender", "Not specified")
            category = user.get("category", "Not specified")
            home_state = user.get("home_state", "Not specified")
            mobile = user.get("mobileNo", "Not specified")

            # Format exam ranks if available
            exam_ranks = user.get("exam_ranks", {})
            exam_ranks_info = ""
            if exam_ranks:
                exam_ranks_info = "Exam Rankings:\n"
                for exam, rank in exam_ranks.items():
                    exam_ranks_info += f"- {exam}: {rank}\n"

            # Format user type information
            user_type = user.get("type", "free")
            user_status = user.get("status", "active")

            # Construct expert information if available
            expert_info = ""
            if expert_data:
                specialization = expert_data.get("specialization", "")
                institution = expert_data.get("organization", "")
                current_position = expert_data.get("currentPosition", "")
                bio = expert_data.get("bio", "")
                expertise_areas = expert_data.get("expertise_areas", [])
                rating = expert_data.get("rating", 0)
                meeting_cost = expert_data.get("meetingCost", 0)
                available = "Available" if expert_data.get(
                    "available", True) else "Not Available"

                # Social links
                social_links = expert_data.get("socialLinks", {})
                social_links_info = ""
                for platform, link in social_links.items():
                    if link:
                        social_links_info += f"- {platform}: {link}\n"

                # Education history
                education_history = expert_data.get("education", [])
                education_history_info = ""
                for edu in education_history:
                    degree = edu.get("degree", "")
                    institution = edu.get("institution", "")
                    year = edu.get("year", "")
                    education_history_info += f"- {degree} from {institution} ({year})\n"

                expert_info = f"""
                Expert Information:
                - Specialization: {specialization}
                - Current Position: {current_position}
                - Institution: {institution}
                - Biography: {bio}
                - Expertise Areas: {', '.join(expertise_areas) if expertise_areas else 'Not specified'}
                - Rating: {rating}/5
                - Meeting Cost: {meeting_cost} coins
                - Status: {available}
                
                Social Links:
                {social_links_info if social_links_info else 'No social links provided'}
                
                Education History:
                {education_history_info if education_history_info else 'No education history provided'}
                """

            # Construct educational background
            education_info = ""
            if education:
                college = education.get("college", "")
                degree = education.get("degree", "")
                field = education.get("field", "")
                year = education.get("year", "")
                gpa = education.get("gpa", "")

                education_info = f"""
                Educational Background:
                - College/University: {college}
                - Degree: {degree}
                - Field of Study: {field}
                - Graduation Year: {year}
                - GPA: {gpa if gpa else 'Not specified'}
                {exam_ranks_info}
                """

            # Preferences and interests
            preferences_info = ""
            if preferences or interests:
                preferred_locations = preferences.get("locations", [])
                preferred_fields = preferences.get("fields", [])
                career_goals = preferences.get("career_goals", [])
                skill_interests = preferences.get("skills", [])

                preferences_info = f"""
                Preferences & Interests:
                - Preferred Locations: {', '.join(preferred_locations) if preferred_locations else 'Not specified'}
                - Preferred Fields: {', '.join(preferred_fields) if preferred_fields else 'Not specified'}
                - Career Goals: {', '.join(career_goals) if career_goals else 'Not specified'}
                - Skills Interest: {', '.join(skill_interests) if skill_interests else 'Not specified'}
                - General Interests: {', '.join(interests) if interests else 'Not specified'}
                """

            # Platform engagement
            engagement_info = f"""
            Platform Engagement:
            - Account Type: {user_type.capitalize()}
            - Account Status: {user_status.capitalize()}
            - Wallet Balance: {wallet_balance} coins
            - Following: {following_count} experts
            - Followers: {followers_count}
            - Activity Count: {activity_count}
            """

            # Construct a detailed system prompt with comprehensive user information
            system_prompt = f"""
            SYSTEM: You are CareerMind AI, a helpful career counselling assistant.
            
            USER INFORMATION:
            - Name: {user.get('firstName', '')} {user.get('middleName', '') if user.get('middleName') else ''} {user.get('lastName', '')}
            - Email: {user.get('email', '')}
            - Role (Expert means they have been approved as an expert on the platform, and can publish content relating to their college/career experience): {'Expert' if user.get('isExpert', False) else 'Student'}
            - Gender: {gender}
            - Category (caste/economic background): {category}
            - Home State: {home_state}
            - Mobile: {mobile}
            - User ID: {user_id}
            - Account Created: {user.get('createdAt', 'Unknown')}

            {education_info}
            
            {preferences_info}
            
            {engagement_info}
            
            {expert_info if user.get('isExpert', False) else ''}
            
            Your purpose is to provide personalized guidance for students on career paths, 
            college selection, and educational opportunities. Be friendly, concise, and 
            always supportive, offering both emotional reassurance and practical advice.
            
            When speaking to {user.get('firstName', '')}, address them by name and provide 
            tailored advice based on their profile. If they ask about specific colleges, 
            branches, or career paths, provide accurate information based on current trends 
            and opportunities.

            DATA CAPABILITIES:
            Our platform contains rich information about:
            1. Colleges - Including rankings, placements, locations, specializations, etc.
            2. Experts - Career counselors and professionals with their specializations
            3. Branches/Courses - Details about various educational programs and career paths
            4. Blogs - Informative articles on career guidance
            5. Videos - Educational content for career development (including full transcripts)
            
            SEARCH CAPABILITY:
            You have the ability to search the AlumNiti platform for information 
            about colleges, courses, branches, experts, blogs, and videos. When a user asks about specific 
            educational information that you need more details on, you can search our database 
            by using the format:
            
            SYSTEM REQUEST: [search query]
            
            For example:
            SYSTEM REQUEST: top engineering colleges in India
            SYSTEM REQUEST: Computer Science career prospects
            SYSTEM REQUEST: experts in AI and Machine Learning
            SYSTEM REQUEST: IIIT Hyderabad
            SYSTEM REQUEST: B.Tech in Computer Science
            SYSTEM REQUEST: Mohit Singh
            SYSTEM REQUEST: Computer Science blogs
            
            When you do this, our system will search the database and provide you with accurate 
            information to incorporate into your response. The user will not see the SYSTEM REQUEST 
            or search results directly.
            
            Always try to provide personalized responses based on the user's data. If they've shared 
            preferences, interests, or educational background, reference those in your responses.
            
            Keep responses focused on student career guidance and maintain a helpful, 
            supportive tone at all times. Use markdown formatting in your responses to improve readability.
            
            IMPORTANT: Never begin your responses with "ASSISTANT:" or any other role labels.

            Today's date: April 20, 2025

            PLEASE immediately acknowledge the user when they start a new session and
            provide a friendly welcome message. For example:
            "Hello {user.get('firstName', '')}! I'm your AI career counselling assistant.
            How can I help with your career questions today?"
            Whenever user asks you about something, first try to use the SYSTEM REQUEST, and then only
            formulate your response. If no results, proceed as you would without the request functionality,
            but if results found, do mention them in your response as well.

            If the user asks what college they can get into, point them to the College Predictor page. (/predictor)
            """

            # Send the system prompt
            await self.send_message(system_prompt, session_id, user_id, is_system=True)

            # Send a welcome message to appear in the chat
            welcome_message = f"Hello {user.get('firstName', '')}! I'm your AI career counselling assistant. How can I help with your career questions today?"
            response = await self.send_message(welcome_message, session_id, user_id, is_assistant=True)

            return response

        except Exception as e:
            print(f"Error sending initial system prompt: {str(e)}")
            # Don't raise the exception here, as this is an internal initialization step

    async def get_chat_history(self, session_id: str):
        """Get chat history for a session"""
        db = get_database()
        session = await db.chatbot_sessions.find_one({"_id": ObjectId(session_id)})

        if not session:
            raise HTTPException(
                status_code=404, detail="Chat session not found")

        return session["history"]

    async def send_message(self, message: str, session_id: str = None, user_id: str = None, is_system: bool = False, is_assistant: bool = False):
        """
        Process a message and return a non-streaming response
        """
        if not self.api_key:
            raise HTTPException(
                status_code=500, detail="GEMINI_API_KEY not configured")

        try:
            db = get_database()

            # Check if this is a system request from the AI
            if message.startswith("SYSTEM REQUEST:") and not is_system and not is_assistant:
                # Process the search request
                search_result = await self.handle_system_request(message)

                # Add this as a system message in the session
                if session_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"system_prompts": {
                            "content": f"Search Results for: {message}\n\n{search_result}",
                            "timestamp": datetime.now()
                        }}}
                    )

                # Return a message to acknowledge the search has been performed
                return {
                    "response": f"I've searched our database for information about {message.replace('SYSTEM REQUEST:', '').strip()}. Let me tell you what I found...",
                    "debug_history": [{"role": "system", "content": search_result}]
                }

            # For assistant-generated messages, just return the message without API calls
            if is_assistant:
                # Store the message in database if necessary
                if session_id and user_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"history": {
                            "role": "assistant",
                            "content": message,
                            "timestamp": datetime.now()
                        }}}
                    )
                return {
                    "response": message,
                    "debug_history": [{"role": "assistant", "content": message}]
                }

            # For system messages, just store them without making API calls
            if is_system:
                if session_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"system_prompts": {
                            "content": message,
                            "timestamp": datetime.now()
                        }}}
                    )
                return {
                    "response": "System prompt saved",
                    "debug_history": [{"role": "system", "content": message}]
                }

            # From here on, we're dealing with a genuine user message that needs AI response

            # Get session data first (do this only once)
            session = None
            if session_id:
                session = await db.chatbot_sessions.find_one({"_id": ObjectId(session_id)})

            # Create a new chat session with the model
            chat = self.client.chats.create(model=self.model)

            # Build the complete context for the AI in a more efficient manner
            full_context = []

            # First, add all system prompts
            if session:
                for system_prompt in session.get("system_prompts", []):
                    full_context.append(
                        {"role": "system", "content": system_prompt["content"]})

            # Add one search instruction (only once)
            search_instruction = """
            If you need to search for specific information about colleges, experts, or branches,
            you can use the SYSTEM REQUEST: prefix followed by your search query. For example:
            SYSTEM REQUEST: Computer Science colleges in India
            This will allow me to search our database for relevant information and provide more accurate answers.
            """
            full_context.append(
                {"role": "system", "content": search_instruction})

            # Then add chat history (alternating user and assistant messages)
            if session:
                for history_item in session.get("history", []):
                    full_context.append({
                        "role": history_item["role"],
                        "content": history_item["content"]
                    })

            # Send the context to the model more efficiently - rather than one at a time
            # We'll batch the messages and only make API calls when necessary
            BATCH_SIZE = 5  # Adjust this based on performance needs
            for i in range(0, len(full_context), BATCH_SIZE):
                batch = full_context[i:i+BATCH_SIZE]
                batch_text = "\n\n".join(
                    [f"{item['role'].upper()}: {item['content']}" for item in batch])
                chat.send_message(batch_text)

            # Add the current user message
            if not is_assistant:
                # Store user message in history
                if session_id and user_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"history": {
                            "role": "user",
                            "content": message,
                            "timestamp": datetime.now()
                        }}}
                    )

                # Send message to Gemini and get response
                response = chat.send_message(message)
                response_text = response.text

                # Check if the AI response contains a SYSTEM REQUEST
                system_request_match = re.search(
                    r'SYSTEM REQUEST:(.*?)(?=\n\n|$)', response_text, re.DOTALL)

                if system_request_match:
                    # Extract the search query
                    search_query = system_request_match.group(1).strip()

                    # Process the search request
                    search_result = await self.handle_system_request(f"SYSTEM REQUEST: {search_query}")

                    # Add this as a system message in the session
                    if session_id:
                        await db.chatbot_sessions.update_one(
                            {"_id": ObjectId(session_id)},
                            {"$push": {"system_prompts": {
                                "content": f"Search Results for: {search_query}\n\n{search_result}",
                                "timestamp": datetime.now()
                            }}}
                        )

                    # Get a new response with search results (one more API call)
                    follow_up = f"I performed the search for '{search_query}' and here are the results:\n{search_result}\n\nNow, please revise your previous response with this new information."
                    response = chat.send_message(follow_up)
                    response_text = response.text.replace(
                        "SYSTEM REQUEST:" + search_query, "")

                # Clean up the response text to remove any role prefixes like "ASSISTANT:"
                response_text = re.sub(r'^ASSISTANT:\s*', '', response_text)
                response_text = re.sub(
                    r'\n+ASSISTANT:\s*', '\n', response_text)

                # Store the assistant's response
                if session_id:
                    await db.chatbot_sessions.update_one(
                        {"_id": ObjectId(session_id)},
                        {"$push": {"history": {
                            "role": "assistant",
                            "content": response_text,
                            "timestamp": datetime.now()
                        }}}
                    )

                return {
                    "response": response_text,
                    "debug_history": [{"role": "assistant", "content": response_text}]
                }

        except Exception as e:
            print(f"Error in send_message: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def enhance_content(self, content: str):
        """
        Enhance content using AI without saving to a session
        Specifically designed for one-off content enhancement
        """
        if not self.api_key:
            raise HTTPException(
                status_code=500, detail="GEMINI_API_KEY not configured")

        try:
            # Create a new chat session with the model
            chat = self.client.chats.create(model=self.model)

            # Send a system prompt to configure the AI for content enhancement
            enhancement_prompt = """
            SYSTEM: You are a professional content enhancer. Your task is to rewrite content to make it more professional, 
            well-structured, and engaging using proper markdown formatting. Use headings, bullet points, emphasis, and other markdown 
            elements to improve readability. Maintain the core message but enhance the language, clarity, and overall presentation to 
            a LinkedIn-professional level. Do not add any greetings or explanations - ONLY return the enhanced content.
            """

            # Send the system prompt to the model
            chat.send_message(enhancement_prompt)

            # Send the content to be enhanced
            user_content = f"Please enhance this content:\n\n{content}"
            response = chat.send_message(user_content)
            enhanced_content = response.text

            # Clean up the response text to remove any system hints
            enhanced_content = re.sub(
                r'^(Here is the enhanced content:|Enhanced content:|Here\'s the enhanced version:)\s*', '', enhanced_content, flags=re.IGNORECASE)
            enhanced_content = enhanced_content.strip()

            return enhanced_content

        except Exception as e:
            print(f"Error in enhance_content: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

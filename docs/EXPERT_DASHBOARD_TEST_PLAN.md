# Expert Dashboard Test Plan

This document outlines the testing scope for the Expert Dashboard. It includes automated backend tests (which are already implemented) and manual frontend tests (which must be verified in the browser).

## 1. Backend Automated Tests (Implemented)

These tests run automatically against the server.

### 1.1 Analytics API Access Control
- **File**: `backend/tests/test_expert_analytics_route_access.py`
- **Preconditions**: An expert profile exists.
- **Test Description**: Call the analytics API as the profile owner, an admin, and a regular user.
- **Expected Outcome**: The owner and admin receive data successfully. Regular users are blocked (403 error). If the expert does not exist, a 404 error is returned.

### 1.2 Profile-View Tracking
- **File**: `backend/tests/test_expert_analytics_profile_views.py`
- **Preconditions**: An expert profile exists.
- **Test Description**: Send profile-view requests from the same user repeatedly, and then from different users.
- **Expected Outcome**: Repeated views from the same user within a short time count as one view. Different users increase the view count separately.

### 1.3 User Posts Pagination
- **File**: `backend/tests/test_user_posts_pagination.py`
- **Preconditions**: A user has multiple pages of posts.
- **Test Description**: Request the second page of posts for the user.
- **Expected Outcome**: The correct posts and page limits are returned. If the user does not exist, a 404 error is returned.

### 1.4 Meeting Availability Setup (Odd Minutes & Paused States)
- **File**: `backend/tests/test_meeting_availability_behavior.py`
- **Preconditions**: The expert configures irregular time slots (e.g., 05:34 - 07:34).
- **Test Description**: Ask the system to generate available slots based on the schedule. Try booking a meeting when the expert is turned off (paused).
- **Expected Outcome**: Slots are generated accurately (e.g., 60-minute blocks starting at 05:34). Booking returns no available slots and fails completely if the expert is paused.

### 1.5 Video Management Data
- **File**: `backend/tests/test_video_my_videos_route.py`
- **Preconditions**: The expert has uploaded videos.
- **Test Description**: Retrieve data from the "My videos" API endpoint.
- **Expected Outcome**: The server returns properly formatted video objects with URLs and statistics meant for the dashboard.

### 1.6 Expert Rating Updates
- **File**: `backend/tests/test_rating_updates_expert_average.py`
- **Preconditions**: An expert has existing meeting ratings.
- **Test Description**: Submit new ratings from multiple students.
- **Expected Outcome**: The expert's average score recalculates and updates accurately in the database.

### 1.7 Content Cards Aggregation
- **File**: `backend/tests/test_expert_analytics_content_cards.py`
- **Preconditions**: The expert has posts, videos, blogs, followers, and completed meetings.
- **Test Description**: Call the analytics API to get dashboard numbers.
- **Expected Outcome**: Total metrics for counts, views, reads, and engagement exactly match the individual records.

### 1.8 Database Update Concurrency
- **File**: `backend/tests/test_expert_update_concurrency.py`
- **Preconditions**: The expert makes very fast updates.
- **Test Description**: Send two updates simultaneously to different fields (e.g., meeting cost and availability). Then, send two updates simultaneously to the same field.
- **Expected Outcome**: Both updates succeed safely when targeting different fields. When targeting the same field, the most recently finished update is preserved.

### 1.9 Full Meeting Workflow Lifecycle
- **File**: `backend/tests/test_meeting_workflow_lifecycle.py`
- **Preconditions**: A student has enough wallet balance; the expert is available.
- **Test Description**: The student books a slot, extends the meeting, and then cancels or completes it.
- **Expected Outcome**: Booking deducts the base cost. Meeting extensions deduct extra costs. Cancellations refund the base cost accurately, while extension costs remain non-refundable.

### 1.10 Meeting Error Handling
- **Files**: `backend/tests/test_meeting_workflow_lifecycle.py`, `backend/tests/test_meeting_feedback_workflow.py`
- **Preconditions**: Intentional errors are made during the meeting process.
- **Test Description**: Attempt to book with a low balance, extend a meeting without permission, overlap schedules, or review a meeting that wasn't completed.
- **Expected Outcome**: Bookings fail for low balance. Non-students cannot extend meetings. Schedule conflicts block extensions. Feedback is rejected for uncompleted meetings.

### 1.11 Meeting Concurrency Safety
- **File**: `backend/tests/test_meeting_workflow_concurrency.py`
- **Preconditions**: Multiple students try to book the same expert at the exact same moment.
- **Test Description**: Two students book the exact same time slot simultaneously.
- **Expected Outcome**: Only one booking succeeds. The other booking is rejected, and wallet balances stay accurate.

### 1.12 Missing Expert Route Validation
- **Files**: `backend/tests/test_expert_routes_errors.py`, `backend/tests/test_expert_analytics_route_access.py`
- **Preconditions**: An expert ID that does not exist in the database is used.
- **Test Description**: Attempt to call the expert update route and the expert analytics route with the fake ID.
- **Expected Outcome**: Both routes explicitly return a 404 "Not Found" error instead of crashing.

---

## 2. Frontend Manual Tests (To Be Tested Manually)

These tests must be verified visually on the user interface.

### 2.1 Dashboard KPI Viewing
- **Preconditions**: The expert has followers, engagement, completed sessions, and earnings.
- **Test Description**: Open the "Expert Dashboard" page.
- **Expected Outcome**: The dashboard shows all main sections clearly: Total Followers, Total Engagement, Sessions Completed, and Total Earnings.

### 2.2 Dashboard KPI Live Updates
- **Preconditions**: An expert opens their dashboard.
- **Test Description**: From a separate account, follow the expert profile or complete one of their meetings.
- **Expected Outcome**: `Total Followers` goes up. `Sessions Completed` increments correctly when a meeting ends.

### 2.3 Earnings Breakdown Details
- **Preconditions**: The expert has multiple paid sessions across the month.
- **Test Description**: Scroll to the "Earnings Breakdown" component on the page.
- **Expected Outcome**: A monthly chart shows. The session list is limited to 10 rows maximum, showing an "overflow" button if there are more.

### 2.4 Upcoming Meetings Card
- **Preconditions**: The expert has at least four scheduled upcoming meetings.
- **Test Description**: Look at the "Upcoming Meetings" preview on the dashboard.
- **Expected Outcome**: Only the nearest 3 meetings appear. Clicking "View all upcoming" takes the user to the main meetings page. Clicking "Join" opens the right meeting URL.

### 2.5 Meeting Settings Save Action ("Accept New Bookings")
- **Preconditions**: The expert is on their private dashboard.
- **Test Description**: Change the session duration to "1 minute (test mode)", change the session price, turn off "Accept new bookings", and click save.
- **Expected Outcome**: A success notification shows up. The settings remain perfectly accurate after refreshing the web page.

### 2.6 Quick Schedule Setup Errors
- **Preconditions**: Quick Schedule Setup tab is open.
- **Test Description**: Create overlapping time slots, or create a slot where the start time is after the end time, then try to apply.
- **Expected Outcome**: The system blocks the changes immediately and shows a red error message. The invalid availability is not applied.

### 2.7 Advanced Schedule Override & Recovery
- **Preconditions**: A basic schedule is active for Monday through Friday.
- **Test Description**: Add a unique time gap for Wednesday, then intentionally send an invalid payload. After it fails, fix the slots to be valid and save again.
- **Expected Outcome**: The failed save displays an error and does not corrupt existing data. The correct save updates Wednesday's custom times, while other days keep the original schedule.

### 2.8 Content Tabs Switching & Edge Cases
- **Preconditions**: The expert has many posts, no videos, and some blogs.
- **Test Description**: Rapidly click between the Posts, Videos, and Blogs tabs. Scroll down to trigger pagination for Posts.
- **Expected Outcome**: The screen does not freeze. The Videos tab shows a clear "Empty State" message. The Posts tab correctly loads the next page of content when scrolling. 

### 2.9 Single Upload Action for Empty Video Tab
- **Preconditions**: The expert has no videos.
- **Test Description**: Click on the Videos management tab.
- **Expected Outcome**: Only one clear "Upload" button is shown in the empty state (no confusing double buttons).

### 2.10 Social Links Persistence & Fallbacks
- **Preconditions**: The expert opens the Edit Profile tool.
- **Test Description**: Add a standard social link, remove an old one, and type an unknown website name (like a custom private blog). Refresh the page after saving.
- **Expected Outcome**: Changes save without errors and survive the page refresh. Custom unknown websites use a simple fallback default link icon.

### 2.11 Public vs Private View Toggle
- **Preconditions**: The expert opens their own profile.
- **Test Description**: Click the "Public View" toggle button to see how students view the profile, then switch back to private.
- **Expected Outcome**: Management controls disappear and the owner lands on the private dashboard primarily. In Public mode, normal user actions like "Connect" or "Book a Meeting" appear instead. 

### 2.12 Unauthorized Dashboard Access
- **Preconditions**: The browser is logged out, or a normal student account is logged in.
- **Test Description**: Try navigating straight to an expert's private dashboard URL.
- **Expected Outcome**: Logged-out users get a login prompt. Normal students are simply shown the public profile instead of private controls.

### 2.13 Public Page Display Behaviors
- **Preconditions**: A potential student opens a public expert profile.
- **Test Description**: View the booking section of the profile. Refresh the page repeatedly.
- **Expected Outcome**: The profile correctly states the expert's configured session duration (e.g., "60 minute session").

### 2.14 Anonymous View Tracking & Stored Events
- **Preconditions**: An expert profile is public.
- **Test Description**: Visit the public profile while logged out. Visit again from a different incognito window.
- **Expected Outcome**: The backend successfully tracks the anonymous view. Two separate view events are stored safely in the database for the expert. 

### 2.15 Unauthorized Video List Failure
- **Preconditions**: A logged-out user tries to access private video APIs directly.
- **Test Description**: Trigger a request for private expert videos without an authentication token.
- **Expected Outcome**: The API rejects it safely with a 401 error, and the UI handles it gracefully by showing an empty list instead of a harsh crash.

### 2.16 Accessibility & Browser Smoke Behaviors
- **Preconditions**: The user relies on a keyboard.
- **Test Description**: Navigate through the expert dashboard tabs and settings using only the `Tab`, `Arrow`, and `Enter` keys.
- **Expected Outcome**: Focus rings appear clearly around active elements. The user can successfully switch tabs and hit 'Save' buttons.

### 2.17 Mobile Sidebar Behavior
- **Preconditions**: The app is viewed on a mobile phone screen size.
- **Test Description**: Open the left navigation sidebar menu, then tap the dark background area or tap a menu link.
- **Expected Outcome**: The sidebar menu closes itself automatically.

### 2.18 Active Sidebar Highlighting
- **Preconditions**: The expert is looking at the Expert Dashboard.
- **Test Description**: Look at the left navigation sidebar.
- **Expected Outcome**: "Expert Dashboard" is highlighted. "Experts" (the directory link) is not highlighted at the same time.

### 2.19 Multiple Save Clicks Handling
- **Preconditions**: The expert makes a profile change.
- **Test Description**: Rapidly click the "Save" button 5 times in a row.
- **Expected Outcome**: The system ignores the duplicate clicks while the first save is processing, preventing spam requests.

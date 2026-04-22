# Meetings Test Plan

This document outlines the testing scope for the Meetings subsystem. It is divided into automated backend tests (which are already robustly implemented) and manual frontend tests (which must be verified by hand in the browser).

## 1. Backend Automated Tests (Implemented)

These tests run automatically against the server.

### 1.1 Past Booking Rejection and Exact-Now Acceptance
- **File**: `backend/tests/test_meeting_route_workflows.py`
- **Preconditions**: A student attempts to book a meeting.
- **Test Description**: Try booking a time slot in the past. Try booking an instant time slot starting exactly right now.
- **Expected Outcome**: Bookings in the past are rejected correctly. Exact-now bookings are fully accepted.

### 1.2 Token Time Gating and Admin Access
- **File**: `backend/tests/test_meeting_route_workflows.py`
- **Preconditions**: A scheduled meeting exists.
- **Test Description**: Request a join token way before the start time, and then exactly 10 minutes before. Try joining the meeting as an admin user.
- **Expected Outcome**: Token generation is blocked until exactly 10 minutes before the start time. Admins are allowed to join any meeting anytime.

### 1.3 Booking, Extension, and Cancellation Flawless Execution
- **File**: `backend/tests/test_meeting_workflow_lifecycle.py`
- **Preconditions**: A student has enough wallet balance; the slot is free.
- **Test Description**: Book a slot, successfully extend it with more time, and then cancel the meeting.
- **Expected Outcome**: The user's wallet is correctly deducted for the origin booking and the exact extension cost. Base amounts are refunded safely on cancellation, but extension costs remain non-refundable.

### 1.4 Invalid Meeting Manipulations Blocked
- **File**: `backend/tests/test_meeting_workflow_lifecycle.py`
- **Preconditions**: Intentional incorrect actions are taken.
- **Test Description**: Attempt to extend a meeting as someone other than the student. Attempt to cancel a meeting as an unrelated person. Attempt to cancel an already completed meeting.
- **Expected Outcome**: The system strongly rejects non-student extensions, entirely rejects unrelated interference, safely catches completed-cancel rejections, and prevents double cancellations.

### 1.5 Safety Against Schedule Conflicts & Balances
- **File**: `backend/tests/test_meeting_workflow_lifecycle.py`
- **Preconditions**: A student is interacting with an expert's schedule.
- **Test Description**: Attempt to book with an insufficient wallet balance. Attempt to extend a meeting when it creates a schedule overlap.
- **Expected Outcome**: Both scenarios fail safely. The wallet error is precise, and schedule conflicts block extensions immediately.

### 1.6 Feedback System Validation
- **File**: `backend/tests/test_meeting_feedback_workflow.py`
- **Preconditions**: A meeting is completed.
- **Test Description**: A student submits feedback on a completed meeting, flags it as anonymous, and attempts to submit feedback a second time.
- **Expected Outcome**: Successful feedback is written safely. Anonymous flags hide the identity accurately on the public profile. Only students can review their completed meetings, and duplicate feedback is outright rejected.

### 1.7 Race Condition Protection (Same-Slot Race)
- **File**: `backend/tests/test_meeting_workflow_concurrency.py`
- **Preconditions**: Two students try to book the exact same slot.
- **Test Description**: Run both booking transactions simultaneously.
- **Expected Outcome**: Only one student succeeds in getting the slot. The other receives a clean booked-slot rejection, meaning the database has zero corrupted wallet deductions.

### 1.8 Mass Parallel Booking Smoke
- **File**: `backend/tests/test_meeting_workflow_concurrency.py`
- **Preconditions**: Multiple students book entirely distinct slots or different experts.
- **Test Description**: Run all standard bookings perfectly parallel at identical timestamps.
- **Expected Outcome**: All valid original bookings succeed simultaneously without any hanging queries or false rejections.

### 1.9 Route Validation Edge Cases (Remaining Gaps)
- **Files**: `backend/tests/test_meeting_remaining_workflows.py` (planned/existing)
- **Preconditions**: Edge case requests are fired.
- **Test Description**: Try joining malformed room slugs, looking up missing experts, getting a missing meeting ID, and booking entirely unavailable experts.
- **Expected Outcome**: Route validation immediately handles the faults and explicitly drops a 404/400.

---

## 2. Frontend Manual Tests (To Be Tested Manually)

These tests must be verified visually on the user interface.

### 2.1 View Available Slots
- **Preconditions**: An expert has availability mapped out correctly.
- **Test Description**: A student views the expert's slot selection for a specific date.
- **Expected Outcome**: Future available slots are correctly populated on screen. Past slots are heavily hidden. Unavailable days simply show no slots.

### 2.2 Book Meeting Feedback
- **Preconditions**: Student has correct balance and taps an open slot.
- **Test Description**: The student executes the visual booking.
- **Expected Outcome**: A clear success prompt shows up. Wallet balance quickly visually updates. The meeting correctly moves to their "Upcoming" tab.

### 2.3 Join Meeting Button Appearance
- **Preconditions**: The student approaches the start time of the meeting.
- **Test Description**: Observe the meeting dashboard card prior to and at the 10-minute countdown.
- **Expected Outcome**: The active "Join" button stays hidden/disabled until strictly 10 minutes before start.

### 2.4 Extend Meeting UI Prompt
- **Preconditions**: A meeting is actively currently running.
- **Test Description**: The student chooses the 'Extend' option and confirms payment visually during the stream.
- **Expected Outcome**: A clear confirmation dialog reflects the exact deducted extension cost cleanly.

### 2.5 Complete and Rate Modal
- **Preconditions**: The meeting concludes.
- **Test Description**: The student triggers completion on their meeting list interface.
- **Expected Outcome**: A clean review/rating modal appears allowing text and star validation. It only enables on completed tabs.

### 2.6 Refund Transparency on Cancel
- **Preconditions**: An active meeting is awaiting taking place.
- **Test Description**: The student initiates visually clicking "Cancel".
- **Expected Outcome**: The interface accurately warns them of any non-refundable clauses strictly showing they recover base cost.

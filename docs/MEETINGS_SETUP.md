# Video Meeting Integration — JaaS (8x8.vc)

## Overview

AlumNiti uses **Jitsi as a Service (JaaS)** by 8x8 (`8x8.vc`) for video sessions between students and experts.

| Property | Value |
|---|---|
| Provider | JaaS — `8x8.vc` |
| Auth | RS256 JWT signed with a private key |
| Expert role | `moderator: "true"` via JWT claim |
| Student role | `member` via JWT claim |
| Room security | UUID slug per booking, JWT-gated |
| Concurrent meetings | Unlimited — each booking has its own room |

---

## Credentials

Stored in `backend/.env` and loaded via `app/config.py`:

```
JAAS_APP_ID=vpaas-magic-cookie-<your-app-id>
JAAS_KEY_ID=vpaas-magic-cookie-<your-app-id>/<key-id>
```

Private key at: `backend/app/jaas_private.key` (RS256 PEM format).

> **Admin Console setting:** In the [8x8 Admin Console](https://jaas.8x8.vc), make sure  
> **"A moderator is required to start a meeting"** is **OFF** — otherwise students get a  
> lobby screen waiting for the expert even with a valid JWT.

---

## Architecture

```
Student/Expert clicks "Join Meeting"
          ↓
Frontend → GET /api/meetings/{id}/token   (AlumNiti auth JWT in header)
          ↓
Backend:
  1. Verifies AlumNiti session token
  2. Confirms caller is student or expert for this meeting
  3. Enforces 10-min time gate
  4. Generates or retrieves UUID room slug (stored in DB)
  5. Signs a JaaS RS256 JWT with moderator/member role + exp = meeting.endTime
  6. Returns { roomName, jwt, userName, isOwner, endTime, extensionCost30min, walletBalance }
          ↓
Frontend loads https://8x8.vc/external_api.js
Frontend creates JitsiMeetExternalAPI("8x8.vc", { roomName, jwt, userInfo })
          ↓
JaaS validates JWT server-side → user enters room with correct role
```

---

## JWT Payload

```json
{
  "iss": "chat",
  "aud": "jitsi",
  "iat": <now>,
  "nbf": <now - 10s>,
  "exp": <meeting.endTime as unix timestamp>,
  "sub": "<JAAS_APP_ID>",
  "context": {
    "user": {
      "name": "John Doe",
      "affiliation": "owner",        // "owner" for expert, "member" for student
      "moderator": "true"            // "true" for expert, "false" for student
    },
    "features": {
      "livestreaming": "false",
      "recording": "false",
      "transcription": "false",
      "outbound-call": "false"
    }
  },
  "room": "*"
}
```

Header: `{ "kid": "<JAAS_KEY_ID>" }`

---

## All Flows Covered

### 1. Expert Sets Availability

**Where:** Expert dashboard → Availability Settings tab  
**Files:** `frontend/components/experts/detail/availability-settings.tsx`, `backend/routes/expert.py` (PUT), `backend/managers/expert.py → update_expert()`

- Expert toggles each day ON/OFF
- Adds time windows (e.g., Mon 09:00–17:00, 19:00–21:00)
- Multiple windows per day supported
- `endTime` is bounded to max 23:59 (UI prevents midnight trap)
- Saved as `availability: { monday: { isAvailable, slots: [{startTime, endTime}] }, ... }` on the expert document

---

### 2. Student Browses and Books a Session

**Where:** Expert profile page  
**Files:** `frontend/components/experts/detail/booking-calendar.tsx`, `backend/routes/meeting.py`, `backend/managers/meeting.py → book_meeting()`

Step-by-step:

1. Calendar shows current month; highlighted dates = days with at least one free slot (`GET /api/experts/{id}/availability?year=&month=`)
2. Student clicks a date → `GET /api/experts/{id}/slots?date=YYYY-MM-DD` returns available time slots
3. Slot generation logic (`meeting.py → get_available_slots()`):
   - Reads expert's `availability` config for that weekday
   - Splits each window into N slots of `sessionDurationMinutes` length
   - Filters out already-booked times and past times
   - Handles midnight wraparound (e.g. `23:00 → 00:00` is treated as end-of-day)
4. Student selects a slot and confirms booking
5. Backend (`book_meeting()`):
   - Conflict check: rejects if another booking already exists at that time
   - Wallet check: rejects if `user.wallet < meetingCost`
   - Deducts `meetingCost` coins from student wallet (`$inc wallet -cost`)
   - Creates meeting document with `status: "scheduled"`, `startTime`, `endTime`, `expertId`, `userId`

---

### 3. Joining a Meeting

**Where:** `/meeting/{id}` page  
**Files:** `frontend/src/app/meeting/[id]/page.tsx`, `backend/routes/meeting.py → get_meeting_token()`

1. Page calls `GET /api/meetings/{id}/token` with AlumNiti Bearer token
2. Backend time-gate: rejects with 400 if > 10 minutes before start
3. Backend signs a JaaS JWT (RS256) with:
   - `moderator: "true"` for expert, `"false"` for student
   - `exp` set to meeting `endTime` — token expires when session should end
4. Frontend receives `{ roomName, jwt, userName, isOwner, endTime, extensionCost30min, walletBalance }`
5. `external_api.js` is dynamically loaded from `https://8x8.vc/external_api.js`
6. `new JitsiMeetExternalAPI("8x8.vc", { roomName, jwt, userInfo })` initialises the video call
7. JaaS validates the JWT server-side; expert enters as moderator (mute/kick controls), student as participant

---

### 4. Session HUD (Student Only)

Visible for the student at all times during the call:

- **Countdown timer pill** (top-right): shows `MM:SS` remaining
  - Gray background → >5 min left
  - Orange → ≤5 min
  - Red + pulse → ≤1 min
  - Shows `"Session ended"` at 0
- **Wallet balance pill** (top-right, below timer): shows current coin balance with a coin icon
- **Compact "Extend session" button** (top-right, visible when >5 min remaining): opens the extension panel on demand
- **Urgent extension panel** (bottom-centre): auto-appears when ≤5 min remain; also appears when compact button is clicked

Expert sees none of this HUD — their session has no time pressure UI.

---

### 5. Extending a Session

**Files:** `backend/routes/meeting.py → POST /meetings/{id}/extend`, `backend/managers/meeting.py → extend_meeting()`

1. Student sees the cost preview: `meetingCost / sessionDurationMinutes × 30 coins`
2. Student clicks "Confirm" in the extend panel
3. Frontend calls `POST /api/meetings/{id}/extend` with `{ durationMinutes: 30 }`
4. Backend (`extend_meeting()`):
   - Conflict check: looks for any other meeting for this expert in the proposed extended window
   - Wallet check: rejects if insufficient coins
   - Deducts extension cost from student wallet
   - Updates `endTime` on meeting document (`+30 min`)
   - Returns `{ success, newEndTime, newWalletBalance }`
5. Frontend:
   - Updates countdown timer to new `endTime` (no Jitsi re-init needed — JWT exp does not kick the user out mid-call on JaaS)
   - Updates wallet pill with new balance
   - Resets the extension panel

---

### 6. Cancelling a Meeting

**Files:** `backend/routes/meeting.py → POST /meetings/{id}/cancel`, `backend/managers/meeting.py → cancel_meeting()`

- Only the student or the expert can cancel
- Sets `status: "cancelled"` on meeting document
- Refunds the full `meetingCost` coins back to the student's wallet
- Cancelled meetings are excluded from slot conflict checks

---

### 7. Listing Meetings

`GET /api/meetings/my` → returns all meetings for the logged-in user (as student or expert), with optional `?status=scheduled|completed|cancelled` filter.

---

## Room Naming

Room slug is generated on first `/token` call if not already set:

```
alumniti-<12 hex chars>   →   e.g.  alumniti-9ffa686937c1
```

Full JaaS room name passed to External API: `<JAAS_APP_ID>/alumniti-<slug>`

Stored as `jitsiRoomName` on the meeting document in MongoDB. The UUID makes it impossible to guess — only authenticated meeting participants receive it.

---

## Wallet System

| Event | Effect on wallet |
|---|---|
| Account creation | +200 coins (default, `UserBase.wallet = 200`) |
| Book a session | `-meetingCost` coins |
| Cancel a session | `+meetingCost` refund |
| Extend by 30 min | `-extensionCost30min` coins |
| App startup | `initialize_wallet_for_existing_users()` backfills users without wallet field |

Extension cost formula:
```
extensionCost30min = floor(meetingCost / sessionDurationMinutes × 30)
```

---

## Session Duration Options

Experts set `sessionDurationMinutes` on their profile: **30, 45, 60, 90, 120 minutes**.  
This controls:
- How slots are split in the booking calendar
- The `endTime` of a booked meeting (= `startTime + sessionDurationMinutes`)
- The `exp` claim in the JaaS JWT
- The extension cost calculation

---

## File Reference

| File | Purpose |
|---|---|
| `backend/app/routes/meeting.py` | All meeting API endpoints |
| `backend/app/managers/meeting.py` | Slot logic, booking, cancel, extend |
| `backend/app/managers/expert.py` | Expert profile update (saves availability) |
| `backend/app/models/expert.py` | `ExpertAvailability`, `DayAvailability`, `TimeSlot` models |
| `backend/app/models/meeting.py` | `Meeting`, `MeetingStatus` models |
| `backend/app/jaas_private.key` | RS256 private key for JWT signing |
| `backend/app/config.py` | `JAAS_APP_ID`, `JAAS_KEY_ID` settings |
| `frontend/src/app/meeting/[id]/page.tsx` | Video call page (HUD, extend panel, JaaS init) |
| `frontend/src/components/experts/detail/booking-calendar.tsx` | Student booking UI |
| `frontend/src/components/experts/detail/availability-settings.tsx` | Expert availability editor |

---

## What Can Still Be Implemented

### High Priority
| Feature | Description |
|---|---|
| **Email/SMS reminders** | Notify student + expert 15 min before meeting start using a background job (e.g. APScheduler or Celery) |
| **In-app notifications** | Push a socket notification to both parties when a meeting is booked or cancelled |
| **Coin top-up / purchase** | Allow students to buy more coins via a payment gateway (Razorpay/Stripe) |
| **Expert earnings tracker** | Show experts how many coins their sessions have generated; payout flow |
| **Meeting recording** | Enable JaaS recording feature (requires JaaS plan upgrade); store recording URL on meeting doc |

### Medium Priority
| Feature | Description |
|---|---|
| **Recurring bookings** | Student books a weekly slot with the same expert for N weeks |
| **Buffer time between slots** | Expert sets a 10/15 min gap between sessions so back-to-back isn't possible |
| **No-show / late-join detection** | If expert doesn't join within X min, auto-refund student and flag the expert |
| **Student session history** | Paginated list of past sessions with expert name, duration, and coins spent |
| **Expert rating post-session** | Prompt student to rate the session after `videoConferenceLeft` fires |
| **Admin coin grants** | Admin dashboard action to credit coins to a specific user |

### Nice to Have
| Feature | Description |
|---|---|
| **Waiting room / lobby** | Show a branded pre-join screen ("Your session starts in 3 min") before Jitsi loads |
| **Timezone-aware booking** | Detect student/expert timezone and show slots in local time |
| **Calendar export** | Add booked session to Google Calendar / `.ics` download |
| **Screen share only mode** | Expert can share screen without video for portfolio/code reviews |
| **Chat transcript** | Save the Jitsi in-call chat to the meeting document after session ends |


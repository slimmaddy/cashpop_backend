# Friend Request API Testing Plan

## Overview
This document provides a simple manual testing plan for the Friend Request API functionality using Postman. The plan covers sending friend requests, retrieving received requests, accepting/rejecting requests, and error handling scenarios.

## Database Setup

### Prerequisites
1. Ensure the database is running and accessible
2. Create test users for friend request scenarios
3. Set up various relationship states for comprehensive testing

### Test Data Setup
Run the following SQL to create test users and scenarios:

```sql
-- Create test users for friend request testing
INSERT INTO users (id, email, username, name, avatar, provider) VALUES
-- Main test user (sender/receiver)
('a342fd9b-0da5-43f2-8063-ae74bdf6059a', 'requester@example.com', 'requester', 'Request Test User', 'https://i.pravatar.cc/150?img=60', 'local'),

-- Target users for sending requests
('b342fd9b-0da5-43f2-8063-ae74bdf6059b', 'target1@example.com', 'target1', 'Target User 1', 'https://i.pravatar.cc/150?img=61', 'local'),
('c342fd9b-0da5-43f2-8063-ae74bdf6059c', 'target2@example.com', 'target2', 'Target User 2', 'https://i.pravatar.cc/150?img=62', 'local'),
('d342fd9b-0da5-43f2-8063-ae74bdf6059d', 'target3@example.com', 'target3', 'Target User 3', 'https://i.pravatar.cc/150?img=63', 'local'),

-- Users who will send requests to main user
('e342fd9b-0da5-43f2-8063-ae74bdf6059e', 'sender1@example.com', 'sender1', 'Sender User 1', 'https://i.pravatar.cc/150?img=64', 'local'),
('f342fd9b-0da5-43f2-8063-ae74bdf6059f', 'sender2@example.com', 'sender2', 'Sender User 2', 'https://i.pravatar.cc/150?img=65', 'local'),

-- Already friends user
('1342fd9b-0da5-43f2-8063-ae74bdf60591', 'existing.friend@example.com', 'existing_friend', 'Existing Friend', 'https://i.pravatar.cc/150?img=66', 'local')
ON CONFLICT (id) DO NOTHING;

-- Create existing friendship (bidirectional)
INSERT INTO relationships (id, user_email, friend_email, status, initiated_by, accepted_at, created_at, updated_at) VALUES
(gen_random_uuid(), 'requester@example.com', 'existing.friend@example.com', 'accepted', 'requester@example.com', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'existing.friend@example.com', 'requester@example.com', 'accepted', 'requester@example.com', NOW(), NOW(), NOW())
ON CONFLICT (user_email, friend_email) DO NOTHING;

-- Create pending requests TO main user (for testing received requests)
-- Note: The API looks for status='pending' where friend_email=current_user
INSERT INTO relationships (id, user_email, friend_email, status, initiated_by, message, created_at, updated_at) VALUES
-- These are the requests that will show up in "received requests" API
(gen_random_uuid(), 'sender1@example.com', 'requester@example.com', 'pending', 'sender1@example.com', 'Hi! Let''s be friends!', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'sender2@example.com', 'requester@example.com', 'pending', 'sender2@example.com', 'Would you like to connect?', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
ON CONFLICT (user_email, friend_email) DO NOTHING;

-- Create rejected relationship (for testing duplicate prevention)
INSERT INTO relationships (id, user_email, friend_email, status, initiated_by, created_at, updated_at) VALUES
(gen_random_uuid(), 'requester@example.com', 'target3@example.com', 'rejected', 'requester@example.com', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),
(gen_random_uuid(), 'target3@example.com', 'requester@example.com', 'rejected', 'requester@example.com', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week')
ON CONFLICT (user_email, friend_email) DO NOTHING;
```

## Authentication Setup

### Step 1: Get JWT Token for Main Test User
**Endpoint:** `POST /auth/login`
**Request Body:**
```json
{
  "username": "requester@example.com",
  "password": "your_password_here"
}
```

**Expected Response:**
```json
{
  "user": {
    "id": "a342fd9b-0da5-43f2-8063-ae74bdf6059a",
    "username": "requester@example.com",
    "email": "requester@example.com",
    "name": "Request Test User"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-string"
}
```

## Test Cases

### Test Case 1: Send Friend Request Successfully
**Purpose:** Verify sending a friend request to a valid user

**Endpoint:** `POST /social/friends/request`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "friendEmail": "target1@example.com",
  "message": "Hi! I'd like to connect with you on CashPop."
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Lời mời kết bạn đã được gửi thành công",
  "relationship": {
    "id": "relationship-uuid",
    "friend": {
      "id": "b342fd9b-0da5-43f2-8063-ae74bdf6059b",
      "email": "target1@example.com",
      "username": "target1",
      "name": "Target User 1",
      "avatar": "https://i.pravatar.cc/150?img=61"
    },
    "status": "pending",
    "initiatedBy": "requester@example.com",
    "message": "Hi! I'd like to connect with you on CashPop.",
    "createdAt": "2025-01-11T10:30:00.000Z",
    "acceptedAt": null
  }
}
```

**Verification Points:**
- Response status: 201
- `success` is true
- `relationship` object contains complete data
- `status` is "pending"
- `initiatedBy` matches sender email

### Test Case 2: Send Friend Request Without Message
**Purpose:** Verify sending a friend request without optional message

**Endpoint:** `POST /social/friends/request`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "friendEmail": "target2@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Lời mời kết bạn đã được gửi thành công",
  "relationship": {
    "id": "relationship-uuid",
    "friend": {
      "id": "c342fd9b-0da5-43f2-8063-ae74bdf6059c",
      "email": "target2@example.com",
      "username": "target2",
      "name": "Target User 2",
      "avatar": "https://i.pravatar.cc/150?img=62"
    },
    "status": "pending",
    "initiatedBy": "requester@example.com",
    "message": null,
    "createdAt": "2025-01-11T10:35:00.000Z",
    "acceptedAt": null
  }
}
```

**Verification Points:**
- Response status: 201
- `success` is true
- `message` field is null or empty
- Request processed successfully without message

### Test Case 3: Send Friend Request to Non-Existent User
**Purpose:** Verify error handling for invalid email addresses

**Endpoint:** `POST /social/friends/request`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "friendEmail": "nonexistent@example.com",
  "message": "Hello!"
}
```

**Expected Response:**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy người dùng với email này"
}
```

**Verification Points:**
- Response status: 404
- Clear error message about user not found

### Test Case 4: Send Friend Request to Self
**Purpose:** Verify validation prevents self-friend requests

**Endpoint:** `POST /social/friends/request`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "friendEmail": "requester@example.com",
  "message": "I want to be my own friend!"
}
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": "Không thể gửi lời mời kết bạn cho chính mình"
}
```

**Verification Points:**
- Response status: 400
- Clear validation error message

### Test Case 5: Send Friend Request to Existing Friend 
**Purpose:** Verify duplicate prevention for existing friendships

**Endpoint:** `POST /social/friends/request`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "friendEmail": "existing.friend@example.com",
  "message": "Let's be friends again!"
}
```

**Expected Response:**
```json
{
  "statusCode": 409,
  "message": "Bạn đã là bạn bè với người này rồi"
}
```

**Verification Points:**
- Response status: 409
- Clear conflict message about existing friendship

### Test Case 5a: Send Duplicate Friend Request
**Purpose:** Verify duplicate prevention for pending requests

**Endpoint:** `POST /social/friends/request`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "friendEmail": "target1@example.com",
  "message": "Sending again!"
}
```
**Note:** This assumes you already sent a request to target1@example.com in Test Case 1

**Expected Response:**
```json
{
  "statusCode": 409,
  "message": "Lời mời kết bạn đã được gửi trước đó"
}
```

**Verification Points:**
- Response status: 409
- Clear conflict message about duplicate request

### Test Case 6: Get Received Friend Requests
**Purpose:** Verify retrieving pending friend requests

**Endpoint:** `GET /social/friends/requests/received`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "requests": [
    {
      "id": "relationship-uuid-1",
      "sender": {
        "id": "f342fd9b-0da5-43f2-8063-ae74bdf6059f",
        "email": "sender2@example.com",
        "username": "sender2",
        "name": "Sender User 2",
        "avatar": "https://i.pravatar.cc/150?img=65"
      },
      "message": "Would you like to connect?",
      "createdAt": "2025-01-11T08:30:00.000Z",
      "canAccept": true,
      "canReject": true
    },
    {
      "id": "relationship-uuid-2",
      "sender": {
        "id": "e342fd9b-0da5-43f2-8063-ae74bdf6059e",
        "email": "sender1@example.com",
        "username": "sender1",
        "name": "Sender User 1",
        "avatar": "https://i.pravatar.cc/150?img=64"
      },
      "message": "Hi! Let's be friends!",
      "createdAt": "2025-01-10T10:30:00.000Z",
      "canAccept": true,
      "canReject": true
    }
  ],
  "total": 2
}
```

**Verification Points:**
- Response status: 200
- `requests` array contains requests where current user is the receiver (friendEmail = current user)
- Requests ordered by most recent first (createdAt DESC)
- Each request has sender info and action flags
- `total` count matches array length
- Only shows relationships with status = 'pending' where friendEmail = current user
- API queries: `WHERE friendEmail = userEmail AND status = 'pending'`

### Test Case 7: Get Received Friend Requests with Pagination
**Purpose:** Verify pagination works for friend requests

**Endpoint:** `GET /social/friends/requests/received?page=1&limit=1`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "requests": [
    {
      "id": "relationship-uuid-1",
      "sender": {
        "id": "f342fd9b-0da5-43f2-8063-ae74bdf6059f",
        "email": "sender2@example.com",
        "username": "sender2",
        "name": "Sender User 2",
        "avatar": "https://i.pravatar.cc/150?img=65"
      },
      "message": "Would you like to connect?",
      "createdAt": "2025-01-11T08:30:00.000Z",
      "canAccept": true,
      "canReject": true
    }
  ],
  "total": 2
}
```

**Verification Points:**
- Response status: 200
- Only 1 request returned (limit=1)
- `total` still shows complete count (2)
- Most recent request returned first

### Test Case 8: Accept Friend Request
**Purpose:** Verify accepting a pending friend request

**Endpoint:** `POST /social/friends/requests/{requestId}/accept`
**Headers:**
```
Authorization: Bearer {your_access_token}
```
**Note:** Replace `{requestId}` with actual ID from previous test

**Expected Response:**
```json
{
  "success": true,
  "message": "Đã chấp nhận lời mời kết bạn",
  "relationship": {
    "id": "relationship-uuid",
    "friend": {
      "id": "e342fd9b-0da5-43f2-8063-ae74bdf6059e",
      "email": "sender1@example.com",
      "username": "sender1",
      "name": "Sender User 1",
      "avatar": "https://i.pravatar.cc/150?img=64"
    },
    "status": "accepted",
    "initiatedBy": "sender1@example.com",
    "message": "Hi! Let's be friends!",
    "createdAt": "2025-01-10T10:30:00.000Z",
    "acceptedAt": "2025-01-11T10:45:00.000Z"
  }
}
```

**Verification Points:**
- Response status: 200
- `success` is true
- `status` changed to "accepted"
- `acceptedAt` timestamp is set
- Bidirectional friendship created (both relationships updated to 'accepted')
- No `requestId` field in response (not included in actual implementation)

### Test Case 9: Reject Friend Request
**Purpose:** Verify rejecting a pending friend request

**Endpoint:** `POST /social/friends/requests/{requestId}/reject`
**Headers:**
```
Authorization: Bearer {your_access_token}
```
**Note:** Replace `{requestId}` with actual ID from received requests

**Expected Response:**
```json
{
  "success": true,
  "message": "Đã từ chối lời mời kết bạn",
  "requestId": "relationship-uuid"
}
```

**Verification Points:**
- Response status: 200
- `success` is true
- Only returns `requestId` (no relationship object in reject response)
- Both bidirectional relationships updated to 'rejected' status
- No friendship created

### Test Case 10: Accept Non-Existent Request
**Purpose:** Verify error handling for invalid request IDs

**Endpoint:** `POST /social/friends/requests/invalid-uuid/accept`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy lời mời kết bạn hoặc lời mời đã được xử lý"
}
```

**Verification Points:**
- Response status: 404
- Clear error message about request not found

### Test Case 11: Invalid Email Format
**Purpose:** Verify email validation in friend requests

**Endpoint:** `POST /social/friends/request`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "friendEmail": "invalid-email-format",
  "message": "Hello!"
}
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": ["Email không hợp lệ"]
}
```

**Verification Points:**
- Response status: 400
- Email validation error message

### Test Case 12: Invalid Authentication
**Purpose:** Verify API requires valid authentication

**Endpoint:** `GET /social/friends/requests/received`
**Headers:**
```
Authorization: Bearer invalid_token
```

**Expected Response:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Verification Points:**
- Response status: 401
- Proper error message

## Validation Queries

Run these SQL queries to verify friend request operations:

```sql
-- Check pending requests TO main user (what user sees in "received requests")
SELECT 'Received Requests' as type, r.*, u.name as sender_name
FROM relationships r
JOIN users u ON r."userEmail" = u.email
WHERE r."friendEmail" = 'requester@example.com'
  AND r.status = 'pending'
ORDER BY r."createdAt" DESC;

-- Check requests SENT BY main user
SELECT 'Sent Requests' as type, r.*, u.name as target_name
FROM relationships r
JOIN users u ON r."friendEmail" = u.email
WHERE r."userEmail" = 'requester@example.com'
  AND r.status = 'pending'
ORDER BY r."createdAt" DESC;

-- Check accepted friendships (bidirectional)
SELECT 'Accepted Friends' as type, r.*, u.name as friend_name
FROM relationships r
JOIN users u ON r.friend_email = u.email
WHERE r.user_email = 'requester@example.com'
  AND r.status = 'accepted'
ORDER BY r.accepted_at DESC;

-- Check all relationships for debugging (shows bidirectional nature)
SELECT
  'All Relationships' as type,
  r.user_email,
  r.friend_email,
  r.status,
  r.initiated_by,
  r.created_at,
  r.accepted_at
FROM relationships r
WHERE r.user_email = 'requester@example.com'
   OR r.friend_email = 'requester@example.com'
ORDER BY r.created_at DESC;
```

## Troubleshooting

### Common Issues:
1. **Request not found errors:** Check if request ID is valid and still pending
2. **Duplicate request errors:** Verify no existing relationship exists
3. **User not found errors:** Ensure target user exists in database
4. **Authentication errors:** Verify JWT token is valid and not expired

### Debug Steps:
1. Verify test users exist: `SELECT * FROM users WHERE email IN ('requester@example.com', 'target1@example.com')`
2. Check relationship states: `SELECT * FROM relationships WHERE user_email = 'requester@example.com' OR friend_email = 'requester@example.com'`
3. Verify request IDs: `SELECT id, status FROM relationships WHERE friend_email = 'requester@example.com' AND status = 'pending'`

## Notes
- **Relationship Creation**: When sending a friend request, the system creates:
  - Primary relationship: Sender -> Receiver (status = 'pending')
  - Reverse relationship: Receiver -> Sender (status = 'received') - for bidirectional tracking
- **Database Schema**: Uses camelCase column names (userEmail, friendEmail, initiatedBy, acceptedAt, createdAt, updatedAt)
- **Status Values**: 'pending', 'accepted', 'rejected', 'blocked', 'received' (from RelationshipStatus enum)
- **Received Requests API**: Queries `WHERE friendEmail = userEmail AND status = 'pending'`
- **Accept/Reject**: Updates BOTH bidirectional relationships to maintain consistency
- **Duplicate Prevention**: Checks existing relationships before creating new ones
- **Request IDs**: UUIDs generated by PostgreSQL (gen_random_uuid())
- **API Responses**: Match actual service implementation (message text, field names, structure)
- **Bidirectional Updates**: Accept/reject operations update both relationship records to same status

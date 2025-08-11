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
('req-user-1', 'requester@example.com', 'requester', 'Request Test User', 'https://i.pravatar.cc/150?img=60', 'local'),

-- Target users for sending requests
('req-target-1', 'target1@example.com', 'target1', 'Target User 1', 'https://i.pravatar.cc/150?img=61', 'local'),
('req-target-2', 'target2@example.com', 'target2', 'Target User 2', 'https://i.pravatar.cc/150?img=62', 'local'),
('req-target-3', 'target3@example.com', 'target3', 'Target User 3', 'https://i.pravatar.cc/150?img=63', 'local'),

-- Users who will send requests to main user
('req-sender-1', 'sender1@example.com', 'sender1', 'Sender User 1', 'https://i.pravatar.cc/150?img=64', 'local'),
('req-sender-2', 'sender2@example.com', 'sender2', 'Sender User 2', 'https://i.pravatar.cc/150?img=65', 'local'),

-- Already friends user
('req-friend-1', 'existing.friend@example.com', 'existing_friend', 'Existing Friend', 'https://i.pravatar.cc/150?img=66', 'local')
ON CONFLICT (id) DO NOTHING;

-- Create existing friendship
INSERT INTO relationships (id, user_email, friend_email, status, initiated_by, accepted_at) VALUES 
(gen_random_uuid(), 'requester@example.com', 'existing.friend@example.com', 'accepted', 'requester@example.com', NOW())
ON CONFLICT (user_email, friend_email) DO NOTHING;

-- Create pending requests TO main user (for testing received requests)
INSERT INTO relationships (id, user_email, friend_email, status, initiated_by, message, created_at) VALUES 
(gen_random_uuid(), 'sender1@example.com', 'requester@example.com', 'pending', 'sender1@example.com', 'Hi! Let''s be friends!', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'sender2@example.com', 'requester@example.com', 'pending', 'sender2@example.com', 'Would you like to connect?', NOW() - INTERVAL '2 hours')
ON CONFLICT (user_email, friend_email) DO NOTHING;

-- Create rejected relationship (for testing duplicate prevention)
INSERT INTO relationships (id, user_email, friend_email, status, initiated_by, created_at) VALUES 
(gen_random_uuid(), 'requester@example.com', 'target3@example.com', 'rejected', 'requester@example.com', NOW() - INTERVAL '1 week')
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
    "id": "req-user-1",
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
  "message": "Gửi lời mời kết bạn thành công",
  "relationship": {
    "id": "relationship-uuid",
    "friend": {
      "id": "req-target-1",
      "email": "target1@example.com",
      "username": "target1",
      "name": "Target User 1",
      "avatar": "https://i.pravatar.cc/150?img=61"
    },
    "status": "pending",
    "initiatedBy": "requester@example.com",
    "message": "Hi! I'd like to connect with you on CashPop.",
    "createdAt": "2025-01-11T10:30:00.000Z"
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
  "message": "Gửi lời mời kết bạn thành công",
  "relationship": {
    "id": "relationship-uuid",
    "friend": {
      "id": "req-target-2",
      "email": "target2@example.com",
      "username": "target2",
      "name": "Target User 2",
      "avatar": "https://i.pravatar.cc/150?img=62"
    },
    "status": "pending",
    "initiatedBy": "requester@example.com",
    "message": null,
    "createdAt": "2025-01-11T10:35:00.000Z"
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
  "message": "Bạn đã là bạn bè với người dùng này rồi"
}
```

**Verification Points:**
- Response status: 409
- Clear conflict message about existing friendship

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
        "id": "req-sender-2",
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
        "id": "req-sender-1",
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
- `requests` array contains pending requests
- Requests ordered by most recent first
- Each request has sender info and action flags
- `total` count matches array length

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
        "id": "req-sender-2",
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
  "message": "Chấp nhận lời mời kết bạn thành công",
  "relationship": {
    "id": "relationship-uuid",
    "friend": {
      "id": "req-sender-1",
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
  },
  "requestId": "relationship-uuid"
}
```

**Verification Points:**
- Response status: 200
- `success` is true
- `status` changed to "accepted"
- `acceptedAt` timestamp is set
- Bidirectional friendship created

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
  "message": "Từ chối lời mời kết bạn thành công",
  "relationship": {
    "id": "relationship-uuid",
    "friend": {
      "id": "req-sender-2",
      "email": "sender2@example.com",
      "username": "sender2",
      "name": "Sender User 2",
      "avatar": "https://i.pravatar.cc/150?img=65"
    },
    "status": "rejected",
    "initiatedBy": "sender2@example.com",
    "message": "Would you like to connect?",
    "createdAt": "2025-01-11T08:30:00.000Z"
  },
  "requestId": "relationship-uuid"
}
```

**Verification Points:**
- Response status: 200
- `success` is true
- `status` changed to "rejected"
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
-- Check pending requests TO main user
SELECT 'Received Requests' as type, r.*, u.name as sender_name
FROM relationships r
JOIN users u ON r.user_email = u.email
WHERE r.friend_email = 'requester@example.com' 
  AND r.status = 'pending'
ORDER BY r.created_at DESC;

-- Check requests SENT BY main user
SELECT 'Sent Requests' as type, r.*, u.name as target_name
FROM relationships r
JOIN users u ON r.friend_email = u.email
WHERE r.user_email = 'requester@example.com' 
  AND r.status = 'pending'
ORDER BY r.created_at DESC;

-- Check accepted friendships
SELECT 'Accepted Friends' as type, r.*, u.name as friend_name
FROM relationships r
JOIN users u ON r.friend_email = u.email
WHERE r.user_email = 'requester@example.com' 
  AND r.status = 'accepted'
ORDER BY r.accepted_at DESC;
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
- Friend requests create unidirectional relationships initially (status = pending)
- Accepting a request creates bidirectional friendships automatically
- Rejecting a request keeps the relationship record with status = rejected
- Users cannot send multiple requests to the same person
- All friend request operations are logged for debugging
- Request IDs are UUIDs generated by the database

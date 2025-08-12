# Social Sync API Testing Plan

## Overview
This document provides a simple manual testing plan for the Social Sync API functionality using Postman. The plan covers contact synchronization from Facebook, LINE, and phone contacts, along with sync history tracking and error handling.

## Database Setup

### Prerequisites
1. Ensure the database is running and accessible
2. Create test users for sync scenarios
3. Set up mock contact data for testing

### Test Data Setup
Run the following SQL to create test users for sync scenarios:

```sql
-- Create test users for sync testing
INSERT INTO users (id, email, username, name, avatar, provider) VALUES
-- Main sync user
('a342fd9b-0da5-43f2-8063-ae74bdf60500', 'sync.test@example.com', 'sync_test', 'Sync Test User', 'https://i.pravatar.cc/150?img=50', 'local'),

-- Users that will be found in contacts (existing CashPop users)
('b342fd9b-0da5-43f2-8063-ae74bdf60501', 'alice.sync@example.com', 'alice_sync', 'Alice Sync', 'https://i.pravatar.cc/150?img=51', 'local'),
('c342fd9b-0da5-43f2-8063-ae74bdf60502', 'bob.sync@example.com', 'bob_sync', 'Bob Sync', 'https://i.pravatar.cc/150?img=52', 'local'),
('d342fd9b-0da5-43f2-8063-ae74bdf60503', 'carol.sync@example.com', 'carol_sync', 'Carol Sync', 'https://i.pravatar.cc/150?img=53', 'local'),

-- LINE-specific test users
('f342fd9b-0da5-43f2-8063-ae74bdf60505', 'alice.line@example.com', 'alice_line', 'Alice Line', 'https://i.pravatar.cc/150?img=55', 'local'),
('g342fd9b-0da5-43f2-8063-ae74bdf60506', 'bob.line@example.com', 'bob_line', 'Bob Line', 'https://i.pravatar.cc/150?img=56', 'local'),
('h342fd9b-0da5-43f2-8063-ae74bdf60507', 'carol.line@example.com', 'carol_line', 'Carol Line', 'https://i.pravatar.cc/150?img=57', 'local'),
('i342fd9b-0da5-43f2-8063-ae74bdf60508', 'david.line@example.com', 'david_line', 'David Line', 'https://i.pravatar.cc/150?img=58', 'local'),

-- User already friends with sync user
('e342fd9b-0da5-43f2-8063-ae74bdf60504', 'existing.friend@example.com', 'existing_friend', 'Existing Friend', 'https://i.pravatar.cc/150?img=54', 'local')
ON CONFLICT (id) DO NOTHING;

-- Create existing friendship
INSERT INTO relationships (id, user_email, friend_email, status, initiated_by, accepted_at) VALUES 
(gen_random_uuid(), 'sync.test@example.com', 'existing.friend@example.com', 'accepted', 'sync.test@example.com', NOW())
ON CONFLICT (user_email, friend_email) DO NOTHING;
```

## Authentication Setup

### Step 1: Get JWT Token
**Endpoint:** `POST /auth/login`
**Request Body:**
```json
{
  "username": "sync.test@example.com",
  "password": "your_password_here"
}
```

**Expected Response:**
```json
{
  "user": {
    "id": "a342fd9b-0da5-43f2-8063-ae74bdf60500",
    "username": "sync.test@example.com",
    "email": "sync.test@example.com",
    "name": "Sync Test User"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-string"
}
```

## Test Cases

### Test Case 1: Test Mock Facebook Sync (Development Mode)
**Purpose:** Verify Facebook sync works with mock data when no real token is available

**Endpoint:** `GET /social/sync/test?platform=facebook`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test sync facebook successfully",
  "result": {
    "platform": "facebook",
    "totalContacts": 5,
    "cashpopUsersFound": 3,
    "newFriendshipsCreated": 2,
    "alreadyFriends": 1,
    "errors": [],
    "details": {
      "contactsProcessed": [
        {
          "id": "mock_fb_1",
          "name": "Alice Sync",
          "email": "alice.sync@example.com",
          "platform": "facebook"
        }
      ],
      "newFriends": [
        {
          "email": "alice.sync@example.com",
          "name": "Alice Sync"
        }
      ]
    }
  }
}
```

**Verification Points:**
- Response status: 200
- `success` is true
- `totalContacts` > 0 (mock data)
- `cashpopUsersFound` shows users found in database
- `newFriendshipsCreated` shows new relationships created
- `alreadyFriends` shows existing relationships skipped

### Test Case 2: Facebook Sync with Invalid Token
**Purpose:** Verify proper error handling for invalid Facebook tokens

**Endpoint:** `POST /social/sync/contacts`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "platform": "facebook",
  "facebook": {
    "token": "invalid_facebook_token_123"
  }
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Facebook access token không hợp lệ hoặc đã hết hạn",
  "result": {
    "platform": "facebook",
    "totalContacts": 0,
    "cashpopUsersFound": 0,
    "newFriendshipsCreated": 0,
    "alreadyFriends": 0,
    "errors": ["Facebook access token không hợp lệ hoặc đã hết hạn"],
    "details": {
      "contactsProcessed": [],
      "newFriends": []
    }
  }
}
```

**Verification Points:**
- Response status: 200 (error handled gracefully)
- `success` is false
- Proper error message in `message` field
- Error details in `result.errors` array

### Test Case 3: Facebook Sync with Missing Token
**Purpose:** Verify validation for required Facebook token

**Endpoint:** `POST /social/sync/contacts`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "platform": "facebook"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Facebook access token is required",
  "result": {
    "platform": "facebook",
    "totalContacts": 0,
    "cashpopUsersFound": 0,
    "newFriendshipsCreated": 0,
    "alreadyFriends": 0,
    "errors": ["Facebook access token is required"],
    "details": {
      "contactsProcessed": [],
      "newFriends": []
    }
  }
}
```

**Verification Points:**
- Response status: 200
- `success` is false
- Clear validation error message

### Test Case 4: Test Mock LINE Sync (Development Mode)
**Purpose:** Verify LINE sync works with mock data

**Endpoint:** `GET /social/sync/test?platform=line`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test sync line successfully",
  "result": {
    "platform": "line",
    "totalContacts": 4,
    "cashpopUsersFound": 4,
    "newFriendshipsCreated": 3,
    "alreadyFriends": 1,
    "errors": [],
    "details": {
      "contactsProcessed": [
        {
          "id": "mock_line_1",
          "name": "Alice Line",
          "email": "alice.line@example.com",
          "platform": "line"
        }
      ],
      "newFriends": [
        {
          "email": "alice.line@example.com",
          "name": "Alice Line"
        }
      ]
    }
  }
}
```

**Verification Points:**
- Response status: 200
- `success` is true
- `totalContacts` > 0 (mock data)
- `cashpopUsersFound` shows users found in database
- `newFriendshipsCreated` shows new relationships created

### Test Case 4a: LINE Sync with Invalid Token
**Purpose:** Verify proper error handling for invalid LINE tokens

**Endpoint:** `POST /social/sync/contacts`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "platform": "line",
  "line": {
    "token": "invalid_line_token_123"
  }
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "LINE access token không hợp lệ hoặc đã hết hạn",
  "result": {
    "platform": "line",
    "totalContacts": 0,
    "cashpopUsersFound": 0,
    "newFriendshipsCreated": 0,
    "alreadyFriends": 0,
    "errors": ["LINE access token không hợp lệ hoặc đã hết hạn"],
    "details": {
      "contactsProcessed": [],
      "newFriends": []
    }
  }
}
```

**Verification Points:**
- Response status: 200 (error handled gracefully)
- `success` is false
- Proper error message in `message` field

### Test Case 4b: LINE Sync with Missing Token
**Purpose:** Verify validation for required LINE token

**Endpoint:** `POST /social/sync/contacts`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "platform": "line"
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "LINE access token is required",
  "result": {
    "platform": "line",
    "totalContacts": 0,
    "cashpopUsersFound": 0,
    "newFriendshipsCreated": 0,
    "alreadyFriends": 0,
    "errors": ["LINE access token is required"],
    "details": {
      "contactsProcessed": [],
      "newFriends": []
    }
  }
}
```

**Verification Points:**
- Response status: 200
- `success` is false
- Clear validation error message

### Test Case 5: Phone Contact Sync (Not Implemented)
**Purpose:** Verify proper handling of unsupported platforms

**Endpoint:** `POST /social/sync/contacts`
**Headers:**
```
Authorization: Bearer {your_access_token}
Content-Type: application/json
```
**Request Body:**
```json
{
  "platform": "contact",
  "phone": {
    "token": "phone_token_123"
  }
}
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Phone contact sync chưa được hỗ trợ",
  "result": {
    "platform": "contact",
    "totalContacts": 0,
    "cashpopUsersFound": 0,
    "newFriendshipsCreated": 0,
    "alreadyFriends": 0,
    "errors": ["Phone contact sync chưa được hỗ trợ"],
    "details": {
      "contactsProcessed": [],
      "newFriends": []
    }
  }
}
```

**Verification Points:**
- Response status: 200
- `success` is false
- Appropriate "not supported" message

### Test Case 6: Get Sync History
**Purpose:** Verify sync history tracking functionality

**Endpoint:** `GET /social/sync/history`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "history": [
    {
      "id": "history-uuid",
      "platform": "facebook",
      "syncedAt": "2025-01-11T10:30:00.000Z",
      "totalContacts": 5,
      "cashpopUsersFound": 3,
      "newFriendshipsCreated": 2,
      "success": true
    }
  ],
  "total": 1
}
```

**Verification Points:**
- Response status: 200
- History entries show previous sync attempts
- Each entry contains sync statistics
- Entries are ordered by most recent first

### Test Case 7: Invalid Authentication
**Purpose:** Verify API requires valid authentication

**Endpoint:** `GET /social/sync/test`
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

### Test Case 8: Missing Authentication
**Purpose:** Verify API requires authentication header

**Endpoint:** `GET /social/sync/test`
**Headers:** (No Authorization header)

**Expected Response:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Verification Points:**
- Response status: 401
- Request rejected without authentication

## Mock Data Structure

### Facebook Mock Contacts
The Facebook sync service provides mock data for testing:

```javascript
// Mock contacts returned by FacebookSyncService.getMockContacts()
[
  {
    "id": "mock_fb_1",
    "name": "Alice Sync",
    "email": "alice.sync@example.com",
    "platform": "facebook"
  },
  {
    "id": "mock_fb_2",
    "name": "Bob Sync",
    "email": "bob.sync@example.com",
    "platform": "facebook"
  },
  {
    "id": "mock_fb_3",
    "name": "Carol Sync",
    "email": "carol.sync@example.com",
    "platform": "facebook"
  },
  {
    "id": "mock_fb_4",
    "name": "Existing Friend",
    "email": "existing.friend@example.com",
    "platform": "facebook"
  },
  {
    "id": "mock_fb_5",
    "name": "Non CashPop User",
    "email": "nonuser@example.com",
    "platform": "facebook"
  }
]
```

### LINE Mock Contacts
The LINE sync service provides mock data for testing:

```javascript
// Mock contacts returned by LineSyncService.getMockContacts()
[
  {
    "id": "mock_line_1",
    "name": "Alice Line",
    "email": "alice.line@example.com",
    "platform": "line"
  },
  {
    "id": "mock_line_2",
    "name": "Bob Line",
    "email": "bob.line@example.com",
    "platform": "line"
  },
  {
    "id": "mock_line_3",
    "name": "Carol Line",
    "email": "carol.line@example.com",
    "platform": "line"
  },
  {
    "id": "mock_line_4",
    "name": "David Line",
    "email": "david.line@example.com",
    "platform": "line"
  }
]
```

## Validation Queries

Run these SQL queries to verify sync results:

```sql
-- Check new friendships created by sync
SELECT 'New Friendships' as type, r.*, u.name as friend_name
FROM relationships r
JOIN users u ON r.friend_email = u.email
WHERE r.user_email = 'sync.test@example.com' 
  AND r.status = 'accepted'
  AND r.created_at > NOW() - INTERVAL '1 hour';

-- Check sync history (if implemented)
SELECT 'Sync History' as type, * 
FROM sync_history 
WHERE user_email = 'sync.test@example.com'
ORDER BY created_at DESC;
```

## Troubleshooting

### Common Issues:
1. **Mock sync returns no results:** Check if test users exist in database
2. **Authentication errors:** Verify JWT token is valid and not expired
3. **Facebook API errors:** Check if Facebook service is properly configured
4. **No friendships created:** Verify contact emails match existing users

### Debug Steps:
1. Verify test user exists: `SELECT * FROM users WHERE email = 'sync.test@example.com'`
2. Check existing relationships: `SELECT * FROM relationships WHERE user_email = 'sync.test@example.com'`
3. Verify contact users exist: `SELECT * FROM users WHERE email IN ('alice.sync@example.com', 'bob.sync@example.com')`

## Notes
- **Mock sync** is available for development/testing without real tokens (both Facebook and LINE)
- **Facebook sync** requires valid access tokens with appropriate permissions
- **LINE sync** is now implemented with mock data support for development
  - Real LINE sync requires valid LINE access tokens
  - LINE API has limitations on contact access (see service implementation)
- **Phone contact sync** is not yet implemented
- Sync creates bidirectional friendships automatically
- Existing friendships are skipped to avoid duplicates
- All sync operations are logged for debugging purposes
- Both Facebook and LINE sync support the test endpoint for development

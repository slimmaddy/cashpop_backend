# Friend Suggestion API Testing Plan

## Overview
This document provides a simple manual testing plan for the Friend Suggestion API functionality using Postman. The plan focuses on core functionality verification rather than comprehensive automated testing.

## Database Setup

### Prerequisites
1. Ensure the database is running and accessible
2. Run the test data setup scripts in the following order:

```sql
-- First, run the basic suggestion test data
\i create-suggestion-test-data.sql

-- Then, run the comprehensive friend suggestion test data
\i create-friend-suggestion-test-data.sql
```

### Test Data Structure
The test data creates the following network:

**Main Test User:** `longlanhlong123123@gmail.com`
- **Direct Friends:** Alice Johnson, Bob Smith, Carol White
- **Potential Suggestions:**
  - Via Alice: David Brown, Emma Davis, Frank Wilson
  - Via Bob: Grace Miller, Henry Garcia  
  - Via Both (High Priority): Ivy Martinez, Jack Anderson
  - From Contacts: Kelly Thomas
  - Dismissed: Liam Jackson

## Authentication Setup

### Step 1: Get JWT Token
Before testing friend suggestions, you need to authenticate and get a JWT token.

**Endpoint:** `POST /auth/login`
**Request Body:**
```json
{
  "username": "longlanhlong123123@gmail.com",
  "password": "your_password_here"
}
```

**Expected Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "username": "longlanhlong123123@gmail.com",
    "email": "longlanhlong123123@gmail.com",
    "name": "Test User"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-string"
}
```

**Note:** Save the `accessToken` for use in subsequent API calls.

## Test Cases

### Test Case 1: Get Basic Friend Suggestions
**Purpose:** Verify the API returns friend suggestions with proper pagination

**Endpoint:** `GET /social/suggestions`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "suggestions": [
    {
      "user": {
        "id": "99999999-9999-9999-9999-999999999999",
        "email": "ivy.martinez@example.com",
        "username": "ivy_m",
        "name": "Ivy Martinez",
        "avatar": "https://i.pravatar.cc/150?img=9"
      },
      "mutualFriendsCount": 2,
      "mutualFriends": [
        {"id": "alice-id", "name": "Alice Johnson"},
        {"id": "bob-id", "name": "Bob Smith"}
      ],
      "reason": "You have 2 mutual friends"
    }
  ],
  "total": 7
}
```

**Verification Points:**
- Response status: 200
- `suggestions` array contains multiple items
- `total` count matches expected number (should be 7-8 suggestions)
- High mutual friends count suggestions appear first
- Each suggestion has required fields: user, mutualFriendsCount, mutualFriends, reason

### Test Case 2: Test Pagination 
**Purpose:** Verify pagination works correctly

**Endpoint:** `GET /social/suggestions?page=1&limit=3`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "suggestions": [
    // First 3 suggestions ordered by mutualFriendsCount DESC
  ],
  "total": 7
}
```

**Verification Points:**
- Response contains exactly 3 suggestions
- `total` remains the same (7)
- Suggestions are ordered by mutual friends count (highest first)

### Test Case 3: Test Second Page
**Purpose:** Verify second page returns remaining suggestions

**Endpoint:** `GET /social/suggestions?page=2&limit=3`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "suggestions": [
    // Next 3 suggestions
  ],
  "total": 7
}
```

**Verification Points:**
- Response contains different suggestions from page 1
- No duplicate suggestions between pages
- `total` count remains consistent

### Test Case 4: Test Large Limit
**Purpose:** Verify all suggestions are returned with large limit

**Endpoint:** `GET /social/suggestions?limit=50`
**Headers:**
```
Authorization: Bearer {your_access_token}
```

**Expected Response:**
```json
{
  "suggestions": [
    // All available suggestions
  ],
  "total": 7
}
```

**Verification Points:**
- All suggestions are returned in one response
- Suggestions are properly ordered by priority (mutual friends count)
- No dismissed suggestions are included

### Test Case 5: Test Invalid Authentication
**Purpose:** Verify API properly handles authentication errors

**Endpoint:** `GET /social/suggestions`
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
- Proper error message returned

### Test Case 6: Test Missing Authentication
**Purpose:** Verify API requires authentication

**Endpoint:** `GET /social/suggestions`
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
- Request is rejected without authentication

## Expected Suggestion Priority Order

Based on the test data, suggestions should appear in this order:

1. **Ivy Martinez** - 2 mutual friends (Alice & Bob) - High Priority
2. **Jack Anderson** - 2 mutual friends (Alice & Bob) - High Priority  
3. **David Brown** - 1 mutual friend (Alice) - Medium Priority
4. **Emma Davis** - 1 mutual friend (Alice) - Medium Priority
5. **Frank Wilson** - 1 mutual friend (Alice) - Medium Priority
6. **Grace Miller** - 1 mutual friend (Bob) - Medium Priority
7. **Henry Garcia** - 1 mutual friend (Bob) - Medium Priority
8. **Kelly Thomas** - 0 mutual friends (from contacts) - Low Priority

**Should NOT appear:**
- Liam Jackson (dismissed suggestion)
- Existing friends (Alice, Bob, Carol)
- Users with pending/rejected relationships

## Validation Queries

Run these SQL queries to verify the test data setup:

```sql
-- Check main user's friends
SELECT 'Current Friends' as type, u.name, u.email
FROM relationships r
JOIN users u ON r."friendEmail" = u.email
WHERE r."userEmail" = 'longlanhlong123123@gmail.com'
  AND r.status = 'accepted';

-- Check active suggestions
SELECT 'Active Suggestions' as type, u.name, s.reason, s."mutualFriendsCount"
FROM suggestions s
JOIN users u ON s."suggestedUserEmail" = u.email
WHERE s."userEmail" = 'longlanhlong123123@gmail.com'
  AND s.status = 'active'
ORDER BY s."mutualFriendsCount" DESC;
```

## Troubleshooting

### Common Issues:
1. **No suggestions returned:** Check if test data was properly inserted
2. **Authentication errors:** Verify JWT token is valid and not expired
3. **Wrong suggestion count:** Verify no duplicate relationships exist
4. **Missing mutual friends:** Check relationship data integrity

### Debug Steps:
1. Verify user exists: `SELECT * FROM users WHERE email = 'longlanhlong123123@gmail.com'`
2. Check relationships: Run the validation queries above
3. Verify suggestions table: `SELECT COUNT(*) FROM suggestions WHERE user_email = 'longlanhlong123123@gmail.com' AND status = 'active'`

## Notes
- All tests should be performed with a fresh database setup
- JWT tokens expire after 15 minutes by default - refresh as needed
- The API uses email-based relationships, not user IDs
- Suggestions are filtered to exclude existing friends and dismissed suggestions

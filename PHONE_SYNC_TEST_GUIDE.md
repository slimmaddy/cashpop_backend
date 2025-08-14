# Phone Sync Manual Testing Guide

## 📋 Overview

Tài liệu này hướng dẫn manual testing tính năng sync contact từ điện thoại sử dụng Postman. Tính năng này cho phép người dùng đồng bộ danh bạ điện thoại và tự động kết bạn với những người dùng CashPop khác.

## 🔧 Setup Requirements

### Environment Setup
1. **Server**: `http://localhost:3000` (hoặc URL deployment của bạn)
2. **Authentication**: JWT Bearer token
3. **Content-Type**: `application/json`

### Authentication
Trước khi test phone sync, bạn cần:
1. Đăng nhập để lấy JWT token
2. Verify phone number để lấy session ID (hoặc dùng mock session)

## 📊 Test Data

### Mock Session IDs (Development Mode)
```
Valid Sessions:
- 12345678-1234-1234-1234-123456789abc
- 87654321-4321-4321-4321-cba987654321
- test-uuid-phone-session-12345678
- mock-session-valid-phone-verification

Invalid Sessions:
- invalid-session-id
- expired-session-123
- ""
- null
```

### Mock Contact Data Examples

#### 1. Realistic Korean Contacts
```json
[
  {
    "name": "김민준",
    "phone": "+821012345678"
  },
  {
    "name": "이소영", 
    "phone": "+821087654321"
  },
  {
    "name": "박지훈",
    "phone": "010-5555-6666"
  },
  {
    "name": "최예진",
    "phone": "82-10-7777-8888"
  },
  {
    "name": "정태형",
    "phone": "01099990000"
  }
]
```

#### 2. Edge Cases Contact Data
```json
[
  {
    "name": "Valid Korean",
    "phone": "+821012345678"
  },
  {
    "name": "Old Format",
    "phone": "+821187654321"
  },
  {
    "name": "Local Format",
    "phone": "010-1234-5678"
  },
  {
    "name": "No Dash",
    "phone": "01012345678"
  },
  {
    "name": "International Format",
    "phone": "+82 10 1234 5678"
  },
  {
    "name": "Invalid US Number",
    "phone": "+1-555-123-4567"
  },
  {
    "name": "Invalid Format",
    "phone": "123-456"
  },
  {
    "name": "Empty Name",
    "phone": "+821012345678"
  }
]
```

#### 3. Large Dataset (Performance Test)
```json
[
  {"name": "Contact 1", "phone": "+821012340001"},
  {"name": "Contact 2", "phone": "+821012340002"},
  {"name": "Contact 3", "phone": "+821012340003"},
  // ... repeat up to 1000+ contacts
]
```

## 🧪 Test Cases

### 1. Happy Path - Successful Sync

**Request:**
```http
POST /social/sync/contacts
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "platform": "phone",
  "phone": {
    "sessionId": "12345678-1234-1234-1234-123456789abc",
    "contactsJson": "[{\"name\":\"김민준\",\"phone\":\"+821012345678\"},{\"name\":\"이소영\",\"phone\":\"+821087654321\"},{\"name\":\"박지훈\",\"phone\":\"010-5555-6666\"}]"
  }
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Sync phone successfully completed in {time}ms",
  "result": {
    "platform": "phone",
    "totalContacts": 3,
    "cashpopUsersFound": 2,
    "newFriendshipsCreated": 2,
    "alreadyFriends": 0,
    "errors": [],
    "details": {
      "contactsProcessed": [
        {
          "id": "mock_phone_1",
          "name": "김민준",
          "phone": "+821012345678",
          "platform": "phone"
        }
      ],
      "newFriends": [
        {
          "email": "user@example.com",
          "name": "김민준",
          "source": "phone_sync"
        }
      ]
    },
    "executionTime": 1250
  }
}
```

### 2. Invalid Session ID

**Request:**
```http
POST /social/sync/contacts
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "platform": "phone",
  "phone": {
    "sessionId": "invalid-session-id",
    "contactsJson": "[{\"name\":\"Test\",\"phone\":\"+821012345678\"}]"
  }
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Phone verification session invalid: Invalid or expired phone verification session",
  "result": {
    "platform": "phone",
    "totalContacts": 0,
    "cashpopUsersFound": 0,
    "newFriendshipsCreated": 0,
    "alreadyFriends": 0,
    "errors": ["Phone verification session invalid: Invalid or expired phone verification session"],
    "details": {
      "contactsProcessed": [],
      "newFriends": []
    }
  }
}
```

### 3. Malformed JSON

**Request:**
```http
POST /social/sync/contacts
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "platform": "phone",
  "phone": {
    "sessionId": "12345678-1234-1234-1234-123456789abc",
    "contactsJson": "invalid json format"
  }
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Invalid contacts JSON format",
  "result": {
    "platform": "phone",
    "totalContacts": 0,
    "cashpopUsersFound": 0,
    "newFriendshipsCreated": 0,
    "alreadyFriends": 0,
    "errors": ["Invalid contacts JSON format"],
    "details": {
      "contactsProcessed": [],
      "newFriends": []
    }
  }
}
```

### 4. Missing Required Fields

**Request:**
```http
POST /social/sync/contacts
Authorization: Bearer {your_jwt_token}
Content-Type: application/json

{
  "platform": "phone",
  "phone": {
    "sessionId": "12345678-1234-1234-1234-123456789abc"
  }
}
```

**Expected Response (400):**
```json
{
  "statusCode": 400,
  "message": [
    "contactsJson should not be empty"
  ],
  "error": "Bad Request"
}
```

### 5. Test Sync with Mock Data

**Request:**
```http
GET /social/sync/test?platform=phone
Authorization: Bearer {your_jwt_token}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Test sync phone successfully completed in {time}ms",
  "result": {
    "platform": "phone",
    "totalContacts": 8,
    "cashpopUsersFound": 0,
    "newFriendshipsCreated": 0,
    "alreadyFriends": 0,
    "errors": [],
    "details": {
      "contactsProcessed": [],
      "newFriends": []
    },
    "executionTime": 150,
    "testMode": true
  }
}
```

### 6. Sync History

**Request:**
```http
GET /social/sync/history
Authorization: Bearer {your_jwt_token}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Lấy lịch sử đồng bộ thành công",
  "history": [
    {
      "id": 123,
      "friendEmail": "friend@example.com",
      "message": "Auto-connected via phone sync",
      "createdAt": "2025-01-14T10:30:00Z",
      "friendName": "김민준",
      "friendUsername": "kim_minjun"
    }
  ],
  "stats": {
    "totalSynced": 15,
    "byPlatform": {
      "phone": 8,
      "facebook": 5,
      "line": 2
    },
    "recentSyncs": 8,
    "avgSyncFrequency": 0.27
  }
}
```

## 🔍 Validation Scenarios

### Phone Number Format Validation
Test các format số điện thoại khác nhau:

1. **Valid Korean Formats:**
   - `+821012345678` ✅
   - `+821187654321` ✅
   - `010-1234-5678` → `+821012345678` ✅
   - `01012345678` → `+821012345678` ✅
   - `82101234567` → `+82101234567` ✅

2. **Invalid Formats:**
   - `+1-555-123-4567` (US number) ❌
   - `123-456` (too short) ❌
   - `abc-def-ghij` (non-numeric) ❌
   - `+82101234567890` (too long) ❌

### Contact Data Edge Cases

1. **Empty/Invalid Data:**
   - Empty name: Contact bị skip
   - Empty phone: Contact bị skip
   - Null values: Contact bị skip

2. **Duplicates:**
   - Same phone number multiple times
   - Should be deduplicated

3. **Large Dataset:**
   - 1000+ contacts
   - Should handle với batching
   - Response time acceptable

## 🚀 Performance Testing

### Load Test Scenarios

1. **Small Dataset (1-10 contacts):**
   - Expected response time: < 500ms
   - Success rate: 100%

2. **Medium Dataset (50-100 contacts):**
   - Expected response time: < 2000ms
   - Success rate: 100%

3. **Large Dataset (500+ contacts):**
   - Expected response time: < 10000ms
   - Should use batching
   - Memory usage acceptable

## 🐛 Error Scenarios

### Authentication Errors

1. **No JWT Token:**
```http
POST /social/sync/contacts
Content-Type: application/json

{
  "platform": "phone",
  "phone": {
    "sessionId": "test-session",
    "contactsJson": "[]"
  }
}
```

**Expected:** 401 Unauthorized

2. **Invalid JWT Token:**
```http
POST /social/sync/contacts
Authorization: Bearer invalid_token
Content-Type: application/json

{
  "platform": "phone",
  "phone": {
    "sessionId": "test-session", 
    "contactsJson": "[]"
  }
}
```

**Expected:** 401 Unauthorized

### Validation Errors

1. **Wrong Platform:**
```json
{
  "platform": "invalid_platform",
  "phone": {
    "sessionId": "test-session",
    "contactsJson": "[]"
  }
}
```

**Expected:** 400 Bad Request với validation error

2. **Missing Phone Object:**
```json
{
  "platform": "phone"
}
```

**Expected:** 400 Bad Request

## 📝 Test Checklist

### Pre-Testing
- [ ] Server is running
- [ ] JWT token is valid
- [ ] Postman environment configured
- [ ] Test data prepared

### Core Functionality
- [ ] ✅ Happy path sync works
- [ ] ✅ Mock data sync works  
- [ ] ✅ Session validation works
- [ ] ✅ JSON parsing works
- [ ] ✅ Phone number formatting works

### Error Handling
- [ ] ✅ Invalid session rejected
- [ ] ✅ Malformed JSON rejected
- [ ] ✅ Missing fields rejected
- [ ] ✅ Invalid phone numbers skipped
- [ ] ✅ Authentication errors handled

### Performance
- [ ] ✅ Small dataset (< 500ms)
- [ ] ✅ Medium dataset (< 2s)  
- [ ] ✅ Large dataset (< 10s)
- [ ] ✅ Memory usage reasonable

### Integration
- [ ] ✅ Works with existing auth
- [ ] ✅ Creates friendships correctly
- [ ] ✅ Updates sync history
- [ ] ✅ Handles duplicates properly

## 💡 Tips for Testing

1. **Use Environment Variables:**
   - Set base URL: `{{baseUrl}}/social/sync`
   - Set JWT token: `{{jwt_token}}`

2. **Test Data Management:**
   - Keep test contact lists in separate files
   - Use different session IDs for different scenarios

3. **Response Validation:**
   - Check response status codes
   - Verify response structure matches expected
   - Validate execution times

4. **Debugging:**
   - Check server logs for detailed error info
   - Use mock data for consistent testing
   - Test edge cases thoroughly

## 🔗 Related Endpoints

- `POST /auth/login` - Get JWT token
- `POST /auth/phone/verify` - Get phone session (production)
- `GET /social/friends` - View current friends
- `GET /social/suggestions` - View suggestions
- `GET /social/sync/history` - View sync history

---

**Happy Testing! 🎉**

For issues or questions, check the server logs or contact the development team.
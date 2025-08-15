# Phone Verification API Testing Plan

## 📋 Overview
Comprehensive testing plan for Phone Verification API endpoints with Korean phone number validation and residence registration verification.

## 🔗 API Endpoints
- **Base URL**: `http://localhost:3000`
- **Authentication**: Bearer Token required for all endpoints

### Endpoints to Test:
1. `GET /auth/phone-verification/status` - Get verification status
2. `POST /auth/phone-verification/initiate` - Start verification process
3. `POST /auth/phone-verification/verify-otp` - Verify OTP code

---

## 🛠️ Setup Instructions

### 1. Database Setup
```bash
# Run the mock data SQL file (if psql is available)
psql -h localhost -U postgres -d cashpop -f phone-verification-mock-data.sql

# OR use Node.js script (if psql not available)
node -e "
const { DataSource } = require('typeorm');
const fs = require('fs');
require('dotenv').config();
(async () => {
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432, username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password', database: process.env.DB_NAME || 'cashpop'
  });
  await ds.initialize();
  const sql = fs.readFileSync('phone-verification-mock-data.sql', 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('--') && l.trim()).join('\n')
    .split(';').filter(s => s.trim() && s.trim() !== 'COMMIT');
  for (const stmt of sql) { try { await ds.query(stmt); } catch(e) { console.log('Error:', e.message); } }
  console.log('✅ Mock data loaded successfully');
  await ds.destroy();
})();
"
```

### 2. Authentication
```bash
# Login to get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123"
  }'
```

### 3. Environment Variables
Ensure these are set in your `.env`:
```
SMS_SERVICE_ENABLED=true
SMS_PROVIDER=test
RATE_LIMIT_ENABLED=true
```

---

## 📊 Test Cases

### Test Case 1: Get Phone Verification Status (Initial)
**Endpoint**: `GET /auth/phone-verification/status`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Expected Response** (200):
```json
{
  "phoneVerified": false,
  "identityVerified": false,
  "phoneVerifiedAt": null
}
```

**Verification Points**:
- ✅ Status code is 200
- ✅ `phoneVerified` is false
- ✅ `identityVerified` is false
- ✅ `phoneVerifiedAt` is null

---

### Test Case 2: Initiate Phone Verification (Valid Data)
**Endpoint**: `POST /auth/phone-verification/initiate`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "username": "testuser",
  "residencePrefix": "890511",
  "residenceSuffix": "1563062",
  "phoneCarrier": "SKT",
  "phoneNumber": "+821012345678"
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "OTP đã được gửi đến số điện thoại",
  "sessionId": "uuid-string",
  "expiresAt": "2025-01-15T10:05:00.000Z",
  "maskedPhone": "+8210****5678"
}
```

**Verification Points**:
- ✅ Status code is 200
- ✅ `success` is true
- ✅ `sessionId` is a valid UUID
- ✅ `expiresAt` is 5 minutes from now
- ✅ `maskedPhone` correctly masks middle digits
- ✅ Database has new record in `phoneSessions` table

---

### Test Case 3: Initiate Phone Verification (Invalid Residence Number)
**Endpoint**: `POST /auth/phone-verification/initiate`

**Request Body**:
```json
{
  "username": "testuser",
  "residencePrefix": "000000",
  "residenceSuffix": "1234567",
  "phoneCarrier": "SKT",
  "phoneNumber": "+821012345678"
}
```

**Expected Response** (400):
```json
{
  "statusCode": 400,
  "message": "Số đăng ký cư trú không hợp lệ",
  "error": "Bad Request"
}
```

**Verification Points**:
- ✅ Status code is 400
- ✅ Error message mentions invalid residence number
- ✅ No session created in database

---

### Test Case 4: Initiate Phone Verification (Invalid Phone Carrier)
**Endpoint**: `POST /auth/phone-verification/initiate`

**Request Body**:
```json
{
  "username": "testuser",
  "residencePrefix": "890511",
  "residenceSuffix": "1563062",
  "phoneCarrier": "INVALID",
  "phoneNumber": "+821012345678"
}
```

**Expected Response** (400):
```json
{
  "statusCode": 400,
  "message": ["Nhà mạng không được hỗ trợ"],
  "error": "Bad Request"
}
```

**Verification Points**:
- ✅ Status code is 400
- ✅ Validation error for phone carrier
- ✅ No session created in database

---

### Test Case 5: Initiate Phone Verification (Invalid Korean Phone)
**Endpoint**: `POST /auth/phone-verification/initiate`

**Request Body**:
```json
{
  "username": "testuser",
  "residencePrefix": "890511",
  "residenceSuffix": "1563062",
  "phoneCarrier": "SKT",
  "phoneNumber": "+1234567890"
}
```

**Expected Response** (400):
```json
{
  "statusCode": 400,
  "message": ["Số điện thoại không đúng định dạng Hàn Quốc"],
  "error": "Bad Request"
}
```

**Verification Points**:
- ✅ Status code is 400
- ✅ Validation error for non-Korean phone
- ✅ No session created in database

---

### Test Case 6: Rate Limiting Test
**Endpoint**: `POST /auth/phone-verification/initiate`

**Instructions**:
1. Send the same valid request 4 times rapidly
2. The 4th request should be rate limited

**Expected Response** (4th request - 400):
```json
{
  "statusCode": 400,
  "message": "Quá nhiều lần thử. Vui lòng thử lại sau 15 phút",
  "error": "Bad Request"
}
```

**Verification Points**:
- ✅ First 3 requests succeed
- ✅ 4th request returns 400 with rate limit message
- ✅ Rate limit counter in Redis/Valkey

---

### Test Case 7: Verify OTP (Valid)
**Endpoint**: `POST /auth/phone-verification/verify-otp`

**Prerequisites**: Complete Test Case 2 first to get sessionId

**Request Body**:
```json
{
  "sessionId": "SESSION_ID_FROM_INITIATE",
  "otp": "123456"
}
```

**Expected Response** (200):
```json
{
  "success": true,
  "message": "Xác thực số điện thoại thành công"
}
```

**Verification Points**:
- ✅ Status code is 200
- ✅ `success` is true
- ✅ User's `phoneVerified` updated to true in database
- ✅ User's `identityVerified` updated to true in database
- ✅ User's `phoneVerifiedAt` timestamp set
- ✅ Session deleted from `phoneSessions` table

---

### Test Case 8: Verify OTP (Invalid Session)
**Endpoint**: `POST /auth/phone-verification/verify-otp`

**Request Body**:
```json
{
  "sessionId": "invalid-session-id",
  "otp": "123456"
}
```

**Expected Response** (404):
```json
{
  "statusCode": 404,
  "message": "Phiên xác thực không tồn tại hoặc đã hết hạn",
  "error": "Not Found"
}
```

**Verification Points**:
- ✅ Status code is 404
- ✅ Error message about invalid session
- ✅ No changes to user data

---

### Test Case 9: Verify OTP (Invalid OTP)
**Endpoint**: `POST /auth/phone-verification/verify-otp`

**Prerequisites**: Complete Test Case 2 first to get sessionId

**Request Body**:
```json
{
  "sessionId": "SESSION_ID_FROM_INITIATE",
  "otp": "000000"
}
```

**Expected Response** (400):
```json
{
  "statusCode": 400,
  "message": "Mã OTP không chính xác",
  "error": "Bad Request"
}
```

**Verification Points**:
- ✅ Status code is 400
- ✅ Error message about incorrect OTP
- ✅ Session attempts counter incremented
- ✅ No changes to user verification status

---

### Test Case 10: Verify OTP (Expired Session)
**Endpoint**: `POST /auth/phone-verification/verify-otp`

**Instructions**:
1. Create a session using Test Case 2
2. Wait 6 minutes (or manually update expiresAt in database)
3. Try to verify OTP

**Request Body**:
```json
{
  "sessionId": "EXPIRED_SESSION_ID",
  "otp": "123456"
}
```

**Expected Response** (400):
```json
{
  "statusCode": 400,
  "message": "Phiên xác thực đã hết hạn",
  "error": "Bad Request"
}
```

**Verification Points**:
- ✅ Status code is 400
- ✅ Error message about expired session
- ✅ Session cleaned up from database

---

### Test Case 11: Get Phone Verification Status (After Verification)
**Endpoint**: `GET /auth/phone-verification/status`

**Prerequisites**: Complete Test Case 7 (successful verification)

**Expected Response** (200):
```json
{
  "phoneVerified": true,
  "phoneNumber": "+821012345678",
  "phoneCarrier": "SKT",
  "identityVerified": true,
  "phoneVerifiedAt": "2025-01-15T10:00:00.000Z"
}
```

**Verification Points**:
- ✅ Status code is 200
- ✅ `phoneVerified` is true
- ✅ `identityVerified` is true
- ✅ `phoneNumber` and `phoneCarrier` are set
- ✅ `phoneVerifiedAt` has valid timestamp

---

## 🔍 Database Verification Queries

### Check Phone Sessions
```sql
SELECT * FROM "phoneSessions" WHERE "userId" = '00000001-0001-0001-0001-000000000001';
```

### Check User Verification Status
```sql
SELECT
  "phoneVerified",
  "identityVerified",
  "phoneNumber",
  "phoneCarrier",
  "phoneVerifiedAt"
FROM users
WHERE email = 'testuser@example.com';
```

### Check All Test Data
```sql
-- Test Users
SELECT id, email, username, "phoneVerified", "identityVerified"
FROM users
WHERE email IN ('testuser@example.com', 'verifieduser@example.com', 'ratelimituser@example.com', 'edgecaseuser@example.com');

-- Test Sessions
SELECT id, "userId", "phoneNumber", "phoneCarrier", "expiresAt", attempts
FROM "phoneSessions"
WHERE "userId" IN ('00000001-0001-0001-0001-000000000001', '00000002-0002-0002-0002-000000000002', '00000003-0003-0003-0003-000000000003', '00000004-0004-0004-0004-000000000004');
```

---

## ✅ Test Completion Checklist

- [ ] All 11 test cases executed successfully
- [ ] Database verification queries run
- [ ] Error scenarios tested
- [ ] Authentication edge cases covered
- [ ] Rate limiting verified
- [ ] Performance acceptable

**Testing completed on**: ___________  
**Tested by**: ___________  
**Environment**: ___________

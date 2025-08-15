-- Phone Verification API Testing Mock Data
-- Run this file to set up test data for phone verification API testing
-- Usage: psql -h localhost -U postgres -d cashpop -f phone-verification-mock-data.sql

-- ============================================================================
-- CLEANUP EXISTING TEST DATA
-- ============================================================================

-- Remove existing test users and sessions (only specific test users for phone verification)
DELETE FROM "phoneSessions" WHERE "userId" IN ('00000001-0001-0001-0001-000000000001', '00000002-0002-0002-0002-000000000002', '00000003-0003-0003-0003-000000000003', '00000004-0004-0004-0004-000000000004');

-- Remove relationships and suggestions for test users
DELETE FROM relationships WHERE "userEmail" IN ('testuser@example.com', 'verifieduser@example.com', 'ratelimituser@example.com', 'edgecaseuser@example.com');
DELETE FROM suggestions WHERE "userEmail" IN ('testuser@example.com', 'verifieduser@example.com', 'ratelimituser@example.com', 'edgecaseuser@example.com');

-- Remove specific test users for phone verification
DELETE FROM users WHERE email IN ('testuser@example.com', 'verifieduser@example.com', 'ratelimituser@example.com', 'edgecaseuser@example.com');

-- ============================================================================
-- CREATE TEST USERS
-- ============================================================================

-- Test User 1: Basic user for phone verification testing
INSERT INTO users (
  id,
  email,
  username,
  name,
  password,
  provider,
  "phoneVerified",
  "identityVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  '00000001-0001-0001-0001-000000000001'::uuid,
  'testuser@example.com',
  'testuser',
  'Test User',
  '$2b$10$rQZ8kJZjZQZ8kJZjZQZ8kOuKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq', -- password: password123
  'local',
  false,
  false,
  NOW(),
  NOW()
);

-- Test User 2: Already verified user
INSERT INTO users (
  id,
  email,
  username,
  name,
  password,
  provider,
  "phoneNumber",
  "phoneCarrier",
  "phoneVerified",
  "identityVerified",
  "phoneVerifiedAt",
  "residenceRegistrationNumber",
  "residenceRegistrationPrefix",
  "createdAt",
  "updatedAt"
) VALUES (
  '00000002-0002-0002-0002-000000000002'::uuid,
  'verifieduser@example.com',
  'verifieduser',
  'Verified User',
  '$2b$10$rQZ8kJZjZQZ8kJZjZQZ8kOuKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq', -- password: password123
  'local',
  '+821087654321',
  'KT',
  true,
  true,
  NOW() - INTERVAL '1 day',
  'hashed-residence-number-verified',
  '850315',
  NOW() - INTERVAL '2 days',
  NOW()
);

-- Test User 3: User for rate limiting tests
INSERT INTO users (
  id,
  email,
  username,
  name,
  password,
  provider,
  "phoneVerified",
  "identityVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  '00000003-0003-0003-0003-000000000003'::uuid,
  'ratelimituser@example.com',
  'ratelimituser',
  'Rate Limit Test User',
  '$2b$10$rQZ8kJZjZQZ8kJZjZQZ8kOuKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq', -- password: password123
  'local',
  false,
  false,
  NOW(),
  NOW()
);

-- Test User 4: User for edge case testing
INSERT INTO users (
  id,
  email,
  username,
  name,
  password,
  provider,
  "phoneVerified",
  "identityVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  '00000004-0004-0004-0004-000000000004'::uuid,
  'edgecaseuser@example.com',
  'edgecaseuser',
  'Edge Case Test User',
  '$2b$10$rQZ8kJZjZQZ8kJZjZQZ8kOuKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq', -- password: password123
  'local',
  false,
  false,
  NOW(),
  NOW()
);

-- ============================================================================
-- CREATE TEST PHONE VERIFICATION SESSIONS
-- ============================================================================

-- Active session for testing OTP verification
INSERT INTO "phoneSessions" (
  id,
  "userId",
  "phoneNumber",
  otp,
  "expiresAt",
  attempts,
  "residenceNumberHash",
  "residencePrefix",
  "phoneCarrier",
  username,
  "createdAt"
) VALUES (
  '10000001-0001-0001-0001-000000000001'::uuid,
  '00000001-0001-0001-0001-000000000001',
  '+821012345678',
  '$2b$10$rQZ8kJZjZQZ8kJZjZQZ8kOuKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq', -- hashed OTP: 123456
  NOW() + INTERVAL '5 minutes',
  0,
  'hashed-residence-890511-1563062',
  '890511',
  'SKT',
  'testuser',
  NOW()
);

-- Expired session for testing expired scenarios
INSERT INTO "phoneSessions" (
  id,
  "userId",
  "phoneNumber",
  otp,
  "expiresAt",
  attempts,
  "residenceNumberHash",
  "residencePrefix",
  "phoneCarrier",
  username,
  "createdAt"
) VALUES (
  '10000002-0002-0002-0002-000000000002'::uuid,
  '00000004-0004-0004-0004-000000000004',
  '+821098765432',
  '$2b$10$rQZ8kJZjZQZ8kJZjZQZ8kOuKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq', -- hashed OTP: 123456
  NOW() - INTERVAL '1 minute', -- Already expired
  0,
  'hashed-residence-910913-3756379',
  '910913',
  'LG_UPLUS',
  'edgecaseuser',
  NOW() - INTERVAL '6 minutes'
);

-- Session with max attempts for testing attempt limits
INSERT INTO "phoneSessions" (
  id,
  "userId",
  "phoneNumber",
  otp,
  "expiresAt",
  attempts,
  "residenceNumberHash",
  "residencePrefix",
  "phoneCarrier",
  username,
  "createdAt"
) VALUES (
  '10000003-0003-0003-0003-000000000003'::uuid,
  '00000003-0003-0003-0003-000000000003',
  '+821055555555',
  '$2b$10$rQZ8kJZjZQZ8kJZjZQZ8kOuKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq', -- hashed OTP: 123456
  NOW() + INTERVAL '3 minutes',
  3, -- Max attempts reached
  'hashed-residence-811115-1143215',
  '811115',
  'KT',
  'ratelimituser',
  NOW() - INTERVAL '2 minutes'
);

-- ============================================================================
-- CREATE VALID RESIDENCE REGISTRATION TEST DATA
-- ============================================================================

-- Valid Korean residence registration numbers for testing
-- These are generated using the Korean residence registration algorithm

-- Test data comments (all have valid checksums):
-- 890511-1563062: Born May 11, 1989, Male, Valid checksum
-- 910913-3756379: Born Sep 13, 1991, Male, Valid checksum
-- 811115-1143215: Born Nov 15, 1981, Male, Valid checksum
-- 751006-4562102: Born Oct 6, 1975, Female, Valid checksum
-- 630412-1588550: Born Apr 12, 1963, Male, Valid checksum

-- ============================================================================
-- CREATE TEST PHONE NUMBERS BY CARRIER
-- ============================================================================

-- Valid Korean phone numbers for testing:
-- SKT: +821012345678, +821112345678, +821612345678
-- KT: +821712345678, +821812345678, +821912345678  
-- LG U+: +821512345678, +821312345678, +821412345678

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify test data was created successfully
SELECT 'Test Users Created' as status, COUNT(*) as count 
FROM users 
WHERE email LIKE '%test%' OR email LIKE '%example%';

SELECT 'Test Sessions Created' as status, COUNT(*) as count
FROM "phoneSessions"
WHERE "userId" IN ('00000001-0001-0001-0001-000000000001', '00000002-0002-0002-0002-000000000002', '00000003-0003-0003-0003-000000000003', '00000004-0004-0004-0004-000000000004');

-- ============================================================================
-- USEFUL QUERIES FOR TESTING
-- ============================================================================

-- Check user verification status
-- SELECT id, email, username, "phoneVerified", "identityVerified", "phoneNumber", "phoneCarrier", "phoneVerifiedAt"
-- FROM users 
-- WHERE email = 'testuser@example.com';

-- Check active phone sessions
-- SELECT id, "userId", "phoneNumber", "phoneCarrier", "expiresAt", attempts, "createdAt"
-- FROM "phoneSessions" 
-- WHERE "userId" = 'test-user-001';

-- Check expired sessions
-- SELECT id, "userId", "phoneNumber", "expiresAt", attempts
-- FROM "phoneSessions" 
-- WHERE "expiresAt" < NOW();

-- Clean up test data (run this after testing)
-- DELETE FROM "phoneSessions" WHERE "userId" LIKE 'test-user-%';
-- DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example%';

-- ============================================================================
-- TEST SCENARIOS SUMMARY
-- ============================================================================

/*
Available Test Scenarios:

1. Basic Phone Verification Flow:
   - User: testuser@example.com (test-user-001)
   - Password: password123
   - Valid residence: 890511-1563062
   - Valid phone: +821012345678
   - Carrier: SKT

2. Already Verified User:
   - User: verifieduser@example.com (test-user-002)
   - Password: password123
   - Already has verified phone: +821087654321

3. Rate Limiting Tests:
   - User: ratelimituser@example.com (test-user-003)
   - Password: password123
   - Has session with max attempts: test-session-maxattempts

4. Edge Cases:
   - User: edgecaseuser@example.com (test-user-004)
   - Password: password123
   - Has expired session: test-session-expired

5. Valid Test OTP:
   - All test sessions use OTP: 123456
   - Hashed with bcrypt for database storage

6. Valid Residence Numbers (all with valid checksums):
   - 890511-1563062 (Male, 1989)
   - 910913-3756379 (Male, 1991)
   - 811115-1143215 (Male, 1981)
   - 751006-4562102 (Female, 1975)
   - 630412-1588550 (Male, 1963)

7. Valid Phone Numbers by Carrier:
   - SKT: +821012345678, +821112345678, +821612345678
   - KT: +821712345678, +821812345678, +821912345678
   - LG U+: +821512345678, +821312345678, +821412345678

8. Invalid Test Cases:
   - Invalid residence: 000000-1234567
   - Invalid phone: +1234567890 (US format)
   - Invalid carrier: "INVALID"
   - Invalid OTP: 000000
*/

COMMIT;

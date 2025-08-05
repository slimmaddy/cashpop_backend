-- Script đơn giản để tạo dummy data cho test Friends API
-- Chỉ sử dụng các cột cần thiết

-- 1. Tạo test user (nếu chưa có) - Email là primary identifier
INSERT INTO users (id, email, username, name, password, provider) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'testuser@example.com', 'testuser', 'Test User', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'local')
ON CONFLICT (id) DO UPDATE SET
  email = 'testuser@example.com',
  username = 'testuser',
  name = 'Test User',
  password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- 2. Tạo 10 bạn bè (tất cả đều có username)
INSERT INTO users (id, email, username, name, avatar, provider) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'john.doe@example.com', 'john_doe', 'John Doe', 'https://i.pravatar.cc/150?img=2', 'local'),
('550e8400-e29b-41d4-a716-446655440002', 'jane.smith@example.com', 'jane_smith', 'Jane Smith', 'https://i.pravatar.cc/150?img=3', 'local'),
('550e8400-e29b-41d4-a716-446655440003', 'mike.wilson@example.com', 'mike_wilson', 'Mike Wilson', 'https://i.pravatar.cc/150?img=4', 'local'),
('550e8400-e29b-41d4-a716-446655440004', 'sarah.johnson@gmail.com', 'sarah_johnson', 'Sarah Johnson', 'https://i.pravatar.cc/150?img=5', 'facebook'),
('550e8400-e29b-41d4-a716-446655440005', 'david.brown@gmail.com', 'david_brown', 'David Brown', 'https://i.pravatar.cc/150?img=6', 'google'),
('550e8400-e29b-41d4-a716-446655440006', 'lisa.davis@outlook.com', 'lisa_davis', 'Lisa Davis', 'https://i.pravatar.cc/150?img=7', 'facebook'),
('550e8400-e29b-41d4-a716-446655440007', 'tom.miller@example.com', 'tom_miller', 'Tom Miller', 'https://i.pravatar.cc/150?img=8', 'local'),
('550e8400-e29b-41d4-a716-446655440008', 'anna.garcia@line.me', 'anna_garcia', 'Anna Garcia', 'https://i.pravatar.cc/150?img=9', 'line'),
('550e8400-e29b-41d4-a716-446655440009', 'chris.martinez@example.com', 'chris_martinez', 'Chris Martinez', 'https://i.pravatar.cc/150?img=10', 'local'),
('550e8400-e29b-41d4-a716-446655440010', 'emma.taylor@icloud.com', 'emma_taylor', 'Emma Taylor', 'https://i.pravatar.cc/150?img=11', 'apple')
ON CONFLICT (id) DO NOTHING;

-- 3. Tạo friendships (tất cả ACCEPTED)
INSERT INTO friendships (id, user_id, friend_id, status, initiated_by, message) VALUES 
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'accepted', '550e8400-e29b-41d4-a716-446655440000', 'Hi John!'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'accepted', '550e8400-e29b-41d4-a716-446655440002', 'Hello!'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440003', 'accepted', '550e8400-e29b-41d4-a716-446655440000', 'Hey Mike!'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440004', 'accepted', '550e8400-e29b-41d4-a716-446655440004', NULL),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440005', 'accepted', '550e8400-e29b-41d4-a716-446655440000', 'Nice to meet you!'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440006', 'accepted', '550e8400-e29b-41d4-a716-446655440006', 'Hi!'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440007', 'accepted', '550e8400-e29b-41d4-a716-446655440000', 'Hello Tom!'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440008', 'accepted', '550e8400-e29b-41d4-a716-446655440008', 'LINE friend!'),
('660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440009', 'accepted', '550e8400-e29b-41d4-a716-446655440000', 'Hey Chris!'),
('660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440010', 'accepted', '550e8400-e29b-41d4-a716-446655440010', NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. Kiểm tra kết quả
SELECT 'Test User:' as info, username, name FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000';
SELECT 'Total Friends:' as info, COUNT(*) as count FROM friendships WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' AND status = 'accepted';

-- Test user info:
-- ID: 550e8400-e29b-41d4-a716-446655440000
-- Email: testuser@example.com  
-- Username: testuser
-- Tổng bạn bè: 10

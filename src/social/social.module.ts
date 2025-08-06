import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Friendship } from './entities/friendship.entity';
import { User } from '../users/entities/user.entity';

// Services
import { FriendshipService } from './services/friendship.service';
import { FriendSuggestionService } from './services/friend-suggestion.service';

// Controllers
import { FriendshipController } from './controllers/friendship.controller';
import { FriendSuggestionController } from './controllers/friend-suggestion.controller';

/**
 * Social Module - Hiển thị danh sách bạn bè và gợi ý kết bạn
 *
 * Chức năng:
 * - Hiển thị danh sách bạn bè đã kết bạn thành công (status = accepted)
 * - Gợi ý kết bạn thông minh (bạn của bạn bè, chưa kết bạn)
 * - Hỗ trợ phân trang cho cả hai tính năng
 *
 * Không bao gồm:
 * - Gửi/nhận lời mời kết bạn
 * - Đồng bộ danh bạ
 * - Block/unblock user
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Friendship, // Entity chính để lưu trữ mối quan hệ bạn bè
      User,       // Entity user để join lấy thông tin bạn bè
    ]),
  ],
  controllers: [
    FriendshipController, // Controller duy nhất: GET /social/friends
    FriendSuggestionController
  ],
  providers: [
    FriendshipService, // Service cho friends list
    FriendSuggestionService, // Service cho friend suggestions
  ],
  exports: [
    FriendshipService, // Export để các module khác có thể sử dụng nếu cần
    FriendSuggestionService, // Export friend suggestion service
  ],
})
export class SocialModule {}

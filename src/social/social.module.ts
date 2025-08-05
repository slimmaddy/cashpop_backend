import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Friendship } from './entities/friendship.entity';
import { User } from '../users/entities/user.entity';

// Services
import { FriendshipService } from './services/friendship.service';

// Controllers
import { FriendshipController } from './controllers/friendship.controller';

/**
 * Social Module - Đơn giản hóa chỉ để hiển thị danh sách bạn bè
 *
 * Chức năng duy nhất:
 * - Hiển thị danh sách bạn bè đã kết bạn thành công (status = accepted)
 * - Hỗ trợ phân trang và tìm kiếm
 *
 * Không bao gồm:
 * - Gửi/nhận lời mời kết bạn
 * - Gợi ý bạn bè
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
  ],
  providers: [
    FriendshipService, // Service đơn giản: chỉ có method getFriends()
  ],
  exports: [
    FriendshipService, // Export để các module khác có thể sử dụng nếu cần
  ],
})
export class SocialModule {}

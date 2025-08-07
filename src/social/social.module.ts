import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';

// Entities
import { Relationship } from './entities/relationship.entity';
import { Suggestion } from './entities/suggestion.entity';
import { User } from '../users/entities/user.entity';

// Services
import { RelationshipService } from './services/relationship.service';
import { SuggestionService } from './services/suggestion.service';

// Controllers
import { RelationshipController } from './controllers/relationship.controller';
import { SuggestionController } from './controllers/suggestion.controller';

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
      Relationship, // Entity chính để lưu trữ mối quan hệ bạn bè
      Suggestion,   // Entity để lưu trữ friend suggestions
      User,         // Entity user để join lấy thông tin bạn bè
    ]),
    UsersModule, // Import UsersModule để sử dụng UsersService
  ],
  controllers: [
    RelationshipController, // GET /social/friends
    SuggestionController, // GET /social/friends/suggestions // POST /social/contacts/sync/facebook
  ],
  providers: [
    RelationshipService, // Service cho friends list
    SuggestionService, // Service cho friend suggestions
  ],
  exports: [
    RelationshipService, // Export để các module khác có thể sử dụng nếu cần
    SuggestionService, // Export friend suggestion service
  ],
})
export class SocialModule {}

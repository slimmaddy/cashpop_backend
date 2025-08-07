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
 * Social Module - Quản lý mối quan hệ bạn bè và gợi ý kết bạn
 *
 * Chức năng:
 * - Hiển thị danh sách bạn bè đã kết bạn thành công (status = accepted)
 * - Gửi lời mời kết bạn thông qua email
 * - Hiển thị lời mời kết bạn đã nhận (status = pending)
 * - Chấp nhận/từ chối lời mời kết bạn
 * - Gợi ý kết bạn thông minh (bạn của bạn bè, chưa kết bạn)
 * - Hỗ trợ phân trang cho tất cả tính năng
 *
 * Không bao gồm:
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
    RelationshipController, // GET /social/friends, POST /social/friends/request, GET /social/friends/requests/received, POST /social/friends/requests/:id/accept, POST /social/friends/requests/:id/reject
    SuggestionController, // GET /social/suggestions
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

import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ServicesModule } from "../services/services.module";
import { UsersModule } from "../users/users.module";

// Entities
import { User } from "../users/entities/user.entity";
import { Relationship } from "./entities/relationship.entity";
import { Suggestion } from "./entities/suggestion.entity";

// Services
import { BulkOperationsService } from "./services/bulk-operations.service";
import { MutualFriendsCalculator } from "./services/mutual-friends-calculator.service";
import { RelationshipService } from "./services/relationship.service";
import { SocialSyncService } from "./services/social-sync.service";
import { SuggestionService } from "./services/suggestion.service";
import { FacebookSyncService } from "./services/syncing-facebook.service";
import { LineSyncService } from "./services/syncing-line.service";
import { PhoneSyncService } from "./services/syncing-phone.service";
import { UserContextService } from "./services/user-context.service";
import { UserLookupService } from "./services/user-lookup.service";

// Repositories
import { RelationshipRepository } from "./repositories/relationship.repository";

// Strategies
import { ContactSuggestionStrategy } from "./strategies/contact-suggestion.strategy";

// Controllers
import { RelationshipController } from "./controllers/relationship.controller";
import { SuggestionController } from "./controllers/suggestion.controller";
import { SyncController } from "./controllers/sync.controller";

/**
 * Social Module - Quản lý mối quan hệ bạn bè và gợi ý kết bạn
 *
 * Chức năng:
 * - Hiển thị danh sách bạn bè đã kết bạn thành công (status = accepted)
 * - Gửi lời mời kết bạn thông qua email
 * - Hiển thị lời mời kết bạn đã nhận (status = pending)
 * - Chấp nhận/từ chối lời mời kết bạn
 * - Gợi ý kết bạn thông minh (bạn của bạn bè, chưa kết bạn)
 * - Đồng bộ danh bạ từ Facebook, LINE, Phone contacts
 * - Hỗ trợ phân trang cho tất cả tính năng
 *
 * Tính năng mới:
 * - Facebook sync với auto-friendship creation
 * - Mock data testing cho development
 * - Sync history tracking
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Relationship, // Entity chính để lưu trữ mối quan hệ bạn bè
      Suggestion, // Entity để lưu trữ friend suggestions
      User, // Entity user để join lấy thông tin bạn bè
    ]),
    HttpModule.register({
      timeout: 15000, // 15 seconds timeout for external APIs
      maxRedirects: 3,
      headers: {
        "User-Agent": "CashPop-Backend/1.0",
      },
    }),
    UsersModule, // Import UsersModule để sử dụng UsersService
    ServicesModule, // Import ServicesModule để sử dụng SmsService
  ],
  controllers: [
    RelationshipController, // GET /social/friends, POST /social/friends/request, GET /social/friends/requests/received, POST /social/friends/requests/:id/accept, POST /social/friends/requests/:id/reject
    SuggestionController, // GET /social/suggestions
    SyncController, // POST /social/sync/contacts, GET /social/sync/test, GET /social/sync/history
  ],
  providers: [
    // ✅ EXISTING: Core services
    RelationshipService, // Service cho friends list
    SuggestionService, // Service cho friend suggestions
    SocialSyncService, // Service cho sync contacts
    FacebookSyncService, // Service cho Facebook integration
    LineSyncService, // Service cho LINE integration
    PhoneSyncService, // Service cho Phone integration
    UserContextService, // ✅ CONSOLIDATED: Service cho user context management, lookup và caching
    UserLookupService, // ✅ Service cho user lookup và email validation
    BulkOperationsService, // ✅ Service cho bulk friend operations
    RelationshipRepository, // ✅ CUSTOM: Repository với optimized queries

    // ✅ NEW: Refactored architecture services
    MutualFriendsCalculator, // ✅ NEW: Service chuyên tính mutual friends

    // ✅ NEW: Strategy pattern implementations
    ContactSuggestionStrategy, // ✅ NEW: Strategy cho contact-based suggestions
  ],
  exports: [
    RelationshipService, // Export để các module khác có thể sử dụng nếu cần
    SuggestionService, // Export friend suggestion service
    SocialSyncService, // Export sync service cho other modules
    MutualFriendsCalculator, // Export mutual friends calculator cho reuse
    UserLookupService, // Export user lookup service cho other modules
  ],
})
export class SocialModule { }

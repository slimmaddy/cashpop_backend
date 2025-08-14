import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";

/**
 * Custom exceptions cho Social Module
 */

export class FriendshipAlreadyExistsException extends ConflictException {
  constructor(userEmail: string, friendEmail: string) {
    super({
      message: "Đã là bạn bè hoặc đã gửi lời mời kết bạn",
      code: "FRIENDSHIP_ALREADY_EXISTS",
      details: {
        userEmail,
        friendEmail,
      },
    });
  }
}

export class FriendRequestNotFoundException extends NotFoundException {
  constructor(requestId: string) {
    super({
      message: "Không tìm thấy lời mời kết bạn hoặc lời mời đã được xử lý",
      code: "FRIEND_REQUEST_NOT_FOUND",
      details: {
        requestId,
      },
    });
  }
}

export class SelfFriendshipException extends BadRequestException {
  constructor(email: string) {
    super({
      message: "Không thể gửi lời mời kết bạn cho chính mình",
      code: "SELF_FRIENDSHIP_NOT_ALLOWED",
      details: {
        email,
      },
    });
  }
}

export class InvalidSyncTokenException extends BadRequestException {
  constructor(platform: string, reason?: string) {
    super({
      message: `Token không hợp lệ cho platform ${platform}`,
      code: "INVALID_SYNC_TOKEN",
      details: {
        platform,
        reason,
      },
    });
  }
}

export class SyncRateLimitException extends BadRequestException {
  constructor(platform: string, retryAfter: number) {
    super({
      message: `Quá nhiều lần sync cho ${platform}. Vui lòng thử lại sau ${retryAfter} phút`,
      code: "SYNC_RATE_LIMIT_EXCEEDED",
      details: {
        platform,
        retryAfter,
      },
    });
  }
}

export class RelationshipActionNotAllowedException extends BadRequestException {
  constructor(action: string, currentStatus: string) {
    super({
      message: `Không thể ${action} với trạng thái hiện tại: ${currentStatus}`,
      code: "RELATIONSHIP_ACTION_NOT_ALLOWED",
      details: {
        action,
        currentStatus,
      },
    });
  }
}

export class UserNotInContactsException extends BadRequestException {
  constructor(email: string) {
    super({
      message: "Email không có trong danh bạ được đồng bộ",
      code: "USER_NOT_IN_CONTACTS",
      details: {
        email,
      },
    });
  }
}

export class PlatformSyncNotSupportedException extends BadRequestException {
  constructor(platform: string) {
    super({
      message: `Platform ${platform} chưa được hỗ trợ đồng bộ`,
      code: "PLATFORM_SYNC_NOT_SUPPORTED",
      details: {
        platform,
      },
    });
  }
}

export class BulkOperationException extends BadRequestException {
  constructor(operation: string, failedCount: number, totalCount: number, errors: string[]) {
    super({
      message: `Bulk ${operation} thất bại: ${failedCount}/${totalCount} operations failed`,
      code: "BULK_OPERATION_FAILED",
      details: {
        operation,
        failedCount,
        totalCount,
        errors,
      },
    });
  }
}
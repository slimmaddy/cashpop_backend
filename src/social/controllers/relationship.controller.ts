import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RelationshipService } from "../services/relationship.service";
import { BulkOperationsService } from "../services/bulk-operations.service";
import { UserContextService } from "../services/user-context.service";
import { BaseSocialController } from "./base-social.controller";
import {
  RelationshipResponseDto,
  GetFriendsDto,
  SendFriendRequestDto,
  SendFriendRequestResponseDto,
  FriendRequestDto,
  GetFriendRequestsDto,
  FriendRequestActionResponseDto,
} from "../dto/relationship.dto";
import {
  BulkSendFriendRequestDto,
  BulkAcceptFriendRequestDto,
  BulkRejectFriendRequestDto,
  BulkOperationResponseDto,
} from "../dto/bulk-operations.dto";
import {
  CursorPaginationResponseDto,
  GetFriendsWithCursorDto,
  GetFriendRequestsWithCursorDto,
} from "../dto/cursor-pagination.dto";

@ApiTags("Friends")
@Controller("social/friends")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RelationshipController extends BaseSocialController {
  constructor(
    private readonly relationshipService: RelationshipService,
    private readonly bulkOperationsService: BulkOperationsService,
    userContextService: UserContextService
  ) {
    super(userContextService);
  }

  @Get()
  @ApiOperation({
    summary: "Get a list of friends",
  })
  @ApiResponse({
    status: 200,
    description: "Get a list of friends successfully",
    schema: {
      type: "object",
      properties: {
        friends: {
          type: "array",
          items: { $ref: "#/components/schemas/RelationshipResponseDto" },
        },
        total: {
          type: "number",
          description: "Total number of friends",
          example: 25,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Not logged in or invalid token",
  })
  async getFriends(
    @Req() req: any,
    @Query() query: GetFriendsDto
  ): Promise<{ friends: RelationshipResponseDto[]; total: number }> {
    this.logRequest("getFriends", req, { query });

    // ✅ OPTIMIZED: Sử dụng BaseSocialController
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      return this.createUserNotFoundResponse({ friends: [], total: 0 });
    }

    return this.relationshipService.getFriends(user.email, query);
  }

  @Post("request")
  @ApiOperation({
    summary: "Send an invitation to make friends by email",
    description: "Send an invitation to make friends by email",
  })
  @ApiResponse({
    status: 201,
    description: "Send the invitation to make friends successfully",
    type: SendFriendRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "Input data is invalid or unable to send invitations to yourself",
  })
  @ApiResponse({
    status: 404,
    description: "Cannot find users with this email",
  })
  @ApiResponse({
    status: 409,
    description: "Already a friend or invitation was sent earlier",
  })
  @ApiResponse({
    status: 401,
    description: "Not logged in or invalid token",
  })
  async sendFriendRequest(
    @Req() req: any,
    @Body() sendFriendRequestDto: SendFriendRequestDto
  ): Promise<SendFriendRequestResponseDto> {
    this.logRequest("sendFriendRequest", req, { sendFriendRequestDto });

    // ✅ OPTIMIZED: Sử dụng BaseSocialController
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    return this.relationshipService.sendFriendRequest(
      user.email,
      sendFriendRequestDto
    );
  }

  @Get("requests/received")
  @ApiOperation({
    summary: "Get a list of invitations to make friends",
    description:
      "Display the list of friends that the current user has received (status = pending)",
  })
  @ApiResponse({
    status: 200,
    description: "Get a list of successful invitations",
    schema: {
      type: "object",
      properties: {
        requests: {
          type: "array",
          items: { $ref: "#/components/schemas/FriendRequestDto" },
        },
        total: {
          type: "number",
          description: "Total number of requests",
          example: 5,
        },
        page: {
          type: "number",
          example: 1,
        },
        limit: {
          type: "number",
          example: 20,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Not logged in or invalid token",
  })
  async getFriendRequests(
    @Req() req: any,
    @Query() query: GetFriendRequestsDto
  ): Promise<{ requests: FriendRequestDto[]; total: number }> {
    this.logRequest("getFriendRequests", req, { query });

    // ✅ OPTIMIZED: Sử dụng BaseSocialController
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      return this.createUserNotFoundResponse({ requests: [], total: 0 });
    }

    return this.relationshipService.getFriendRequests(user.email, query);
  }

  @Post("requests/:requestId/accept")
  @ApiOperation({
    summary: "Chấp nhận lời mời kết bạn",
    description:
      "Chấp nhận lời mời kết bạn cụ thể, cập nhật status thành accepted",
  })
  @ApiResponse({
    status: 200,
    description: "Chấp nhận lời mời thành công",
    type: FriendRequestActionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy lời mời kết bạn hoặc lời mời đã được xử lý",
  })
  @ApiResponse({
    status: 401,
    description: "Chưa đăng nhập hoặc token không hợp lệ",
  })
  async acceptFriendRequest(
    @Req() req: any,
    @Param("requestId") requestId: string
  ): Promise<FriendRequestActionResponseDto> {
    this.logRequest("acceptFriendRequest", req, { requestId });

    // ✅ OPTIMIZED: Sử dụng BaseSocialController
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    return this.relationshipService.acceptFriendRequest(user.email, requestId);
  }

  @Post("requests/:requestId/reject")
  @ApiOperation({
    summary: "Từ chối lời mời kết bạn",
    description:
      "Từ chối lời mời kết bạn cụ thể, cập nhật status thành rejected",
  })
  @ApiResponse({
    status: 200,
    description: "Từ chối lời mời thành công",
    type: FriendRequestActionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy lời mời kết bạn hoặc lời mời đã được xử lý",
  })
  @ApiResponse({
    status: 401,
    description: "Chưa đăng nhập hoặc token không hợp lệ",
  })
  async rejectFriendRequest(
    @Req() req: any,
    @Param("requestId") requestId: string
  ): Promise<FriendRequestActionResponseDto> {
    this.logRequest("rejectFriendRequest", req, { requestId });

    // ✅ OPTIMIZED: Sử dụng BaseSocialController
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    return this.relationshipService.rejectFriendRequest(user.email, requestId);
  }

  // ==================== BULK OPERATIONS ====================

  @Post("bulk/send-requests")
  @ApiOperation({
    summary: "✅ BULK: Send friend requests to multiple users",
    description: "Send friend requests to multiple users in one operation"
  })
  @ApiResponse({
    status: 201,
    description: "Bulk friend requests completed",
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request data or limits exceeded",
  })
  async bulkSendFriendRequests(
    @Req() req: any,
    @Body() bulkSendDto: BulkSendFriendRequestDto
  ): Promise<BulkOperationResponseDto> {
    this.logRequest("bulkSendFriendRequests", req, { count: bulkSendDto.friendEmails.length });

    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    return this.bulkOperationsService.bulkSendFriendRequests(user.email, bulkSendDto);
  }

  @Post("bulk/accept-requests")
  @ApiOperation({
    summary: "✅ BULK: Accept multiple friend requests",
    description: "Accept multiple friend requests in one operation"
  })
  @ApiResponse({
    status: 200,
    description: "Bulk accept completed",
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request data or limits exceeded",
  })
  async bulkAcceptFriendRequests(
    @Req() req: any,
    @Body() bulkAcceptDto: BulkAcceptFriendRequestDto
  ): Promise<BulkOperationResponseDto> {
    this.logRequest("bulkAcceptFriendRequests", req, { count: bulkAcceptDto.requestIds.length });

    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    return this.bulkOperationsService.bulkAcceptFriendRequests(user.email, bulkAcceptDto);
  }

  @Post("bulk/reject-requests")
  @ApiOperation({
    summary: "✅ BULK: Reject multiple friend requests",
    description: "Reject multiple friend requests in one operation"
  })
  @ApiResponse({
    status: 200,
    description: "Bulk reject completed",
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request data or limits exceeded",
  })
  async bulkRejectFriendRequests(
    @Req() req: any,
    @Body() bulkRejectDto: BulkRejectFriendRequestDto
  ): Promise<BulkOperationResponseDto> {
    this.logRequest("bulkRejectFriendRequests", req, { count: bulkRejectDto.requestIds.length });

    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      throw new Error("Không tìm thấy thông tin người dùng");
    }

    return this.bulkOperationsService.bulkRejectFriendRequests(user.email, bulkRejectDto);
  }

  // ==================== CURSOR PAGINATION ====================

  @Get("cursor")
  @ApiOperation({
    summary: "✅ CURSOR: Get friends with cursor-based pagination",
    description: "More efficient pagination for large datasets using cursor-based approach"
  })
  @ApiResponse({
    status: 200,
    description: "Friends retrieved with cursor pagination",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: { $ref: "#/components/schemas/RelationshipResponseDto" }
        },
        pagination: {
          type: "object",
          properties: {
            hasNextPage: { type: "boolean", example: true },
            hasPreviousPage: { type: "boolean", example: false },
            nextCursor: { type: "string", example: "2025-01-15T10:30:00.000Z" },
            previousCursor: { type: "string", example: null }
          }
        },
        meta: {
          type: "object",
          properties: {
            limit: { type: "number", example: 20 },
            search: { type: "string", example: "john" },
            executionTime: { type: "number", example: 45 }
          }
        }
      }
    }
  })
  async getFriendsWithCursor(
    @Req() req: any,
    @Query() query: GetFriendsWithCursorDto
  ): Promise<CursorPaginationResponseDto<RelationshipResponseDto>> {
    const startTime = Date.now();
    this.logRequest("getFriendsWithCursor", req, { query });

    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      return {
        data: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false
        },
        meta: {
          limit: query.limit || 20,
          search: query.search
        }
      };
    }

    const { cursor, limit = 20, search, sortBy = 'createdAt', sortDir = 'DESC' } = query;

    // Use custom repository method
    const { data, hasNextPage, nextCursor } = await this.relationshipService
      .relationshipRepositoryCustom
      .findFriendsWithCursor(user.email, cursor, limit, search, sortBy, sortDir);

    // Transform data
    const friends: RelationshipResponseDto[] = data.map((row) => ({
      id: row.relationship_id,
      friend: {
        id: row.friend_id || "",
        email: row.relationship_friendemail,
        username: row.friend_username || "",
        name: row.friend_name || "",
        avatar: row.friend_avatar || null,
      },
      status: row.relationship_status,
      initiatedBy: row.relationship_initiatedby,
      message: row.relationship_message,
      createdAt: row.relationship_createdat,
      acceptedAt: row.relationship_acceptedat,
    }));

    const executionTime = Date.now() - startTime;

    return {
      data: friends,
      pagination: {
        hasNextPage,
        hasPreviousPage: !!cursor,
        nextCursor,
      },
      meta: {
        limit,
        search,
        executionTime
      }
    };
  }

  @Get("requests/cursor")
  @ApiOperation({
    summary: "✅ CURSOR: Get friend requests with cursor-based pagination",
    description: "More efficient pagination for friend requests using cursor-based approach"
  })
  @ApiResponse({
    status: 200,
    description: "Friend requests retrieved with cursor pagination"
  })
  async getFriendRequestsWithCursor(
    @Req() req: any,
    @Query() query: GetFriendRequestsWithCursorDto
  ): Promise<CursorPaginationResponseDto<FriendRequestDto>> {
    const startTime = Date.now();
    this.logRequest("getFriendRequestsWithCursor", req, { query });

    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      return {
        data: [],
        pagination: {
          hasNextPage: false,
          hasPreviousPage: false
        },
        meta: {
          limit: query.limit || 20,
          search: query.search
        }
      };
    }

    const { cursor, limit = 20, sortBy = 'createdAt', sortDir = 'DESC' } = query;

    // Use custom repository method
    const { data, hasNextPage, nextCursor } = await this.relationshipService
      .relationshipRepositoryCustom
      .findFriendRequestsWithCursor(user.email, cursor, limit, sortBy, sortDir);

    // Transform data
    const requests: FriendRequestDto[] = data.map((row) => ({
      id: row.relationship_id,
      sender: {
        id: row.friend_id || "",
        email: row.relationship_useremail,
        username: row.friend_username || "",
        name: row.friend_name || "",
        avatar: row.friend_avatar || null,
      },
      message: row.relationship_message,
      createdAt: row.relationship_createdat,
      canAccept: true,
      canReject: true,
    }));

    const executionTime = Date.now() - startTime;

    return {
      data: requests,
      pagination: {
        hasNextPage,
        hasPreviousPage: !!cursor,
        nextCursor,
      },
      meta: {
        limit,
        executionTime
      }
    };
  }
}

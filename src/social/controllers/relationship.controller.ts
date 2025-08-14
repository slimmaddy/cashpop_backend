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

@ApiTags("Friends")
@Controller("social/friends")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RelationshipController extends BaseSocialController {
  constructor(
    private readonly relationshipService: RelationshipService,
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
}

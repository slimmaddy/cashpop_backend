import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { SocialSyncService } from "../services/social-sync.service";
import { UserContextService } from "../services/user-context.service";
import { BaseSocialController } from "./base-social.controller";
import {
  SyncContactDto,
  SyncContactsResponseDto,
  SyncPlatform,
} from "../dto/syncing.dto";

@ApiTags("Social Sync")
@Controller("social/sync")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SyncController extends BaseSocialController {
  constructor(
    private readonly socialSyncService: SocialSyncService,
    userContextService: UserContextService
  ) {
    super(userContextService);
  }

  @Post("contacts")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Đồng bộ danh bạ từ các platform",
    description:
      "Đồng bộ danh bạ từ Facebook, LINE, hoặc Contact và tự động kết bạn với CashPop users",
  })
  @ApiResponse({
    status: 200,
    description: "Đồng bộ thành công",
    type: SyncContactsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Dữ liệu đầu vào không hợp lệ hoặc access token không đúng",
  })
  @ApiResponse({
    status: 401,
    description: "Chưa đăng nhập hoặc token không hợp lệ",
  })
  async syncContacts(
    @Req() req: any,
    @Body() syncDto: SyncContactDto
  ): Promise<SyncContactsResponseDto> {
    this.logRequest("syncContacts", req, {
      platform: syncDto.platform,
      hasToken: !!syncDto.facebook?.token,
    });

    // ✅ OPTIMIZED: Sử dụng BaseSocialController
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      return {
        success: false,
        message: "Không tìm thấy thông tin người dùng",
        result: {
          platform: syncDto.platform,
          totalContacts: 0,
          cashpopUsersFound: 0,
          newFriendshipsCreated: 0,
          alreadyFriends: 0,
          errors: ["User not found"],
          details: {
            contactsProcessed: [],
            newFriends: [],
          },
        },
      };
    }

    return this.socialSyncService.syncContacts(user.email, syncDto);
  }

  @Get("test")
  @ApiOperation({
    summary: "Test sync với mock data",
    description: "Test chức năng sync với dữ liệu giả lập",
  })
  @ApiQuery({
    name: "platform",
    enum: SyncPlatform,
    description: "Platform để test",
    required: false,
  })
  async testSync(
    @Req() req: any,
    @Query("platform") platform: SyncPlatform = SyncPlatform.FACEBOOK
  ): Promise<SyncContactsResponseDto> {
    this.logRequest("testSync", req, { platform });

    // ✅ OPTIMIZED: Sử dụng BaseSocialController
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      return {
        success: false,
        message: "Không tìm thấy thông tin người dùng",
        result: {
          platform,
          totalContacts: 0,
          cashpopUsersFound: 0,
          newFriendshipsCreated: 0,
          alreadyFriends: 0,
          errors: ["User not found"],
          details: {
            contactsProcessed: [],
            newFriends: [],
          },
        },
      };
    }

    return this.socialSyncService.testSync(user.email, platform);
  }

  @Get("history")
  @ApiOperation({
    summary: "Lịch sử đồng bộ",
    description: "Xem lịch sử các lần đồng bộ danh bạ",
  })
  async getSyncHistory(@Req() req: any): Promise<{
    success: boolean;
    message: string;
    history: any[];
  }> {
    this.logRequest("getSyncHistory", req);

    // ✅ OPTIMIZED: Sử dụng BaseSocialController
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      return {
        success: false,
        message: "Không tìm thấy thông tin người dùng",
        history: [],
      };
    }

    const history = await this.socialSyncService.getSyncHistory(user.email);

    return {
      success: true,
      message: "Lấy lịch sử đồng bộ thành công",
      history,
    };
  }
}

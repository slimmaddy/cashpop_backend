import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  SyncContactDto,
  SyncContactsResponseDto,
  SyncPlatform,
} from "../dto/syncing.dto";
import { SocialSyncService } from "../services/social-sync.service";
import { PhoneSyncService } from "../services/syncing-phone.service";
import { UserContextService } from "../services/user-context.service";
import { BaseSocialController } from "./base-social.controller";

@ApiTags("Social Sync")
@Controller("social/sync")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SyncController extends BaseSocialController {
  constructor(
    private readonly socialSyncService: SocialSyncService,
    private readonly phoneSyncService: PhoneSyncService,
    userContextService: UserContextService
  ) {
    super(userContextService);
  }

  @Post("contacts")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Đồng bộ danh bạ từ các platform",
    description:
      "Đồng bộ danh bạ từ Facebook, LINE, Phone Contact và tự động kết bạn với CashPop users",
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
      hasToken: !!(syncDto.facebook?.token || syncDto.line?.token || syncDto.phone?.sessionId),
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
    description: "Test chức năng sync với dữ liệu giả lập cho Facebook, LINE hoặc Phone",
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
    stats?: {
      totalSynced: number;
      byPlatform: Record<string, number>;
      recentSyncs: number;
      avgSyncFrequency?: number;
    };
  }> {
    this.logRequest("getSyncHistory", req);

    // ✅ OPTIMIZED: Sử dụng BaseSocialController
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      return {
        success: false,
        message: "Không tìm thấy thông tin người dùng",
        history: [],
        stats: undefined,
      };
    }

    const historyResult = await this.socialSyncService.getSyncHistory(user.email);

    return {
      success: true,
      message: "Lấy lịch sử đồng bộ thành công",
      history: historyResult.history,
      stats: historyResult.stats,
    };
  }

  @Get("test/phone/session/:sessionId")
  @ApiOperation({
    summary: "Test phone session validation",
    description: "Test endpoint để validate phone session ID trước khi sync",
  })
  async testPhoneSession(@Param("sessionId") sessionId: string): Promise<{
    success: boolean;
    message: string;
    sessionValid?: boolean;
    phoneNumber?: string;
    error?: string;
  }> {
    try {
      const result = await this.phoneSyncService.testConnection(sessionId);

      return {
        success: result.isValid,
        message: result.isValid
          ? `Phone session valid for ${result.phoneNumber}`
          : `Phone session invalid: ${result.error}`,
        sessionValid: result.isValid,
        phoneNumber: result.phoneNumber,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error.message}`,
        sessionValid: false,
        error: error.message
      };
    }
  }

  @Get("test/phone/mock-data")
  @ApiOperation({
    summary: "Get mock phone contacts",
    description: "Endpoint để lấy mock phone contacts cho testing",
  })
  @ApiQuery({
    name: "type",
    enum: ["standard", "edge-cases", "large"],
    description: "Type của mock data",
    required: false,
  })
  @ApiQuery({
    name: "count",
    type: Number,
    description: "Số lượng contacts (chỉ cho type=large)",
    required: false,
  })
  async getMockPhoneContacts(
    @Query("type") type: string = "standard",
    @Query("count") count: number = 100
  ): Promise<{
    success: boolean;
    message: string;
    contacts: any[];
    stats?: any;
  }> {
    try {
      let contacts: any[] = [];

      switch (type) {
        case "edge-cases":
          contacts = await this.phoneSyncService.getMockContactsWithEdgeCases();
          break;
        case "large":
          contacts = await this.phoneSyncService.getMockContactsLarge(Math.min(count, 1000));
          break;
        case "standard":
        default:
          contacts = await this.phoneSyncService.getMockContacts();
          break;
      }

      // Get stats for the mock data
      const stats = await this.phoneSyncService.getPhoneSyncStats(contacts);

      return {
        success: true,
        message: `Retrieved ${contacts.length} mock phone contacts (type: ${type})`,
        contacts,
        stats
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get mock data: ${error.message}`,
        contacts: [],
      };
    }
  }

  @Post("test/phone/validate-json")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Test phone contacts JSON validation",
    description: "Test endpoint để validate format của phone contacts JSON",
  })
  async testPhoneContactsValidation(@Body() body: {
    contactsJson: string;
    validatePhoneNumbers?: boolean;
    skipDuplicates?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    parsedContacts?: any[];
    validationErrors?: string[];
    stats?: any;
  }> {
    try {
      const { contactsJson, validatePhoneNumbers = true, skipDuplicates = true } = body;

      // Test session (use a known valid one)
      const testSessionId = "test-uuid-phone-session-12345678";

      // Try to process the contacts
      const processedContacts = await this.phoneSyncService.getContacts(
        testSessionId,
        contactsJson,
        {
          maxContacts: 1000,
          validatePhoneNumbers,
          skipDuplicates
        }
      );

      // Get stats
      const stats = await this.phoneSyncService.getPhoneSyncStats(processedContacts);

      return {
        success: true,
        message: `Successfully validated and processed ${processedContacts.length} contacts`,
        parsedContacts: processedContacts,
        stats
      };
    } catch (error) {
      // Parse error details
      const validationErrors = [error.message];

      return {
        success: false,
        message: `Validation failed: ${error.message}`,
        validationErrors
      };
    }
  }
}

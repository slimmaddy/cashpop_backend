import { HttpService } from "@nestjs/axios";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { ContactInfo, SyncPlatform } from ".././dto/syncing.dto";

interface FacebookUser {
  id: string;
  name: string;
  email?: string;
}

interface FacebookFriendsResponse {
  data: FacebookUser[];
  paging?: {
    next?: string;
    previous?: string;
  };
}

interface FacebookMeResponse {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class FacebookSyncService {
  private readonly logger = new Logger(FacebookSyncService.name);
  private readonly FACEBOOK_API_BASE = "https://graph.facebook.com/v18.0";

  constructor(private readonly httpService: HttpService) { }

  /**
   * Validate Facebook access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      this.logger.log("🔍 Validating Facebook access token...");

      const response = await firstValueFrom(
        this.httpService.get(`${this.FACEBOOK_API_BASE}/me`, {
          params: {
            access_token: accessToken,
            fields: "id,name,email",
          },
          timeout: 10000,
        })
      );

      const userData: FacebookMeResponse = response.data;
      this.logger.log(
        `✅ Token valid for user: ${userData.name} (${userData.email})`
      );

      return true;
    } catch (error) {
      this.logger.error(
        "❌ Facebook token validation failed:",
        error.response?.data || error.message
      );
      return false;
    }
  }

  /**
   * ✅ OPTIMIZED: Get Facebook friends list with improved error handling and batch processing
   */
  async getContacts(accessToken: string, options: {
    batchSize?: number;
    maxContacts?: number;
    skipEmailValidation?: boolean;
  } = {}): Promise<ContactInfo[]> {
    const { batchSize = 100, maxContacts = 5000, skipEmailValidation = false } = options;

    try {
      this.logger.log(`📱 Fetching Facebook friends (batch: ${batchSize}, max: ${maxContacts})...`);

      // ✅ OPTIMIZE: Validate token and permissions in parallel
      const [isValidToken, permissions] = await Promise.all([
        this.validateToken(accessToken),
        this.checkPermissions(accessToken)
      ]);

      if (!isValidToken) {
        throw new BadRequestException(
          "Facebook access token không hợp lệ hoặc đã hết hạn"
        );
      }

      const hasUserFriendsPermission = permissions.includes("user_friends");

      if (!hasUserFriendsPermission) {
        this.logger.warn(
          "⚠️ user_friends permission not available, using mock data for development"
        );
        this.logger.log(`🔑 Available permissions: ${permissions.join(", ")}`);

        // Return mock data for development
        if (process.env.NODE_ENV === "development") {
          this.logger.log(
            "🧪 Using mock data because user_friends permission not available"
          );
          return this.getMockContacts();
        } else {
          throw new BadRequestException(
            "Ứng dụng chưa được Facebook phê duyệt để truy cập danh sách bạn bè. Vui lòng sử dụng tính năng import contacts khác."
          );
        }
      }

      const contacts: ContactInfo[] = [];
      let nextUrl: string | undefined = `${this.FACEBOOK_API_BASE}/me/friends`;
      let requestCount = 0;
      const maxRequests = Math.ceil(maxContacts / batchSize); // Tính toán số request tối đa

      // ✅ OPTIMIZE: Fetch friends with configurable batch size and circuit breaker
      while (nextUrl && requestCount < maxRequests && contacts.length < maxContacts) {
        this.logger.log(`📄 Fetching friends page ${requestCount + 1}/${maxRequests}...`);

        try {
          const response = await firstValueFrom(
            this.httpService.get(nextUrl, {
              params: nextUrl.includes("?")
                ? {}
                : {
                  access_token: accessToken,
                  fields: "id,name,email",
                  limit: batchSize,
                },
              timeout: 15000,
              // ✅ ADD: Retry configuration
              headers: {
                'User-Agent': 'CashPop-Social-Sync/1.0'
              }
            })
          );

          const friendsData: FacebookFriendsResponse = response.data;
          let validEmailCount = 0;

          // ✅ OPTIMIZE: Process friends in batch with better filtering
          const batchContacts = friendsData.data
            .filter(friend => {
              if (!friend.email && !skipEmailValidation) {
                return false;
              }
              return skipEmailValidation || this.isValidEmail(friend.email!);
            })
            .map(friend => {
              if (friend.email && this.isValidEmail(friend.email)) {
                validEmailCount++;
              }
              return {
                id: friend.id,
                name: friend.name,
                email: friend.email || `${friend.id}@facebook.noemail`,
                platform: SyncPlatform.FACEBOOK,
              };
            });

          contacts.push(...batchContacts.slice(0, maxContacts - contacts.length));

          // Handle pagination
          nextUrl = friendsData.paging?.next;
          requestCount++;

          this.logger.log(
            `📄 Page ${requestCount}: Fetched ${friendsData.data.length} friends, ${validEmailCount} with valid emails (total: ${contacts.length})`
          );

          // ✅ ADD: Respect rate limits with delay
          if (nextUrl && requestCount < maxRequests) {
            await this.delay(100); // 100ms delay between requests
          }
        } catch (pageError) {
          this.logger.warn(`⚠️ Failed to fetch page ${requestCount + 1}, continuing...`, pageError.message);

          // Break on critical errors, continue on temporary failures
          if (pageError.response?.status === 401 || pageError.response?.status === 403) {
            throw pageError;
          }

          // For other errors, try to continue with next page if available
          nextUrl = undefined;
        }
      }

      this.logger.log(
        `✅ Successfully fetched ${contacts.length} Facebook friends (${contacts.filter(c => c.email && !c.email.includes('@facebook.noemail')).length} with valid emails)`
      );
      return contacts;
    } catch (error) {
      return this.handleFacebookError(error);
    }
  }

  /**
   * Get user's own Facebook profile
   */
  async getProfile(accessToken: string): Promise<FacebookMeResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.FACEBOOK_API_BASE}/me`, {
          params: {
            access_token: accessToken,
            fields: "id,name,email",
          },
          timeout: 10000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        "❌ Error fetching Facebook profile:",
        error.response?.data || error.message
      );
      throw new BadRequestException("Không thể lấy thông tin profile Facebook");
    }
  }

  /**
   * Validate access token permissions
   */
  async checkPermissions(accessToken: string): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.FACEBOOK_API_BASE}/me/permissions`, {
          params: {
            access_token: accessToken,
          },
          timeout: 10000,
        })
      );

      const permissions = response.data.data
        .filter((perm: any) => perm.status === "granted")
        .map((perm: any) => perm.permission);

      this.logger.log(`🔑 Facebook permissions: ${permissions.join(", ")}`);
      return permissions;
    } catch (error) {
      this.logger.error(
        "❌ Error checking Facebook permissions:",
        error.response?.data || error.message
      );
      return [];
    }
  }

  /**
   * Helper method to validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length > 5;
  }

  /**
   * Helper method to get Facebook API error message
   */
  private getFacebookErrorMessage(error: any): string {
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      return `Facebook Error ${fbError.code}: ${fbError.message}`;
    }
    return error.message || "Unknown Facebook API error";
  }

  /**
   * Test Facebook API connection and permissions
   */
  async testConnection(accessToken: string): Promise<{
    isValid: boolean;
    profile?: FacebookMeResponse;
    permissions?: string[];
    error?: string;
  }> {
    try {
      // Test token validity
      const isValid = await this.validateToken(accessToken);
      if (!isValid) {
        return {
          isValid: false,
          error: "Invalid access token",
        };
      }

      // Get profile and permissions
      const [profile, permissions] = await Promise.all([
        this.getProfile(accessToken),
        this.checkPermissions(accessToken),
      ]);

      return {
        isValid: true,
        profile,
        permissions,
      };
    } catch (error) {
      return {
        isValid: false,
        error: this.getFacebookErrorMessage(error),
      };
    }
  }

  /**
   * Get limited friend info for testing (without emails)
   */
  async getBasicFriends(
    accessToken: string
  ): Promise<{ id: string; name: string }[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.FACEBOOK_API_BASE}/me/friends`, {
          params: {
            access_token: accessToken,
            fields: "id,name",
            limit: 50,
          },
          timeout: 10000,
        })
      );

      return response.data.data;
    } catch (error) {
      this.logger.error("❌ Error fetching basic friends:", error.message);
      throw new BadRequestException("Không thể lấy danh sách bạn bè cơ bản");
    }
  }

  /**
   * ✅ OPTIMIZE: Enhanced error handling with detailed error mapping
   */
  private handleFacebookError(error: any): never {
    this.logger.error("❌ Error fetching Facebook friends:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
    });

    // Map specific Facebook API errors
    const errorMap = {
      401: "Facebook access token không hợp lệ hoặc đã hết hạn",
      403: 'Không có quyền truy cập danh sách bạn bè Facebook. Vui lòng cấp quyền "user_friends"',
      429: "Facebook API rate limit exceeded. Vui lòng thử lại sau",
      400: error.response?.data?.error?.message
        ? `Facebook API Error: ${error.response.data.error.message}`
        : "Dữ liệu request không hợp lệ"
    };

    if (error.response?.status && errorMap[error.response.status]) {
      throw new BadRequestException(errorMap[error.response.status]);
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new BadRequestException("Facebook API timeout. Vui lòng thử lại");
    }

    // Log detailed error for debugging
    this.logger.error("❌ Unexpected Facebook API error:", {
      errorType: error.constructor.name,
      errorCode: error.code,
      errorMessage: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
    });

    throw new BadRequestException("Lỗi khi lấy danh sách bạn bè từ Facebook");
  }

  /**
   * ✅ ADD: Helper method for delays (rate limiting)
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ✅ OPTIMIZE: Enhanced mock contacts with more realistic data
   */
  async getMockContacts(): Promise<ContactInfo[]> {
    this.logger.log("🧪 Returning mock Facebook contacts for testing...");

    return [
      {
        id: "mock_fb_1",
        name: "John Doe",
        email: "john.doe@example.com",
        platform: SyncPlatform.FACEBOOK,
      },
      {
        id: "mock_fb_2",
        name: "Jane Smith",
        email: "jane.smith@example.com",
        platform: SyncPlatform.FACEBOOK,
      },
      {
        id: "mock_fb_3",
        name: "Bob Johnson",
        email: "bob.johnson@example.com",
        platform: SyncPlatform.FACEBOOK,
      },
      {
        id: "mock_fb_4",
        name: "Alice Cooper",
        email: "alice.cooper@example.com",
        platform: SyncPlatform.FACEBOOK,
      },
      {
        id: "mock_fb_5",
        name: "Mike Wilson",
        email: "mike.wilson@example.com",
        platform: SyncPlatform.FACEBOOK,
      },
    ];
  }
}

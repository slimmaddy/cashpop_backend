import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
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

  constructor(private readonly httpService: HttpService) {}

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
   * Get Facebook friends list and convert to ContactInfo[]
   */
  async getContacts(accessToken: string): Promise<ContactInfo[]> {
    try {
      this.logger.log("📱 Fetching Facebook friends...");

      // Validate token first
      const isValidToken = await this.validateToken(accessToken);
      if (!isValidToken) {
        throw new BadRequestException(
          "Facebook access token không hợp lệ hoặc đã hết hạn"
        );
      }

      // ✅ WORKAROUND: Check if user_friends permission available
      const permissions = await this.checkPermissions(accessToken);
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
      const maxRequests = 50; // Limit to avoid infinite loops

      // Fetch friends with pagination
      while (nextUrl && requestCount < maxRequests) {
        this.logger.log(`📄 Fetching friends page ${requestCount + 1}...`);

        const response = await firstValueFrom(
          this.httpService.get(nextUrl, {
            params: nextUrl.includes("?")
              ? {}
              : {
                  access_token: accessToken,
                  fields: "id,name,email",
                  limit: 100, // Max per request
                },
            timeout: 15000,
          })
        );

        const friendsData: FacebookFriendsResponse = response.data;

        // Transform Facebook friends to ContactInfo format
        for (const friend of friendsData.data) {
          // Chỉ thêm contact nếu có email hợp lệ
          if (friend.email && this.isValidEmail(friend.email)) {
            contacts.push({
              id: friend.id,
              name: friend.name,
              email: friend.email,
              platform: SyncPlatform.FACEBOOK, // ✅ Sử dụng enum từ syncing.dto.ts
            });
          }
        }

        // Handle pagination
        nextUrl = friendsData.paging?.next;
        requestCount++;

        this.logger.log(
          `📄 Page ${requestCount}: Fetched ${friendsData.data.length} friends, ${contacts.length} with valid emails`
        );

        // Safety break to avoid too many contacts
        if (contacts.length > 5000) {
          this.logger.warn(
            "⚠️ Reached maximum friends limit (5000), stopping..."
          );
          break;
        }
      }

      this.logger.log(
        `✅ Successfully fetched ${contacts.length} Facebook friends with valid emails`
      );
      return contacts;
    } catch (error) {
      this.logger.error("❌ Error fetching Facebook friends:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
      });

      if (error.response?.status === 401) {
        throw new BadRequestException(
          "Facebook access token không hợp lệ hoặc đã hết hạn"
        );
      }

      if (error.response?.status === 403) {
        throw new BadRequestException(
          'Không có quyền truy cập danh sách bạn bè Facebook. Vui lòng cấp quyền "user_friends"'
        );
      }

      if (error.response?.status === 400) {
        const errorMessage =
          error.response?.data?.error?.message || "Lỗi Facebook API";
        throw new BadRequestException(`Facebook API Error: ${errorMessage}`);
      }

      if (error.response?.status === 429) {
        throw new BadRequestException(
          "Facebook API rate limit exceeded. Vui lòng thử lại sau"
        );
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
   * Mock method for testing when no real Facebook token
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
    ];
  }
}

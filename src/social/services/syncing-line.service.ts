import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { ContactInfo, SyncPlatform } from "../dto/syncing.dto";

interface LineUser {
  userId: string;
  displayName: string;
  email?: string;
  pictureUrl?: string;
}

interface LineContactsResponse {
  contacts: LineUser[];
  pageToken?: string;
}

interface LineProfileResponse {
  userId: string;
  displayName: string;
  email?: string;
  pictureUrl?: string;
}

@Injectable()
export class LineSyncService {
  private readonly logger = new Logger(LineSyncService.name);
  private readonly LINE_API_BASE = "https://api.line.me/v2";

  constructor(private readonly httpService: HttpService) {}

  /**
   * Validate LINE access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      this.logger.log("🔍 Validating LINE access token...");

      const response = await firstValueFrom(
        this.httpService.get(`${this.LINE_API_BASE}/profile`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        })
      );

      const userData: LineProfileResponse = response.data;
      this.logger.log(
        `✅ Token valid for user: ${userData.displayName} (${userData.userId})`
      );

      return true;
    } catch (error) {
      this.logger.error(
        "❌ LINE token validation failed:",
        error.response?.data || error.message
      );
      return false;
    }
  }

  /**
   * Get LINE contacts and convert to ContactInfo[]
   * Note: LINE doesn't provide direct access to contacts like Facebook friends
   * This implementation uses a mock approach for demonstration
   */
  async getContacts(accessToken: string): Promise<ContactInfo[]> {
    try {
      this.logger.log("📱 Fetching LINE contacts...");

      // Validate token first
      const isValidToken = await this.validateToken(accessToken);
      if (!isValidToken) {
        throw new BadRequestException(
          "LINE access token không hợp lệ hoặc đã hết hạn"
        );
      }

      // Get user profile to verify token works
      const profile = await this.getProfile(accessToken);
      this.logger.log(
        `📋 LINE user profile: ${profile.displayName} (${profile.userId})`
      );

      // LINE API doesn't provide direct access to user's contacts/friends
      // In a real implementation, you would need to:
      // 1. Use LINE Login to get user consent
      // 2. Use LINE Messaging API if the user has a bot
      // 3. Or implement a different contact sharing mechanism

      this.logger.warn(
        "⚠️ LINE API does not provide direct contact access, using mock data for development"
      );

      // Return mock data for development
      if (process.env.NODE_ENV === "development") {
        this.logger.log("🧪 Using mock LINE contacts for development");
        return this.getMockContacts();
      } else {
        throw new BadRequestException(
          "LINE contact sync requires special implementation. Please use alternative contact import methods."
        );
      }
    } catch (error) {
      this.logger.error("❌ Error fetching LINE contacts:", {
        errorType: error.constructor.name,
        errorMessage: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
      });

      return this.handleLineError(error);
    }
  }

  /**
   * Get user's own LINE profile
   */
  async getProfile(accessToken: string): Promise<LineProfileResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.LINE_API_BASE}/profile`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000,
        })
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        "❌ Error fetching LINE profile:",
        error.response?.data || error.message
      );
      throw new BadRequestException("Không thể lấy thông tin profile LINE");
    }
  }

  /**
   * Handle LINE API errors
   */
  private handleLineError(error: any): never {
    if (error instanceof BadRequestException) {
      throw error;
    }

    if (error.response?.status === 401) {
      throw new BadRequestException(
        "LINE access token không hợp lệ hoặc đã hết hạn"
      );
    }

    if (error.response?.status === 403) {
      throw new BadRequestException(
        "Không có quyền truy cập LINE API. Vui lòng kiểm tra quyền truy cập"
      );
    }

    if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.message || "Lỗi LINE API";
      throw new BadRequestException(`LINE API Error: ${errorMessage}`);
    }

    if (error.response?.status === 429) {
      throw new BadRequestException(
        "LINE API rate limit exceeded. Vui lòng thử lại sau"
      );
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new BadRequestException("LINE API timeout. Vui lòng thử lại");
    }

    // Log detailed error for debugging
    this.logger.error("❌ Unexpected LINE API error:", {
      errorType: error.constructor.name,
      errorCode: error.code,
      errorMessage: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
    });

    throw new BadRequestException("Lỗi khi lấy danh sách contacts từ LINE");
  }

  /**
   * Helper method to validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length > 5;
  }

  /**
   * Test LINE API connection
   */
  async testConnection(accessToken: string): Promise<{
    isValid: boolean;
    profile?: LineProfileResponse;
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

      // Get profile
      const profile = await this.getProfile(accessToken);

      return {
        isValid: true,
        profile,
      };
    } catch (error) {
      return {
        isValid: false,
        error: this.getLineErrorMessage(error),
      };
    }
  }

  /**
   * Helper method to get LINE API error message
   */
  private getLineErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return `LINE Error: ${error.response.data.message}`;
    }
    return error.message || "Unknown LINE API error";
  }

  /**
   * Mock method for testing when no real LINE token or for development
   */
  async getMockContacts(): Promise<ContactInfo[]> {
    this.logger.log("🧪 Returning mock LINE contacts for testing...");

    return [
      {
        id: "mock_line_1",
        name: "Alice Line",
        email: "alice.line@example.com",
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_2",
        name: "Bob Line",
        email: "bob.line@example.com",
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_3",
        name: "Carol Line",
        email: "carol.line@example.com",
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_4",
        name: "David Line",
        email: "david.line@example.com",
        platform: SyncPlatform.LINE,
      },
    ];
  }
}

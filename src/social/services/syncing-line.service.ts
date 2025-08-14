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
   * ✅ OPTIMIZED: Get LINE contacts with enhanced token validation and fallback strategies
   * Note: LINE doesn't provide direct access to contacts like Facebook friends
   * This implementation uses optimized mock approach with real profile validation
   */
  async getContacts(accessToken: string, options: {
    validateProfile?: boolean;
    maxContacts?: number;
    includeMockData?: boolean;
  } = {}): Promise<ContactInfo[]> {
    const { validateProfile = true, maxContacts = 1000, includeMockData = true } = options;
    
    try {
      this.logger.log(`📱 Fetching LINE contacts (max: ${maxContacts})...`);

      // ✅ OPTIMIZE: Validate token first, then profile if needed
      const isValidToken = await this.validateToken(accessToken);
      if (!isValidToken) {
        throw new BadRequestException(
          "LINE access token không hợp lệ hoặc đã hết hạn"
        );
      }

      // Get profile info if validation is requested
      if (validateProfile) {
        try {
          const profile = await this.getProfile(accessToken);
          this.logger.log(
            `📋 LINE user verified: ${profile.displayName} (${profile.userId})`
          );
        } catch (error) {
          this.logger.warn(`⚠️ Could not fetch profile: ${error.message}`);
          // Continue without profile info
        }
      }

      // ✅ FUTURE: Here we would implement actual LINE contact fetching methods
      // Possible approaches:
      // 1. LINE Social API (if available)
      // 2. LINE Bot API integration
      // 3. Manual contact import via QR codes
      // 4. Contact sharing through LINE Mini Apps
      
      this.logger.warn(
        "⚠️ LINE API does not provide direct contact access, using fallback strategies"
      );

      // ✅ OPTIMIZE: Return enhanced mock data for development/testing
      if (process.env.NODE_ENV === "development" && includeMockData) {
        this.logger.log("🧪 Using enhanced mock LINE contacts for development");
        const mockContacts = await this.getMockContacts();
        return mockContacts.slice(0, maxContacts);
      } else {
        throw new BadRequestException(
          "LINE contact sync requires special implementation. Please use alternative contact import methods or enable mock data for testing."
        );
      }
    } catch (error) {
      this.logger.error("❌ Error fetching LINE contacts:", {
        errorType: error.constructor.name,
        errorMessage: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        accessTokenLength: accessToken ? accessToken.length : 0
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
   * ✅ OPTIMIZE: Enhanced LINE error handling with detailed error mapping
   */
  private getLineErrorMessage(error: any): string {
    // Check for LINE-specific error responses
    if (error.response?.data?.message) {
      return `LINE Error: ${error.response.data.message}`;
    }
    
    // Check for LINE error details
    if (error.response?.data?.details) {
      return `LINE Error: ${error.response.data.details}`;
    }
    
    // Map common HTTP status codes
    const statusMessages = {
      400: "Invalid request parameters",
      401: "Invalid or expired access token", 
      403: "Insufficient permissions",
      404: "Resource not found",
      429: "Rate limit exceeded",
      500: "Internal server error",
      502: "Bad gateway",
      503: "Service unavailable"
    };
    
    if (error.response?.status && statusMessages[error.response.status]) {
      return `LINE API Error (${error.response.status}): ${statusMessages[error.response.status]}`;
    }
    
    return error.message || "Unknown LINE API error";
  }

  /**
   * ✅ ADD: Method to get LINE API rate limit information
   */
  async getRateLimitInfo(accessToken: string): Promise<{
    remaining?: number;
    resetTime?: Date;
    limit?: number;
  }> {
    try {
      // Make a lightweight API call to check rate limits
      const response = await firstValueFrom(
        this.httpService.get(`${this.LINE_API_BASE}/profile`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 5000,
        })
      );

      // Extract rate limit headers if available
      const headers = response.headers;
      return {
        remaining: headers['x-ratelimit-remaining'] ? parseInt(headers['x-ratelimit-remaining']) : undefined,
        resetTime: headers['x-ratelimit-reset'] ? new Date(parseInt(headers['x-ratelimit-reset']) * 1000) : undefined,
        limit: headers['x-ratelimit-limit'] ? parseInt(headers['x-ratelimit-limit']) : undefined,
      };
    } catch (error) {
      this.logger.warn("⚠️ Could not fetch rate limit info:", error.message);
      return {};
    }
  }

  /**
   * ✅ OPTIMIZE: Enhanced mock contacts with more realistic data and variation
   */
  async getMockContacts(): Promise<ContactInfo[]> {
    this.logger.log("🧪 Returning enhanced mock LINE contacts for testing...");

    // Simulate realistic contact data with Korean/Asian names
    return [
      {
        id: "mock_line_1",
        name: "Kim Min-jun",
        email: "minjun.kim@example.com",
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_2",
        name: "Lee So-young",
        email: "soyoung.lee@example.com", 
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_3",
        name: "Park Ji-hoon",
        email: "jihoon.park@example.com",
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_4",
        name: "Choi Ye-jin",
        email: "yejin.choi@example.com",
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_5",
        name: "Jung Tae-hyung",
        email: "taehyung.jung@example.com",
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_6",
        name: "Han Mi-rae",
        email: "mirae.han@example.com",
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_7",
        name: "Yuki Tanaka",
        email: "yuki.tanaka@example.com",
        platform: SyncPlatform.LINE,
      },
      {
        id: "mock_line_8",
        name: "Chen Wei-ming", 
        email: "weiming.chen@example.com",
        platform: SyncPlatform.LINE,
      },
    ];
  }

  /**
   * ✅ ADD: Method to simulate LINE contact sharing via QR code
   */
  async simulateQRCodeContactSharing(
    accessToken: string,
    qrCodeData: string
  ): Promise<{ success: boolean; contact?: ContactInfo; error?: string }> {
    try {
      // Validate token
      const isValid = await this.validateToken(accessToken);
      if (!isValid) {
        return { success: false, error: "Invalid access token" };
      }

      // Simulate QR code parsing
      this.logger.log("📏 Simulating LINE QR code contact sharing...");
      
      // In real implementation, you would:
      // 1. Decode QR code data
      // 2. Validate LINE user ID
      // 3. Fetch public profile if allowed
      // 4. Return contact information
      
      // Mock implementation
      const mockContact: ContactInfo = {
        id: "qr_line_" + Date.now(),
        name: "QR Contact",
        email: "qr.contact@example.com",
        platform: SyncPlatform.LINE,
      };

      return { success: true, contact: mockContact };
    } catch (error) {
      this.logger.error("❌ Error in QR contact sharing:", error.message);
      return { success: false, error: error.message };
    }
  }
}

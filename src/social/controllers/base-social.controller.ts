import { Injectable, Logger } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { UserContextService } from "../services/user-context.service";

/**
 * BaseSocialController - Base class cho tất cả social controllers
 * Centralize user context management và giảm duplicate code
 */
@Injectable()
export abstract class BaseSocialController {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly userContextService: UserContextService) {}

  /**
   * Lấy user từ JWT request với caching và error handling
   */
  protected async getUserFromRequest(req: any): Promise<{
    user: User | null;
    error?: string;
  }> {
    this.logger.debug(`🔍 Getting user from request: ${req.user?.userId}`);

    if (!req.user?.userId) {
      this.logger.warn("❌ No userId in JWT payload");
      return {
        user: null,
        error: "Invalid authentication token",
      };
    }

    const user = await this.userContextService.getUserFromJWT(req.user);

    if (!user) {
      this.logger.warn(`❌ User not found with userId: ${req.user.userId}`);
      return {
        user: null,
        error: "User not found",
      };
    }

    this.logger.debug(`✅ User found: ${user.email}`);
    return { user };
  }

  /**
   * Standard error response cho user not found
   */
  protected createUserNotFoundResponse<T>(defaultValue: T): T {
    this.logger.warn("❌ Returning default response due to user not found");
    return defaultValue;
  }

  /**
   * Log request info cho debugging
   */
  protected logRequest(
    methodName: string,
    req: any,
    additionalData?: any
  ): void {
    this.logger.debug(`🚀 ${methodName}:`, {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      ...additionalData,
    });
  }

  /**
   * Validate pagination parameters
   */
  protected validatePagination(
    page?: number,
    limit?: number
  ): { page: number; limit: number; skip: number } {
    const validPage = Math.max(1, page || 1);
    const validLimit = Math.min(100, Math.max(1, limit || 20)); // Max 100 items per page
    const skip = (validPage - 1) * validLimit;

    return { page: validPage, limit: validLimit, skip };
  }

  /**
   * Create standard success response
   */
  protected createSuccessResponse<T>(
    data: T,
    message?: string
  ): {
    success: boolean;
    message: string;
    data: T;
  } {
    return {
      success: true,
      message: message || "Operation completed successfully",
      data,
    };
  }

  /**
   * Create standard error response
   */
  protected createErrorResponse(
    message: string,
    error?: any
  ): {
    success: boolean;
    message: string;
    error?: any;
  } {
    this.logger.error(`❌ Error response: ${message}`, error);
    return {
      success: false,
      message,
      error: process.env.NODE_ENV === "development" ? error : undefined,
    };
  }
}

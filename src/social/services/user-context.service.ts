import { Injectable, Logger } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { UsersService } from "../../users/users.service";
import { UserLookupService } from "./user-lookup.service";

/**
 * UserContextService - Centralize user context management và caching
 * Giải quyết vấn đề duplicate user lookups trong controllers
 */
@Injectable()
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);
  private readonly userCache = new Map<string, User>();
  private readonly cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly usersService: UsersService,
    private readonly userLookupService: UserLookupService
  ) {}

  /**
   * Lấy user từ JWT payload với caching
   */
  async getUserFromJWT(jwtPayload: any): Promise<User | null> {
    if (!jwtPayload?.userId) {
      this.logger.warn("❌ No userId in JWT payload");
      return null;
    }

    const cacheKey = `jwt:${jwtPayload.userId}`;

    // Check cache first
    const cachedUser = this.getCachedUser(cacheKey);
    if (cachedUser) {
      this.logger.debug(`✅ User cache hit for ${jwtPayload.userId}`);
      return cachedUser;
    }

    // Fetch from database
    const user = await this.usersService.findById(jwtPayload.userId);
    if (user) {
      this.setCachedUser(cacheKey, user);
      this.logger.debug(`✅ User loaded and cached: ${user.email}`);
    } else {
      this.logger.warn(`❌ User not found with userId: ${jwtPayload.userId}`);
    }

    return user;
  }

  /**
   * Lấy user theo email với caching
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;

    const cacheKey = `email:${email}`;

    // Check cache first
    const cachedUser = this.getCachedUser(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    // Fetch from UserLookupService
    const user = await this.userLookupService.getUserByEmail(email);
    if (user) {
      this.setCachedUser(cacheKey, user);
    }

    return user;
  }

  /**
   * Batch load users theo emails với caching
   */
  async getUsersByEmails(emails: string[]): Promise<Map<string, User>> {
    if (emails.length === 0) return new Map();

    const result = new Map<string, User>();
    const uncachedEmails: string[] = [];

    // Check cache for each email
    for (const email of emails) {
      const cacheKey = `email:${email}`;
      const cachedUser = this.getCachedUser(cacheKey);
      if (cachedUser) {
        result.set(email, cachedUser);
      } else {
        uncachedEmails.push(email);
      }
    }

    // Batch fetch uncached users
    if (uncachedEmails.length > 0) {
      const userMap = await this.userLookupService.getUsersByEmails(
        uncachedEmails
      );

      // Cache the fetched users
      userMap.forEach((user, email) => {
        const cacheKey = `email:${email}`;
        this.setCachedUser(cacheKey, user);
        result.set(email, user);
      });
    }

    this.logger.debug(
      `👥 Batch loaded ${emails.length} users: ${result.size} found, ${
        emails.length - result.size
      } not found`
    );
    return result;
  }

  /**
   * Invalidate cache cho user
   */
  invalidateUserCache(userId?: string, email?: string): void {
    if (userId) {
      const jwtKey = `jwt:${userId}`;
      this.userCache.delete(jwtKey);
      this.cacheExpiry.delete(jwtKey);
    }

    if (email) {
      const emailKey = `email:${email}`;
      this.userCache.delete(emailKey);
      this.cacheExpiry.delete(emailKey);
    }

    this.logger.debug(
      `🗑️ Cache invalidated for userId: ${userId}, email: ${email}`
    );
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        this.userCache.delete(key);
        this.cacheExpiry.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.debug(`🧹 Cleared ${cleared} expired cache entries`);
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.userCache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
    };
  }

  // Private helper methods
  private getCachedUser(key: string): User | null {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.userCache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }

    return this.userCache.get(key) || null;
  }

  private setCachedUser(key: string, user: User): void {
    this.userCache.set(key, user);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }
}

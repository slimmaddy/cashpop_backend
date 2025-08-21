import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { UsersService } from "../../users/users.service";
import { ContactInfo } from "../dto/syncing.dto";

/**
 * UserContextService - Consolidated user context management với caching
 * Combines UserLookupService functionality để giảm duplicate code
 */
@Injectable()
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);
  private readonly userCache = new Map<string, User>();
  private readonly cacheExpiry = new Map<string, number>();
  private readonly hitStats = { hits: 0, misses: 0 };
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) { }

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
    if (!email || !email.trim()) return null;

    const cacheKey = `email:${email}`;

    // Check cache first
    const cachedUser = this.getCachedUser(cacheKey);
    if (cachedUser) {
      this.hitStats.hits++;
      return cachedUser;
    }

    // Fetch from database
    this.hitStats.misses++;
    const user = await this.userRepository.findOne({
      where: { email: email.trim() },
      select: ["id", "email", "name", "username", "avatar"],
    });

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

    // Filter out empty emails and duplicates
    const validEmails = [...new Set(emails.filter(email => email && email.trim()))];
    if (validEmails.length === 0) return new Map();

    const result = new Map<string, User>();
    const uncachedEmails: string[] = [];

    // Check cache for each email
    for (const email of validEmails) {
      const cacheKey = `email:${email}`;
      const cachedUser = this.getCachedUser(cacheKey);
      if (cachedUser) {
        this.hitStats.hits++;
        result.set(email, cachedUser);
      } else {
        this.hitStats.misses++;
        uncachedEmails.push(email);
      }
    }

    // Batch fetch uncached users
    if (uncachedEmails.length > 0) {
      const users = await this.userRepository.find({
        where: { email: In(uncachedEmails) },
        select: ["id", "email", "name", "username", "avatar"],
      });

      // Cache the fetched users
      users.forEach(user => {
        const cacheKey = `email:${user.email}`;
        this.setCachedUser(cacheKey, user);
        result.set(user.email, user);
      });
    }

    this.logger.debug(
      `👥 Batch loaded ${validEmails.length} users: ${result.size} found, ${validEmails.length - result.size
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
   * ✅ CONSOLIDATED: Tìm CashPop users từ danh sách emails
   */
  async findCashpopUsersByEmails(emails: string[]): Promise<User[]> {
    const userMap = await this.getUsersByEmails(emails);
    return Array.from(userMap.values());
  }

  /**
   * ✅ CONSOLIDATED: Tìm CashPop users từ danh sách contacts  
   */
  async findCashpopUsersFromContacts(contacts: ContactInfo[]): Promise<User[]> {
    const emails = contacts
      .filter((contact) => contact.email)
      .map((contact) => contact.email);

    return this.findCashpopUsersByEmails(emails);
  }

  /**
   * ✅ CONSOLIDATED: Kiểm tra user có tồn tại theo email
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    if (!email || !email.trim()) return false;

    // Try cache first
    const user = await this.getUserByEmail(email);
    return user !== null;
  }

  /**
   * Get cache stats with hit rate
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    hits: number;
    misses: number;
    expiredEntries: number;
  } {
    const total = this.hitStats.hits + this.hitStats.misses;
    const hitRate = total > 0 ? (this.hitStats.hits / total) * 100 : 0;

    // Count expired entries
    const now = Date.now();
    let expiredEntries = 0;
    for (const expiry of this.cacheExpiry.values()) {
      if (now > expiry) expiredEntries++;
    }

    return {
      size: this.userCache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      hits: this.hitStats.hits,
      misses: this.hitStats.misses,
      expiredEntries
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

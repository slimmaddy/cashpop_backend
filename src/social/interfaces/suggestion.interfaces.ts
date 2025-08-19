import { SuggestionSource } from '../entities/suggestion.entity';
import { ContactInfo } from '../dto/syncing.dto';
import { User } from '../../users/entities/user.entity';

/**
 * 🎯 Core interfaces cho suggestion system
 * Fresher sẽ dễ hiểu hơn khi có clear contracts
 */

/**
 * Suggestion data cơ bản trước khi save vào DB
 * 
 * @interface SuggestionCandidate
 * @description Đại diện cho một suggestion candidate trước khi được persist vào database.
 * Chứa tất cả thông tin cần thiết để tạo một friend suggestion.
 * 
 * @example
 * ```typescript
 * const candidate: SuggestionCandidate = {
 *   userEmail: "user@example.com",
 *   suggestedUserEmail: "friend@example.com", 
 *   source: SuggestionSource.CONTACT,
 *   reason: "Found in your contacts • 2 mutual friends",
 *   mutualFriendsCount: 2,
 *   metadata: {
 *     contactName: "John Doe",
 *     mutualFriends: ["Alice", "Bob"]
 *   },
 *   priority: 7
 * };
 * ```
 */
export interface SuggestionCandidate {
  /** Email của user nhận suggestion */
  userEmail: string;
  
  /** Email của user được suggest */
  suggestedUserEmail: string;
  
  /** Source của suggestion (contact, facebook, mutual_friends, etc.) */
  source: SuggestionSource;
  
  /** Lý do suggest (hiển thị cho user) */
  reason: string;
  
  /** Số lượng mutual friends */
  mutualFriendsCount: number;
  
  /** Metadata bổ sung (tên trong contact, mutual friends list, etc.) */
  metadata?: Record<string, any>;
  
  /** Priority score 1-10, cao hơn = quan trọng hơn */
  priority?: number;
}

/**
 * Kết quả tính toán mutual friends
 */
export interface MutualFriendsResult {
  count: number;
  friendNames: string[];
  userIds: string[];
}

/**
 * Context khi tạo suggestions
 */
export interface SuggestionContext {
  userEmail: string;
  excludeExisting?: boolean; // Skip existing relationships
  maxSuggestions?: number;
  minMutualFriends?: number;
}

/**
 * Kết quả của strategy
 */
export interface SuggestionStrategyResult {
  candidates: SuggestionCandidate[];
  processed: number;
  skipped: number;
  errors: string[];
}

/**
 * 🔑 Main interface mà mọi strategy phải implement
 * 
 * @interface ISuggestionStrategy
 * @description Strategy Pattern - mỗi source có cách tạo suggestion khác nhau.
 * Fresher có thể extend interface này để implement suggestion logic cho new sources.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class FacebookSuggestionStrategy implements ISuggestionStrategy {
 *   readonly source = SuggestionSource.FACEBOOK;
 * 
 *   async generateCandidates(context: SuggestionContext, data: FacebookSyncData): Promise<SuggestionStrategyResult> {
 *     // Implementation logic here
 *     return { candidates: [], processed: 0, skipped: 0, errors: [] };
 *   }
 * 
 *   validateCandidate(candidate: SuggestionCandidate): boolean {
 *     return true; // Custom validation logic
 *   }
 * 
 *   calculatePriority(candidate: SuggestionCandidate): number {
 *     return 5; // Custom priority calculation
 *   }
 * }
 * ```
 */
export interface ISuggestionStrategy {
  /**
   * Loại source mà strategy này handle
   * @readonly
   */
  readonly source: SuggestionSource;

  /**
   * Tạo suggestion candidates từ data source
   * 
   * @param context - User context và options (userEmail, limits, filters)
   * @param data - Data specific cho strategy (contacts, tokens, etc.)
   * @returns Promise với list candidates và statistics
   * 
   * @throws {InvalidCandidateException} Nếu context hoặc data invalid
   * @throws {SuggestionDataException} Nếu data processing fails
   */
  generateCandidates(
    context: SuggestionContext,
    data: any
  ): Promise<SuggestionStrategyResult>;

  /**
   * Validate candidate có hợp lệ không
   * 
   * @param candidate - Candidate cần validate
   * @returns true nếu candidate valid, false otherwise
   * 
   * @example
   * ```typescript
   * const isValid = strategy.validateCandidate({
   *   userEmail: "user@example.com",
   *   suggestedUserEmail: "friend@example.com",
   *   source: SuggestionSource.CONTACT,
   *   reason: "Found in contacts",
   *   mutualFriendsCount: 0
   * }); // Returns true if valid
   * ```
   */
  validateCandidate(candidate: SuggestionCandidate): boolean;

  /**
   * Calculate priority cho candidate (1-10)
   * 
   * @param candidate - Candidate cần tính priority
   * @returns Priority score từ 1-10, higher = more important
   * 
   * @example
   * ```typescript
   * const priority = strategy.calculatePriority(candidate);
   * // Returns 7 for high-priority suggestion
   * // Returns 3 for low-priority suggestion
   * ```
   */
  calculatePriority(candidate: SuggestionCandidate): number;
}

/**
 * 📊 Service tính toán mutual friends
 * Tách riêng để dễ test và reuse
 */
export interface IMutualFriendsCalculator {
  /**
   * Tính số mutual friends giữa 2 users
   */
  calculateMutualFriends(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<MutualFriendsResult>;

  /**
   * Batch calculate cho nhiều users cùng lúc
   * Performance optimization
   */
  batchCalculateMutualFriends(
    userEmail: string,
    suggestedUserEmails: string[]
  ): Promise<Map<string, MutualFriendsResult>>;
}

/**
 * 🏆 Service ranking suggestions
 */
export interface ISuggestionRanking {
  /**
   * Rank list candidates theo multiple criteria
   */
  rankCandidates(candidates: SuggestionCandidate[]): SuggestionCandidate[];

  /**
   * Calculate overall score cho 1 candidate
   */
  calculateScore(candidate: SuggestionCandidate): number;
}

/**
 * ✅ Service validation
 */
export interface ISuggestionValidator {
  /**
   * Validate candidate có valid không
   */
  validateCandidate(candidate: SuggestionCandidate): Promise<ValidationResult>;

  /**
   * Check duplicate suggestions
   */
  checkDuplicate(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<boolean>;

  /**
   * Check existing relationship
   */
  checkExistingRelationship(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<boolean>;
}

/**
 * Kết quả validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 🎯 Main orchestrator interface
 * Coordinate các strategies và services
 */
export interface ISuggestionOrchestrator {
  /**
   * Generate suggestions từ multiple sources
   */
  generateSuggestions(
    context: SuggestionContext,
    sources: SuggestionSource[]
  ): Promise<SuggestionCandidate[]>;

  /**
   * Process và save suggestions vào DB
   */
  processSuggestions(
    candidates: SuggestionCandidate[]
  ): Promise<{ created: number; skipped: number; errors: string[] }>;
}
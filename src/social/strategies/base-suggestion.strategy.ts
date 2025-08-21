import { Logger } from '@nestjs/common';
import { SuggestionSource } from '../entities/suggestion.entity';
import { InvalidCandidateException } from '../exceptions/suggestion.exceptions';
import {
  ISuggestionStrategy,
  SuggestionCandidate,
  SuggestionContext,
  SuggestionStrategyResult
} from '../interfaces/suggestion.interfaces';

/**
 * 🏗️ Base strategy class với common functionality
 * Fresher chỉ cần extend và implement generateCandidates()
 */
export abstract class BaseSuggestionStrategy implements ISuggestionStrategy {
  protected readonly logger = new Logger(this.constructor.name);

  abstract readonly source: SuggestionSource;

  /**
   * 🎯 Abstract method mà subclass phải implement
   * Đây là core business logic của mỗi strategy
   */
  abstract generateCandidates(
    context: SuggestionContext,
    data: any
  ): Promise<SuggestionStrategyResult>;

  /**
   * ✅ Default validation logic
   * Subclass có thể override nếu cần custom validation
   */
  validateCandidate(candidate: SuggestionCandidate): boolean {
    try {
      // Basic validations
      if (!candidate.userEmail || !candidate.suggestedUserEmail) {
        this.logger.warn('Missing required emails', candidate);
        return false;
      }

      if (candidate.userEmail === candidate.suggestedUserEmail) {
        this.logger.warn('Cannot suggest self as friend', candidate);
        return false;
      }

      if (!this.isValidEmail(candidate.userEmail) || !this.isValidEmail(candidate.suggestedUserEmail)) {
        this.logger.warn('Invalid email format', candidate);
        return false;
      }

      if (!candidate.source || !candidate.reason) {
        this.logger.warn('Missing source or reason', candidate);
        return false;
      }

      if (candidate.mutualFriendsCount < 0) {
        this.logger.warn('Invalid mutual friends count', candidate);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Validation error:', error);
      return false;
    }
  }

  /**
   * 🏆 Default priority calculation
   * Subclass có thể override để custom priority logic
   */
  calculatePriority(candidate: SuggestionCandidate): number {
    // Default priority logic based on mutual friends
    let priority = 5; // Base priority

    // Mutual friends boost
    if (candidate.mutualFriendsCount > 0) {
      priority += Math.min(candidate.mutualFriendsCount * 0.5, 3); // Max +3 points
    }

    // Source-specific priority
    priority += this.getSourcePriorityBoost();

    // Custom metadata boost
    if (candidate.metadata?.highPriority) {
      priority += 1;
    }

    // Ensure priority is within 1-10 range
    return Math.max(1, Math.min(10, Math.round(priority)));
  }

  /**
   * 🎯 Helper method để create suggestion candidate
   * Standardized way để tạo candidates
   */
  protected createCandidate(
    userEmail: string,
    suggestedUserEmail: string,
    reason: string,
    mutualFriendsCount: number = 0,
    metadata?: Record<string, any>
  ): SuggestionCandidate {
    const candidate: SuggestionCandidate = {
      userEmail,
      suggestedUserEmail,
      source: this.source,
      reason,
      mutualFriendsCount,
      metadata: {
        createdBy: this.constructor.name,
        createdAt: new Date().toISOString(),
        ...metadata
      }
    };

    // Auto-calculate priority
    candidate.priority = this.calculatePriority(candidate);

    return candidate;
  }

  /**
   * 📊 Helper method to create empty result
   */
  protected createEmptyResult(): SuggestionStrategyResult {
    return {
      candidates: [],
      processed: 0,
      skipped: 0,
      errors: []
    };
  }

  /**
   * 📊 Helper method to create result
   */
  protected createResult(
    candidates: SuggestionCandidate[],
    processed: number,
    skipped: number = 0,
    errors: string[] = []
  ): SuggestionStrategyResult {
    return {
      candidates,
      processed,
      skipped,
      errors
    };
  }

  /**
   * 🔍 Validate context có đầy đủ không
   */
  protected validateContext(context: SuggestionContext): void {
    if (!context.userEmail) {
      throw new InvalidCandidateException('User email is required in context');
    }

    if (!this.isValidEmail(context.userEmail)) {
      throw new InvalidCandidateException('Invalid user email format in context');
    }
  }

  /**
   * 📧 Helper để validate email format
   * Protected để subclasses có thể sử dụng
   */
  protected isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 🎯 Get priority boost based on source type
   * Subclass có thể override để custom source priority
   */
  protected getSourcePriorityBoost(): number {
    switch (this.source) {
      case SuggestionSource.MUTUAL_FRIENDS:
        return 2; // High priority
      case SuggestionSource.CONTACT:
        return 1; // Medium priority
      case SuggestionSource.FACEBOOK:
      case SuggestionSource.LINE:
        return 1.5; // Medium-high priority
      default:
        return 0; // No boost
    }
  }

  /**
   * 📝 Log strategy execution
   */
  protected logExecution(
    context: SuggestionContext,
    result: SuggestionStrategyResult,
    executionTime: number
  ): void {
    this.logger.log(`Strategy ${this.source} completed:`, {
      userEmail: context.userEmail,
      candidatesGenerated: result.candidates.length,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors.length,
      executionTime: `${executionTime}ms`
    });
  }
}
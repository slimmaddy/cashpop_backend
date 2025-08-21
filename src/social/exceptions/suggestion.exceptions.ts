import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * 🚨 Custom exceptions cho suggestion system
 * Fresher sẽ dễ debug hơn khi có specific error types
 */

/**
 * Base exception cho suggestion errors
 */
export abstract class SuggestionException extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * Convert to NestJS exception
   */
  abstract toNestException(): Error;
}

/**
 * Khi strategy không tìm thấy
 */
export class StrategyNotFoundException extends SuggestionException {
  readonly code = 'STRATEGY_NOT_FOUND';
  readonly statusCode = 404;

  constructor(source: string, context?: Record<string, any>) {
    super(`Strategy not found for source: ${source}`, context);
  }

  toNestException(): Error {
    return new NotFoundException(this.message);
  }
}

/**
 * Khi validation candidate thất bại
 */
export class InvalidCandidateException extends SuggestionException {
  readonly code = 'INVALID_CANDIDATE';
  readonly statusCode = 400;

  constructor(reason: string, candidate?: any, context?: Record<string, any>) {
    super(`Invalid suggestion candidate: ${reason}`, { ...context, candidate });
  }

  toNestException(): Error {
    return new BadRequestException(this.message);
  }
}

/**
 * Khi mutual friends calculation fails
 */
export class MutualFriendsCalculationException extends SuggestionException {
  readonly code = 'MUTUAL_FRIENDS_CALC_FAILED';
  readonly statusCode = 500;

  constructor(userEmail: string, suggestedUserEmail: string, originalError?: Error) {
    super(
      `Failed to calculate mutual friends between ${userEmail} and ${suggestedUserEmail}`,
      { userEmail, suggestedUserEmail, originalError: originalError?.message }
    );
  }

  toNestException(): Error {
    return new BadRequestException(this.message);
  }
}

/**
 * Khi suggestion data invalid
 */
export class SuggestionDataException extends SuggestionException {
  readonly code = 'SUGGESTION_DATA_INVALID';
  readonly statusCode = 400;

  constructor(field: string, value: any, expectedType: string) {
    super(`Invalid suggestion data: ${field} expected ${expectedType}, got ${typeof value}`);
  }

  toNestException(): Error {
    return new BadRequestException(this.message);
  }
}

/**
 * Khi operation limit exceeded
 */
export class SuggestionLimitExceededException extends SuggestionException {
  readonly code = 'SUGGESTION_LIMIT_EXCEEDED';
  readonly statusCode = 429;

  constructor(limit: number, attempted: number) {
    super(`Suggestion limit exceeded: attempted ${attempted}, limit ${limit}`);
  }

  toNestException(): Error {
    return new BadRequestException(this.message);
  }
}
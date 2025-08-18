import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import {
  BulkAcceptFriendRequestDto,
  BulkOperationResponseDto,
  BulkOperationResult,
  BulkRejectFriendRequestDto,
  BulkSendFriendRequestDto
} from "../dto/bulk-operations.dto";
import {
  Relationship,
  RelationshipStatus,
} from "../entities/relationship.entity";
import {
  Suggestion,
  SuggestionSource,
  SuggestionStatus,
} from "../entities/suggestion.entity";
import { RelationshipService } from "./relationship.service";

/**
 * BulkOperationsService - Tối ưu hóa operations với bulk processing
 * Giải quyết performance issues với large datasets
 */
@Injectable()
export class BulkOperationsService {
  private readonly logger = new Logger(BulkOperationsService.name);

  constructor(
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
    @InjectRepository(Suggestion)
    private readonly suggestionRepository: Repository<Suggestion>,
    private readonly dataSource: DataSource,
    private readonly relationshipService: RelationshipService
  ) { }

  /**
   * Bulk create relationships (optimized cho sync)
   */
  async bulkCreateRelationships(
    relationshipData: Array<{
      userEmail: string;
      friendEmail: string;
      message: string;
      initiatedBy: string;
    }>
  ): Promise<{ created: number; errors: string[] }> {
    if (relationshipData.length === 0) {
      return { created: 0, errors: [] };
    }

    const errors: string[] = [];
    let created = 0;

    // Use transaction for consistency
    await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const relationshipsToCreate: Relationship[] = [];

      // Prepare bidirectional relationships
      for (const data of relationshipData) {
        // Primary relationship
        relationshipsToCreate.push(
          manager.create(Relationship, {
            userEmail: data.userEmail,
            friendEmail: data.friendEmail,
            status: RelationshipStatus.ACCEPTED,
            initiatedBy: data.initiatedBy,
            message: data.message,
            acceptedAt: now,
          })
        );

        // Reverse relationship
        relationshipsToCreate.push(
          manager.create(Relationship, {
            userEmail: data.friendEmail,
            friendEmail: data.userEmail,
            status: RelationshipStatus.ACCEPTED,
            initiatedBy: data.initiatedBy,
            message: data.message,
            acceptedAt: now,
          })
        );
      }

      try {
        // Bulk insert với conflict handling
        await manager
          .createQueryBuilder()
          .insert()
          .into(Relationship)
          .values(relationshipsToCreate)
          .orIgnore() // Skip duplicates
          .execute();

        created = relationshipData.length;
        this.logger.log(
          `✅ Bulk created ${created} bidirectional relationships`
        );
      } catch (error) {
        this.logger.error("❌ Bulk relationship creation failed:", error);
        errors.push(`Bulk creation failed: ${error.message}`);
      }
    });

    return { created, errors };
  }

  /**
   * Bulk create suggestions (optimized cho sync)
   */
  async bulkCreateSuggestions(
    suggestionData: Array<{
      userEmail: string;
      suggestedUserEmail: string;
      source: SuggestionSource;
      reason: string;
      mutualFriendsCount: number;
      metadata: any;
    }>
  ): Promise<{ created: number; errors: string[] }> {
    if (suggestionData.length === 0) {
      return { created: 0, errors: [] };
    }

    const errors: string[] = [];
    let created = 0;

    try {
      const suggestions = suggestionData.map((data) =>
        this.suggestionRepository.create({
          userEmail: data.userEmail,
          suggestedUserEmail: data.suggestedUserEmail,
          source: data.source,
          status: SuggestionStatus.ACTIVE,
          reason: data.reason,
          mutualFriendsCount: data.mutualFriendsCount,
          metadata: data.metadata,
        })
      );

      // Bulk insert với conflict handling
      const result = await this.suggestionRepository
        .createQueryBuilder()
        .insert()
        .values(suggestions)
        .orIgnore() // Skip duplicates
        .execute();

      created = result.identifiers.length;
      this.logger.log(`✅ Bulk created ${created} suggestions`);
    } catch (error) {
      this.logger.error("❌ Bulk suggestion creation failed:", error);
      errors.push(`Bulk creation failed: ${error.message}`);
    }

    return { created, errors };
  }

  /**
   * Bulk check existing relationships (optimized lookup)
   */
  async bulkCheckExistingRelationships(
    userEmail: string,
    friendEmails: string[]
  ): Promise<Map<string, Relationship>> {
    if (friendEmails.length === 0) {
      return new Map();
    }

    const relationships = await this.relationshipRepository
      .createQueryBuilder("relationship")
      .where("relationship.userEmail = :userEmail", { userEmail })
      .andWhere("relationship.friendEmail IN (:...friendEmails)", {
        friendEmails,
      })
      .getMany();

    const relationshipMap = new Map<string, Relationship>();
    relationships.forEach((rel) => {
      relationshipMap.set(rel.friendEmail, rel);
    });

    this.logger.debug(
      `🔍 Bulk checked ${friendEmails.length} relationships, found ${relationships.length} existing`
    );
    return relationshipMap;
  }

  /**
   * Bulk check existing suggestions (optimized lookup)
   */
  async bulkCheckExistingSuggestions(
    userEmail: string,
    suggestedEmails: string[]
  ): Promise<Map<string, Suggestion>> {
    if (suggestedEmails.length === 0) {
      return new Map();
    }

    const suggestions = await this.suggestionRepository
      .createQueryBuilder("suggestion")
      .where("suggestion.userEmail = :userEmail", { userEmail })
      .andWhere("suggestion.suggestedUserEmail IN (:...suggestedEmails)", {
        suggestedEmails,
      })
      .andWhere("suggestion.status = :status", {
        status: SuggestionStatus.ACTIVE,
      })
      .getMany();

    const suggestionMap = new Map<string, Suggestion>();
    suggestions.forEach((sug) => {
      suggestionMap.set(sug.suggestedUserEmail, sug);
    });

    this.logger.debug(
      `🔍 Bulk checked ${suggestedEmails.length} suggestions, found ${suggestions.length} existing`
    );
    return suggestionMap;
  }

  /**
   * Get bulk mutual friends count (optimized với single query)
   */
  async bulkGetMutualFriendsCount(
    userEmail: string,
    targetEmails: string[]
  ): Promise<Map<string, number>> {
    if (targetEmails.length === 0) {
      return new Map();
    }

    const query = `
      SELECT 
        r2.user_email as target_email,
        COUNT(DISTINCT r1.friend_email) as mutual_count
      FROM relationships r1
      INNER JOIN relationships r2 ON r1.friend_email = r2.friend_email
      WHERE r1.user_email = $1 
        AND r2.user_email = ANY($2)
        AND r1.status = 'accepted'
        AND r2.status = 'accepted'
        AND r1.friend_email != $1
        AND r1.friend_email != r2.user_email
      GROUP BY r2.user_email
    `;

    const results = await this.relationshipRepository.query(query, [
      userEmail,
      targetEmails,
    ]);

    const mutualCountMap = new Map<string, number>();
    results.forEach((row: any) => {
      mutualCountMap.set(row.target_email, parseInt(row.mutual_count || "0"));
    });

    // Set 0 for emails không có mutual friends
    targetEmails.forEach((email) => {
      if (!mutualCountMap.has(email)) {
        mutualCountMap.set(email, 0);
      }
    });

    this.logger.debug(
      `🔍 Bulk calculated mutual friends for ${targetEmails.length} users`
    );
    return mutualCountMap;
  }

  /**
   * Cleanup expired suggestions (maintenance task)
   */
  async cleanupExpiredSuggestions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.suggestionRepository
      .createQueryBuilder()
      .delete()
      .where("status = :status", { status: SuggestionStatus.DISMISSED })
      .andWhere("updatedAt < :cutoffDate", { cutoffDate })
      .execute();

    this.logger.log(`🧹 Cleaned up ${result.affected} expired suggestions`);
    return result.affected || 0;
  }

  /**
   * ✅ BULK API: Send friend requests to multiple users
   */
  async bulkSendFriendRequests(
    userEmail: string,
    dto: BulkSendFriendRequestDto
  ): Promise<BulkOperationResponseDto> {
    this.logger.log(`🚀 Bulk sending ${dto.friendEmails.length} friend requests from ${userEmail}`);

    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(dto.friendEmails, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(async (friendEmail) => {
        try {
          const result = await this.relationshipService.sendFriendRequest(userEmail, {
            friendEmail,
            message: dto.message
          });

          const success: BulkOperationResult = {
            email: friendEmail,
            success: true,
            message: "Friend request sent successfully"
          };

          successCount++;
          return success;
        } catch (error) {
          const failure: BulkOperationResult = {
            email: friendEmail,
            success: false,
            message: "Failed to send friend request",
            error: error.message || "Unknown error"
          };

          failureCount++;
          this.logger.warn(`Failed to send friend request to ${friendEmail}: ${error.message}`);
          return failure;
        }
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    const response: BulkOperationResponseDto = {
      success: failureCount === 0,
      message: `Bulk friend requests completed: ${successCount}/${dto.friendEmails.length} successful`,
      successCount,
      failureCount,
      total: dto.friendEmails.length,
      results
    };

    this.logger.log(`✅ Bulk send completed: ${successCount} success, ${failureCount} failed`);
    return response;
  }

  /**
   * ✅ BULK API: Accept multiple friend requests
   */
  async bulkAcceptFriendRequests(
    userEmail: string,
    dto: BulkAcceptFriendRequestDto
  ): Promise<BulkOperationResponseDto> {
    this.logger.log(`🚀 Bulk accepting ${dto.requestIds.length} friend requests for ${userEmail}`);

    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process in parallel with concurrency limit
    const concurrencyLimit = 10;
    const chunks = this.chunkArray(dto.requestIds, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(async (requestId) => {
        try {
          const result = await this.relationshipService.acceptFriendRequest(userEmail, requestId);

          const success: BulkOperationResult = {
            requestId,
            success: true,
            message: "Friend request accepted successfully"
          };

          successCount++;
          return success;
        } catch (error) {
          const failure: BulkOperationResult = {
            requestId,
            success: false,
            message: "Failed to accept friend request",
            error: error.message || "Unknown error"
          };

          failureCount++;
          this.logger.warn(`Failed to accept friend request ${requestId}: ${error.message}`);
          return failure;
        }
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    const response: BulkOperationResponseDto = {
      success: failureCount === 0,
      message: `Bulk accept completed: ${successCount}/${dto.requestIds.length} successful`,
      successCount,
      failureCount,
      total: dto.requestIds.length,
      results
    };

    this.logger.log(`✅ Bulk accept completed: ${successCount} success, ${failureCount} failed`);
    return response;
  }

  /**
   * ✅ BULK API: Reject multiple friend requests
   */
  async bulkRejectFriendRequests(
    userEmail: string,
    dto: BulkRejectFriendRequestDto
  ): Promise<BulkOperationResponseDto> {
    this.logger.log(`🚀 Bulk rejecting ${dto.requestIds.length} friend requests for ${userEmail}`);

    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process in parallel with concurrency limit
    const concurrencyLimit = 10;
    const chunks = this.chunkArray(dto.requestIds, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(async (requestId) => {
        try {
          const result = await this.relationshipService.rejectFriendRequest(userEmail, requestId);

          const success: BulkOperationResult = {
            requestId,
            success: true,
            message: "Friend request rejected successfully"
          };

          successCount++;
          return success;
        } catch (error) {
          const failure: BulkOperationResult = {
            requestId,
            success: false,
            message: "Failed to reject friend request",
            error: error.message || "Unknown error"
          };

          failureCount++;
          this.logger.warn(`Failed to reject friend request ${requestId}: ${error.message}`);
          return failure;
        }
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    const response: BulkOperationResponseDto = {
      success: failureCount === 0,
      message: `Bulk reject completed: ${successCount}/${dto.requestIds.length} successful`,
      successCount,
      failureCount,
      total: dto.requestIds.length,
      results
    };

    this.logger.log(`✅ Bulk reject completed: ${successCount} success, ${failureCount} failed`);
    return response;
  }

  /**
   * Get performance stats
   */
  async getPerformanceStats(): Promise<{
    totalRelationships: number;
    totalSuggestions: number;
    activeSuggestions: number;
    avgMutualFriends: number;
  }> {
    const [
      totalRelationships,
      totalSuggestions,
      activeSuggestions,
      avgMutualFriendsResult,
    ] = await Promise.all([
      this.relationshipRepository.count(),
      this.suggestionRepository.count(),
      this.suggestionRepository.count({
        where: { status: SuggestionStatus.ACTIVE },
      }),
      this.suggestionRepository
        .createQueryBuilder("suggestion")
        .select("AVG(suggestion.mutualFriendsCount)", "avg")
        .where("suggestion.status = :status", {
          status: SuggestionStatus.ACTIVE,
        })
        .getRawOne(),
    ]);

    return {
      totalRelationships,
      totalSuggestions,
      activeSuggestions,
      avgMutualFriends: parseFloat(avgMutualFriendsResult?.avg || "0"),
    };
  }

  /**
   * Helper method để chia array thành chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

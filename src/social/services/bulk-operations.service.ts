import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  Relationship,
  RelationshipStatus,
} from "../entities/relationship.entity";
import {
  Suggestion,
  SuggestionStatus,
  SuggestionSource,
} from "../entities/suggestion.entity";
import { User } from "../../users/entities/user.entity";

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
    private readonly dataSource: DataSource
  ) {}

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
}

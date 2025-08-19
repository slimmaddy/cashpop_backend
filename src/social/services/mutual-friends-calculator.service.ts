import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Relationship, RelationshipStatus } from '../entities/relationship.entity';
import { User } from '../../users/entities/user.entity';
import { 
  IMutualFriendsCalculator, 
  MutualFriendsResult 
} from '../interfaces/suggestion.interfaces';
import { MutualFriendsCalculationException } from '../exceptions/suggestion.exceptions';

/**
 * 📊 Service chuyên tính mutual friends
 * Tách riêng để dễ test, cache và optimize performance
 */
@Injectable()
export class MutualFriendsCalculator implements IMutualFriendsCalculator {
  private readonly logger = new Logger(MutualFriendsCalculator.name);

  constructor(
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * 🎯 Tính mutual friends giữa 2 users
   * Thay thế raw SQL bằng TypeORM QueryBuilder - dễ đọc hơn nhiều!
   */
  async calculateMutualFriends(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<MutualFriendsResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Calculating mutual friends: ${userEmail} <-> ${suggestedUserEmail}`);

      // ✅ CLEANER: Sử dụng TypeORM QueryBuilder thay vì raw SQL
      const mutualFriendsQuery = this.relationshipRepository
        .createQueryBuilder('user_rel')
        .innerJoin(
          'relationships',
          'suggested_rel',
          'user_rel.friendEmail = suggested_rel.friendEmail'
        )
        .innerJoin('users', 'mutual_friend', 'mutual_friend.email = user_rel.friendEmail')
        .select([
          'user_rel.friendEmail as friendEmail',
          'mutual_friend.name as friendName',
          'mutual_friend.id as friendId'
        ])
        .where('user_rel.userEmail = :userEmail', { userEmail })
        .andWhere('suggested_rel.userEmail = :suggestedUserEmail', { suggestedUserEmail })
        .andWhere('user_rel.status = :status', { status: RelationshipStatus.ACCEPTED })
        .andWhere('suggested_rel.status = :status', { status: RelationshipStatus.ACCEPTED })
        .andWhere('user_rel.friendEmail != :userEmail', { userEmail })
        .andWhere('user_rel.friendEmail != :suggestedUserEmail', { suggestedUserEmail });

      const mutualFriends = await mutualFriendsQuery.getRawMany();

      const result: MutualFriendsResult = {
        count: mutualFriends.length,
        friendNames: mutualFriends.map(f => f.friendName),
        userIds: mutualFriends.map(f => f.friendId)
      };

      const executionTime = Date.now() - startTime;
      this.logger.debug(
        `Mutual friends calculated in ${executionTime}ms: ${result.count} friends`,
        { userEmail, suggestedUserEmail, result }
      );

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Failed to calculate mutual friends after ${executionTime}ms:`,
        error
      );
      
      throw new MutualFriendsCalculationException(
        userEmail,
        suggestedUserEmail,
        error
      );
    }
  }

  /**
   * 🚀 PERFORMANCE: Batch calculate cho nhiều users cùng lúc
   * Thay vì N queries, chỉ cần 1 query duy nhất!
   */
  async batchCalculateMutualFriends(
    userEmail: string,
    suggestedUserEmails: string[]
  ): Promise<Map<string, MutualFriendsResult>> {
    const startTime = Date.now();
    
    try {
      if (suggestedUserEmails.length === 0) {
        return new Map();
      }

      this.logger.debug(
        `Batch calculating mutual friends for ${suggestedUserEmails.length} users`,
        { userEmail, count: suggestedUserEmails.length }
      );

      // ✅ OPTIMIZED: Single query for all suggested users
      const batchQuery = this.relationshipRepository
        .createQueryBuilder('user_rel')
        .innerJoin(
          'relationships',
          'suggested_rel',
          'user_rel.friendEmail = suggested_rel.friendEmail'
        )
        .innerJoin('users', 'mutual_friend', 'mutual_friend.email = user_rel.friendEmail')
        .select([
          'suggested_rel.userEmail as suggestedUserEmail',
          'user_rel.friendEmail as friendEmail',
          'mutual_friend.name as friendName',
          'mutual_friend.id as friendId'
        ])
        .where('user_rel.userEmail = :userEmail', { userEmail })
        .andWhere('suggested_rel.userEmail IN (:...suggestedUserEmails)', { suggestedUserEmails })
        .andWhere('user_rel.status = :status', { status: RelationshipStatus.ACCEPTED })
        .andWhere('suggested_rel.status = :status', { status: RelationshipStatus.ACCEPTED })
        .andWhere('user_rel.friendEmail != :userEmail', { userEmail })
        .andWhere('user_rel.friendEmail NOT IN (:...excludeEmails)', { 
          excludeEmails: [userEmail, ...suggestedUserEmails] 
        });

      const allMutualFriends = await batchQuery.getRawMany();

      // Group results by suggested user email
      const resultMap = new Map<string, MutualFriendsResult>();

      // Initialize results for all suggested users (even if no mutual friends)
      suggestedUserEmails.forEach(email => {
        resultMap.set(email, {
          count: 0,
          friendNames: [],
          userIds: []
        });
      });

      // Populate actual mutual friends data
      allMutualFriends.forEach(row => {
        const suggestedEmail = row.suggestedUserEmail;
        const current = resultMap.get(suggestedEmail);
        
        if (current) {
          current.count++;
          current.friendNames.push(row.friendName);
          current.userIds.push(row.friendId);
        }
      });

      const executionTime = Date.now() - startTime;
      const totalMutualFriends = Array.from(resultMap.values())
        .reduce((sum, result) => sum + result.count, 0);

      this.logger.debug(
        `Batch mutual friends calculated in ${executionTime}ms: ${totalMutualFriends} total connections`,
        { 
          userEmail, 
          suggestedCount: suggestedUserEmails.length,
          totalMutualFriends,
          executionTime 
        }
      );

      return resultMap;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Batch mutual friends calculation failed after ${executionTime}ms:`,
        error
      );
      
      throw new MutualFriendsCalculationException(
        userEmail,
        `batch[${suggestedUserEmails.length}]`,
        error
      );
    }
  }

  /**
   * 📈 Helper method để get mutual friends count only (faster)
   * Khi chỉ cần count, không cần load names
   */
  async getMutualFriendsCount(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<number> {
    try {
      const countQuery = this.relationshipRepository
        .createQueryBuilder('user_rel')
        .innerJoin(
          'relationships',
          'suggested_rel',
          'user_rel.friendEmail = suggested_rel.friendEmail'
        )
        .where('user_rel.userEmail = :userEmail', { userEmail })
        .andWhere('suggested_rel.userEmail = :suggestedUserEmail', { suggestedUserEmail })
        .andWhere('user_rel.status = :status', { status: RelationshipStatus.ACCEPTED })
        .andWhere('suggested_rel.status = :status', { status: RelationshipStatus.ACCEPTED })
        .andWhere('user_rel.friendEmail != :userEmail', { userEmail })
        .andWhere('user_rel.friendEmail != :suggestedUserEmail', { suggestedUserEmail });

      const count = await countQuery.getCount();
      
      this.logger.debug(`Mutual friends count: ${count}`, { userEmail, suggestedUserEmail });
      
      return count;

    } catch (error) {
      this.logger.error('Failed to get mutual friends count:', error);
      return 0; // Graceful fallback
    }
  }

  /**
   * 🎯 Helper để get top mutual friends (limited count)
   * Useful cho UI hiển thị "John, Jane and 5 others"
   */
  async getTopMutualFriends(
    userEmail: string,
    suggestedUserEmail: string,
    limit: number = 3
  ): Promise<{ names: string[], totalCount: number }> {
    try {
      // Get total count first
      const totalCount = await this.getMutualFriendsCount(userEmail, suggestedUserEmail);
      
      if (totalCount === 0) {
        return { names: [], totalCount: 0 };
      }

      // Get limited names
      const topFriendsQuery = this.relationshipRepository
        .createQueryBuilder('user_rel')
        .innerJoin(
          'relationships',
          'suggested_rel',
          'user_rel.friendEmail = suggested_rel.friendEmail'
        )
        .innerJoin('users', 'mutual_friend', 'mutual_friend.email = user_rel.friendEmail')
        .select('mutual_friend.name as friendName')
        .where('user_rel.userEmail = :userEmail', { userEmail })
        .andWhere('suggested_rel.userEmail = :suggestedUserEmail', { suggestedUserEmail })
        .andWhere('user_rel.status = :status', { status: RelationshipStatus.ACCEPTED })
        .andWhere('suggested_rel.status = :status', { status: RelationshipStatus.ACCEPTED })
        .andWhere('user_rel.friendEmail != :userEmail', { userEmail })
        .andWhere('user_rel.friendEmail != :suggestedUserEmail', { suggestedUserEmail })
        .orderBy('mutual_friend.name', 'ASC')
        .limit(limit);

      const topFriends = await topFriendsQuery.getRawMany();
      const names = topFriends.map(f => f.friendName);

      return { names, totalCount };

    } catch (error) {
      this.logger.error('Failed to get top mutual friends:', error);
      return { names: [], totalCount: 0 };
    }
  }
}
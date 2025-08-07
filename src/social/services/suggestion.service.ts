import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Relationship, RelationshipStatus } from '../entities/relationship.entity';
import { Suggestion, SuggestionStatus, SuggestionSource } from '../entities/suggestion.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';

import {
  SuggestionResponseDto,
  GetSuggestionsDto
} from '../dto/suggestion.dto';

@Injectable()
export class SuggestionService {
  constructor(
    @InjectRepository(Relationship)
    private relationshipRepository: Repository<Relationship>,
    @InjectRepository(Suggestion)
    private suggestionRepository: Repository<Suggestion>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
  ) {}
  /**
   * Lấy danh sách gợi ý kết bạn từ bảng suggestions
   */
  async getSuggestions(
    userEmail: string,
    query: GetSuggestionsDto
  ): Promise<{ suggestions: SuggestionResponseDto[]; total: number }> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Query suggestions từ bảng suggestions với JOIN users
    const [suggestions, total] = await this.suggestionRepository.findAndCount({
      where: {
        userEmail,
        status: SuggestionStatus.ACTIVE
      },
      relations: ['suggestedUser'],
      order: {
        mutualFriendsCount: 'DESC',
        createdAt: 'DESC'
      },
      take: limit,
      skip
    });

    // Transform data
    const transformedSuggestions: SuggestionResponseDto[] = suggestions.map((suggestion) => ({
      user: {
        id: suggestion.suggestedUser.id,
        email: suggestion.suggestedUser.email,
        username: suggestion.suggestedUser.username,
        name: suggestion.suggestedUser.name,
        avatar: suggestion.suggestedUser.avatar,
      },
      mutualFriendsCount: suggestion.mutualFriendsCount,
      mutualFriends: this.extractMutualFriends(suggestion.metadata),
      reason: suggestion.reason || this.getReasonBySource(suggestion.source, suggestion.mutualFriendsCount)
    }));

    return {
      suggestions: transformedSuggestions,
      total
    };
  }

  /**
   * Helper method để extract mutual friends từ metadata
   */
  private extractMutualFriends(metadata: any): Array<{id: string, name: string}> {
    if (!metadata || !metadata.mutual_friends) {
      return [];
    }
    
    // Nếu metadata chứa array of names, convert thành format cần thiết
    if (Array.isArray(metadata.mutual_friends)) {
      return metadata.mutual_friends.map((name: string, index: number) => ({
        id: `mutual-${index}`, // Temporary ID since we don't store actual IDs
        name
      }));
    }
    
    return [];
  }

  /**
   * Helper method để generate reason based on source
   */
  private getReasonBySource(source: SuggestionSource, mutualFriendsCount: number): string {
    switch (source) {
      case SuggestionSource.MUTUAL_FRIENDS:
        return mutualFriendsCount > 1 
          ? `You have ${mutualFriendsCount} mutual friends`
          : 'You have 1 mutual friend';
      case SuggestionSource.CONTACT:
        return 'From your contacts';
      case SuggestionSource.FACEBOOK:
        return 'From Facebook friends';
      case SuggestionSource.LINE:
        return 'From LINE friends';
      default:
        return 'Suggested for you';
    }
  }

  /**
   * Tìm user theo email (sử dụng lại method từ UsersService)
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return await this.usersService.findByEmail(email);
  }

  /**
   * Gợi ý user dựa trên email search
   */
  async getSuggestionByEmail(
    userEmail: string,
    searchEmail: string
  ): Promise<SuggestionResponseDto | null> {
    // Tìm suggested user theo email
    const suggestedUser = await this.usersService.findByEmail(searchEmail);

    if (!suggestedUser || suggestedUser.email === userEmail) {
      return null; // Không tìm thấy hoặc là chính mình
    }

    // Kiểm tra đã là bạn chưa
    const existingRelationship = await this.relationshipRepository.findOne({
      where: [
        { userEmail, friendEmail: searchEmail },
        { userEmail: searchEmail, friendEmail: userEmail }
      ]
    });

    if (existingRelationship) {
      return null; // Đã có relationship
    }

    // Kiểm tra đã có suggestion chưa
    const existingSuggestion = await this.suggestionRepository.findOne({
      where: {
        userEmail,
        suggestedUserEmail: searchEmail,
        status: SuggestionStatus.ACTIVE
      }
    });

    if (existingSuggestion) {
      // Trả về suggestion đã có
      return {
        user: {
          id: suggestedUser.id,
          email: suggestedUser.email,
          username: suggestedUser.username,
          name: suggestedUser.name,
          avatar: suggestedUser.avatar,
        },
        mutualFriendsCount: existingSuggestion.mutualFriendsCount,
        mutualFriends: this.extractMutualFriends(existingSuggestion.metadata),
        reason: existingSuggestion.reason || 'Found by email search'
      };
    }

    // Tạo suggestion mới nếu chưa có
    const newSuggestion = await this.createSuggestionByEmail(userEmail, searchEmail);
    
    if (!newSuggestion) {
      return null;
    }

    // Trả về suggestion mới tạo
    return {
      user: {
        id: suggestedUser.id,
        email: suggestedUser.email,
        username: suggestedUser.username,
        name: suggestedUser.name,
        avatar: suggestedUser.avatar,
      },
      mutualFriendsCount: newSuggestion.mutualFriendsCount,
      mutualFriends: this.extractMutualFriends(newSuggestion.metadata),
      reason: newSuggestion.reason || 'Found by email search'
    };
  }

  /**
   * Tạo suggestion mới từ email search
   */
  private async createSuggestionByEmail(
    userEmail: string,
    suggestedUserEmail: string
  ): Promise<Suggestion | null> {
    try {
      // Tính mutual friends count
      const mutualFriendsCount = await this.calculateMutualFriendsCount(userEmail, suggestedUserEmail);
      
      const suggestion = this.suggestionRepository.create({
        userEmail,
        suggestedUserEmail,
        source: mutualFriendsCount > 0 ? SuggestionSource.MUTUAL_FRIENDS : SuggestionSource.CONTACT,
        status: SuggestionStatus.ACTIVE,
        reason: mutualFriendsCount > 0 
          ? `You have ${mutualFriendsCount} mutual friends`
          : 'Found by email search',
        mutualFriendsCount,
        metadata: mutualFriendsCount > 0 
          ? await this.getMutualFriendsMetadata(userEmail, suggestedUserEmail)
          : { source_info: 'email_search' }
      });

      return await this.suggestionRepository.save(suggestion);
    } catch (error) {
      console.error('Error creating suggestion:', error);
      return null;
    }
  }

  /**
   * Tính số lượng mutual friends
   */
  private async calculateMutualFriendsCount(userEmail: string, suggestedUserEmail: string): Promise<number> {
    const query = `
      SELECT COUNT(DISTINCT mutual_friend.friend_email) as count
      FROM relationships user_rel
      JOIN relationships suggested_rel ON user_rel.friend_email = suggested_rel.friend_email
      WHERE user_rel.user_email = $1 
        AND suggested_rel.user_email = $2
        AND user_rel.status = 'accepted'
        AND suggested_rel.status = 'accepted'
    `;

    const result = await this.relationshipRepository.query(query, [userEmail, suggestedUserEmail]);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * Lấy thông tin mutual friends cho metadata
   */
  private async getMutualFriendsMetadata(userEmail: string, suggestedUserEmail: string): Promise<any> {
    const query = `
      SELECT u.name
      FROM relationships user_rel
      JOIN relationships suggested_rel ON user_rel.friend_email = suggested_rel.friend_email
      JOIN users u ON user_rel.friend_email = u.email
      WHERE user_rel.user_email = $1 
        AND suggested_rel.user_email = $2
        AND user_rel.status = 'accepted'
        AND suggested_rel.status = 'accepted'
      ORDER BY u.name
      LIMIT 3
    `;

    const mutualFriends = await this.relationshipRepository.query(query, [userEmail, suggestedUserEmail]);
    
    return {
      mutual_friends: mutualFriends.map((f: any) => f.name),
      source_info: 'email_search'
    };
  }
}
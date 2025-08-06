import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Relationship, RelationshipStatus } from '../entities/relationship.entity';
import { User } from '../../users/entities/user.entity';

import {
  SuggestionResponseDto,
  GetSuggestionsDto
} from '../dto/suggestion.dto';

@Injectable()
export class SuggestionService {
  constructor(
    @InjectRepository(Relationship)
    private relationshipRepository: Repository<Relationship>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}
  /**
   * Lấy danh sách gợi ý kết bạn thông minh dựa trên mạng lưới bạn bè hiện có.
   * Logic: Kiểm tra những email có tài khoản trong hệ thống và gợi ý kết bạn
   */
  async getSuggestions(
    userId: string,
    query: GetSuggestionsDto
  ): Promise<{ suggestions: SuggestionResponseDto[]; total: number }> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Query để tìm users có tài khoản mà chưa kết bạn
    const rawQuery = `
      WITH user_friends AS (
        -- Lấy danh sách bạn bè và pending requests của user hiện tại
        SELECT friend_id
        FROM relationships
        WHERE user_id = $1 AND status IN ('accepted', 'pending')
        UNION
        SELECT user_id
        FROM relationships
        WHERE friend_id = $1 AND status IN ('accepted', 'pending')
      )
      SELECT DISTINCT
        u.id,
        u.email,
        u.username,
        u.name,
        u.avatar
      FROM users u
      WHERE u.id != $1  -- Không phải chính mình
        AND u.id NOT IN (SELECT friend_id FROM user_friends WHERE friend_id IS NOT NULL)  -- Chưa là bạn
      ORDER BY u.name ASC  -- Sắp xếp theo tên
      LIMIT $2 OFFSET $3
    `;

    // Execute query
    const suggestions = await this.relationshipRepository.query(rawQuery, [
      userId,
      limit,
      skip
    ]);

    // Count total suggestions
    const countQuery = `
      WITH user_friends AS (
        -- Lấy danh sách bạn bè và pending requests của user hiện tại
        SELECT friend_id
        FROM relationships
        WHERE user_id = $1 AND status IN ('accepted', 'pending')
        UNION
        SELECT user_id
        FROM relationships
        WHERE friend_id = $1 AND status IN ('accepted', 'pending')
      )
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE u.id != $1  -- Không phải chính mình
        AND u.id NOT IN (SELECT friend_id FROM user_friends WHERE friend_id IS NOT NULL)  -- Chưa là bạn
    `;

    const [{ total }] = await this.relationshipRepository.query(countQuery, [userId]);

    // Transform data - gợi ý users có tài khoản
    const transformedSuggestions: SuggestionResponseDto[] = suggestions.map((suggestion: any) => ({
      user: {
        id: suggestion.id,
        email: suggestion.email,
        username: suggestion.username,
        name: suggestion.name,
        avatar: suggestion.avatar,
      },
      mutualFriendsCount: 0,
      mutualFriends: [],
      reason: 'User has account in the system'
    }));

    return {
      suggestions: transformedSuggestions,
      total: parseInt(total)
    };
  }
}